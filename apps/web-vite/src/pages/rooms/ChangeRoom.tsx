import { useMemo, useState } from 'react';
import { ArrowLeftRight, ArrowRight, BedDouble, CheckCircle2, Circle, Clock, Snowflake, Users, XCircle } from 'lucide-react';
import { Button } from '@/lib/klh';
import { api } from '@/lib/api';
import { toast, useApi } from '@/lib/ui';
import { RoomChangeStatement, day, inr, type Statement } from './Statement';

type Stay = { bed_label: string; room_code: string; floor_name: string; hostel_name: string; type_name: string; room_type_id: number; sharing_count: number; is_ac: boolean; hostel_fee: number | null };
type RType = { room_type_id: number; type_name: string; sharing_count: number; is_ac: boolean; attached_bath: boolean; hostel_fee: number; free_beds: number };
type Step = { level: number; approver_role: string; decision: string; decided_on: string | null; remarks: string | null; acted_by_name: string | null; step_name: string | null };
export type Change = { change_id: number; change_no: string; status: string; kind: string; reason: string; requested_at: string; move_date: string | null; from_bed: string; from_type: string;
  to_bed: string | null; to_type: string; to_floor: string | null; hostel_adjustment: number | null; refund_due: number; elec_amount: number | null; statement: Statement | null; steps: Step[];
  waiting_for: string | null; approved_by_name: string | null; moved_by_name: string | null; arranged?: boolean };
type Mine = { stay: Stay | null; types: RType[]; requests: Change[] };
type Bed = { subspace_id: string; bed_label: string; bed_code: string; room_code: string; floor_name: string; floor_no: number; sharing_count: number; occupied: number };

export const RC_STATUS: Record<string, { label: string; tone: 'warn' | 'good' | 'bad' | 'muted' }> = {
  Pending_FW: { label: 'With the Floor Manager', tone: 'warn' }, Pending_CW: { label: 'With the Chief Manager', tone: 'warn' }, Approved: { label: 'Approved: to move', tone: 'good' },
  Moved: { label: 'Moved', tone: 'good' }, Rejected: { label: 'Not approved', tone: 'bad' }, Cancelled: { label: 'Cancelled', tone: 'muted' },
};

/** The path of a request: Floor Manager, Chief Manager, the move. */
export function RcTimeline({ c }: { c: Pick<Change, 'status' | 'steps' | 'move_date' | 'moved_by_name' | 'requested_at' | 'arranged'> }) {
  const moved = c.status === 'Moved';
  const items = [
    { label: c.arranged ? 'Arranged by the Chief Manager' : 'Asked', done: true, sub: day(c.requested_at), bad: false },
    ...c.steps.map((s) => ({ label: s.approver_role === 'Floor_Warden' ? 'Floor Manager' : 'Chief Manager', done: s.decision === 'Approved', bad: s.decision === 'Rejected',
      sub: s.decision === 'Pending' ? 'Waiting' : s.decision === 'Skipped' ? 'Not needed' : `${s.decision === 'Rejected' ? 'Not approved' : 'Approved'}${s.acted_by_name ? ` · ${s.acted_by_name}` : ''} · ${day(s.decided_on)}${s.remarks ? ` · “${s.remarks}”` : ''}` })),
    { label: 'Moved and settled', done: moved, bad: false, sub: moved ? `${day(c.move_date)}${c.moved_by_name ? ` · ${c.moved_by_name}` : ''}` : c.status === 'Approved' ? 'On the day of the move' : '' },
  ];
  return (
    <ol className="rc-time">{items.map((it, i) => (
      <li key={i} className={it.bad ? 'rc-bad' : it.done ? 'rc-done' : ''}>
        {it.bad ? <XCircle size={18} /> : it.done ? <CheckCircle2 size={18} /> : i === items.findIndex((x) => !x.done && !x.bad) ? <Clock size={18} /> : <Circle size={18} />}
        <span><b>{it.label}</b>{it.sub && <small>{it.sub}</small>}</span>
      </li>))}</ol>
  );
}

/**
 * RCH-02 Change room. The student asks for another room type or another room of the same type in their hostel, picks a
 * free bed (or leaves it to the Chief Manager), and sees what it does to the hostel fee and electricity before sending.
 * The Floor Manager and then the Chief Manager approve; on the day the warden moves the student and settles the money.
 */
