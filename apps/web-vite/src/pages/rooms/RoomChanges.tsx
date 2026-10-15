import { useState } from 'react';
import { ArrowRight, Gauge, KeyRound, Search } from 'lucide-react';
import { Button, Drawer, Field, Input, SegmentedControl, Select, StatCard, Textarea } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, toast, useApi, useSession } from '@/lib/ui';
import { RoomChangeStatement, day, inr, type Statement } from './Statement';
import { RC_STATUS, RcTimeline, type Change } from './ChangeRoom';

type Row = Omit<Change, 'statement' | 'steps'> & { student_id: string; name: string; programme: string; hostel_name: string; from_floor: string };
type List = { rows: Row[]; counts: { pending_fw: number; pending_cw: number; to_move: number; moved_month: number; extra_fee: number; refunds: number } };
type Detail = Change & { student_id: string; name: string; programme: string; hostel_name: string; from_floor: string; to_subspace_id: string | null; to_room_type_id: number;
  can: { decide?: boolean; bed?: boolean; complete?: boolean }; beds: FreeBed[];
  meter: { meter_no: string; meter_type: string; last_reading: number | null; last_at: string | null } | null };
type FreeBed = { subspace_id: string; bed_label: string; floor_name: string; occupied: number; sharing_count: number; room_type_id: number; type_name: string; hostel_fee: number | null };
const CW_ROLES = ['Chief_Warden', 'Director_Hostels', 'admin'];
/** Free beds as select options, with the room type and its yearly fee. */
const bedOptions = (beds: FreeBed[]) => beds.map((b) => ({ value: b.subspace_id, label: `${b.type_name}${b.hostel_fee ? ` (${inr(b.hostel_fee)}/yr)` : ''} · ${b.bed_label} · ${b.floor_name} · ${b.occupied} of ${b.sharing_count} taken` }));
type Filter = 'open' | 'Moved' | 'refund' | 'closed' | '';
const WAIT: Record<string, string> = { Floor_Warden: 'Floor Manager', Chief_Warden: 'Chief Manager' };

/**
 * RCH-01 Room changes. Students' requests for another room in the hostel: the Floor Manager approves first, the Chief
 * Warden gives the bed and approves; on the day the Floor Manager (or Chief Manager) reads the old room's meter, hands over
 * the key and moves the student, and the hostel fee and electricity are settled. Accounts see the refunds due.
 */
