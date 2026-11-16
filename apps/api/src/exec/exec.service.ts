import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { CareerService } from '../career/career.service.js';
import { PATH_NAME, type Path } from '../dean/career-rules.js';
import { facWhere, scopeOf } from '../auth/scope.js';
import type { AuthUser } from '../auth/auth.types.js';

/** CTE: each resident's hostel-fee standing across their demands (Paid, Part_Paid, Pending, Overdue). */
const FEE_STATE = sql`per_student as (
        select d.student_id, sum(d.amount_due) as due, sum(d.amount_paid) as paid,
               case when bool_and(d.status in ('Paid', 'Waived')) then 'Paid' when bool_or(d.status = 'Overdue') then 'Overdue'
                    when sum(d.amount_paid) > 0 then 'Part_Paid' else 'Pending' end as state
        from hostel.fee_demand d where d.fee_head = 'Hostel' group by 1)`;
import { ElectricityService } from '../repairs/electricity.service.js';
import { RepairsService } from '../repairs/repairs.service.js';

/** Thresholds come from shared.policy_setting so the university can change them without a release. */
const SETTINGS = sql`(select coalesce(max(amount) filter (where setting_key = 'attendance_min_pct'), 75) as att_min,
  coalesce(max(amount) filter (where setting_key = 'cgpa_watch'), 6) as cgpa_watch from shared.policy_setting)`;
const OPEN_CASE = sql`status not in ('Closed_No_Action', 'Action_Taken', 'Closed')`;
/** The wardens of a hostel: people assigned to it in one of these roles. */
const WARDEN = (sa: ReturnType<typeof sql>) => sql`exists (select 1 from hostel.staff_space_assignment x where x.staff_id = ${sa}.staff_id and x.facility_id = ${sa}.facility_id
  and x.status = 'Active' and x.hostel_role in ('Chief_Warden', 'Warden', 'Floor_Warden', 'Assistant_Warden', 'Hostel_Incharge'))`;

/**
 * EXE-01 Executive dashboard for the President, Vice President and Pro-VCs: one card per hostel building, and
 * inside it the students' academic standing (backlogs, cumulative attendance short of the minimum, CGPA), their
 * clubs, sports and other activities, night roll call, mess mood, fees and dues, the managers' attendance and
 * discipline. Read-only; every figure is counted in the database from the workflow records.
 */
@Injectable()
export class ExecService {
  constructor(private dbs: DbService, private career: CareerService, private elec: ElectricityService, private repairs: RepairsService) {}

