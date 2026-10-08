import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { assertScope, facWhere } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';
import { exceptionNeeded, isChiefWarden, type ExceptionKind } from './rules.js';

export type NewException = { kind: ExceptionKind; registration_id?: number; from_alloc_id?: number; staff_id?: string; subspace_id: string; key_no?: string; reason: string };

/**
 * Chief Warden portal (Stage 2 of docs/flow-a-to-f.html): the overview across the hostels of the login (CW-01) and
 * the exceptions inbox (CW-03). The database checks who may decide and carries out an approval.
 */
@Injectable()
export class CwService {
  constructor(private dbs: DbService) {}

  /* ---------- overview ---------- */

  async overview(user: AuthUser) {
    const hostels = await this.dbs.rows(sql`
      with cy as (select academic_year from hostel.academic_year where is_current),
      steps as (
        select s.request_type::text as request_type, s.approver_role, st.facility_id, s.created_at,
               s.level = (select min(p.level) from shared.approval_step p where p.request_type = s.request_type and p.request_id = s.request_id and p.decision = 'Pending') as current
        from shared.approval_step s
        join lateral (select o.student_id from hostel.outpass o where s.request_type = 'Outpass' and o.outpass_id = s.request_id
                      union all select l.student_id from hostel.sick_leave l where s.request_type = 'Sick_Leave' and l.sick_leave_id = s.request_id) r on true
        left join hostel.fn_student_stay(r.student_id) st on true
        where s.decision = 'Pending')
      select hp.facility_id, hp.hostel_code, f.facility_name, hp.hostel_gender::text as hostel_gender,
        (select count(*)::int from hostel.v_bed b where b.facility_id = hp.facility_id) as beds,
        (select count(*)::int from hostel.v_bed b where b.facility_id = hp.facility_id and b.bed_status = 'Occupied') as occupied,
        (select count(*)::int from hostel.v_bed b where b.facility_id = hp.facility_id and b.bed_status = 'Held') as held,
        (select count(*)::int from hostel.v_bed b where b.facility_id = hp.facility_id and b.bed_status = 'Vacant' and not b.is_blocked and b.room_status <> 'Under_Maintenance') as open_beds,
        (select count(*)::int from hostel.hostel_registration r, cy where r.facility_id = hp.facility_id and r.academic_year = cy.academic_year and r.status in ('Fee_Paid','Waitlisted')) as waiting,
        (select count(*)::int from hostel.hostel_registration r where r.facility_id = hp.facility_id and r.status = 'Confirmed' and r.fee_check_status <> 'Verified') as to_verify,
        (select count(*)::int from hostel.hostel_registration r where r.facility_id = hp.facility_id and r.status = 'Confirmed' and r.fee_check_status = 'Verified' and r.cw_status = 'Pending') as to_approve,
        (select count(*)::int from hostel.hostel_registration r where r.facility_id = hp.facility_id and r.status = 'Confirmed' and r.fee_check_status = 'Verified' and r.cw_status = 'Approved') as ready_checkin,
        (select count(*)::int from hostel.allotment_exception e where e.facility_id = hp.facility_id and e.status = 'Pending') as exceptions,
        (select count(*)::int from steps where steps.facility_id = hp.facility_id and steps.current and steps.request_type = 'Outpass' and steps.approver_role = 'Chief_Warden') as outings,
        (select count(*)::int from steps where steps.facility_id = hp.facility_id and steps.current and steps.request_type = 'Outpass' and steps.approver_role in ('Parent','Dean_Students_Affairs')) as outings_on_link,
        (select count(*)::int from steps where steps.facility_id = hp.facility_id and steps.current and steps.request_type = 'Sick_Leave' and steps.approver_role = 'Chief_Warden') as sick,
        (select count(*)::int from hostel.outpass o join hostel.fn_student_stay(o.student_id) st on true where st.facility_id = hp.facility_id and o.status = 'Out') as out_now,
        (select count(*)::int from hostel.outpass o join hostel.fn_student_stay(o.student_id) st on true where st.facility_id = hp.facility_id and o.status = 'Overdue') as overdue_returns,
        (select count(*)::int from hostel.hostel_alert a where a.facility_id = hp.facility_id and a.status::text <> 'Closed') as alerts,
        (select count(*)::int from hostel.hostel_alert a where a.facility_id = hp.facility_id and a.status::text <> 'Closed' and a.severity::text = 'Critical') as critical,
        (select count(*)::int from hostel.fee_demand d join hostel.hostel_registration r on r.student_id = d.student_id join cy on cy.academic_year = r.academic_year
          where r.facility_id = hp.facility_id and d.status = 'Overdue') as fees_overdue,
        (select coalesce(sum(d.amount_due - coalesce(d.amount_paid, 0)), 0)::numeric(14,2) from hostel.fee_demand d join hostel.hostel_registration r on r.student_id = d.student_id join cy on cy.academic_year = r.academic_year
          where r.facility_id = hp.facility_id and d.status = 'Overdue') as fees_overdue_amount,
        (select count(*)::int from hostel.daily_duty dd where dd.facility_id = hp.facility_id and dd.duty_date = current_date and dd.source = 'Open') as open_places
      from hostel.hostel_profile hp join infra.facility f on f.facility_id = hp.facility_id
      where ${facWhere('hp.facility_id', null, user)}
      order by hp.hostel_code`);
    const exceptions = (await this.exceptions(user, { status: 'Pending' })).slice(0, 6);
    const alerts = await this.dbs.rows(sql`
      select a.alert_id::int as alert_id, a.alert_type::text as alert_type, a.severity::text as severity, a.raised_at, a.status::text as status, hp.hostel_code,
             a.student_id, initcap(sm.full_name) as student_name
      from hostel.hostel_alert a join hostel.hostel_profile hp on hp.facility_id = a.facility_id left join ref.student_master sm on sm.student_id = a.student_id
      where a.status::text <> 'Closed' and ${facWhere('a.facility_id', null, user)}
      order by (a.severity::text = 'Critical') desc, a.raised_at desc limit 6`);
    return { hostels, exceptions, alerts };
  }