export default function RoomChanges() {
  const [f, setF] = useState<Filter>('open');
  const r = useApi<List>(`/room-changes?status=${f === 'closed' ? 'Rejected' : f}`);
  const [open, setOpen] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const isCw = CW_ROLES.includes(useSession()?.role ?? '');
  const d = r.data;
  return (
    <div className="klh-stack rc-desk" style={{ gap: 16 }}>
      <ScreenHeader code="RCH-01" subtitle="Students asking for another room or room type: approve, give the bed, move them and settle the hostel fee and electricity."
        actions={isCw ? <Button variant="primary" icon="bed" onClick={() => setMoving(true)}>Move a student</Button> : undefined} />
      {d && (
        <div className="klh-grid-4">
          <StatCard color="amber" icon="eye" label="With the Floor Manager" value={String(d.counts.pending_fw)} sub="First approval" />
          <StatCard color="indigo" icon="settings" label="With the Chief Manager" value={String(d.counts.pending_cw)} sub="Bed and final approval" />
          <StatCard color="brand" icon="check" label="Approved, to move" value={String(d.counts.to_move)} sub={`${d.counts.moved_month} moved this month`} />
          <StatCard color="rose" icon="gauge" label="Fee difference" value={inr(d.counts.extra_fee)} sub={`${inr(d.counts.refunds)} refunds due`} />
        </div>)}
      <section className="box rd-bar">
        <SegmentedControl label="Show" value={f} onChange={(v) => setF(v as Filter)}
          options={[{ value: 'open', label: 'Open' }, { value: 'Moved', label: 'Moved' }, { value: 'refund', label: 'Refund due' }, { value: 'closed', label: 'Not approved' }, { value: '', label: 'All' }]} />
      </section>
      {!d && <div className="q-empty">Loading…</div>}
      {d && !d.rows.length && <div className="box mm-empty"><b>Nothing here</b><p>No room change request in this list.</p></div>}
      <div className="rc-list">{d?.rows.map((c) => { const st = RC_STATUS[c.status]; return (
        <button key={c.change_id} type="button" className="box rc-card" onClick={() => setOpen(c.change_id)}>
          <span className="rc-who"><b>{c.name}</b><small>{c.student_id} · {c.programme}</small></span>
          <span className="rc-move"><b>{c.from_bed} <ArrowRight size={13} /> {c.to_bed ?? 'bed to give'}</b><small>{c.from_type}{c.from_type !== c.to_type ? ` → ${c.to_type}` : ' · same type'}</small></span>
          <span className="rc-why-s">{c.reason}<small>{c.change_no} · {day(c.requested_at)}</small></span>
          <span className="rc-state"><span className={`xd-pill xd-t-${st?.tone === 'muted' ? 'warn' : st?.tone ?? 'warn'}`}>{st?.label ?? c.status}</span>
            {c.status === 'Moved' && c.hostel_adjustment != null && <small>{Number(c.hostel_adjustment) > 0 ? `+${inr(c.hostel_adjustment)} fee` : Number(c.hostel_adjustment) < 0 ? `${inr(c.refund_due)} refund` : 'No fee change'}</small>}
            {c.waiting_for && <small>Waiting for {WAIT[c.waiting_for] ?? c.waiting_for}</small>}
            {c.arranged && <small>Arranged by the Chief Manager</small>}</span>
        </button>); })}</div>
      {open && <ChangeDrawer id={open} onClose={() => setOpen(null)} onDone={() => r.mutate()} />}
      {moving && <MoveDrawer onClose={() => setMoving(false)} onDone={(id) => { setMoving(false); r.mutate(); setOpen(id); }} />}
    </div>
  );
}

