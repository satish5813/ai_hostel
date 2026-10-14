import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { facWhere } from '../auth/scope.js';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

export type ReportDto = { student_id: string; collected_at: string; source: 'Device' | 'Lab' | 'Manual' | 'Upload'; device_ref?: string | null; lab_name?: string | null;
  device_notes?: string | null; results: Record<string, string | number | null> };
type Test = { test_code: string; value_type: 'Number' | 'Text'; decimals: number };

/** Everyone who may see every student's health report; the Warden and Floor Manager see their own students. */
export const HEALTH_ALL = ['Gym_Manager', 'Dean_Students_Affairs', 'admin'];
export const HEALTH_VIEW = [...HEALTH_ALL, 'Warden', 'Assistant_Warden', 'Hostel_Incharge', 'Floor_Warden', 'Chief_Warden', 'Director_Hostels'];
export const HEALTH_CAPTURE = ['Gym_Manager', 'admin', 'system'];
const FLAG_NAME: Record<string, string> = { L: 'Low', H: 'High', LL: 'Very low', HH: 'Very high', A: 'Abnormal', N: 'Normal', '': '' };

/**
 * HLT-01 Health records and HLT-02 Health report. Results come from the gym's equipment (pushed as JSON or uploaded in
 * the capture format: one row per student, one column per test code), from a laboratory, or are typed in; the database
 * flags each against the student's reference interval. A report reads like a laboratory report, panel by panel, with
 * suggestions for food and physical activity, and when to see a doctor, from hostel.health_rule.
 */
@Injectable()
export class HealthService {
  constructor(private dbs: DbService) {}

  /** The students this person may see: own record; own floors; own hostel; everyone. */
  private scope(user: AuthUser): SQL {
    if (user.kind === 'student') return sql`sm.student_id = ${user.id}`;
    if (user.roles.some((r) => HEALTH_ALL.includes(r))) return sql`true`;
    if (user.roles.some((r) => r === 'Chief_Warden' || r === 'Director_Hostels'))
      return facWhere('b.facility_id', null, user);
    if (user.roles.some((r) => ['Warden', 'Assistant_Warden', 'Hostel_Incharge'].includes(r)))
      return sql`b.facility_id in (select a.facility_id from hostel.staff_space_assignment a where a.staff_id = ${user.id} and a.status = 'Active')`;
    if (user.roles.includes('Floor_Warden'))
      return sql`exists (select 1 from hostel.staff_space_assignment a where a.staff_id = ${user.id} and a.status = 'Active' and a.hostel_role = 'Floor_Warden'
        and a.facility_id = b.facility_id and (a.zone_id is null or a.zone_id = b.zone_id))`;
    return sql`false`;
  }
  private readonly from = sql`ref.student_master sm left join hostel.v_bed b on b.student_id = sm.student_id and b.occupant_type = 'Student'`;

  async catalogue() {
    const panels = await this.dbs.rows(sql`select panel_code, panel_name, source, specimen from hostel.health_panel order by sort_no`);
    const tests = await this.dbs.rows(sql`select t.test_code, t.panel_code, t.test_name, t.unit, t.loinc, t.value_type, t.decimals::int as decimals, t.method, t.derived,
        (select jsonb_agg(jsonb_build_object('gender', r.gender, 'low', r.low, 'high', r.high, 'critical_low', r.critical_low, 'critical_high', r.critical_high, 'normal_text', r.normal_text, 'note', r.note))
          from hostel.health_range r where r.test_code = t.test_code) as ranges
      from hostel.health_test t join hostel.health_panel p using (panel_code) order by p.sort_no, t.sort_no`);
    return { panels, tests };
  }

  /* ---------------------------------------------------------------- capture */

  private async tests() { return this.dbs.rows<Test>(sql`select test_code, value_type, decimals::int as decimals from hostel.health_test`); }