export default function ChangeRoom() {
  const r = useApi<Mine>('/me/room-change');
  const d = r.data;
  const open = d?.requests.find((x) => ['Pending_FW', 'Pending_CW', 'Approved'].includes(x.status));
  const past = d?.requests.filter((x) => x !== open) ?? [];
  if (!d) return <div className="st"><p className="st-empty">Loading…</p></div>;
  if (!d.stay) return <div className="st"><section className="st-panel"><h2>Change room</h2><p className="st-empty">You can ask for another room once you live in a hostel.</p></section></div>;
  return (
    <div className="st rc">
      <section className="st-panel mn-head">
        <div className="mn-title"><span className="st-ico mn-ico"><ArrowLeftRight size={20} /></span>
          <span><h1>Change room</h1><small>Now in {d.stay.bed_label} · {d.stay.type_name} · {d.stay.floor_name}, {d.stay.hostel_name}</small></span></div>
        {d.stay.hostel_fee != null && <div className="mn-chips"><span>{inr(d.stay.hostel_fee)} a year</span></div>}
      </section>
      {open ? <OpenRequest c={open} onChange={() => r.mutate()} /> : <NewRequest d={d} onDone={() => r.mutate()} />}
      {past.length > 0 && (
        <section className="st-panel">
          <h2>Earlier requests</h2>
          <ul className="rc-past">{past.map((c) => (
            <li key={c.change_id}>
              <details>
                <summary><span><b>{c.change_no}</b> · {c.from_bed} <ArrowRight size={12} /> {c.to_bed ?? c.to_type}<small>{day(c.requested_at)} · {c.reason}</small></span>
                  <span className={`xd-pill xd-t-${RC_STATUS[c.status]?.tone === 'muted' ? 'warn' : RC_STATUS[c.status]?.tone}`}>{RC_STATUS[c.status]?.label ?? c.status}</span></summary>
                <RcTimeline c={c} />
                {c.statement && <RoomChangeStatement s={c.statement} final />}
              </details>
            </li>))}</ul>
        </section>)}
    </div>
  );
}

