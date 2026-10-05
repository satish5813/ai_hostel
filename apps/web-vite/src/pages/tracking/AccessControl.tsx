import { useState } from 'react';
import { Button, Drawer, Field, Icon, Input, Select, Switch, formatDateTime, type T } from '@/lib/klh';
import { api } from '@/lib/api';
import { titleCase, toast, useAction, useApi, useSession, words } from '@/lib/ui';
import { can } from '@/app/screens';

type Point = { point_id: number; point_name: string; point_type: string; hostel_name: string | null; zone_name: string | null; device_type: string; device_ref: string | null; status: string; methods: string[];
  who: string | null; open_from: string | null; open_to: string | null; outside_hours: string | null; pass_to_exit: boolean | null; proof: string[] | null; approver_role: string | null; photo_on_entry: boolean | null;
  allowed_today: number; denied_today: number; pending: number };
type Verdict = { verdict: string; reason: string; student?: { student_id: string; full_name: string; programme: string; hostel_code: string | null; room_code: string | null; floor_name: string | null }; request?: { request_id: number } | null };
type Req = { request_id: number; student_id: string; full_name: string; room_code: string | null; hostel_code: string | null; point_name: string; reason: string; requested_at: string; valid_until: string; status: string; remarks: string | null };
type Enrol = { hostel_code: string; student_id: string; full_name: string; room_code: string; card: boolean; face: boolean; thumb: boolean; consent: boolean };
type Log = { event_id: string; event_at: string; direction: string; method: string | null; verdict: string | null; verdict_reason: string | null; confidence: number | null; full_name: string | null; student_id: string; point_name: string };

const METHODS = ['QR', 'Face', 'Thumb', 'Card', 'Manual'];
const M_ICON: Record<string, T.IconName> = { QR: 'qr', Face: 'eye', Thumb: 'key', Card: 'wallet', Manual: 'edit' };
const TYPE_ICON: Record<string, T.IconName> = { Campus_Gate: 'door', Hostel_Gate: 'building', Room_Corridor: 'bed', Mess: 'utensils', Library: 'file', Gym: 'heart', Facility: 'settings', Academic_Block: 'file' };
const WHO: Record<string, string> = { Everyone: 'Anyone', All_Hostellers: 'Any hosteller', Own_Hostel: 'Residents of this hostel', Own_Floor: 'Residents of this floor', Staff_Only: 'Staff only' };
const OUTSIDE: Record<string, string> = { Deny: 'Refuse', Need_Approval: 'Ask for approval', Allow_And_Alert: 'Let in and tell the Floor Warden' };
const VERDICT: Record<string, { tone: string; label: string; icon: T.IconName }> = {
  Allowed: { tone: 'ok', label: 'Allowed', icon: 'check' }, Allowed_Alerted: { tone: 'warn', label: 'Allowed, Floor Warden told', icon: 'bell' },
  Approval_Needed: { tone: 'warn', label: 'Needs approval', icon: 'clock' }, Denied: { tone: 'bad', label: 'Refused', icon: 'x' },
};
const hours = (p: Point) => (p.open_from ? `${p.open_from} to ${p.open_to}` : 'All day');

/**
 * TRK-09 Access control (addition). Every gate, floor, mess, library and gym is a capture point: which proofs it takes
 * (QR, face, thumb, card), who may pass and when, whether going out needs an outing pass, and who approves out of hours.
 * A scan is judged on the spot — allowed, allowed with a word to the Floor Warden, needs approval, or refused — and kept.
 */
