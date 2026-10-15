import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '@/lib/klh';
import { titleCase, useApi, useSession } from '@/lib/ui';
import Student360 from './Student360';

type Row = { student_id: string; full_name: string; programme: string; dept_code: string | null; hostel_code: string; floor_name: string; room_code: string; cgpa: number | null; class_pct: number | null; backlogs: number;
  crt_pct: number | null; crt_score: number | null; certs: number; achievements: number; activities: number; night_pct: number | null };
type Col = { key: keyof Row; label: string; num?: boolean; low?: number; fmt?: (v: number) => string };
const COLS: Col[] = [
  { key: 'cgpa', label: 'CGPA', num: true, low: 6.5, fmt: (v) => v.toFixed(2) },
  { key: 'class_pct', label: 'Class', num: true, low: 75, fmt: (v) => `${Math.round(v)}%` },
  { key: 'backlogs', label: 'Backlogs', num: true },
  { key: 'crt_pct', label: 'CRT sessions', num: true, low: 75, fmt: (v) => `${Math.round(v)}%` },
  { key: 'crt_score', label: 'CRT score', num: true, low: 50, fmt: (v) => String(Math.round(v)) },
  { key: 'certs', label: 'Certificates', num: true },
  { key: 'achievements', label: 'Achievements', num: true },
  { key: 'night_pct', label: 'Hostel roll call', num: true, low: 90, fmt: (v) => `${Math.round(v)}%` },
];
const weak = (r: Row) => COLS.filter((c) => c.low !== undefined && r[c.key] !== null && (r[c.key] as number) < c.low!).length + (r.backlogs > 0 ? 1 : 0);

/** ACA-01: a student sees their own page; wardens and senior staff see every hosteller side by side and open one. */
export default function Academics() {
  const s = useSession()!;
  if (s.kind === 'student') return <Student360 id={s.id} />;
  return <Board />;
}

function Board() {
  const navigate = useNavigate();
  const hostels = useApi<{ facility_id: string; facility_name: string }[]>('/hostels');
  const [facility, setFacility] = useState('');
  const rows = useApi<Row[]>(`/acad/board${facility ? `?facility_id=${facility}` : ''}`);
  const [q, setQ] = useState('');
  const [only, setOnly] = useState(false);
  const [sort, setSort] = useState<{ k: keyof Row; d: 1 | -1 }>({ k: 'cgpa', d: -1 });
  const list = useMemo(() => (rows.data ?? [])
    .filter((r) => !q || `${r.full_name} ${r.student_id} ${r.programme} ${r.room_code}`.toLowerCase().includes(q.toLowerCase()))
    .filter((r) => !only || weak(r) > 0)
    .sort((a, b) => { const x = a[sort.k] ?? -1, y = b[sort.k] ?? -1; return (x < y ? -1 : x > y ? 1 : 0) * sort.d; }), [rows.data, q, only, sort]);
  const all = rows.data ?? [];
  const avg = (k: keyof Row) => { const v = all.map((r) => r[k] as number | null).filter((x): x is number => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const need = all.filter((r) => weak(r) > 0).length;
  const by = (k: keyof Row) => setSort((p) => ({ k, d: p.k === k ? (p.d === 1 ? -1 : 1) : -1 }));
  return (
    <div className="pg">
      <div className="pg-head">
        <p>Every hosteller's results, CRT, skills and residency conduct in one table. Figures below the mark are shown in red; open a student for the full page.</p>
        <div className="pg-actions"><select className="dm-filter" aria-label="Hostel" value={facility} onChange={(e) => setFacility(e.target.value)}><option value="">All hostels</option>{(hostels.data ?? []).map((h) => <option key={h.facility_id} value={h.facility_id}>{h.facility_name}</option>)}</select></div>
      </div>
      <div className="stg stg-static">
        <div><b>{all.length}</b><span>Hostellers</span></div>
        <div><b>{avg('cgpa')?.toFixed(2) ?? '—'}</b><span>Average CGPA</span></div>
        <div><b>{avg('crt_pct') !== null ? `${Math.round(avg('crt_pct')!)}%` : '—'}</b><span>CRT attendance</span></div>
        <div><b>{all.reduce((a, r) => a + r.certs, 0)}</b><span>Certificates</span></div>
        <div><b>{all.reduce((a, r) => a + r.achievements, 0)}</b><span>Achievements</span></div>
        <div className={need ? 'stg-warn' : undefined}><b>{need}</b><span>Need attention</span></div>
      </div>
      <div className="dm-tools">
        <label className="dm-search"><Icon name="search" size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, programme or room" aria-label="Search" /></label>
        <button type="button" className={`dm-filter${only ? ' dm-filter-on' : ''}`} onClick={() => setOnly(!only)} aria-pressed={only}>Needs attention only</button>
      </div>
      <div className="dm-grid ab-grid">
        <table>
          <thead><tr><th>Student</th><th>Room</th>{COLS.map((c) => <th key={c.key} className="num"><button type="button" className="ab-sort" onClick={() => by(c.key)}>{c.label}{sort.k === c.key ? (sort.d === -1 ? ' ↓' : ' ↑') : ''}</button></th>)}</tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.student_id} onClick={() => navigate(`/academics/${r.student_id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/academics/${r.student_id}`)} style={{ cursor: 'pointer' }}>
                <td data-label="Student"><b>{titleCase(r.full_name)}</b><small style={{ display: 'block', color: 'var(--ink-muted)' }}>{r.student_id} · {r.programme}</small></td>
                <td data-label="Room">{r.hostel_code} {r.room_code}</td>
                {COLS.map((c) => { const v = r[c.key] as number | null; const bad = (c.low !== undefined && v !== null && v < c.low) || (c.key === 'backlogs' && (v ?? 0) > 0);
                  return <td key={c.key} data-label={c.label} className="num"><span className={bad ? 'ab-bad' : undefined}>{v === null ? '—' : c.fmt ? c.fmt(v) : v || (c.key === 'backlogs' ? '—' : v)}</span></td>; })}
              </tr>))}
            {rows.data && !list.length && <tr><td colSpan={COLS.length + 2} className="q-empty">Nobody matches.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
