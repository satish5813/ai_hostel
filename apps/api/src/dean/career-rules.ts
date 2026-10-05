/**
 * Career guidance for hostellers: reads a student's record (results, placement training, certifications, internships,
 * attendance, discipline) against the path they say they want, or the path their record points to.
 *
 * The outcome is advice for the Dean and counsellors, never a verdict shown to the student:
 *   On track        nothing stands in the way of the path
 *   Watch           one or two things to work on
 *   Needs guidance  several concerns, or the record and the goal point different ways: a conversation is due
 * Every outcome carries its reasons in plain words, so the person reading it can check them.
 */
export type CareerRecord = {
  student_id: string; full_name: string; programme: string | null; hostel_code: string | null; bed_label: string | null;
  semester: number | null; cgpa: number | null; sgpa_last: number | null; sgpa_prev: number | null; backlogs: number; attendance_pct: number | null;
  coding_pct: number | null; aptitude_pct: number | null; technical_pct: number | null; crt_attendance_pct: number | null;
  tech_certs: number; internships: number; tech_events: number; leadership: number; achievements: number; top_level: string | null;
  cases_12m: number; absences_30d: number; goal: string | null;
};
export type Path = 'Placement_Product' | 'Placement_Services' | 'Higher_Studies' | 'Govt_Exams' | 'Entrepreneurship' | 'Core_Other' | 'Undecided';
export const PATH_NAME: Record<Path, string> = {
  Placement_Product: 'Placement, product companies', Placement_Services: 'Placement, IT services', Higher_Studies: 'Higher studies (MS, M.Tech, GATE)',
  Govt_Exams: 'Government exams', Entrepreneurship: 'Start-up', Core_Other: 'Core or other field', Undecided: 'Not decided',
};
export type Guidance = { path: Path; path_source: 'Goal' | 'Record'; status: 'On track' | 'Watch' | 'Needs guidance'; score: number; strengths: string[]; concerns: string[]; next_step: string };

const pct = (v: number | null) => (v == null ? '—' : `${Math.round(v)}%`);

/** The path the record points to when the student has not said one. */
export function pathFromRecord(r: CareerRecord): Path {
  const cg = r.cgpa ?? 0, coding = r.coding_pct ?? 0, apt = r.aptitude_pct ?? 0;
  if (cg >= 8.5 && (r.achievements > 0 || r.tech_events >= 2) && coding < 75) return 'Higher_Studies';
  if (coding >= 70 && (r.tech_certs >= 1 || r.internships >= 1)) return 'Placement_Product';
  if (apt >= 55 && coding >= 45) return 'Placement_Services';
  if (r.leadership >= 2 && r.tech_events >= 1) return 'Entrepreneurship';
  return 'Undecided';
}

