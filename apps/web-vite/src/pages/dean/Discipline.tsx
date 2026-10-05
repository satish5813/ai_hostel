import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { BarChart, Button, Drawer, Field, Input, Notice, SegmentedControl, Select, Textarea, formatDate, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import { useAction, useApi, useSession } from '@/lib/ui';
import { Chip, RaHead } from '@/pages/office/ra-kit';
import { words } from './DeanHome';

type Punishment = { punishment_type: string; from_date: string | null; to_date: string | null; fine_amount: string | null; bars_outings: boolean; status: string; details: string | null };
type Case = { case_id: number; case_no: string; student_id: string; full_name: string; programme: string | null; hostel_code: string | null; incident_on: string; incident_type: string; description: string;
  status: string; student_statement: string | null; cw_findings: string | null; cw_recommendation: string | null; dean_decision: string | null; recorded_at: string; submitted_at: string | null;
  decided_at: string | null; reported_by_name: string | null; decided_by_name: string | null; earlier_cases: number; punishments: Punishment[] | null };
type Register = { cases: Case[]; stats: { month: string; incident_type: string; n: number }[]; repeat: { student_id: string; full_name: string; cases: number; last_incident: string }[] };
const TYPES = ['Curfew_Violation', 'Misconduct', 'Property_Damage', 'Ragging', 'Violence', 'Substance', 'Other'];
const STATUS: Record<string, { label: string; tone: 'warn' | 'info' | 'ok' | 'neu' }> = {
  Reported: { label: 'Inquiry by Chief Warden', tone: 'info' }, With_Dean: { label: 'For the Dean', tone: 'warn' }, Action_Taken: { label: 'Action taken', tone: 'ok' }, Closed_No_Action: { label: 'Closed, no action', tone: 'neu' },
};
const PUNISH = [{ value: 'Warning', label: 'Written warning' }, { value: 'Fine', label: 'Fine' }, { value: 'Outing_Ban', label: 'Outing ban' }, { value: 'Community_Service', label: 'Community service' }, { value: 'Hostel_Suspension', label: 'Hostel suspension' }, { value: 'Expulsion', label: 'Expulsion from the hostel' }];

/**
 * DIS-07 Discipline register: the Chief Warden records an incident, takes the student's statement, writes findings and a
 * recommendation, and sends it to the Dean; the Dean awards a punishment, closes it with no action, or returns it.
 * The register also shows cases month by month and students with more than one case.
 */
export default function Discipline() {
  const s = useSession()!;
  const dean = s.role === 'Dean_Students_Affairs';
  const cw = s.role === 'Chief_Warden';
  const r = useApi<Register>('/discipline');
  const [tab, setTab] = useState(dean ? 'With_Dean' : 'Reported');
  const [sel, setSel] = useState<number | null>(null);
  const [rec, setRec] = useState(false);
  const all = r.data?.cases ?? [];
  const tabs = [{ id: 'With_Dean', label: 'For the Dean' }, { id: 'Reported', label: 'Inquiry' }, { id: 'Decided', label: 'Decided' }, { id: 'All', label: 'All' }];
  const inTab = (c: Case, t: string) => t === 'All' || (t === 'Decided' ? ['Action_Taken', 'Closed_No_Action'].includes(c.status) : c.status === t);
  const rows = all.filter((c) => inTab(c, tab));
  const months = useMemo(() => { const m = new Map<string, number>(); (r.data?.stats ?? []).forEach((x) => m.set(x.month, (m.get(x.month) ?? 0) + x.n)); return [...m.entries()]; }, [r.data]);
  const open = all.find((c) => c.case_id === sel);
  return (
    <div className="ra-main ov dn">
      <RaHead eyebrow="Discipline register" tone="#C2410C" title={dean ? 'Cases for your decision' : 'Discipline cases'}
        sub={r.data ? `${all.filter((c) => c.status === 'With_Dean').length} with the Dean · ${all.filter((c) => c.status === 'Reported').length} under inquiry · ${all.length} in all` : 'Loading…'}
        right={cw ? <Button variant="primary" onClick={() => setRec(true)}><Plus size={16} /> Record a case</Button> : undefined} />

      <div className="stg" role="group" aria-label="Status">{tabs.map((t) => (
        <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}><b>{r.data ? all.filter((c) => inTab(c, t.id)).length : ''}</b><span>{t.label}</span></button>))}</div>

      <section className="ov-card" aria-label="Cases">
        <div className="q">
          {r.data && !rows.length && <div className="q-empty">{tab === 'With_Dean' ? 'No case waits for the Dean.' : 'No cases here.'}</div>}
          {rows.map((c) => (
            <button key={c.case_id} type="button" className="q-row dn-case" onClick={() => setSel(c.case_id)}>
              <span className="q-text"><b>{c.full_name}</b><span>{c.case_no} · {c.student_id}{c.hostel_code ? ` · ${c.hostel_code}` : ''}</span></span>
              <span className="q-text"><b>{words(c.incident_type)}</b><span>{formatDateTime(c.incident_on)}{c.earlier_cases ? ` · ${c.earlier_cases} earlier case${c.earlier_cases > 1 ? 's' : ''}` : ''}</span></span>
              <Chip tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Chip>
            </button>))}
        </div>
      </section>

      <div className="ov-two">
        <section className="ov-card" aria-label="Cases by month">
          <header><h2>Cases by month</h2><small>Last 12 months</small></header>
          {months.length ? <BarChart label="Cases by month" height={150} showValues data={months.map(([m, n]) => ({ label: formatDate(`${m}-01`).replace(/^\d+\s/, ''), value: n }))} /> : <p className="ov-none">No cases in the last 12 months.</p>}
        </section>
        <section className="ov-card" aria-label="More than one case">
          <header><h2>More than one case</h2><small>Students to follow closely</small></header>
          {r.data?.repeat.length ? <ul className="ov-list">{r.data.repeat.map((x) => <li key={x.student_id}><span className="dn-rep"><b>{x.full_name}</b><small>{x.student_id} · {x.cases} cases · last {formatDate(x.last_incident)}</small></span></li>)}</ul>
            : <p className="ov-none">No student has more than one case.</p>}
        </section>
      </div>

      {open && <CasePanel c={open} dean={dean} cw={cw} onClose={() => setSel(null)} onDone={() => { r.mutate(); setSel(null); }} />}
      {rec && <RecordPanel onClose={() => setRec(false)} onDone={(id) => { setRec(false); r.mutate(); setTab('Reported'); setSel(id); }} />}
    </div>
  );
}

