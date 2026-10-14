import { Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { facWhere } from '../auth/scope.js';
import { guide, milestones, PATH_NAME, type Path } from '../dean/career-rules.js';
import { loadCareerRecords, type CareerRow } from './career-data.js';
import type { AuthUser } from '../auth/auth.types.js';

export type OutcomeDto = { student_id: string; outcome_type: 'Placement' | 'Higher_Studies' | 'Competitive_Exam' | 'Entrepreneurship'; stage: string; organisation: string;
  detail?: string | null; ctc_lpa?: number | null; country?: string | null; score?: string | null; funding_inr?: number | null; stage_on?: string; verified?: boolean; notes?: string | null };
type Outcome = { outcome_id: number; student_id: string; outcome_type: string; stage: string; stage_label: string; stage_no: number; is_success: boolean; organisation: string; detail: string | null;
  ctc_lpa: number | null; country: string | null; score: string | null; funding_inr: number | null; stage_on: string; source: string; verified: boolean };

const median = (v: number[]) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const round = (v: number | null, d = 2) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);
const groupBy = <T,>(rows: T[], key: (r: T) => string) => rows.reduce((m, r) => m.set(key(r), [...(m.get(key(r)) ?? []), r]), new Map<string, T[]>());

/**
 * CAR-01 Career tracker. Second year: each hosteller's progress towards the career they chose (milestones of the
 * path, and On track / Watch / Needs guidance from career-rules.ts). Final year: placements and packages, higher
 * studies, competitive examinations and ventures. Student by student for the Chief Manager (their hostels only) and
 * the Deans; building by building for the President, Vice President and Pro-VCs.
 */
@Injectable()
export class CareerService {
  constructor(private dbs: DbService) {}

  /* ---------------------------------------------------------------- second year */

  async secondYear(user: AuthUser | undefined, facilityId?: string, withStudents = true) {
    const rows = await loadCareerRecords(this.dbs, sql`${facWhere('b.facility_id', facilityId, user)} and acad.fn_study_year(b.student_id) = 2`);
    const students = rows.map((r) => {
      const g = guide(r), ms = milestones(r, g.path);
      return { ...r, guidance: g, path_name: PATH_NAME[g.path], milestones: ms, progress: Math.round((ms.filter((m) => m.done).length / ms.length) * 100) };
    });
    const sum = (list: typeof students) => ({
      students: list.length, goal_stated: list.filter((s) => s.goal && s.goal !== 'Undecided').length,
      on_track: list.filter((s) => s.guidance.status === 'On track').length, watch: list.filter((s) => s.guidance.status === 'Watch').length,
      needs_guidance: list.filter((s) => s.guidance.status === 'Needs guidance').length,
      avg_progress: list.length ? Math.round(list.reduce((a, s) => a + s.progress, 0) / list.length) : null,
    });
    const paths = [...groupBy(students, (s) => s.guidance.path).entries()].map(([path, list]) => ({ path, name: PATH_NAME[path as Path], ...sum(list) }))
      .sort((a, b) => b.students - a.students);
    const gaps = new Map<string, number>();
    students.forEach((s) => s.milestones.filter((m) => !m.done).forEach((m) => gaps.set(m.label, (gaps.get(m.label) ?? 0) + 1)));
    const buildings = [...groupBy(students, (s) => s.facility_id).entries()].map(([facility_id, list]) => ({
      facility_id, hostel_code: list[0].hostel_code, ...sum(list),
      paths: [...groupBy(list, (s) => s.guidance.path).entries()].map(([p, l]) => ({ path: p, name: PATH_NAME[p as Path], n: l.length })).sort((a, b) => b.n - a.n),
    })).sort((a, b) => String(a.hostel_code).localeCompare(String(b.hostel_code)));
    return {
      summary: sum(students), paths, buildings,
      gaps: [...gaps.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n).slice(0, 8),
      students: withStudents ? students.sort((a, b) => a.progress - b.progress || a.full_name.localeCompare(b.full_name)) : undefined,
    };
  }

  /* ---------------------------------------------------------------- final year */