  /** One row per building with everything its card shows; the university strip is the sum of the rows. */
  async overview(u?: AuthUser) {
    const scoped = scopeOf(u) !== null;
    const [settings] = await this.dbs.rows<{ att_min: number; cgpa_watch: number }>(sql`select att_min::float, cgpa_watch::float from ${SETTINGS} s`);
    const buildings = await this.dbs.rows(sql`
      with s as ${SETTINGS},
      snap as (select v.*, (v.attendance_pct < s.att_min) as short, (v.cgpa < s.cgpa_watch) as low from hostel.v_resident_snapshot v cross join s)
      select hp.facility_id, hp.hostel_code, f.facility_name, hp.hostel_gender::text as gender, hp.accommodation_type, f.no_of_floors::int as floors,
        coalesce(o.total_beds, 0)::int as beds, coalesce(o.occupied_beds, 0)::int as occupied, coalesce(o.vacant_beds, 0)::int as vacant,
        coalesce(o.demanded, 0)::float as demanded, coalesce(o.collected, 0)::float as collected, coalesce(o.overdue, 0)::float as overdue, coalesce(o.students_overdue, 0)::int as students_overdue,
        st.residents, st.with_results, st.avg_cgpa, st.backlog_students, st.backlogs, st.short_students, st.low_cgpa, st.active_students, st.achievements, st.avg_attendance,
        rc.roll_pct, m.mood, m.ratings, w.warden_pct, w.wardens, dc.open_cases, dc.cases_year
      from hostel.hostel_profile hp
      join infra.facility f on f.facility_id = hp.facility_id
      left join hostel.v_rpt_occupancy_fees_dues o on o.facility_id = hp.facility_id
      left join lateral (select count(*)::int as residents, count(cgpa)::int as with_results, round(avg(cgpa), 2)::float as avg_cgpa,
          count(*) filter (where backlogs > 0)::int as backlog_students, coalesce(sum(backlogs), 0)::int as backlogs,
          count(*) filter (where short)::int as short_students, count(*) filter (where low)::int as low_cgpa,
          count(*) filter (where activities > 0)::int as active_students, coalesce(sum(achievements), 0)::int as achievements,
          round(avg(attendance_pct), 1)::float as avg_attendance
        from snap where snap.facility_id = hp.facility_id) st on true
      left join lateral (select round(100.0 * count(*) filter (where n.status::text in ('Present', 'On_Pass', 'Sick_Leave')) / nullif(count(*), 0), 1)::float as roll_pct
        from hostel.night_attendance n where n.facility_id = hp.facility_id and n.att_date > current_date - 30) rc on true
      left join lateral (select round(100 * avg(r.score))::int as mood, count(*)::int as ratings from hostel.meal_rating r
        join hostel.v_resident_snapshot x on x.student_id = r.student_id where x.facility_id = hp.facility_id and r.meal_date > current_date - 30) m on true
      left join lateral (select round(100.0 * (count(*) filter (where sa.status = 'Present') + 0.5 * count(*) filter (where sa.status = 'Half_Day'))
          / nullif(count(*) filter (where sa.status <> 'Week_Off'), 0), 1)::float as warden_pct, count(distinct sa.staff_id)::int as wardens
        from hostel.staff_attendance sa where sa.facility_id = hp.facility_id and sa.att_date > current_date - 30 and ${WARDEN(sql`sa`)}) w on true
      left join lateral (select count(*) filter (where ${OPEN_CASE})::int as open_cases, count(*) filter (where c.incident_on >= (select start_date from hostel.academic_year where is_current))::int as cases_year
        from hostel.discipline_case c where c.facility_id = hp.facility_id) dc on true
      where hp.status = 'Active' and hp.hostel_gender::text <> 'Staff' and ${facWhere('hp.facility_id', null, u)}
      order by hp.hostel_gender, hp.hostel_code`);
    const [mess] = await this.dbs.rows(sql`select round(100 * avg(score))::int as mood, count(*)::int as ratings,
        round(100 * avg(score) filter (where gender_group = 'Boys'))::int as boys, round(100 * avg(score) filter (where gender_group = 'Girls'))::int as girls
      from hostel.meal_rating r where meal_date > current_date - 30
        and (${!scoped} or exists (select 1 from hostel.v_resident_snapshot x where x.student_id = r.student_id and ${facWhere('x.facility_id', null, u)}))`);
    const [year] = await this.dbs.rows(sql`select academic_year, to_char(start_date, 'YYYY-MM-DD') as start_date from hostel.academic_year where is_current`);
    // careers by building: second-year progress and final-year outcomes (numbers only)
    const [y2, y4] = await Promise.all([this.career.secondYear(u, undefined, false), this.career.finalYear(u, undefined, false)]);
    const careers = { second_year: { summary: y2.summary, paths: y2.paths, gaps: y2.gaps }, final_year: { summary: y4.summary, by_goal: y4.by_goal, recruiters: y4.recruiters, package_bands: y4.package_bands } };
    // electricity paid by students (room bill shares and recharges) and repair tickets, by building
    const [elec, tickets] = await Promise.all([this.elec.summary(), this.repairs.summary()]);
    const withCareer = buildings.map((b) => ({ ...b, career2: y2.buildings.find((x) => x.facility_id === b.facility_id) ?? null, career4: y4.buildings.find((x) => x.facility_id === b.facility_id) ?? null,
      electricity: (elec.by_building as { facility_id: string }[]).find((x) => x.facility_id === b.facility_id) ?? null,
      tickets: (tickets as { facility_id: string }[]).find((x) => x.facility_id === b.facility_id) ?? null }));
    // what residents say they want to do after university (career_goal, loaded from the career-choice files)
    const choiceGoals = await this.dbs.rows<{ goal: Path; n: number }>(sql`select g.goal, count(*)::int as n from acad.career_goal g
      join hostel.v_resident_snapshot v on v.student_id = g.student_id where g.goal <> 'Undecided' and ${facWhere('v.facility_id', null, u)} group by 1 order by 2 desc`);
    const choiceHostels = await this.dbs.rows(sql`select v.facility_id, v.hostel_code, count(*)::int as residents, count(g.goal)::int as stated,
        count(*) filter (where g.goal = 'Placement_Product')::int as product, count(*) filter (where g.goal = 'Placement_Services')::int as services,
        count(*) filter (where g.goal = 'Higher_Studies')::int as higher, count(*) filter (where g.goal = 'Govt_Exams')::int as govt,
        count(*) filter (where g.goal = 'Entrepreneurship')::int as startup, count(*) filter (where g.goal = 'Core_Other')::int as other
      from hostel.v_resident_snapshot v left join acad.career_goal g on g.student_id = v.student_id and g.goal <> 'Undecided'
      where ${facWhere('v.facility_id', null, u)}
      group by 1, 2 order by residents desc`);
    const career_choice = { stated: choiceGoals.reduce((a, g) => a + g.n, 0), residents: buildings.reduce((a, b) => a + Number((b as { residents?: number }).residents ?? 0), 0),
      by_goal: choiceGoals.map((g) => ({ goal: g.goal, name: PATH_NAME[g.goal], n: g.n })), by_hostel: choiceHostels };
    return { settings, buildings: withCareer, mess, year, careers, career_choice, electricity_months: scoped ? [] : elec.by_month, scope: scopeOf(u), as_of: new Date().toISOString() };
  }

