import { useState } from 'react';
import { Download } from 'lucide-react';
import { BarChart, Drawer } from '@/lib/klh';
import { useApi } from '@/lib/ui';
import { Chip, RaHead } from '@/pages/office/ra-kit';
import { downloadCsv } from './AbsenceReport';

type Guidance = { path: string; path_source: 'Goal' | 'Record'; status: 'On track' | 'Watch' | 'Needs guidance'; score: number; strengths: string[]; concerns: string[]; next_step: string };
type Student = { student_id: string; full_name: string; programme: string | null; hostel_code: string | null; bed_label: string | null; semester: number | null; cgpa: number | null; sgpa_last: number | null; sgpa_prev: number | null;
  backlogs: number; attendance_pct: number | null; coding_pct: number | null; aptitude_pct: number | null; technical_pct: number | null; crt_attendance_pct: number | null; tech_certs: number; internships: number;
  tech_events: number; leadership: number; achievements: number; cases_12m: number; absences_30d: number; goal: string | null; guidance: Guidance; path_name: string };
type Report = { programme: string; summary: { students: number; on_track: number; watch: number; needs_guidance: number; goal_stated: number }; paths: { path: string; count: number }[]; top_concerns: { reason: string; count: number }[]; students: Student[] };
const TONE = { 'On track': 'ok', Watch: 'warn', 'Needs guidance': 'crit' } as const;
const p = (v: number | null) => (v == null ? '—' : `${Math.round(v)}%`);

/**
 * ACA-03 Career guidance (Dean, Students Affairs): each hosteller's record read against the path they want, or the path
 * the record points to, with the reasons. Advice for the Dean and counsellors, not a verdict: students never see it.
 */
