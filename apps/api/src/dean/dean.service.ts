import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { assertScope, facWhere } from '../auth/scope.js';
import { loadCareerRecords } from '../career/career-data.js';
import type { AuthUser } from '../auth/auth.types.js';
import { guide, PATH_NAME } from './career-rules.js';

/** A concern in a few words, so the same kind of problem counts together across students. */
const GROUPS: [RegExp, string][] = [
  [/^Says /, 'Goal and record point different ways'], [/^SGPA fell/, 'Falling grades last term'], [/below 6\.5/, 'CGPA under 6.5'], [/backlog/, 'Backlogs to clear'],
  [/^Class attendance/, 'Class attendance under 75%'], [/placement-training sessions/, 'Missing placement training'], [/discipline case/, 'Discipline cases'],
  [/^Absent at roll call/, 'Repeated night absence'], [/^Coding tests/, 'Weak coding tests'], [/^Aptitude tests/, 'Weak aptitude tests'],
  [/certification/, 'No technical certification'], [/universities abroad/, 'CGPA short for higher studies'], [/No project/, 'No project or paper yet'],
  [/leadership/, 'No leadership role'], [/direction/, 'No clear direction'],
];
const concernGroup = (c: string) => GROUPS.find(([re]) => re.test(c))?.[1] ?? c;
export const isDean = (u: AuthUser) => u.roles.includes('Dean_Students_Affairs');

/**
 * The Dean, Students Affairs portal: analysis across every hostel (the Chief Warden sees the same for their own
 * hostels). Absence, discipline, the weekly floor reports and career guidance for hostellers.
 */
@Injectable()
export class DeanService {
  constructor(private dbs: DbService) {}

  /* ---------------------------------------------------------------- overview */

