import { useState } from 'react';
import { Download } from 'lucide-react';
import { formatDate } from '@/lib/klh';
import { useApi } from '@/lib/ui';
import { RaHead } from '@/pages/office/ra-kit';

type Row = { student_id: string; full_name: string; programme: string | null; hostel_code: string; floor_name: string; bed_label: string; absent_nights: number; nights_marked: number; last_absent: string | null; dates: string | null; class_attendance_pct: number | null };
type Report = { days: number; summary: { residents: number; nights_marked: number; absences: number; repeat_absentees: number; low_class_attendance: number };
  floors: { hostel_code: string; floor_name: string; residents: number; marked: number; absent: number; rate: number | null }[]; students: Row[] };
const FILTERS = [
  { id: 'any', label: 'Absent at least once', test: (r: Row) => r.absent_nights > 0 },
  { id: 'repeat', label: 'Three nights or more', test: (r: Row) => r.absent_nights >= 3 },
  { id: 'class', label: 'Class attendance under 75%', test: (r: Row) => r.class_attendance_pct != null && r.class_attendance_pct < 75 },
  { id: 'all', label: 'Everyone', test: () => true },
];

/** Shared by the report pages: download the rows on screen as a CSV file. */
export function downloadCsv(name: string, head: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const blob = new Blob([[head, ...rows].map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

/**
 * RPT-09 Absence report: nights absent at roll call per student and per floor over a period, with class attendance from
 * the last term result. Repeat absentees (three nights or more) are the ones to call in.
 */
export default function AbsenceReport() {
  const [days, setDays] = useState(30);
  const [facility, setFacility] = useState('');
  const [filter, setFilter] = useState('any');
  const hostels = useApi<{ facility_id: string; facility_name: string }[]>('/hostels');
  const r = useApi<Report>(`/dean/absence?days=${days}${facility ? `&facility_id=${facility}` : ''}`);
  const f = FILTERS.find((x) => x.id === filter)!;
  const rows = (r.data?.students ?? []).filter(f.test);
  const s = r.data?.summary;
  const rate = s && s.nights_marked ? Math.round((1000 * s.absences) / s.nights_marked) / 10 : 0;
  return (
    <div className="ra-main ov dn">
      <RaHead eyebrow="Absence report" tone="#C2410C" title="Who was not in the hostel at night"
        sub={s ? `${s.absences} absences in ${s.nights_marked} nights marked (${rate}%) over the last ${days} days` : 'Loading…'}
        right={<div className="dn-ctl">
          <select className="dm-filter" aria-label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 30, 60, 90].map((d) => <option key={d} value={d}>Last {d} days</option>)}</select>
          <select className="dm-filter" aria-label="Hostel" value={facility} onChange={(e) => setFacility(e.target.value)}><option value="">All hostels</option>{(hostels.data ?? []).map((h) => <option key={h.facility_id} value={h.facility_id}>{h.facility_name}</option>)}</select>
        </div>} />

      <div className="dn-kpis">
        {[['Residents', s?.residents], ['Absences', s?.absences], ['Absence rate', s ? `${rate}%` : null], ['Three nights or more', s?.repeat_absentees], ['Class attendance under 75%', s?.low_class_attendance]].map(([l, v]) => (
          <div key={String(l)} className={`dn-kpi${(l === 'Three nights or more' || l === 'Class attendance under 75%') && Number(v) > 0 ? ' dn-kpi-attn' : ''}`}><small>{l}</small><b>{v ?? '—'}</b></div>))}
      </div>

      <section className="ov-card" aria-label="Floors">
        <header><h2>By floor</h2><small>Absences as a share of the nights marked</small></header>
        <div className="dn-floors">{(r.data?.floors ?? []).map((x) => (
          <div key={x.hostel_code + x.floor_name} className="dn-floor">
            <span><b>{x.hostel_code} · {x.floor_name}</b><small>{x.residents} residents · {x.absent} of {x.marked} nights</small></span>
            <span className="av-bar"><i style={{ width: `${Math.min((x.rate ?? 0) * 4, 100)}%`, background: (x.rate ?? 0) >= 10 ? 'var(--dn-attn)' : undefined }} /></span>
            <em>{x.rate == null ? '—' : `${x.rate}%`}</em>
          </div>))}
          {r.data && !r.data.floors.length && <p className="ov-none">No residents in this hostel.</p>}</div>
      </section>

      <section className="ov-card" aria-label="Students">
        <header><h2>Students</h2>
          <button type="button" className="av-link" onClick={() => downloadCsv(`absence-${days}d.csv`, ['Student', 'Name', 'Programme', 'Bed', 'Nights absent', 'Nights marked', 'Dates', 'Class attendance %'],
            rows.map((x) => [x.student_id, x.full_name, x.programme, x.bed_label, x.absent_nights, x.nights_marked, x.dates, x.class_attendance_pct]))}><Download size={14} /> Download CSV</button></header>
        <div className="dn-chips" role="group" aria-label="Show">{FILTERS.map((x) => (
          <button key={x.id} type="button" aria-pressed={filter === x.id} onClick={() => setFilter(x.id)}>{x.label} <b>{(r.data?.students ?? []).filter(x.test).length}</b></button>))}</div>
        <div className="ov-scroll">
          <table className="ov-table dn-table">
            <thead><tr><th>Student</th><th>Bed</th><th>Nights absent</th><th>Dates</th><th>Class attendance</th></tr></thead>
            <tbody>{rows.map((x) => (
              <tr key={x.student_id}>
                <th scope="row"><span className="ov-h"><b>{x.full_name}</b><small>{x.student_id} · {x.programme ?? '—'}</small></span></th>
                <td data-label="Bed">{x.bed_label}</td>
                <td data-label="Nights absent"><span className={`ov-n${x.absent_nights >= 3 ? ' dn-attn' : x.absent_nights ? ' ov-warn' : ' ov-zero'}`}>{x.absent_nights}</span><small className="klh-muted"> of {x.nights_marked}</small></td>
                <td data-label="Dates" className="dn-dates">{x.dates ?? '—'}{x.last_absent && <small>last {formatDate(x.last_absent)}</small>}</td>
                <td data-label="Class attendance">{x.class_attendance_pct == null ? '—' : <span className={x.class_attendance_pct < 75 ? 'dn-attn-tx' : ''}>{x.class_attendance_pct}%</span>}</td>
              </tr>))}
              {r.data && !rows.length && <tr><td colSpan={5} className="ov-empty">Nobody in this list.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
