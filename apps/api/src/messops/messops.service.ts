import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

export const MESS_STAFF = ['Mess_Incharge', 'Mess_Manager', 'Mess_Supervisor', 'Mess_Storekeeper', 'Chief_Chef', 'admin'];
export const MESS_HEADS = ['Mess_Incharge', 'Mess_Manager', 'admin'];
export const MESS_VIEW = [...MESS_STAFF, 'Chief_Warden', 'Director_Hostels'];
const MEALS = ['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner'] as const;
type Meal = (typeof MEALS)[number];
const today = sql`(now() at time zone 'Asia/Kolkata')::date`;

/**
 * Mess operations (workflow G): grievances (MES-03), meal scan at the counter (MES-04), the mess store (MES-05),
 * the daily record (MES-06) and the monthly report (MES-07). Rules are in db/migrations/119.
 */
@Injectable()
export class MessOpsService {
  constructor(private dbs: DbService) {}

  private run<T>(user: AuthUser, q: SQL) { return this.dbs.run(user, (tx) => tx.execute(q)) as unknown as Promise<T[]>; }

  messes() {
    return this.dbs.rows(sql`select m.mess_id::int as mess_id, m.mess_name, m.facility_id,
        (select count(*)::int from hostel.mess_subscription s where s.mess_id = m.mess_id and s.status = 'Active') as strength
      from hostel.mess_master m order by m.mess_name`);
  }

  /* ------------------------------------------------------------ MES-03 grievances */