  /* ---------- exceptions ---------- */

  exceptions(user: AuthUser, q: { status?: string; facility_id?: string }) {
    return this.dbs.rows<Record<string, unknown>>(sql`
      select e.exception_id::int as exception_id, e.kind::text as kind, e.status::text as status, e.facility_id, hp.hostel_code, e.reason,
             e.requested_at, e.requested_by, initcap(rq.full_name) as requested_by_name, e.decided_at, e.decided_by, initcap(dc.full_name) as decided_by_name, e.decision_remarks, e.key_no,
             e.registration_id::int as registration_id, r.registration_no, r.waitlist_no, art.type_name as applied_type,
             e.student_id, initcap(sm.full_name) as student_name, sm.programme, e.staff_id, initcap(st.full_name) as staff_name, st.designation as staff_designation,
             e.subspace_id, coalesce(b.bed_label, e.subspace_id) as bed_label, b.floor_name, b.type_name as bed_type, b.block_reason::text as block_reason, b.reserved_for::text as reserved_for,
             fb.bed_label as from_bed
      from hostel.allotment_exception e join hostel.hostel_profile hp on hp.facility_id = e.facility_id
      left join ref.staff_master rq on rq.staff_id = e.requested_by left join ref.staff_master dc on dc.staff_id = e.decided_by
      left join hostel.hostel_registration r on r.registration_id = e.registration_id left join hostel.room_type art on art.room_type_id = r.room_type_id
      left join ref.student_master sm on sm.student_id = e.student_id left join ref.staff_master st on st.staff_id = e.staff_id
      left join hostel.v_bed b on b.subspace_id = e.subspace_id
      left join hostel.hostel_allocation fa on fa.hostel_alloc_id = e.from_alloc_id left join hostel.v_bed fb on fb.subspace_id = fa.subspace_id
      where ${facWhere('e.facility_id', q.facility_id, user)} and (${q.status ?? null}::text is null or e.status::text = ${q.status ?? null})
      order by (e.status = 'Pending') desc, e.requested_at desc limit 300`);
  }

