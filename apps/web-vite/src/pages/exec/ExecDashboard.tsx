import { useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Activity, AlertTriangle, ArrowLeft, BedDouble, BookOpen, Briefcase, Building2, Wrench, Zap, CheckCircle2, ChevronRight, Compass, FileText, GraduationCap, IndianRupee, LayoutGrid, LogOut, Moon, Printer, Rocket,
  ShieldAlert, Smartphone, Trophy, UserCheck, Utensils, type LucideIcon } from 'lucide-react';
import { setSession } from '@/lib/api';
import { useApi, useProfile, useSession } from '@/lib/ui';
import { Logo } from '@/ui/kit';
import { mealLabel } from '@/pages/mess/weekly';
import { FindStudent, StudentCardHost, StudentName } from './StudentCard';

export type Building = { facility_id: string; hostel_code: string; facility_name: string; gender: string; accommodation_type: string; floors: number | null; beds: number; occupied: number; vacant: number;
  demanded: number; collected: number; overdue: number; students_overdue: number; residents: number; with_results: number; avg_cgpa: number | null; backlog_students: number; backlogs: number;
  short_students: number; low_cgpa: number; active_students: number; achievements: number; avg_attendance: number | null; roll_pct: number | null; mood: number | null; ratings: number | null;
  warden_pct: number | null; wardens: number | null; open_cases: number; cases_year: number;
  career2: (Sum2 & { paths: { path: string; name: string; n: number }[] }) | null; career4: Sum4 | null;
  electricity: { billed: number; collected: number; outstanding: number; overdue: number; students_due: number; recharges: number; units: number } | null;
  tickets: { open: number; awaiting_student: number; late: number; raised_30d: number; closed_30d: number; avg_hours: number | null; open_room: number; open_mess: number; open_common: number } | null };
export type ElecMonth = { month: string; units: number; billed: number; collected: number };
export type Sum2 = { students: number; goal_stated: number; on_track: number; watch: number; needs_guidance: number; avg_progress: number | null };
export type Sum4 = { students: number; secured: number; in_progress: number; nothing_yet: number; placed: number; offers: number; seekers: number; seekers_placed: number; avg_ctc: number | null;
  median_ctc: number | null; highest_ctc: number | null; higher_applied: number; higher_admitted: number; abroad: number; exam_appeared: number; exam_cleared: number; exam_selected: number;
  ventures: number; ventures_registered: number; funding_inr: number };
export type Career = {
  second_year: { summary: Sum2; paths: (Sum2 & { path: string; name: string })[]; gaps: { label: string; n: number }[] };
  final_year: { summary: Sum4; by_goal: { goal: string; students: number; secured: number }[]; recruiters: { organisation: string; offers: number; top_ctc: number | null }[]; package_bands: { label: string; n: number }[] };
};
export type ChoiceHostel = { facility_id: string; hostel_code: string; residents: number; stated: number; product: number; services: number; higher: number; govt: number; startup: number; other: number };
export type CareerChoice = { stated: number; residents: number; by_goal: { goal: string; name: string; n: number }[]; by_hostel: ChoiceHostel[] };
export type Overview = { settings: { att_min: number; cgpa_watch: number }; buildings: Building[]; mess: { mood: number | null; ratings: number; boys: number | null; girls: number | null }; year: { academic_year: string }; careers: Career; career_choice?: CareerChoice; electricity_months: ElecMonth[]; scope?: string[] | null };
export type FeeHostel = { facility_id: string; hostel_code: string; facility_name: string; gender: string; students: number; single_plan: number; two_plan: number; paid: number; part_paid: number; unpaid: number; overdue_students: number; no_demand: number; demanded: number; collected: number; outstanding: number; overdue: number };
type FeeStudent = { student_id: string; name: string; programme: string | null; year_semester: string | null; plan_type: string | null; due: number; paid: number; outstanding: number; state: string; last_paid_on: string | null; receipts: number;
  career_goal: string | null; career_choice: string | null; cgpa: number | null; backlogs: number };
type ChoiceStudent = { student_id: string; name: string; programme: string | null; year_semester: string | null; hostel_code: string; goal: string; career_choice: string | null; cgpa: number | null; backlogs: number;
  due: number; paid: number; outstanding: number; state: string };
type MatrixRow = { goal: string; name: string; students: number; paid: number; part_paid: number; unpaid: number; overdue_students: number; outstanding: number; overdue: number; avg_cgpa: number | null; backlog_students: number };
type Detail = {
  building: Building; settings: Overview['settings'];
  performance: { cgpa_bands: { band: string; n: number }[]; attendance_bands: { band: string; n: number }[];
    watch: { student_id: string; name: string; programme: string | null; year_semester: string | null; term_label: string | null; cgpa: number | null; attendance_pct: number | null; backlogs: number; activities: number }[];
    roster: { student_id: string; name: string; programme: string | null; year_semester: string | null; cgpa: number | null; attendance_pct: number | null; backlogs: number }[] };
  activities: { types: { type: string; students: number; entries: number; hours: number }[]; recent: { name: string; type: string; title: string; role: string | null; from_date: string }[]; achievements: { level: string; n: number }[] };
  roll: { date: string; present: number; on_pass: number; sick: number; absent: number }[];
  mess: { meals: { meal: string; mood: number; ratings: number; positive: number; negative: number }[]; dishes: { meal: string; dish: string; ratings: number; mood: number; stars: number }[];
    choice: { week_start: string; slots: number; residents: number; choosers: number } | null };
  fees: { heads: { head: string; due: number; paid: number; outstanding: number | null; overdue: number | null }[]; defaulters: { name: string; student_id: string; outstanding: number; oldest_due: string; overdue: boolean }[] };
  wardens: { staff_id: string; name: string; role: string | null; present: number; absent: number; leave: number; half_day: number; pct: number | null; last_absent: string | null; days: string }[];
  discipline: { cases: { case_no: string; date: string; incident_type: string; status: string; student: string; description: string }[]; status: { status: string; n: number }[]; types: { type: string; n: number }[] };
  career: Career;
};
type Tone = 'good' | 'warn' | 'bad' | 'none';

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
const inr = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : `₹${Math.round(n).toLocaleString('en-IN')}`);
const words = (s: string) => (({ Chief_Warden: 'Chief Manager', Floor_Warden: 'Floor Manager' } as Record<string, string>)[s] ?? s).replace(/_/g, ' ');
const sum = (b: Building[], k: keyof Building) => b.reduce((a, x) => a + (Number(x[k]) || 0), 0);
const avgBy = (b: Building[], k: keyof Building, w: keyof Building) => { const t = b.filter((x) => x[k] != null); const ww = sum(t, w); return ww ? t.reduce((a, x) => a + Number(x[k]) * Number(x[w]), 0) / ww : null; };
const fmtDay = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Higher is better unless `low` is set; [good from, watch from]. */
const tone = (v: number | null | undefined, good: number, watch: number, low = false): Tone =>
  v == null ? 'none' : low ? (v <= good ? 'good' : v <= watch ? 'warn' : 'bad') : v >= good ? 'good' : v >= watch ? 'warn' : 'bad';
const TONE_LABEL: Record<Tone, string> = { good: 'Good', warn: 'Watch', bad: 'Act', none: '' };
const ToneIcon = ({ t }: { t: Tone }) => (t === 'good' ? <CheckCircle2 size={13} /> : t === 'none' ? null : <AlertTriangle size={13} />);

/**
 * EXE-01 Executive dashboard for the President, Vice President and Pro-VCs. No menu: the university at a glance,
 * one card per hostel building, and a building opens into sub-cards for academic standing, activities, roll call,
 * mess, fees and dues, managers' attendance and discipline.
 */
export default function ExecDashboard() {
  const { facilityId } = useParams();
  return (
    <StudentCardHost>
      <div className="xd">
        <TopBar />
        <main className="xd-main">{facilityId ? <BuildingView id={facilityId} /> : <Overview />}</main>
      </div>
    </StudentCardHost>
  );
}

/** Prints the whole dashboard on A4 landscape: the page size is set just for this print, then removed. */
function printLandscape() {
  const st = document.createElement('style');
  st.textContent = '@page { size: A4 landscape; margin: 7mm 8mm; }';
  document.head.appendChild(st);
  window.addEventListener('afterprint', () => st.remove(), { once: true });
  window.print();
}

function TopBar() {
  const s = useSession()!;
  const p = useProfile();
  const navigate = useNavigate();
  return (
    <header className="xd-top">
      <button type="button" className="xd-brand" onClick={() => navigate('/exec')}><Logo cut="mark" height={30} /><span><b>KL Residencies</b><small>Executive view</small></span></button>
      <FindStudent />
      <nav className="xd-links" aria-label="More">
        <button type="button" onClick={() => navigate('/reports/mess-sentiment')}><Utensils size={15} />Rasoi sentiment</button>
        <button type="button" onClick={printLandscape}><Printer size={15} />Print dashboard</button>
        <button type="button" onClick={() => navigate('/exec/report')}><FileText size={15} />A4 report</button>
        <button type="button" onClick={() => navigate('/home')}><LayoutGrid size={15} />All apps</button>
      </nav>
      <span className="xd-user"><span><b>{p.data?.full_name ?? s.id}</b><small>{words(s.role)}</small></span>
        <button type="button" aria-label="Sign out" title="Sign out" onClick={() => { setSession(null); location.href = '/'; }}><LogOut size={16} /></button></span>
    </header>
  );
}

/* ------------------------------------------------------------------ the university */

