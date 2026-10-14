import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { assertScope, facWhere } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';

type Current = { registration_id: number; registration_no: string; academic_year: string; facility_id: string; room_type_id: number; next_year_intent: string | null; continued_into: number | null;
  bed_label: string; subspace_id: string; hostel_name: string; type_name: string | null; hostel_alloc_id: number; key_no: string };

/** Room Allotment can continue a stay this many days before the new academic year starts. */
const CONTINUE_DAYS = 15;

/**
 * Yearly renewal (Workflow A, every academic year). A resident renews in the renewal window: Keep my room reserves the bed
 * they live in, Change joins next year's allotment queue, Leaving is recorded. After the fee check (Room Allotment) and
 * the Chief Manager's approval, Room Allotment continues the stay into the new year (hostel.fn_continue_stay).
 */
@Injectable()
export class RenewalService {
  constructor(private dbs: DbService) {}

  /** The student's registration that holds the bed today, and the year after it. */
  private async current(studentId: string) {
    const [c] = await this.dbs.rows<Current>(sql`
      select r.registration_id::int as registration_id, r.registration_no, r.academic_year, r.facility_id, r.room_type_id::int as room_type_id, r.next_year_intent,
             r.continued_into::int as continued_into, b.bed_label, b.subspace_id, b.hostel_name, b.type_name, a.hostel_alloc_id::int as hostel_alloc_id, a.key_no
      from hostel.hostel_allocation a join hostel.room_offer o on o.offer_id = a.offer_id join hostel.hostel_registration r on r.registration_id = o.registration_id
      join hostel.v_bed b on b.subspace_id = a.subspace_id
      where a.student_id = ${studentId} and a.status = 'Active' and a.occupant_type = 'Student'`);
    if (!c) return { current: null, next: null };
    const [next] = await this.dbs.rows<{ academic_year: string; start_date: string; end_date: string; renewal_opens: string | null; renewal_closes: string | null; registration_opens: string | null; registration_closes: string | null; renewal_open: boolean; registration_open: boolean }>(sql`
      select y.academic_year, y.start_date, y.end_date, y.renewal_opens, y.renewal_closes, y.registration_opens, y.registration_closes,
             coalesce(current_date between y.renewal_opens and coalesce(y.renewal_closes, 'infinity'::date), false) as renewal_open,
             coalesce(current_date between y.registration_opens and coalesce(y.registration_closes, 'infinity'::date), false) as registration_open
      from hostel.academic_year y where y.start_date > (select start_date from hostel.academic_year where academic_year = ${c.academic_year}) order by y.start_date limit 1`);
    return { current: c, next: next ?? null };
  }

