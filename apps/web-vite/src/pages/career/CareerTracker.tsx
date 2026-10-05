import { Fragment, useMemo, useState } from 'react';
import { Button, Card, Drawer, EmptyState, Field, Input, SegmentedControl, Select, StatCard } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, useAction, useApi } from '@/lib/ui';

type Milestone = { label: string; done: boolean };
type Y2Student = { student_id: string; full_name: string; programme: string | null; hostel_code: string; bed_label: string; facility_id: string; goal: string | null; cgpa: number | null;
  backlogs: number; path_name: string; progress: number; milestones: Milestone[];
  guidance: { path_source: 'Goal' | 'Record'; status: 'On track' | 'Watch' | 'Needs guidance'; strengths: string[]; concerns: string[]; next_step: string } };
type Sum2 = { students: number; goal_stated: number; on_track: number; watch: number; needs_guidance: number; avg_progress: number | null };
type Y2 = { summary: Sum2; paths: (Sum2 & { path: string; name: string })[]; gaps: { label: string; n: number }[]; buildings: (Sum2 & { facility_id: string; hostel_code: string })[]; students?: Y2Student[] };
type Outcome = { outcome_id: number; outcome_type: string; stage: string; stage_label: string; stage_no: number; is_success: boolean; organisation: string; detail: string | null; ctc_lpa: number | null;
  country: string | null; score: string | null; funding_inr: number | null; stage_on: string; source: string; verified: boolean };
type Y4Student = { student_id: string; full_name: string; programme: string | null; hostel_code: string; facility_id: string; bed_label: string; goal_name: string; cgpa: number | null; backlogs: number;
  outcomes: Outcome[]; offers: number; best_ctc: number | null; admitted: boolean; exam: boolean; venture: boolean; secured: boolean; in_progress: boolean };
type Sum4 = { students: number; secured: number; in_progress: number; nothing_yet: number; placed: number; offers: number; seekers: number; seekers_placed: number; avg_ctc: number | null;
  median_ctc: number | null; highest_ctc: number | null; higher_applied: number; higher_admitted: number; abroad: number; exam_appeared: number; exam_cleared: number; exam_selected: number;
  ventures: number; ventures_registered: number; funding_inr: number };
type Y4 = { summary: Sum4; by_goal: { goal: string; students: number; secured: number }[]; recruiters: { organisation: string; offers: number; top_ctc: number | null }[];
  package_bands: { label: string; n: number }[]; buildings: (Sum4 & { facility_id: string; hostel_code: string })[]; students?: Y4Student[] };
type Stage = { outcome_type: string; stage: string; stage_no: number; is_success: boolean; label: string };

const TYPE: Record<string, string> = { Placement: 'Placement', Higher_Studies: 'Higher studies', Competitive_Exam: 'Competitive exam', Entrepreneurship: 'Venture' };
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
const lpa = (v: number | null) => (v == null ? '—' : `${v % 1 ? v.toFixed(1) : v} LPA`);
const inr = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : `₹${Math.round(n).toLocaleString('en-IN')}`);
const fmtDay = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * CAR-01 Career tracker for the Chief Warden (own hostels) and the Deans. Second year: each hosteller's progress towards
 * the career they chose, with the milestones still open. Final year: placements and packages, higher studies,
 * competitive examinations and ventures, and the Chief Warden records what happens.
 */
