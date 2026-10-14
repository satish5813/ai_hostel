import { useEffect, useMemo, useState } from 'react';
import { Button, ConfirmDialog, Drawer, Field, Icon, Input, Notice, Select, StatusChip, Stepper, formatDate, formatDateTime } from '@/lib/klh';
import { api, ApiError } from '@/lib/api';
import { bedLabel, titleCase, toast, useAction, useApi, useSession, words } from '@/lib/ui';
import { initials } from '@/ui/kit';
import { can } from '@/app/screens';
import { bedLetter } from '@/lib/beds';

export type Reg = { registration_id: number; registration_no: string; student_id: string; full_name: string; programme: string; gender: string; facility_id: string; hostel_code: string; room_type_id: number; type_name: string; status: string; applied_on: string; waitlist_no: number | null; registration_fee_status: string | null; offer_id: number | null; subspace_id: string | null; student_decision: string | null; hold_until: string | null; hostel_alloc_id: number | null; plan_status: string | null; plan_amount_due: string; plan_amount_paid: string; key_no: string | null; fee_check_status: string; fee_check_remarks: string | null; self_chosen: boolean | null; cw_status?: string };
export type Bed = { subspace_id: string; bed_code: string; bed_status: string; space_id: string; room_code: string; floor_name: string; zone_id: string; room_type_id: number; type_name: string; room_status: string; reserved_for: string; is_accessible: boolean; student_id: string | null; hostel_name: string; facility_id: string };
type HostelSum = { facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string; beds: number; open_beds: number; blocked_beds: number; held_beds: number; occupied_beds: number; waiting: number; to_verify: number };
type BoardBed = { subspace_id: string; bed_code: string; bed_status: string; student_id: string | null; full_name: string | null; programme: string | null };
type Block = { block_id: number; reason: string; remarks: string | null; blocked_by: string; blocked_on: string; until_date: string | null };
type Room = { space_id: string; room_code: string; room_status: string; room_type_id: number | null; type_name: string | null; sharing_count: number | null; is_ac: boolean | null; is_accessible: boolean | null; reserved_for: string | null; block: Block | null; beds: BoardBed[] };
type Floor = { zone_id: string; floor_name: string; floor_no: number; rooms: Room[] };

const REASONS = ['Management_Quota', 'Sports', 'International', 'Medical', 'Staff', 'Guest', 'Maintenance', 'Other'];
const BLOCKERS = ['Chief_Warden', 'Director_Hostels', 'Hostel_Incharge'];
const AUTO = ['Office_Staff', 'Room_Allotment', 'Chief_Warden', 'Hostel_Incharge'];
/** Pipeline stages of a registration, in the order the desk works them. */
const STAGES: { id: string; label: string; test: (r: Reg) => boolean; warn?: boolean }[] = [
  { id: 'wait', label: 'Waiting for a room', test: (r) => ['Fee_Paid', 'Waitlisted'].includes(r.status), warn: true },
  { id: 'applied', label: 'Registration fee due', test: (r) => r.status === 'Applied' },
  { id: 'offer', label: 'Offer with student', test: (r) => r.status === 'Allotted' },
  { id: 'fees', label: 'Hostel fees due', test: (r) => r.status === 'Accepted' },
  { id: 'check', label: 'Fee check and approval', test: (r) => r.status === 'Confirmed' && !(r.fee_check_status === 'Verified' && r.cw_status === 'Approved'), warn: true },
  { id: 'ready', label: 'Ready to check in', test: (r) => r.status === 'Confirmed' && r.fee_check_status === 'Verified' && r.cw_status === 'Approved' },
  { id: 'in', label: 'In rooms', test: (r) => r.status === 'Checked_In' },
];
const bedState = (b: BoardBed, room: Room) => (b.bed_status === 'Occupied' ? 'occ' : b.bed_status === 'Held' ? 'held' : b.bed_status === 'Damaged' || room.room_status === 'Under_Maintenance' ? 'dmg' : room.block ? 'blk' : 'open');
const shortType = (r: Room) => (r.sharing_count ? `${r.sharing_count} sharing${r.is_ac ? ' · AC' : ''}` : 'No type');
const bedNo = (code: string) => bedLetter(code);

/**
 * REG-05 Allotment desk. One hostel at a time: its beds on a floor plan, the queue by stage, and the actions of each role.
 * Chief Manager: block and release rooms. Office: offer beds, allot the waiting queue automatically. Wardens: see and check.
 */