  async mine(user: AuthUser) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    const { current, next } = await this.current(user.id);
    if (!current || !next) return { current, next, same_fee: null, renewal: null, demands: [] };
    const [fee] = await this.dbs.rows(sql`select 0::float as registration_fee, hostel_fee::float as hostel_fee, meter_charge::float as meter_charge,
        (select m.annual_fee::float from hostel.mess_master m join hostel.hostel_profile hp on hp.default_mess_id = m.mess_id where hp.facility_id = room_type_fee.facility_id) as mess_fee
      from hostel.room_type_fee where facility_id = ${current.facility_id} and room_type_id = ${current.room_type_id} and academic_year = ${next.academic_year}`);
    const [renewal] = await this.dbs.rows<Record<string, unknown>>(sql`
      select to_jsonb(v) || jsonb_build_object('registration_id', v.registration_id::int, 'offer_id', v.offer_id::int, 'fee_plan_id', v.fee_plan_id::int, 'registration_fee', v.registration_fee::text,
               'retain_subspace_id', r.retain_subspace_id, 'renewal_of', r.renewal_of::int, 'bed_label', (select bed_label from hostel.v_bed where subspace_id = coalesce(v.subspace_id, r.retain_subspace_id))) as r
      from hostel.v_registration v join hostel.hostel_registration r on r.registration_id = v.registration_id
      where v.student_id = ${user.id} and v.academic_year = ${next.academic_year} and v.status::text <> 'Cancelled' limit 1`).then((x) => x.map((y) => y.r as Record<string, unknown>));
    const demands = renewal ? await this.dbs.rows(sql`
      select d.demand_id::int as demand_id, d.fee_head::text as fee_head, d.instalment_no, d.amount_due, d.amount_paid, d.due_date, d.status::text as status
      from hostel.fee_demand d left join hostel.fee_plan p on p.fee_plan_id = d.fee_plan_id
      where d.demand_id = (select reg_demand_id from hostel.hostel_registration where registration_id = ${renewal.registration_id as number}) or p.registration_id = ${renewal.registration_id as number}
         or (d.fee_head = 'Mess' and d.reference_type = 'mess_subscription' and d.demand_id in (select mess_demand_id from hostel.mess_subscription where student_id = ${user.id} and academic_year = ${next.academic_year}))
      order by d.due_date`) : [];
    return { current, next, same_fee: fee ?? null, renewal: renewal ?? null, demands };
  }

  async choose(user: AuthUser, dto: { choice: 'Keep' | 'Change' | 'Leave'; facility_id?: string; room_type_id?: number }) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    const { current, next } = await this.current(user.id);
    if (!current) throw new UnprocessableEntityException('Renewal is for students living in a hostel');
    if (!next) throw new UnprocessableEntityException('The next academic year is not set up yet');
    const [existing] = await this.dbs.rows(sql`select 1 from hostel.hostel_registration where student_id = ${user.id} and academic_year = ${next.academic_year} and status <> 'Cancelled'`);
    if (existing) throw new UnprocessableEntityException(`You have already registered for ${next.academic_year}`);
    if (dto.choice === 'Leave') {
      await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.hostel_registration set next_year_intent = 'Leave', updated_by = ${user.id} where registration_id = ${current.registration_id}`));
      return { choice: 'Leave' };
    }
    const facility = dto.choice === 'Keep' ? current.facility_id : dto.facility_id;
    const type = dto.choice === 'Keep' ? current.room_type_id : dto.room_type_id;
    if (!facility || !type) throw new BadRequestException('Choose the hostel and room type for next year');
    const id = await this.dbs.run(user, async (tx) => {
      const [r] = (await tx.execute(sql`insert into hostel.hostel_registration (student_id, academic_year, facility_id, room_type_id, rules_accepted, renewal_of, retain_subspace_id, remarks, created_by)
        values (${user.id}, ${next.academic_year}, ${facility}, ${type}, true, ${current.registration_id}, ${dto.choice === 'Keep' ? current.subspace_id : null},
                ${dto.choice === 'Keep' ? `Renewal: keeps ${current.bed_label}` : 'Renewal: asks for another room'}, ${user.id})
        returning registration_id::int as registration_id`)) as unknown as { registration_id: number }[];
      await tx.execute(sql`update hostel.hostel_registration set next_year_intent = 'Renew', updated_by = ${user.id} where registration_id = ${current.registration_id}`);
      return r.registration_id;
    });
    return { choice: dto.choice, registration_id: id };
  }

  /** Keep my room: once the registration fee is paid, the bed the student lives in is reserved for next year. */
  async keepRoom(user: AuthUser, registrationId: number) {
    const [r] = await this.dbs.rows<{ student_id: string; status: string; retain_subspace_id: string | null }>(sql`
      select student_id, status::text as status, retain_subspace_id from hostel.hostel_registration where registration_id = ${registrationId}`);
    if (!r) throw new NotFoundException('Registration not found');
    if (user.kind !== 'student' || r.student_id !== user.id) throw new ForbiddenException('Own registration only');
    if (!r.retain_subspace_id) throw new UnprocessableEntityException('This renewal asked for another room');
    if (r.status !== 'Fee_Paid') throw new UnprocessableEntityException(r.status === 'Applied' ? 'Pay the registration fee first' : `This renewal is ${r.status}`);
    return this.dbs.run(user, async (tx) => {
      const [o] = (await tx.execute(sql`insert into hostel.room_offer (registration_id, subspace_id, offer_no, hold_until, created_by)
        values (${registrationId}, ${r.retain_subspace_id}, 0, now(), ${user.id}) returning offer_id::int as offer_id`)) as unknown as { offer_id: number }[];
      await tx.execute(sql`update hostel.room_offer set student_decision = 'Accepted', updated_by = ${user.id} where offer_id = ${o.offer_id}`);
      return { offer_id: o.offer_id };
    });
  }

  /** Office: every resident of this year and where they are with next year. */
  async board(user: AuthUser, facilityId?: string) {
    const rows = await this.dbs.rows<Record<string, unknown> & { stage: string }>(sql`
      with cur as (select academic_year, start_date from hostel.academic_year where is_current),
      ny as (select y.academic_year, y.start_date from hostel.academic_year y, cur where y.start_date > cur.start_date order by y.start_date limit 1)
      select (select to_char(start_date - ${CONTINUE_DAYS}::int, 'YYYY-MM-DD') from ny) as continue_from, r.registration_id::int as registration_id, r.student_id, initcap(sm.full_name) as full_name, sm.programme, r.next_year_intent,
             b.bed_label, b.facility_id, b.hostel_code, b.floor_name, (select academic_year from ny) as next_year,
             n.registration_id::int as next_registration_id, n.registration_no as next_registration_no, n.status::text as next_status, n.fee_check_status, n.cw_status,
             (n.retain_subspace_id is not null) as keeps_room,
             (select vb.bed_label from hostel.room_offer o join hostel.v_bed vb on vb.subspace_id = o.subspace_id where o.registration_id = n.registration_id and o.student_decision = 'Accepted' order by o.offer_no desc limit 1) as next_bed,
             case when r.continued_into is not null then 'Continued'
                  when n.registration_id is null and r.next_year_intent = 'Leave' then 'Leaving'
                  when n.registration_id is null then 'Not decided'
                  when n.status = 'Applied' then 'Registration fee'
                  when n.status in ('Fee_Paid', 'Waitlisted') and n.retain_subspace_id is not null then 'Confirm room'
                  when n.status in ('Fee_Paid', 'Waitlisted', 'Allotted') then 'Waiting for a bed'
                  when n.status = 'Accepted' then 'Hostel fees'
                  when n.status = 'Confirmed' and n.fee_check_status <> 'Verified' then 'Fee check'
                  when n.status = 'Confirmed' and n.cw_status <> 'Approved' then 'Chief Manager'
                  when n.status = 'Confirmed' then 'Ready to continue'
                  else initcap(replace(n.status::text, '_', ' ')) end as stage
      from hostel.hostel_registration r join cur on cur.academic_year = r.academic_year
      join ref.student_master sm on sm.student_id = r.student_id
      join hostel.hostel_allocation a on a.student_id = r.student_id and a.status = 'Active' and a.occupant_type = 'Student'
      join hostel.v_bed b on b.subspace_id = a.subspace_id
      left join hostel.hostel_registration n on n.renewal_of = r.registration_id and n.status <> 'Cancelled'
      where r.status = 'Checked_In' and ${facWhere('b.facility_id', facilityId, user)}
      order by b.hostel_code, b.bed_label`);
    const count = (s: string) => rows.filter((x) => x.stage === s).length;
    return {
      next_year: rows[0]?.next_year ?? null,
      continue_from: rows[0]?.continue_from ?? null,
      can_continue: process.env.RENEWAL_CONTINUE_ANYTIME === '1' || (rows[0]?.continue_from != null && new Date().toISOString().slice(0, 10) >= (rows[0].continue_from as string)),
      summary: { residents: rows.length, continued: count('Continued'), ready: count('Ready to continue'), leaving: count('Leaving'), undecided: count('Not decided'),
        in_progress: rows.length - count('Continued') - count('Ready to continue') - count('Leaving') - count('Not decided') },
      rows,
    };
  }

  async continueStay(user: AuthUser, registrationId: number, keyNo?: string) {
    const [r] = await this.dbs.rows<{ facility_id: string; opens: string; early: boolean }>(sql`
      select r.facility_id, to_char(y.start_date - ${CONTINUE_DAYS}::int, 'DD Mon YYYY') as opens, current_date < y.start_date - ${CONTINUE_DAYS}::int as early
      from hostel.hostel_registration r join hostel.academic_year y on y.academic_year = r.academic_year where r.registration_id = ${registrationId}`);
    if (!r) throw new NotFoundException('Registration not found');
    assertScope(user, r.facility_id);
    // Continuing closes this year's allocation and mess, so it waits until the new year is close.
    if (r.early && process.env.RENEWAL_CONTINUE_ANYTIME !== '1') throw new UnprocessableEntityException(`Continue stay opens on ${r.opens}, ${CONTINUE_DAYS} days before the new year starts`);
    const out = await this.dbs.run(user, (tx) => tx.execute(sql`select hostel.fn_continue_stay(${registrationId}, ${user.id}, ${keyNo ?? null})::int as hostel_alloc_id`)) as unknown as { hostel_alloc_id: number }[];
    return { hostel_alloc_id: out[0]?.hostel_alloc_id };
  }
}
