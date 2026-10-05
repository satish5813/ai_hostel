import { useNavigate } from 'react-router';
import { AlertTriangle, BedDouble, CalendarCheck2, DoorOpen, FileText, GraduationCap, ShieldAlert, Stethoscope, type LucideIcon } from 'lucide-react';
import { AreaChart, BarChart, DonutChart, formatDate } from '@/lib/klh';
import { greeting, today, useApi, useProfile } from '@/lib/ui';
import { Chip, RaHead, proper } from '@/pages/office/ra-kit';

type Overview = {
  kpis: { residents: number; absent_last_night: number; last_roll_call: string | null; absence_rate_7d: string | null; open_cases: number; with_dean: number; out_now: number; late_returns_30d: number; sick_now: number; reports_unread: number };
  trend: { week_start: string; marked: number; absences: number; outings: number; late: number; cases: number }[];
  hostels: { facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string; residents: number; absence_rate_30d: string | null; open_cases: number; late_returns_30d: number; last_report: string | null }[];
  cases_by_type: { incident_type: string; n: number }[];
  careers: { programme: string; summary: { students: number; on_track: number; watch: number; needs_guidance: number; goal_stated: number } } | null;
};
export const words = (s: string) => s.replace(/_/g, ' ');
const rate = (m: number, a: number) => (m ? Math.round((1000 * a) / m) / 10 : 0);

/**
 * DSA-01 Student affairs: every hostel in one view for the Dean, Students Affairs. Absence at roll call, discipline,
 * outings and sick leave this week, the weekly floor reports, and how the computer science hostellers are doing on
 * their career path. Each figure opens the report behind it.
 */
