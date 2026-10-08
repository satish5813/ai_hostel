import { useEffect, useState } from 'react';
import { ArrowRight, GitPullRequestArrow, Plus } from 'lucide-react';
import { Button, ConfirmDialog, Drawer, Field, Input, Notice, Select, formatDateTime } from '@/lib/klh';
import { api, ApiError } from '@/lib/api';
import { bedLabel } from '@/lib/beds';
import { toast, useApi, useSession } from '@/lib/ui';
import { Chip, HostelPills, RaHead, proper, useHostel } from '@/pages/office/ra-kit';
import { KIND } from './Overview';

type Exc = {
  exception_id: number; kind: string; status: string; facility_id: string; hostel_code: string; reason: string; requested_at: string; requested_by: string; requested_by_name: string;
  decided_at: string | null; decided_by_name: string | null; decision_remarks: string | null; key_no: string | null; registration_no: string | null; waitlist_no: number | null; applied_type: string | null;
  student_id: string | null; student_name: string | null; programme: string | null; staff_id: string | null; staff_name: string | null; staff_designation: string | null;
  bed_label: string; floor_name: string | null; bed_type: string | null; block_reason: string | null; reserved_for: string | null; from_bed: string | null;
};
const STATUS_TONE: Record<string, 'ok' | 'crit' | 'neu' | 'warn'> = { Approved: 'ok', Refused: 'crit', Cancelled: 'neu', Pending: 'warn' };

/**
 * Exceptions (CW-03). Room Allotment asks for a bed outside the rules, a move to another bed, or a staff room; the Chief
 * Warden of the hostel approves or refuses. An approval takes effect at once: the bed is offered, the student is moved,
 * or the staff member gets the room.
 */