function Overview() {
  const r = useApi<Overview>('/exec/overview');
  const navigate = useNavigate();
  const [drill, setDrill] = useState<string | null>(null);
  const d = r.data;
  if (!d) return <p className="xd-loading">Loading…</p>;
  const b = d.buildings;
  const res = sum(b, 'residents');
  const withRes = sum(b, 'with_results');
  const cgpa = avgBy(b, 'avg_cgpa', 'with_results');
  const roll = avgBy(b, 'roll_pct', 'residents');
  const warden = avgBy(b, 'warden_pct', 'wardens');
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const demanded = sum(b, 'demanded'), collected = sum(b, 'collected');
  const y4 = d.careers.final_year.summary;
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <>
      <section className="xd-hero xd-hero-grad">
        <div className="xd-hero-text"><p className="xd-eyebrow">{date} · academic year {d.year?.academic_year}</p><h1>Residencies at a glance</h1>
          <p className="xd-lead">{d.scope ? `Your residencies: ${b.map((x) => x.facility_name).join(', ')}` : `${b.length} residencies`} · {num(res)} students. Every number opens the residencies behind it.</p></div>
        <div className="xd-pulse" aria-label="Quick view">
          <button type="button" onClick={() => setDrill('students')}><b>{num(res)}</b><small>students · {pct(sum(b, 'occupied'), sum(b, 'beds'))}% of beds</small></button>
          <button type="button" onClick={() => go('xd-fees')}><b>{pct(collected, demanded)}%</b><small>fees collected · {inr(collected)}</small></button>
          <button type="button" onClick={() => setDrill('backlogs')}><b>{pct(sum(b, 'backlog_students'), res)}%</b><small>with backlogs · {num(sum(b, 'backlog_students'))}</small></button>
          {y4.students > 0 && <button type="button" onClick={() => go('xd-careers')}><b>{pct(y4.placed, y4.students)}%</b><small>final years placed · {num(y4.placed)}</small></button>}
        </div>
      </section>
      <section className="xd-kpis" aria-label="University">
        <Kpi c="people" icon={BedDouble} label="Residency students" value={num(res)} sub={`${pct(sum(b, 'occupied'), sum(b, 'beds'))}% of ${num(sum(b, 'beds'))} beds`} spark={sparkOf(b, (x) => x.residents)} onClick={() => setDrill('students')} />
        <Kpi c="acad" icon={GraduationCap} label="Average CGPA" value={cgpa?.toFixed(2) ?? '—'} sub={`${num(withRes)} with results`} t={tone(cgpa, 7, d.settings.cgpa_watch)} spark={sparkOf(b, (x) => x.avg_cgpa)} onClick={() => setDrill('cgpa')} />
        <Kpi c="acad" icon={BookOpen} label="With backlogs" value={num(sum(b, 'backlog_students'))} sub={`${pct(sum(b, 'backlog_students'), res)}% of ${num(res)} students · ${num(sum(b, 'backlogs'))} backlogs`} t={tone(pct(sum(b, 'backlog_students'), res), 10, 20, true)} spark={sparkOf(b, (x) => x.backlog_students)} onClick={() => setDrill('backlogs')} />
        <Kpi c="acad" icon={UserCheck} label={`Attendance below ${d.settings.att_min}%`} value={String(sum(b, 'short_students'))} sub={`${pct(sum(b, 'short_students'), res)}% of students`} t={tone(pct(sum(b, 'short_students'), res), 5, 15, true)} spark={sparkOf(b, (x) => x.short_students)} onClick={() => setDrill('attendance')} />
        <Kpi c="life" icon={Trophy} label="In clubs, sports, activities" value={`${pct(sum(b, 'active_students'), res)}%`} sub={`${num(sum(b, 'active_students'))} students · ${num(sum(b, 'achievements'))} achievements`} t={tone(pct(sum(b, 'active_students'), res), 60, 40)} spark={sparkOf(b, (x) => pct(x.active_students, x.residents))} onClick={() => setDrill('activities')} />
        <Kpi c="life" icon={Moon} label="Night roll call" value={roll != null ? `${roll.toFixed(1)}%` : '—'} sub="Present or accounted for, 30 days" t={tone(roll, 95, 90)} spark={sparkOf(b, (x) => x.roll_pct)} onClick={() => setDrill('roll')} />
        <Kpi c="life" icon={Utensils} label="Rasoi mood" value={moodText(d.mess.mood)} sub={`Boys ${moodText(d.mess.boys)} · Girls ${moodText(d.mess.girls)} · 30 days`} t={tone(d.mess.mood, 20, 0)} spark={sparkOf(b, (x) => x.ratings)} onClick={() => setDrill('mood')} />
        <Kpi c="money" icon={IndianRupee} label="Dues outstanding" value={inr(demanded - collected)} sub={`${inr(sum(b, 'overdue'))} overdue · ${num(sum(b, 'students_overdue'))} students`} t={tone(sum(b, 'overdue'), 0, 100000, true)} spark={sparkOf(b, (x) => x.demanded - x.collected)} onClick={() => setDrill('dues')} />
        <Kpi c="ops" icon={Activity} label="Managers' attendance" value={warden != null ? `${warden.toFixed(1)}%` : '—'} sub="Present, last 30 days" t={tone(warden, 90, 80)} spark={sparkOf(b, (x) => x.warden_pct)} onClick={() => setDrill('wardens')} />
        <Kpi c="risk" icon={ShieldAlert} label="Open discipline cases" value={String(sum(b, 'open_cases'))} sub={`${num(sum(b, 'cases_year'))} this year`} t={tone(sum(b, 'open_cases'), 0, 3, true)} spark={sparkOf(b, (x) => x.open_cases)} onClick={() => setDrill('cases')} />
      </section>
      {drill && <KpiDrill k={drill} b={b} onClose={() => setDrill(null)} />}

      <h2 className="xd-h2" id="xd-fees" data-c="money"><span className="xd-ic"><IndianRupee size={16} /></span>Fees and dues</h2>
      <FeesSection />

      {d.career_choice && d.career_choice.stated > 0 && <>
        <h2 className="xd-h2" data-c="acad"><span className="xd-ic"><Compass size={16} /></span>Career choices</h2>
        <CareerChoiceSection c={d.career_choice} />
      </>}

      {(d.careers.final_year.summary.secured + d.careers.final_year.summary.in_progress + d.careers.second_year.summary.goal_stated) > 0 && <>
        <h2 className="xd-h2" id="xd-careers" data-c="acad"><span className="xd-ic"><Briefcase size={16} /></span>Career outcomes</h2>
        <CareerKpis c={d.careers} />
      </>}

      <h2 className="xd-h2" data-c="ops"><span className="xd-ic"><Zap size={16} /></span>Electricity and repairs</h2>
      <PowerKpis b={b} months={d.electricity_months} />

      <h2 className="xd-h2" data-c="life"><span className="xd-ic"><Smartphone size={16} /></span>Student app</h2>
      <AppKpis />

      <h2 className="xd-h2" data-c="people"><span className="xd-ic"><Building2 size={16} /></span>Residencies</h2>
      <section className="xd-cards" aria-label="Buildings">
        {b.map((x) => <BuildingCard key={x.facility_id} b={x} settings={d.settings} onOpen={() => navigate(`/exec/${x.facility_id}`)} />)}
      </section>
      <p className="xd-foot"><span className="xd-t-good"><CheckCircle2 size={12} />Good</span><span className="xd-t-warn"><AlertTriangle size={12} />Watch</span><span className="xd-t-bad"><AlertTriangle size={12} />Act</span>
        Attendance shortfall is below {d.settings.att_min}% cumulative; CGPA under {d.settings.cgpa_watch} is watched. Thresholds are set by the administrator.</p>
    </>
  );
}

const lpa = (v: number | null | undefined) => (v == null ? '—' : `${v % 1 ? v.toFixed(1) : v} LPA`);
const num = (v: number) => v.toLocaleString('en-IN');

/** A centred dialog over the dashboard; closes on the backdrop, the button or Escape. */
function Modal({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="xd-modal" role="dialog" aria-modal="true" aria-label={title} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="xd-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="xd-modal-head"><div><h3>{title}</h3>{sub && <small>{sub}</small>}</div><button type="button" onClick={onClose} autoFocus>Close</button></div>
        <div className="xd-modal-body">{children}</div>
      </div>
    </div>
  );
}

/** A number in a table that opens the students behind it. */
function Cell({ n, onClick }: { n: number; onClick: () => void }) {
  return n > 0 ? <button type="button" className="xd-cellbtn" onClick={onClick}>{num(n)}</button> : <span className="xd-quiet">0</span>;
}

const FEE_BUCKET: Record<string, string> = { all: 'All students', single: 'Single instalment (yearly)', two: 'Two instalments', paid: 'Fully paid', part: 'Paid first instalment only', unpaid: 'Not paid', overdue: 'Overdue' };
const STATE_LABEL: Record<string, string> = { Paid: 'Paid', Part_Paid: '1st instalment', Pending: 'Not paid', Overdue: 'Overdue', 'No demand': 'No fee raised' };

function FeesSection() {
  const r = useApi<{ hostels: FeeHostel[] }>('/exec/fees');
  const [open, setOpen] = useState<{ h: FeeHostel; bucket: string } | null>(null);
  if (!r.data) return <p className="xd-loading">Loading…</p>;
  const hs = r.data.hostels, t = (k: keyof FeeHostel) => hs.reduce((a, h) => a + Number(h[k] ?? 0), 0);
  return (
    <>
      <section className="xd-kpis" aria-label="Fees">
        <Kpi c="money" icon={IndianRupee} label="Residency fee demanded" value={inr(t('demanded'))} sub={`${num(t('students'))} students · ${num(t('single_plan'))} single instalment · ${num(t('two_plan'))} two instalments`} />
        <Kpi c="money" icon={CheckCircle2} label="Collected" value={inr(t('collected'))} sub={`${pct(t('collected'), t('demanded'))}% of demand · ${num(t('paid'))} fully paid · ${num(t('part_paid'))} paid 1st instalment`} t={tone(pct(t('collected'), t('demanded')), 50, 40)} />
        <Kpi c="money" icon={Activity} label="Outstanding" value={inr(t('outstanding'))} sub="Mostly 2nd instalments not yet due" />
        <Kpi c="risk" icon={AlertTriangle} label="Overdue" value={inr(t('overdue'))} sub={`${num(t('overdue_students'))} students past the due date · ${num(t('unpaid'))} not paid at all`} t={tone(t('overdue_students'), 0, 50, true)} />
      </section>
      <div className="xd-table-wrap xd-card-table"><table className="xd-table">
        <thead><tr><th>Residency</th><th className="n">Students</th><th className="n">1 instalment</th><th className="n">2 instalments</th><th className="n">Fully paid</th><th className="n">1st instalment only</th><th className="n">Not paid</th><th className="n">Overdue</th><th className="n">Demanded</th><th className="n">Collected</th><th className="n">Outstanding</th></tr></thead>
        <tbody>{hs.map((h) => (
          <tr key={h.facility_id}><td><b>{h.facility_name}</b><small>{h.hostel_code} · {h.gender}</small></td>
            <td className="n"><Cell n={h.students} onClick={() => setOpen({ h, bucket: 'all' })} /></td>
            <td className="n"><Cell n={h.single_plan} onClick={() => setOpen({ h, bucket: 'single' })} /></td>
            <td className="n"><Cell n={h.two_plan} onClick={() => setOpen({ h, bucket: 'two' })} /></td>
            <td className="n"><Cell n={h.paid} onClick={() => setOpen({ h, bucket: 'paid' })} /></td>
            <td className="n"><Cell n={h.part_paid} onClick={() => setOpen({ h, bucket: 'part' })} /></td>
            <td className={`n${h.unpaid ? ' xd-flag' : ''}`}><Cell n={h.unpaid} onClick={() => setOpen({ h, bucket: 'unpaid' })} /></td>
            <td className={`n${h.overdue ? ' xd-flag' : ''}`}>{h.overdue ? <button type="button" className="xd-cellbtn" onClick={() => setOpen({ h, bucket: 'overdue' })}>{inr(h.overdue)}</button> : <span className="xd-quiet">—</span>}</td>
            <td className="n">{inr(h.demanded)}</td><td className="n">{inr(h.collected)}</td><td className="n"><b>{inr(h.outstanding)}</b></td></tr>))}
          <tr className="xd-total"><td><b>All residencies</b></td><td className="n"><b>{num(t('students'))}</b></td><td className="n"><b>{num(t('single_plan'))}</b></td><td className="n"><b>{num(t('two_plan'))}</b></td><td className="n"><b>{num(t('paid'))}</b></td><td className="n"><b>{num(t('part_paid'))}</b></td><td className="n"><b>{num(t('unpaid'))}</b></td><td className="n"><b>{inr(t('overdue'))}</b></td><td className="n"><b>{inr(t('demanded'))}</b></td><td className="n"><b>{inr(t('collected'))}</b></td><td className="n"><b>{inr(t('outstanding'))}</b></td></tr>
        </tbody></table></div>
      {open && <FeeStudentsModal h={open.h} bucket={open.bucket} onClose={() => setOpen(null)} />}
    </>
  );
}