  async finalYear(user: AuthUser | undefined, facilityId?: string, withStudents = true) {
    const recs = await loadCareerRecords(this.dbs, sql`${facWhere('b.facility_id', facilityId, user)} and acad.fn_study_year(b.student_id) >= 4`);
    const ids = recs.map((r) => r.student_id);
    const outcomes = ids.length ? await this.dbs.rows<Outcome>(sql`
      select o.outcome_id::int as outcome_id, o.student_id, o.outcome_type, o.stage, s.label as stage_label, s.stage_no::int as stage_no, s.is_success, o.organisation, o.detail,
             o.ctc_lpa::float as ctc_lpa, o.country, o.score, o.funding_inr::float as funding_inr, to_char(o.stage_on, 'YYYY-MM-DD') as stage_on, o.source, o.verified
      from acad.career_outcome o join acad.outcome_stage s using (outcome_type, stage)
      where o.student_id = any(string_to_array(${ids.join(',')}, ',')) order by o.stage_on desc`) : [];
    const byStudent = groupBy(outcomes, (o) => o.student_id);
    const students = recs.map((r) => {
      const os = byStudent.get(r.student_id) ?? [];
      const win = (t: string) => os.filter((o) => o.outcome_type === t && o.is_success);
      const offers = win('Placement');
      return {
        student_id: r.student_id, full_name: r.full_name, programme: r.programme, hostel_code: r.hostel_code, facility_id: r.facility_id, bed_label: r.bed_label,
        goal: r.goal, goal_name: r.goal ? PATH_NAME[r.goal as Path] : 'Not stated', cgpa: r.cgpa, backlogs: r.backlogs,
        outcomes: os, offers: offers.length, best_ctc: offers.reduce<number | null>((m, o) => (o.ctc_lpa != null && (m == null || o.ctc_lpa > m) ? o.ctc_lpa : m), null),
        admitted: win('Higher_Studies').length > 0, exam: win('Competitive_Exam').length > 0, venture: win('Entrepreneurship').length > 0,
        secured: os.some((o) => o.is_success), in_progress: os.some((o) => !o.is_success && o.stage_no > 0),
      };
    });
    const sum = (list: typeof students) => {
      const placed = list.filter((s) => s.offers > 0), pkgs = placed.map((s) => s.best_ctc).filter((v): v is number => v != null);
      const seekers = list.filter((s) => s.goal === 'Placement_Product' || s.goal === 'Placement_Services');
      const lo = outcomes.filter((o) => list.some((s) => s.student_id === o.student_id));
      return {
        students: list.length, secured: list.filter((s) => s.secured).length, in_progress: list.filter((s) => !s.secured && s.in_progress).length,
        nothing_yet: list.filter((s) => !s.secured && !s.in_progress).length,
        placed: placed.length, offers: placed.reduce((a, s) => a + s.offers, 0), seekers: seekers.length, seekers_placed: seekers.filter((s) => s.offers > 0).length,
        avg_ctc: round(pkgs.length ? pkgs.reduce((a, b) => a + b, 0) / pkgs.length : null), median_ctc: round(median(pkgs)), highest_ctc: pkgs.length ? Math.max(...pkgs) : null,
        higher_applied: new Set(lo.filter((o) => o.outcome_type === 'Higher_Studies').map((o) => o.student_id)).size,
        higher_admitted: list.filter((s) => s.admitted).length,
        abroad: new Set(lo.filter((o) => o.outcome_type === 'Higher_Studies' && o.is_success && o.country && o.country !== 'India').map((o) => o.student_id)).size,
        exam_appeared: new Set(lo.filter((o) => o.outcome_type === 'Competitive_Exam' && o.stage !== 'Preparing').map((o) => o.student_id)).size,
        exam_cleared: list.filter((s) => s.exam).length,
        exam_selected: new Set(lo.filter((o) => o.outcome_type === 'Competitive_Exam' && o.stage === 'Selected').map((o) => o.student_id)).size,
        ventures: new Set(lo.filter((o) => o.outcome_type === 'Entrepreneurship' && o.stage !== 'Closed').map((o) => o.student_id)).size,
        ventures_registered: list.filter((s) => s.venture).length,
        funding_inr: lo.filter((o) => o.outcome_type === 'Entrepreneurship').reduce((a, o) => a + (o.funding_inr ?? 0), 0),
      };
    };
    const byGoal = [...groupBy(students, (s) => s.goal_name).entries()].map(([goal, list]) => ({ goal, students: list.length, secured: list.filter((s) => s.secured).length }))
      .sort((a, b) => b.students - a.students);
    const recruiters = [...groupBy(outcomes.filter((o) => o.outcome_type === 'Placement' && o.is_success), (o) => o.organisation).entries()]
      .map(([organisation, os]) => ({ organisation, offers: os.length, top_ctc: Math.max(...os.map((o) => o.ctc_lpa ?? 0)) || null })).sort((a, b) => (b.top_ctc ?? 0) - (a.top_ctc ?? 0)).slice(0, 10);
    const bands = [['Below 5 LPA', 0, 5], ['5 – 10 LPA', 5, 10], ['10 – 20 LPA', 10, 20], ['20 LPA and above', 20, 1e9]] as const;
    const packageBands = bands.map(([label, lo, hi]) => ({ label, n: students.filter((s) => s.best_ctc != null && s.best_ctc >= lo && s.best_ctc < hi).length }));
    const buildings = [...groupBy(students, (s) => s.facility_id).entries()].map(([facility_id, list]) => ({ facility_id, hostel_code: list[0].hostel_code, ...sum(list) }))
      .sort((a, b) => String(a.hostel_code).localeCompare(String(b.hostel_code)));
    return { summary: sum(students), by_goal: byGoal, recruiters, package_bands: packageBands, buildings, students: withStudents ? students.sort((a, b) => Number(a.secured) - Number(b.secured) || a.full_name.localeCompare(b.full_name)) : undefined };
  }