export default function Exceptions() {
  const s = useSession()!;
  const cw = s.role === 'Chief_Warden' || s.role === 'Director_Hostels';
  const H = useHostel();
  const [tab, setTab] = useState<'Pending' | 'done'>('Pending');
  const list = useApi<Exc[]>(`/exceptions${H.id ? `?facility_id=${H.id}` : ''}`);
  const rows = (list.data ?? []).filter((e) => (tab === 'Pending' ? e.status === 'Pending' : e.status !== 'Pending'));
  const waiting = (list.data ?? []).filter((e) => e.status === 'Pending').length;
  const [refuse, setRefuse] = useState<Exc | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(0);

  const act = async (e: Exc, path: string, body: unknown, done: string) => {
    setBusy(e.exception_id);
    try { await api(`/exceptions/${e.exception_id}/${path}`, { method: 'POST', json: body }); toast(done); list.mutate(); H.reload(); }
    catch (x) { toast(x instanceof ApiError ? x.message : String(x), 'critical'); } finally { setBusy(0); }
  };

  return (
    <div className="ra-main ex">
      <RaHead eyebrow={cw ? 'Chief Warden · decisions' : 'Room Allotment · requests to the Chief Warden'} tone="#C2410C" title="Exceptions"
        sub={cw ? 'Beds outside the rules, moves and staff rooms that Room Allotment asks for. Approving carries it out at once.' : 'A blocked or kept room, another room type, a jump in the waiting list, a move or a staff room needs the Chief Warden.'}
        right={<HostelPills list={H.list} value={H.id} onPick={H.pick} />} />
      <div className="ex-tools">
        <div className="ra-seg" role="tablist" aria-label="Show">
          <button type="button" role="tab" aria-selected={tab === 'Pending'} className={tab === 'Pending' ? 'ra-on' : undefined} onClick={() => setTab('Pending')}>Waiting{waiting ? ` (${waiting})` : ''}</button>
          <button type="button" role="tab" aria-selected={tab === 'done'} className={tab === 'done' ? 'ra-on' : undefined} onClick={() => setTab('done')}>Decided</button>
        </div>
        <span className="av-gap" />
        <Button size="sm" variant="primary" onClick={() => setAdding(true)}><Plus size={15} />New request</Button>
      </div>
      {!cw && <p className="ex-hint">To offer a bed outside the rules, use the allotment desk: it asks the Chief Warden for you.</p>}
      {!list.data && <div className="q-empty">Loading…</div>}
      {list.data && !rows.length && <div className="q-empty">{tab === 'Pending' ? (cw ? 'Nothing waits for your decision.' : 'No request is waiting.') : 'No decided requests yet.'}</div>}
      <div className="ex-list">
        {rows.map((e) => {
          const who = e.student_name ?? e.staff_name;
          const mine = e.requested_by === s.id;
          return (
            <article key={e.exception_id} className={`ex-card ex-${e.status.toLowerCase()}`}>
              <header>
                <Chip tone="warn">{KIND[e.kind] ?? e.kind}</Chip>
                <span className="ra-mono ex-no">#{e.exception_id} · {e.hostel_code}</span>
                <span className="av-gap" />
                {e.status !== 'Pending' && <Chip tone={STATUS_TONE[e.status]}>{e.status}</Chip>}
              </header>
              <div className="ex-who">
                <b>{proper(who)}</b>
                <small>{e.staff_id ? `${e.staff_designation ?? 'Staff'} · ${e.staff_id}` : `${e.student_id}${e.programme ? ` · ${e.programme}` : ''}${e.registration_no ? ` · ${e.registration_no}` : ''}`}</small>
              </div>
              <div className="ex-bed">
                {e.from_bed && <><span className="ra-mono">{e.from_bed}</span><ArrowRight size={14} /></>}
                <span className="ra-mono ex-to">{e.bed_label}</span>
                <small>{[e.floor_name, e.bed_type].filter(Boolean).join(' · ')}{e.key_no ? ` · key ${e.key_no}` : ''}</small>
              </div>
              {(e.kind === 'Other_Room_Type' && e.applied_type) && <p className="ex-fact">Applied for <b>{e.applied_type}</b>, this bed is <b>{e.bed_type}</b>.</p>}
              {(e.kind === 'Blocked_Room' && e.block_reason) && <p className="ex-fact">Room blocked for <b>{e.block_reason.replace(/_/g, ' ').toLowerCase()}</b>.</p>}
              {(e.kind === 'Reserved_Room' && e.reserved_for) && <p className="ex-fact">Room kept for <b>{e.reserved_for.toLowerCase()}</b>.</p>}
              <blockquote>{e.reason}</blockquote>
              <footer>
                <small>Asked by {e.requested_by_name} · {formatDateTime(e.requested_at)}{e.decided_at ? ` · ${e.status.toLowerCase()} by ${e.decided_by_name} · ${formatDateTime(e.decided_at)}` : ''}</small>
                {e.decision_remarks && <small className="ex-remark">“{e.decision_remarks}”</small>}
                {e.status === 'Pending' && (
                  <span className="ex-act">
                    {cw && !mine && <>
                      <Button size="sm" variant="secondary" disabled={busy === e.exception_id} onClick={() => setRefuse(e)}>Refuse</Button>
                      <Button size="sm" variant="primary" loading={busy === e.exception_id} onClick={() => act(e, 'decide', { decision: 'Approved' }, e.kind === 'Transfer' ? 'Approved: the student is moved' : e.kind === 'Staff_Room' ? 'Approved: the room is given' : 'Approved: the bed is offered to the student')}>Approve</Button>
                    </>}
                    {mine && <Button size="sm" variant="ghost" loading={busy === e.exception_id} onClick={() => act(e, 'cancel', {}, 'Request withdrawn')}>Withdraw</Button>}
                  </span>)}
              </footer>
            </article>);
        })}
      </div>
      <ConfirmDialog open={!!refuse} title={`Refuse request #${refuse?.exception_id ?? ''}?`} body="Room Allotment sees your reason. Nothing changes in the rooms." tone="danger" confirmLabel="Refuse" requireRemarks remarksLabel="Why?"
        onCancel={() => setRefuse(null)} onConfirm={(remarks) => { const e = refuse!; setRefuse(null); act(e, 'decide', { decision: 'Refused', remarks }, 'Refused'); }} />
      {adding && <NewRequest facility={H.id} hostelCode={H.hostel?.hostel_code ?? ''} cw={cw} onClose={() => setAdding(false)} onDone={() => { list.mutate(); setTab(cw ? 'done' : 'Pending'); }} />}
    </div>
  );
}

type Stay = { hostel_alloc_id: number; student_id: string; full_name: string; bed_label: string; type_name: string | null };
type Staff = { staff_id: string; full_name: string; designation: string | null };
type VBed = { subspace_id: string; room_code: string; bed_code: string; floor_name: string; type_name: string | null; is_blocked: boolean; room_status: string };