function FeeStudentsModal({ h, bucket, onClose }: { h: FeeHostel; bucket: string; onClose: () => void }) {
  const r = useApi<FeeStudent[]>(`/exec/fees/${h.facility_id}/students?bucket=${bucket}`);
  const list = r.data ?? [];
  const due = list.reduce((a, s) => a + s.outstanding, 0);
  return (
    <Modal title={`${h.facility_name} · ${FEE_BUCKET[bucket] ?? bucket}`} sub={r.data ? `${num(list.length)} students · ${inr(due)} outstanding` : 'Loading…'} onClose={onClose}>
      <table className="xd-table">
        <thead><tr><th>Student</th><th>Programme</th><th>Career choice</th><th>Plan</th><th className="n">Demanded</th><th className="n">Paid</th><th className="n">Outstanding</th><th>Status</th><th>Last paid</th><th className="n">CGPA</th></tr></thead>
        <tbody>{list.map((s) => (
          <tr key={s.student_id}><td><StudentName id={s.student_id} name={s.name} /></td><td>{s.programme ?? '—'}{s.year_semester ? <small>{s.year_semester}</small> : null}</td>
            <td>{s.career_choice ? <span className="xd-choice">{s.career_choice}</span> : <span className="xd-quiet">Not stated</span>}</td>
            <td>{s.plan_type === 'Single' ? '1 instalment' : s.plan_type === 'Two_Instalments' ? '2 instalments' : '—'}</td>
            <td className="n">{inr(s.due)}</td><td className="n">{inr(s.paid)}</td><td className={`n${s.outstanding > 0 ? ' xd-flag' : ''}`}><b>{inr(s.outstanding)}</b></td>
            <td><span className={`xd-pill xd-pill-${s.state === 'Paid' ? 'good' : s.state === 'Part_Paid' ? 'warn' : 'bad'}`}>{STATE_LABEL[s.state] ?? s.state}</span></td>
            <td>{s.last_paid_on ? new Date(`${s.last_paid_on}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}{s.receipts ? <small>{s.receipts} receipt{s.receipts === 1 ? '' : 's'}</small> : null}</td>
            <td className="n">{s.cgpa?.toFixed(2) ?? '—'}{s.backlogs ? <small className="xd-flag">{s.backlogs} backlog{s.backlogs === 1 ? '' : 's'}</small> : null}</td></tr>))}
          {r.data && !list.length && <tr><td colSpan={10} className="xd-none">No students in this bucket.</td></tr>}
        </tbody></table>
    </Modal>
  );
}

const GOAL_COL: { key: keyof ChoiceHostel; goal: string; label: string }[] = [
  { key: 'product', goal: 'Placement_Product', label: 'Product companies' }, { key: 'services', goal: 'Placement_Services', label: 'IT services' },
  { key: 'higher', goal: 'Higher_Studies', label: 'Higher studies' }, { key: 'govt', goal: 'Govt_Exams', label: 'Government' },
  { key: 'startup', goal: 'Entrepreneurship', label: 'Start-up' }, { key: 'other', goal: 'Core_Other', label: 'Core / other' }];

type Pick = { facility: string; where: string; goal: string; goalLabel: string; bucket: string };
const BUCKET_LABEL: Record<string, string> = { all: 'all', paid: 'fully paid', part: 'paid 1st instalment only', unpaid: 'not paid', overdue: 'overdue', backlogs: 'with backlogs' };

function CareerChoiceSection({ c }: { c: CareerChoice }) {
  const [open, setOpen] = useState<Pick | null>(null);
  const [fac, setFac] = useState('all');
  const hs = c.by_hostel.filter((h) => h.stated > 0);
  const where = fac === 'all' ? 'All residencies' : hs.find((h) => h.facility_id === fac)?.hostel_code ?? fac;
  const m = useApi<MatrixRow[]>(`/exec/careers/matrix?facility=${fac}`);
  const rows = m.data ?? [];
  const tot = (k: keyof MatrixRow) => rows.reduce((a, r) => a + Number(r[k] ?? 0), 0);
  const pick = (goal: string, goalLabel: string, bucket: string) => setOpen({ facility: fac, where, goal, goalLabel, bucket });
  return (
    <>
      <div className="xd-grid">
        <Block title="What residents plan to do" sub={`${num(c.stated)} of ${num(c.residents)} residents have stated a choice (${pct(c.stated, c.residents)}%) · from the career-choice survey`}>
          <Bars rows={c.by_goal.map((g) => ({ label: g.name, n: g.n }))} />
        </Block>
        <Block wide title="By residency" sub="Tap a number to see the students">
          <div className="xd-table-wrap"><table className="xd-table">
            <thead><tr><th>Residency</th><th className="n">Residency students</th><th className="n">Stated</th>{GOAL_COL.map((g) => <th key={g.key} className="n">{g.label}</th>)}</tr></thead>
            <tbody>{hs.map((h) => (
              <tr key={h.facility_id}><td><b>{h.hostel_code}</b></td><td className="n">{num(h.residents)}</td>
                <td className="n"><Cell n={h.stated} onClick={() => setOpen({ facility: h.facility_id, where: h.hostel_code, goal: 'all', goalLabel: 'All choices', bucket: 'all' })} /></td>
                {GOAL_COL.map((g) => <td key={g.key} className="n"><Cell n={Number(h[g.key])} onClick={() => setOpen({ facility: h.facility_id, where: h.hostel_code, goal: g.goal, goalLabel: g.label, bucket: 'all' })} /></td>)}</tr>))}
            </tbody></table></div>
        </Block>
        <Block wide title="Career path × fees and results" sub="Each path: how its students stand on residency fees and results · tap a number to see them">
          <div className="xd-chips" role="tablist" aria-label="Hostel">
            <button type="button" role="tab" aria-selected={fac === 'all'} className={fac === 'all' ? 'xd-chip-on' : ''} onClick={() => setFac('all')}>All residencies</button>
            {hs.map((h) => <button key={h.facility_id} type="button" role="tab" aria-selected={fac === h.facility_id} className={fac === h.facility_id ? 'xd-chip-on' : ''} onClick={() => setFac(h.facility_id)}>{h.hostel_code}<small>{num(h.stated)}</small></button>)}
          </div>
          {!m.data ? <p className="xd-loading">Loading…</p> : <MatrixTable rows={rows} pick={pick} />}
        </Block>
      </div>
      {open && <ChoiceStudentsModal p={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Career path rows with fee standing and results; every count opens the students. */
function MatrixTable({ rows, pick }: { rows: MatrixRow[]; pick: (goal: string, label: string, bucket: string) => void }) {
  const tot = (k: keyof MatrixRow) => rows.reduce((a, r) => a + Number(r[k] ?? 0), 0);
  if (!rows.length) return <p className="xd-none">No career choices recorded here yet.</p>;
  return (
    <div className="xd-table-wrap"><table className="xd-table">
      <thead><tr><th>Career path</th><th className="n">Students</th><th className="n">Fully paid</th><th className="n">1st instalment only</th><th className="n">Not paid</th><th className="n">Overdue ₹</th><th className="n">Outstanding</th><th className="n">Avg CGPA</th><th className="n">With backlogs</th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.goal}><td><b>{r.name}</b></td>
          <td className="n"><Cell n={r.students} onClick={() => pick(r.goal, r.name, 'all')} /></td>
          <td className="n"><Cell n={r.paid} onClick={() => pick(r.goal, r.name, 'paid')} /></td>
          <td className="n"><Cell n={r.part_paid} onClick={() => pick(r.goal, r.name, 'part')} /></td>
          <td className={`n${r.unpaid ? ' xd-flag' : ''}`}><Cell n={r.unpaid} onClick={() => pick(r.goal, r.name, 'unpaid')} /></td>
          <td className={`n${r.overdue ? ' xd-flag' : ''}`}>{r.overdue ? <button type="button" className="xd-cellbtn" onClick={() => pick(r.goal, r.name, 'overdue')}>{inr(r.overdue)}</button> : <span className="xd-quiet">—</span>}</td>
          <td className="n">{inr(r.outstanding)}</td>
          <td className="n">{r.avg_cgpa?.toFixed(2) ?? '—'}</td>
          <td className={`n${r.backlog_students ? ' xd-flag' : ''}`}><Cell n={r.backlog_students} onClick={() => pick(r.goal, r.name, 'backlogs')} /></td></tr>))}
        <tr className="xd-total"><td><b>All paths</b></td><td className="n"><b>{num(tot('students'))}</b></td><td className="n"><b>{num(tot('paid'))}</b></td><td className="n"><b>{num(tot('part_paid'))}</b></td><td className="n"><b>{num(tot('unpaid'))}</b></td><td className="n"><b>{inr(tot('overdue'))}</b></td><td className="n"><b>{inr(tot('outstanding'))}</b></td><td className="n">—</td><td className="n"><b>{num(tot('backlog_students'))}</b></td></tr>
      </tbody></table></div>
  );
}

/** One building's career choices: what its residency students chose, and how each path stands on fees and results. */
function BuildingCareer({ b, rows, loading }: { b: Building; rows: MatrixRow[]; loading: boolean }) {
  const [open, setOpen] = useState<Pick | null>(null);
  const stated = rows.reduce((a, r) => a + r.students, 0);
  if (loading) return <p className="xd-loading">Loading…</p>;
  return (
    <div className="xd-grid">
      <Block title="What residents plan to do" sub={`${num(stated)} of ${num(b.residents)} residents have stated a choice (${pct(stated, b.residents)}%)`}>
        <Bars rows={rows.map((r) => ({ label: r.name, n: r.students }))} />
      </Block>
      <Block wide title="Career path × fees and results" sub="Tap a number to see the students">
        <MatrixTable rows={rows} pick={(goal, goalLabel, bucket) => setOpen({ facility: b.facility_id, where: b.hostel_code, goal, goalLabel, bucket })} />
      </Block>
      {open && <ChoiceStudentsModal p={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ChoiceStudentsModal({ p, onClose }: { p: Pick; onClose: () => void }) {
  const r = useApi<ChoiceStudent[]>(`/exec/careers/${p.facility}/students?goal=${p.goal}&bucket=${p.bucket}`);
  const list = r.data ?? [];
  const due = list.reduce((a, s) => a + s.outstanding, 0);
  const title = `${p.where} · ${p.goalLabel}${p.bucket !== 'all' ? ` · ${BUCKET_LABEL[p.bucket]}` : ''}`;
  return (
    <Modal title={title} sub={r.data ? `${num(list.length)} students${due ? ` · ${inr(due)} outstanding` : ''}` : 'Loading…'} onClose={onClose}>
      <table className="xd-table">
        <thead><tr><th>Student</th><th>Residency</th><th>Programme</th><th>Career choice</th><th className="n">CGPA</th><th className="n">Backlogs</th><th className="n">Demanded</th><th className="n">Paid</th><th className="n">Outstanding</th><th>Fee status</th></tr></thead>
        <tbody>{list.map((s) => (
          <tr key={s.student_id}><td><StudentName id={s.student_id} name={s.name} /></td><td>{s.hostel_code}</td><td>{s.programme ?? '—'}{s.year_semester ? <small>{s.year_semester}</small> : null}</td>
            <td><span className="xd-choice">{s.career_choice ?? s.goal}</span></td>
            <td className="n">{s.cgpa?.toFixed(2) ?? '—'}</td><td className={`n${s.backlogs ? ' xd-flag' : ''}`}>{s.backlogs || '—'}</td>
            <td className="n">{inr(s.due)}</td><td className="n">{inr(s.paid)}</td><td className={`n${s.outstanding > 0 ? ' xd-flag' : ''}`}><b>{inr(s.outstanding)}</b></td>
            <td><span className={`xd-pill xd-pill-${s.state === 'Paid' ? 'good' : s.state === 'Part_Paid' ? 'warn' : s.state === 'No demand' ? 'neu' : 'bad'}`}>{STATE_LABEL[s.state] ?? s.state}</span></td></tr>))}
          {r.data && !list.length && <tr><td colSpan={10} className="xd-none">No students here.</td></tr>}
        </tbody></table>
    </Modal>
  );
}

type Downloads = { total: { taps: number; devices: number; since: string | null }; today: { taps: number; devices: number }; logins: { students: number; active_7_days: number; residents: number };
  by_file: { file: string; taps: number; devices: number }[]; by_day: { day: string; taps: number; devices: number }[]; by_device: { device: string; devices: number }[] };
const APP_NAME: Record<string, string> = { 'KL-Residencies.apk': 'Student app', 'KL-Residencies-demo.apk': 'Student app (training)', 'KL-Dashboard.apk': 'KL Dashboard (leadership)' };

/** The student app: downloads counted from the /app page (from the day counting began) and students with their own login. */
function AppKpis() {
  const r = useApi<Downloads>('/downloads/summary');
  const [open, setOpen] = useState(false);
  const d = r.data;
  if (!d) return <p className="xd-loading">{r.error ? 'Download figures are not available.' : 'Loading…'}</p>;
  const since = d.total.since ? new Date(d.total.since).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  return (
    <>
      <section className="xd-kpis" aria-label="Student app">
        <Kpi c="life" icon={Smartphone} label="App downloads" value={num(d.total.devices)} sub={since ? `phones · ${num(d.total.taps)} taps on Download since ${since}` : 'Counting began with this release; no downloads yet'} hint="By day" onClick={() => setOpen(true)} />
        <Kpi c="life" icon={Activity} label="Downloads today" value={num(d.today.devices)} sub={`${num(d.today.taps)} taps today`} />
        <Kpi c="people" icon={UserCheck} label="Students with their own login" value={num(d.logins.students)} sub={`${pct(d.logins.students, d.logins.residents)}% of ${num(d.logins.residents)} residents · ${num(d.logins.active_7_days)} signed in this week`} t={tone(pct(d.logins.students, d.logins.residents), 60, 30)} />
      </section>
      {open && (
        <Modal title="App downloads" sub={since ? `${num(d.total.devices)} phones since ${since}` : 'No downloads counted yet'} onClose={() => setOpen(false)}>
          <table className="xd-table"><thead><tr><th>Day</th><th className="n">Phones</th><th className="n">Taps on Download</th></tr></thead>
            <tbody>{[...d.by_day].reverse().map((x) => <tr key={x.day}><td><b>{new Date(`${x.day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</b></td><td className="n">{num(x.devices)}</td><td className="n">{num(x.taps)}</td></tr>)}
              {!d.by_day.length && <tr><td colSpan={3} className="xd-none">No downloads counted yet.</td></tr>}</tbody></table>
          {d.by_file.length > 0 && <table className="xd-table" style={{ marginTop: 14 }}><thead><tr><th>App</th><th className="n">Phones</th><th className="n">Taps</th></tr></thead>
            <tbody>{d.by_file.map((x) => <tr key={x.file}><td><b>{APP_NAME[x.file] ?? x.file}</b><small>{x.file}</small></td><td className="n">{num(x.devices)}</td><td className="n">{num(x.taps)}</td></tr>)}</tbody></table>}
          {d.by_device.length > 0 && <p className="xd-quiet" style={{ marginTop: 12 }}>Downloaded on: {d.by_device.map((x) => `${x.device} ${num(x.devices)}`).join(' · ')}. A phone is counted once however many times Download is tapped; no name or address is kept.</p>}
        </Modal>)}
    </>
  );
}

function PowerKpis({ b, months }: { b: Building[]; months: ElecMonth[] }) {
  const e = (k: keyof NonNullable<Building['electricity']>) => b.reduce((a, x) => a + (x.electricity ? Number(x.electricity[k]) : 0), 0);
  const t = (k: keyof NonNullable<Building['tickets']>) => b.reduce((a, x) => a + (x.tickets ? Number(x.tickets[k] ?? 0) : 0), 0);
  const max = Math.max(1, ...months.map((m) => m.billed));
  return (
    <section className="xd-kpis" aria-label="Electricity and repairs">
      <Kpi c="ops" icon={Zap} label="Electricity paid by students" value={inr(e('collected'))} sub={`Cumulative: room bills and recharges · ${inr(e('billed'))} billed`} t={tone(pct(e('collected'), e('billed')), 85, 70)} />
      <Kpi c="money" icon={IndianRupee} label="Electricity outstanding" value={inr(e('outstanding'))} sub={`${inr(e('overdue'))} overdue · ${e('students_due')} students`} t={tone(e('overdue'), 0, 20000, true)} />
      <div className="xd-kpi xd-kpi-wide">
        <span className="xd-kpi-top"><Activity size={16} /><span>Electricity by month</span></span>
        <ul className="xd-months" aria-label="Billed and paid by month">{months.map((m) => (
          <li key={m.month} title={`${m.month}: ${Math.round(m.units)} units, ${inr(m.billed)} billed, ${inr(m.collected)} paid`}>
            <span className="xd-mbar"><i style={{ height: `${(m.billed / max) * 100}%` }}><i style={{ height: `${pct(m.collected, m.billed)}%` }} /></i></span>
            <small>{new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</small><b>{inr(m.billed)}</b></li>))}
          {!months.length && <li className="xd-none">No bills yet</li>}</ul>
        <span className="xd-legend"><span><i className="xd-paid" />Paid</span><span><i className="xd-due" />Not yet paid</span></span>
      </div>
      <Kpi c="ops" icon={Wrench} label="Repair tickets open" value={String(t('open'))} sub={`${t('late')} late · ${t('raised_30d')} raised, ${t('closed_30d')} closed in 30 days`} t={tone(t('late'), 0, 3, true)} />
    </section>
  );
}

function CareerKpis({ c }: { c: Career }) {
  const y2 = c.second_year.summary, y4 = c.final_year.summary;
  return (
    <section className="xd-kpis" aria-label="Careers">
      <Kpi c="acad" icon={Compass} label="Second years on track" value={`${pct(y2.on_track, y2.students)}%`} sub={`${y2.on_track} of ${y2.students} · ${y2.needs_guidance} need guidance`} t={tone(pct(y2.on_track, y2.students), 60, 40)} />
      <Kpi c="acad" icon={Activity} label="Progress on chosen career" value={`${y2.avg_progress ?? 0}%`} sub={`${pct(y2.goal_stated, y2.students)}% have chosen a career`} t={tone(y2.avg_progress, 75, 55)} />
      <Kpi c="acad" icon={CheckCircle2} label="Final years with an outcome" value={`${pct(y4.secured, y4.students)}%`} sub={`${y4.secured} of ${y4.students} · ${y4.in_progress} in progress`} t={tone(pct(y4.secured, y4.students), 75, 50)} />
      <Kpi c="acad" icon={Briefcase} label="Placed · highest package" value={`${y4.placed} · ${lpa(y4.highest_ctc)}`} sub={`${y4.offers} offers · median ${lpa(y4.median_ctc)} · average ${lpa(y4.avg_ctc)}`} />
      <Kpi c="acad" icon={Rocket} label="Higher studies · exams · ventures" value={`${y4.higher_admitted} · ${y4.exam_cleared} · ${y4.ventures_registered}`} sub={`${y4.abroad} abroad · ${y4.exam_selected} selected · ${inr(y4.funding_inr)} raised`} />
    </section>
  );
}

const moodText = (m: number | null | undefined) => (m == null ? '—' : `${m > 0 ? '+' : ''}${m}`);

type Domain = 'people' | 'acad' | 'money' | 'life' | 'risk' | 'ops';

/** A headline number. With onClick it is a button that drills down; spark = per-hostel values (0..1) drawn as mini bars. */
function Kpi({ icon: I, label, value, sub, t = 'none', c = 'ops', onClick, spark, hint = 'By residency' }:
  { icon: LucideIcon; label: string; value: string; sub?: string; t?: Tone; c?: Domain; onClick?: () => void; spark?: number[]; hint?: string }) {
  const body = (
    <>
      <span className="xd-kpi-top"><span className="xd-ic"><I size={15} /></span><span>{label}</span></span>
      <b>{value}</b>
      {sub && <small>{sub}</small>}
      {spark && spark.length > 1 && <span className="xd-spark" aria-hidden>{spark.map((v, i) => <i key={i} style={{ height: `${Math.max(10, Math.round(v * 100))}%` }} />)}</span>}
      {t !== 'none' && <em className="xd-badge"><ToneIcon t={t} />{TONE_LABEL[t]}</em>}
      {onClick && <span className="xd-kpi-go">{hint}<ChevronRight size={13} /></span>}
    </>
  );
  return onClick
    ? <button type="button" className={`xd-kpi xd-kpi-btn xd-t-${t}`} data-c={c} onClick={onClick}>{body}</button>
    : <div className={`xd-kpi xd-t-${t}`} data-c={c}>{body}</div>;
}

/** Per-hostel values scaled 0..1 for a KPI sparkline (buildings in display order). */
const sparkOf = (b: Building[], f: (x: Building) => number | null | undefined) => {
  const v = b.map((x) => Number(f(x) ?? 0)); const m = Math.max(1e-9, ...v); return v.map((x) => x / m);
};

/** What each headline KPI means per hostel, for the drill-down. */
type Metric = { label: string; c: Domain; val: (b: Building) => number | null | undefined; fmt: (b: Building) => string; sub: (b: Building) => string; tab: Tab; good?: [number, number, boolean] };
const METRICS: Record<string, Metric> = {
  students: { label: 'Residency students', c: 'people', val: (b) => b.residents, fmt: (b) => num(b.residents), sub: (b) => `${pct(b.occupied, b.beds)}% of ${num(b.beds)} beds`, tab: 'academic' },
  cgpa: { label: 'Average CGPA', c: 'acad', val: (b) => b.avg_cgpa, fmt: (b) => b.avg_cgpa?.toFixed(2) ?? '—', sub: (b) => `${num(b.with_results)} with results`, tab: 'academic', good: [7.5, 6.5, false] },
  backlogs: { label: 'With backlogs', c: 'acad', val: (b) => b.backlog_students, fmt: (b) => `${num(b.backlog_students)} of ${num(b.residents)}`, sub: (b) => `${pct(b.backlog_students, b.residents)}% · ${num(b.backlogs)} backlogs`, tab: 'academic', good: [10, 20, true] },
  attendance: { label: 'Attendance shortfall', c: 'acad', val: (b) => b.short_students, fmt: (b) => `${num(b.short_students)} of ${num(b.residents)}`, sub: (b) => `${pct(b.short_students, b.residents)}% of students`, tab: 'academic', good: [5, 15, true] },
  activities: { label: 'In clubs, sports, activities', c: 'life', val: (b) => pct(b.active_students, b.residents), fmt: (b) => `${pct(b.active_students, b.residents)}%`, sub: (b) => `${num(b.active_students)} students · ${num(b.achievements)} achievements`, tab: 'activities', good: [60, 40, false] },
  roll: { label: 'Night roll call', c: 'life', val: (b) => b.roll_pct, fmt: (b) => (b.roll_pct != null ? `${b.roll_pct}%` : '—'), sub: () => 'present or accounted for, 30 days', tab: 'roll', good: [95, 90, false] },
  mood: { label: 'Rasoi mood', c: 'life', val: (b) => b.mood, fmt: (b) => moodText(b.mood), sub: (b) => `${b.ratings ?? 0} ratings in 30 days`, tab: 'mess', good: [20, 0, false] },
  dues: { label: 'Dues outstanding', c: 'money', val: (b) => b.demanded - b.collected, fmt: (b) => inr(b.demanded - b.collected), sub: (b) => `${inr(b.overdue)} overdue · ${num(b.students_overdue)} students · ${pct(b.collected, b.demanded)}% collected`, tab: 'fees' },
  wardens: { label: "Managers' attendance", c: 'ops', val: (b) => b.warden_pct, fmt: (b) => (b.warden_pct != null ? `${b.warden_pct}%` : '—'), sub: (b) => `${b.wardens ?? 0} managers · last 30 days`, tab: 'wardens', good: [90, 80, false] },
  cases: { label: 'Open discipline cases', c: 'risk', val: (b) => b.open_cases, fmt: (b) => num(b.open_cases), sub: (b) => `${num(b.cases_year)} this year`, tab: 'discipline', good: [0, 2, true] },
};

/** One KPI broken down by hostel: ranked, with bars, and a way into the building's own tab. */
function KpiDrill({ k, b, onClose }: { k: string; b: Building[]; onClose: () => void }) {
  const m = METRICS[k]; const navigate = useNavigate();
  const rows = b.filter((x) => x.residents > 0).map((x) => ({ x, v: Number(m.val(x) ?? 0) })).sort((p, q) => q.v - p.v);
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.v)));
  return (
    <Modal title={`${m.label} · by residency`} sub={`${rows.length} residencies · tap one to open it`} onClose={onClose}>
      <ul className="xd-drill" data-c={m.c}>{rows.map(({ x, v }) => {
        const t: Tone = m.good ? tone(m.val(x), m.good[0], m.good[1], m.good[2]) : 'none';
        return (
          <li key={x.facility_id}>
            <button type="button" onClick={() => navigate(`/exec/${x.facility_id}?tab=${m.tab}`)}>
              <span className={`xd-mono xd-g-${x.gender.toLowerCase()}`}>{x.hostel_code}</span>
              <span className="xd-drill-name"><b>{x.facility_name}</b><small>{m.sub(x)}</small></span>
              <i><i style={{ width: `${Math.round((Math.abs(v) / max) * 100)}%` }} /></i>
              <em className={`xd-t-${t}`}>{m.fmt(x)}{t !== 'none' && <ToneIcon t={t} />}</em>
              <ChevronRight size={16} className="xd-chev" />
            </button>
          </li>);
      })}</ul>
    </Modal>
  );
}