  async myGrievances(user: AuthUser) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    const [sub] = await this.dbs.rows(sql`select s.mess_id::int as mess_id, m.mess_name from hostel.mess_subscription s join hostel.mess_master m using (mess_id)
      where s.student_id = ${user.id} and s.status = 'Active' order by s.subscription_id desc limit 1`);
    const rows = await this.dbs.rows(sql`select f.feedback_id::int as feedback_id, f.meal_date, f.slot, f.aspect, f.rating, f.details, f.status, f.submitted_at,
        f.action_taken, initcap(st.full_name) as action_by_name, f.closed_at
      from hostel.mess_feedback f left join ref.staff_master st on st.staff_id = f.action_by
      where f.student_id = ${user.id} and f.entry_type = 'Grievance' order by f.feedback_id desc limit 30`);
    return { mess: sub ?? null, grievances: rows };
  }

  async raiseGrievance(user: AuthUser, dto: { meal_date: string; slot: Meal; aspect: string; details: string; rating?: number | null }) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    const [ok] = await this.dbs.rows<{ ok: boolean }>(sql`select ${dto.meal_date}::date between ${today} - 3 and ${today} as ok`);
    if (!ok.ok) throw new UnprocessableEntityException('Report a meal from today or the last three days');
    const rows = await this.run<{ feedback_id: number }>(user, sql`insert into hostel.mess_feedback (entry_type, student_id, mess_id, meal_date, slot, aspect, rating, details, created_by)
      select 'Grievance', ${user.id}, s.mess_id, ${dto.meal_date}::date, ${dto.slot}, ${dto.aspect}, ${dto.rating ?? null}, ${dto.details}, ${user.id}
      from hostel.mess_subscription s where s.student_id = ${user.id} and s.status = 'Active' order by s.subscription_id desc limit 1
      returning feedback_id::int as feedback_id`);
    if (!rows.length) throw new UnprocessableEntityException('You are not taking meals in a hostel mess');
    return rows[0];
  }

  async grievances(messId: number, status?: string) {
    const rows = await this.dbs.rows(sql`select f.feedback_id::int as feedback_id, f.meal_date, f.slot, f.aspect, f.rating, f.details, f.status, f.submitted_at, f.action_taken,
        initcap(st.full_name) as action_by_name, f.student_id, initcap(sm.full_name) as student_name, b.bed_label
      from hostel.mess_feedback f join ref.student_master sm on sm.student_id = f.student_id left join ref.staff_master st on st.staff_id = f.action_by
      left join hostel.v_bed b on b.student_id = f.student_id
      where f.mess_id = ${messId} and f.entry_type = 'Grievance' and (${status ?? null}::text is null or f.status = ${status ?? null})
      order by (f.status = 'Open') desc, f.meal_date desc, f.feedback_id desc limit 300`);
    const days = await this.dbs.rows(sql`select d.meal_date, d.slot, d.students::int as students, d.strength::int as strength, d.main_aspect, d.open::int as open, d.significant,
        s.raised_to_management_at, s.action_summary, s.status as summary_status
      from hostel.v_mess_grievance_day d left join hostel.mess_grievance_summary s on s.mess_id = d.mess_id and s.meal_date = d.meal_date and s.slot = d.slot
      where d.mess_id = ${messId} and d.meal_date >= ${today} - 30 order by d.meal_date desc, d.slot`);
    return { grievances: rows, days };
  }

  async reply(user: AuthUser, id: number, dto: { action_taken: string; close: boolean }) {
    const rows = await this.run(user, sql`update hostel.mess_feedback set action_taken = ${dto.action_taken}, action_by = ${user.id},
        status = ${dto.close ? 'Closed' : 'Replied'}, closed_at = case when ${dto.close} then now() end, updated_by = ${user.id}
      where feedback_id = ${id} and entry_type = 'Grievance' and status <> 'Closed' returning student_id, feedback_id`);
    if (!rows.length) throw new UnprocessableEntityException('This grievance is closed or does not exist');
    await this.run(user, sql`insert into shared.notification (recipient_type, student_id, channel, template_code, subject, body, related_type, related_id)
      select 'Student', student_id, 'In_App', 'MESS_GRIEVANCE', 'Reply to your mess complaint', ${`The mess replied: ${dto.action_taken}`}, 'mess_feedback', feedback_id::text
      from hostel.mess_feedback where feedback_id = ${id}`);
    return { ok: true };
  }

  /** A significant meal goes to management (Chief Warden, Dean, reports) with what the mess is doing about it. */
  raise(user: AuthUser, dto: { mess_id: number; meal_date: string; slot: string; action_summary?: string | null }) {
    return this.run(user, sql`insert into hostel.mess_grievance_summary (mess_id, meal_date, slot, students_count, mess_strength, is_significant, main_aspect, raised_to_management_at, action_summary, status, created_by)
      select d.mess_id, d.meal_date, d.slot, d.students, d.strength, d.significant, d.main_aspect, now(), ${dto.action_summary ?? null},
             case when ${dto.action_summary ?? null}::text is null then 'Open' else 'Action_Taken' end, ${user.id}
      from hostel.v_mess_grievance_day d where d.mess_id = ${dto.mess_id} and d.meal_date = ${dto.meal_date}::date and d.slot = ${dto.slot}
      on conflict (mess_id, meal_date, slot) do update set action_summary = coalesce(excluded.action_summary, hostel.mess_grievance_summary.action_summary),
        status = case when excluded.action_summary is not null then 'Action_Taken' else hostel.mess_grievance_summary.status end, updated_by = ${user.id}
      returning meal_date`).then((r) => { if (!r.length) throw new NotFoundException('No grievances for that meal'); return { ok: true }; });
  }

  /* ------------------------------------------------------------ MES-04 meal scan */

  async scanSummary(messId: number, meal: Meal) {
    const [n] = await this.dbs.rows(sql`select (select count(*)::int from hostel.meal_attendance a where a.mess_id = ${messId} and a.meal_date = ${today} and a.meal = ${meal}) as scanned,
        (select count(*)::int from hostel.mess_subscription s where s.mess_id = ${messId} and s.status = 'Active') as strength,
        (select count(*)::int from hostel.sick_leave l join hostel.mess_subscription s on s.student_id = l.student_id and s.status = 'Active' and s.mess_id = ${messId}
          where l.status = 'Approved' and ${today} between l.from_date and l.to_date) as sick`);
    const recent = await this.dbs.rows(sql`select a.student_id, initcap(sm.full_name) as name, a.scanned_at from hostel.meal_attendance a join ref.student_master sm using (student_id)
      where a.mess_id = ${messId} and a.meal_date = ${today} and a.meal = ${meal} order by a.scanned_at desc limit 12`);
    return { ...n, recent };
  }

  /** One student at the counter: let in, or say why not. Only a student who may eat here now is recorded. */
  async scan(user: AuthUser, dto: { mess_id: number; meal: Meal; student_id: string }) {
    const id = dto.student_id.trim().toUpperCase();
    const [s] = await this.dbs.rows<{ student_id: string; name: string; photo: string | null; bed_label: string | null; mess_id: number | null; mess_name: string | null;
      diet: string | null; cuisine: string | null; sick: boolean; scanned_at: string | null }>(sql`
      select sm.student_id, initcap(sm.full_name) as name, p.image as photo, b.bed_label, sub.mess_id::int as mess_id, sub.mess_name, sub.diet, sub.cuisine::text as cuisine,
        exists (select 1 from hostel.sick_leave l where l.student_id = sm.student_id and l.status = 'Approved' and ${today} between l.from_date and l.to_date) as sick,
        (select a.scanned_at from hostel.meal_attendance a where a.student_id = sm.student_id and a.meal_date = ${today} and a.meal = ${dto.meal}) as scanned_at
      from ref.student_master sm left join hostel.student_photo p on p.student_id = sm.student_id left join hostel.v_bed b on b.student_id = sm.student_id
      left join lateral (select s.mess_id, m.mess_name, s.diet, s.cuisine from hostel.mess_subscription s join hostel.mess_master m using (mess_id)
                          where s.student_id = sm.student_id and s.status = 'Active' order by s.subscription_id desc limit 1) sub on true
      where upper(sm.student_id) = ${id}`);
    if (!s) return { result: 'unknown', message: `No student with ID ${id}` };
    const student = { student_id: s.student_id, name: s.name, photo: s.photo, bed_label: s.bed_label, diet: s.diet, cuisine: s.cuisine };
    if (s.scanned_at) return { result: 'already', message: `Already had ${dto.meal.replace('_', ' ').toLowerCase()} at ${new Date(s.scanned_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}`, student };
    if (!s.mess_id) return { result: 'not_subscribed', message: 'Not taking meals in any hostel mess', student };
    if (s.mess_id !== dto.mess_id) return { result: 'other_mess', message: `Eats in ${s.mess_name}`, student };
    if (s.sick) return { result: 'sick', message: 'On sick leave: the meal goes to the room', student };
    await this.run(user, sql`insert into hostel.meal_attendance (student_id, meal_date, meal, mess_id, scanned_at, created_by)
      values (${s.student_id}, ${today}, ${dto.meal}, ${dto.mess_id}, now(), ${user.id}) on conflict do nothing`);
    return { result: 'ok', message: 'Enjoy your meal', student };
  }

  /* ------------------------------------------------------------ MES-05 store */

  async store(messId: number) {
    const stock = await this.dbs.rows(sql`select sku, name, base_unit, reorder_level::float as reorder_level, received::float as received, issued::float as issued, on_hand::float as on_hand,
        avg_rate::float as avg_rate, stock_value::float as stock_value, last_received, last_issued, next_expiry, reorder, daily_use::float as daily_use, days_left
      from hostel.v_mess_stock where mess_id = ${messId} order by reorder desc, name`);
    const receipts = await this.dbs.rows(sql`select r.receipt_id::int as receipt_id, r.received_on, r.supplier, r.bill_no, initcap(st.full_name) as received_by_name,
        count(l.sku)::int as items, coalesce(sum(l.qty * l.rate), 0)::float as value,
        string_agg(m.name || ' ' || trim(to_char(l.qty, 'FM999990.###')) || ' ' || m.base_unit, ', ' order by m.name) as lines
      from hostel.mess_store_receipt r left join hostel.mess_store_receipt_line l using (receipt_id) left join portal.material m on m.sku = l.sku
      left join ref.staff_master st on st.staff_id = r.received_by
      where r.mess_id = ${messId} group by r.receipt_id, st.full_name order by r.received_on desc, r.receipt_id desc limit 25`);
    const issues = await this.dbs.rows(sql`select i.issue_id::int as issue_id, i.issue_date, i.meal, i.student_strength, i.remarks, initcap(ib.full_name) as issued_by_name,
        initcap(ab.full_name) as acknowledged_by_name, i.acknowledged_at, count(l.sku)::int as items,
        coalesce(sum(l.qty * coalesce(s.avg_rate, 0)), 0)::float as value,
        string_agg(m.name || ' ' || trim(to_char(l.qty, 'FM999990.###')) || ' ' || m.base_unit, ', ' order by m.name) as lines
      from hostel.mess_issue i left join hostel.mess_issue_line l using (issue_id) left join portal.material m on m.sku = l.sku
      left join hostel.v_mess_stock s on s.mess_id = i.mess_id and s.sku = l.sku
      left join ref.staff_master ib on ib.staff_id = i.issued_by left join ref.staff_master ab on ab.staff_id = i.acknowledged_by
      where i.mess_id = ${messId} group by i.issue_id, ib.full_name, ab.full_name order by i.issue_date desc, i.issue_id desc limit 25`);
    return { stock, receipts, issues };
  }

  async receive(user: AuthUser, dto: { mess_id: number; received_on: string; supplier: string; bill_no?: string | null; lines: { sku: string; qty: number; rate: number; expiry_date?: string | null }[] }) {
    return this.dbs.run(user, async (tx) => {
      const [r] = (await tx.execute(sql`insert into hostel.mess_store_receipt (mess_id, received_on, supplier, bill_no, received_by, created_by)
        values (${dto.mess_id}, ${dto.received_on}::date, ${dto.supplier}, ${dto.bill_no ?? null}, ${user.kind === 'staff' ? user.id : null}, ${user.id}) returning receipt_id::int as receipt_id`)) as unknown as { receipt_id: number }[];
      for (const l of dto.lines) await tx.execute(sql`insert into hostel.mess_store_receipt_line (receipt_id, sku, qty, rate, expiry_date)
        values (${r.receipt_id}, ${l.sku}, ${l.qty}, ${l.rate}, ${l.expiry_date ?? null}::date)`);
      return r;
    });
  }

  async issue(user: AuthUser, dto: { mess_id: number; issue_date: string; meal: Meal; student_strength?: number | null; remarks?: string | null; lines: { sku: string; qty: number }[] }) {
    return this.dbs.run(user, async (tx) => {
      const [r] = (await tx.execute(sql`insert into hostel.mess_issue (mess_id, issue_date, meal, student_strength, issued_by, remarks, created_by)
        values (${dto.mess_id}, ${dto.issue_date}::date, ${dto.meal}, ${dto.student_strength ?? null}, ${user.kind === 'staff' ? user.id : null}, ${dto.remarks ?? null}, ${user.id})
        returning issue_id::int as issue_id`)) as unknown as { issue_id: number }[];
      for (const l of dto.lines) await tx.execute(sql`insert into hostel.mess_issue_line (issue_id, sku, qty, created_by) values (${r.issue_id}, ${l.sku}, ${l.qty}, ${user.id})`);
      return r;
    });
  }

  async acknowledge(user: AuthUser, id: number) {
    const rows = await this.run(user, sql`update hostel.mess_issue set acknowledged_by = ${user.id}, acknowledged_at = now(), updated_by = ${user.id}
      where issue_id = ${id} and acknowledged_by is null and issued_by is distinct from ${user.id} returning issue_id`);
    if (!rows.length) throw new UnprocessableEntityException('Already acknowledged, or you issued it yourself');
    return { ok: true };
  }

  setReorder(user: AuthUser, sku: string, level: number) {
    return this.run(user, sql`update portal.material set reorder_level = ${level} where sku = ${sku} and category_code = 'PROV' returning sku`)
      .then((r) => { if (!r.length) throw new NotFoundException('Item not found'); return { ok: true }; });
  }

  /* ------------------------------------------------------------ MES-06 daily record */

  async daily(messId: number, date: string) {
    const rows = await this.dbs.rows<Record<string, unknown> & { meal: string }>(sql`select m.meal,
        r.meals_planned::float as meals_planned, r.meals_served::float as meals_served, r.prep_wastage_kg::float as prep_wastage_kg, r.plate_wastage_kg::float as plate_wastage_kg,
        r.menu_followed, r.deviation_reason, initcap(st.full_name) as recorded_by_name, r.updated_at, r.created_at,
        (select count(*)::int from hostel.mess_subscription s where s.mess_id = ${messId} and s.status = 'Active') as strength,
        (select count(*)::int from hostel.meal_attendance a where a.mess_id = ${messId} and a.meal_date = ${date}::date and a.meal = m.meal) as scanned,
        (select coalesce(sum(i.student_strength), 0)::int from hostel.mess_issue i where i.mess_id = ${messId} and i.issue_date = ${date}::date and i.meal = m.meal) as issued_for
      from unnest(array['Breakfast','Lunch','Evening_Snacks','Dinner']) with ordinality as m(meal, n)
      left join hostel.mess_daily_record r on r.mess_id = ${messId} and r.record_date = ${date}::date and r.meal = m.meal
      left join ref.staff_master st on st.staff_id = r.recorded_by order by m.n`);
    return rows;
  }

  async saveDaily(user: AuthUser, dto: { mess_id: number; record_date: string; meals: { meal: Meal; meals_planned: number; meals_served?: number | null; prep_wastage_kg: number; plate_wastage_kg: number; menu_followed: boolean; deviation_reason?: string | null }[] }) {
    const bad = dto.meals.find((m) => !m.menu_followed && !(m.deviation_reason ?? '').trim());
    if (bad) throw new UnprocessableEntityException(`${bad.meal.replace('_', ' ')}: say why the menu was not followed`);
    return this.dbs.run(user, async (tx) => {
      for (const m of dto.meals) await tx.execute(sql`insert into hostel.mess_daily_record (mess_id, record_date, meal, meals_planned, meals_served, prep_wastage_kg, plate_wastage_kg, menu_followed, deviation_reason, recorded_by, created_by)
        values (${dto.mess_id}, ${dto.record_date}::date, ${m.meal}, ${m.meals_planned}, ${m.meals_served ?? null}, ${m.prep_wastage_kg}, ${m.plate_wastage_kg}, ${m.menu_followed}, ${m.deviation_reason ?? null},
                ${user.kind === 'staff' ? user.id : null}, ${user.id})
        on conflict (mess_id, record_date, meal) do update set meals_planned = excluded.meals_planned, meals_served = excluded.meals_served, prep_wastage_kg = excluded.prep_wastage_kg,
          plate_wastage_kg = excluded.plate_wastage_kg, menu_followed = excluded.menu_followed, deviation_reason = excluded.deviation_reason, recorded_by = excluded.recorded_by, updated_by = ${user.id}`);
      return { ok: true };
    });
  }

  /* ------------------------------------------------------------ MES-07 monthly report */

  async monthly(messId: number, month: string) {
    const m0 = sql`${month + '-01'}::date`, m1 = sql`(${month + '-01'}::date + interval '1 month')::date`;
    const [mess] = await this.dbs.rows(sql`select mess_id::int as mess_id, mess_name, (select count(*)::int from hostel.mess_subscription s where s.mess_id = m.mess_id and s.status = 'Active') as strength from hostel.mess_master m where mess_id = ${messId}`);
    if (!mess) throw new NotFoundException('Mess not found');
    const [t] = await this.dbs.rows(sql`select count(distinct record_date)::int as days_recorded, coalesce(sum(meals_planned), 0)::float as planned, coalesce(sum(meals_served), 0)::float as served,
        coalesce(sum(prep_wastage_kg), 0)::float as prep_kg, coalesce(sum(plate_wastage_kg), 0)::float as plate_kg, count(*) filter (where not menu_followed)::int as deviations
      from hostel.mess_daily_record where mess_id = ${messId} and record_date >= ${m0} and record_date < ${m1}`);
    const byMeal = await this.dbs.rows(sql`select meal, coalesce(sum(meals_planned), 0)::float as planned, coalesce(sum(meals_served), 0)::float as served,
        coalesce(sum(prep_wastage_kg + plate_wastage_kg), 0)::float as wastage_kg
      from hostel.mess_daily_record where mess_id = ${messId} and record_date >= ${m0} and record_date < ${m1} group by meal order by array_position(array['Breakfast','Lunch','Evening_Snacks','Dinner'], meal)`);
    const days = await this.dbs.rows(sql`select record_date, sum(meals_served)::float as served, sum(prep_wastage_kg + plate_wastage_kg)::float as wastage_kg
      from hostel.mess_daily_record where mess_id = ${messId} and record_date >= ${m0} and record_date < ${m1} group by record_date order by record_date`);
    const deviations = await this.dbs.rows(sql`select record_date, meal, deviation_reason from hostel.mess_daily_record
      where mess_id = ${messId} and record_date >= ${m0} and record_date < ${m1} and not menu_followed order by record_date, meal`);
    const provisions = await this.dbs.rows(sql`select m.name, m.base_unit, sum(l.qty)::float as qty, round(sum(l.qty * coalesce(s.avg_rate, 0)), 2)::float as value
      from hostel.mess_issue i join hostel.mess_issue_line l using (issue_id) join portal.material m on m.sku = l.sku
      left join hostel.v_mess_stock s on s.mess_id = i.mess_id and s.sku = l.sku
      where i.mess_id = ${messId} and i.issue_date >= ${m0} and i.issue_date < ${m1} group by m.name, m.base_unit order by value desc nulls last`);
    const [received] = await this.dbs.rows(sql`select coalesce(sum(l.qty * l.rate), 0)::float as value, count(distinct r.receipt_id)::int as receipts
      from hostel.mess_store_receipt r join hostel.mess_store_receipt_line l using (receipt_id) where r.mess_id = ${messId} and r.received_on >= ${m0} and r.received_on < ${m1}`);
    const [g] = await this.dbs.rows(sql`select count(*)::int as grievances, count(*) filter (where status = 'Closed')::int as closed,
        (select count(*)::int from hostel.v_mess_grievance_day d where d.mess_id = ${messId} and d.meal_date >= ${m0} and d.meal_date < ${m1} and d.significant) as significant_meals
      from hostel.mess_feedback where mess_id = ${messId} and entry_type = 'Grievance' and meal_date >= ${m0} and meal_date < ${m1}`);
    const ratings = await this.dbs.rows(sql`select meal::text as meal, round(avg(rating), 2)::float as avg, count(*)::int as n,
        count(*) filter (where sentiment = 'Positive')::int as positive, count(*) filter (where sentiment = 'Negative')::int as negative
      from hostel.meal_rating where mess_id = ${messId} and meal_date >= ${m0} and meal_date < ${m1} group by meal order by array_position(array['Breakfast','Lunch','Evening_Snacks','Dinner']::text[], meal::text)`);
    const [scans] = await this.dbs.rows(sql`select count(*)::int as scans from hostel.meal_attendance where mess_id = ${messId} and meal_date >= ${m0} and meal_date < ${m1}`);
    const cost = provisions.reduce((a, p) => a + Number((p as { value: number }).value ?? 0), 0);
    return { mess, month, totals: { ...t, scans: (scans as { scans: number }).scans, provisions_cost: Math.round(cost * 100) / 100,
      cost_per_meal: (t as { served: number }).served ? Math.round((cost / (t as { served: number }).served) * 100) / 100 : null,
      plate_g_per_meal: (t as { served: number }).served ? Math.round(((t as { plate_kg: number }).plate_kg * 1000) / (t as { served: number }).served) : null },
      by_meal: byMeal, days, deviations, provisions, received, grievances: g, ratings };
  }
}