export default function CareerTracker() {
  const [tab, setTab] = useState<'y2' | 'y4'>('y2');
  const [fac, setFac] = useState('');
  const q = fac ? `?facility_id=${fac}` : '';
  const y2 = useApi<Y2>(tab === 'y2' ? `/career/second-year${q}` : null);
  const y4 = useApi<Y4>(tab === 'y4' ? `/career/final-year${q}` : null);
  const all2 = useApi<Y2>('/career/second-year');   // the buildings this login covers, for the filter
  const buildings = all2.data?.buildings ?? [];
  return (
    <div className="klh-stack ct" style={{ gap: 16 }}>
      <ScreenHeader code="CAR-01" subtitle="Hostellers' careers: second-year progress towards the path each chose, and final-year placements, higher studies, competitive exams and ventures." />
      <section className="box ct-pick">
        <SegmentedControl label="Year" value={tab} onChange={(v) => setTab(v as 'y2' | 'y4')} options={[{ value: 'y2', label: 'Second year · progress' }, { value: 'y4', label: 'Final year · outcomes' }]} />
        {buildings.length > 1 && <label className="sd-sel">Building<Select value={fac} onChange={(e) => setFac(e.target.value)} options={[{ value: '', label: 'All my buildings' }, ...buildings.map((b) => ({ value: b.facility_id, label: b.hostel_code }))]} /></label>}
      </section>
      {tab === 'y2' && (y2.data ? <SecondYear d={y2.data} /> : <div className="q-empty">Loading…</div>)}
      {tab === 'y4' && (y4.data ? <FinalYear d={y4.data} onChange={() => y4.mutate()} /> : <div className="q-empty">Loading…</div>)}
    </div>
  );
}

/* ------------------------------------------------------------------ second year */

const STATUS_CLS: Record<string, string> = { 'On track': 'good', Watch: 'warn', 'Needs guidance': 'bad' };

function Progress({ v, label }: { v: number; label?: string }) {
  return <span className="ct-prog" role="img" aria-label={`${v}% of milestones done`}><i><i style={{ width: `${v}%` }} /></i><b>{label ?? `${v}%`}</b></span>;
}