export function guide(r: CareerRecord): Guidance {
  const goal = (r.goal as Path | null) ?? null;
  const path: Path = goal && goal !== 'Undecided' ? goal : pathFromRecord(r);
  const strengths: string[] = [], concerns: string[] = [];
  const cg = r.cgpa, fall = r.sgpa_last != null && r.sgpa_prev != null ? r.sgpa_prev - r.sgpa_last : 0;

  // what every path needs
  if (cg != null && cg >= 8.5) strengths.push(`CGPA ${cg.toFixed(2)}`);
  if (cg != null && cg < 6.5) concerns.push(`CGPA ${cg.toFixed(2)} is below 6.5, the usual placement cut-off`);
  if (r.backlogs > 0) concerns.push(`${r.backlogs} backlog${r.backlogs > 1 ? 's' : ''} to clear`);
  if (fall >= 0.5) concerns.push(`SGPA fell from ${r.sgpa_prev!.toFixed(2)} to ${r.sgpa_last!.toFixed(2)} last term`);
  if (r.attendance_pct != null && r.attendance_pct < 75) concerns.push(`Class attendance ${pct(r.attendance_pct)} (below 75%)`);
  if (r.crt_attendance_pct != null && r.crt_attendance_pct < 60) concerns.push(`Attends ${pct(r.crt_attendance_pct)} of placement-training sessions`);
  if (r.cases_12m > 0) concerns.push(`${r.cases_12m} discipline case${r.cases_12m > 1 ? 's' : ''} this year`);
  if (r.absences_30d >= 3) concerns.push(`Absent at roll call ${r.absences_30d} nights in 30 days`);
  if (r.internships > 0) strengths.push(`${r.internships} internship${r.internships > 1 ? 's' : ''}`);
  if (r.achievements > 0) strengths.push(`${r.achievements} achievement${r.achievements > 1 ? 's' : ''}${r.top_level ? ` (up to ${r.top_level.toLowerCase()} level)` : ''}`);

  // what the chosen path needs
  const coding = r.coding_pct, apt = r.aptitude_pct;
  if (path === 'Placement_Product') {
    if (coding != null && coding >= 75) strengths.push(`Coding tests ${pct(coding)}`);
    if (coding == null || coding < 60) concerns.push(`Coding tests ${pct(coding)}; product companies look for 60% and above`);
    if (r.tech_certs === 0 && (r.semester ?? 0) >= 3) concerns.push('No programming or cloud certification yet');
    if (r.tech_certs > 0) strengths.push(`${r.tech_certs} technical certification${r.tech_certs > 1 ? 's' : ''}`);
  } else if (path === 'Placement_Services') {
    if (apt != null && apt >= 65) strengths.push(`Aptitude tests ${pct(apt)}`);
    if (apt == null || apt < 55) concerns.push(`Aptitude tests ${pct(apt)}; service companies screen at about 55%`);
    if (coding != null && coding < 40) concerns.push(`Coding tests ${pct(coding)}`);
  } else if (path === 'Higher_Studies') {
    if (cg == null || cg < 7.5) concerns.push(`CGPA ${cg?.toFixed(2) ?? '—'}; universities abroad and GATE-based M.Tech usually need 7.5 or more`);
    if (r.tech_events === 0 && r.achievements === 0) concerns.push('No project, paper or technical event on record yet');
    if (r.technical_pct != null && r.technical_pct >= 70) strengths.push(`Core subject tests ${pct(r.technical_pct)}`);
  } else if (path === 'Govt_Exams') {
    if (apt == null || apt < 60) concerns.push(`Aptitude tests ${pct(apt)}; competitive exams need steady aptitude practice`);
  } else if (path === 'Entrepreneurship') {
    if (r.leadership === 0) concerns.push('No club, committee or event leadership on record');
    else strengths.push(`${r.leadership} leadership role${r.leadership > 1 ? 's' : ''}`);
  } else if (path === 'Undecided' && (r.semester ?? 0) >= 4) {
    concerns.push('No clear direction by the fourth semester');
  }

  // the student's own goal and their record pointing different ways
  if (goal && goal !== 'Undecided') {
    const fromRecord = pathFromRecord(r);
    if (fromRecord !== 'Undecided' && fromRecord !== goal && concerns.length >= 2) concerns.push(`Says "${PATH_NAME[goal]}"; the record points to ${PATH_NAME[fromRecord].toLowerCase()}`);
  }

  const score = Math.max(0, Math.min(100, 70 + strengths.length * 8 - concerns.length * 14));
  const status: Guidance['status'] = concerns.length === 0 ? 'On track' : concerns.length <= 2 && r.backlogs < 2 ? 'Watch' : 'Needs guidance';
  const next_step = status === 'On track' ? 'Keep going; check in at the next term result.'
    : concerns.some((c) => c.startsWith('Says')) ? 'Talk through the goal with a counsellor and agree one plan.'
    : r.backlogs > 0 || (cg != null && cg < 6.5) ? 'Academic counselling first: clear backlogs, then placement preparation.'
    : path === 'Placement_Product' || path === 'Placement_Services' ? 'Placement cell: practice tests and a coding plan for this term.'
    : path === 'Higher_Studies' ? 'Faculty mentor for a project or paper; plan GATE / GRE dates.'
    : 'Career counselling to choose a direction.';
  return { path, path_source: goal && goal !== 'Undecided' ? 'Goal' : 'Record', status, score, strengths, concerns, next_step };
}

export type Milestone = { label: string; done: boolean };

/**
 * The milestones a second-year student should have reached on their chosen path (or the one their record points to),
 * so progress reads as "4 of 6 done" with the open items named. Shared by the Chief Warden's tracker and EXE-01.
 */
export function milestones(r: CareerRecord, path: Path): Milestone[] {
  const cg = r.cgpa ?? 0, coding = r.coding_pct ?? 0, apt = r.aptitude_pct ?? 0, tech = r.technical_pct ?? 0, crt = r.crt_attendance_pct ?? 0;
  const common: Milestone[] = [
    { label: 'No backlogs and CGPA 6.5 or more', done: r.backlogs === 0 && cg >= 6.5 },
    { label: 'Class attendance 75% or more', done: (r.attendance_pct ?? 0) >= 75 },
  ];
  const by: Record<Path, Milestone[]> = {
    Placement_Product: [
      { label: 'Coding tests 60% or more', done: coding >= 60 }, { label: 'A programming or cloud certification', done: r.tech_certs > 0 },
      { label: 'An internship or technical event', done: r.internships + r.tech_events > 0 }, { label: 'Attends 60% of placement training', done: crt >= 60 },
    ],
    Placement_Services: [
      { label: 'Aptitude tests 55% or more', done: apt >= 55 }, { label: 'Coding tests 40% or more', done: coding >= 40 },
      { label: 'Attends 60% of placement training', done: crt >= 60 }, { label: 'A certification', done: r.tech_certs > 0 },
    ],
    Higher_Studies: [
      { label: 'CGPA 7.5 or more', done: cg >= 7.5 }, { label: 'Core subject tests 60% or more', done: tech >= 60 },
      { label: 'A project, paper or technical event', done: r.tech_events > 0 || r.achievements > 0 }, { label: 'An internship or research work', done: r.internships > 0 },
    ],
    Govt_Exams: [
      { label: 'Aptitude tests 60% or more', done: apt >= 60 }, { label: 'Attends 60% of training sessions', done: crt >= 60 },
      { label: 'Core subject tests 60% or more', done: tech >= 60 },
    ],
    Entrepreneurship: [
      { label: 'A leadership role in a club or committee', done: r.leadership > 0 }, { label: 'A technical event or hackathon', done: r.tech_events > 0 },
      { label: 'An internship', done: r.internships > 0 },
    ],
    Core_Other: [{ label: 'Core subject tests 60% or more', done: tech >= 60 }, { label: 'An internship', done: r.internships > 0 }],
    Undecided: [{ label: 'Choose a career path', done: false }],
  };
  return [...common, ...by[path]];
}
