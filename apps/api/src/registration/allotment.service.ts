import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { RegistrationService } from './registration.service.js';
import { assertScope, facWhere } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';

type BedRow = {
  subspace_id: string; bed_code: string; bed_status: string; space_id: string; room_code: string; room_status: string; zone_id: string; floor_name: string; floor_no: number;
  room_type_id: number | null; type_name: string | null; sharing_count: number | null; is_ac: boolean | null; is_accessible: boolean | null; reserved_for: string | null;
  student_id: string | null; full_name: string | null; programme: string | null; offer_student: string | null; offer_name: string | null;
  staff_id: string | null; staff_name: string | null; staff_designation: string | null;
  block_id: number | null; block_reason: string | null; block_remarks: string | null; blocked_by: string | null; blocked_on: string | null; until_date: string | null;
};

/**
 * The allotment desk around Workflow A:
 *   Chief Manager blocks rooms -> students choose from the rest after paying the registration fee (or the desk allots
 *   automatically, hostel by hostel) -> fees -> a Warden checks the fees -> the office checks the student in.
 */
@Injectable()
export class AllotmentService {
  constructor(private dbs: DbService, private reg: RegistrationService) {}

  /** Every hostel with its beds by state and the queue waiting for a bed. */
  hostels(user?: AuthUser) {
    return this.dbs.rows(sql`
      select hp.facility_id, hp.hostel_code, f.facility_name, hp.hostel_gender::text as hostel_gender,
        count(b.subspace_id)::int as beds,
        count(*) filter (where b.bed_status = 'Vacant' and not b.is_blocked and b.room_status <> 'Under_Maintenance' and b.reserved_for = 'None')::int as open_beds,
        count(*) filter (where b.bed_status = 'Vacant' and b.is_blocked)::int as blocked_beds,
        count(*) filter (where b.bed_status = 'Held')::int as held_beds,
        count(*) filter (where b.bed_status = 'Occupied')::int as occupied_beds,
        (select count(*)::int from hostel.hostel_registration r where r.facility_id = hp.facility_id and r.status in ('Fee_Paid','Waitlisted')) as waiting,
        (select count(*)::int from hostel.hostel_registration r where r.facility_id = hp.facility_id and r.status = 'Confirmed' and r.fee_check_status <> 'Verified') as to_verify,
        (select count(*)::int from hostel.hostel_registration r where r.facility_id = hp.facility_id and r.status = 'Confirmed' and r.fee_check_status = 'Verified' and r.cw_status = 'Pending') as to_approve
      from hostel.hostel_profile hp join infra.facility f on f.facility_id = hp.facility_id
      left join hostel.v_bed b on b.facility_id = hp.facility_id
      where ${facWhere('hp.facility_id', null, user)}
      group by hp.facility_id, hp.hostel_code, f.facility_name, hp.hostel_gender order by hp.hostel_code`);
  }

