import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import type { AuthUser } from '../auth/auth.types.js';

/**
 * ACA-01 Student academic page, widened to the whole student: results, CRT attendance and scores, certifications,
 * activities and achievements, beside the hostel record (stay, attendance, outings, alerts).
 * A student sees their own; a parent their child; wardens and senior staff any hosteller.
 */
@Injectable()
export class AcadService {
  constructor(private dbs: DbService) {}

  private async canSee(user: AuthUser, studentId: string) {
    if (user.kind === 'student' && user.id !== studentId) throw new ForbiddenException('Own record only');
    if (user.kind === 'parent') {
      const [c] = await this.dbs.rows<{ student_id: string }>(sql`select student_id from hostel.student_contact where contact_id = ${Number(user.id.replace('contact:', ''))} and is_verified`);
      if (c?.student_id !== studentId) throw new ForbiddenException('Own child only');
    }
  }

  async profile(user: AuthUser, studentId: string) {
    await this.canSee(user, studentId);
    const [st] = await this.dbs.rows(sql`
      select sm.student_id, sm.full_name, sm.gender::text as gender, sm.programme, sm.student_type::text as level, sm.dept_code, d.dept_name, sm.admission_date, sm.blood_group::text as blood_group,
        sm.is_hosteller, b.hostel_name, b.hostel_code, b.floor_name, b.room_code, b.bed_code, b.type_name, a.allocation_date,
        (select st.full_name from hostel.staff_space_assignment x join ref.staff_master st on st.staff_id = x.staff_id where x.hostel_role = 'Floor_Warden' and x.status = 'Active'
           and x.facility_id = b.facility_id and (x.zone_id is null or x.zone_id = b.zone_id) limit 1) as floor_warden,
        cs.current_status::text as current_status
      from ref.student_master sm left join ref.department d on d.dept_code = sm.dept_code
      left join hostel.hostel_allocation a on a.student_id = sm.student_id and a.status = 'Active'
      left join hostel.v_bed b on b.subspace_id = a.subspace_id
      left join hostel.student_current_status cs on cs.student_id = sm.student_id
      where sm.student_id = ${studentId}`);
    if (!st) throw new NotFoundException('Student not found');
    const [hostel] = await this.dbs.rows(sql`select
        (select round(100.0 * count(*) filter (where status in ('Present','On_Pass','Sick_Leave')) / nullif(count(*), 0), 1)::float from hostel.session_attendance where student_id = ${studentId} and att_date > current_date - 30) as session_pct,
        (select round(100.0 * count(*) filter (where status in ('Present','On_Pass','Sick_Leave')) / nullif(count(*), 0), 1)::float from hostel.night_attendance where student_id = ${studentId} and att_date > current_date - 30) as night_pct,
        (select count(*)::int from hostel.night_attendance where student_id = ${studentId} and status = 'Absent' and att_date > current_date - 30) as nights_missed,
        (select count(*)::int from hostel.outpass where student_id = ${studentId} and status in ('Approved','Out','Returned','Overdue')) as outings,
        (select count(*)::int from hostel.outpass where student_id = ${studentId} and late_by_minutes > 0) as late_returns,
        (select count(*)::int from hostel.hostel_alert where student_id = ${studentId}) as alerts,
        (select coalesce(sum(least(to_date, current_date) - from_date + 1), 0)::int from hostel.sick_leave where student_id = ${studentId} and status in ('Approved','Closed')) as sick_days,
        (select coalesce(sum(amount_due - amount_paid), 0)::float from hostel.fee_demand where student_id = ${studentId} and status in ('Pending','Part_Paid','Overdue')) as dues`);
    const terms = await this.dbs.rows(sql`select semester_no::int as semester_no, term_label, sgpa::float as sgpa, cgpa::float as cgpa, credits_earned::float as credits, attendance_pct::float as attendance_pct, backlogs::int as backlogs
      from acad.term_result where student_id = ${studentId} order by semester_no`);
    const crtAtt = await this.dbs.rows(sql`select to_char(month, 'YYYY-MM') as month, sessions_held::int as held, sessions_attended::int as attended from acad.crt_attendance where student_id = ${studentId} order by month`);
    const crtTests = await this.dbs.rows(sql`select assessment_id::int as id, test_name, test_date, category::text as category, score::float as score, max_score::float as max_score,
        round(100 * (select count(*) from acad.crt_assessment o where o.test_name = a.test_name and o.test_date = a.test_date and o.score <= a.score)::numeric
          / (select count(*) from acad.crt_assessment o where o.test_name = a.test_name and o.test_date = a.test_date))::int as percentile
      from acad.crt_assessment a where student_id = ${studentId} order by test_date`);
    const certs = await this.dbs.rows(sql`select cert_id::int as id, title, provider, category::text as category, issued_on, valid_until, credential_ref, verified_on is not null as verified from acad.certification where student_id = ${studentId} order by issued_on desc`);
    const activities = await this.dbs.rows(sql`select activity_id::int as id, activity_type::text as type, title, role, from_date, to_date, hours::float as hours from acad.activity where student_id = ${studentId} order by from_date desc`);
    const achievements = await this.dbs.rows(sql`select achievement_id::int as id, title, level::text as level, category, achieved_on, award, verified_on is not null as verified from acad.achievement where student_id = ${studentId} order by achieved_on desc`);
    // what the student came with: a fresher (no semester results yet) sees this instead of results
    const prior = await this.dbs.rows(sql`select prior_id::int as id, level, board, institution, group_name, year_passed::int as year_passed, marks_pct::float as marks_pct, cgpa::float as cgpa, roll_no,
        certificate is not null as has_certificate, certificate, source, verified_on is not null as verified
      from acad.prior_education where student_id = ${studentId} order by array_position(array['SSC','Intermediate','Diploma','Degree','PG'], level)`);
    return { student: st, hostel, terms, crt: { attendance: crtAtt, tests: crtTests }, certs, activities, achievements, prior, fresher: terms.length === 0 };
  }

