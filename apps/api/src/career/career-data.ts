import { sql, type SQL } from 'drizzle-orm';
import type { DbService } from '../db/db.service.js';
import type { CareerRecord } from '../dean/career-rules.js';

export type CareerRow = CareerRecord & { facility_id: string; study_year: number | null };

/**
 * Each resident's record as the career rules read it: results, placement training, certifications, activities,
 * achievements, discipline and roll call, with their stated goal. `resWhere` narrows the residents (a condition on
 * the bed `b` and student `sm`), so the Dean, the Chief Warden and the executive dashboard all read the same record.
 */
export function loadCareerRecords(dbs: DbService, resWhere: SQL): Promise<CareerRow[]> {
  return dbs.rows<CareerRow>(sql`
    with res as (select b.student_id, b.hostel_code, b.bed_label, b.facility_id from hostel.v_bed b join ref.student_master sm on sm.student_id = b.student_id
                  where b.occupant_type = 'Student' and b.student_id is not null and ${resWhere}),
    tr as (select student_id, max(semester_no) as semester,
                  (array_agg(cgpa order by semester_no desc))[1] as cgpa, (array_agg(sgpa order by semester_no desc))[1] as sgpa_last,
                  (array_agg(sgpa order by semester_no desc))[2] as sgpa_prev, (array_agg(backlogs order by semester_no desc))[1] as backlogs,
                  (array_agg(attendance_pct order by semester_no desc))[1] as attendance_pct from acad.term_result group by 1),
    crt as (select student_id, avg(100.0 * score / nullif(max_score, 0)) filter (where category = 'Coding') as coding,
                   avg(100.0 * score / nullif(max_score, 0)) filter (where category = 'Aptitude') as aptitude,
                   avg(100.0 * score / nullif(max_score, 0)) filter (where category = 'Technical') as technical from acad.crt_assessment group by 1),
    crta as (select student_id, 100.0 * sum(sessions_attended) / nullif(sum(sessions_held), 0) as pct from acad.crt_attendance group by 1),
    cert as (select student_id, count(*) filter (where category in ('Technical', 'Cloud', 'Programming')) as tech from acad.certification group by 1),
    act as (select student_id, count(*) filter (where activity_type = 'Internship') as internships, count(*) filter (where activity_type = 'Technical_Event') as tech_events,
                   count(*) filter (where role ~* '(lead|head|secretary|captain|coordinator|president|founder)') as leadership from acad.activity group by 1),
    ach as (select student_id, count(*) as n, (array_agg(level::text order by array_position(array['Hostel','University','State','National','International'], level::text) desc))[1] as top from acad.achievement group by 1),
    dis as (select student_id, count(*) as n from hostel.discipline_case where incident_on > now() - interval '12 months' group by 1),
    nab as (select student_id, count(*) as n from hostel.night_attendance where status = 'Absent' and att_date > current_date - 30 group by 1)
    select r.student_id, initcap(sm.full_name) as full_name, sm.programme, r.hostel_code, r.bed_label, r.facility_id, acad.fn_study_year(r.student_id) as study_year,
           tr.semester::int as semester, tr.cgpa::float as cgpa, tr.sgpa_last::float as sgpa_last, tr.sgpa_prev::float as sgpa_prev, coalesce(tr.backlogs, 0)::int as backlogs,
           tr.attendance_pct::float as attendance_pct, crt.coding::float as coding_pct, crt.aptitude::float as aptitude_pct, crt.technical::float as technical_pct,
           crta.pct::float as crt_attendance_pct, coalesce(cert.tech, 0)::int as tech_certs, coalesce(act.internships, 0)::int as internships,
           coalesce(act.tech_events, 0)::int as tech_events, coalesce(act.leadership, 0)::int as leadership, coalesce(ach.n, 0)::int as achievements, ach.top as top_level,
           coalesce(dis.n, 0)::int as cases_12m, coalesce(nab.n, 0)::int as absences_30d, g.goal
    from res r join ref.student_master sm on sm.student_id = r.student_id
    left join tr on tr.student_id = r.student_id left join crt on crt.student_id = r.student_id left join crta on crta.student_id = r.student_id left join cert on cert.student_id = r.student_id
    left join act on act.student_id = r.student_id left join ach on ach.student_id = r.student_id left join dis on dis.student_id = r.student_id left join nab on nab.student_id = r.student_id
    left join acad.career_goal g on g.student_id = r.student_id
    order by sm.full_name`);
}