  async overview(user: AuthUser, weeks = 8) {
    const f = facWhere('b.facility_id', undefined, user);
    const [k] = await this.dbs.rows<Record<string, unknown>>(sql`
      with res as (select b.student_id, b.facility_id from hostel.v_bed b where b.occupant_type = 'Student' and b.student_id is not null and ${f}),
      last_night as (select max(att_date) d from hostel.night_attendance)
      select (select count(*) from res)::int as residents,
             (select count(*) from hostel.night_attendance na join res using (student_id) where na.att_date = (select d from last_night) and na.status = 'Absent')::int as absent_last_night,
             (select d from last_night) as last_roll_call,
             (select round(100.0 * count(*) filter (where status = 'Absent') / nullif(count(*), 0), 1) from hostel.night_attendance na join res using (student_id) where na.att_date > current_date - 7) as absence_rate_7d,
             (select count(*) from hostel.discipline_case d join res using (student_id) where d.status in ('Reported', 'With_Dean'))::int as open_cases,
             (select count(*) from hostel.discipline_case d join res using (student_id) where d.status = 'With_Dean')::int as with_dean,
             (select count(*) from hostel.outpass o join res using (student_id) where o.status = 'Out')::int as out_now,
             (select count(*) from hostel.outpass o join res using (student_id) where o.leave_from > now() - interval '30 days' and (o.late_by_minutes > 0 or o.status = 'Overdue'))::int as late_returns_30d,
             (select count(*) from hostel.sick_leave s join res using (student_id) where s.status::text in ('Applied', 'Recommended', 'Approved'))::int as sick_now,
             (select count(*) from hostel.weekly_floor_report w where w.status = 'Sent' and ${facWhere('w.facility_id', undefined, user)})::int as reports_unread`);
    const trend = await this.dbs.rows(sql`
      with res as (select b.student_id from hostel.v_bed b where b.occupant_type = 'Student' and b.student_id is not null and ${f}),
      wk as (select generate_series(date_trunc('week', current_date)::date - 7 * (${weeks}::int - 1), date_trunc('week', current_date)::date, interval '7 days')::date as w)
      select to_char(wk.w, 'YYYY-MM-DD') as week_start,
             (select count(*) from hostel.night_attendance na join res using (student_id) where na.att_date between wk.w and wk.w + 6)::int as marked,
             (select count(*) from hostel.night_attendance na join res using (student_id) where na.att_date between wk.w and wk.w + 6 and na.status = 'Absent')::int as absences,
             (select count(*) from hostel.outpass o join res using (student_id) where o.leave_from::date between wk.w and wk.w + 6 and o.status not in ('Cancelled', 'Rejected'))::int as outings,
             (select count(*) from hostel.outpass o join res using (student_id) where o.leave_from::date between wk.w and wk.w + 6 and (o.late_by_minutes > 0 or o.status = 'Overdue'))::int as late,
             (select count(*) from hostel.discipline_case d join res using (student_id) where d.incident_on::date between wk.w and wk.w + 6)::int as cases
      from wk order by wk.w`);
    const hostels = await this.dbs.rows(sql`
      select hp.facility_id, hp.hostel_code, f.facility_name, hp.hostel_gender::text as hostel_gender,
             (select count(*) from hostel.v_bed b where b.facility_id = hp.facility_id and b.occupant_type = 'Student' and b.student_id is not null)::int as residents,
             (select round(100.0 * count(*) filter (where na.status = 'Absent') / nullif(count(*), 0), 1) from hostel.night_attendance na
               join hostel.v_bed b on b.student_id = na.student_id where b.facility_id = hp.facility_id and na.att_date > current_date - 30) as absence_rate_30d,
             (select count(*) from hostel.discipline_case d where d.facility_id = hp.facility_id and d.status in ('Reported', 'With_Dean'))::int as open_cases,
             (select count(*) from hostel.outpass o join hostel.v_bed b on b.student_id = o.student_id where b.facility_id = hp.facility_id
               and o.leave_from > now() - interval '30 days' and (o.late_by_minutes > 0 or o.status = 'Overdue'))::int as late_returns_30d,
             (select w.status from hostel.weekly_floor_report w where w.facility_id = hp.facility_id order by w.week_start desc limit 1) as last_report
      from hostel.hostel_profile hp join infra.facility f on f.facility_id = hp.facility_id
      where hp.status = 'Active' and hp.hostel_gender <> 'Staff' and ${facWhere('hp.facility_id', undefined, user)} order by hp.hostel_code`);
    const cases = await this.dbs.rows(sql`select incident_type, count(*)::int as n from hostel.discipline_case d
      where d.incident_on > now() - interval '12 months' and ${facWhere('d.facility_id', undefined, user)} group by 1 order by 2 desc`);
    const careers = isDean(user) || user.roles.includes('Dean_Students_Progression') ? await this.careers(user, 'CSE') : null;
    return { kpis: k, trend, hostels, cases_by_type: cases, careers: careers ? { summary: careers.summary, programme: careers.programme } : null };
  }

  /* ---------------------------------------------------------------- absence */