function SecondYear({ d }: { d: Y2 }) {
  const [open, setOpen] = useState<string | null>(null);
  const [path, setPath] = useState('All');
  const s = d.summary;
  if (!s.students) return <EmptyState icon="users" title="No second-year students in these buildings" />;
  const list = (d.students ?? []).filter((x) => path === 'All' || x.path_name === path);
  const maxGap = Math.max(1, ...d.gaps.map((g) => g.n));
  return (
    <>
      <div className="klh-grid-4">
        <StatCard color="indigo" icon="users" label="Second-year students" value={String(s.students)} sub={`${s.goal_stated} have chosen a career (${pct(s.goal_stated, s.students)}%)`} />
        <StatCard color="brand" icon="trend-up" label="Average progress" value={`${s.avg_progress ?? 0}%`} sub="Milestones of their path done" />
        <StatCard color="brand" icon="check" label="On track" value={String(s.on_track)} sub={`${pct(s.on_track, s.students)}% · ${s.watch} to watch`} />
        <StatCard color="rose" icon="alert" label="Need guidance" value={String(s.needs_guidance)} sub={`${pct(s.needs_guidance, s.students)}% of second years`} tone={s.needs_guidance ? 'warning' : undefined} />
      </div>
      <div className="sd-cols">
        <Card icon="sparkle" color="violet" title="By career path" subtitle="Students and their average progress">
          <ul className="ct-paths">{d.paths.map((p) => (
            <li key={p.path}><button type="button" aria-pressed={path === p.name} onClick={() => setPath(path === p.name ? 'All' : p.name)}>
              <span><b>{p.name}</b><small>{p.students} students · {p.on_track} on track · {p.needs_guidance} need guidance</small></span><Progress v={p.avg_progress ?? 0} /></button></li>))}</ul>
        </Card>
        <Card icon="alert" color="amber" title="Milestones most often missing" subtitle="What second years most need help with">
          <ul className="xd-bars ct-bars">{d.gaps.map((g) => <li key={g.label}><span>{g.label}</span><i><i style={{ width: `${(g.n / maxGap) * 100}%` }} /></i><b>{g.n}</b></li>)}</ul>
        </Card>
      </div>
      <Card padding={0} icon="users" color="indigo" title={path === 'All' ? 'Students, least progress first' : `${path}: students`} action={path !== 'All' ? <Button variant="ghost" onClick={() => setPath('All')}>Show every path</Button> : undefined}>
        <div className="rc-table-wrap">
          <table className="rc-table ct-table">
            <thead><tr><th>Student</th><th>Career path</th><th>Progress</th><th>Status</th><th>Next step</th></tr></thead>
            <tbody>{list.map((x) => (
              <Fragment key={x.student_id}>
                <tr className="ct-row" onClick={() => setOpen(open === x.student_id ? null : x.student_id)}>
                  <td><button type="button" className="ct-name" aria-expanded={open === x.student_id}><b>{x.full_name}</b><small>{x.student_id} · {x.bed_label}</small></button></td>
                  <td>{x.path_name}<small className="sd-sub">{x.guidance.path_source === 'Goal' ? 'Chosen by the student' : 'Not chosen; from the record'}</small></td>
                  <td><Progress v={x.progress} label={`${x.milestones.filter((m) => m.done).length}/${x.milestones.length}`} /></td>
                  <td><span className={`xd-pill xd-t-${STATUS_CLS[x.guidance.status]}`}>{x.guidance.status}</span></td>
                  <td className="ct-next">{x.guidance.next_step}</td>
                </tr>
                {open === x.student_id && (
                  <tr className="ct-open"><td colSpan={5}>
                    <div className="ct-detail">
                      <div><h4>Milestones</h4><ul className="ct-ms">{x.milestones.map((m) => <li key={m.label} className={m.done ? 'ct-done' : ''}><span aria-hidden="true">{m.done ? '✓' : '○'}</span>{m.label}<span className="sd-sr">{m.done ? 'done' : 'not yet'}</span></li>)}</ul></div>
                      <div><h4>Strengths</h4><ul className="ct-list">{x.guidance.strengths.map((t) => <li key={t}>{t}</li>)}{!x.guidance.strengths.length && <li className="klh-muted">None on record yet</li>}</ul></div>
                      <div><h4>Concerns</h4><ul className="ct-list">{x.guidance.concerns.map((t) => <li key={t}>{t}</li>)}{!x.guidance.concerns.length && <li className="klh-muted">None</li>}</ul></div>
                    </div>
                  </td></tr>)}
              </Fragment>))}</tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

/* ------------------------------------------------------------------ final year */

function FinalYear({ d, onChange }: { d: Y4; onChange: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [edit, setEdit] = useState<{ student: Y4Student; outcome?: Outcome } | null>(null);
  const [show, setShow] = useState<'all' | 'secured' | 'open'>('all');
  const s = d.summary;
  if (!s.students) return <EmptyState icon="users" title="No final-year students in these buildings" />;
  const list = (d.students ?? []).filter((x) => show === 'all' || (show === 'secured' ? x.secured : !x.secured));
  const maxBand = Math.max(1, ...d.package_bands.map((b) => b.n));
  return (
    <>
      <div className="klh-grid-4">
        <StatCard color="indigo" icon="users" label="Final-year students" value={String(s.students)} sub={`${s.secured} secured an outcome (${pct(s.secured, s.students)}%)`} />
        <StatCard color="brand" icon="wallet" label="Placed" value={String(s.placed)} sub={`${s.offers} offers · ${s.seekers_placed} of ${s.seekers} who chose placement`} />
        <StatCard color="amber" icon="trend-up" label="Highest package" value={lpa(s.highest_ctc)} sub={`Median ${lpa(s.median_ctc)} · average ${lpa(s.avg_ctc)}`} />
        <StatCard color="violet" icon="sparkle" label="Higher studies · exams · ventures" value={`${s.higher_admitted} · ${s.exam_cleared} · ${s.ventures_registered}`}
          sub={`${s.abroad} abroad · ${s.exam_selected} selected · ${inr(s.funding_inr)} raised`} />
      </div>
      <div className="sd-cols">
        <Card icon="check" color="brand" title="Chosen path and what happened" subtitle="Students who secured an outcome, by the career they chose">
          <ul className="ct-paths">{d.by_goal.map((g) => (
            <li key={g.goal}><span className="ct-static"><span><b>{g.goal}</b><small>{g.secured} of {g.students} secured</small></span><Progress v={pct(g.secured, g.students)} /></span></li>))}</ul>
        </Card>
        <Card icon="wallet" color="amber" title="Packages" subtitle="Best offer of each placed student">
          <ul className="xd-bars ct-bars">{d.package_bands.map((b) => <li key={b.label}><span>{b.label}</span><i><i style={{ width: `${(b.n / maxBand) * 100}%` }} /></i><b>{b.n}</b></li>)}</ul>
          {d.recruiters.length > 0 && <><h4 className="ct-h4">Recruiters</h4><ul className="ct-recruit">{d.recruiters.map((r) => <li key={r.organisation}><b>{r.organisation}</b><span>{r.offers} offer{r.offers > 1 ? 's' : ''} · {lpa(r.top_ctc)}</span></li>)}</ul></>}
        </Card>
      </div>
      <Card padding={0} icon="users" color="indigo" title="Track record, student by student"
        action={<SegmentedControl label="Show" value={show} onChange={(v) => setShow(v as typeof show)} options={[{ value: 'all', label: 'All' }, { value: 'open', label: 'Not yet secured' }, { value: 'secured', label: 'Secured' }]} />}>
        <div className="rc-table-wrap">
          <table className="rc-table ct-table">
            <thead><tr><th>Student</th><th>Chosen path</th><th>Track record</th><th className="rc-n">Best package</th><th>Status</th></tr></thead>
            <tbody>{list.map((x) => (
              <Fragment key={x.student_id}>
                <tr className="ct-row" onClick={() => setOpen(open === x.student_id ? null : x.student_id)}>
                  <td><button type="button" className="ct-name" aria-expanded={open === x.student_id}><b>{x.full_name}</b><small>{x.student_id} · {x.bed_label} · CGPA {x.cgpa?.toFixed(2) ?? '—'}</small></button></td>
                  <td>{x.goal_name}</td>
                  <td><span className="ct-chips">{bestByType(x.outcomes).map((o) => <span key={o.outcome_id} className={`ct-chip${o.is_success ? ' ct-win' : ''}`}>{TYPE[o.outcome_type]}: {o.organisation} · {o.stage_label}</span>)}
                    {!x.outcomes.length && <span className="klh-muted">Nothing recorded</span>}</span></td>
                  <td className="rc-n"><b>{lpa(x.best_ctc)}</b></td>
                  <td><span className={`xd-pill xd-t-${x.secured ? 'good' : x.in_progress ? 'warn' : 'bad'}`}>{x.secured ? 'Secured' : x.in_progress ? 'In progress' : 'Nothing yet'}</span></td>
                </tr>
                {open === x.student_id && (
                  <tr className="ct-open"><td colSpan={5}>
                    <div className="ct-timeline">
                      {x.outcomes.map((o) => (
                        <div key={o.outcome_id} className={`ct-oc${o.is_success ? ' ct-win' : ''}`}>
                          <span className="ct-oc-type">{TYPE[o.outcome_type]}</span>
                          <span className="ct-oc-main"><b>{o.organisation}</b><small>{[o.detail, o.ctc_lpa ? lpa(o.ctc_lpa) : null, o.country, o.score, o.funding_inr ? `${inr(o.funding_inr)} raised` : null].filter(Boolean).join(' · ')}</small></span>
                          <span className="ct-oc-stage">{o.stage_label}<small>{fmtDay(o.stage_on)}{o.verified ? ' · verified' : ' · reported by student'}</small></span>
                          <Button size="sm" variant="ghost" onClick={() => setEdit({ student: x, outcome: o })}>Update</Button>
                        </div>))}
                      <Button size="sm" variant="secondary" icon="plus" onClick={() => setEdit({ student: x })}>Record an offer, admit, exam or venture</Button>
                    </div>
                  </td></tr>)}
              </Fragment>))}</tbody>
          </table>
        </div>
      </Card>
      {edit && <OutcomeForm student={edit.student} outcome={edit.outcome} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); onChange(); }} />}
    </>
  );
}