function Ring({ value, of, label }: { value: number; of: number; label: string }) {
  const p = of ? value / of : 0, r = 30, c = 2 * Math.PI * r;
  return (
    <svg className="xd-ring" viewBox="0 0 76 76" role="img" aria-label={`${label}: ${value} of ${of}`}>
      <circle cx="38" cy="38" r={r} className="xd-ring-bg" />
      <circle cx="38" cy="38" r={r} className="xd-ring-fg" strokeDasharray={`${p * c} ${c}`} transform="rotate(-90 38 38)" />
      <text x="38" y="36" textAnchor="middle" className="xd-ring-v">{Math.round(p * 100)}%</text>
      <text x="38" y="50" textAnchor="middle" className="xd-ring-l">{label}</text>
    </svg>
  );
}

function BuildingCard({ b, settings, onOpen }: { b: Building; settings: Overview['settings']; onOpen: () => void }) {
  const empty = !b.residents;
  const rows: [string, string, Tone, number | null][] = empty ? [] : [
    ['In activities', `${pct(b.active_students, b.residents)}%`, tone(pct(b.active_students, b.residents), 60, 40), pct(b.active_students, b.residents)],
    ['With backlogs', `${b.backlog_students} of ${b.residents} · ${pct(b.backlog_students, b.residents)}%`, tone(pct(b.backlog_students, b.residents), 10, 20, true), pct(b.backlog_students, b.residents)],
    [`Attendance < ${settings.att_min}%`, `${b.short_students} of ${b.residents} · ${pct(b.short_students, b.residents)}%`, tone(pct(b.short_students, b.residents), 5, 15, true), pct(b.short_students, b.residents)],
    ['Night roll call', b.roll_pct != null ? `${b.roll_pct}%` : '—', tone(b.roll_pct, 95, 90), b.roll_pct],
    ["Managers' attendance", b.warden_pct != null ? `${b.warden_pct}%` : '—', tone(b.warden_pct, 90, 80), b.warden_pct],
    ...(b.career2 ? [['2nd-year career progress', `${b.career2.avg_progress ?? 0}%`, tone(b.career2.avg_progress, 75, 55), b.career2.avg_progress] as [string, string, Tone, number | null]] : []),
    ...(b.career4 ? [['Final years secured', `${b.career4.secured}/${b.career4.students}`, tone(pct(b.career4.secured, b.career4.students), 75, 50), pct(b.career4.secured, b.career4.students)] as [string, string, Tone, number | null]] : []),
  ];
  return (
    <button type="button" className={`xd-card${empty ? ' xd-card-empty' : ''}`} data-g={b.gender} onClick={onOpen} aria-label={`${b.hostel_code} ${b.facility_name}: open`}>
      <span className="xd-card-head">
        <span className={`xd-mono xd-g-${b.gender.toLowerCase()}`}>{b.hostel_code}</span>
        <span className="xd-card-title"><b>{b.facility_name}</b><small>{b.gender} · {b.accommodation_type === 'Hostel' ? 'Residency' : b.accommodation_type}{b.floors ? ` · ${b.floors} floors` : ''}</small></span>
        <ChevronRight size={18} className="xd-chev" />
      </span>
      {empty ? <span className="xd-card-none">No students in the residency yet · {b.beds.toLocaleString('en-IN')} beds</span> : (
        <>
          <span className="xd-card-mid">
            <Ring value={b.occupied} of={b.beds} label="beds" />
            <span className="xd-card-stats">
              <span><b>{b.residents}</b><small>students</small></span>
              <span><b>{b.avg_cgpa?.toFixed(2) ?? '—'}</b><small>avg CGPA</small></span>
              <span><b>{moodText(b.mood)}</b><small>rasoi mood</small></span>
            </span>
          </span>
          <span className="xd-rows">{rows.map(([l, v, t, p]) => (
            <span key={l} className={`xd-row xd-t-${t}`}><span>{l}</span><i><i style={{ width: `${Math.min(100, p ?? 0)}%` }} /></i><b>{v}</b><em><ToneIcon t={t} /><span className="sd-sr">{TONE_LABEL[t]}</span></em></span>))}</span>
          <span className="xd-card-foot">
            <span className={b.overdue ? 'xd-t-bad' : ''}><IndianRupee size={13} />{inr(b.demanded - b.collected)} due{b.overdue ? ` · ${inr(b.overdue)} overdue` : ''}</span>
            <span className={b.open_cases ? 'xd-t-warn' : ''}><ShieldAlert size={13} />{b.open_cases} open case{b.open_cases === 1 ? '' : 's'}</span>
            {b.electricity && <span><Zap size={13} />{inr(b.electricity.collected)} electricity paid</span>}
            {b.tickets && b.tickets.open > 0 && <span className={b.tickets.late ? 'xd-t-bad' : ''}><Wrench size={13} />{b.tickets.open} repair{b.tickets.open === 1 ? '' : 's'} open</span>}
          </span>
        </>)}
    </button>
  );
}