  async absence(user: AuthUser, days = 30, facilityId?: string) {
    days = Math.min(Math.max(days, 7), 120);
    const f = facWhere('b.facility_id', facilityId, user);
    const list = await this.dbs.rows<Record<string, unknown>>(sql`
      with res as (select b.student_id, b.facility_id, b.hostel_code, b.floor_no, b.floor_name, b.bed_label from hostel.v_bed b
                    where b.occupant_type = 'Student' and b.student_id is not null and ${f}),
      night as (select na.student_id, count(*) filter (where na.status = 'Absent') as absent, count(*) as marked,
                       max(na.att_date) filter (where na.status = 'Absent') as last_absent,
                       string_agg(to_char(na.att_date, 'DD Mon'), ', ' order by na.att_date) filter (where na.status = 'Absent') as dates
                  from hostel.night_attendance na where na.att_date > current_date - ${days}::int group by 1),
      cls as (select distinct on (student_id) student_id, attendance_pct, semester_no from acad.term_result order by student_id, semester_no desc)
      select r.student_id, initcap(sm.full_name) as full_name, sm.programme, r.hostel_code, r.floor_no, r.floor_name, r.bed_label,
             coalesce(night.absent, 0)::int as absent_nights, coalesce(night.marked, 0)::int as nights_marked, night.last_absent, night.dates,
             cls.attendance_pct::float as class_attendance_pct
      from res r join ref.student_master sm on sm.student_id = r.student_id left join night on night.student_id = r.student_id left join cls on cls.student_id = r.student_id
      order by coalesce(night.absent, 0) desc, cls.attendance_pct nulls last`);
    const floors = new Map<string, { hostel_code: string; floor_name: string; residents: number; marked: number; absent: number }>();
    for (const r of list as { hostel_code: string; floor_name: string; nights_marked: number; absent_nights: number }[]) {
      const key = `${r.hostel_code}|${r.floor_name}`;
      const x = floors.get(key) ?? { hostel_code: r.hostel_code, floor_name: r.floor_name, residents: 0, marked: 0, absent: 0 };
      x.residents++; x.marked += r.nights_marked; x.absent += r.absent_nights; floors.set(key, x);
    }
    const typed = list as { absent_nights: number; class_attendance_pct: number | null }[];
    return {
      days,
      summary: {
        residents: typed.length, nights_marked: [...floors.values()].reduce((a, x) => a + x.marked, 0), absences: typed.reduce((a, x) => a + x.absent_nights, 0),
        repeat_absentees: typed.filter((x) => x.absent_nights >= 3).length, low_class_attendance: typed.filter((x) => x.class_attendance_pct != null && x.class_attendance_pct < 75).length,
      },
      floors: [...floors.values()].map((x) => ({ ...x, rate: x.marked ? Math.round((1000 * x.absent) / x.marked) / 10 : null })),
      students: list,
    };
  }

  /* ---------------------------------------------------------------- careers */

