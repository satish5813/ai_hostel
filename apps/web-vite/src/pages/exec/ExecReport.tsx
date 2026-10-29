import { useNavigate } from 'react-router';
import { ArrowLeft, Printer } from 'lucide-react';
import { useApi, useProfile, useSession } from '@/lib/ui';
import { Logo } from '@/ui/kit';
import type { Building, FeeHostel, Overview } from './ExecDashboard';

type Tone = 'good' | 'warn' | 'bad' | 'none';
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
const num = (v: number) => Math.round(v).toLocaleString('en-IN');
const inr = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)} L` : `₹${Math.round(n).toLocaleString('en-IN')}`);
const sum = (b: Building[], k: keyof Building) => b.reduce((a, x) => a + (Number(x[k]) || 0), 0);
const avgBy = (b: Building[], k: keyof Building, w: keyof Building) => { const t = b.filter((x) => x[k] != null); const ww = sum(t, w); return ww ? t.reduce((a, x) => a + Number(x[k]) * Number(x[w]), 0) / ww : null; };
const tone = (v: number | null | undefined, good: number, watch: number, low = false): Tone =>
  v == null ? 'none' : low ? (v <= good ? 'good' : v <= watch ? 'warn' : 'bad') : v >= good ? 'good' : v >= watch ? 'warn' : 'bad';
const LABEL: Record<Tone, string> = { good: 'Good', warn: 'Watch', bad: 'Act', none: '—' };
const fix = (v: number | null | undefined, d = 1, unit = '') => (v == null ? '—' : `${Number(v).toFixed(d)}${unit}`);
const mood = (m: number | null | undefined) => (m == null ? '—' : `${m > 0 ? '+' : ''}${m}`);
const lpa = (v: number | null | undefined) => (v == null ? '—' : `${v % 1 ? v.toFixed(1) : v} LPA`);
const role = (s: string) => (({ Chief_Warden: 'Chief Manager', Floor_Warden: 'Floor Manager' } as Record<string, string>)[s] ?? s).replace(/_/g, ' ');

/**
 * EXE-01 President's report: the executive dashboard laid out as an A4 document (tables, status marks, signatures)
 * for printing or "Save as PDF". Same numbers as /exec; nothing here is editable.
 */
export default function ExecReport() {
  const navigate = useNavigate();
  return (
    <div className="xr-page">
      <div className="xr-tools">
        <button type="button" onClick={() => navigate('/exec')}><ArrowLeft size={16} />Back to dashboard</button>
        <span>A4 report · in the print dialog choose <b>Save as PDF</b> to keep a copy</span>
        <button type="button" className="xr-primary" onClick={() => window.print()}><Printer size={16} />Print or save as PDF</button>
      </div>
      <Report />
    </div>
  );
}

function Report() {
  const r = useApi<Overview>('/exec/overview');
  const f = useApi<{ hostels: FeeHostel[] }>('/exec/fees');
  const s = useSession()!;
  const p = useProfile();
  const d = r.data;
  if (!d || !f.data) return <p className="xr-loading">Preparing the report…</p>;

  const b = d.buildings, hs = f.data.hostels;
  const now = new Date();
  const res = sum(b, 'residents'), beds = sum(b, 'beds'), occ = sum(b, 'occupied');
  const cgpa = avgBy(b, 'avg_cgpa', 'with_results'), roll = avgBy(b, 'roll_pct', 'residents'), warden = avgBy(b, 'warden_pct', 'wardens');
  const ft = (k: keyof FeeHostel) => hs.reduce((a, h) => a + Number(h[k] ?? 0), 0);
  const el = (k: keyof NonNullable<Building['electricity']>) => b.reduce((a, x) => a + (x.electricity ? Number(x.electricity[k]) : 0), 0);
  const tk = (k: keyof NonNullable<Building['tickets']>) => b.reduce((a, x) => a + (x.tickets ? Number(x.tickets[k] ?? 0) : 0), 0);
  const y2 = d.careers.second_year.summary, y4 = d.careers.final_year.summary;
  const backlogPct = pct(sum(b, 'backlog_students'), res), shortPct = pct(sum(b, 'short_students'), res), activePct = pct(sum(b, 'active_students'), res);

  const kpis: [string, string, string, Tone][] = [
    ['Residency students', num(res), `${pct(occ, beds)}% of ${num(beds)} beds occupied`, 'none'],
    ['Average CGPA', fix(cgpa, 2), `${num(sum(b, 'with_results'))} students with results`, tone(cgpa, 7, d.settings.cgpa_watch)],
    ['Students with backlogs', num(sum(b, 'backlog_students')), `${backlogPct}% of students · ${num(sum(b, 'backlogs'))} backlogs`, tone(backlogPct, 10, 20, true)],
    [`Attendance below ${d.settings.att_min}%`, num(sum(b, 'short_students')), `${shortPct}% of students`, tone(shortPct, 5, 15, true)],
    ['In clubs, sports, activities', `${activePct}%`, `${num(sum(b, 'active_students'))} students · ${num(sum(b, 'achievements'))} achievements`, tone(activePct, 60, 40)],
    ['Night roll call', fix(roll, 1, '%'), 'Present or accounted for, last 30 days', tone(roll, 95, 90)],
    ['Rasoi mood', mood(d.mess.mood), `Boys ${mood(d.mess.boys)} · Girls ${mood(d.mess.girls)} · ${num(d.mess.ratings)} ratings, 30 days`, tone(d.mess.mood, 20, 0)],
    ['Residency fee collected', `${pct(ft('collected'), ft('demanded'))}%`, `${inr(ft('collected'))} of ${inr(ft('demanded'))} demanded`, tone(pct(ft('collected'), ft('demanded')), 50, 40)],
    ['Fees overdue', inr(ft('overdue')), `${num(ft('overdue_students'))} students past the due date · ${num(ft('unpaid'))} not paid at all`, tone(ft('overdue_students'), 0, 50, true)],
    ["Managers' attendance", fix(warden, 1, '%'), 'Present, last 30 days', tone(warden, 90, 80)],
    ['Open discipline cases', num(sum(b, 'open_cases')), `${num(sum(b, 'cases_year'))} this year`, tone(sum(b, 'open_cases'), 0, 3, true)],
    ['Repair tickets open', num(tk('open')), `${num(tk('late'))} late · ${num(tk('raised_30d'))} raised, ${num(tk('closed_30d'))} closed in 30 days`, tone(tk('late'), 0, 3, true)],
    ['Electricity collected', `${pct(el('collected'), el('billed'))}%`, `${inr(el('collected'))} of ${inr(el('billed'))} billed · ${inr(el('overdue'))} overdue`, tone(pct(el('collected'), el('billed')), 85, 70)],
  ];
  if (y4.students > 0) kpis.push(['Final years with an outcome', `${pct(y4.secured, y4.students)}%`, `${num(y4.secured)} of ${num(y4.students)} · ${num(y4.placed)} placed · highest ${lpa(y4.highest_ctc)}`, tone(pct(y4.secured, y4.students), 75, 50)]);

  if (!res) for (const k of kpis) k[3] = 'none'; // no residents yet: nothing to judge

  // residency-level items that need the President's attention
  const attention: string[] = [];
  for (const x of b) {
    const n = x.facility_name;
    if (x.avg_cgpa != null && x.avg_cgpa < d.settings.cgpa_watch) attention.push(`${n}: average CGPA ${x.avg_cgpa.toFixed(2)} is under ${d.settings.cgpa_watch}.`);
    if (x.residents && pct(x.short_students, x.residents) > 15) attention.push(`${n}: ${pct(x.short_students, x.residents)}% of students (${x.short_students}) have attendance below ${d.settings.att_min}%.`);
    if (x.residents && pct(x.backlog_students, x.residents) > 20) attention.push(`${n}: ${pct(x.backlog_students, x.residents)}% of students (${x.backlog_students}) have backlogs.`);
    if (x.roll_pct != null && x.roll_pct < 90) attention.push(`${n}: night roll call at ${x.roll_pct.toFixed(1)}%.`);
    if (x.warden_pct != null && x.warden_pct < 80) attention.push(`${n}: managers' attendance at ${x.warden_pct.toFixed(1)}%.`);
    if (x.open_cases > 3) attention.push(`${n}: ${x.open_cases} open discipline cases.`);
    if (x.tickets && x.tickets.late > 3) attention.push(`${n}: ${x.tickets.late} repair tickets are late.`);
  }
  for (const h of hs) if (h.overdue_students > 50) attention.push(`${h.facility_name}: ${num(h.overdue_students)} students have overdue fees (${inr(h.overdue)}).`);

  const stamp = now.toLocaleString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const ref = `KLR/EXE/${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <article className="xr">
      <header className="xr-head">
        <Logo cut="full" height={54} />
        <div className="xr-title">
          <p className="xr-eyebrow">KL Residencies · Executive report</p>
          <h1>Residencies at a glance</h1>
          <p>Academic year {d.year?.academic_year} · {b.length} residencies · {num(res)} students</p>
        </div>
        <dl className="xr-meta">
          <div><dt>Report no.</dt><dd>{ref}</dd></div>
          <div><dt>As on</dt><dd>{stamp}</dd></div>
          <div><dt>Prepared for</dt><dd>{p.data?.full_name ?? s.id} · {role(s.role)}</dd></div>
          <div><dt>Classification</dt><dd>Confidential</dd></div>
        </dl>
      </header>

      <section className="xr-sec">
        <h2><span>1</span>Key indicators</h2>
        <table className="xr-table">
          <thead><tr><th>Indicator</th><th className="n">Value</th><th>Detail</th><th className="c">Status</th></tr></thead>
          <tbody>{kpis.map(([l, v, sub, t]) => (
            <tr key={l}><td><b>{l}</b></td><td className="n xr-big">{v}</td><td>{sub}</td><td className="c"><Mark t={t} /></td></tr>))}</tbody>
        </table>
      </section>

      <section className="xr-sec">
        <h2><span>2</span>Points needing attention</h2>
        {attention.length
          ? <ol className="xr-list">{attention.map((a) => <li key={a}>{a}</li>)}</ol>
          : <p className="xr-ok">No residency is beyond the set thresholds today.</p>}
      </section>

      <section className="xr-sec xr-break">
        <h2><span>3</span>Residency-wise summary</h2>
        <table className="xr-table xr-dense">
          <thead><tr><th>Residency</th><th className="n">Beds</th><th className="n">Occupied</th><th className="n">Students</th><th className="n">Avg CGPA</th><th className="n">Backlogs</th>
            <th className="n">Attn. short</th><th className="n">Roll call</th><th className="n">Mood</th><th className="n">Managers</th><th className="n">Open cases</th></tr></thead>
          <tbody>
            {b.map((x) => (
              <tr key={x.facility_id}><td><b>{x.facility_name}</b><small>{x.hostel_code} · {x.gender}</small></td>
                <td className="n">{num(x.beds)}</td><td className="n">{pct(x.occupied, x.beds)}%</td><td className="n">{num(x.residents)}</td>
                <td className={`n ${tc(tone(x.avg_cgpa, 7, d.settings.cgpa_watch))}`}>{fix(x.avg_cgpa, 2)}</td>
                <td className="n">{num(x.backlog_students)}</td>
                <td className={`n ${tc(tone(pct(x.short_students, x.residents), 5, 15, true))}`}>{num(x.short_students)}</td>
                <td className={`n ${tc(tone(x.roll_pct, 95, 90))}`}>{fix(x.roll_pct, 1, '%')}</td>
                <td className="n">{mood(x.mood)}</td>
                <td className={`n ${tc(tone(x.warden_pct, 90, 80))}`}>{fix(x.warden_pct, 0, '%')}</td>
                <td className={`n ${tc(tone(x.open_cases, 0, 3, true))}`}>{num(x.open_cases)}</td></tr>))}
            <tr className="xr-total"><td>All residencies</td><td className="n">{num(beds)}</td><td className="n">{pct(occ, beds)}%</td><td className="n">{num(res)}</td><td className="n">{fix(cgpa, 2)}</td>
              <td className="n">{num(sum(b, 'backlog_students'))}</td><td className="n">{num(sum(b, 'short_students'))}</td><td className="n">{fix(roll, 1, '%')}</td><td className="n">{mood(d.mess.mood)}</td>
              <td className="n">{fix(warden, 0, '%')}</td><td className="n">{num(sum(b, 'open_cases'))}</td></tr>
          </tbody>
        </table>
        <p className="xr-note">Attendance short = cumulative class attendance below {d.settings.att_min}%. Roll call and managers' attendance cover the last 30 days. Mood is the Rasoi sentiment score (−100 to +100).</p>
      </section>

      <section className="xr-sec">
        <h2><span>4</span>Residency fees and dues</h2>
        <table className="xr-table xr-dense">
          <thead><tr><th>Residency</th><th className="n">Students</th><th className="n">Fully paid</th><th className="n">1st inst. only</th><th className="n">Not paid</th>
            <th className="n">Demanded</th><th className="n">Collected</th><th className="n">Outstanding</th><th className="n">Overdue</th></tr></thead>
          <tbody>
            {hs.map((h) => (
              <tr key={h.facility_id}><td><b>{h.facility_name}</b><small>{h.hostel_code} · {h.gender}</small></td>
                <td className="n">{num(h.students)}</td><td className="n">{num(h.paid)}</td><td className="n">{num(h.part_paid)}</td>
                <td className={`n ${h.unpaid ? 'xr-t-bad' : ''}`}>{num(h.unpaid)}</td>
                <td className="n">{inr(h.demanded)}</td><td className="n">{inr(h.collected)}</td><td className="n">{inr(h.outstanding)}</td>
                <td className={`n ${h.overdue ? 'xr-t-bad' : ''}`}>{h.overdue ? inr(h.overdue) : '—'}</td></tr>))}
            <tr className="xr-total"><td>All residencies</td><td className="n">{num(ft('students'))}</td><td className="n">{num(ft('paid'))}</td><td className="n">{num(ft('part_paid'))}</td>
              <td className="n">{num(ft('unpaid'))}</td><td className="n">{inr(ft('demanded'))}</td><td className="n">{inr(ft('collected'))}</td><td className="n">{inr(ft('outstanding'))}</td><td className="n">{inr(ft('overdue'))}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="xr-sec">
        <h2><span>5</span>Electricity and repairs</h2>
        <table className="xr-table xr-dense">
          <thead><tr><th>Residency</th><th className="n">Units</th><th className="n">Billed</th><th className="n">Paid</th><th className="n">Outstanding</th><th className="n">Overdue</th>
            <th className="n">Tickets open</th><th className="n">Late</th><th className="n">Avg hours to close</th></tr></thead>
          <tbody>
            {b.map((x) => (
              <tr key={x.facility_id}><td><b>{x.facility_name}</b></td>
                <td className="n">{x.electricity ? num(x.electricity.units) : '—'}</td><td className="n">{x.electricity ? inr(x.electricity.billed) : '—'}</td>
                <td className="n">{x.electricity ? inr(x.electricity.collected) : '—'}</td><td className="n">{x.electricity ? inr(x.electricity.outstanding) : '—'}</td>
                <td className={`n ${x.electricity?.overdue ? 'xr-t-bad' : ''}`}>{x.electricity?.overdue ? inr(x.electricity.overdue) : '—'}</td>
                <td className="n">{x.tickets ? num(x.tickets.open) : '—'}</td>
                <td className={`n ${x.tickets?.late ? 'xr-t-bad' : ''}`}>{x.tickets ? num(x.tickets.late) : '—'}</td>
                <td className="n">{fix(x.tickets?.avg_hours, 0)}</td></tr>))}
            <tr className="xr-total"><td>All residencies</td><td className="n">{num(el('units'))}</td><td className="n">{inr(el('billed'))}</td><td className="n">{inr(el('collected'))}</td>
              <td className="n">{inr(el('outstanding'))}</td><td className="n">{inr(el('overdue'))}</td><td className="n">{num(tk('open'))}</td><td className="n">{num(tk('late'))}</td><td className="n">—</td></tr>
          </tbody>
        </table>
        {d.electricity_months.length > 0 && <>
          <h3>Electricity by month</h3>
          <table className="xr-table xr-dense">
            <thead><tr><th>Month</th>{d.electricity_months.map((m) => <th key={m.month} className="n">{new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}</th>)}</tr></thead>
            <tbody>
              <tr><td>Units</td>{d.electricity_months.map((m) => <td key={m.month} className="n">{num(m.units)}</td>)}</tr>
              <tr><td>Billed</td>{d.electricity_months.map((m) => <td key={m.month} className="n">{inr(m.billed)}</td>)}</tr>
              <tr><td>Paid</td>{d.electricity_months.map((m) => <td key={m.month} className="n">{inr(m.collected)}</td>)}</tr>
            </tbody>
          </table>
        </>}
      </section>

      {(y2.students > 0 || y4.students > 0) && (
        <section className="xr-sec xr-break">
          <h2><span>6</span>Careers</h2>
          <div className="xr-cols">
            <table className="xr-table">
              <thead><tr><th colSpan={2}>Second years</th></tr></thead>
              <tbody>
                <tr><td>Students</td><td className="n">{num(y2.students)}</td></tr>
                <tr><td>Have chosen a career</td><td className="n">{num(y2.goal_stated)} ({pct(y2.goal_stated, y2.students)}%)</td></tr>
                <tr><td>On track</td><td className="n">{num(y2.on_track)} ({pct(y2.on_track, y2.students)}%)</td></tr>
                <tr><td>Watch</td><td className="n">{num(y2.watch)}</td></tr>
                <tr><td>Need guidance</td><td className="n">{num(y2.needs_guidance)}</td></tr>
                <tr><td>Average progress on chosen career</td><td className="n">{y2.avg_progress ?? 0}%</td></tr>
              </tbody>
            </table>
            <table className="xr-table">
              <thead><tr><th colSpan={2}>Final years</th></tr></thead>
              <tbody>
                <tr><td>Students</td><td className="n">{num(y4.students)}</td></tr>
                <tr><td>With an outcome</td><td className="n">{num(y4.secured)} ({pct(y4.secured, y4.students)}%)</td></tr>
                <tr><td>Placed · offers</td><td className="n">{num(y4.placed)} · {num(y4.offers)}</td></tr>
                <tr><td>Highest · median · average package</td><td className="n">{lpa(y4.highest_ctc)} · {lpa(y4.median_ctc)} · {lpa(y4.avg_ctc)}</td></tr>
                <tr><td>Higher studies admitted (abroad)</td><td className="n">{num(y4.higher_admitted)} ({num(y4.abroad)})</td></tr>
                <tr><td>Competitive exams cleared · selected</td><td className="n">{num(y4.exam_cleared)} · {num(y4.exam_selected)}</td></tr>
                <tr><td>Ventures registered · funding</td><td className="n">{num(y4.ventures_registered)} · {inr(y4.funding_inr)}</td></tr>
              </tbody>
            </table>
          </div>
          {d.careers.final_year.recruiters.length > 0 && <>
            <h3>Top recruiters</h3>
            <table className="xr-table xr-dense">
              <thead><tr><th>Organisation</th><th className="n">Offers</th><th className="n">Top package</th></tr></thead>
              <tbody>{d.careers.final_year.recruiters.slice(0, 10).map((x) => (
                <tr key={x.organisation}><td>{x.organisation}</td><td className="n">{num(x.offers)}</td><td className="n">{lpa(x.top_ctc)}</td></tr>))}</tbody>
            </table>
          </>}
        </section>
      )}

      <section className="xr-sec xr-sign">
        <div><span /><b>Prepared by</b><small>Hostel Office, KL Residencies</small></div>
        <div><span /><b>Reviewed by</b><small>Dean, Students Affairs</small></div>
        <div><span /><b>Approved by</b><small>President</small></div>
      </section>

      <footer className="xr-foot">
        <span><b>Status marks:</b> Good · Watch · Act, against thresholds set by the administrator (attendance below {d.settings.att_min}%, CGPA watch under {d.settings.cgpa_watch}).</span>
        <span>Generated from KL Residencies on {stamp} · {ref}</span>
      </footer>
    </article>
  );
}

const tc = (t: Tone) => (t === 'bad' ? 'xr-t-bad' : t === 'warn' ? 'xr-t-warn' : '');
const Mark = ({ t }: { t: Tone }) => <span className={`xr-mark xr-m-${t}`}>{LABEL[t]}</span>;