  /** Hostel fees for the executive view: who is on a single or two-instalment plan, who has paid, and the money (EXE-01). */
  async fees(u?: AuthUser) {
    const hostels = await this.dbs.rows(sql`
      with per_student as (
        select v.student_id, v.facility_id, sum(d.amount_due) as due, sum(d.amount_paid) as paid,
               case when bool_and(d.status in ('Paid', 'Waived')) then 'Paid' when bool_or(d.status = 'Overdue') then 'Overdue'
                    when sum(d.amount_paid) > 0 then 'Part_Paid' else 'Pending' end as state
        from hostel.v_resident_snapshot v join hostel.fee_demand d on d.student_id = v.student_id and d.fee_head = 'Hostel'
        group by 1, 2),
      plan as (select r.student_id, fp.plan_type::text as plan_type from hostel.fee_plan fp
               join hostel.hostel_registration r on r.registration_id = fp.registration_id
               where r.academic_year = (select academic_year from hostel.academic_year where is_current))
      select hp.facility_id, hp.hostel_code, f.facility_name, hp.hostel_gender::text as gender,
        count(v.student_id)::int as students,
        count(*) filter (where p.plan_type = 'Single')::int as single_plan, count(*) filter (where p.plan_type = 'Two_Instalments')::int as two_plan,
        count(*) filter (where s.state = 'Paid')::int as paid, count(*) filter (where s.state = 'Part_Paid')::int as part_paid,
        count(*) filter (where s.state in ('Pending', 'Overdue'))::int as unpaid, count(*) filter (where s.state = 'Overdue')::int as overdue_students,
        count(*) filter (where s.student_id is null)::int as no_demand,
        coalesce(sum(s.due), 0)::float as demanded, coalesce(sum(s.paid), 0)::float as collected,
        coalesce(sum(s.due - s.paid) filter (where s.state <> 'Paid'), 0)::float as outstanding,
        coalesce(sum(s.due - s.paid) filter (where s.state = 'Overdue'), 0)::float as overdue
      from hostel.hostel_profile hp join infra.facility f on f.facility_id = hp.facility_id
      left join hostel.v_resident_snapshot v on v.facility_id = hp.facility_id
      left join per_student s on s.student_id = v.student_id
      left join plan p on p.student_id = v.student_id
      where hp.status = 'Active' and hp.hostel_gender::text <> 'Staff' and ${facWhere('hp.facility_id', null, u)}
      group by 1, 2, 3, 4 order by demanded desc`);
    return { hostels, as_of: new Date().toISOString() };
  }