  /** Floors, rooms and beds of one hostel, with occupants, pending offers and blocks. */
  async board(facilityId: string) {
    const beds = await this.dbs.rows<BedRow>(sql`
      select b.subspace_id, b.bed_code, b.bed_status::text as bed_status, b.space_id, b.room_code, b.room_status::text as room_status, b.zone_id, b.floor_name, b.floor_no::int as floor_no,
        b.room_type_id::int as room_type_id, b.type_name, b.sharing_count::int as sharing_count, b.is_ac, b.is_accessible, b.reserved_for::text as reserved_for,
        b.student_id, sm.full_name, sm.programme, r.student_id as offer_student, osm.full_name as offer_name,
        b.staff_id, stf.full_name as staff_name, stf.designation as staff_designation,
        k.block_id::int as block_id, k.reason::text as block_reason, k.remarks as block_remarks, bs.full_name as blocked_by, k.blocked_on, to_char(k.until_date, 'YYYY-MM-DD') as until_date
      from hostel.v_bed b
      left join ref.student_master sm on sm.student_id = b.student_id
      left join ref.staff_master stf on stf.staff_id = b.staff_id
      left join hostel.room_offer o on o.subspace_id = b.subspace_id and o.student_decision in ('Pending','Accepted') and b.bed_status = 'Held'
      left join hostel.hostel_registration r on r.registration_id = o.registration_id
      left join ref.student_master osm on osm.student_id = r.student_id
      left join hostel.room_block k on k.space_id = b.space_id and k.status = 'Blocked'
      left join ref.staff_master bs on bs.staff_id = k.blocked_by
      where b.facility_id = ${facilityId}
      order by b.floor_no, b.room_code, b.bed_code`);
    const floors = new Map<string, { zone_id: string; floor_name: string; floor_no: number; rooms: Map<string, unknown> }>();
    for (const b of beds) {
      if (!floors.has(b.zone_id)) floors.set(b.zone_id, { zone_id: b.zone_id, floor_name: b.floor_name, floor_no: b.floor_no, rooms: new Map() });
      const f = floors.get(b.zone_id)!;
      if (!f.rooms.has(b.space_id)) f.rooms.set(b.space_id, {
        space_id: b.space_id, room_code: b.room_code, room_status: b.room_status, room_type_id: b.room_type_id, type_name: b.type_name, sharing_count: b.sharing_count, is_ac: b.is_ac,
        is_accessible: b.is_accessible, reserved_for: b.reserved_for,
        block: b.block_id ? { block_id: b.block_id, reason: b.block_reason, remarks: b.block_remarks, blocked_by: b.blocked_by, blocked_on: b.blocked_on, until_date: b.until_date } : null, beds: [] as unknown[],
      });
      (f.rooms.get(b.space_id) as { beds: unknown[] }).beds.push({ subspace_id: b.subspace_id, bed_code: b.bed_code, bed_status: b.bed_status, student_id: b.student_id ?? b.offer_student, full_name: b.full_name ?? b.offer_name, programme: b.programme,
        staff_id: b.staff_id, staff_name: b.staff_name, staff_designation: b.staff_designation });
    }
    return [...floors.values()].map((f) => ({ ...f, rooms: [...f.rooms.values()] }));
  }

  /** Chief Manager: block rooms for a reason. Occupied beds stay as they are; vacant beds leave the students' choice. */
  block(user: AuthUser, dto: { space_ids: string[]; reason: string; remarks?: string; until_date?: string }) {
    return this.dbs.run(user, async (tx) => {
      const r = (await tx.execute(sql`insert into hostel.room_block (space_id, reason, remarks, until_date, blocked_by, created_by)
        select x, ${dto.reason}::hostel.block_reason, ${dto.remarks ?? null}, ${dto.until_date ?? null}::date, ${user.id}, ${user.id} from unnest(${sql.raw(`array[${dto.space_ids.map((s) => `'${s.replace(/'/g, '')}'`).join(',')}]::varchar[]`)}) x
        where not exists (select 1 from hostel.room_block k where k.space_id = x and k.status = 'Blocked') returning block_id`)) as unknown as unknown[];
      return { blocked: r.length };
    });
  }

  release(user: AuthUser, blockId: number) {
    return this.dbs.run(user, async (tx) => {
      const r = (await tx.execute(sql`update hostel.room_block set status = 'Released', released_by = ${user.id}, released_on = now(), updated_by = ${user.id}, updated_at = now()
        where block_id = ${blockId} and status = 'Blocked' returning block_id`)) as unknown as unknown[];
      if (!r.length) throw new NotFoundException('No active block with this number');
      return { released: true };
    });
  }