/* ------------------------------------------------------------------ one building */

type Tab = 'academic' | 'choices' | 'y2' | 'y4' | 'activities' | 'roll' | 'mess' | 'fees' | 'power' | 'repairs' | 'wardens' | 'discipline';
const TAB_DOMAIN: Record<Tab, Domain> = { academic: 'acad', choices: 'acad', y2: 'acad', y4: 'acad', activities: 'life', roll: 'life', mess: 'life', fees: 'money', power: 'money', repairs: 'ops', wardens: 'ops', discipline: 'risk' };

function BuildingView({ id }: { id: string }) {
  const r = useApi<Detail>(`/exec/buildings/${id}`);
  const matrix = useApi<MatrixRow[]>(`/exec/careers/matrix?facility=${id}`);
  const navigate = useNavigate();
  const wanted = new URLSearchParams(useLocation().search).get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(wanted ?? 'academic');
  const d = r.data;
  if (!d) return <p className="xd-loading">Loading…</p>;
  const b = d.building;
  const lastRoll = d.roll[d.roll.length - 1];
  const mrows = matrix.data ?? [], stated = mrows.reduce((a, x) => a + x.students, 0), top = mrows[0];
  const tabs: { k: Tab; icon: LucideIcon; label: string; value: string; sub: string; t: Tone }[] = [
    { k: 'academic', icon: GraduationCap, label: 'Academic standing', value: b.avg_cgpa?.toFixed(2) ?? '—', sub: `${b.backlog_students} with backlogs · ${b.short_students} short of ${d.settings.att_min}%`,
      t: tone(pct(b.backlog_students + b.short_students, b.with_results), 10, 25, true) },
    { k: 'choices', icon: Compass, label: 'Career choices', value: matrix.data ? `${num(stated)} of ${num(b.residents)}` : '…',
      sub: top ? `${pct(stated, b.residents)}% stated · most chose ${top.name.toLowerCase()}` : 'No career-choice survey for this building yet', t: 'none' },
    { k: 'y2', icon: Compass, label: 'Second-year careers', value: `${d.career.second_year.summary.avg_progress ?? 0}%`,
      sub: `${d.career.second_year.summary.on_track} of ${d.career.second_year.summary.students} on track · progress on chosen path`, t: d.career.second_year.summary.students ? tone(d.career.second_year.summary.avg_progress, 75, 55) : 'none' },
    { k: 'y4', icon: Briefcase, label: 'Final-year outcomes', value: `${d.career.final_year.summary.secured}/${d.career.final_year.summary.students}`,
      sub: `secured · best ${lpa(d.career.final_year.summary.highest_ctc)}`, t: d.career.final_year.summary.students ? tone(pct(d.career.final_year.summary.secured, d.career.final_year.summary.students), 75, 50) : 'none' },
    { k: 'activities', icon: Trophy, label: 'Activities', value: `${pct(b.active_students, b.residents)}%`, sub: `${b.active_students} of ${b.residents} take part · ${b.achievements} achievements`, t: tone(pct(b.active_students, b.residents), 60, 40) },
    { k: 'roll', icon: Moon, label: 'Night roll call', value: b.roll_pct != null ? `${b.roll_pct}%` : '—', sub: lastRoll ? `${fmtDay(lastRoll.date)}: ${lastRoll.absent} absent` : 'No roll call yet', t: tone(b.roll_pct, 95, 90) },
    { k: 'mess', icon: Utensils, label: 'Mess', value: moodText(b.mood), sub: d.mess.choice ? `${d.mess.choice.choosers} of ${d.mess.choice.residents} chose next week` : `${b.ratings ?? 0} ratings in 30 days`, t: tone(b.mood, 20, 0) },
    { k: 'fees', icon: IndianRupee, label: 'Fees and dues', value: inr(b.demanded - b.collected), sub: `${pct(b.collected, b.demanded)}% collected · ${inr(b.overdue)} overdue`, t: tone(b.overdue, 0, 100000, true) },
    { k: 'power', icon: Zap, label: 'Electricity', value: inr(b.electricity?.collected ?? 0), sub: `paid · ${inr(b.electricity?.outstanding ?? 0)} outstanding`,
      t: b.electricity ? tone(pct(b.electricity.collected, b.electricity.billed), 85, 70) : 'none' },
    { k: 'repairs', icon: Wrench, label: 'Repair tickets', value: String(b.tickets?.open ?? 0), sub: `open · ${b.tickets?.late ?? 0} late`, t: tone(b.tickets?.late ?? 0, 0, 2, true) },
    { k: 'wardens', icon: Activity, label: "Managers' attendance", value: b.warden_pct != null ? `${b.warden_pct}%` : '—', sub: `${d.wardens.length} wardens · last 30 days`, t: tone(b.warden_pct, 90, 80) },
    { k: 'discipline', icon: ShieldAlert, label: 'Discipline', value: String(b.open_cases), sub: `open · ${b.cases_year} this year`, t: tone(b.open_cases, 0, 2, true) },
  ];
  return (
    <>
      <button type="button" className="xd-back" onClick={() => navigate('/exec')}><ArrowLeft size={16} />All buildings</button>
      <section className="xd-hero xd-hero-b">
        <span className={`xd-mono xd-mono-lg xd-g-${b.gender.toLowerCase()}`}>{b.hostel_code}</span>
        <div><p className="xd-eyebrow">{b.gender} · {b.accommodation_type === 'Hostel' ? 'Residency' : b.accommodation_type}{b.floors ? ` · ${b.floors} floors` : ''}</p><h1>{b.facility_name}</h1>
          <p className="xd-lead">{b.residents} students in {b.occupied} of {b.beds} beds ({pct(b.occupied, b.beds)}%) · {b.wardens ?? 0} managers</p></div>
      </section>
      <section className="xd-subcards" role="tablist" aria-label="Sections">
        {tabs.map((x) => (
          <button key={x.k} type="button" role="tab" aria-selected={tab === x.k} className={`xd-sub xd-t-${x.t}`} data-c={TAB_DOMAIN[x.k]} onClick={() => setTab(x.k)}>
            <span className="xd-kpi-top"><span className="xd-ic"><x.icon size={15} /></span><span>{x.label}</span></span><b>{x.value}</b><small>{x.sub}</small>
            {x.t !== 'none' && <em className="xd-badge"><ToneIcon t={x.t} />{TONE_LABEL[x.t]}</em>}</button>))}
      </section>
      <section className="xd-panel" role="tabpanel">
        {tab === 'academic' && <Academic d={d} />}
        {tab === 'choices' && <BuildingCareer b={b} rows={mrows} loading={!matrix.data} />}
        {tab === 'y2' && <SecondYear c={d.career} />}
        {tab === 'y4' && <FinalYear c={d.career} />}
        {tab === 'activities' && <Activities d={d} />}
        {tab === 'roll' && <Roll d={d} />}
        {tab === 'mess' && <Mess d={d} />}
        {tab === 'fees' && <Fees d={d} />}
        {tab === 'power' && <Power b={b} />}
        {tab === 'repairs' && <Repairs b={b} />}
        {tab === 'wardens' && <Wardens d={d} />}
        {tab === 'discipline' && <Discipline d={d} />}
      </section>
    </>
  );
}