function OpenRequest({ c, onChange }: { c: Change; onChange: () => void }) {
  const det = useApi<{ statement: Statement | null }>(`/room-changes/${c.change_id}`);
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    if (!window.confirm('Cancel this room change request?')) return;
    setBusy(true);
    try { await api(`/me/room-change/${c.change_id}/cancel`, { method: 'POST' }); toast('Request cancelled'); onChange(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  const st = RC_STATUS[c.status];
  return (
    <>
      <section className="st-panel rc-open">
        <header className="rc-open-h">
          <span><small>{c.change_no}</small><b>{c.from_bed} <ArrowRight size={15} /> {c.to_bed ?? `a ${c.to_type} bed`}</b><small>{c.from_type} <ArrowRight size={11} /> {c.to_type}{c.to_floor ? ` · ${c.to_floor}` : ''}</small></span>
          <span className={`xd-pill xd-t-${st.tone === 'muted' ? 'warn' : st.tone}`}>{st.label}</span>
        </header>
        <p className="rc-reason">“{c.reason}”</p>
        <RcTimeline c={c} />
        {c.status === 'Approved' && <p className="rc-hint"><CheckCircle2 size={16} />Approved. Your bed {c.to_bed} is kept for you. Your Floor Manager will read the room's meter, take your old key and give you the new one on the day you move.</p>}
        <div className="rc-acts"><Button variant="secondary" loading={busy} onClick={cancel}>Cancel request</Button></div>
      </section>
      {det.data?.statement && <section className="st-panel"><h2>Fee and electricity</h2><RoomChangeStatement s={det.data.statement} /></section>}
    </>
  );
}

function NewRequest({ d, onDone }: { d: Mine; onDone: () => void }) {
  const stay = d.stay!;
  const [kind, setKind] = useState<'Room_Type' | 'Same_Type' | null>(null);
  const [type, setType] = useState<number | null>(null);
  const [bed, setBed] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const typeId = kind === 'Same_Type' ? stay.room_type_id : type;
  const beds = useApi<Bed[]>(typeId ? `/me/room-change/beds?type=${typeId}` : null);
  const preview = useApi<Statement>(typeId ? `/me/room-change/preview?type=${typeId}` : null);
  const floors = useMemo(() => {
    const m = new Map<string, Map<string, Bed[]>>();
    (beds.data ?? []).forEach((b) => { const f = m.get(b.floor_name) ?? new Map(); f.set(b.room_code, [...(f.get(b.room_code) ?? []), b]); m.set(b.floor_name, f); });
    return [...m.entries()];
  }, [beds.data]);
  const others = d.types.filter((t) => t.room_type_id !== stay.room_type_id);
  const same = d.types.find((t) => t.room_type_id === stay.room_type_id);
  const pick = (k: 'Room_Type' | 'Same_Type') => { setKind(k); setType(null); setBed(null); };
  const send = async () => {
    setBusy(true);
    try {
      const x = await api<{ change_no: string }>('/me/room-change', { method: 'POST', json: { kind, to_room_type_id: typeId, to_subspace_id: bed, reason } });
      toast(`Request ${x.change_no} sent to your Floor Manager`); onDone();
    } catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  const blocked = !typeId ? 'Choose the room type.' : reason.trim().length < 10 ? 'Say why in a sentence.' : undefined;
  return (
    <>
      <section className="st-panel">
        <h2>1. What would you like?</h2>
        <div className="rc-kinds">
          <button type="button" aria-pressed={kind === 'Room_Type'} onClick={() => pick('Room_Type')} disabled={!others.length}>
            <ArrowLeftRight size={22} /><b>Another room type</b><small>{others.length ? others.map((t) => t.type_name).join(', ') : 'No other room type in this hostel'}</small></button>
          <button type="button" aria-pressed={kind === 'Same_Type'} onClick={() => pick('Same_Type')}>
            <BedDouble size={22} /><b>Another room, same type</b><small>{stay.type_name}{same ? ` · ${same.free_beds} free beds` : ''}</small></button>
        </div>
      </section>

      {kind === 'Room_Type' && (
        <section className="st-panel">
          <h2>2. Room type</h2>
          <div className="rc-types">{others.map((t) => { const diff = t.hostel_fee - (stay.hostel_fee ?? t.hostel_fee); return (
            <button key={t.room_type_id} type="button" aria-pressed={type === t.room_type_id} disabled={!t.free_beds} onClick={() => { setType(t.room_type_id); setBed(null); }}>
              <b>{t.type_name}</b>
              <span className="rc-type-meta"><span><Users size={14} />{t.sharing_count} in a room</span>{t.is_ac && <span><Snowflake size={14} />AC</span>}{t.attached_bath && <span>Attached bath</span>}</span>
              <span className="rc-fee">{inr(t.hostel_fee)}<small> a year</small></span>
              <small className={diff > 0 ? 'rc-up' : diff < 0 ? 'rc-down' : ''}>{diff > 0 ? `${inr(diff)} more a year` : diff < 0 ? `${inr(-diff)} less a year` : 'Same fee'} · {t.free_beds} free beds</small>
            </button>); })}</div>
        </section>)}

      {typeId && (
        <section className="st-panel">
          <h2>{kind === 'Room_Type' ? '3' : '2'}. Choose a bed <small className="rc-opt">or leave it to the Chief Manager</small></h2>
          {!beds.data && <p className="st-empty">Loading free beds…</p>}
          {beds.data && !beds.data.length && <p className="st-empty">No free bed of this type now. You can still ask; the Chief Manager will give one when it is free.</p>}
          <div className="rc-floors">{floors.map(([f, rooms]) => (
            <div key={f} className="rc-floor"><h4>{f}</h4>
              <div className="rc-rooms">{[...rooms.entries()].map(([room, bs]) => (
                <div key={room} className="rc-room"><span className="rc-room-n">Room {room}<small>{bs[0].occupied} of {bs[0].sharing_count} taken</small></span>
                  <span className="rc-beds">{bs.map((b) => (
                    <button key={b.subspace_id} type="button" aria-pressed={bed === b.subspace_id} onClick={() => setBed(bed === b.subspace_id ? null : b.subspace_id)} aria-label={`Bed ${b.bed_label}`}>Bed {b.bed_code}</button>))}</span>
                </div>))}</div>
            </div>))}</div>
          {bed && <p className="rc-hint"><BedDouble size={16} />You asked for {beds.data?.find((b) => b.subspace_id === bed)?.bed_label}. The Chief Manager may give another bed of the same type.</p>}
        </section>)}

      {typeId && (
        <section className="st-panel">
          <h2>{kind === 'Room_Type' ? '4' : '3'}. Why?</h2>
          <textarea className="rc-why" rows={3} maxLength={600} value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="For example: my roommates study late and I cannot sleep; I would like a 2-sharing room to prepare for exams." />
          {preview.data && <><h3 className="rc-h3">What it means for your fees</h3><RoomChangeStatement s={preview.data} /></>}
          {preview.error && <p className="st-empty">{(preview.error as Error).message}</p>}
          <div className="rc-acts"><Button variant="primary" loading={busy} blockedReason={blocked} onClick={send}>Send to my Floor Manager</Button></div>
          <p className="rc-small">The Floor Manager of your floor approves first, then the Chief Manager. You can cancel until you move.</p>
        </section>)}
    </>
  );
}