  /** The students behind one number on the fees table: a hostel and a bucket (paid, part, unpaid, overdue, single, two, all). */
  async feeStudents(facilityId: string, bucket: string) {
    const where = { paid: sql`s.state = 'Paid'`, part: sql`s.state = 'Part_Paid'`, unpaid: sql`s.state in ('Pending', 'Overdue')`, overdue: sql`s.state = 'Overdue'`,
      single: sql`p.plan_type = 'Single'`, two: sql`p.plan_type = 'Two_Instalments'`, all: sql`true` }[bucket] ?? sql`true`;
    return this.dbs.rows(sql`
      with per_student as (
        select d.student_id, sum(d.amount_due) as due, sum(d.amount_paid) as paid, max(fr.paid_on) as last_paid_on, count(fr.receipt_id)::int as receipts,
               case when bool_and(d.status in ('Paid', 'Waived')) then 'Paid' when bool_or(d.status = 'Overdue') then 'Overdue'
                    when sum(d.amount_paid) > 0 then 'Part_Paid' else 'Pending' end as state
        from hostel.fee_demand d left join hostel.fee_receipt fr on fr.demand_id = d.demand_id and fr.gateway_status = 'Success'
        where d.fee_head = 'Hostel' group by 1),
      plan as (select r.student_id, fp.plan_type::text as plan_type from hostel.fee_plan fp
               join hostel.hostel_registration r on r.registration_id = fp.registration_id
               where r.academic_year = (select academic_year from hostel.academic_year where is_current))
      select v.student_id, v.name, v.programme, v.year_semester, p.plan_type, coalesce(s.due, 0)::float as due, coalesce(s.paid, 0)::float as paid,
             coalesce(s.due - s.paid, 0)::float as outstanding, coalesce(s.state, 'No demand') as state, to_char(s.last_paid_on, 'YYYY-MM-DD') as last_paid_on, coalesce(s.receipts, 0)::int as receipts,
             g.goal as career_goal, regexp_replace(g.notes, '^Career choice \\([^)]*\\):\\s*', '') as career_choice, v.cgpa::float as cgpa, v.backlogs::int as backlogs
      from hostel.v_resident_snapshot v left join per_student s on s.student_id = v.student_id left join plan p on p.student_id = v.student_id
      left join acad.career_goal g on g.student_id = v.student_id and g.goal <> 'Undecided'
      where v.facility_id = ${facilityId} and ${where}
      order by outstanding desc, v.name`);
  }

  /**
   * One student for the dashboard pop-up: who and where, attendance semester by semester and course by course for the
   * running semester, results, and fees by kind. A login limited to some hostels sees only their residents.
   */
  async student(studentId: string, u?: AuthUser) {
    const [st] = await this.dbs.rows<{ facility_id: string | null }>(sql`
      select sm.student_id, initcap(sm.full_name) as name, sm.programme, sm.year_semester, d.dept_name, sm.gender::text as gender,
        b.facility_id, b.hostel_code, b.hostel_name, b.floor_name, b.room_code, b.bed_code, a.allocation_date
      from ref.student_master sm left join ref.department d on d.dept_code = sm.dept_code
      left join hostel.hostel_allocation a on a.student_id = sm.student_id and a.status = 'Active' and a.occupant_type = 'Student'
      left join hostel.v_bed b on b.subspace_id = a.subspace_id
      where sm.student_id = ${studentId}`);
    if (!st) throw new NotFoundException('Student not found');
    const scope = scopeOf(u);
    if (scope && !(st.facility_id && scope.includes(st.facility_id))) throw new ForbiddenException('This student is not in your hostels');
    const terms = await this.dbs.rows(sql`select semester_no::int as semester_no, term_label, sgpa::float as sgpa, cgpa::float as cgpa, attendance_pct::float as attendance_pct, backlogs::int as backlogs
      from acad.term_result where student_id = ${studentId} order by semester_no`);
    const courses = await this.dbs.rows(sql`select c.course_code, c.course_name, c.attendance_pct::float as pct, c.as_of, c.academic_year, c.term,
        (c.l_held + c.t_held + c.p_held + c.s_held)::float as held, (c.l_attended + c.t_attended + c.p_attended + c.s_attended)::float as attended
      from acad.course_attendance c
      where c.student_id = ${studentId} and (c.academic_year, c.term) = (select academic_year, term from acad.course_attendance where student_id = ${studentId} order by as_of desc limit 1)
      order by c.attendance_pct, c.course_code`);
    const fees = await this.dbs.rows(sql`select d.fee_head::text as head, sum(d.amount_due)::float as due, sum(d.amount_paid)::float as paid,
        sum(greatest(d.amount_due - d.amount_paid, 0)) filter (where d.status::text not in ('Paid', 'Waived'))::float as outstanding,
        min(d.due_date) filter (where d.status::text not in ('Paid', 'Waived') and d.amount_due > d.amount_paid)::text as next_due,
        bool_or(d.status::text = 'Overdue') as overdue
      from hostel.fee_demand d where d.student_id = ${studentId} group by 1 order by 2 desc`);
    const [paid] = await this.dbs.rows(sql`select count(*)::int as receipts, max(r.paid_on)::date::text as last_paid_on
      from hostel.fee_receipt r join hostel.fee_demand d on d.demand_id = r.demand_id where d.student_id = ${studentId} and r.gateway_status = 'Success'`);
    return { student: st, terms, courses, fees, receipts: paid };
  }