export default function AccessControl() {
  const s = useSession()!;
  const edit = ['Chief_Warden', 'Director_Hostels', 'Security_Officer'].includes(s.role);
  const scanner = can(s.role, 'TRK-04', 'C') || ['Security_Officer', 'Chief_Warden'].includes(s.role);
  const [tab, setTab] = useState('points');
  const points = useApi<Point[]>('/access/points');
  const reqs = useApi<Req[]>('/access/requests');
  const [sel, setSel] = useState<Point | null>(null);
  const p = points.data ?? [];
  return (
    <div className="pg">
      <div className="pg-head"><p>Each place decides who may pass, when, and with what proof. Every scan is judged against it and kept, with the reason.</p></div>
      <div className="stg stg-static">
        <div><b>{p.length}</b><span>Capture points</span></div>
        <div><b>{p.reduce((a, x) => a + x.allowed_today, 0)}</b><span>Passed today</span></div>
        <div className={p.some((x) => x.denied_today) ? 'stg-warn' : undefined}><b>{p.reduce((a, x) => a + x.denied_today, 0)}</b><span>Refused today</span></div>
        <div className={reqs.data?.length ? 'stg-warn' : undefined}><b>{reqs.data?.length ?? 0}</b><span>Waiting for approval</span></div>
      </div>
      <div className="fl-tabs" role="tablist" style={{ padding: 0 }}>
        {[['points', 'Places and rules'], ['test', 'Scan'], ['requests', 'Approvals'], ['log', 'Scan log'], ['enrol', 'Enrolment']].map(([id, label]) => (
          <button key={id} role="tab" className="fl-tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}{id === 'requests' && reqs.data?.length ? <small>{reqs.data.length}</small> : null}</button>))}
      </div>

      {tab === 'points' && (
        <div className="ac-grid">
          {p.map((x) => (
            <button key={x.point_id} type="button" className={`ac-card${x.pending ? ' ob-card-warn' : ''}`} onClick={() => setSel(x)}>
              <span className="ac-top"><span className="ob-icon klh-tile-brand"><Icon name={TYPE_ICON[x.point_type] ?? 'pin'} size={18} /></span>
                <span className="ob-text"><b>{x.point_name}</b><span>{words(x.point_type)}{x.point_type === 'Campus_Gate' || x.point_type === 'Library' ? '' : ` · ${x.hostel_name ?? ''}`}{x.zone_name ? `, ${x.zone_name}` : ''}</span></span></span>
              <span className="ac-methods">{x.methods.map((m) => <span key={m} className={`ac-m${x.proof?.includes(m) ? ' ac-m-on' : ''}`} title={x.proof?.includes(m) ? `${m}: accepted as proof` : `${m}: device present`}><Icon name={M_ICON[m] ?? 'check'} size={12} />{m}</span>)}</span>
              {x.who ? <span className="ac-rule">{WHO[x.who]} · {hours(x)}{x.open_from ? ` · outside: ${OUTSIDE[x.outside_hours!].toLowerCase()}` : ''}{x.pass_to_exit ? ' · pass needed to go out' : ''}</span> : <span className="ac-rule ac-none">No rule yet: scans are only recorded</span>}
              <span className="ac-foot"><span>{x.allowed_today} in today</span>{x.denied_today > 0 && <span className="tag tag-bad">{x.denied_today} refused</span>}{x.pending > 0 && <span className="tag tag-warn">{x.pending} waiting</span>}</span>
            </button>))}
        </div>)}
      {tab === 'test' && <ScanTest points={p} record={scanner} onScanned={() => { points.mutate(); reqs.mutate(); }} />}
      {tab === 'requests' && <Requests list={reqs.data ?? []} onDone={() => { reqs.mutate(); points.mutate(); }} />}
      {tab === 'log' && <ScanLog />}
      {tab === 'enrol' && <Enrolment canEnrol={['Security_Officer', 'Chief_Warden'].includes(s.role)} />}
      {sel && <PolicyPanel p={sel} edit={edit} onClose={() => setSel(null)} onDone={() => { setSel(null); points.mutate(); }} />}
    </div>
  );
}

function PolicyPanel({ p, edit, onClose, onDone }: { p: Point; edit: boolean; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ who: p.who ?? 'All_Hostellers', all_day: !p.open_from, open_from: p.open_from ?? '06:00', open_to: p.open_to ?? '22:00', outside_hours: p.outside_hours ?? 'Deny',
    pass_to_exit: !!p.pass_to_exit, methods: p.methods, proof: p.proof ?? p.methods.filter((m) => m !== 'Manual'), approver_role: p.approver_role ?? 'Floor_Warden', photo_on_entry: !!p.photo_on_entry });
  const { run, busy } = useAction();
  const toggle = (k: 'methods' | 'proof', m: string) => { const has = f[k].includes(m); const next = has ? f[k].filter((x) => x !== m) : [...f[k], m];
    setF(k === 'methods' ? { ...f, methods: next, proof: f.proof.filter((x) => next.includes(x)) } : { ...f, proof: next }); };
  const save = () => run(() => api(`/access/points/${p.point_id}/policy`, { method: 'POST', json: { who: f.who, open_from: f.all_day ? null : f.open_from, open_to: f.all_day ? null : f.open_to, outside_hours: f.outside_hours,
    pass_to_exit: f.pass_to_exit, proof: f.proof, approver_role: f.outside_hours === 'Need_Approval' ? f.approver_role : null, photo_on_entry: f.photo_on_entry, methods: f.methods } }).then(onDone), 'Rule saved; it applies to the next scan');
  return (
    <Drawer open onClose={onClose} title={p.point_name} subtitle={`${words(p.point_type)} · ${words(p.device_type)}${p.device_ref ? ` ${p.device_ref}` : ''}`}
      footer={edit ? <Button variant="primary" loading={busy} blockedReason={!f.proof.length ? 'Pick at least one proof.' : undefined} onClick={save}>Save rule</Button> : undefined}>
      <div className="klh-stack" style={{ gap: 16 }}>
        <div><p className="klh-overline" style={{ marginBottom: 6 }}>Methods at this point</p>
          <div className="ac-pick">{METHODS.map((m) => <button key={m} type="button" disabled={!edit} aria-pressed={f.methods.includes(m)} onClick={() => toggle('methods', m)}><Icon name={M_ICON[m]} size={13} />{m}</button>)}</div></div>
        <div><p className="klh-overline" style={{ marginBottom: 6 }}>Accepted as proof of who it is</p>
          <div className="ac-pick">{f.methods.map((m) => <button key={m} type="button" disabled={!edit} aria-pressed={f.proof.includes(m)} onClick={() => toggle('proof', m)}><Icon name={M_ICON[m]} size={13} />{m}</button>)}</div>
          <small className="klh-muted">Face, thumb and card work only for students enrolled on the device.</small></div>
        <Field label="Who may pass"><Select disabled={!edit} value={f.who} onChange={(e) => setF({ ...f, who: e.target.value })} options={Object.entries(WHO).map(([value, label]) => ({ value, label }))} /></Field>
        <Switch label="Open all day" checked={f.all_day} disabled={!edit} onChange={(v) => setF({ ...f, all_day: v })} />
        {!f.all_day && <>
          <div className="klh-grid-2"><Field label="Opens"><Input type="time" disabled={!edit} value={f.open_from} onChange={(e) => setF({ ...f, open_from: e.target.value })} /></Field><Field label="Closes"><Input type="time" disabled={!edit} value={f.open_to} onChange={(e) => setF({ ...f, open_to: e.target.value })} /></Field></div>
          <Field label="Outside these hours"><Select disabled={!edit} value={f.outside_hours} onChange={(e) => setF({ ...f, outside_hours: e.target.value })} options={Object.entries(OUTSIDE).map(([value, label]) => ({ value, label }))} /></Field>
          {f.outside_hours === 'Need_Approval' && <Field label="Approved by"><Select disabled={!edit} value={f.approver_role} onChange={(e) => setF({ ...f, approver_role: e.target.value })} options={['Floor_Warden', 'Warden', 'Chief_Warden', 'Security_Officer'].map((r) => ({ value: r, label: words(r) }))} /></Field>}
        </>}
        <Switch label="Going out needs an approved outing pass" checked={f.pass_to_exit} disabled={!edit} onChange={(v) => setF({ ...f, pass_to_exit: v })} />
        <Switch label="Keep a camera snapshot of each entry" description="The device keeps the image; only its reference is stored here" checked={f.photo_on_entry} disabled={!edit} onChange={(v) => setF({ ...f, photo_on_entry: v })} />
      </div>
    </Drawer>
  );
}

function ScanTest({ points, record, onScanned }: { points: Point[]; record: boolean; onScanned: () => void }) {
  const [f, setF] = useState({ student_id: '2600040021', point_id: String(points[0]?.point_id ?? ''), direction: 'In', method: 'QR', at: '' });
  const [v, setV] = useState<Verdict | null>(null);
  const { run, busy } = useAction();
  const pt = points.find((x) => String(x.point_id) === f.point_id);
  const body = () => ({ student_id: f.student_id.trim(), point_id: Number(f.point_id), direction: f.direction, method: f.method, at: f.at ? new Date(f.at).toISOString() : undefined });
  const tone = v ? VERDICT[v.verdict] : null;
  return (
    <div className="s360-two">
      <section className="box"><div className="box-head"><h2>Who is at which point</h2></div>
        <div className="box-body klh-stack" style={{ gap: 12 }}>
          <Field label="University ID"><Input value={f.student_id} onChange={(e) => setF({ ...f, student_id: e.target.value })} /></Field>
          <Field label="Point"><Select value={f.point_id} onChange={(e) => setF({ ...f, point_id: e.target.value })} options={points.map((x) => ({ value: String(x.point_id), label: x.point_name }))} /></Field>
          <div className="klh-grid-2">
            <Field label="Direction"><Select value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })} options={[{ value: 'In', label: 'Coming in' }, { value: 'Out', label: 'Going out' }]} /></Field>
            <Field label="Proof shown"><Select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} options={(pt?.methods ?? METHODS)} /></Field>
          </div>
          <Field label="At" hint="Empty means now; try 11 pm to see the night rule"><Input type="datetime-local" value={f.at} onChange={(e) => setF({ ...f, at: e.target.value })} /></Field>
          <div className="klh-row">
            <Button variant="secondary" loading={busy} onClick={() => run(async () => setV(await api<Verdict>('/access/check', { method: 'POST', json: body() })))}>Check only</Button>
            {record && <Button variant="primary" loading={busy} blockedReason={f.at ? 'A recorded scan is always now; clear the time.' : undefined} onClick={() => run(async () => { const r = await api<Verdict>('/access/scan', { method: 'POST', json: body() }); setV(r); onScanned(); toast(r.request ? 'Approval requested from the approver' : 'Scan recorded'); })}>Record the scan</Button>}
          </div>
        </div></section>
      <section className={`box ac-verdict ${tone ? `ac-${tone.tone}` : ''}`} aria-live="polite">
        {!v ? <div className="q-empty">The verdict appears here: allowed, needs approval, or refused, with the reason.</div> : <>
          <div className="ac-v-head"><span className="ac-v-icon"><Icon name={tone!.icon} size={26} /></span><div><b>{tone!.label}</b><span>{v.reason}</span></div></div>
          {v.student && <div className="facts" style={{ padding: '0 14px 14px' }}>
            <div><span>Student</span><b>{titleCase(v.student.full_name)}</b></div><div><span>Room</span><b>{v.student.room_code ? `${v.student.hostel_code} ${v.student.room_code}` : 'Not a resident'}</b></div>
            <div><span>Point</span><b>{pt?.point_name}</b></div><div><span>Proof</span><b>{f.method}</b></div></div>}
        </>}
      </section>
    </div>
  );
}