function NewRequest({ facility, hostelCode, cw, onClose, onDone }: { facility: string; hostelCode: string; cw: boolean; onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState<'Transfer' | 'Staff_Room'>('Transfer');
  const [q, setQ] = useState('');
  const [stays, setStays] = useState<Stay[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [stay, setStay] = useState<Stay | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const beds = useApi<VBed[]>(facility ? `/beds?facility_id=${facility}&bed_status=Vacant` : null);
  const [bed, setBed] = useState('');
  const [key, setKey] = useState('');
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = q.trim(); if (t.length < 2) { setStays([]); setStaffs([]); return; }
    const id = setTimeout(() => {
      if (kind === 'Transfer') api<Stay[]>(`/stays?facility_id=${facility}&q=${encodeURIComponent(t)}`).then(setStays).catch(() => setStays([]));
      else api<Staff[]>(`/staff?q=${encodeURIComponent(t)}`).then((r) => setStaffs(r.slice(0, 8))).catch(() => setStaffs([]));
    }, 250);
    return () => clearTimeout(id);
  }, [q, kind, facility]);
  const open = (beds.data ?? []).filter((b) => b.room_status !== 'Under_Maintenance');
  const who = kind === 'Transfer' ? stay : staff;
  const send = async () => {
    setBusy(true); setProblem('');
    try {
      const r = await api<{ status: string }>('/exceptions', { method: 'POST', json: { kind, subspace_id: bed, reason: reason.trim(), key_no: key.trim() || undefined,
        ...(kind === 'Transfer' ? { from_alloc_id: stay!.hostel_alloc_id } : { staff_id: staff!.staff_id }) } });
      toast(r.status === 'Approved' ? (kind === 'Transfer' ? 'Done: the student is moved' : 'Done: the room is given') : 'Sent to the Chief Warden'); onDone(); onClose();
    } catch (x) { setProblem(x instanceof ApiError ? x.message : String(x)); } finally { setBusy(false); }
  };
  return (
    <Drawer open onClose={onClose} title="New request" subtitle={cw ? `${hostelCode} · as Chief Warden this takes effect at once` : `${hostelCode} · goes to the Chief Warden`}
      footer={<div className="dm-panel-foot"><span style={{ flex: 1 }} /><Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" loading={busy} blockedReason={!who ? (kind === 'Transfer' ? 'Choose the student.' : 'Choose the staff member.') : !bed ? 'Choose the bed.' : kind === 'Staff_Room' && !key.trim() ? 'Give the key number.' : reason.trim().length < 5 ? 'Write the reason.' : undefined} onClick={send}>
          {cw ? 'Do it now' : 'Send to the Chief Warden'}</Button></div>}>
      <div className="klh-stack" style={{ gap: 16 }}>
        {problem && <Notice tone="critical" title="Not sent">{problem}</Notice>}
        <div className="lg-roles" role="radiogroup" aria-label="Request">
          <button type="button" role="radio" aria-checked={kind === 'Transfer'} onClick={() => { setKind('Transfer'); setQ(''); setStaff(null); }}><b>Move a student</b><small>To another bed in this hostel</small></button>
          <button type="button" role="radio" aria-checked={kind === 'Staff_Room'} onClick={() => { setKind('Staff_Room'); setQ(''); setStay(null); }}><b>Staff room</b><small>A bed for resident faculty or staff</small></button>
        </div>
        {who ? (
          <div className="lg-picked"><span><b>{proper(who.full_name)}</b><small>{kind === 'Transfer' ? `${stay!.student_id} · now in ${stay!.bed_label}` : `${staff!.staff_id}${staff!.designation ? ` · ${staff!.designation}` : ''}`}</small></span>
            <Button size="sm" variant="ghost" onClick={() => { setStay(null); setStaff(null); }}>Change</Button></div>
        ) : (
          <Field label={kind === 'Transfer' ? 'Student' : 'Staff member'} required hint={kind === 'Transfer' ? 'Name, ID or bed, in this hostel' : 'Name or employee ID'}>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" autoFocus />
            {(kind === 'Transfer' ? stays.length : staffs.length) > 0 && (
              <div className="lg-found">
                {kind === 'Transfer' ? stays.map((x) => <button key={x.hostel_alloc_id} type="button" onClick={() => { setStay(x); setQ(''); }}><b>{proper(x.full_name)}</b><small>{x.student_id} · {x.bed_label}</small></button>)
                  : staffs.map((x) => <button key={x.staff_id} type="button" onClick={() => { setStaff(x); setQ(''); }}><b>{proper(x.full_name)}</b><small>{x.staff_id}{x.designation ? ` · ${x.designation}` : ''}</small></button>)}
              </div>)}
          </Field>)}
        <Field label="To bed" required hint={`${open.length} vacant beds in ${hostelCode}`}>
          <Select value={bed} onChange={(e) => setBed(e.target.value)} options={[{ value: '', label: 'Choose a vacant bed' }, ...open.map((b) => ({ value: b.subspace_id, label: `${bedLabel(hostelCode, b.room_code, b.bed_code)} · ${b.floor_name}${b.type_name ? ` · ${b.type_name}` : ''}${b.is_blocked ? ' · blocked room' : ''}` }))]} />
        </Field>
        <Field label="Key number" required={kind === 'Staff_Room'} hint={kind === 'Transfer' ? 'Leave empty to keep the present key number' : undefined}><Input value={key} onChange={(e) => setKey(e.target.value)} /></Field>
        <Field label="Reason" required hint="The Chief Warden reads this"><textarea className="ex-text" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <p className="ex-hint" style={{ margin: 0 }}><GitPullRequestArrow size={13} /> The student keeps the fee plan; the electricity meter follows the move.</p>
      </div>
    </Drawer>
  );
}
