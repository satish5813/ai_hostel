import { useNavigate } from 'react-router';
import { AlertTriangle, BedDouble, ClipboardCheck, DoorOpen, GitPullRequestArrow, IndianRupee, Stethoscope, type LucideIcon } from 'lucide-react';
import { formatDateTime } from '@/lib/klh';
import { greeting, today, useApi, useProfile } from '@/lib/ui';
import { Chip, RaHead, proper } from '@/pages/office/ra-kit';

type H = {
  facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string; beds: number; occupied: number; held: number; open_beds: number;
  waiting: number; to_verify: number; to_approve: number; ready_checkin: number; exceptions: number; outings: number; outings_on_link: number; sick: number;
  out_now: number; overdue_returns: number; alerts: number; critical: number; fees_overdue: number; fees_overdue_amount: string; open_places: number;
};
type Exc = { exception_id: number; kind: string; hostel_code: string; student_name: string | null; staff_name: string | null; bed_label: string; requested_by_name: string; requested_at: string };
type Alert = { alert_id: number; alert_type: string; severity: string; raised_at: string; hostel_code: string; student_name: string | null; student_id: string | null };
export const KIND: Record<string, string> = {
  Blocked_Room: 'Blocked room', Reserved_Room: 'Room kept for others', Other_Room_Type: 'Another room type', Waitlist_Jump: 'Ahead of the waiting list', Transfer: 'Move to another bed', Staff_Room: 'Staff room',
};
const sum = (hs: H[], k: keyof H) => hs.reduce((a, h) => a + Number(h[k] ?? 0), 0);
const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Chief Manager overview (CW-01): every hostel of the login on one page, with what waits for the Chief Manager and what needs
 * watching. Every number opens its list for that hostel.
 */
