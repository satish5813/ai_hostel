import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
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

  /** Pending steps for the caller's roles, limited to the hostel / floor the caller is assigned to. */
  inbox(user: AuthUser) {
    return this.dbs.rows(sql`
      select s.step_id::int as step_id, s.request_type, s.request_id::int as request_id, s.level, s.approver_role, s.created_at,
             r.student_id, sm.full_name, sm.programme, st.facility_id, st.zone_id, b.hostel_name, b.floor_name, b.room_code,
             r.summary, r.from_at, r.to_at
      from shared.approval_step s
      join lateral (
        select o.student_id, o.reason || ' → ' || o.destination as summary, o.leave_from as from_at, o.return_by as to_at from hostel.outpass o where s.request_type = 'Outpass' and o.outpass_id = s.request_id
        union all
        select l.student_id, l.illness_details, l.from_date::timestamptz, l.to_date::timestamptz from hostel.sick_leave l where s.request_type = 'Sick_Leave' and l.sick_leave_id = s.request_id
        union all
        select v.student_id, v.reason::text || coalesce(': ' || v.reason_detail, ''), v.planned_date::timestamptz, null from hostel.vacate_request v where s.request_type = 'Vacate' and v.vacate_id = s.request_id
      ) r on true
      join ref.student_master sm on sm.student_id = r.student_id
      left join hostel.fn_student_stay(r.student_id) st on true
      left join hostel.v_bed b on b.subspace_id = st.subspace_id
      where s.decision = 'Pending'
        and (${user.kind} <> 'parent' or r.student_id in (select c.student_id from hostel.student_contact c where 'contact:' || c.contact_id = ${user.id}))
        and s.approver_role = any(string_to_array(${user.roles.join(',')}, ','))
        and (s.level = (select min(level) from shared.approval_step p where p.request_type = s.request_type and p.request_id = s.request_id and p.decision = 'Pending'))
        and (s.approver_role not in ('Floor_Warden','Chief_Warden','Warden','Assistant_Warden')
             or exists (select 1 from hostel.staff_space_assignment a where a.staff_id = ${user.id} and a.hostel_role = s.approver_role and a.status = 'Active'
                         and a.facility_id = st.facility_id and (a.zone_id is null or a.zone_id = st.zone_id)))
      order by s.created_at`);
  }

  async decide(user: AuthUser, stepId: number, decision: 'Approved' | 'Rejected', remarks?: string) {
    if (user.kind !== 'staff') throw new ForbiddenException('Staff decision only; parents use their link');
    const [st] = await this.dbs.rows<{ request_type: string; visited: boolean | null }>(sql`select s.request_type::text as request_type,
      (select l.visited_by is not null from hostel.sick_leave l where s.request_type = 'Sick_Leave' and l.sick_leave_id = s.request_id) as visited
      from shared.approval_step s where s.step_id = ${stepId}`);
    if (st?.request_type === 'Sick_Leave' && decision === 'Approved' && !st.visited) throw new UnprocessableEntityException("Record the Floor Warden's visit first");
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