function ChangeDrawer({ id, onClose, onDone }: { id: number; onClose: () => void; onDone: () => void }) {
  const r = useApi<Detail>(`/room-changes/${id}`);
  const c = r.data;
  const [remarks, setRemarks] = useState('');
  const [reading, setReading] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try { await fn(); toast(msg); setRemarks(''); await r.mutate(); onDone(); } catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  const decide = (decision: 'Approved' | 'Rejected') => run(() => api(`/room-changes/${id}/decide`, { method: 'POST', json: { decision, remarks: remarks || null } }), decision === 'Approved' ? 'Approved' : 'Marked not approved');
  const setBed = (sub: string) => run(() => api(`/room-changes/${id}/bed`, { method: 'PUT', json: { subspace_id: sub } }), 'Bed given');
  const complete = () => run(() => api(`/room-changes/${id}/complete`, { method: 'POST', json: { meter_reading: reading ? Number(reading) : null, key_no: key || null } }), 'Moved; fee and electricity settled');
  const isCw = CW_ROLES.includes(useSession()?.role ?? '');
  // the Chief Manager's approval takes both steps when a bed is given
  const lastLevel = c?.steps.find((s) => s.decision === 'Pending')?.approver_role === 'Chief_Warden' || (isCw && !!c?.to_subspace_id);
  const footer = c && (c.can.decide ? (
    <div className="klh-row" style={{ gap: 8, flexWrap: 'wrap' }}>
      <Button variant="primary" icon="check" loading={busy} blockedReason={lastLevel && !c.to_subspace_id ? 'Give a bed first.' : undefined} onClick={() => decide('Approved')}>{lastLevel ? 'Approve and keep the bed' : 'Approve'}</Button>
      <Button variant="secondary" loading={busy} blockedReason={remarks.trim().length < 3 ? 'Write why in the remarks.' : undefined} onClick={() => decide('Rejected')}>Not approve</Button>
    </div>) : c.can.complete ? (
    <Button variant="primary" icon="check" loading={busy} blockedReason={c.meter && !reading ? 'Enter the meter reading of the old room.' : undefined} onClick={complete}>Move now and settle</Button>) : undefined);
  return (
    <Drawer open onClose={onClose} title={c ? `${c.name} · ${c.change_no}` : 'Room change'} subtitle={c ? `${c.student_id} · ${c.programme} · ${c.hostel_name}` : ''} footer={footer}>
      {!c && <p className="q-empty">Loading…</p>}
      {c && (
        <div className="rc-det">
          <div className="rc-det-move">
            <span><small>Now</small><b>{c.from_bed}</b><small>{c.from_type} · {c.from_floor}</small></span>
            <ArrowRight size={20} />
            <span><small>Asks for</small><b>{c.to_bed ?? 'No bed chosen'}</b><small>{c.to_type}{c.to_floor ? ` · ${c.to_floor}` : ''}</small></span>
          </div>
          <p className="rc-reason">“{c.reason}”</p>
          <RcTimeline c={c} />
          {c.can.bed && (
            <Field label="Bed to give" hint={`${c.beds.length} free beds of every room type in the hostel. Another room type changes the fee worked out below.`}>
              <Select value={c.to_subspace_id ?? ''} onChange={(e) => e.target.value && setBed(e.target.value)}
                options={[{ value: '', label: 'Choose a bed…' }, ...bedOptions(c.beds)]} />
            </Field>)}
          {c.can.decide && <Field label="Remarks" hint="Needed when not approving; the student sees them."><Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>}
          {c.can.complete && (
            <div className="rc-handover">
              <h4>On the day of the move</h4>
              <div className="rc-handover-f">
                {c.meter && <Field label={<><Gauge size={14} /> Old room meter {c.meter.meter_no}</>} hint={c.meter.last_reading != null ? `Last reading ${c.meter.last_reading} kWh on ${day(c.meter.last_at)}` : 'No reading yet'}>
                  <Input inputMode="decimal" value={reading} onChange={(e) => setReading(e.target.value)} placeholder="kWh now" /></Field>}
                <Field label={<><KeyRound size={14} /> New room key no.</>} hint="Leave blank to keep the key number"><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="K-208" /></Field>
              </div>
              <p className="rc-small">Moving frees the old bed, gives the new one, and settles the hostel fee and the electricity below at once.</p>
            </div>)}
          {c.statement && <><h4 className="rc-h3">{c.status === 'Moved' ? 'Settlement' : 'Fee and electricity if moved today'}</h4><RoomChangeStatement s={c.statement as Statement} final={c.status === 'Moved'} /></>}
        </div>)}
    </Drawer>
  );
}