export default function Overview() {
  const navigate = useNavigate();
  const p = useProfile();
  const o = useApi<{ hostels: H[]; exceptions: Exc[]; alerts: Alert[] }>('/cw/overview');
  const hs = o.data?.hostels ?? [];
  const go = (route: string, facility?: string) => { if (facility) { try { localStorage.setItem('klu.facility', JSON.stringify(facility)); } catch { /* private window */ } } navigate(route); };
  const beds = sum(hs, 'beds'), occ = sum(hs, 'occupied');
  const tiles: { label: string; n: number; sub: string; icon: LucideIcon; route: string; hot: boolean }[] = [
    { label: 'Allotments to approve', n: sum(hs, 'to_approve'), sub: `${sum(hs, 'to_verify')} still with Room Allotment`, icon: ClipboardCheck, route: '/allotment-approvals', hot: sum(hs, 'to_approve') > 0 },
    { label: 'Exceptions to decide', n: sum(hs, 'exceptions'), sub: 'Beds outside the rules, moves, staff rooms', icon: GitPullRequestArrow, route: '/exceptions', hot: sum(hs, 'exceptions') > 0 },
    { label: 'Outings to decide', n: sum(hs, 'outings'), sub: `${sum(hs, 'outings_on_link')} waiting on a parent or the Dean`, icon: DoorOpen, route: '/outing-approvals', hot: sum(hs, 'outings') > 0 },
    { label: 'Sick leave to decide', n: sum(hs, 'sick'), sub: 'Record the visit, then approve', icon: Stethoscope, route: '/sick-leave-approvals', hot: sum(hs, 'sick') > 0 },
    { label: 'Critical alerts', n: sum(hs, 'critical'), sub: `${sum(hs, 'alerts')} open in all`, icon: AlertTriangle, route: '/alerts', hot: sum(hs, 'critical') > 0 },
    { label: 'Overdue fees', n: sum(hs, 'fees_overdue'), sub: rupees(hs.reduce((a, h) => a + Number(h.fees_overdue_amount), 0)), icon: IndianRupee, route: '/dues', hot: sum(hs, 'fees_overdue') > 0 },
  ];
  const name = p.data?.full_name ? proper(p.data.full_name.split(' ')[0]) : '';
  const cell = (h: H, n: number, route: string, tone?: 'hot' | 'warn') => (
    <button type="button" className={`ov-n${n && tone ? ` ov-${tone}` : ''}${n ? '' : ' ov-zero'}`} onClick={() => go(route, h.facility_id)} aria-label={`${h.hostel_code}: ${n}`}>{n.toLocaleString('en-IN')}</button>);

  return (
    <div className="ra-main ov">
      <RaHead eyebrow={today()} tone="#5F3DC4" title={`${greeting()}${name ? `, ${name}` : ''}`}
        sub={o.data ? `${hs.length} hostel${hs.length === 1 ? '' : 's'} in your charge · ${occ.toLocaleString('en-IN')} of ${beds.toLocaleString('en-IN')} beds occupied${beds ? ` (${Math.round((occ / beds) * 100)}%)` : ''}` : 'Loading your hostels…'} />

      <div className="ov-tiles">
        {tiles.map((t) => { const I = t.icon; return (
          <button key={t.label} type="button" className={`ov-tile${t.hot ? ' ov-tile-hot' : ''}`} onClick={() => go(t.route)}>
            <span className="ov-ico"><I size={18} /></span><span className="ov-tx"><span>{t.label}</span><b>{t.n.toLocaleString('en-IN')}</b><small>{t.sub}</small></span>
          </button>); })}
      </div>

      <section className="ov-card" aria-label="Hostels">
        <header><h2>Hostels</h2><small>Tap a number to open that list for the hostel</small></header>
        <div className="ov-scroll">
          <table className="ov-table">
            <thead><tr><th>Hostel</th><th>Beds</th><th>Waiting for a bed</th><th>Fees to verify</th><th>To approve</th><th>Exceptions</th><th>Outings</th><th>Sick leave</th><th>Out now · late</th><th>Alerts</th><th>Overdue fees</th><th>Duties open</th></tr></thead>
            <tbody>
              {hs.map((h) => (
                <tr key={h.facility_id}>
                  <th scope="row"><button type="button" className="ov-h" onClick={() => go('/allotment-view', h.facility_id)}><b>{h.hostel_code}</b><small>{h.facility_name}</small></button></th>
                  <td data-label="Beds"><button type="button" className="ov-occ" onClick={() => go('/allotment-view', h.facility_id)}><span className="av-bar"><i style={{ width: `${h.beds ? (h.occupied / h.beds) * 100 : 0}%` }} /></span><small>{h.occupied}/{h.beds} · {h.open_beds} open</small></button></td>
                  <td data-label="Waiting for a bed">{cell(h, h.waiting, '/allotment')}</td>
                  <td data-label="Fees to verify">{cell(h, h.to_verify, '/allotment-approvals')}</td>
                  <td data-label="To approve">{cell(h, h.to_approve, '/allotment-approvals', 'hot')}</td>
                  <td data-label="Exceptions">{cell(h, h.exceptions, '/exceptions', 'hot')}</td>
                  <td data-label="Outings">{cell(h, h.outings, '/outing-approvals', 'hot')}</td>
                  <td data-label="Sick leave">{cell(h, h.sick, '/sick-leave-approvals', 'hot')}</td>
                  <td data-label="Out now · late"><span className="ov-pair">{cell(h, h.out_now, '/outing-approvals')}{cell(h, h.overdue_returns, '/alerts', 'warn')}</span></td>
                  <td data-label="Alerts">{cell(h, h.critical || h.alerts, '/alerts', h.critical ? 'hot' : 'warn')}</td>
                  <td data-label="Overdue fees">{h.fees_overdue ? <button type="button" className="ov-n ov-warn" onClick={() => go('/dues', h.facility_id)}>{rupees(Number(h.fees_overdue_amount))}<small> · {h.fees_overdue}</small></button> : cell(h, 0, '/dues')}</td>
                  <td data-label="Duties open">{cell(h, h.open_places, '/duty-roster', 'warn')}</td>
                </tr>))}
              {o.data && !hs.length && <tr><td colSpan={12} className="ov-empty">No hostel is given to your login yet. Ask the Administrator.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="ov-two">
        <section className="ov-card" aria-label="Exceptions waiting">
          <header><h2>Exceptions waiting</h2><button type="button" className="av-link" onClick={() => go('/exceptions')}>Open the inbox</button></header>
          {o.data?.exceptions.length ? (
            <ul className="ov-list">{o.data.exceptions.map((e) => (
              <li key={e.exception_id}><button type="button" onClick={() => go('/exceptions')}>
                <Chip tone="warn">{KIND[e.kind] ?? e.kind}</Chip><span><b>{proper(e.student_name ?? e.staff_name)}</b><small>{e.bed_label} · asked by {e.requested_by_name} · {formatDateTime(e.requested_at)}</small></span>
              </button></li>))}</ul>
          ) : <p className="ov-none">Nothing waits for your decision.</p>}
        </section>
        <section className="ov-card" aria-label="Open alerts">
          <header><h2>Open alerts</h2><button type="button" className="av-link" onClick={() => go('/alerts')}>All alerts</button></header>
          {o.data?.alerts.length ? (
            <ul className="ov-list">{o.data.alerts.map((a) => (
              <li key={a.alert_id}><button type="button" onClick={() => go('/alerts')}>
                <Chip tone={a.severity === 'Critical' ? 'crit' : 'warn'}>{a.alert_type.replace(/_/g, ' ')}</Chip><span><b>{a.student_name ?? a.hostel_code}</b><small>{a.hostel_code}{a.student_id ? ` · ${a.student_id}` : ''} · {formatDateTime(a.raised_at)}</small></span>
              </button></li>))}</ul>
          ) : <p className="ov-none">No open alerts.</p>}
        </section>
      </div>
      <p className="ov-foot"><BedDouble size={14} />Room blocking, staff attendance and the hostel allotment view are in the Rooms and People apps.</p>
    </div>
  );
}