  /** Allot the waiting queue of one hostel in order of application: first suitable open bed, else the waiting list. */
  async auto(user: AuthUser, facilityId: string) {
    const queue = await this.dbs.rows<{ registration_id: number }>(sql`select registration_id::int as registration_id from hostel.hostel_registration
      where facility_id = ${facilityId} and status in ('Fee_Paid','Waitlisted') order by coalesce(waitlist_no, 0), applied_on`);
    let offered = 0, waitlisted = 0; const failed: string[] = [];
    for (const q of queue) {
      try {
        const r = (await this.reg.offer(user, q.registration_id)) as { waitlisted?: boolean };
        if (r && 'waitlisted' in r && r.waitlisted) waitlisted++; else offered++;
      } catch (e) { failed.push(e instanceof Error ? e.message : 'Not allotted'); }
    }
    return { queue: queue.length, offered, waitlisted, failed };
  }

  /** Student: hostels of the student's gender, each room type with fee and the beds still open (blocked rooms left out). */
  async catalogue(user: AuthUser, year?: string) {
    const rows = await this.dbs.rows<{ facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string; room_type_id: number; type_name: string; sharing_count: number; is_ac: boolean; attached_bath: boolean; registration_fee: number; hostel_fee: number; open_beds: number; caution_deposit: number; elec_caution_deposit: number; meter_charge: number; mess_fee: number | null }>(sql`
      select hp.facility_id, hp.hostel_code, f.facility_name, hp.hostel_gender::text as hostel_gender, rt.room_type_id::int as room_type_id, rt.type_name, rt.sharing_count::int as sharing_count, rt.is_ac, rt.attached_bath,
        fee.registration_fee::float as registration_fee, fee.hostel_fee::float as hostel_fee, coalesce(v.vacant_beds, 0)::int as open_beds,
        fee.caution_deposit::float as caution_deposit, fee.elec_caution_deposit::float as elec_caution_deposit, fee.meter_charge::float as meter_charge,
        (select m.annual_fee::float from hostel.mess_master m where m.mess_id = hp.default_mess_id) as mess_fee
      from hostel.hostel_profile hp join infra.facility f on f.facility_id = hp.facility_id
      join hostel.academic_year y on (${year ?? null}::text is null and y.is_current) or y.academic_year = ${year ?? null}
      join hostel.room_type_fee fee on fee.facility_id = hp.facility_id and fee.academic_year = y.academic_year
      join hostel.room_type rt on rt.room_type_id = fee.room_type_id
      left join hostel.v_vacancy v on v.facility_id = hp.facility_id and v.room_type_id = rt.room_type_id
      where hp.status = 'Active' and (${user.kind !== 'student'} or hp.hostel_gender::text = (select case sm.gender::text when 'Male' then 'Boys' when 'Female' then 'Girls' else '' end from ref.student_master sm where sm.student_id = ${user.id}))
      order by hp.hostel_code, rt.sharing_count, rt.is_ac`);
    const out = new Map<string, { facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string; open_beds: number; types: unknown[] }>();
    for (const r of rows) {
      if (!out.has(r.facility_id)) out.set(r.facility_id, { facility_id: r.facility_id, hostel_code: r.hostel_code, facility_name: r.facility_name, hostel_gender: r.hostel_gender, open_beds: 0, types: [] });
      const h = out.get(r.facility_id)!; h.open_beds += r.open_beds;
      h.types.push({ room_type_id: r.room_type_id, type_name: r.type_name, sharing_count: r.sharing_count, is_ac: r.is_ac, attached_bath: r.attached_bath, registration_fee: r.registration_fee, hostel_fee: r.hostel_fee, open_beds: r.open_beds,
        caution_deposit: r.caution_deposit, elec_caution_deposit: r.elec_caution_deposit, meter_charge: r.meter_charge, mess_fee: r.mess_fee });
    }
    return [...out.values()];
  }

  private async ownReg(user: AuthUser, id: number) {
    const [r] = await this.dbs.rows<{ registration_id: number; student_id: string; facility_id: string; room_type_id: number; status: string }>(sql`
      select registration_id::int as registration_id, student_id, facility_id, room_type_id::int as room_type_id, status::text as status from hostel.hostel_registration where registration_id = ${id}`);
    if (!r) throw new NotFoundException('Registration not found');
    if (user.kind === 'student' && r.student_id !== user.id) throw new ForbiddenException('Own registration only');
    return r;
  }