function Requests({ list, onDone }: { list: Req[]; onDone: () => void }) {
  const { run, busy } = useAction();
  const [why, setWhy] = useState<Record<number, string>>({});
  if (!list.length) return <div className="q-empty">No one is waiting for approval.</div>;
  return (
    <div className="klh-stack" style={{ gap: 10 }}>
      {list.map((r) => (
        <section key={r.request_id} className="box" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="klh-row" style={{ justifyContent: 'space-between' }}><b>{titleCase(r.full_name)}</b><span className="tag">{r.point_name}</span></div>
          <small className="klh-muted">{r.student_id}{r.room_code ? ` · ${r.hostel_code} ${r.room_code}` : ''} · asked {formatDateTime(r.requested_at)} · {r.reason}</small>
          <Input placeholder="Note (needed to refuse)" value={why[r.request_id] ?? ''} onChange={(e) => setWhy({ ...why, [r.request_id]: e.target.value })} />
          <div className="klh-row">
            <Button size="sm" variant="primary" icon="check" loading={busy} onClick={() => run(() => api(`/access/requests/${r.request_id}/decide`, { method: 'POST', json: { approve: true, remarks: why[r.request_id] || undefined } }).then(onDone), 'Approved for the next hour')}>Let in</Button>
            <Button size="sm" variant="secondary" loading={busy} blockedReason={!why[r.request_id] ? 'Write why first.' : undefined} onClick={() => run(() => api(`/access/requests/${r.request_id}/decide`, { method: 'POST', json: { approve: false, remarks: why[r.request_id] } }).then(onDone), 'Refused')}>Refuse</Button>
          </div>
        </section>))}
    </div>
  );
}