  /** Every hosteller in one table for wardens and senior staff: academics, CRT and hostel conduct side by side. */
  board(user: AuthUser, facilityId?: string) {
    const floorOnly = user.role === 'Floor_Warden';
    return this.dbs.rows(sql`
      select sm.student_id, sm.full_name, sm.programme, sm.dept_code, b.hostel_code, b.floor_name, b.room_code,
        r.cgpa::float as cgpa, r.attendance_pct::float as class_pct, coalesce(bl.backlogs, 0)::int as backlogs,
        (select round(100.0 * sum(sessions_attended) / nullif(sum(sessions_held), 0), 1)::float from acad.crt_attendance c where c.student_id = sm.student_id) as crt_pct,
        (select round(avg(100 * score / max_score), 1)::float from acad.crt_assessment c where c.student_id = sm.student_id) as crt_score,
        (select count(*)::int from acad.certification c where c.student_id = sm.student_id) as certs,
        (select count(*)::int from acad.achievement c where c.student_id = sm.student_id) as achievements,
        (select count(*)::int from acad.activity c where c.student_id = sm.student_id) as activities,
        (select round(100.0 * count(*) filter (where status in ('Present','On_Pass','Sick_Leave')) / nullif(count(*), 0), 1)::float from hostel.night_attendance n where n.student_id = sm.student_id and n.att_date > current_date - 30) as night_pct
      from hostel.v_bed b join ref.student_master sm on sm.student_id = b.student_id
      left join lateral (select cgpa, attendance_pct from acad.term_result t where t.student_id = sm.student_id order by semester_no desc limit 1) r on true
      left join lateral (select sum(backlogs) as backlogs from acad.term_result t where t.student_id = sm.student_id) bl on true
      where b.occupant_type = 'Student' and (${facilityId ?? null}::varchar is null or b.facility_id = ${facilityId ?? null})
        and (not ${floorOnly} or exists (select 1 from hostel.staff_space_assignment a where a.staff_id = ${user.id} and a.hostel_role = 'Floor_Warden' and a.status = 'Active'
          and a.facility_id = b.facility_id and (a.zone_id is null or a.zone_id = b.zone_id)))
      order by b.hostel_code, b.floor_no, b.room_code`);
  }

  /** The student records a qualification from before KL (one row per level); a Warden verifies it, as with certificates. */
  addPrior(user: AuthUser, dto: { level: string; board?: string; institution?: string; group_name?: string; year_passed?: number; marks_pct?: number; cgpa?: number; roll_no?: string; certificate?: string | null }) {
    if (user.kind !== 'student') throw new ForbiddenException('Students add their own record');
    return this.dbs.run(user, (tx) => tx.execute(sql`
      insert into acad.prior_education (student_id, level, board, institution, group_name, year_passed, marks_pct, cgpa, roll_no, certificate, source)
      values (${user.id}, ${dto.level}, ${dto.board ?? null}, ${dto.institution ?? null}, ${dto.group_name ?? null}, ${dto.year_passed ?? null}, ${dto.marks_pct ?? null}, ${dto.cgpa ?? null}, ${dto.roll_no ?? null}, ${dto.certificate ?? null}, 'Student')
      on conflict (student_id, level) do update set board = excluded.board, institution = excluded.institution, group_name = excluded.group_name, year_passed = excluded.year_passed,
        marks_pct = excluded.marks_pct, cgpa = excluded.cgpa, roll_no = excluded.roll_no, certificate = coalesce(excluded.certificate, acad.prior_education.certificate),
        source = 'Student', verified_on = null, verified_by = null, updated_at = now()`));
  }

  addCert(user: AuthUser, dto: { title: string; provider: string; category: string; issued_on: string; credential_ref?: string }) {
    return this.dbs.run(user, (tx) => tx.execute(sql`insert into acad.certification (student_id, title, provider, category, issued_on, credential_ref, added_by)
      values (${user.id}, ${dto.title}, ${dto.provider}, ${dto.category}::acad.cert_category, ${dto.issued_on}::date, ${dto.credential_ref ?? null}, ${user.id}) returning cert_id::int as id`)).then((r) => (r as unknown as unknown[])[0]);
  }
  addAchievement(user: AuthUser, dto: { title: string; level: string; category?: string; achieved_on: string; award?: string }) {
    return this.dbs.run(user, (tx) => tx.execute(sql`insert into acad.achievement (student_id, title, level, category, achieved_on, award, added_by)
      values (${user.id}, ${dto.title}, ${dto.level}::acad.achieve_level, ${dto.category ?? null}, ${dto.achieved_on}::date, ${dto.award ?? null}, ${user.id}) returning achievement_id::int as id`)).then((r) => (r as unknown as unknown[])[0]);
  }
  verify(user: AuthUser, kind: 'certification' | 'achievement', id: number) {
    const q = kind === 'certification'
      ? sql`update acad.certification set verified_by = ${user.id}, verified_on = now() where cert_id = ${id} and verified_on is null returning cert_id`
      : sql`update acad.achievement set verified_by = ${user.id}, verified_on = now() where achievement_id = ${id} and verified_on is null returning achievement_id`;
    return this.dbs.run(user, (tx) => tx.execute(q)).then((r) => { if (!(r as unknown as unknown[]).length) throw new NotFoundException('Nothing to verify'); return { verified: true }; });
  }
}