  /** One row per career path: how many residents chose it, how they stand on fees and results. facilityId 'all' = whole campus. */
  async careerMatrix(facilityId: string, u?: AuthUser) {
    const rows = await this.dbs.rows<{ goal: Path; students: number; paid: number; part_paid: number; unpaid: number; overdue_students: number; outstanding: number; overdue: number; avg_cgpa: number | null; backlog_students: number }>(sql`
      with ${FEE_STATE}
      select g.goal, count(*)::int as students,
        count(*) filter (where s.state = 'Paid')::int as paid, count(*) filter (where s.state = 'Part_Paid')::int as part_paid,
        count(*) filter (where s.state in ('Pending', 'Overdue'))::int as unpaid, count(*) filter (where s.state = 'Overdue')::int as overdue_students,
        coalesce(sum(s.due - s.paid) filter (where s.state <> 'Paid'), 0)::float as outstanding, coalesce(sum(s.due - s.paid) filter (where s.state = 'Overdue'), 0)::float as overdue,
        round(avg(v.cgpa), 2)::float as avg_cgpa, count(*) filter (where v.backlogs > 0)::int as backlog_students
      from hostel.v_resident_snapshot v join acad.career_goal g on g.student_id = v.student_id and g.goal <> 'Undecided'
      left join per_student s on s.student_id = v.student_id
      where ${facWhere('v.facility_id', facilityId === 'all' ? null : facilityId, u)}
      group by 1 order by students desc`);
    return rows.map((r) => ({ ...r, name: PATH_NAME[r.goal] }));
  }

  /** Residents who chose a career path, with their fee standing; facilityId 'all' = campus, bucket narrows by fee state. */
  async careerStudents(facilityId: string, goal: string, bucket = 'all', u?: AuthUser) {
    const fee = { paid: sql`s.state = 'Paid'`, part: sql`s.state = 'Part_Paid'`, unpaid: sql`s.state in ('Pending', 'Overdue')`, overdue: sql`s.state = 'Overdue'`,
      backlogs: sql`v.backlogs > 0`, all: sql`true` }[bucket] ?? sql`true`;
    return this.dbs.rows(sql`
      with ${FEE_STATE}
      select v.student_id, v.name, v.programme, v.year_semester, v.hostel_code, g.goal, regexp_replace(g.notes, '^Career choice \\([^)]*\\):\\s*', '') as career_choice,
             v.cgpa::float as cgpa, v.backlogs::int as backlogs,
             coalesce(s.due, 0)::float as due, coalesce(s.paid, 0)::float as paid, coalesce(s.due - s.paid, 0)::float as outstanding, coalesce(s.state, 'No demand') as state
      from hostel.v_resident_snapshot v join acad.career_goal g on g.student_id = v.student_id
      left join per_student s on s.student_id = v.student_id
      where ${facWhere('v.facility_id', facilityId === 'all' ? null : facilityId, u)} and ${goal === 'all' ? sql`g.goal <> 'Undecided'` : sql`g.goal = ${goal}`} and ${fee}
      order by outstanding desc, v.cgpa desc nulls last, v.name`);
  }