  /** Rooms a student may choose: chosen hostel and room type, vacant beds, not blocked, reserved or under maintenance. */
  async choices(user: AuthUser, id: number) {
    const r = await this.ownReg(user, id);
    const rows = await this.dbs.rows<{ space_id: string; room_code: string; floor_name: string; floor_no: number; is_accessible: boolean; sharing_count: number; subspace_id: string; bed_code: string; bed_status: string; mates: number }>(sql`
      select b.space_id, b.room_code, b.floor_name, b.floor_no::int as floor_no, coalesce(b.is_accessible, false) as is_accessible, b.sharing_count::int as sharing_count,
        b.subspace_id, b.bed_code, b.bed_status::text as bed_status,
        (select count(*)::int from hostel.v_bed m where m.space_id = b.space_id and m.bed_status in ('Occupied','Held')) as mates
      from hostel.v_bed b
      where b.facility_id = ${r.facility_id} and b.room_type_id = ${r.room_type_id} and b.room_status <> 'Under_Maintenance' and b.reserved_for = 'None' and not b.is_blocked
        and exists (select 1 from hostel.v_bed v where v.space_id = b.space_id and v.bed_status = 'Vacant')
      order by b.floor_no, b.room_code, b.bed_code`);
    const rooms = new Map<string, { space_id: string; room_code: string; floor_name: string; floor_no: number; is_accessible: boolean; sharing_count: number; mates: number; beds: { subspace_id: string; bed_code: string; bed_status: string }[] }>();
    for (const b of rows) {
      if (!rooms.has(b.space_id)) rooms.set(b.space_id, { space_id: b.space_id, room_code: b.room_code, floor_name: b.floor_name, floor_no: b.floor_no, is_accessible: b.is_accessible, sharing_count: b.sharing_count, mates: b.mates, beds: [] });
      rooms.get(b.space_id)!.beds.push({ subspace_id: b.subspace_id, bed_code: b.bed_code, bed_status: b.bed_status });
    }
    return { status: r.status, rooms: [...rooms.values()] };
  }

  /** The student picks a bed: an offer the student has accepted by choosing it. Hostel and mess fees follow (fee plan). */
  async choose(user: AuthUser, id: number, subspaceId: string) {
    const r = await this.ownReg(user, id);
    if (!['Fee_Paid', 'Waitlisted'].includes(r.status)) throw new UnprocessableEntityException(r.status === 'Applied' ? 'Pay the registration fee first' : 'A room is already allotted to this registration');
    return this.dbs.run(user, async (tx) => {
      const [o] = (await tx.execute(sql`insert into hostel.room_offer (registration_id, subspace_id, offer_no, hold_until, created_by)
        values (${id}, ${subspaceId}, 0, now() + interval '1 hour', ${user.id}) returning offer_id::int as offer_id`)) as unknown as { offer_id: number }[];
      await tx.execute(sql`update hostel.room_offer set student_decision = 'Accepted', updated_by = ${user.id} where offer_id = ${o.offer_id}`);
      return { offer_id: o.offer_id, subspace_id: subspaceId };
    });
  }