const bestByType = (os: Outcome[]) => {
  const best = new Map<string, Outcome>();
  os.forEach((o) => { const b = best.get(o.outcome_type); if (!b || Number(o.is_success) - Number(b.is_success) > 0 || (o.is_success === b.is_success && ((o.ctc_lpa ?? 0) > (b.ctc_lpa ?? 0) || o.stage_no > b.stage_no))) best.set(o.outcome_type, o); });
  return [...best.values()];
};

function OutcomeForm({ student, outcome, onClose, onSaved }: { student: Y4Student; outcome?: Outcome; onClose: () => void; onSaved: () => void }) {
  const stages = useApi<Stage[]>('/career/stages');
  const [f, setF] = useState({ outcome_type: outcome?.outcome_type ?? 'Placement', stage: outcome?.stage ?? '', organisation: outcome?.organisation ?? '', detail: outcome?.detail ?? '',
    ctc_lpa: outcome?.ctc_lpa != null ? String(outcome.ctc_lpa) : '', country: outcome?.country ?? '', score: outcome?.score ?? '', funding: outcome?.funding_inr != null ? String(outcome.funding_inr) : '' });
  const { run, busy } = useAction();
  const opts = useMemo(() => (stages.data ?? []).filter((s) => s.outcome_type === f.outcome_type), [stages.data, f.outcome_type]);
  const t = f.outcome_type;
  const body = { outcome_type: t, stage: f.stage, organisation: f.organisation, detail: f.detail || null, ctc_lpa: t === 'Placement' && f.ctc_lpa ? Number(f.ctc_lpa) : null,
    country: t === 'Higher_Studies' ? f.country || null : null, score: t !== 'Placement' && t !== 'Entrepreneurship' ? f.score || null : null,
    funding_inr: t === 'Entrepreneurship' && f.funding ? Number(f.funding) : null };
  const save = () => run(() => (outcome ? api(`/career/outcomes/${outcome.outcome_id}`, { method: 'PUT', json: body }) : api('/career/outcomes', { method: 'POST', json: { ...body, student_id: student.student_id } })).then(onSaved),
    outcome ? 'Updated' : 'Recorded');
  const org = { Placement: 'Company', Higher_Studies: 'University or test (GATE, GRE …)', Competitive_Exam: 'Examination (UPSC CSE, GATE, SBI PO …)', Entrepreneurship: 'Venture name' }[t];
  const det = { Placement: 'Role', Higher_Studies: 'Course', Competitive_Exam: 'Post or paper', Entrepreneurship: 'What it does' }[t];
  return (
    <Drawer open onClose={onClose} title={outcome ? 'Update the track record' : 'Record an outcome'} subtitle={`${student.full_name} · ${student.student_id}`}
      footer={<Button variant="primary" loading={busy} blockedReason={!f.stage ? 'Choose the stage.' : f.organisation.trim().length < 2 ? `Write the ${org?.split(' ')[0].toLowerCase()}.` : undefined} onClick={save}>{outcome ? 'Save' : 'Record'}</Button>}>
      <div className="klh-stack" style={{ gap: 14 }}>
        {!outcome && <SegmentedControl label="Kind" value={t} onChange={(v) => setF({ ...f, outcome_type: v, stage: '' })} options={Object.entries(TYPE).map(([value, label]) => ({ value, label }))} />}
        <Field label="Stage"><Select value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })} options={[{ value: '', label: 'Choose…' }, ...opts.map((s) => ({ value: s.stage, label: s.label }))]} /></Field>
        <Field label={org}><Input value={f.organisation} onChange={(e) => setF({ ...f, organisation: e.target.value })} disabled={!!outcome} /></Field>
        <Field label={det}><Input value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} /></Field>
        {t === 'Placement' && <Field label="Package (lakh rupees a year)" hint="Cost to company, as in the offer letter"><Input type="number" min={0} step={0.1} value={f.ctc_lpa} onChange={(e) => setF({ ...f, ctc_lpa: e.target.value })} /></Field>}
        {t === 'Higher_Studies' && <Field label="Country"><Input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} placeholder="India, USA, Germany …" /></Field>}
        {(t === 'Higher_Studies' || t === 'Competitive_Exam') && <Field label="Score or rank"><Input value={f.score} onChange={(e) => setF({ ...f, score: e.target.value })} placeholder="GRE 321, GATE score 612, rank 412 …" /></Field>}
        {t === 'Entrepreneurship' && <Field label="Funding raised (₹)"><Input type="number" min={0} value={f.funding} onChange={(e) => setF({ ...f, funding: e.target.value })} /></Field>}
      </div>
    </Drawer>
  );
}