  /** Values as numbers or text; BMI, VLDL, LDL and the cholesterol ratio worked out when not supplied. */
  private clean(tests: Test[], raw: Record<string, string | number | null>) {
    const byCode = new Map(tests.map((t) => [t.test_code, t]));
    const out = new Map<string, { num: number | null; text: string | null }>();
    const unknown: string[] = [];
    for (const [k0, v0] of Object.entries(raw)) {
      const k = k0.trim().toUpperCase(); const t = byCode.get(k);
      if (v0 == null || String(v0).trim() === '') continue;
      if (!t) { unknown.push(k0); continue; }
      if (t.value_type === 'Text') { out.set(k, { num: null, text: String(v0).trim().slice(0, 40) }); continue; }
      const n = Number(String(v0).replace(/[^0-9.\-]/g, ''));
      if (!Number.isFinite(n)) throw new BadRequestException(`${k}: "${v0}" is not a number`);
      out.set(k, { num: n, text: null });
    }
    const num = (k: string) => out.get(k)?.num ?? null;
    const set = (k: string, v: number, d: number) => { if (!out.has(k) && Number.isFinite(v)) out.set(k, { num: Math.round(v * 10 ** d) / 10 ** d, text: null }); };
    if (num('WT') && num('HT')) set('BMI', num('WT')! / (num('HT')! / 100) ** 2, 1);
    if (num('TG') != null) set('VLDL', num('TG')! / 5, 0);
    if (num('TCHOL') != null && num('HDL') != null && num('TG') != null && num('TG')! < 400) set('LDL', num('TCHOL')! - num('HDL')! - num('TG')! / 5, 0);
    if (num('TCHOL') != null && num('HDL')) set('CHR', num('TCHOL')! / num('HDL')!, 1);
    return { values: out, unknown };
  }

  async save(user: AuthUser, dto: ReportDto, tests?: Test[]) {
    const { values, unknown } = this.clean(tests ?? await this.tests(), dto.results);
    if (!values.size) throw new BadRequestException('No results to save');
    const [st] = await this.dbs.rows(sql`select 1 from ref.student_master where student_id = ${dto.student_id}`);
    if (!st) throw new NotFoundException(`Student ${dto.student_id} not found`);
    const rows = [...values.entries()].map(([test_code, v]) => ({ test_code, value_num: v.num, value_text: v.text }));
    const r = await this.dbs.run(user, async (tx) => {
      const [rep] = (await tx.execute(sql`insert into hostel.health_report (student_id, collected_at, source, device_ref, lab_name, device_notes, entered_by)
        values (${dto.student_id}, ${dto.collected_at}::timestamptz, ${dto.source}, ${dto.device_ref ?? null}, ${dto.lab_name ?? null}, ${dto.device_notes ?? null}, ${user.id})
        returning report_id::int as report_id, report_no`)) as unknown as { report_id: number; report_no: string }[];
      await tx.execute(sql`insert into hostel.health_result (report_id, test_code, value_num, value_text)
        select ${rep.report_id}, x.test_code, x.value_num, x.value_text from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(test_code text, value_num numeric, value_text text)`);
      return rep;
    });
    return { ...r, results: rows.length, ignored: unknown };
  }

  /** Rows of the capture file, each saved on its own: one bad row does not stop the others. */
  async importRows(user: AuthUser, rows: (ReportDto | { student_id: string; error: string })[]) {
    const tests = await this.tests();
    const done: { row: number; report_no: string; student_id: string; results: number }[] = [];
    const failed: { row: number; student_id: string; error: string }[] = [];
    for (const [i, row] of rows.entries()) {
      if ('error' in row) { failed.push({ row: i + 1, student_id: row.student_id, error: row.error }); continue; }
      try { const r = await this.save(user, { ...row, source: row.source ?? 'Upload' }, tests); done.push({ row: i + 1, report_no: r.report_no, student_id: row.student_id, results: r.results }); }
      catch (e) { failed.push({ row: i + 1, student_id: row.student_id, error: (e as Error).message }); }
    }
    return { saved: done.length, failed, done };
  }

  /* ---------------------------------------------------------------- reading */