  async careers(user: AuthUser, programme = 'CSE', facilityId?: string) {
    if (!isDean(user) && !user.roles.includes('Dean_Students_Progression')) throw new ForbiddenException('Career guidance is for the Deans');
    const like = programme === 'All' ? '%' : `%${programme}%`;
    const rows = await loadCareerRecords(this.dbs, sql`${facWhere('b.facility_id', facilityId, user)} and coalesce(sm.programme, '') ilike ${like}`);
    const students = rows.map((rec) => ({ ...rec, guidance: guide(rec), path_name: '' }))
      .map((x) => ({ ...x, path_name: PATH_NAME[x.guidance.path] }));
    const by = (s: string) => students.filter((x) => x.guidance.status === s).length;
    const paths: Record<string, number> = {};
    students.forEach((x) => { paths[x.path_name] = (paths[x.path_name] ?? 0) + 1; });
    const reasons: Record<string, number> = {};
    students.forEach((x) => x.guidance.concerns.forEach((c) => { const k = concernGroup(c); reasons[k] = (reasons[k] ?? 0) + 1; }));
    return {
      programme,
      summary: { students: students.length, on_track: by('On track'), watch: by('Watch'), needs_guidance: by('Needs guidance'), goal_stated: students.filter((x) => x.goal).length },
      paths: Object.entries(paths).map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count),
      top_concerns: Object.entries(reasons).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 8),
      students: students.sort((a, b) => a.guidance.score - b.guidance.score),
    };
  }

  async myGoal(user: AuthUser) {
    const [g] = await this.dbs.rows(sql`select goal, notes, stated_on from acad.career_goal where student_id = ${user.id}`);
    return g ?? null;
  }
  async setGoal(user: AuthUser, dto: { goal: string; notes?: string | null }) {
    await this.dbs.run(user, (tx) => tx.execute(sql`insert into acad.career_goal (student_id, goal, notes, updated_by) values (${user.id}, ${dto.goal}, ${dto.notes ?? null}, ${user.id})
      on conflict (student_id) do update set goal = excluded.goal, notes = excluded.notes, stated_on = now(), updated_by = excluded.updated_by`));
    return this.myGoal(user);
  }

  /* ---------------------------------------------------------------- weekly floor reports */

  async weekly(user: AuthUser, facilityId?: string) {
    return this.dbs.rows(sql`
      select w.report_id::int as report_id, w.facility_id, hp.hostel_code, f.facility_name, to_char(w.week_start, 'YYYY-MM-DD') as week_start, w.metrics, w.status,
             w.cw_remarks, w.sent_at, w.read_at, initcap(ss.full_name) as sent_by_name, w.generated_at
      from hostel.weekly_floor_report w join hostel.hostel_profile hp on hp.facility_id = w.facility_id join infra.facility f on f.facility_id = w.facility_id
      left join ref.staff_master ss on ss.staff_id = w.sent_by
      where ${facWhere('w.facility_id', facilityId, user)} ${isDean(user) ? sql`and w.status <> 'Draft'` : sql``}
      order by w.week_start desc, hp.hostel_code limit 200`);
  }

  async weeklyOne(user: AuthUser, id: number) {
    const [w] = await this.dbs.rows<Record<string, unknown> & { facility_id: string; status: string }>(sql`
      select w.report_id::int as report_id, w.facility_id, hp.hostel_code, f.facility_name, to_char(w.week_start, 'YYYY-MM-DD') as week_start,
             to_char(w.week_start + 6, 'YYYY-MM-DD') as week_end, w.metrics, w.floors, w.status, w.cw_remarks, w.sent_at, w.read_at, w.generated_at,
             initcap(ss.full_name) as sent_by_name, initcap(rs.full_name) as read_by_name
      from hostel.weekly_floor_report w join hostel.hostel_profile hp on hp.facility_id = w.facility_id join infra.facility f on f.facility_id = w.facility_id
      left join ref.staff_master ss on ss.staff_id = w.sent_by left join ref.staff_master rs on rs.staff_id = w.read_by where w.report_id = ${id}`);
    if (!w) throw new NotFoundException('Report not found');
    assertScope(user, w.facility_id);
    if (isDean(user) && w.status === 'Draft') throw new ForbiddenException('The Chief Warden has not sent this report yet');
    if (isDean(user) && w.status === 'Sent') {
      await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.weekly_floor_report set status = 'Read', read_by = ${user.id}, read_at = now() where report_id = ${id} and status = 'Sent'`));
      w.status = 'Read';
    }
    return w;
  }

  async buildWeekly(user: AuthUser, week?: string) {
    const out = await this.dbs.run(user, (tx) => tx.execute(sql`select hostel.fn_build_weekly_floor_reports(${week ?? null}::date) as n`)) as unknown as { n: number }[];
    return { reports: out[0]?.n ?? 0 };
  }

  async sendWeekly(user: AuthUser, id: number, remarks: string | null) {
    const [w] = await this.dbs.rows<{ facility_id: string; status: string; hostel_code: string; week_start: string }>(sql`
      select w.facility_id, w.status, hp.hostel_code, to_char(w.week_start, 'DD Mon YYYY') as week_start from hostel.weekly_floor_report w join hostel.hostel_profile hp using (facility_id) where report_id = ${id}`);
    if (!w) throw new NotFoundException('Report not found');
    assertScope(user, w.facility_id);
    if (w.status !== 'Draft') throw new UnprocessableEntityException('This report has already been sent');
    await this.dbs.run(user, async (tx) => {
      await tx.execute(sql`update hostel.weekly_floor_report set status = 'Sent', cw_remarks = ${remarks}, sent_by = ${user.id}, sent_at = now() where report_id = ${id}`);
      await tx.execute(sql`insert into shared.notification (recipient_type, staff_id, channel, template_code, subject, body, related_type, related_id)
        select 'Staff', u.staff_id, ch.c::shared.channel, 'WEEKLY_FLOOR_REPORT', ${`Weekly floor report: ${w.hostel_code}, week of ${w.week_start}`},
               ${`The Chief Warden has sent the ${w.hostel_code} floor report for the week of ${w.week_start}.${remarks ? ` Remarks: ${remarks}` : ''}`}, 'weekly_floor_report', ${String(id)}
        from portal.user_role r join portal.app_user u on u.user_id = r.user_id and u.active, (values ('In_App'), ('Email')) ch(c)
        where r.role_code = 'Dean_Students_Affairs' and u.staff_id is not null`);
    });
    return { ok: true };
  }

  /* ---------------------------------------------------------------- discipline */

  async cases(user: AuthUser, status?: string, facilityId?: string) {
    const cases = await this.dbs.rows(sql`
      select d.case_id::int as case_id, d.case_no, d.student_id, initcap(sm.full_name) as full_name, sm.programme, hp.hostel_code, d.facility_id,
             d.incident_on, d.incident_type, d.description, d.status, d.student_statement, d.cw_findings, d.cw_recommendation, d.dean_decision,
             d.recorded_at, d.submitted_at, d.decided_at, initcap(rs.full_name) as reported_by_name, initcap(ds.full_name) as decided_by_name,
             (select count(*) from hostel.discipline_case p where p.student_id = d.student_id and p.case_id <> d.case_id)::int as earlier_cases,
             (select jsonb_agg(jsonb_build_object('punishment_type', p.punishment_type, 'from_date', p.from_date, 'to_date', p.to_date, 'fine_amount', p.fine_amount,
                     'bars_outings', p.bars_outings, 'status', p.status, 'details', p.details)) from hostel.discipline_punishment p where p.case_id = d.case_id) as punishments
      from hostel.discipline_case d join ref.student_master sm on sm.student_id = d.student_id
      left join hostel.hostel_profile hp on hp.facility_id = d.facility_id
      left join ref.staff_master rs on rs.staff_id = d.reported_by left join ref.staff_master ds on ds.staff_id = d.decided_by
      where ${facWhere('d.facility_id', facilityId, user)} ${status ? sql`and d.status = ${status}` : sql``}
      order by (d.status = 'With_Dean') desc, (d.status = 'Reported') desc, d.incident_on desc limit 300`);
    const stats = await this.dbs.rows(sql`
      select to_char(date_trunc('month', incident_on), 'YYYY-MM') as month, incident_type, count(*)::int as n from hostel.discipline_case d
      where d.incident_on > now() - interval '12 months' and ${facWhere('d.facility_id', facilityId, user)} group by 1, 2 order by 1`);
    const repeat = await this.dbs.rows(sql`
      select d.student_id, initcap(sm.full_name) as full_name, count(*)::int as cases, max(d.incident_on) as last_incident from hostel.discipline_case d
      join ref.student_master sm on sm.student_id = d.student_id where ${facWhere('d.facility_id', facilityId, user)}
      group by 1, 2 having count(*) >= 2 order by 3 desc`);
    return { cases, stats, repeat };
  }

  residents(user: AuthUser, q: string) {
    const like = `%${q.trim()}%`;
    return this.dbs.rows(sql`select b.student_id, initcap(sm.full_name) as full_name, b.bed_label, b.facility_id from hostel.v_bed b
      join ref.student_master sm on sm.student_id = b.student_id where b.occupant_type = 'Student' and ${facWhere('b.facility_id', undefined, user)}
      and (b.student_id ilike ${like} or sm.full_name ilike ${like}) order by sm.full_name limit 12`);
  }

  async record(user: AuthUser, dto: { student_id: string; incident_on: string; incident_type: string; description: string; student_statement?: string | null }) {
    const [s] = await this.dbs.rows<{ facility_id: string }>(sql`select b.facility_id from hostel.v_bed b where b.student_id = ${dto.student_id} and b.occupant_type = 'Student' limit 1`);
    if (!s) throw new BadRequestException('This student does not live in a hostel');
    assertScope(user, s.facility_id);
    const out = await this.dbs.run(user, (tx) => tx.execute(sql`insert into hostel.discipline_case (student_id, incident_on, incident_type, description, student_statement, reported_by, facility_id, created_by)
      values (${dto.student_id}, ${dto.incident_on}::timestamptz, ${dto.incident_type}, ${dto.description}, ${dto.student_statement ?? null}, ${user.id}, ${s.facility_id}, ${user.id})
      returning case_id::int as case_id, case_no`)) as unknown as { case_id: number; case_no: string }[];
    return out[0];
  }

  private async caseFor(user: AuthUser, id: number) {
    const [c] = await this.dbs.rows<{ facility_id: string; status: string; student_id: string; case_no: string }>(sql`select facility_id, status, student_id, case_no from hostel.discipline_case where case_id = ${id}`);
    if (!c) throw new NotFoundException('Case not found');
    assertScope(user, c.facility_id);
    return c;
  }

  async inquire(user: AuthUser, id: number, dto: { student_statement?: string | null; cw_findings?: string | null; cw_recommendation?: string | null; send?: boolean }) {
    const c = await this.caseFor(user, id);
    if (c.status !== 'Reported') throw new UnprocessableEntityException('Only a case still with the Chief Warden can be changed');
    await this.dbs.run(user, (tx) => tx.execute(sql`update hostel.discipline_case set
      student_statement = coalesce(${dto.student_statement ?? null}, student_statement), cw_findings = coalesce(${dto.cw_findings ?? null}, cw_findings),
      cw_recommendation = coalesce(${dto.cw_recommendation ?? null}, cw_recommendation), updated_by = ${user.id},
      status = ${dto.send ? 'With_Dean' : 'Reported'}, submitted_by = ${dto.send ? user.id : null} where case_id = ${id}`));
    return { ok: true, status: dto.send ? 'With_Dean' : 'Reported' };
  }

  /** The Dean awards a punishment, closes the case with no action, or returns it to the Chief Warden for more inquiry. */
  async decide(user: AuthUser, id: number, dto: { outcome: 'Punish' | 'No_Action' | 'Return'; decision: string;
    punishment?: { punishment_type: string; from_date?: string | null; to_date?: string | null; fine_amount?: number | null; bars_outings?: boolean; details?: string | null } }) {
    if (!isDean(user)) throw new ForbiddenException('Only the Dean, Students Affairs decides a case');
    const c = await this.caseFor(user, id);
    if (c.status !== 'With_Dean') throw new UnprocessableEntityException('This case is not waiting for your decision');
    if (dto.outcome === 'Punish' && !dto.punishment) throw new BadRequestException('Choose the punishment');
    const p = dto.punishment;
    if (p && ['Outing_Ban', 'Hostel_Suspension'].includes(p.punishment_type) && (!p.from_date || !p.to_date)) throw new BadRequestException('Give the dates of the ban or suspension');
    if (p && p.punishment_type === 'Fine' && !(Number(p.fine_amount) > 0)) throw new BadRequestException('Give the fine amount');
    await this.dbs.run(user, async (tx) => {
      if (dto.outcome === 'Punish' && p) {
        await tx.execute(sql`insert into hostel.discipline_punishment (case_id, student_id, punishment_type, bars_outings, from_date, to_date, fine_amount, awarded_by, awarded_at, status, details, ratification_status, created_by)
          values (${id}, ${c.student_id}, ${p.punishment_type}::hostel.punishment_type, ${p.punishment_type === 'Outing_Ban' || !!p.bars_outings}, coalesce(${p.from_date ?? null}::date, current_date), ${p.to_date ?? null}::date,
                  ${p.fine_amount ?? null}, ${user.id}, now(), 'In_Force', ${p.details ?? null}, 'Pending', ${user.id})`);
      }
      await tx.execute(sql`update hostel.discipline_case set dean_decision = ${dto.decision}, decided_by = ${dto.outcome === 'Return' ? null : user.id},
        status = ${dto.outcome === 'Punish' ? 'Action_Taken' : dto.outcome === 'No_Action' ? 'Closed_No_Action' : 'Reported'}, updated_by = ${user.id} where case_id = ${id}`);
    });
    return { ok: true };
  }
}