function Block({ title, sub, children, wide }: { title: string; sub?: string; children: ReactNode; wide?: boolean }) {
  return <div className={`xd-block${wide ? ' xd-wide' : ''}`}><h3>{title}</h3>{sub && <p className="xd-bsub">{sub}</p>}{children}</div>;
}

/** Horizontal bars of one hue (magnitude), each labelled with its count. */
function Bars({ rows, order, alert, alertLabel = 'watch', onPick, picked }: { rows: { label: string; n: number }[]; order?: string[]; alert?: (label: string) => boolean; alertLabel?: string; onPick?: (label: string) => void; picked?: string | null }) {
  const list = order ? order.map((o) => rows.find((r) => r.label === o) ?? { label: o, n: 0 }) : rows;
  const max = Math.max(1, ...list.map((r) => r.n));
  if (!list.length) return <p className="xd-none">Nothing recorded.</p>;
  return (
    <ul className="xd-bars">{list.map((r) => {
      const inner = <>
        <span>{words(r.label)}{alert?.(r.label) && <em><AlertTriangle size={11} />{alertLabel}</em>}</span>
        <i><i style={{ width: `${(r.n / max) * 100}%` }} /></i><b>{r.n}</b></>;
      const cls = alert?.(r.label) ? 'xd-bar-alert' : '';
      const clickable = onPick && r.n > 0;
      return clickable
        ? <li key={r.label} className={`${cls} xd-bar-btn${picked === r.label ? ' xd-bar-on' : ''}`} role="button" tabIndex={0}
            aria-expanded={picked === r.label} onClick={() => onPick!(r.label)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick!(r.label); } }}>{inner}</li>
        : <li key={r.label} className={cls}>{inner}</li>;
    })}</ul>
  );
}

const cgpaBandOf = (v: number | null) => v == null ? 'No result' : v < 5 ? 'Below 5' : v < 6 ? '5 – 6' : v < 7 ? '6 – 7' : v < 8 ? '7 – 8' : v < 9 ? '8 – 9' : '9 and above';
const attBandOf = (v: number | null, at: number) => v == null ? 'No record' : v < 65 ? 'Below 65%' : v < at ? `65% – ${at}%` : v < 85 ? `${at}% – 85%` : '85% and above';