export default function Allotment() {
  const s = useSession()!;
  const canOffer = can(s.role, 'REG-05', 'C');
  const canBlock = BLOCKERS.includes(s.role);
  const canAuto = AUTO.includes(s.role);
  const hostels = useApi<HostelSum[]>('/allotment/hostels');
  const [facility, setFacility] = useState('');
  useEffect(() => { if (!facility && hostels.data?.length) setFacility((hostels.data.find((h) => h.waiting) ?? hostels.data[0]).facility_id); }, [hostels.data, facility]);
  const board = useApi<Floor[]>(facility ? `/allotment/board?facility_id=${facility}` : null);
  const regs = useApi<Reg[]>(facility ? `/registrations?facility_id=${facility}` : null);
  const [floor, setFloor] = useState('all');
  const [stage, setStage] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [reg, setReg] = useState<Reg | null>(null);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [blockForm, setBlockForm] = useState({ reason: 'Management_Quota', remarks: '' });
  const [autoAsk, setAutoAsk] = useState(false);
  const { run, busy } = useAction();

  useEffect(() => { setFloor('all'); setStage(''); setPicking(false); setPicked([]); }, [facility]);
  const h = hostels.data?.find((x) => x.facility_id === facility);
  const counts = useMemo(() => Object.fromEntries(STAGES.map((st) => [st.id, (regs.data ?? []).filter(st.test).length])), [regs.data]);
  const current = stage || STAGES.find((st) => counts[st.id])?.id || 'wait';
  const queue = (regs.data ?? []).filter(STAGES.find((st) => st.id === current)!.test);
  const waiting = (regs.data ?? []).filter(STAGES[0].test);
  const refresh = async () => { await Promise.all([board.mutate(), regs.mutate(), hostels.mutate()]); };
  const floors = board.data ?? [];
  const shown = floor === 'all' ? floors : floors.filter((f) => f.zone_id === floor);
  const openOf = (f: Floor) => f.rooms.reduce((a, r) => a + r.beds.filter((b) => bedState(b, r) === 'open').length, 0);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <div className="pg">
      <div className="pg-head">
        <div><p>Students choose from the open rooms once the registration fee is paid. Blocked rooms stay out of the choice and out of automatic allotment.</p>
        </div>
        <div className="pg-actions">
          {canBlock && <Button variant={picking ? 'primary' : 'secondary'} icon="lock" onClick={() => { setPicking(!picking); setPicked([]); }}>{picking ? 'Choosing rooms to block' : 'Block rooms'}</Button>}
          {canAuto && <Button variant="primary" icon="sparkle" blockedReason={!waiting.length ? 'Nobody is waiting for a room in this hostel.' : undefined} onClick={() => setAutoAsk(true)}>Allot automatically{waiting.length ? ` (${waiting.length})` : ''}</Button>}
        </div>
      </div>

      <div className="hs" role="group" aria-label="Hostel">
        {(hostels.data ?? []).map((x) => (
          <button key={x.facility_id} type="button" className="hs-card" aria-pressed={x.facility_id === facility} onClick={() => setFacility(x.facility_id)}>
            <span className="hs-top">
              <span className="hs-code">{x.hostel_code}</span>
              <span className="hs-name"><b>{x.facility_name}</b><span>{x.open_beds} open · {x.occupied_beds} occupied{x.blocked_beds ? ` · ${x.blocked_beds} blocked` : ''}</span></span>
              {(x.waiting > 0 || x.to_verify > 0) && <span className="hs-flag">{x.waiting ? `${x.waiting} waiting` : `${x.to_verify} to check`}</span>}
            </span>
            <span className="hbar" aria-hidden>
              <i className="b-occ" style={{ width: `${(100 * x.occupied_beds) / Math.max(1, x.beds)}%` }} />
              <i className="b-held" style={{ width: `${(100 * x.held_beds) / Math.max(1, x.beds)}%` }} />
              <i className="b-blk" style={{ width: `${(100 * x.blocked_beds) / Math.max(1, x.beds)}%` }} />
              <i className="b-open" style={{ width: `${(100 * x.open_beds) / Math.max(1, x.beds)}%` }} />
            </span>
          </button>))}
      </div>

      <div className="stg" role="group" aria-label="Stage">
        {STAGES.map((st) => (
          <button key={st.id} type="button" aria-pressed={current === st.id} className={st.warn && counts[st.id] ? 'stg-warn' : undefined} onClick={() => setStage(st.id)}>
            <b>{counts[st.id] ?? 0}</b><span>{st.label}</span>
          </button>))}
      </div>

      <div className="al">
        <section className="box" aria-label="Floor plan">
          <div className="box-head">
            <h2>{h ? `${h.facility_name}` : 'Floor plan'}</h2>
            <span className="grow" />
            <div className="legend">
              <span><i className="bd bd-open" />Open</span><span><i className="bd bd-held" />Held</span><span><i className="bd bd-occ" />Occupied</span><span><i className="bd bd-blk" />Blocked</span>
            </div>
          </div>
          <div className="fl-tabs" role="tablist" aria-label="Floors">
            <button role="tab" className="fl-tab" aria-selected={floor === 'all'} onClick={() => setFloor('all')}>All floors</button>
            {floors.map((f) => <button key={f.zone_id} role="tab" className="fl-tab" aria-selected={floor === f.zone_id} onClick={() => setFloor(f.zone_id)}>{f.floor_name}<small>{openOf(f)} open</small></button>)}
          </div>
          {!board.data && <div className="q-empty">Loading rooms…</div>}
          {board.data && floors.length === 0 && <div className="q-empty">No rooms in this hostel yet. The Data Administrator adds them under Rooms and beds.</div>}
          {shown.map((f) => (
            <div key={f.zone_id}>
              {floor === 'all' && <div style={{ padding: '10px 14px 0', fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)' }}>{f.floor_name}</div>}
              <div className="rooms">
                {f.rooms.map((r) => {
                  const full = r.beds.every((b) => b.bed_status === 'Occupied');
                  const pick = picked.includes(r.space_id);
                  return (
                    <button key={r.space_id} type="button" aria-pressed={picking ? pick : undefined}
                      className={`rm${r.block ? ' rm-blocked' : ''}${r.room_status === 'Under_Maintenance' ? ' rm-off' : ''}${full ? ' rm-full' : ''}${pick ? ' rm-pick' : ''}`}
                      onClick={() => (picking ? !r.block && toggle(r.space_id) : setRoom(r))}
                      aria-label={`Room ${r.room_code}, ${shortType(r)}, ${r.beds.filter((b) => b.bed_status === 'Occupied').length} of ${r.beds.length} occupied${r.block ? `, blocked for ${words(r.block.reason)}` : ''}`}>
                      {picking && !r.block && <span className="rm-check">{pick && <Icon name="check" size={11} />}</span>}
                      <span className="rm-top"><span className="rm-no">{r.room_code}</span>{!picking && <span className="rm-type">{r.sharing_count ? `${r.sharing_count}S${r.is_ac ? ' AC' : ''}` : '—'}</span>}</span>
                      <span className="rm-beds">{r.beds.map((b) => <i key={b.subspace_id} className={`bd bd-${bedState(b, r)}`} title={`${b.bed_code}${b.full_name ? `: ${titleCase(b.full_name)}` : ''}`} />)}</span>
                      <span className="rm-foot">{r.block ? <><Icon name="lock" size={11} />{words(r.block.reason)}</> : r.room_status === 'Under_Maintenance' ? 'Maintenance' : r.is_accessible ? 'Accessible' : r.reserved_for && r.reserved_for !== 'None' ? `For ${r.reserved_for.toLowerCase()}` : ''}</span>
                    </button>);
                })}
              </div>
            </div>))}
          {picking && (
            <div className="selbar" role="region" aria-label="Block the selected rooms">
              <b>{picked.length ? `${picked.length} room${picked.length > 1 ? 's' : ''} selected` : 'Tap rooms to select them'}</b>
              <select className="dm-filter" aria-label="Reason" value={blockForm.reason} onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}>{REASONS.map((x) => <option key={x} value={x}>{words(x)}</option>)}</select>
              <input className="dm-filter" style={{ width: 170, padding: '0 10px' }} placeholder={blockForm.reason === 'Other' ? 'Why (required)' : 'Note (optional)'} value={blockForm.remarks} onChange={(e) => setBlockForm({ ...blockForm, remarks: e.target.value })} aria-label="Note" />
              <button type="button" className="selbar-btn selbar-go" disabled={busy || !picked.length || (blockForm.reason === 'Other' && !blockForm.remarks)} title={!picked.length ? 'Select at least one room' : undefined}
                onClick={() => run(() => api<{ blocked: number }>('/allotment/blocks', { method: 'POST', json: { space_ids: picked, reason: blockForm.reason, remarks: blockForm.remarks || undefined } }).then(async (r) => { setPicked([]); setPicking(false); await refresh(); return r; }), `${picked.length} room${picked.length > 1 ? 's' : ''} blocked`)}><Icon name="lock" size={14} />Block{picked.length ? ` ${picked.length}` : ''}</button>
              <button type="button" className="selbar-btn selbar-no" onClick={() => { setPicking(false); setPicked([]); }}>Cancel</button>
            </div>)}
        </section>

        <section className="box" aria-label="Queue">
          <div className="box-head"><h2>{STAGES.find((st) => st.id === current)?.label}</h2><span className="grow" /><span className="dm-count">{queue.length}</span></div>
          <div className="q q-scroll">
            {!regs.data && <div className="q-empty">Loading…</div>}
            {regs.data && queue.length === 0 && <div className="q-empty">Nobody at this stage.</div>}
            {queue.map((r) => (
              <button key={r.registration_id} type="button" className="q-row" onClick={() => setReg(r)}>
                <span className="q-av">{initials(r.full_name)}</span>
                <span className="q-text"><b>{titleCase(r.full_name)}</b><span>{r.student_id} · {r.type_name}{r.subspace_id ? ` · ${bedLabel(r.subspace_id)}` : r.waitlist_no ? ` · waiting list ${r.waitlist_no}` : ''}</span></span>
                {r.fee_check_status === 'Query' ? <span className="tag tag-bad">Query</span> : <span className="tag">{formatDate(r.applied_on)}</span>}
              </button>))}
          </div>
        </section>
      </div>

      {room && <RoomPanel room={room} hostel={h} waiting={waiting} canBlock={canBlock} canOffer={canOffer} onClose={() => setRoom(null)} onDone={async () => { await refresh(); setRoom(null); }} />}
      {reg && <RegPanel reg={reg} canOffer={canOffer} onClose={() => setReg(null)} onDone={async () => { await refresh(); setReg(null); }} />}
      <ConfirmDialog open={autoAsk} title={`Allot rooms to ${waiting.length} waiting student${waiting.length === 1 ? '' : 's'}?`}
        body={`${h?.facility_name ?? ''}: in order of application, each student gets the first open bed of the room type chosen (an accessible room first for a student with a disability). Blocked rooms are skipped. Anyone without a bed goes on the waiting list.`}
        confirmLabel="Allot rooms" onCancel={() => setAutoAsk(false)}
        onConfirm={() => { setAutoAsk(false); run(async () => { const r = await api<{ offered: number; waitlisted: number; failed: string[] }>('/allotment/auto', { method: 'POST', json: { facility_id: facility } }); await refresh(); toast(`${r.offered} offered, ${r.waitlisted} on the waiting list${r.failed.length ? `, ${r.failed.length} not allotted` : ''}`); }); }} />
    </div>
  );
}

