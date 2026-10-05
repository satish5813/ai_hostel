import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { facWhere } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';

const SHARE_COLS = sql`s.share_id::int as share_id, s.student_id, initcap(sm.full_name) as name, s.days_in_room::int as days, s.share_pct::float as share_pct, s.units::float as units,
  s.amount::float as amount, coalesce(d.amount_paid, 0)::float as paid, coalesce(d.status::text, case when s.amount = 0 then 'Nothing due' end) as status, to_char(d.due_date, 'YYYY-MM-DD') as due_date,
  (d.status::text in ('Pending', 'Part_Paid', 'Overdue') and d.due_date < current_date) as overdue`;

/**
 * ELE-04 Room electricity bills. Each month every metered room is billed for the units beyond those included in the fee
 * and those already bought by recharge; the bill is shared equally among the roommates by the days each lived there
 * (hostel.fn_generate_electricity_bills), and each share is the student's Electricity fee demand, paid in the fees portal.
 */
@Injectable()
export class ElectricityService {
  constructor(private dbs: DbService) {}

  /** The student's shares, month by month, with the room's bill they come from. */
  async mine(user: AuthUser) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    const rows = await this.dbs.rows(sql`select to_char(b.bill_month, 'YYYY-MM') as month, b.space_id, b.units_used::float as room_units, b.included_units::float as included,
        b.recharged_units::float as recharged, b.billable_units::float as billable, b.rate_per_unit::float as rate, b.amount::float as room_amount, b.occupants::int as occupants,
        ${SHARE_COLS}, (select string_agg(initcap(x.full_name), ', ') from hostel.electricity_bill_share o join ref.student_master x on x.student_id = o.student_id
          where o.bill_id = b.bill_id and o.student_id <> s.student_id) as roommates, d.demand_id::int as demand_id
      from hostel.electricity_bill_share s join hostel.electricity_bill b using (bill_id) join ref.student_master sm on sm.student_id = s.student_id
      left join hostel.fee_demand d on d.demand_id = s.demand_id where s.student_id = ${user.id} and b.status = 'Issued' order by b.bill_month desc limit 12`);
    const [tot] = await this.dbs.rows(sql`select coalesce(sum(d.amount_due), 0)::float as billed, coalesce(sum(d.amount_paid), 0)::float as paid,
        coalesce(sum(d.amount_due - d.amount_paid) filter (where d.status::text not in ('Paid', 'Waived')), 0)::float as due
      from hostel.fee_demand d where d.student_id = ${user.id} and d.fee_head = 'Electricity'`);
    return { bills: rows, totals: tot };
  }

  /** Rooms of a month with each roommate's share and whether it is paid. */
  async bills(user: AuthUser, month?: string, facilityId?: string) {
    const months = await this.dbs.rows<{ month: string }>(sql`select distinct to_char(bill_month, 'YYYY-MM') as month from hostel.electricity_bill order by 1 desc`);
    const m = month ?? months[0]?.month;
    if (!m) return { months: [], month: null, rooms: [], totals: null };
    const rooms = await this.dbs.rows<Record<string, unknown> & { bill_id: number; units: number }>(sql`select b.bill_id::int as bill_id, b.space_id, sp.space_code, f.hostel_code, f.facility_id,
        b.opening_reading::float as opening, b.closing_reading::float as closing, b.units_used::float as units, b.included_units::float as included, b.recharged_units::float as recharged,
        b.billable_units::float as billable, b.rate_per_unit::float as rate, b.amount::float as amount, b.occupants::int as occupants
      from hostel.electricity_bill b join infra.space sp on sp.space_id = b.space_id join (select distinct space_id, facility_id, hostel_code from hostel.v_bed) f on f.space_id = b.space_id
      where b.bill_month = ${`${m}-01`}::date and b.status = 'Issued' and ${facWhere('f.facility_id', facilityId, user)} order by f.hostel_code, sp.space_code`);
    const shares = rooms.length ? await this.dbs.rows<Record<string, unknown> & { bill_id: number; amount: number; paid: number; overdue: boolean }>(sql`select s.bill_id::int as bill_id, ${SHARE_COLS}
      from hostel.electricity_bill_share s join ref.student_master sm on sm.student_id = s.student_id left join hostel.fee_demand d on d.demand_id = s.demand_id
      where s.bill_id = any(string_to_array(${rooms.map((r) => r.bill_id).join(',')}, ',')::bigint[]) order by s.student_id`) : [];
    const list = rooms.map((r) => ({ ...r, shares: shares.filter((s) => s.bill_id === r.bill_id) }));
    const all = list.flatMap((r) => r.shares);
    return { months: months.map((x) => x.month), month: m, rooms: list,
      totals: { rooms: list.length, units: list.reduce((a, r) => a + Number(r.units), 0), billed: all.reduce((a, s) => a + s.amount, 0), paid: all.reduce((a, s) => a + s.paid, 0),
        students: all.length, unpaid: all.filter((s) => s.paid < s.amount).length, overdue: all.filter((s) => s.overdue).length } };
  }

  async generate(user: AuthUser, month: string) {
    const first = `${month}-01`;
    const [{ ok }] = await this.dbs.rows<{ ok: boolean }>(sql`select ${first}::date < date_trunc('month', current_date)::date as ok`);
    if (!ok) throw new BadRequestException('A month is billed once it is over');
    const [r] = await this.dbs.run(user, (tx) => tx.execute(sql`select hostel.fn_generate_electricity_bills(${first}::date)::int as rooms`)) as unknown as { rooms: number }[];
    return r;
  }

  /**
   * For EXE-01: everything paid towards electricity (room bill shares and prepaid recharges), cumulative and by month,
   * for each building.
   */
  async summary() {
    const byBuilding = await this.dbs.rows(sql`
      with dem as (
        select d.*, coalesce(bsp.space_id, rsp.space_id) as space_id from hostel.fee_demand d
        left join hostel.electricity_bill_share s on d.reference_type = 'electricity_bill_share' and s.share_id = d.reference_id
        left join hostel.electricity_bill bsp on bsp.bill_id = s.bill_id
        left join hostel.meter_recharge mr on d.reference_type = 'meter_recharge' and mr.recharge_id = d.reference_id
        left join hostel.room_meter rsp on rsp.meter_id = mr.meter_id
        where d.fee_head = 'Electricity'),
      fac as (select distinct space_id, facility_id from hostel.v_bed)
      select f.facility_id, coalesce(sum(d.amount_due), 0)::float as billed, coalesce(sum(d.amount_paid), 0)::float as collected,
        coalesce(sum(d.amount_due - d.amount_paid) filter (where d.status::text not in ('Paid', 'Waived')), 0)::float as outstanding,
        coalesce(sum(d.amount_due - d.amount_paid) filter (where d.status::text not in ('Paid', 'Waived') and d.due_date < current_date), 0)::float as overdue,
        count(distinct d.student_id) filter (where d.status::text not in ('Paid', 'Waived') and d.amount_due > d.amount_paid)::int as students_due,
        coalesce(sum(d.amount_paid) filter (where d.reference_type = 'meter_recharge'), 0)::float as recharges,
        (select coalesce(sum(b.units_used), 0)::float from hostel.electricity_bill b join fac x on x.space_id = b.space_id where x.facility_id = f.facility_id) as units
      from dem d join fac f on f.space_id = d.space_id group by f.facility_id`);
    // one row per bill (so a room's units are counted once, not once per roommate), then by month
    const byMonth = await this.dbs.rows(sql`select to_char(b.bill_month, 'YYYY-MM') as month, sum(b.units_used)::float as units, sum(b.amount)::float as billed,
        sum((select coalesce(sum(d.amount_paid), 0) from hostel.electricity_bill_share s join hostel.fee_demand d on d.demand_id = s.demand_id where s.bill_id = b.bill_id))::float as collected
      from hostel.electricity_bill b where b.status = 'Issued' group by b.bill_month order by b.bill_month`);
    return { by_building: byBuilding, by_month: byMonth };
  }
}
