import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { eq, sql, type SQL } from 'drizzle-orm';
import { t } from '@klu/db';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/**
 * Shared approval engine (SH1 Approval_Rule / SH2 Approval_Step) used by outing, sick leave and vacating.
 * Order of levels, who may act and what happens to the request are enforced by the database triggers;
 * this service builds the inbox and records the decision.
 */
@Injectable()
export class ApprovalsService {
  constructor(private dbs: DbService) {}

  /** Steps this person already decided, newest first: the same rows as the inbox, so one drawer shows both. */
  decided(user: AuthUser) {
    return this.list(user, sql`s.acted_by = ${user.id} and s.decision <> 'Pending'`, sql`s.decided_on desc nulls last, s.created_at desc`, 100);
  }

  /** Pending steps for the caller's roles, limited to the hostel / floor the caller is assigned to. */
  inbox(user: AuthUser) {
    return this.list(user, sql`s.decision = 'Pending'
        and (${user.kind} <> 'parent' or r.student_id in (select c.student_id from hostel.student_contact c where 'contact:' || c.contact_id = ${user.id}))
        and s.approver_role = any(string_to_array(${user.roles.join(',')}, ','))
        and (s.level = (select min(level) from shared.approval_step p where p.request_type = s.request_type and p.request_id = s.request_id and p.decision = 'Pending'))
        and (s.approver_role not in ('Floor_Warden','Chief_Warden','Warden','Assistant_Warden')
             or exists (select 1 from hostel.staff_space_assignment a where a.staff_id = ${user.id} and a.hostel_role = s.approver_role and a.status = 'Active'
                         and (pp.proof_id is not null and pp.facility_id is null or a.facility_id = coalesce(st.facility_id, pp.facility_id)) and (a.zone_id is null or a.zone_id = coalesce(st.zone_id, a.zone_id))))`, sql`s.created_at`, 500);
  }

  private list(user: AuthUser, where: SQL, order: SQL, limit: number) {
    return this.dbs.rows(sql`
      select s.step_id::int as step_id, s.request_type, s.request_id::int as request_id, s.level, s.approver_role, s.created_at, s.decision, s.decided_on, s.remarks,
             r.student_id, sm.full_name, sm.programme, st.facility_id, st.zone_id, b.hostel_name, b.floor_name, b.room_code,
             r.summary, r.from_at, r.to_at
      from shared.approval_step s
      join lateral (
        select o.student_id, o.reason || ' → ' || o.destination as summary, o.leave_from as from_at, o.return_by as to_at from hostel.outpass o where s.request_type = 'Outpass' and o.outpass_id = s.request_id
        union all
        select l.student_id, l.illness_details, l.from_date::timestamptz, l.to_date::timestamptz from hostel.sick_leave l where s.request_type = 'Sick_Leave' and l.sick_leave_id = s.request_id
        union all
        select v.student_id, v.reason::text || coalesce(': ' || v.reason_detail, ''), v.planned_date::timestamptz, null from hostel.vacate_request v where s.request_type = 'Vacate' and v.vacate_id = s.request_id
        union all
        select c.student_id, 'Room change ' || c.change_no || ' to ' || rt.type_name || coalesce(' (' || tb.bed_label || ')', '') || ': ' || c.reason, c.requested_at, null
          from hostel.room_change c join hostel.room_type rt on rt.room_type_id = c.to_room_type_id left join hostel.v_bed tb on tb.subspace_id = c.to_subspace_id
         where s.request_type = 'Room_Change' and c.change_id = s.request_id
        union all
        select p.student_id, 'Receipt ' || p.proof_no || ' for ₹' || to_char(p.amount, 'FM9,99,99,990') || coalesce(' (ref ' || p.reference || ')', '') || ': ' || to_char(p.paid_on, 'DD Mon YYYY'), p.created_at, null
          from hostel.payment_proof p where s.request_type = 'Payment_Proof' and p.proof_id = s.request_id
      ) r on true
      -- a receipt may come from a student with no room yet: its hostel is the one being paid for
      left join hostel.payment_proof pp on s.request_type = 'Payment_Proof' and pp.proof_id = s.request_id
      join ref.student_master sm on sm.student_id = r.student_id
      left join hostel.fn_student_stay(r.student_id) st on true
      left join hostel.v_bed b on b.subspace_id = st.subspace_id
      where ${where}
      order by ${order} limit ${limit}`);
  }

  async decide(user: AuthUser, stepId: number, decision: 'Approved' | 'Rejected', remarks?: string) {
    if (user.kind !== 'staff') throw new ForbiddenException('Staff decision only; parents use their link');
    const [st] = await this.dbs.rows<{ request_type: string; visited: boolean | null }>(sql`select s.request_type::text as request_type,
      (select l.visited_by is not null from hostel.sick_leave l where s.request_type = 'Sick_Leave' and l.sick_leave_id = s.request_id) as visited
      from shared.approval_step s where s.step_id = ${stepId}`);
    if (st?.request_type === 'Sick_Leave' && decision === 'Approved' && !st.visited) throw new UnprocessableEntityException("Record the Floor Manager's visit first");
    const [row] = await this.dbs.run(user, (tx) => tx.update(t.approvalStep)
      .set({ decision, acted_by: user.id, remarks: remarks ?? null }).where(eq(t.approvalStep.step_id, stepId)).returning());
    if (!row) throw new NotFoundException('Step not found');
    return row;
  }

  /** Parent recommendation (level 0). The parent identifies with the contact id; the DB checks the contact is verified and marked approver. */
  async parent(user: AuthUser, stepId: number, contactId: number, decision: 'Approved' | 'Rejected', remarks?: string) {
    if (user.kind !== 'parent' || user.id !== `contact:${contactId}`) throw new ForbiddenException('Only the parent can recommend, from their own login or link');
    const [row] = await this.dbs.run(user, (tx) => tx.update(t.approvalStep)
      .set({ decision, acted_by_contact: contactId, remarks: remarks ?? null }).where(eq(t.approvalStep.step_id, stepId)).returning());
    if (!row) throw new NotFoundException('Step not found');
    return row;
  }

  steps(requestType: string, requestId: number) {
    return this.dbs.rows(sql`select s.*, st.full_name as acted_by_name, c.contact_name as acted_by_contact_name
      from shared.approval_step s left join ref.staff_master st on st.staff_id = s.acted_by left join hostel.student_contact c on c.contact_id = s.acted_by_contact
      where s.request_type = ${requestType}::shared.request_type and s.request_id = ${requestId} order by s.level`);
  }
}