  async create(user: AuthUser, dto: NewException) {
    const [bed] = await this.dbs.rows<{ facility_id: string }>(sql`select facility_id from hostel.v_bed where subspace_id = ${dto.subspace_id}`);
    if (!bed) throw new NotFoundException('Bed not found');
    assertScope(user, bed.facility_id);
    let kind = dto.kind;
    if (kind !== 'Transfer' && kind !== 'Staff_Room') {
      if (!dto.registration_id) throw new BadRequestException('Choose the student');
      const need = await exceptionNeeded(this.dbs, dto.registration_id, dto.subspace_id);
      if (!need) throw new BadRequestException('This bed is within the rules: offer it directly from the allotment desk');
      kind = need.kind;
    }
    if (kind === 'Transfer' && !dto.from_alloc_id) throw new BadRequestException('Choose the student to move');
    if (kind === 'Staff_Room' && (!dto.staff_id || !dto.key_no)) throw new BadRequestException('Choose the staff member and give the key number');
    return this.dbs.run(user, async (tx) => {
      const [e] = (await tx.execute(sql`insert into hostel.allotment_exception (kind, facility_id, registration_id, from_alloc_id, staff_id, subspace_id, key_no, reason, requested_by, created_by)
        values (${kind}::hostel.exception_kind, ${bed.facility_id}, ${dto.registration_id ?? null}, ${dto.from_alloc_id ?? null}, ${dto.staff_id ?? null}, ${dto.subspace_id}, ${dto.key_no ?? null}, ${dto.reason}, ${user.id}, ${user.id})
        returning exception_id::int as exception_id`)) as unknown as { exception_id: number }[];
      // the Chief Warden asking is the Chief Warden deciding: carried out at once, on record
      if (isChiefWarden(user)) await tx.execute(sql`update hostel.allotment_exception set status = 'Approved', decided_by = ${user.id}, decision_remarks = 'Decided by the Chief Warden when asking', updated_by = ${user.id} where exception_id = ${e.exception_id}`);
      return { exception_id: e.exception_id, status: isChiefWarden(user) ? 'Approved' : 'Pending' };
    });
  }

  async decide(user: AuthUser, id: number, dto: { decision: 'Approved' | 'Refused'; remarks?: string }) {
    const [e] = await this.dbs.rows<{ facility_id: string; requested_by: string; status: string }>(sql`select facility_id, requested_by, status::text as status from hostel.allotment_exception where exception_id = ${id}`);
    if (!e) throw new NotFoundException('Request not found');
    assertScope(user, e.facility_id);
    if (e.requested_by === user.id) throw new ForbiddenException('You asked for this one; it was decided when you asked');
    if (dto.decision === 'Refused' && !dto.remarks?.trim()) throw new BadRequestException('Say why you refuse');
    await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.allotment_exception set status = ${dto.decision}::hostel.exception_status, decided_by = ${user.id},
      decision_remarks = ${dto.remarks?.trim() || null}, updated_by = ${user.id}, updated_at = now() where exception_id = ${id}`));
    return { exception_id: id, status: dto.decision };
  }

  async cancel(user: AuthUser, id: number) {
    const [e] = await this.dbs.rows<{ requested_by: string; status: string }>(sql`select requested_by, status::text as status from hostel.allotment_exception where exception_id = ${id}`);
    if (!e) throw new NotFoundException('Request not found');
    if (e.requested_by !== user.id) throw new ForbiddenException('Only the person who asked can withdraw it');
    await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.allotment_exception set status = 'Cancelled', updated_by = ${user.id}, updated_at = now() where exception_id = ${id}`));
    return { exception_id: id, status: 'Cancelled' };
  }

  /** Students living in a hostel, for the transfer form: name or ID, with their bed. */
  stays(user: AuthUser, facilityId: string, q?: string) {
    assertScope(user, facilityId);
    const t = `%${(q ?? '').trim()}%`;
    return this.dbs.rows(sql`select a.hostel_alloc_id::int as hostel_alloc_id, a.student_id, initcap(sm.full_name) as full_name, b.bed_label, b.type_name, a.key_no
      from hostel.hostel_allocation a join hostel.v_bed b on b.subspace_id = a.subspace_id join ref.student_master sm on sm.student_id = a.student_id
      where a.status = 'Active' and a.occupant_type = 'Student' and b.facility_id = ${facilityId} and (sm.full_name ilike ${t} or a.student_id ilike ${t} or b.bed_label ilike ${t})
      order by b.bed_label limit 30`);
  }
}