function Academic({ d }: { d: Detail }) {
  const p = d.performance, at = d.settings.att_min;
  const [pick, setPick] = useState<{ kind: 'cgpa' | 'att'; band: string } | null>(null);
  const toggle = (kind: 'cgpa' | 'att', band: string) => setPick((cur) => cur && cur.kind === kind && cur.band === band ? null : { kind, band });
  const picked = pick ? p.roster.filter((r) => pick.kind === 'cgpa' ? cgpaBandOf(r.cgpa) === pick.band : attBandOf(r.attendance_pct, at) === pick.band) : [];
  return (
    <div className="xd-grid">
      <Block title="CGPA" sub={`Latest term result of ${d.building.with_results} students · tap a band to list the students`}>
        <Bars rows={p.cgpa_bands.map((x) => ({ label: x.band, n: x.n }))} order={['Below 5', '5 – 6', '6 – 7', '7 – 8', '8 – 9', '9 and above', 'No result']} alert={(l) => l === 'Below 5' || l === '5 – 6'}
          onPick={(l) => toggle('cgpa', l)} picked={pick?.kind === 'cgpa' ? pick.band : null} />
      </Block>
      <Block title="Cumulative class attendance" sub={`Below ${at}% is a shortfall · tap a band to list the students`}>
        <Bars rows={p.attendance_bands.map((x) => ({ label: x.band, n: x.n }))} order={['Below 65%', `65% – ${at}%`, `${at}% – 85%`, '85% and above', 'No record']} alert={(l) => l === 'Below 65%' || l === `65% – ${at}%`} alertLabel="shortfall"
          onPick={(l) => toggle('att', l)} picked={pick?.kind === 'att' ? pick.band : null} />
      </Block>
      {pick && <Block wide title={`${pick.kind === 'cgpa' ? 'CGPA' : 'Attendance'}: ${pick.band}`} sub={`${picked.length} student${picked.length === 1 ? '' : 's'}`}>
        <div className="xd-table-wrap"><table className="xd-table">
          <thead><tr><th>Student</th><th>Programme</th><th className="n">CGPA</th><th className="n">Attendance</th><th className="n">Backlogs</th></tr></thead>
          <tbody>{picked.map((s) => (
            <tr key={s.student_id}><td><StudentName id={s.student_id} name={s.name} /></td><td>{s.programme ?? '—'}{s.year_semester ? <small>{s.year_semester}</small> : null}</td>
              <td className={`n${s.cgpa != null && s.cgpa < d.settings.cgpa_watch ? ' xd-flag' : ''}`}>{s.cgpa?.toFixed(2) ?? '—'}</td>
              <td className={`n${s.attendance_pct != null && s.attendance_pct < at ? ' xd-flag' : ''}`}>{s.attendance_pct != null ? `${s.attendance_pct}%` : '—'}</td>
              <td className={`n${s.backlogs ? ' xd-flag' : ''}`}>{s.backlogs || '—'}</td></tr>))}</tbody></table></div>
      </Block>}
      <Block wide title="Students needing attention" sub={`Backlogs, attendance below ${at}%, or CGPA under ${d.settings.cgpa_watch}`}>
        {p.watch.length ? (
          <div className="xd-table-wrap"><table className="xd-table">
            <thead><tr><th>Student</th><th>Programme</th><th className="n">Backlogs</th><th className="n">CGPA</th><th className="n">Attendance</th><th className="n">Activities</th></tr></thead>
            <tbody>{p.watch.map((s) => (
              <tr key={s.student_id}><td><StudentName id={s.student_id} name={s.name} /></td><td>{s.programme ?? '—'}{s.year_semester ? <small>{s.year_semester}</small> : null}</td>
                <td className={`n${s.backlogs ? ' xd-flag' : ''}`}>{s.backlogs || '—'}</td>
                <td className={`n${s.cgpa != null && s.cgpa < d.settings.cgpa_watch ? ' xd-flag' : ''}`}>{s.cgpa?.toFixed(2) ?? '—'}</td>
                <td className={`n${s.attendance_pct != null && s.attendance_pct < at ? ' xd-flag' : ''}`}>{s.attendance_pct != null ? `${s.attendance_pct}%` : '—'}</td>
                <td className="n">{s.activities}</td></tr>))}</tbody></table></div>
        ) : <p className="xd-none"><CheckCircle2 size={14} />No student has a backlog or an attendance shortfall.</p>}
      </Block>
    </div>
  );
}

function SecondYear({ c }: { c: Career }) {
  const y = c.second_year, s = y.summary;
  if (!s.students) return <p className="xd-none">No second-year students in this building.</p>;
  return (
    <div className="xd-grid">
      <Block title="Where second years stand" sub="From each student's record read against the career they chose">
        <div className="xd-ringrow"><Ring value={s.on_track} of={s.students} label="on track" /><p><b>{s.on_track}</b> on track · {s.watch} to watch · {s.needs_guidance} need guidance<br /><span>{s.goal_stated} of {s.students} have chosen a career · average progress {s.avg_progress ?? 0}%</span></p></div>
        <SplitBar parts={[['On track', s.on_track, 'good'], ['Watch', s.watch, 'warn'], ['Needs guidance', s.needs_guidance, 'bad']]} />
      </Block>
      <Block title="Milestones most often missing"><Bars rows={y.gaps.map((g) => ({ label: g.label, n: g.n }))} /></Block>
      <Block wide title="By career path" sub="Students on each path and the share of its milestones they have reached">
        <ul className="xd-bars">{y.paths.map((p) => (
          <li key={p.path}><span>{p.name}<em className="xd-quiet">{p.students} student{p.students === 1 ? "" : "s"} · {p.on_track} on track</em></span><i><i style={{ width: `${p.avg_progress ?? 0}%` }} /></i><b>{p.avg_progress ?? 0}%</b></li>))}</ul>
      </Block>
    </div>
  );
}

function FinalYear({ c }: { c: Career }) {
  const y = c.final_year, s = y.summary;
  if (!s.students) return <p className="xd-none">No final-year students in this building.</p>;
  const maxBand = Math.max(1, ...y.package_bands.map((b) => b.n));
  return (
    <div className="xd-grid">
      <Block title="Outcomes" sub={`${s.students} final-year students`}>
        <div className="xd-ringrow"><Ring value={s.secured} of={s.students} label="secured" /><p><b>{s.secured}</b> secured an outcome<br /><span>{s.in_progress} in progress · {s.nothing_yet} with nothing yet</span></p></div>
        <div className="xd-money">
          <span><small>Placed</small><b>{s.placed}</b></span><span><small>Highest package</small><b>{lpa(s.highest_ctc)}</b></span>
          <span><small>Median package</small><b>{lpa(s.median_ctc)}</b></span><span><small>Offers</small><b>{s.offers}</b></span>
        </div>
      </Block>
      <Block title="Higher studies, exams, ventures">
        <div className="xd-money">
          <span><small>Higher studies admits</small><b>{s.higher_admitted} / {s.higher_applied}</b></span><span><small>Abroad</small><b>{s.abroad}</b></span>
          <span><small>Exams cleared / appeared</small><b>{s.exam_cleared} / {s.exam_appeared}</b></span><span><small>Selected in exams</small><b>{s.exam_selected}</b></span>
          <span><small>Ventures registered</small><b>{s.ventures_registered} / {s.ventures}</b></span><span><small>Funding raised</small><b>{inr(s.funding_inr)}</b></span>
        </div>
      </Block>
      <Block title="Chosen path and what happened"><ul className="xd-bars">{y.by_goal.map((g) => (
        <li key={g.goal}><span>{g.goal}<em className="xd-quiet">{g.secured} of {g.students} secured</em></span><i><i style={{ width: `${pct(g.secured, g.students)}%` }} /></i><b>{pct(g.secured, g.students)}%</b></li>))}</ul></Block>
      <Block title="Packages" sub="Best offer of each placed student">
        <ul className="xd-bars">{y.package_bands.map((b) => <li key={b.label}><span>{b.label}</span><i><i style={{ width: `${(b.n / maxBand) * 100}%` }} /></i><b>{b.n}</b></li>)}</ul>
        {y.recruiters.length > 0 && <h4 className="xd-h4">Recruiters · offers · best package</h4>}
        {y.recruiters.length > 0 && <ul className="xd-list">{y.recruiters.map((r) => <li key={r.organisation} className="xd-li-row"><span><b>{r.organisation}</b></span><em>{r.offers} · {lpa(r.top_ctc)}</em></li>)}</ul>}
      </Block>
    </div>
  );
}

/** One 100 % bar of a few status parts, each labelled. */
function SplitBar({ parts }: { parts: [string, number, Tone][] }) {
  const tot = parts.reduce((a, p) => a + p[1], 0) || 1;
  return (
    <div className="xd-split">
      <span className="xd-split-bar">{parts.map(([l, n, t]) => n > 0 && <i key={l} className={`xd-s-${t}`} style={{ flexGrow: n }} title={`${l}: ${n}`} />)}</span>
      <span className="xd-legend">{parts.map(([l, n, t]) => <span key={l}><i className={`xd-s-${t}`} />{l} {n} ({pct(n, tot)}%)</span>)}</span>
    </div>
  );
}

function Activities({ d }: { d: Detail }) {
  const a = d.activities, b = d.building;
  return (
    <div className="xd-grid">
      <Block title="Taking part" sub="Students with at least one club, sport or other activity in the last year">
        <div className="xd-ringrow"><Ring value={b.active_students} of={b.residents} label="take part" /><p><b>{b.active_students}</b> of {b.residents} students<br /><span>{b.residents - b.active_students} not in any activity</span></p></div>
      </Block>
      <Block title="By kind of activity" sub="Students in each"><Bars rows={a.types.map((x) => ({ label: x.type, n: x.students }))} /></Block>
      <Block title="Achievements" sub="By level"><Bars rows={a.achievements.map((x) => ({ label: x.level, n: x.n }))} /></Block>
      <Block title="Latest activities">
        <ul className="xd-list">{a.recent.map((x, i) => <li key={i}><b>{x.title}</b><small>{x.name} · {words(x.type)}{x.role ? ` · ${x.role}` : ''} · from {fmtDay(x.from_date)}</small></li>)}
          {!a.recent.length && <li className="xd-none">No activities recorded.</li>}</ul>
      </Block>
    </div>
  );
}

function Roll({ d }: { d: Detail }) {
  const max = Math.max(1, ...d.roll.map((r) => r.present + r.on_pass + r.sick + r.absent));
  return (
    <div className="xd-grid">
      <Block wide title="Night roll call, last 14 days" sub="Present, out on an approved pass, on sick leave, and absent without leave">
        {d.roll.length ? (
          <>
            <div className="xd-cols" role="img" aria-label="Night roll call by day">{d.roll.map((r) => {
              const tot = r.present + r.on_pass + r.sick + r.absent;
              return (
                <div key={r.date} className="xd-col" title={`${fmtDay(r.date)}: ${r.present} present, ${r.on_pass} on pass, ${r.sick} sick, ${r.absent} absent`}>
                  <span className="xd-col-v">{pct(tot - r.absent, tot)}%</span>
                  <span className="xd-col-stack" style={{ height: `${(tot / max) * 120}px` }}>
                    {r.absent > 0 && <i className="xd-c-abs" style={{ flexGrow: r.absent }} />}{r.sick > 0 && <i className="xd-c-sick" style={{ flexGrow: r.sick }} />}
                    {r.on_pass > 0 && <i className="xd-c-pass" style={{ flexGrow: r.on_pass }} />}<i className="xd-c-pres" style={{ flexGrow: r.present }} /></span>
                  <small>{fmtDay(r.date)}</small></div>);
            })}</div>
            <p className="xd-legend"><span><i className="xd-c-pres" />Present</span><span><i className="xd-c-pass" />On pass</span><span><i className="xd-c-sick" />Sick leave</span><span><i className="xd-c-abs" />Absent</span></p>
          </>) : <p className="xd-none">No roll call recorded.</p>}
      </Block>
    </div>
  );
}