  /** Students in this person's scope with their latest report: when, how many results are out of range, a doctor needed. */
  async students(user: AuthUser, q?: string, facilityId?: string) {
    return this.dbs.rows(sql`
      select sm.student_id, initcap(sm.full_name) as name, sm.gender::text as gender, b.hostel_code, b.bed_label, b.floor_name,
        lr.report_id, lr.report_no, lr.collected_at, lr.source, (select count(*)::int from hostel.health_report x where x.student_id = sm.student_id and x.status = 'Final') as reports,
        (select count(*)::int from hostel.health_result r where r.report_id = lr.report_id and r.flag in ('L','H','LL','HH','A')) as out_of_range,
        (select count(*)::int from hostel.health_result r where r.report_id = lr.report_id and r.flag in ('LL','HH')) as severe,
        exists (select 1 from hostel.health_result r join hostel.health_rule hr on hr.test_code = r.test_code and hr.area = 'Doctor' and hr.active
          and ((hr.direction = 'Low' and r.flag in ('L','LL')) or (hr.direction = 'High' and r.flag in ('H','HH')) or (hr.direction = 'Abnormal' and r.flag = 'A'))
          and (not hr.severe_only or r.flag in ('LL','HH','A')) where r.report_id = lr.report_id) as see_doctor,
        (select value_num::float from hostel.health_result r where r.report_id = lr.report_id and r.test_code = 'BMI') as bmi,
        (select flag from hostel.health_result r where r.report_id = lr.report_id and r.test_code = 'BMI') as bmi_flag,
        (select value_num::float from hostel.health_result r where r.report_id = lr.report_id and r.test_code = 'HB') as hb,
        (select flag from hostel.health_result r where r.report_id = lr.report_id and r.test_code = 'HB') as hb_flag,
        (select string_agg(t.test_name, ', ' order by t.sort_no) from hostel.health_result r join hostel.health_test t using (test_code)
          where r.report_id = lr.report_id and r.flag in ('L','H','LL','HH','A')) as findings
      from ${this.from}
      left join lateral (select report_id::int as report_id, report_no, collected_at, source from hostel.health_report x where x.student_id = sm.student_id and x.status = 'Final'
        order by collected_at desc limit 1) lr on true
      where b.student_id is not null and ${this.scope(user)} and ${facilityId ? sql`b.facility_id = ${facilityId}` : sql`true`}
        and ${q ? sql`(sm.full_name ilike ${`%${q}%`} or sm.student_id ilike ${`%${q}%`} or b.bed_label ilike ${`%${q}%`})` : sql`true`}
      order by lr.report_id is null, see_doctor desc, out_of_range desc, sm.full_name`);
  }

  private async mayRead(user: AuthUser, studentId: string) {
    const [ok] = await this.dbs.rows(sql`select 1 from ${this.from} where sm.student_id = ${studentId} and ${this.scope(user)}`);
    if (!ok) throw new ForbiddenException('This student is not in your care');
  }

  async history(user: AuthUser, studentId: string) {
    await this.mayRead(user, studentId);
    return this.dbs.rows(sql`select report_id::int as report_id, report_no, collected_at, source, device_ref, lab_name,
        (select count(*)::int from hostel.health_result r where r.report_id = h.report_id) as results,
        (select count(*)::int from hostel.health_result r where r.report_id = h.report_id and r.flag in ('L','H','LL','HH','A')) as out_of_range
      from hostel.health_report h where student_id = ${studentId} and status = 'Final' order by collected_at desc`);
  }