export default function Careers() {
  const [prog, setProg] = useState('CSE');
  const [status, setStatus] = useState<string>('All');
  const [sel, setSel] = useState<Student | null>(null);
  const r = useApi<Report>(`/dean/careers?programme=${prog}`);
  const s = r.data?.summary;
  const rows = (r.data?.students ?? []).filter((x) => status === 'All' || x.guidance.status === status);
  return (
    <div className="ra-main ov dn">
      <RaHead eyebrow="Career guidance" tone="#C2410C" title={prog === 'All' ? 'All hostellers' : 'Computer science hostellers'}
        sub="Results, placement training, certifications and conduct, read against each student's career path. For counsellors; students do not see this."
        right={<div className="dn-ctl"><select className="dm-filter" aria-label="Programme" value={prog} onChange={(e) => setProg(e.target.value)}><option value="CSE">Computer science (CSE)</option><option value="ECE">Electronics (ECE)</option><option value="All">All programmes</option></select></div>} />

      <div className="dn-kpis">
        {([['Students', s?.students, ''], ['On track', s?.on_track, 'ok'], ['Watch', s?.watch, 'warn'], ['Needs guidance', s?.needs_guidance, 'attn'], ['Told us their goal', s ? `${s.goal_stated} of ${s.students}` : null, '']] as [string, number | string | null | undefined, string][]).map(([l, v, t]) => (
          <button key={l} type="button" className={`dn-kpi${t ? ` dn-kpi-${t}` : ''}${status === l ? ' dn-kpi-on' : ''}`} onClick={() => setStatus(['On track', 'Watch', 'Needs guidance'].includes(l) ? (status === l ? 'All' : l) : 'All')}><small>{l}</small><b>{v ?? '—'}</b></button>))}
      </div>

      <div className="ov-two">
        <section className="ov-card" aria-label="Career paths">
          <header><h2>Career paths</h2><small>The student's goal, or where the record points</small></header>
          {r.data?.paths.length ? <BarChart label="Students by career path" height={160} showValues data={r.data.paths.map((x) => ({ label: x.path.replace(/ \(.*\)$/, ''), value: x.count }))} /> : <p className="ov-none">No students.</p>}
        </section>
        <section className="ov-card" aria-label="Most common concerns">
          <header><h2>Most common concerns</h2><small>What holds students back</small></header>
          {r.data?.top_concerns.length ? <ul className="dn-reasons">{r.data.top_concerns.map((x) => (
            <li key={x.reason}><span>{x.reason}</span><span className="av-bar"><i style={{ width: `${(100 * x.count) / Math.max(s?.students ?? 1, 1)}%`, background: 'var(--dn-attn)' }} /></span><b>{x.count}</b></li>))}</ul>
            : <p className="ov-none">No concerns: everyone is on track.</p>}
        </section>
      </div>

      <section className="ov-card" aria-label="Students">
        <header><h2>Students{status !== 'All' ? `: ${status.toLowerCase()}` : ''}</h2>
          <button type="button" className="av-link" onClick={() => downloadCsv(`career-guidance-${prog}.csv`, ['Student', 'Name', 'Semester', 'CGPA', 'Path', 'Status', 'Concerns', 'Next step'],
            rows.map((x) => [x.student_id, x.full_name, x.semester, x.cgpa, x.path_name, x.guidance.status, x.guidance.concerns.join('; '), x.guidance.next_step]))}><Download size={14} /> Download CSV</button></header>
        <div className="dn-careers">{rows.map((x) => (
          <button key={x.student_id} type="button" className={`dn-career dn-career-${TONE[x.guidance.status]}`} onClick={() => setSel(x)}>
            <span className="dn-career-top"><span><b>{x.full_name}</b><small>{x.student_id} · sem {x.semester ?? '—'} · {x.hostel_code ?? ''}</small></span><Chip tone={TONE[x.guidance.status]}>{x.guidance.status}</Chip></span>
            <span className="dn-career-path">{x.path_name}<em>{x.guidance.path_source === 'Goal' ? 'their goal' : 'from the record'}</em></span>
            <span className="dn-career-nums"><span>CGPA <b>{x.cgpa?.toFixed(2) ?? '—'}</b></span><span>Coding <b>{p(x.coding_pct)}</b></span><span>Aptitude <b>{p(x.aptitude_pct)}</b></span><span>Certs <b>{x.tech_certs}</b></span></span>
            {x.guidance.concerns.length ? <span className="dn-career-why">{x.guidance.concerns.slice(0, 2).join(' · ')}{x.guidance.concerns.length > 2 ? ` · +${x.guidance.concerns.length - 2} more` : ''}</span>
              : <span className="dn-career-why dn-good">{x.guidance.strengths.slice(0, 2).join(' · ') || 'Nothing stands in the way'}</span>}
          </button>))}
          {r.data && !rows.length && <p className="ov-none">No students in this list.</p>}</div>
      </section>

      {sel && <StudentPanel x={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

function StudentPanel({ x, onClose }: { x: Student; onClose: () => void }) {
  const g = x.guidance;
  const facts: [string, string][] = [
    ['CGPA', x.cgpa?.toFixed(2) ?? '—'], ['Last two SGPA', x.sgpa_prev != null && x.sgpa_last != null ? `${x.sgpa_prev.toFixed(2)} → ${x.sgpa_last.toFixed(2)}` : '—'], ['Backlogs', String(x.backlogs)],
    ['Class attendance', p(x.attendance_pct)], ['Coding tests', p(x.coding_pct)], ['Aptitude tests', p(x.aptitude_pct)], ['Core subject tests', p(x.technical_pct)], ['Placement training attended', p(x.crt_attendance_pct)],
    ['Technical certifications', String(x.tech_certs)], ['Internships', String(x.internships)], ['Technical events', String(x.tech_events)], ['Achievements', String(x.achievements)],
    ['Discipline cases (12 months)', String(x.cases_12m)], ['Absent at roll call (30 days)', String(x.absences_30d)],
  ];
  return (
    <Drawer open onClose={onClose} title={x.full_name} subtitle={`${x.student_id} · ${x.programme ?? ''} · semester ${x.semester ?? '—'} · ${x.bed_label ?? ''}`}>
      <div className="klh-stack" style={{ gap: 14 }}>
        <div className={`dn-verdict dn-verdict-${TONE[g.status]}`}>
          <span><small>{g.path_source === 'Goal' ? 'Their goal' : 'Where the record points'}</small><b>{x.path_name}</b></span>
          <Chip tone={TONE[g.status]}>{g.status}</Chip>
        </div>
        {g.concerns.length > 0 && <div className="dn-block dn-block-attn"><small>Why ({g.concerns.length})</small><ul>{g.concerns.map((c) => <li key={c}>{c}</li>)}</ul></div>}
        {g.strengths.length > 0 && <div className="dn-block dn-block-ok"><small>Strengths</small><ul>{g.strengths.map((c) => <li key={c}>{c}</li>)}</ul></div>}
        <div className="dn-block"><small>Suggested next step</small><p><b>{g.next_step}</b></p></div>
        <div className="dn-facts">{facts.map(([l, v]) => <span key={l}><small>{l}</small><b>{v}</b></span>)}</div>
        <p className="klh-muted" style={{ fontSize: 12 }}>From the academic system's latest import, the placement-training records and the hostel registers. Rules: CGPA under 6.5, backlogs, a fall of 0.5 in SGPA, attendance under 75%, placement training under 60%, discipline and repeated absence are concerns; the path adds its own (for example coding under 60% for product companies).</p>
      </div>
    </Drawer>
  );
}