function Mess({ d }: { d: Detail }) {
  const m = d.mess;
  const order = ['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner'];
  const top = m.dishes.slice(0, 5), low = [...m.dishes].reverse().slice(0, 5);
  const span = Math.max(20, ...m.meals.map((x) => Math.abs(x.mood)));   // bars scale to the largest mood shown
  return (
    <div className="xd-grid">
      <Block title="Mood by meal" sub="Students of this building, last 30 days; mood runs from −100 to +100">
        <ul className="xd-div">{order.map((k) => {
          const x = m.meals.find((y) => y.meal === k);
          const v = x?.mood ?? 0;
          return (
            <li key={k}><span>{mealLabel(k)}</span>
              <span className="xd-div-track"><i className={v >= 0 ? 'xd-div-pos' : 'xd-div-neg'} style={{ width: `${(Math.abs(v) / span) * 50}%`, [v >= 0 ? 'left' : 'right']: '50%' }} /></span>
              <b>{x ? moodText(v) : '—'}</b></li>);
        })}</ul>
        <p className="xd-legend"><span><i className="xd-div-neg" />Unhappy</span><span><i className="xd-div-pos" />Happy</span></p>
      </Block>
      <Block title="Next week's choices" sub={m.choice ? `Week from ${fmtDay(m.choice.week_start)}` : undefined}>
        {m.choice ? <div className="xd-ringrow"><Ring value={m.choice.choosers} of={m.choice.residents} label="chosen" /><p><b>{m.choice.choosers}</b> of {m.choice.residents} students have chosen<br /><span>The rest get the dishes of their food choice</span></p></div>
          : <p className="xd-none">No week is open for choice.</p>}
      </Block>
      <Block title="Best liked" sub="At least 4 ratings"><DishList rows={top} /></Block>
      <Block title="Least liked"><DishList rows={low} /></Block>
    </div>
  );
}
function DishList({ rows }: { rows: Detail['mess']['dishes'] }) {
  return <ul className="xd-list">{rows.map((x) => <li key={`${x.meal}${x.dish}`} className="xd-li-row"><span><b>{x.dish}</b><small>{mealLabel(x.meal)} · {x.ratings} ratings</small></span><em>{x.stars}★ · {moodText(x.mood)}</em></li>)}
    {!rows.length && <li className="xd-none">Not enough ratings.</li>}</ul>;
}

function Fees({ d }: { d: Detail }) {
  const b = d.building, f = d.fees;
  const max = Math.max(1, ...f.heads.map((h) => h.due));
  return (
    <div className="xd-grid">
      <Block title="Collection" sub="All fee demands of this building">
        <div className="xd-money">
          <span><small>Demanded</small><b>{inr(b.demanded)}</b></span><span><small>Collected</small><b>{inr(b.collected)}</b></span>
          <span><small>Outstanding</small><b>{inr(b.demanded - b.collected)}</b></span><span className={b.overdue ? 'xd-t-bad' : ''}><small>Overdue</small><b>{inr(b.overdue)}</b></span>
        </div>
        <Ring value={b.collected} of={b.demanded} label="collected" />
      </Block>
      <Block title="By fee head" sub="Paid and still due">
        <ul className="xd-bars xd-bars-2">{f.heads.map((h) => (
          <li key={h.head}><span>{words(h.head)}</span><i style={{ width: `${(h.due / max) * 100}%` }}><i style={{ width: `${pct(h.paid, h.due)}%` }} /></i><b>{h.outstanding ? `${inr(h.outstanding)} due` : 'Paid'}</b></li>))}</ul>
        <p className="xd-legend"><span><i className="xd-paid" />Paid</span><span><i className="xd-due" />Due</span></p>
      </Block>
      <Block wide title="Students with dues">
        {f.defaulters.length ? (
          <div className="xd-table-wrap"><table className="xd-table"><thead><tr><th>Student</th><th className="n">Outstanding</th><th>Oldest due date</th><th>Status</th></tr></thead>
            <tbody>{f.defaulters.map((x) => <tr key={x.student_id}><td><StudentName id={x.student_id} name={x.name} /></td><td className="n">{inr(x.outstanding)}</td><td>{fmtDay(x.oldest_due)}</td>
              <td>{x.overdue ? <span className="xd-pill xd-t-bad"><AlertTriangle size={12} />Overdue</span> : <span className="xd-pill xd-t-warn">Not yet due</span>}</td></tr>)}</tbody></table></div>
        ) : <p className="xd-none"><CheckCircle2 size={14} />Every student has paid.</p>}
      </Block>
    </div>
  );
}

function Power({ b }: { b: Building }) {
  const e = b.electricity;
  if (!e) return <p className="xd-none">No electricity billed in this building yet.</p>;
  return (
    <div className="xd-grid">
      <Block title="Electricity paid by students" sub="Cumulative: monthly room bills shared by roommates, and prepaid recharges">
        <div className="xd-ringrow"><Ring value={e.collected} of={e.billed} label="collected" /><p><b>{inr(e.collected)}</b> of {inr(e.billed)} billed<br /><span>{inr(e.recharges)} of it by prepaid recharge · {Math.round(e.units).toLocaleString('en-IN')} units billed in all</span></p></div>
      </Block>
      <Block title="Still to be paid">
        <div className="xd-money">
          <span><small>Outstanding</small><b>{inr(e.outstanding)}</b></span><span className={e.overdue ? 'xd-t-bad' : ''}><small>Overdue</small><b>{inr(e.overdue)}</b></span>
          <span><small>Students with dues</small><b>{e.students_due}</b></span><span><small>Collected</small><b>{pct(e.collected, e.billed)}%</b></span>
        </div>
      </Block>
    </div>
  );
}

function Repairs({ b }: { b: Building }) {
  const t = b.tickets;
  if (!t) return <p className="xd-none">No repair tickets in this building.</p>;
  return (
    <div className="xd-grid">
      <Block title="Open now" sub="Raised by students and floor rounds, not yet closed">
        <Bars rows={[{ label: 'Rooms', n: t.open_room }, { label: 'Mess', n: t.open_mess }, { label: 'Common facilities', n: t.open_common }]} />
        <SplitBar parts={[['On time', Math.max(0, t.open - t.late - t.awaiting_student), 'good'], ['Awaiting student', t.awaiting_student, 'warn'], ['Late', t.late, 'bad']]} />
      </Block>
      <Block title="Last 30 days">
        <div className="xd-money">
          <span><small>Raised</small><b>{t.raised_30d}</b></span><span><small>Closed</small><b>{t.closed_30d}</b></span>
          <span><small>Average time to repair</small><b>{t.avg_hours != null ? `${t.avg_hours} h` : '—'}</b></span><span className={t.late ? 'xd-t-bad' : ''}><small>Late now</small><b>{t.late}</b></span>
        </div>
      </Block>
    </div>
  );
}

function Wardens({ d }: { d: Detail }) {
  return (
    <div className="xd-grid">
      <Block wide title="Managers' attendance, last 30 days" sub="Each square is a day: present, half day, leave, absent">
        {d.wardens.length ? (
          <div className="xd-table-wrap"><table className="xd-table xd-wt">
            <thead><tr><th>Warden</th><th className="n">Present</th><th className="n">Absent</th><th className="n">Leave</th><th>Days</th><th className="n">Attendance</th></tr></thead>
            <tbody>{d.wardens.map((w) => {
              const t = tone(w.pct, 90, 80);
              return (
                <tr key={w.staff_id}><td><b>{w.name}</b><small>{w.role ?? 'Warden'}{w.last_absent ? ` · last absent ${fmtDay(w.last_absent)}` : ''}</small></td>
                  <td className="n">{w.present}</td><td className="n">{w.absent}</td><td className="n">{w.leave}</td>
                  <td><span className="xd-days" aria-label={`${w.present} present, ${w.absent} absent, ${w.leave} leave`}>{[...w.days].map((c, i) => <i key={i} className={`xd-d-${c}`} title={{ P: 'Present', A: 'Absent', L: 'Leave', H: 'Half day', W: 'Week off' }[c]} />)}</span></td>
                  <td className="n"><span className={`xd-pill xd-t-${t}`}><ToneIcon t={t} />{w.pct != null ? `${w.pct}%` : '—'}</span></td></tr>);
            })}</tbody></table></div>
        ) : <p className="xd-none">No attendance recorded for this building's wardens.</p>}
        <p className="xd-legend"><span><i className="xd-d-P" />Present</span><span><i className="xd-d-H" />Half day</span><span><i className="xd-d-L" />Leave</span><span><i className="xd-d-A" />Absent</span></p>
      </Block>
    </div>
  );
}

function Discipline({ d }: { d: Detail }) {
  const x = d.discipline;
  return (
    <div className="xd-grid">
      <Block title="Cases by status"><Bars rows={x.status.map((s) => ({ label: s.status, n: s.n }))} /></Block>
      <Block title="Cases by kind"><Bars rows={x.types.map((s) => ({ label: s.type, n: s.n }))} /></Block>
      <Block wide title="Latest cases">
        {x.cases.length ? (
          <div className="xd-table-wrap"><table className="xd-table"><thead><tr><th>Case</th><th>Date</th><th>Kind</th><th>Student</th><th>Status</th></tr></thead>
            <tbody>{x.cases.map((c) => <tr key={c.case_no}><td><b>{c.case_no}</b><small className="xd-clip">{c.description}</small></td><td>{fmtDay(c.date)}</td><td>{words(c.incident_type)}</td><td>{c.student}</td>
              <td><span className={`xd-pill xd-t-${['Action_Taken', 'Closed_No_Action', 'Closed'].includes(c.status) ? 'good' : 'warn'}`}>{words(c.status)}</span></td></tr>)}</tbody></table></div>
        ) : <p className="xd-none"><CheckCircle2 size={14} />No discipline cases.</p>}
      </Block>
    </div>
  );
}

