import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Activity, AlertTriangle, ArrowLeft, BedDouble, BookOpen, Briefcase, Building2, Wrench, Zap, CheckCircle2, ChevronRight, Compass, GraduationCap, IndianRupee, LayoutGrid, LogOut, Moon, Rocket,
  ShieldAlert, Trophy, UserCheck, Utensils, type LucideIcon } from 'lucide-react';
import { setSession } from '@/lib/api';
import { useApi, useProfile, useSession } from '@/lib/ui';
import { Logo } from '@/ui/kit';
import { mealLabel } from '@/pages/mess/weekly';

type Building = { facility_id: string; hostel_code: string; facility_name: string; gender: string; accommodation_type: string; floors: number | null; beds: number; occupied: number; vacant: number;
  demanded: number; collected: number; overdue: number; students_overdue: number; residents: number; with_results: number; avg_cgpa: number | null; backlog_students: number; backlogs: number;
  short_students: number; low_cgpa: number; active_students: number; achievements: number; avg_attendance: number | null; roll_pct: number | null; mood: number | null; ratings: number | null;
  warden_pct: number | null; wardens: number | null; open_cases: number; cases_year: number;
  career2: (Sum2 & { paths: { path: string; name: string; n: number }[] }) | null; career4: Sum4 | null;
  electricity: { billed: number; collected: number; outstanding: number; overdue: number; students_due: number; recharges: number; units: number } | null;
  tickets: { open: number; awaiting_student: number; late: number; raised_30d: number; closed_30d: number; avg_hours: number | null; open_room: number; open_mess: number; open_common: number } | null };
type ElecMonth = { month: string; units: number; billed: number; collected: number };
type Sum2 = { students: number; goal_stated: number; on_track: number; watch: number; needs_guidance: number; avg_progress: number | null };
type Sum4 = { students: number; secured: number; in_progress: number; nothing_yet: number; placed: number; offers: number; seekers: number; seekers_placed: number; avg_ctc: number | null;
  median_ctc: number | null; highest_ctc: number | null; higher_applied: number; higher_admitted: number; abroad: number; exam_appeared: number; exam_cleared: number; exam_selected: number;
  ventures: number; ventures_registered: number; funding_inr: number };