/** The Chief Manager moves a hostel student of their building to any free bed of any room type, at once or approved for later. */
function MoveDrawer({ onClose, onDone }: { onClose: () => void; onDone: (changeId: number) => void }) {
  const [q, setQ] = useState('');
  const [sid, setSid] = useState<string | null>(null);
  const people = useApi<{ student_id: string; name: string; programme: string; bed_label: string; type_name: string; floor_name: string }[]>(sid ? null : `/room-changes/residents?q=${encodeURIComponent(q)}`);
  const opt = useApi<{ stay: { name: string; bed_label: string; type_name: string; floor_name: string; hostel_name: string }; beds: FreeBed[];
    meter: { meter_no: string; last_reading: number | null; last_at: string | null } | null; open: { change_no: string; status: string } | null }>(sid ? `/room-changes/options/${sid}` : null);
  const [bed, setBed] = useState('');
  const [reason, setReason] = useState('');
  const [now, setNow] = useState(true);
  const [reading, setReading] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const chosen = opt.data?.beds.find((b) => b.subspace_id === bed);
  const preview = useApi<Statement>(sid && chosen ? `/room-changes/preview/${sid}?type=${chosen.room_type_id}` : null);
  const save = async () => {
    setBusy(true);
    try {
      const r = await api<{ change_id: number; change_no: string; status: string }>('/room-changes/direct', { method: 'POST',
        json: { student_id: sid, to_subspace_id: bed, reason, move_now: now, meter_reading: now && reading ? Number(reading) : null, key_no: now ? key || null : null } });
      toast(r.status === 'Moved' ? `${r.change_no}: moved, fee and electricity settled` : `${r.change_no}: approved; bed held until the move`); onDone(r.change_id);
    } catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  const blocked = !sid ? 'Choose the student.' : !bed ? 'Choose the bed.' : reason.trim().length < 10 ? 'Write the reason.' : now && opt.data?.meter && !reading ? 'Enter the meter reading of the old room.' : undefined;
  return (
    <Drawer open onClose={onClose} title="Move a student" subtitle="Any residency student of your building to any free bed, without waiting for a request"
      footer={<Button variant="primary" icon="check" loading={busy} blockedReason={blocked} onClick={save}>{now ? 'Move now and settle' : 'Approve; move later'}</Button>}>
      <div className="rc-det">
        {!sid ? (
          <>
            <Field label="Student"><span className="rc-find"><Search size={16} /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, ID or room" autoFocus /></span></Field>
            <ul className="rc-people">{(people.data ?? []).map((p) => (
              <li key={p.student_id}><button type="button" onClick={() => setSid(p.student_id)}>
                <b>{p.name}</b><small>{p.student_id} · {p.bed_label} · {p.type_name} · {p.floor_name}</small></button></li>))}
              {people.data && !people.data.length && <li className="rc-small">No hostel student matches.</li>}</ul>
          </>) : opt.data && (
          <>
            <div className="rc-det-move">
              <span><small>Now</small><b>{opt.data.stay.bed_label}</b><small>{opt.data.stay.name} · {opt.data.stay.type_name} · {opt.data.stay.floor_name}</small></span>
              <ArrowRight size={20} />
              <span><small>Move to</small><b>{chosen?.bed_label ?? 'Choose a bed'}</b><small>{chosen?.type_name ?? ''}</small></span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setSid(null); setBed(''); }}>Choose another student</Button>
            {opt.data.open && <p className="rc-hint">The student's open request {opt.data.open.change_no} will be closed by this move.</p>}
            <Field label="Bed" hint={`${opt.data.beds.length} free beds of every room type in ${opt.data.stay.hostel_name}`}>
              <Select value={bed} onChange={(e) => setBed(e.target.value)} options={[{ value: '', label: 'Choose a bed…' }, ...bedOptions(opt.data.beds)]} /></Field>
            <Field label="Reason" hint="The student sees this."><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: room 214 needs ceiling repairs; moved until it is done." /></Field>
            <label className="rc-check"><input type="checkbox" checked={now} onChange={(e) => setNow(e.target.checked)} /> Move today (read the meter and hand over the key now)</label>
            {now && (
              <div className="rc-handover-f">
                {opt.data.meter && <Field label={<><Gauge size={14} /> Old room meter {opt.data.meter.meter_no}</>} hint={opt.data.meter.last_reading != null ? `Last ${opt.data.meter.last_reading} kWh on ${day(opt.data.meter.last_at)}` : 'No reading yet'}>
                  <Input inputMode="decimal" value={reading} onChange={(e) => setReading(e.target.value)} placeholder="kWh now" /></Field>}
                <Field label={<><KeyRound size={14} /> New room key no.</>} hint="Blank keeps the key number"><Input value={key} onChange={(e) => setKey(e.target.value)} /></Field>
              </div>)}
            {preview.data && <><h4 className="rc-h3">Fee and electricity</h4><RoomChangeStatement s={preview.data} /></>}
          </>)}
      </div>
    </Drawer>
  );
}