function CasePanel({ c, dean, cw, onClose, onDone }: { c: Case; dean: boolean; cw: boolean; onClose: () => void; onDone: () => void }) {
  const { run, busy } = useAction();
  const [f, setF] = useState({ student_statement: c.student_statement ?? '', cw_findings: c.cw_findings ?? '', cw_recommendation: c.cw_recommendation ?? '' });
  const [d, setD] = useState({ outcome: 'Punish', decision: '', punishment_type: 'Warning', from_date: '', to_date: '', fine_amount: '', details: '' });
  const inquiry = cw && c.status === 'Reported';
  const deciding = dean && c.status === 'With_Dean';
  const dated = ['Outing_Ban', 'Hostel_Suspension', 'Community_Service'].includes(d.punishment_type);
  const save = (send: boolean) => run(() => api(`/discipline/${c.case_id}`, { method: 'PUT', json: { ...f, send } }).then(onDone), send ? 'Sent to the Dean' : 'Saved');
  const decide = () => run(() => api(`/discipline/${c.case_id}/decide`, { method: 'POST', json: {
    outcome: d.outcome, decision: d.decision,
    punishment: d.outcome === 'Punish' ? { punishment_type: d.punishment_type, from_date: d.from_date || null, to_date: d.to_date || null, fine_amount: d.fine_amount ? Number(d.fine_amount) : null, details: d.details || null } : undefined,
  } }).then(onDone), d.outcome === 'Return' ? 'Returned to the Chief Warden' : 'Decision recorded; the student is told');
  const blocked = d.decision.trim().length < 5 ? 'Write the decision.' : d.outcome === 'Punish' && dated && (!d.from_date || !d.to_date) ? 'Give the dates.' : d.outcome === 'Punish' && d.punishment_type === 'Fine' && !(Number(d.fine_amount) > 0) ? 'Give the fine.' : undefined;
  return (
    <Drawer open onClose={onClose} title={`${c.case_no} · ${c.full_name}`} subtitle={`${words(c.incident_type)} · ${formatDateTime(c.incident_on)}`}
      footer={inquiry ? <div className="klh-row"><Button variant="primary" loading={busy} blockedReason={!f.cw_findings.trim() || !f.cw_recommendation.trim() ? 'Write the findings and a recommendation.' : undefined} onClick={() => save(true)}>Send to the Dean</Button><Button variant="secondary" loading={busy} onClick={() => save(false)}>Save</Button></div>
        : deciding ? <Button variant="primary" loading={busy} blockedReason={blocked} onClick={decide}>{d.outcome === 'Punish' ? 'Award and close' : d.outcome === 'No_Action' ? 'Close with no action' : 'Return for inquiry'}</Button> : undefined}>
      <div className="klh-stack" style={{ gap: 14 }}>
        <div className="facts">
          <div><span>Student</span><b>{c.student_id}</b></div><div><span>Programme</span><b>{c.programme ?? '—'}</b></div><div><span>Earlier cases</span><b>{c.earlier_cases}</b></div>
        </div>
        <div className="dn-block"><small>What happened</small><p>{c.description}</p><small>Recorded by {c.reported_by_name ?? '—'} on {formatDateTime(c.recorded_at)}</small></div>
        {inquiry ? (<>
          <Field label="Student's statement"><Textarea rows={3} value={f.student_statement} onChange={(e) => setF({ ...f, student_statement: e.target.value })} /></Field>
          <Field label="Findings" required><Textarea rows={3} value={f.cw_findings} onChange={(e) => setF({ ...f, cw_findings: e.target.value })} placeholder="What the inquiry found: gate log, witnesses, CCTV" /></Field>
          <Field label="Recommendation to the Dean" required><Textarea rows={2} value={f.cw_recommendation} onChange={(e) => setF({ ...f, cw_recommendation: e.target.value })} placeholder="For example: written warning, parents informed" /></Field>
        </>) : (<>
          {c.student_statement && <div className="dn-block"><small>Student's statement</small><p>{c.student_statement}</p></div>}
          {c.cw_findings && <div className="dn-block"><small>Chief Warden's findings</small><p>{c.cw_findings}</p></div>}
          {c.cw_recommendation && <div className="dn-block dn-block-attn"><small>Recommendation</small><p>{c.cw_recommendation}</p></div>}
        </>)}
        {c.dean_decision && c.status !== 'With_Dean' && <Notice tone={c.status === 'Reported' ? 'warning' : 'success'} title={c.status === 'Reported' ? 'Returned by the Dean' : `Decided by ${c.decided_by_name ?? 'the Dean'}`}>{c.dean_decision}</Notice>}
        {c.punishments?.map((p, i) => <div key={i} className="dn-block"><small>Punishment · {words(p.status)}</small><p><b>{PUNISH.find((x) => x.value === p.punishment_type)?.label}</b>{p.from_date && p.to_date ? `, ${formatDate(p.from_date)} to ${formatDate(p.to_date)}` : ''}{p.fine_amount ? `, ₹${Number(p.fine_amount).toLocaleString('en-IN')}` : ''}{p.bars_outings ? '; no outings meanwhile' : ''}</p>{p.details && <small>{p.details}</small>}</div>)}
        {deciding && (
          <div className="klh-stack dn-decide" style={{ gap: 12 }}>
            <SegmentedControl label="Your decision" value={d.outcome} onChange={(v) => setD({ ...d, outcome: v })} options={[{ value: 'Punish', label: 'Award' }, { value: 'No_Action', label: 'No action' }, { value: 'Return', label: 'Return' }]} />
            {d.outcome === 'Punish' && (<>
              <Field label="Punishment"><Select value={d.punishment_type} onChange={(e) => setD({ ...d, punishment_type: e.target.value })} options={PUNISH} /></Field>
              {dated && <div className="klh-grid-2"><Field label="From" required><Input type="date" value={d.from_date} onChange={(e) => setD({ ...d, from_date: e.target.value })} /></Field><Field label="To" required><Input type="date" value={d.to_date} onChange={(e) => setD({ ...d, to_date: e.target.value })} /></Field></div>}
              {d.punishment_type === 'Fine' && <Field label="Fine (₹)" required><Input type="number" min={1} value={d.fine_amount} onChange={(e) => setD({ ...d, fine_amount: e.target.value })} /></Field>}
              {d.punishment_type === 'Outing_Ban' && <p className="klh-muted" style={{ fontSize: 12.5 }}>While the ban is in force the student cannot ask for an outing.</p>}
              <Field label="Details for the record"><Input value={d.details} onChange={(e) => setD({ ...d, details: e.target.value })} placeholder="Parents informed by phone" /></Field>
            </>)}
            <Field label={d.outcome === 'Return' ? 'What more to find out' : 'Decision'} required><Textarea rows={3} value={d.decision} onChange={(e) => setD({ ...d, decision: e.target.value })} /></Field>
          </div>)}
      </div>
    </Drawer>
  );
}

function RecordPanel({ onClose, onDone }: { onClose: () => void; onDone: (id: number) => void }) {
  const [q, setQ] = useState('');
  const [who, setWho] = useState<{ student_id: string; full_name: string; bed_label: string } | null>(null);
  const found = useApi<{ student_id: string; full_name: string; bed_label: string }[]>(q.trim().length >= 2 && !who ? `/discipline/residents?q=${encodeURIComponent(q.trim())}` : null);
  const [f, setF] = useState({ incident_on: '', incident_type: 'Curfew_Violation', description: '', student_statement: '' });
  const { run, busy } = useAction();
  const save = () => run(() => api<{ case_id: number }>('/discipline', { method: 'POST', json: { student_id: who!.student_id, incident_on: new Date(f.incident_on).toISOString(), incident_type: f.incident_type, description: f.description, student_statement: f.student_statement || null } }).then((x) => onDone(x.case_id)), 'Case recorded');
  return (
    <Drawer open onClose={onClose} title="Record a case" subtitle="An incident by a student of your hostels"
      footer={<Button variant="primary" loading={busy} blockedReason={!who ? 'Choose the student.' : !f.incident_on ? 'When did it happen?' : new Date(f.incident_on) > new Date() ? 'The time is in the future.' : f.description.trim().length < 10 ? 'Describe what happened.' : undefined} onClick={save}>Record case</Button>}>
      <div className="klh-stack" style={{ gap: 14 }}>
        {who ? <div className="dn-block"><small>Student</small><p><b>{who.full_name}</b> · {who.student_id} · {who.bed_label}</p><button type="button" className="av-link" onClick={() => { setWho(null); setQ(''); }}>Change</button></div> : (
          <Field label="Student" required hint="Name or ID"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Arjun or 2600040012" />
            {found.data && <ul className="dn-pick">{found.data.map((x) => <li key={x.student_id}><button type="button" onClick={() => setWho(x)}><b>{x.full_name}</b><small>{x.student_id} · {x.bed_label}</small></button></li>)}{!found.data.length && <li className="klh-muted">No resident found.</li>}</ul>}
          </Field>)}
        <div className="klh-grid-2">
          <Field label="When" required><Input type="datetime-local" value={f.incident_on} onChange={(e) => setF({ ...f, incident_on: e.target.value })} /></Field>
          <Field label="Type" required><Select value={f.incident_type} onChange={(e) => setF({ ...f, incident_type: e.target.value })} options={TYPES.map((t) => ({ value: t, label: words(t) }))} /></Field>
        </div>
        <Field label="What happened" required><Textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Facts only: time, place, who saw it" /></Field>
        <Field label="Student's statement" hint="Can be added later during the inquiry"><Textarea rows={3} value={f.student_statement} onChange={(e) => setF({ ...f, student_statement: e.target.value })} /></Field>
      </div>
    </Drawer>
  );
}