  async building(facilityId: string, u?: AuthUser) {
    const [b] = (await this.overview(u)).buildings.filter((x) => (x as unknown as { facility_id: string }).facility_id === facilityId);
    if (!b) throw new NotFoundException('Hostel not found');
    const [settings] = await this.dbs.rows<{ att_min: number; cgpa_watch: number }>(sql`select att_min::float, cgpa_watch::float from ${SETTINGS} s`);
    const at = settings.att_min;

    const cgpaBands = await this.dbs.rows(sql`select band, count(*)::int as n from (select case when cgpa is null then 'No result' when cgpa < 5 then 'Below 5' when cgpa < 6 then '5 – 6'
        when cgpa < 7 then '6 – 7' when cgpa < 8 then '7 – 8' when cgpa < 9 then '8 – 9' else '9 and above' end as band from hostel.v_resident_snapshot where facility_id = ${facilityId}) x group by 1`);
    const attBands = await this.dbs.rows(sql`select band, count(*)::int as n from (select case when attendance_pct is null then 'No record' when attendance_pct < 65 then 'Below 65%'
        when attendance_pct < ${at} then ${`65% – ${at}%`} when attendance_pct < 85 then ${`${at}% – 85%`} else '85% and above' end as band from hostel.v_resident_snapshot where facility_id = ${facilityId}) x group by 1`);
    const watch = await this.dbs.rows(sql`select student_id, name, programme, year_semester, term_label, cgpa::float, attendance_pct::float, backlogs::int, activities
      from hostel.v_resident_snapshot where facility_id = ${facilityId} and (backlogs > 0 or attendance_pct < ${at} or cgpa < ${settings.cgpa_watch})
      order by backlogs desc, attendance_pct nulls first, cgpa`);
    const roster = await this.dbs.rows(sql`select student_id, name, programme, year_semester, cgpa::float, attendance_pct::float, backlogs::int
      from hostel.v_resident_snapshot where facility_id = ${facilityId} order by cgpa nulls last, name`);
    const activityTypes = await this.dbs.rows(sql`select x.activity_type::text as type, count(distinct x.student_id)::int as students, count(*)::int as entries, coalesce(sum(x.hours), 0)::float as hours
      from acad.activity x join hostel.v_resident_snapshot v on v.student_id = x.student_id
      where v.facility_id = ${facilityId} and coalesce(x.to_date, current_date) >= (select start_date from hostel.academic_year where is_current) - 365 group by 1 order by 2 desc`);
    const recentActivities = await this.dbs.rows(sql`select v.name, x.activity_type::text as type, x.title, x.role, to_char(x.from_date, 'YYYY-MM-DD') as from_date
      from acad.activity x join hostel.v_resident_snapshot v on v.student_id = x.student_id where v.facility_id = ${facilityId} order by x.from_date desc limit 8`);
    const achievements = await this.dbs.rows(sql`select x.level::text as level, count(*)::int as n from acad.achievement x join hostel.v_resident_snapshot v on v.student_id = x.student_id
      where v.facility_id = ${facilityId} group by 1 order by 2 desc`);
    const roll = await this.dbs.rows(sql`select to_char(att_date, 'YYYY-MM-DD') as date, count(*) filter (where status::text = 'Present')::int as present,
        count(*) filter (where status::text = 'On_Pass')::int as on_pass, count(*) filter (where status::text = 'Sick_Leave')::int as sick, count(*) filter (where status::text = 'Absent')::int as absent
      from hostel.night_attendance where facility_id = ${facilityId} and att_date > current_date - 14 group by att_date order by att_date`);
    const messDishes = await this.dbs.rows(sql`select r.meal::text as meal, r.dish, count(*)::int as ratings, round(100 * avg(r.score))::int as mood, round(avg(r.rating), 1)::float as stars
      from hostel.meal_rating r join hostel.v_resident_snapshot v on v.student_id = r.student_id
      where v.facility_id = ${facilityId} and r.meal_date > current_date - 30 group by 1, 2 having count(*) >= 4 order by mood desc`);
    const messMeals = await this.dbs.rows(sql`select r.meal::text as meal, round(100 * avg(r.score))::int as mood, count(*)::int as ratings,
        count(*) filter (where r.sentiment = 'Positive')::int as positive, count(*) filter (where r.sentiment = 'Negative')::int as negative
      from hostel.meal_rating r join hostel.v_resident_snapshot v on v.student_id = r.student_id where v.facility_id = ${facilityId} and r.meal_date > current_date - 30 group by 1`);
    const [choice] = await this.dbs.rows(sql`select w.week_start::text as week_start, w.choices_close_at,
        (select count(*)::int from hostel.v_weekly_menu_slot s where s.week_id = w.week_id) as slots,
        count(distinct v.student_id)::int as residents,
        count(distinct c.student_id) filter (where c.source in ('Student', 'Staff'))::int as choosers
      from hostel.weekly_menu w join hostel.v_resident_snapshot v on v.facility_id = ${facilityId}
      join hostel.v_mess_resident mr on mr.student_id = v.student_id and mr.mess_id = w.mess_id
      left join hostel.weekly_menu_choice c on c.week_id = w.week_id and c.student_id = v.student_id
      where w.status = 'Published' group by w.week_id, w.week_start, w.choices_close_at order by w.week_start limit 1`);
    const feeHeads = await this.dbs.rows(sql`select d.fee_head::text as head, sum(d.amount_due)::float as due, sum(d.amount_paid)::float as paid,
        sum(d.amount_due - d.amount_paid) filter (where d.status::text not in ('Paid', 'Waived'))::float as outstanding,
        sum(d.amount_due - d.amount_paid) filter (where d.status::text not in ('Paid', 'Waived') and d.due_date < current_date)::float as overdue
      from hostel.fee_demand d join hostel.v_resident_snapshot v on v.student_id = d.student_id where v.facility_id = ${facilityId} group by 1 order by 2 desc`);
    const defaulters = await this.dbs.rows(sql`select v.name, v.student_id, sum(d.amount_due - d.amount_paid)::float as outstanding, min(d.due_date)::text as oldest_due,
        bool_or(d.due_date < current_date) as overdue
      from hostel.fee_demand d join hostel.v_resident_snapshot v on v.student_id = d.student_id
      where v.facility_id = ${facilityId} and d.status::text not in ('Paid', 'Waived') and d.amount_due > d.amount_paid group by 1, 2 order by 3 desc limit 10`);
    // one row per person: their role is looked up, not joined (a Floor Manager holds one assignment per floor)
    const wardens = await this.dbs.rows(sql`select sa.staff_id, initcap(sm.full_name) as name,
        (select string_agg(distinct replace(x.hostel_role, '_', ' '), ', ') from hostel.staff_space_assignment x where x.staff_id = sa.staff_id and x.facility_id = sa.facility_id
          and x.status = 'Active' and x.hostel_role in ('Chief_Warden', 'Warden', 'Floor_Warden', 'Assistant_Warden', 'Hostel_Incharge')) as role,
        count(*) filter (where sa.status = 'Present')::int as present, count(*) filter (where sa.status = 'Absent')::int as absent,
        count(*) filter (where sa.status = 'Leave')::int as leave, count(*) filter (where sa.status = 'Half_Day')::int as half_day,
        round(100.0 * (count(*) filter (where sa.status = 'Present') + 0.5 * count(*) filter (where sa.status = 'Half_Day')) / nullif(count(*) filter (where sa.status <> 'Week_Off'), 0), 1)::float as pct,
        to_char(max(sa.att_date) filter (where sa.status = 'Absent'), 'YYYY-MM-DD') as last_absent,
        string_agg(left(sa.status::text, 1), '' order by sa.att_date) as days
      from hostel.staff_attendance sa join ref.staff_master sm on sm.staff_id = sa.staff_id
      where sa.facility_id = ${facilityId} and sa.att_date > current_date - 30 and ${WARDEN(sql`sa`)} group by sa.staff_id, sa.facility_id, sm.full_name order by pct nulls last`);
    const cases = await this.dbs.rows(sql`select c.case_no, to_char(c.incident_on, 'YYYY-MM-DD') as date, c.incident_type, c.status, initcap(sm.full_name) as student, c.description
      from hostel.discipline_case c join ref.student_master sm on sm.student_id = c.student_id where c.facility_id = ${facilityId} order by c.incident_on desc limit 12`);
    const caseStatus = await this.dbs.rows(sql`select status, count(*)::int as n from hostel.discipline_case where facility_id = ${facilityId} group by 1 order by 2 desc`);
    const caseTypes = await this.dbs.rows(sql`select incident_type as type, count(*)::int as n from hostel.discipline_case where facility_id = ${facilityId} group by 1 order by 2 desc`);
    return { building: b, settings, performance: { cgpa_bands: cgpaBands, attendance_bands: attBands, watch, roster }, activities: { types: activityTypes, recent: recentActivities, achievements },
      roll, mess: { meals: messMeals, dishes: messDishes, choice: choice ?? null }, fees: { heads: feeHeads, defaulters }, wardens, discipline: { cases, status: caseStatus, types: caseTypes },
      career: await this.career.buildingCareer(facilityId) };
  }
}