function RoomPanel({ room, hostel, waiting, canBlock, canOffer, onClose, onDone }: { room: Room; hostel?: HostelSum; waiting: Reg[]; canBlock: boolean; canOffer: boolean; onClose: () => void; onDone: () => void }) {
  const { run, busy } = useAction();
  const [f, setF] = useState({ reason: 'Management_Quota', remarks: '' });
  const [release, setRelease] = useState(false);
  const open = room.beds.filter((b) => bedState(b, room) === 'open' || (room.block && b.bed_status === 'Vacant'));
  const fits = [...waiting.filter((w) => w.room_type_id === room.room_type_id), ...waiting.filter((w) => w.room_type_id !== room.room_type_id)];
  const [who, setWho] = useState('');
  const [bed, setBed] = useState(open[0]?.subspace_id ?? '');
  const [needCw, setNeedCw] = useState<{ text: string; kind: string } | null>(null);
  const [why, setWhy] = useState('');
  const offerBed = () => run(async () => {
    try { await api(`/registrations/${who}/offers`, { method: 'POST', json: { subspace_id: bed } }); await onDone(); toast('Bed offered; the student has 48 hours to accept'); }
    catch (e) { if (e instanceof ApiError && e.status === 409 && (e.body as { needs_cw?: boolean }).needs_cw) { setNeedCw({ text: e.message, kind: String((e.body as { kind?: string }).kind) }); return; } throw e; }
  }, '');
  const askCw = () => run(() => api('/exceptions', { method: 'POST', json: { kind: needCw!.kind, registration_id: Number(who), subspace_id: bed, reason: why.trim() } }).then(() => { setNeedCw(null); setWhy(''); onClose(); }), 'Sent to the Chief Manager');
  return (
    <>
      <Drawer open onClose={onClose} title={`Room ${room.room_code}`} subtitle={`${hostel?.facility_name ?? ''} · ${room.type_name ?? 'No room type'}`}>
        <div className="klh-stack" style={{ gap: 16 }}>
          <div className="facts">
            <div><span>Beds</span><b>{room.beds.length}</b></div>
            <div><span>Occupied</span><b>{room.beds.filter((b) => b.bed_status === 'Occupied').length}</b></div>
            <div><span>Open</span><b>{room.block ? 0 : open.length}</b></div>
            <div><span>Status</span><b>{room.block ? 'Blocked' : words(room.room_status)}</b></div>
          </div>
          {room.block && <Notice tone="warning" title={`Blocked: ${words(room.block.reason)}`}>{room.block.remarks ? `${room.block.remarks}. ` : ''}By {titleCase(room.block.blocked_by)} on {formatDate(room.block.blocked_on)}. Students cannot choose it and automatic allotment skips it. Offering a bed here needs the Chief Manager's approval.</Notice>}
          <div className="bedlist">
            {room.beds.map((b) => (
              <div key={b.subspace_id}>
                <i className={`bd bd-${bedState(b, room)}`} />
                <span style={{ width: 48 }}>Bed {bedNo(b.bed_code)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{b.full_name ? <>{titleCase(b.full_name)} <small>{b.student_id}{b.programme ? ` · ${b.programme}` : ''}</small></> : <small>{b.bed_status === 'Vacant' ? 'Empty' : words(b.bed_status)}</small>}</span>
                <StatusChip status={b.bed_status} />
              </div>))}
          </div>
          {canOffer && open.length > 0 && (
            <div className="klh-stack" style={{ gap: 10 }}>
              <p className="klh-overline">Offer a bed by name</p>
              {fits.length ? (<>
                <Field label="Student" hint="Students who chose this room type come first; another type needs the Chief Manager"><Select value={who} onChange={(e) => { setWho(e.target.value); setNeedCw(null); }} options={[{ value: '', label: 'Choose a student' }, ...fits.map((w) => ({ value: String(w.registration_id), label: `${titleCase(w.full_name)} (${w.student_id})${w.room_type_id !== room.room_type_id ? ` · chose ${w.type_name}` : ''}` }))]} /></Field>
                <Field label="Bed"><Select value={bed} onChange={(e) => { setBed(e.target.value); setNeedCw(null); }} options={open.map((b) => ({ value: b.subspace_id, label: `Bed ${bedNo(b.bed_code)}` }))} /></Field>
                {needCw ? (
                  <div className="klh-stack" style={{ gap: 10 }}>
                    <Notice tone="warning" title="This needs the Chief Manager">{needCw.text.replace(/^Needs the Chief Manager: /, '')}. Say why, and the request goes to the Chief Manager; the bed is offered as soon as it is approved.</Notice>
                    <Field label="Reason" required><Input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="For example: sports quota, medical need" /></Field>
                    <div className="klh-row" style={{ gap: 8 }}><Button variant="primary" loading={busy} blockedReason={why.trim().length < 5 ? 'Write the reason.' : undefined} onClick={askCw}>Send to the Chief Manager</Button><Button variant="ghost" onClick={() => setNeedCw(null)}>Cancel</Button></div>
                  </div>
                ) : <div><Button variant="primary" icon="bed" loading={busy} blockedReason={!who ? 'Choose a student.' : undefined} onClick={offerBed}>Offer bed</Button></div>}
              </>) : <p className="klh-muted" style={{ margin: 0 }}>Nobody waiting has chosen {room.type_name ?? 'this room type'}.</p>}
            </div>)}
          {canBlock && !room.block && (
            <div className="klh-stack" style={{ gap: 10 }}>
              <p className="klh-overline">Block this room</p>
              <div className="klh-grid-2">
                <Field label="Reason"><Select value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} options={REASONS.map((x) => ({ value: x, label: words(x) }))} /></Field>
                <Field label="Note" hint={f.reason === 'Other' ? 'Required' : 'Optional'}><Input value={f.remarks} onChange={(e) => setF({ ...f, remarks: e.target.value })} /></Field>
              </div>
              <div><Button variant="secondary" icon="lock" loading={busy} blockedReason={f.reason === 'Other' && !f.remarks ? 'Say why the room is blocked.' : undefined} onClick={() => run(() => api('/allotment/blocks', { method: 'POST', json: { space_ids: [room.space_id], reason: f.reason, remarks: f.remarks || undefined } }).then(onDone), `Room ${room.room_code} blocked`)}>Block room</Button></div>
            </div>)}
          {canBlock && room.block && <div><Button variant="secondary" icon="key" onClick={() => setRelease(true)}>Release the block</Button></div>}
        </div>
      </Drawer>
      <ConfirmDialog open={release} title={`Release room ${room.room_code}?`} body="Its empty beds go back into the students' choice and automatic allotment at once." confirmLabel="Release" onCancel={() => setRelease(false)}
        onConfirm={() => { setRelease(false); run(() => api(`/allotment/blocks/${room.block!.block_id}/release`, { method: 'POST', json: {} }).then(onDone), `Room ${room.room_code} released`); }} />
    </>
  );
}

const STEP = (r: Reg) => ({ Applied: 0, Fee_Paid: 1, Waitlisted: 1, Allotted: 2, Accepted: 3, Confirmed: r.fee_check_status === 'Verified' ? 5 : 4, Checked_In: 6 } as Record<string, number>)[r.status] ?? 0;
function RegPanel({ reg, canOffer, onClose, onDone }: { reg: Reg; canOffer: boolean; onClose: () => void; onDone: () => void }) {
  const { run, busy } = useAction();
  const at = STEP(reg);
  return (
    <Drawer open onClose={onClose} title={titleCase(reg.full_name)} subtitle={`${reg.registration_no} · ${reg.student_id} · ${reg.programme}`}>
      <div className="klh-stack" style={{ gap: 16 }}>
        <div className="facts">
          <div><span>Hostel</span><b>{reg.hostel_code}</b></div>
          <div><span>Room type</span><b>{reg.type_name}</b></div>
          <div><span>Bed</span><b>{reg.subspace_id ? bedLabel(reg.subspace_id) : '—'}</b></div>
          <div><span>Fees paid</span><b>{reg.plan_status ? `₹${Number(reg.plan_amount_paid).toLocaleString('en-IN')}` : '—'}</b></div>
        </div>
        <Stepper orientation="vertical" steps={['Applied', 'Registration fee paid', 'Room chosen or offered', 'Room accepted', 'Fees paid', 'Fees checked by Warden', 'Checked in'].map((label, i) => ({ label, state: i < at ? 'done' : i === at ? 'current' : 'upcoming' }))} />
        {['Fee_Paid', 'Waitlisted'].includes(reg.status) && (canOffer
          ? <div className="klh-row"><Button variant="primary" icon="sparkle" loading={busy} onClick={() => run(() => api<{ waitlisted?: boolean }>(`/registrations/${reg.registration_id}/offers`, { method: 'POST', json: {} }).then(async (r) => { await onDone(); return r; }), 'First suitable open bed offered')}>Offer the best open bed</Button></div>
          : <Notice tone="info" title="Waiting for a room">The student can choose a room now; otherwise the office allots one.</Notice>)}
        {reg.status === 'Applied' && <Notice tone="warning" title="Registration fee not paid">The room choice opens once the registration fee is paid.</Notice>}
        {reg.status === 'Allotted' && <Notice tone="progress" title="Waiting for the student">Bed {bedLabel(reg.subspace_id)} is held until {formatDateTime(reg.hold_until)}.</Notice>}
        {reg.status === 'Accepted' && <Notice tone="warning" title="Hostel fees not fully paid">{reg.self_chosen ? 'The student chose this bed. ' : ''}Check-in opens once every demand is paid and a Warden has checked the fees.</Notice>}
        {reg.status === 'Confirmed' && reg.fee_check_status !== 'Verified' && <Notice tone={reg.fee_check_status === 'Query' ? 'critical' : 'progress'} title={reg.fee_check_status === 'Query' ? 'Warden raised a query' : 'Waiting for the Warden’s fee check'}>{reg.fee_check_remarks ?? 'Fees are paid. A Warden checks them under Fee check before the key is issued.'}</Notice>}
        {reg.status === 'Confirmed' && reg.fee_check_status === 'Verified' && <Notice tone="success" title="Ready to check in">Fees paid and checked. Issue the key under Check-in and room handover.</Notice>}
        {reg.status === 'Checked_In' && <Notice tone="success" title="Checked in">Key {reg.key_no}.</Notice>}
      </div>
    </Drawer>
  );
}