type Career = {
  second_year: { summary: Sum2; paths: (Sum2 & { path: string; name: string })[]; gaps: { label: string; n: number }[] };
  final_year: { summary: Sum4; by_goal: { goal: string; students: number; secured: number }[]; recruiters: { organisation: string; offers: number; top_ctc: number | null }[]; package_bands: { label: string; n: number }[] };
};
type Overview = { settings: { att_min: number; cgpa_watch: number }; buildings: Building[]; mess: { mood: number | null; ratings: number; boys: number | null; girls: number | null }; year: { academic_year: string }; careers: Career; electricity_months: ElecMonth[] };
type Detail = {
  building: Building; settings: Overview['settings'];
  performance: { cgpa_bands: { band: string; n: number }[]; attendance_bands: { band: string; n: number }[];
    watch: { student_id: string; name: string; programme: string | null; year_semester: string | null; term_label: string | null; cgpa: number | null; attendance_pct: number | null; backlogs: number; activities: number }[] };
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
const words = (s: string) => s.replace(/_/g, ' ');
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
 * mess, fees and dues, wardens' attendance and discipline.
 */
export default function ExecDashboard() {
  const { facilityId } = useParams();
  return (
    <div className="xd">
      <TopBar />
      <main className="xd-main">{facilityId ? <BuildingView id={facilityId} /> : <Overview />}</main>
    </div>
  );
}

function TopBar() {
  const s = useSession()!;
  const p = useProfile();
  const navigate = useNavigate();
  return (
    <header className="xd-top">
      <button type="button" className="xd-brand" onClick={() => navigate('/exec')}><Logo cut="mark" height={30} /><span><b>KL University Hostels</b><small>Executive view</small></span></button>
      <nav className="xd-links" aria-label="More">
        <button type="button" onClick={() => navigate('/reports/mess-sentiment')}><Utensils size={15} />Mess sentiment</button>
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
  const d = r.data;
  if (!d) return <p className="xd-loading">Loading…</p>;
  const b = d.buildings;
  const res = sum(b, 'residents');
  const withRes = sum(b, 'with_results');
  const cgpa = avgBy(b, 'avg_cgpa', 'with_results');
  const roll = avgBy(b, 'roll_pct', 'residents');
  const warden = avgBy(b, 'warden_pct', 'wardens');
  const date = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <>
      <section className="xd-hero">
        <div><p className="xd-eyebrow">{date} · academic year {d.year?.academic_year}</p><h1>Hostels at a glance</h1>
          <p className="xd-lead">{b.length} buildings · {res} students in residence. Tap a building for its students, mess, fees, wardens and discipline.</p></div>
      </section>
      <section className="xd-kpis" aria-label="University">
        <Kpi icon={BedDouble} label="Residents" value={res.toLocaleString('en-IN')} sub={`${pct(sum(b, 'occupied'), sum(b, 'beds'))}% of ${sum(b, 'beds').toLocaleString('en-IN')} beds`} />
        <Kpi icon={GraduationCap} label="Average CGPA" value={cgpa?.toFixed(2) ?? '—'} sub={`${withRes} with results`} t={tone(cgpa, 7, d.settings.cgpa_watch)} />
        <Kpi icon={BookOpen} label="With backlogs" value={String(sum(b, 'backlog_students'))} sub={`${pct(sum(b, 'backlog_students'), withRes)}% · ${sum(b, 'backlogs')} backlogs`} t={tone(pct(sum(b, 'backlog_students'), withRes), 10, 20, true)} />
        <Kpi icon={UserCheck} label={`Attendance below ${d.settings.att_min}%`} value={String(sum(b, 'short_students'))} sub={`${pct(sum(b, 'short_students'), withRes)}% of students`} t={tone(pct(sum(b, 'short_students'), withRes), 5, 15, true)} />
        <Kpi icon={Trophy} label="In clubs, sports, activities" value={`${pct(sum(b, 'active_students'), res)}%`} sub={`${sum(b, 'active_students')} students · ${sum(b, 'achievements')} achievements`} t={tone(pct(sum(b, 'active_students'), res), 60, 40)} />
        <Kpi icon={Moon} label="Night roll call" value={roll != null ? `${roll.toFixed(1)}%` : '—'} sub="Present or accounted for, 30 days" t={tone(roll, 95, 90)} />
        <Kpi icon={Utensils} label="Mess mood" value={moodText(d.mess.mood)} sub={`Boys ${moodText(d.mess.boys)} · Girls ${moodText(d.mess.girls)} · 30 days`} t={tone(d.mess.mood, 20, 0)} />
        <Kpi icon={IndianRupee} label="Dues outstanding" value={inr(sum(b, 'demanded') - sum(b, 'collected'))} sub={`${inr(sum(b, 'overdue'))} overdue · ${sum(b, 'students_overdue')} students`} t={tone(sum(b, 'overdue'), 0, 100000, true)} />
        <Kpi icon={Activity} label="Wardens' attendance" value={warden != null ? `${warden.toFixed(1)}%` : '—'} sub="Present, last 30 days" t={tone(warden, 90, 80)} />
        <Kpi icon={ShieldAlert} label="Open discipline cases" value={String(sum(b, 'open_cases'))} sub={`${sum(b, 'cases_year')} this year`} t={tone(sum(b, 'open_cases'), 0, 3, true)} />
      </section>

      <h2 className="xd-h2"><Compass size={18} />Careers</h2>
      <CareerKpis c={d.careers} />

      <h2 className="xd-h2"><Zap size={18} />Electricity and repairs</h2>
      <PowerKpis b={b} months={d.electricity_months} />

      <h2 className="xd-h2"><Building2 size={18} />Buildings</h2>
      <section className="xd-cards" aria-label="Buildings">
        {b.map((x) => <BuildingCard key={x.facility_id} b={x} settings={d.settings} onOpen={() => navigate(`/exec/${x.facility_id}`)} />)}
      </section>
      <p className="xd-foot"><span className="xd-t-good"><CheckCircle2 size={12} />Good</span><span className="xd-t-warn"><AlertTriangle size={12} />Watch</span><span className="xd-t-bad"><AlertTriangle size={12} />Act</span>
        Attendance shortfall is below {d.settings.att_min}% cumulative; CGPA under {d.settings.cgpa_watch} is watched. Thresholds are set by the administrator.</p>
    </>
  );
}

const lpa = (v: number | null | undefined) => (v == null ? '—' : `${v % 1 ? v.toFixed(1) : v} LPA`);

function PowerKpis({ b, months }: { b: Building[]; months: ElecMonth[] }) {
  const e = (k: keyof NonNullable<Building['electricity']>) => b.reduce((a, x) => a + (x.electricity ? Number(x.electricity[k]) : 0), 0);
  const t = (k: keyof NonNullable<Building['tickets']>) => b.reduce((a, x) => a + (x.tickets ? Number(x.tickets[k] ?? 0) : 0), 0);
  const max = Math.max(1, ...months.map((m) => m.billed));
  return (
    <section className="xd-kpis" aria-label="Electricity and repairs">
      <Kpi icon={Zap} label="Electricity paid by students" value={inr(e('collected'))} sub={`Cumulative: room bills and recharges · ${inr(e('billed'))} billed`} t={tone(pct(e('collected'), e('billed')), 85, 70)} />
      <Kpi icon={IndianRupee} label="Electricity outstanding" value={inr(e('outstanding'))} sub={`${inr(e('overdue'))} overdue · ${e('students_due')} students`} t={tone(e('overdue'), 0, 20000, true)} />
      <div className="xd-kpi xd-kpi-wide">
        <span className="xd-kpi-top"><Activity size={16} /><span>Electricity by month</span></span>
        <ul className="xd-months" aria-label="Billed and paid by month">{months.map((m) => (
          <li key={m.month} title={`${m.month}: ${Math.round(m.units)} units, ${inr(m.billed)} billed, ${inr(m.collected)} paid`}>
            <span className="xd-mbar"><i style={{ height: `${(m.billed / max) * 100}%` }}><i style={{ height: `${pct(m.collected, m.billed)}%` }} /></i></span>
            <small>{new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</small><b>{inr(m.billed)}</b></li>))}
          {!months.length && <li className="xd-none">No bills yet</li>}</ul>
        <span className="xd-legend"><span><i className="xd-paid" />Paid</span><span><i className="xd-due" />Not yet paid</span></span>
      </div>
      <Kpi icon={Wrench} label="Repair tickets open" value={String(t('open'))} sub={`${t('late')} late · ${t('raised_30d')} raised, ${t('closed_30d')} closed in 30 days`} t={tone(t('late'), 0, 3, true)} />
    </section>
  );
}

function CareerKpis({ c }: { c: Career }) {
  const y2 = c.second_year.summary, y4 = c.final_year.summary;
  return (
    <section className="xd-kpis" aria-label="Careers">
      <Kpi icon={Compass} label="Second years on track" value={`${pct(y2.on_track, y2.students)}%`} sub={`${y2.on_track} of ${y2.students} · ${y2.needs_guidance} need guidance`} t={tone(pct(y2.on_track, y2.students), 60, 40)} />
      <Kpi icon={Activity} label="Progress on chosen career" value={`${y2.avg_progress ?? 0}%`} sub={`${pct(y2.goal_stated, y2.students)}% have chosen a career`} t={tone(y2.avg_progress, 75, 55)} />
      <Kpi icon={CheckCircle2} label="Final years with an outcome" value={`${pct(y4.secured, y4.students)}%`} sub={`${y4.secured} of ${y4.students} · ${y4.in_progress} in progress`} t={tone(pct(y4.secured, y4.students), 75, 50)} />
      <Kpi icon={Briefcase} label="Placed · highest package" value={`${y4.placed} · ${lpa(y4.highest_ctc)}`} sub={`${y4.offers} offers · median ${lpa(y4.median_ctc)} · average ${lpa(y4.avg_ctc)}`} />
      <Kpi icon={Rocket} label="Higher studies · exams · ventures" value={`${y4.higher_admitted} · ${y4.exam_cleared} · ${y4.ventures_registered}`} sub={`${y4.abroad} abroad · ${y4.exam_selected} selected · ${inr(y4.funding_inr)} raised`} />
    </section>
  );
}

const moodText = (m: number | null | undefined) => (m == null ? '—' : `${m > 0 ? '+' : ''}${m}`);

function Kpi({ icon: I, label, value, sub, t = 'none' }: { icon: LucideIcon; label: string; value: string; sub?: string; t?: Tone }) {
  return (
    <div className={`xd-kpi xd-t-${t}`}>
      <span className="xd-kpi-top"><I size={16} /><span>{label}</span></span>
      <b>{value}</b>
      {sub && <small>{sub}</small>}
      {t !== 'none' && <em className="xd-badge"><ToneIcon t={t} />{TONE_LABEL[t]}</em>}
    </div>
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
    ['With backlogs', `${b.backlog_students} · ${pct(b.backlog_students, b.with_results)}%`, tone(pct(b.backlog_students, b.with_results), 10, 20, true), pct(b.backlog_students, b.with_results)],
    [`Attendance < ${settings.att_min}%`, `${b.short_students} · ${pct(b.short_students, b.with_results)}%`, tone(pct(b.short_students, b.with_results), 5, 15, true), pct(b.short_students, b.with_results)],
    ['Night roll call', b.roll_pct != null ? `${b.roll_pct}%` : '—', tone(b.roll_pct, 95, 90), b.roll_pct],
    ["Wardens' attendance", b.warden_pct != null ? `${b.warden_pct}%` : '—', tone(b.warden_pct, 90, 80), b.warden_pct],
    ...(b.career2 ? [['2nd-year career progress', `${b.career2.avg_progress ?? 0}%`, tone(b.career2.avg_progress, 75, 55), b.career2.avg_progress] as [string, string, Tone, number | null]] : []),
    ...(b.career4 ? [['Final years secured', `${b.career4.secured}/${b.career4.students}`, tone(pct(b.career4.secured, b.career4.students), 75, 50), pct(b.career4.secured, b.career4.students)] as [string, string, Tone, number | null]] : []),
  ];
  return (
    <button type="button" className={`xd-card${empty ? ' xd-card-empty' : ''}`} onClick={onOpen} aria-label={`${b.hostel_code} ${b.facility_name}: open`}>
      <span className="xd-card-head">
        <span className={`xd-mono xd-g-${b.gender.toLowerCase()}`}>{b.hostel_code}</span>
        <span className="xd-card-title"><b>{b.facility_name}</b><small>{b.gender} · {b.accommodation_type}{b.floors ? ` · ${b.floors} floors` : ''}</small></span>
        <ChevronRight size={18} className="xd-chev" />
      </span>
      {empty ? <span className="xd-card-none">No students in residence yet · {b.beds.toLocaleString('en-IN')} beds</span> : (
        <>
          <span className="xd-card-mid">
            <Ring value={b.occupied} of={b.beds} label="beds" />
            <span className="xd-card-stats">
              <span><b>{b.residents}</b><small>students</small></span>
              <span><b>{b.avg_cgpa?.toFixed(2) ?? '—'}</b><small>avg CGPA</small></span>
              <span><b>{moodText(b.mood)}</b><small>mess mood</small></span>
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

type Tab = 'academic' | 'y2' | 'y4' | 'activities' | 'roll' | 'mess' | 'fees' | 'power' | 'repairs' | 'wardens' | 'discipline';

function BuildingView({ id }: { id: string }) {
  const r = useApi<Detail>(`/exec/buildings/${id}`);
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('academic');
  const d = r.data;
  if (!d) return <p className="xd-loading">Loading…</p>;
  const b = d.building;
  const lastRoll = d.roll[d.roll.length - 1];
  const tabs: { k: Tab; icon: LucideIcon; label: string; value: string; sub: string; t: Tone }[] = [
    { k: 'academic', icon: GraduationCap, label: 'Academic standing', value: b.avg_cgpa?.toFixed(2) ?? '—', sub: `${b.backlog_students} with backlogs · ${b.short_students} short of ${d.settings.att_min}%`,
      t: tone(pct(b.backlog_students + b.short_students, b.with_results), 10, 25, true) },
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
    { k: 'wardens', icon: Activity, label: "Wardens' attendance", value: b.warden_pct != null ? `${b.warden_pct}%` : '—', sub: `${d.wardens.length} wardens · last 30 days`, t: tone(b.warden_pct, 90, 80) },
    { k: 'discipline', icon: ShieldAlert, label: 'Discipline', value: String(b.open_cases), sub: `open · ${b.cases_year} this year`, t: tone(b.open_cases, 0, 2, true) },
  ];
  return (
    <>
      <button type="button" className="xd-back" onClick={() => navigate('/exec')}><ArrowLeft size={16} />All buildings</button>
      <section className="xd-hero xd-hero-b">
        <span className={`xd-mono xd-mono-lg xd-g-${b.gender.toLowerCase()}`}>{b.hostel_code}</span>
        <div><p className="xd-eyebrow">{b.gender} · {b.accommodation_type}{b.floors ? ` · ${b.floors} floors` : ''}</p><h1>{b.facility_name}</h1>
          <p className="xd-lead">{b.residents} students in {b.occupied} of {b.beds} beds ({pct(b.occupied, b.beds)}%) · {b.wardens ?? 0} wardens</p></div>
      </section>
      <section className="xd-subcards" role="tablist" aria-label="Sections">
        {tabs.map((x) => (
          <button key={x.k} type="button" role="tab" aria-selected={tab === x.k} className={`xd-sub xd-t-${x.t}`} onClick={() => setTab(x.k)}>
            <span className="xd-kpi-top"><x.icon size={16} /><span>{x.label}</span></span><b>{x.value}</b><small>{x.sub}</small>
            {x.t !== 'none' && <em className="xd-badge"><ToneIcon t={x.t} />{TONE_LABEL[x.t]}</em>}</button>))}
      </section>
      <section className="xd-panel" role="tabpanel">
        {tab === 'academic' && <Academic d={d} />}
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
function Bars({ rows, order, alert, alertLabel = 'watch' }: { rows: { label: string; n: number }[]; order?: string[]; alert?: (label: string) => boolean; alertLabel?: string }) {
  const list = order ? order.map((o) => rows.find((r) => r.label === o) ?? { label: o, n: 0 }) : rows;
  const max = Math.max(1, ...list.map((r) => r.n));
  if (!list.length) return <p className="xd-none">Nothing recorded.</p>;
  return (
    <ul className="xd-bars">{list.map((r) => (
      <li key={r.label} className={alert?.(r.label) ? 'xd-bar-alert' : ''}>
        <span>{words(r.label)}{alert?.(r.label) && <em><AlertTriangle size={11} />{alertLabel}</em>}</span>
        <i><i style={{ width: `${(r.n / max) * 100}%` }} /></i><b>{r.n}</b></li>))}</ul>
  );
}

function Academic({ d }: { d: Detail }) {
  const p = d.performance, at = d.settings.att_min;
  return (
    <div className="xd-grid">
      <Block title="CGPA" sub={`Latest term result of ${d.building.with_results} students`}>
        <Bars rows={p.cgpa_bands.map((x) => ({ label: x.band, n: x.n }))} order={['Below 5', '5 – 6', '6 – 7', '7 – 8', '8 – 9', '9 and above', 'No result']} alert={(l) => l === 'Below 5' || l === '5 – 6'} />
      </Block>
      <Block title="Cumulative class attendance" sub={`Below ${at}% is a shortfall`}>
        <Bars rows={p.attendance_bands.map((x) => ({ label: x.band, n: x.n }))} order={['Below 65%', `65% – ${at}%`, `${at}% – 85%`, '85% and above', 'No record']} alert={(l) => l === 'Below 65%' || l === `65% – ${at}%`} alertLabel="shortfall" />
      </Block>
      <Block wide title="Students needing attention" sub={`Backlogs, attendance below ${at}%, or CGPA under ${d.settings.cgpa_watch}`}>
        {p.watch.length ? (
          <div className="xd-table-wrap"><table className="xd-table">
            <thead><tr><th>Student</th><th>Programme</th><th className="n">Backlogs</th><th className="n">CGPA</th><th className="n">Attendance</th><th className="n">Activities</th></tr></thead>
            <tbody>{p.watch.map((s) => (
              <tr key={s.student_id}><td><b>{s.name}</b><small>{s.student_id}{s.term_label ? ` · ${s.term_label}` : ''}</small></td><td>{s.programme ?? '—'}{s.year_semester ? <small>{s.year_semester}</small> : null}</td>
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
            <tbody>{f.defaulters.map((x) => <tr key={x.student_id}><td><b>{x.name}</b><small>{x.student_id}</small></td><td className="n">{inr(x.outstanding)}</td><td>{fmtDay(x.oldest_due)}</td>
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
      <Block wide title="Wardens' attendance, last 30 days" sub="Each square is a day: present, half day, leave, absent">
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