function ScanLog() {
  const log = useApi<Log[]>('/access/log');
  return (
    <section className="box"><div className="q">
      {(log.data ?? []).map((e) => { const t = VERDICT[e.verdict ?? 'Allowed'];
        return (
          <div key={e.event_id} className="q-row" style={{ cursor: 'default' }}>
            <span className={`q-av ac-${t.tone}-av`}><Icon name={t.icon} size={15} /></span>
            <span className="q-text"><b>{titleCase(e.full_name)} · {e.direction === 'In' ? 'in at' : 'out at'} {e.point_name}</b><span>{formatDateTime(e.event_at)} · {e.method ?? 'scan'}{e.confidence ? ` (${e.confidence}% match)` : ''} · {e.verdict_reason ?? 'recorded'}</span></span>
            <span className={`tag tag-${t.tone === 'ok' ? 'ok' : t.tone === 'warn' ? 'warn' : 'bad'}`}>{t.label}</span>
          </div>); })}
      {log.data && !log.data.length && <div className="q-empty">No scans in the last week.</div>}
    </div></section>
  );
}

function Enrolment({ canEnrol }: { canEnrol: boolean }) {
  const list = useApi<Enrol[]>('/access/enrolment');
  const { run, busy } = useAction();
  const rows = list.data ?? [];
  const n = (k: 'card' | 'face' | 'thumb') => rows.filter((r) => r[k]).length;
  const enrol = (r: Enrol, method: string) => run(() => api('/access/enrol', { method: 'POST', json: { student_id: r.student_id, method, template_ref: `VND-${method}-${r.student_id}` } }).then(() => list.mutate()), `${method} enrolled`);
  return (
    <>
      <div className="stg stg-static"><div><b>{rows.length}</b><span>Residents</span></div><div><b>{n('card')}</b><span>Card</span></div><div><b>{n('face')}</b><span>Face</span></div><div><b>{n('thumb')}</b><span>Thumb</span></div></div>
      <p className="klh-muted" style={{ margin: 0, fontSize: 12.5 }}>Face and thumb templates stay on the devices; this list keeps only a reference. Tracking needs the student's consent on record.</p>
      <section className="box"><div className="q">
        {rows.map((r) => (
          <div key={r.student_id} className="q-row" style={{ cursor: 'default', gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
            <span className="q-text"><b>{titleCase(r.full_name)}</b><span>{r.student_id} · {r.hostel_code} {r.room_code}{r.consent ? '' : ' · no tracking consent'}</span></span>
            <span className="klh-row" style={{ gap: 4 }}>{(['Card', 'Face', 'Thumb'] as const).map((m) => { const has = r[m.toLowerCase() as 'card'];
              return has ? <span key={m} className="tag tag-ok"><Icon name={M_ICON[m]} size={11} />{m}</span>
                : canEnrol ? <button key={m} type="button" className="tag" style={{ cursor: 'pointer', border: '1px dashed var(--border)' }} disabled={busy} onClick={() => enrol(r, m)}>+ {m}</button> : <span key={m} className="tag">{m}: no</span>; })}</span>
          </div>))}
      </div></section>
    </>
  );
}