  /** One report, laid out by panel, with the previous value of each test and the suggestions; the opening is logged. */
  async report(user: AuthUser, reportId: number) {
    const [h] = await this.dbs.rows<{ student_id: string } & Record<string, unknown>>(sql`
      select h.report_id::int as report_id, h.report_no, h.student_id, h.collected_at, h.reported_at, h.source, h.device_ref, h.lab_name, h.device_notes, h.status,
        initcap(sm.full_name) as name, sm.gender::text as gender, sm.date_of_birth, sm.programme, sm.blood_group, b.hostel_name, b.bed_label,
        coalesce(initcap(e.full_name), h.entered_by) as entered_by_name,
        (select p.image from hostel.student_photo p where p.student_id = sm.student_id) as photo
      from hostel.health_report h join ref.student_master sm on sm.student_id = h.student_id
      left join hostel.v_bed b on b.student_id = sm.student_id and b.occupant_type = 'Student' left join ref.staff_master e on e.staff_id = h.entered_by
      where h.report_id = ${reportId}`);
    if (!h) throw new NotFoundException('Report not found');
    await this.mayRead(user, h.student_id);
    const results = await this.dbs.rows(sql`
      with g as (select gender::text as g from ref.student_master where student_id = ${h.student_id})
      select t.panel_code, p.panel_name, p.specimen, t.test_code, t.test_name, t.unit, t.method, t.decimals::int as decimals, t.value_type,
        r.value_num::float as value_num, r.value_text, r.flag,
        rg.low::float as low, rg.high::float as high, rg.normal_text, rg.note,
        (select pr.value_num::float from hostel.health_result pr join hostel.health_report ph on ph.report_id = pr.report_id
          where ph.student_id = ${h.student_id} and ph.status = 'Final' and ph.collected_at < ${h.collected_at as string}::timestamptz and pr.test_code = r.test_code
          order by ph.collected_at desc limit 1) as previous
      from hostel.health_result r join hostel.health_test t using (test_code) join hostel.health_panel p on p.panel_code = t.panel_code
      cross join g left join lateral (select * from hostel.fn_health_range(t.test_code, g.g)) rg on true
      where r.report_id = ${reportId} order by p.sort_no, t.sort_no`);
    const advice = await this.dbs.rows(sql`
      select distinct on (hr.area, hr.advice) hr.area, hr.finding, hr.advice, hr.mess_tip, hr.sort_no, r.test_code, r.flag
      from hostel.health_result r join hostel.health_rule hr on hr.test_code = r.test_code and hr.active
        and ((hr.direction = 'Low' and r.flag in ('L','LL')) or (hr.direction = 'High' and r.flag in ('H','HH')) or (hr.direction = 'Abnormal' and r.flag = 'A'))
        and (not hr.severe_only or r.flag in ('LL','HH','A'))
      where r.report_id = ${reportId} order by hr.area, hr.advice, hr.sort_no`);
    await this.dbs.run(user, (tx) => tx.execute(sql`insert into hostel.health_view_log (report_id, viewer_id, role_code) values (${reportId}, ${user.id}, ${user.role})`));
    const views = user.kind === 'student' ? await this.dbs.rows(sql`select v.role_code, count(*)::int as n, max(v.viewed_at) as last from hostel.health_view_log v
      where v.report_id = ${reportId} and v.viewer_id <> ${user.id} group by 1 order by 3 desc`) : [];
    return { report: h, results, advice: (advice as { sort_no: number }[]).sort((a, b) => a.sort_no - b.sort_no), flag_names: FLAG_NAME, views };
  }

  async mine(user: AuthUser) {
    if (user.kind !== 'student') throw new ForbiddenException('Students only');
    return this.history(user, user.id);
  }

  /** For EXE-01 and the Dean: how many students were measured, out of range, need a doctor, by finding. */
  async summary(user: AuthUser) {
    const [s] = await this.dbs.rows(sql`with l as (select distinct on (h.student_id) h.report_id from hostel.health_report h join ${this.from} on sm.student_id = h.student_id
        where h.status = 'Final' and ${this.scope(user)} order by h.student_id, h.collected_at desc)
      select count(*)::int as measured,
        count(*) filter (where exists (select 1 from hostel.health_result r where r.report_id = l.report_id and r.test_code = 'HB' and r.flag in ('L','LL')))::int as low_hb,
        count(*) filter (where exists (select 1 from hostel.health_result r where r.report_id = l.report_id and r.test_code = 'VITD' and r.flag in ('L','LL')))::int as low_vitd,
        count(*) filter (where exists (select 1 from hostel.health_result r where r.report_id = l.report_id and r.test_code = 'BMI' and r.flag in ('H','HH')))::int as overweight,
        count(*) filter (where exists (select 1 from hostel.health_result r where r.report_id = l.report_id and r.test_code = 'BMI' and r.flag in ('L','LL')))::int as underweight
      from l`);
    return s;
  }
}