export default function DeanHome() {
  const navigate = useNavigate();
  const p = useProfile();
  const o = useApi<Overview>('/dean/overview?weeks=8');
  const k = o.data?.kpis;
  const name = p.data?.full_name ? proper(p.data.full_name.split(' ')[0]) : '';
  const tiles: { label: string; n: string; sub: string; icon: LucideIcon; route: string; hot: boolean }[] = k ? [
    { label: 'Cases for your decision', n: String(k.with_dean), sub: `${k.open_cases} discipline cases open`, icon: ShieldAlert, route: '/discipline', hot: k.with_dean > 0 },
    { label: 'Absent last night', n: String(k.absent_last_night), sub: k.last_roll_call ? `Roll call of ${formatDate(k.last_roll_call)} · ${k.absence_rate_7d ?? 0}% this week` : 'No roll call yet', icon: BedDouble, route: '/absence-report', hot: k.absent_last_night > 0 },
    { label: 'Weekly reports to read', n: String(k.reports_unread), sub: 'Sent by the Chief Wardens', icon: FileText, route: '/weekly-reports', hot: k.reports_unread > 0 },
    { label: 'Late returns', n: String(k.late_returns_30d), sub: `Last 30 days · ${k.out_now} out now`, icon: DoorOpen, route: '/absence-report', hot: k.late_returns_30d > 0 },
    { label: 'On sick leave', n: String(k.sick_now), sub: 'Applied or approved now', icon: Stethoscope, route: '/absence-report', hot: false },
    { label: 'Need career guidance', n: String(o.data?.careers?.summary.needs_guidance ?? 0), sub: o.data?.careers ? `${o.data.careers.summary.watch} to watch · ${o.data.careers.summary.students} CSE hostellers` : '', icon: GraduationCap, route: '/career-guidance', hot: (o.data?.careers?.summary.needs_guidance ?? 0) > 0 },
  ] : [];
  const trend = o.data?.trend ?? [];
  const labels = trend.map((t) => formatDate(t.week_start).replace(/\s\d{4}$/, ''));
  const c = o.data?.careers?.summary;

  return (
    <div className="ra-main ov dn">
      <RaHead eyebrow={today()} tone="#C2410C" title={`${greeting()}${name ? `, ${name}` : ''}`}
        sub={k ? `${k.residents.toLocaleString('en-IN')} students live in ${o.data!.hostels.length} hostels · ${k.with_dean ? `${k.with_dean} case${k.with_dean === 1 ? '' : 's'} wait for you` : 'nothing waits for your decision'}` : 'Loading the hostels…'} />

      <div className="ov-tiles">
        {tiles.map((t) => { const I = t.icon; return (
          <button key={t.label} type="button" className={`ov-tile${t.hot ? ' dn-tile-hot' : ''}`} onClick={() => navigate(t.route)}>
            <span className="ov-ico"><I size={18} /></span><span className="ov-tx"><span>{t.label}</span><b>{t.n}</b><small>{t.sub}</small></span>
          </button>); })}
      </div>

      <div className="ov-two">
        <section className="ov-card" aria-label="Absence at roll call">
          <header><h2>Absence at roll call</h2><small>Share of nights marked absent, week by week</small></header>
          {trend.length ? <BarChart label="Absence rate by week" unit="%" showValues height={170}
            data={trend.map((t, i) => ({ label: labels[i], value: rate(t.marked, t.absences), highlight: i === trend.length - 1 }))} /> : <p className="ov-none">No roll call yet.</p>}
          <p className="dn-foot">{trend.reduce((a, t) => a + t.absences, 0)} absences in {trend.reduce((a, t) => a + t.marked, 0)} nights marked over {trend.length} weeks.</p>
        </section>
        <section className="ov-card" aria-label="Outings and discipline">
          <header><h2>Outings, late returns and cases</h2><small>Week by week</small></header>
          {trend.length ? <AreaChart label="Outings, late returns and discipline cases by week" labels={labels} height={170} legend
            series={[{ name: 'Outings', data: trend.map((t) => t.outings), color: 'c1' }, { name: 'Late returns', data: trend.map((t) => t.late), color: 'c4' }, { name: 'Discipline cases', data: trend.map((t) => t.cases), color: 'c5' }]} /> : null}
        </section>
      </div>

      <section className="ov-card" aria-label="Hostels">
        <header><h2>Hostels</h2><small>Last 30 days</small></header>
        <div className="ov-scroll">
          <table className="ov-table">
            <thead><tr><th>Hostel</th><th>Residents</th><th>Absence at roll call</th><th>Open cases</th><th>Late returns</th><th>Last weekly report</th></tr></thead>
            <tbody>{(o.data?.hostels ?? []).map((h) => { const r = Number(h.absence_rate_30d ?? 0); return (
              <tr key={h.facility_id}>
                <th scope="row"><span className="ov-h"><b>{h.hostel_code}</b><small>{h.facility_name}</small></span></th>
                <td data-label="Residents">{h.residents}</td>
                <td data-label="Absence at roll call"><span className="dn-rate"><span className="av-bar"><i style={{ width: `${Math.min(r * 4, 100)}%`, background: r >= 10 ? 'var(--dn-attn)' : undefined }} /></span>{h.absence_rate_30d == null ? '—' : `${h.absence_rate_30d}%`}</span></td>
                <td data-label="Open cases"><button type="button" className={`ov-n${h.open_cases ? ' ov-hot' : ' ov-zero'}`} onClick={() => navigate('/discipline')}>{h.open_cases}</button></td>
                <td data-label="Late returns"><span className={`ov-n${h.late_returns_30d ? ' ov-warn' : ' ov-zero'}`}>{h.late_returns_30d}</span></td>
                <td data-label="Last weekly report">{h.last_report ? <Chip tone={h.last_report === 'Draft' ? 'neu' : h.last_report === 'Sent' ? 'warn' : 'ok'}>{h.last_report === 'Draft' ? 'With Chief Warden' : h.last_report === 'Sent' ? 'Not read' : 'Read'}</Chip> : <span className="klh-muted">None</span>}</td>
              </tr>); })}</tbody>
          </table>
        </div>
      </section>

      <div className="ov-two">
        <section className="ov-card" aria-label="Career guidance">
          <header><h2>Computer science hostellers</h2><button type="button" className="av-link" onClick={() => navigate('/career-guidance')}>Open career guidance</button></header>
          {c && c.students ? (
            <div className="dn-donut">
              <DonutChart label="Career guidance status" size={150} thickness={20} centerValue={c.students} centerLabel="students" legend
                data={[{ label: 'On track', value: c.on_track, color: 'c3' }, { label: 'Watch', value: c.watch, color: 'c2' }, { label: 'Needs guidance', value: c.needs_guidance, color: 'c4' }]} />
              <p className="dn-foot">{c.goal_stated} of {c.students} have told us their career goal. The rest are read against what their record points to.</p>
            </div>) : <p className="ov-none">No computer science hostellers with a record yet.</p>}
        </section>
        <section className="ov-card" aria-label="Discipline by type">
          <header><h2>Discipline cases this year</h2><button type="button" className="av-link" onClick={() => navigate('/discipline')}>Open the register</button></header>
          {o.data?.cases_by_type.length ? <BarChart label="Cases by type" height={150} showValues data={o.data.cases_by_type.map((x) => ({ label: words(x.incident_type), value: x.n }))} />
            : <p className="ov-none"><AlertTriangle size={14} /> No cases recorded this year.</p>}
          <p className="dn-foot"><CalendarCheck2 size={13} /> The Chief Warden records and inquires; you decide.</p>
        </section>
      </div>
    </div>
  );
}