  /**
   * Allotment approvals board (design "Room Allotment"): Awaiting payment -> L1 Warden verifies fees -> L2 Chief Manager
   * approves the bed -> Allotted (ready for the key). Each card carries its demands and receipts for the side panel.
   */
  approvals(facilityId?: string, user?: AuthUser) {
    return this.dbs.rows(sql`
      select r.registration_id::int as registration_id, r.registration_no, r.student_id, sm.full_name, sm.programme, rt.type_name, hp.hostel_code, f.facility_name as hostel_name,
        o.subspace_id, vb.room_code, vb.floor_no::int as floor_no, o.hold_until, r.status::text as status, r.fee_check_status, r.fee_check_remarks, r.fee_checked_on, fc.full_name as fee_checked_by,
        r.cw_status, r.cw_on, cw.full_name as cw_by, r.applied_on,
        case when r.fee_check_status = 'Query' then 'fee'
             when r.status = 'Confirmed' and r.cw_status = 'Approved' then 'allotted'
             when r.status = 'Confirmed' and r.fee_check_status = 'Verified' then 'approve'
             when r.status = 'Confirmed' then 'verify' else 'fee' end as stage,
        (select max(fr.paid_on) from hostel.fee_receipt fr join hostel.fee_demand d on d.demand_id = fr.demand_id where d.student_id = r.student_id and fr.gateway_status = 'Success') as last_paid,
        (select coalesce(json_agg(json_build_object('head', d.fee_head, 'inst', d.instalment_no, 'due', d.amount_due::float, 'paid', d.amount_paid::float, 'due_date', d.due_date, 'status', d.status,
            'receipt', (select fr.receipt_no from hostel.fee_receipt fr where fr.demand_id = d.demand_id and fr.gateway_status = 'Success' order by fr.paid_on desc limit 1),
            'paid_on', (select max(fr.paid_on) from hostel.fee_receipt fr where fr.demand_id = d.demand_id and fr.gateway_status = 'Success')) order by d.fee_head = 'Registration' desc, d.fee_head, d.instalment_no), '[]'::json)
          from hostel.fee_demand d where d.student_id = r.student_id and (d.demand_id = r.reg_demand_id or d.fee_plan_id = (select fee_plan_id from hostel.fee_plan p where p.registration_id = r.registration_id)
            or d.demand_id in (select ms.mess_demand_id from hostel.mess_subscription ms where ms.student_id = r.student_id and ms.academic_year = r.academic_year))) as fees
      from hostel.hostel_registration r join ref.student_master sm on sm.student_id = r.student_id join hostel.room_type rt on rt.room_type_id = r.room_type_id
      join hostel.hostel_profile hp on hp.facility_id = r.facility_id join infra.facility f on f.facility_id = r.facility_id
      left join hostel.room_offer o on o.registration_id = r.registration_id and o.student_decision in ('Pending','Accepted')
      left join hostel.v_bed vb on vb.subspace_id = o.subspace_id
      left join ref.staff_master fc on fc.staff_id = r.fee_checked_by left join ref.staff_master cw on cw.staff_id = r.cw_by
      where r.status in ('Allotted','Accepted','Confirmed') and ${facWhere('r.facility_id', facilityId, user)}
      order by r.applied_on`);
  }

  /** L2: the Chief Manager approves the bed (needs the Warden's fee check) or returns it to the student with remarks. */
  async cwDecide(user: AuthUser, id: number, dto: { decision: 'Approved' | 'Returned'; remarks?: string }) {
    const [r] = await this.dbs.rows<{ status: string; fee_check_status: string; facility_id: string }>(sql`select status::text as status, fee_check_status, facility_id from hostel.hostel_registration where registration_id = ${id}`);
    if (!r) throw new NotFoundException('Registration not found');
    assertScope(user, r.facility_id);
    if (dto.decision === 'Approved' && (r.status !== 'Confirmed' || r.fee_check_status !== 'Verified')) throw new UnprocessableEntityException('Room Allotment must verify the fees first');
    if (dto.decision === 'Returned' && !dto.remarks?.trim()) throw new UnprocessableEntityException('Write the remarks for the student');
    return this.dbs.run(user, async (tx) => {
      if (dto.decision === 'Approved') {
        await tx.execute(sql`update hostel.hostel_registration set cw_status = 'Approved', cw_by = ${user.id}, cw_on = now(), updated_by = ${user.id} where registration_id = ${id}`);
      } else {
        await tx.execute(sql`update hostel.hostel_registration set fee_check_status = 'Query', fee_checked_by = ${user.id}, fee_checked_on = now(), fee_check_remarks = ${dto.remarks!.trim()},
          cw_status = 'Pending', cw_by = null, cw_on = null, updated_by = ${user.id} where registration_id = ${id}`);
      }
      return { registration_id: id, decision: dto.decision };
    });
  }