  /* ---------------------------------------------------------------- recording outcomes */

  async stages() {
    return this.dbs.rows(sql`select outcome_type, stage, stage_no::int as stage_no, is_success, label from acad.outcome_stage order by outcome_type, stage_no = 0, stage_no`);
  }

  async addOutcome(user: AuthUser, dto: OutcomeDto) {
    const [r] = await this.dbs.run(user, (tx) => tx.execute(sql`
      insert into acad.career_outcome (student_id, outcome_type, stage, organisation, detail, ctc_lpa, country, score, funding_inr, stage_on, source, verified, notes, created_by)
      values (${dto.student_id}, ${dto.outcome_type}, ${dto.stage}, ${dto.organisation.trim()}, ${dto.detail ?? null}, ${dto.ctc_lpa ?? null}, ${dto.country ?? null}, ${dto.score ?? null},
              ${dto.funding_inr ?? null}, coalesce(${dto.stage_on ?? null}::date, current_date), 'Staff', ${dto.verified ?? true}, ${dto.notes ?? null}, ${user.id})
      returning outcome_id::int as outcome_id`)) as unknown as { outcome_id: number }[];
    return r;
  }

  async updateOutcome(user: AuthUser, id: number, dto: Partial<OutcomeDto>) {
    const r = await this.dbs.run(user, (tx) => tx.execute(sql`update acad.career_outcome set
        stage = coalesce(${dto.stage ?? null}, stage), organisation = coalesce(${dto.organisation?.trim() ?? null}, organisation), detail = coalesce(${dto.detail ?? null}, detail),
        ctc_lpa = coalesce(${dto.ctc_lpa ?? null}, ctc_lpa), country = coalesce(${dto.country ?? null}, country), score = coalesce(${dto.score ?? null}, score),
        funding_inr = coalesce(${dto.funding_inr ?? null}, funding_inr), stage_on = coalesce(${dto.stage_on ?? null}::date, current_date),
        verified = coalesce(${dto.verified ?? null}, verified), updated_by = ${user.id}
      where outcome_id = ${id} returning outcome_id`)) as unknown as unknown[];
    if (!r.length) throw new NotFoundException('Outcome not found');
    return { ok: true };
  }

  /** For the executive dashboard: one building's numbers, no names. */
  async buildingCareer(facilityId: string) {
    const [y2, y4] = await Promise.all([this.secondYear(undefined, facilityId, false), this.finalYear(undefined, facilityId, false)]);
    return { second_year: y2, final_year: y4 };
  }
}

export type { CareerRow };