  /** Change why a room is blocked. */
  blockReason(user: AuthUser, blockId: number, reason: string, remarks?: string) {
    return this.dbs.run(user, (tx) => tx.execute(sql`update hostel.room_block set reason = ${reason}::hostel.block_reason, remarks = ${remarks ?? null}, updated_by = ${user.id}, updated_at = now()
      where block_id = ${blockId} and status = 'Blocked' returning block_id`)).then((x) => { if (!(x as unknown as unknown[]).length) throw new NotFoundException('No active block'); return { block_id: blockId }; });
  }

  /** Warden: registrations whose fees are paid, with what was demanded and received, waiting for the fee check. */
  feeChecks(facilityId?: string, status = 'Pending', user?: AuthUser) {
    return this.dbs.rows(sql`
      select r.registration_id::int as registration_id, r.registration_no, r.student_id, sm.full_name, sm.programme, hp.hostel_code, rt.type_name, r.status::text as status,
        o.subspace_id, r.fee_check_status, r.fee_check_remarks, r.fee_checked_on, cs.full_name as fee_checked_by,
        coalesce(d.due, 0)::float as amount_due, coalesce(d.paid, 0)::float as amount_paid, coalesce(d.open, 0)::int as open_demands, coalesce(rc.n, 0)::int as receipts, rc.last_paid,
        coalesce(rc.modes, '') as modes
      from hostel.hostel_registration r
      join ref.student_master sm on sm.student_id = r.student_id
      join hostel.hostel_profile hp on hp.facility_id = r.facility_id
      join hostel.room_type rt on rt.room_type_id = r.room_type_id
      left join hostel.room_offer o on o.registration_id = r.registration_id and o.student_decision = 'Accepted'
      left join ref.staff_master cs on cs.staff_id = r.fee_checked_by
      left join lateral (select sum(x.amount_due) as due, sum(x.amount_paid) as paid, count(*) filter (where x.status not in ('Paid','Waived')) as open
        from hostel.fee_demand x where x.student_id = r.student_id and (x.demand_id = r.reg_demand_id or x.fee_plan_id = (select fee_plan_id from hostel.fee_plan p where p.registration_id = r.registration_id)
          or x.demand_id in (select ms.mess_demand_id from hostel.mess_subscription ms where ms.student_id = r.student_id and ms.academic_year = r.academic_year))) d on true
      left join lateral (select count(*) as n, max(fr.paid_on) as last_paid, string_agg(distinct fr.payment_mode::text, ', ') as modes from hostel.fee_receipt fr join hostel.fee_demand x on x.demand_id = fr.demand_id
        where x.student_id = r.student_id and fr.gateway_status = 'Success' and fr.paid_on >= r.applied_on) rc on true
      where r.status in ('Accepted','Confirmed','Checked_In') and ${facWhere('r.facility_id', facilityId, user)}
        and (${status} = 'All' or r.fee_check_status = ${status})
      order by (r.status = 'Confirmed') desc, r.applied_on`);
  }

  async feeCheck(user: AuthUser, id: number, dto: { decision: 'Verified' | 'Query'; remarks?: string }) {
    const r = await this.ownReg(user, id);
    assertScope(user, r.facility_id);
    if (dto.decision === 'Verified' && r.status !== 'Confirmed') throw new UnprocessableEntityException('Fees can be verified once every demand is paid (status Confirmed)');
    if (dto.decision === 'Query' && !dto.remarks) throw new UnprocessableEntityException('Say what is wrong with the fees');
    return this.dbs.run(user, async (tx) => {
      await tx.execute(sql`update hostel.hostel_registration set fee_check_status = ${dto.decision}, fee_checked_by = ${user.id}, fee_checked_on = now(), fee_check_remarks = ${dto.remarks ?? null}, updated_by = ${user.id}
        where registration_id = ${id}`);
      return { registration_id: id, fee_check_status: dto.decision };
    });
  }
}
