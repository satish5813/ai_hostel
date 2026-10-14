import { useEffect, useMemo, useState } from 'react';
import { DoorClosed, Eye, Hourglass, Info, Layers, Lock, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { toast, useAction, useApi, useSession } from '@/lib/ui';
import { BED_CHIP, BedCell, Chip, HostelPills, RaHead, avc, bedState, ini, proper, useHostel, type Floor, type Room } from './ra-kit';
import { bedLetter } from '@/lib/beds';

const REASONS: [string, string][] = [['First_Years', 'Reserved for first-years'], ['Maintenance', 'Maintenance'], ['Staff', 'Staff accommodation'], ['Visiting_Faculty', 'Visiting faculty'], ['Management_Quota', 'Management quota'], ['Sports', 'Sports'], ['Other', 'Other']];
const reasonLabel = (r: string) => REASONS.find(([k]) => k === r)?.[1] ?? r.replace(/_/g, ' ');
const BLOCKERS = ['Chief_Warden', 'Director_Hostels', 'Hostel_Incharge'];

/**
 * Room blocking (design "Room Allotment", step 1): the Chief Manager keeps rooms out of the students' choice before
 * room selection opens. A blocked room keeps any student already in it; only its vacant beds are hidden.
 */
export default function RoomBlocking() {
  const s = useSession()!;
  const canBlock = BLOCKERS.includes(s.role);
  const H = useHostel();
  const board = useApi<Floor[]>(H.id ? `/allotment/board?facility_id=${H.id}` : null);
  const floors = board.data ?? [];
  const [floor, setFloor] = useState('');
  const [type, setType] = useState('All');
  const [sel, setSel] = useState('');
  const { run: act, busy } = useAction();
  const run = (fn: () => Promise<unknown>) => act(fn, '');
  useEffect(() => { setFloor(''); setType('All'); setSel(''); }, [H.id]);
  const f = floors.find((x) => x.zone_id === floor) ?? floors[0];
  const all = floors.flatMap((x) => x.rooms);
  const count = (rooms: Room[]) => { const c = { occ: 0, held: 0, blocked: 0, free: 0, off: 0, total: 0 }; rooms.forEach((r) => r.beds.forEach((b) => { c[bedState(b, r)]++; c.total++; })); return c; };
  const c = count(all);
  const types = useMemo(() => [...new Set(all.map((r) => r.type_name).filter(Boolean))] as string[], [all]);
  const rooms = (f?.rooms ?? []).filter((r) => type === 'All' || r.type_name === type);
  const room = all.find((r) => r.space_id === sel) ?? rooms[0];
  const refresh = async () => { await Promise.all([board.mutate(), H.reload()]); };

  const block = (ids: string[], reason = 'First_Years') => run(async () => { await api('/allotment/blocks', { method: 'POST', json: { space_ids: ids, reason } }); await refresh(); });
  const release = (blockIds: number[]) => run(async () => { for (const id of blockIds) await api(`/allotment/blocks/${id}/release`, { method: 'POST', json: {} }); await refresh(); });
  const setReason = (blockId: number, reason: string) => run(async () => { await api(`/allotment/blocks/${blockId}/reason`, { method: 'POST', json: { reason } }); await refresh(); });

  const empty = (f?.rooms ?? []).filter((r) => r.beds.every((b) => ['free', 'blocked'].includes(bedState(b, r))));
  const allBlocked = empty.length > 0 && empty.every((r) => r.block);
  const floorAction = () => {
    if (allBlocked) { release(empty.map((r) => r.block!.block_id)); toast(`${f!.floor_name} rooms are open to students again`); }
    else { const ids = empty.filter((r) => !r.block).map((r) => r.space_id); block(ids); toast(`${ids.length} empty room${ids.length === 1 ? '' : 's'} on ${f!.floor_name} blocked`); }
  };
  const kpis = [
    { label: 'Occupied', value: c.occ.toLocaleString('en-IN'), sub: `of ${c.total} beds`, icon: UserCheck, tile: ['#EBEFFF', '#364FC7'] },
    { label: 'Held for applicants', value: c.held, sub: 'Waiting for payment or approval', icon: Hourglass, tile: ['#FFF5D6', '#A35A00'] },
    { label: 'Blocked', value: c.blocked, sub: `${all.filter((r) => r.block).length} rooms hidden from students`, icon: Lock, tile: ['#101828', '#FFFFFF'] },
  ];

  return (
    <div className="ra-split">
      <main className="ra-main">
        <RaHead eyebrow="Chief Manager · Step 1 of allotment" tone="#364FC7" title="Room blocking" sub="Block rooms before room selection opens. Students only see the rooms you leave open."
          right={<HostelPills list={H.list} value={H.id} onPick={H.pick} />} />
        <div className="ra-kpis">
          {kpis.map((k) => { const I = k.icon; return (
            <div key={k.label} className="ra-kpi"><span className="ra-kpi-ico" style={{ background: k.tile[0], color: k.tile[1] }}><I size={20} /></span>
              <div><span>{k.label}</span><b>{k.value}</b><small>{k.sub}</small></div></div>); })}
          <div className="ra-kpi ra-kpi-teal"><span className="ra-kpi-ico ra-glass"><Eye size={20} /></span><div><span>Open to students</span><b>{c.free}</b><small>Visible in room selection</small></div></div>
        </div>
        <div className="ra-tools">
          <div className="ra-floors" role="tablist" aria-label="Floor">
            {floors.map((x) => { const on = x.zone_id === f?.zone_id; return <button key={x.zone_id} role="tab" aria-selected={on} onClick={() => { setFloor(x.zone_id); setSel(''); }}>{x.floor_name}<small>{count(x.rooms).free} open</small></button>; })}
          </div>
          {types.length > 1 && <><span className="ra-sep" /><div className="ra-typechips">{['All', ...types].map((t) => <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}>{t === 'All' ? 'All types' : t}</button>)}</div></>}
          <span className="ra-grow" />
          <div className="ra-legend"><span><i className="ra-bed-free" />Vacant</span><span><i className="ra-bed-occ" />Occupied</span><span><i className="ra-bed-held" />Held</span><span><i className="ra-bed-blocked" />Blocked</span></div>
        </div>
        {!board.data && <div className="q-empty">Loading rooms…</div>}
        {board.data && !floors.length && <div className="q-empty">No rooms in this hostel yet.</div>}
        <div className="ra-rooms">
          {rooms.map((r) => { const st = r.beds.map((b) => bedState(b, r)); const free = st.filter((x) => x === 'free').length, held = st.filter((x) => x === 'held').length; const on = room?.space_id === r.space_id;
            return (
              <button key={r.space_id} type="button" aria-pressed={on} className={`ra-room${r.block ? ' ra-room-blocked' : ''}${on ? ' ra-room-on' : ''}`} onClick={() => setSel(r.space_id)}>
                <span className="ra-room-top"><span className="ra-mono">{H.hostel?.hostel_code}-{r.room_code}</span>{r.block && <span className="ra-lock"><Lock size={12} /></span>}</span>
                <span className="ra-room-type">{r.type_name ?? 'No room type'}</span>
                <span className="ra-beds">{r.beds.map((b) => <BedCell key={b.subspace_id} b={b} room={r} />)}</span>
                <span className="ra-room-foot" style={{ color: r.block ? 'var(--ax-tx2)' : free ? '#18794E' : 'var(--ax-tx3)' }}>{r.block ? reasonLabel(r.block.reason) : `${free ? `${free} of ${r.beds.length} free` : 'Full'}${held ? ` · ${held} held` : ''}`}</span>
              </button>); })}
        </div>
      </main>

      <aside className="ra-aside">
        {room ? (<>
          <div className="ra-sel"><span className="ra-sel-ico" style={{ background: 'linear-gradient(135deg,#4263EB,#364FC7)', boxShadow: '0 10px 20px -10px rgba(66,99,235,.7)' }}><DoorClosed size={24} /></span>
            <div><b className="ra-mono">{H.hostel?.hostel_code}-{room.room_code}</b><span>{room.type_name ?? 'No room type'} · {f?.floor_name} · {H.hostel?.facility_name}</span></div></div>
          <div className="ra-list"><span className="ra-cap">Beds</span>
            {room.beds.map((b) => { const st = bedState(b, room); const nm = b.full_name ? proper(b.full_name) : st === 'blocked' ? 'Hidden from students' : st === 'held' ? 'Held for an applicant' : 'Open for selection'; const a = avc(nm);
              return (
                <div key={b.subspace_id} className="ra-row">
                  <span className="ra-mono ra-bedid">{room.room_code}-{bedLetter(b.bed_code)}</span>
                  {b.full_name && <span className="ra-av" style={{ background: a[0], color: a[1] }}>{ini(b.full_name)}</span>}
                  <span className="ra-row-text">{nm}</span><Chip tone={BED_CHIP[st][1]}>{BED_CHIP[st][0]}</Chip>
                </div>); })}
          </div>
          <div className={`ra-blockbox${room.block ? ' ra-blockbox-on' : ''}`}>
            <button type="button" role="switch" aria-checked={!!room.block} className="ra-switch" disabled={!canBlock || busy}
              onClick={() => (room.block ? release([room.block.block_id]) : block([room.space_id]))}>
              <span><b>Block this room</b><small>Hidden from students in room selection</small></span><i><em /></i>
            </button>
            {room.block && (<div className="ra-reasons"><span>Reason</span>
              <div>{REASONS.map(([k, l]) => <button key={k} type="button" aria-pressed={room.block!.reason === k} disabled={!canBlock || busy} onClick={() => setReason(room.block!.block_id, k)}>{l}</button>)}</div>
              <small>Blocked by {proper(room.block.blocked_by)} · {new Date(room.block.blocked_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</small></div>)}
            {room.block && room.beds.some((b) => ['occ', 'held'].includes(bedState(b, room))) && <div className="ra-note ra-info"><Info size={14} />{room.beds.filter((b) => ['occ', 'held'].includes(bedState(b, room))).length} bed(s) are already taken and stay with the student. Only vacant beds are hidden.</div>}
            {!canBlock && <div className="ra-note ra-info"><Info size={14} />Only the Chief Manager blocks rooms.</div>}
          </div>
          {canBlock && empty.length > 0 && <button type="button" className="ra-outline" disabled={busy} onClick={floorAction}><Layers size={16} />{allBlocked ? `Unblock all rooms on ${f?.floor_name}` : `Block all empty rooms on ${f?.floor_name}`}</button>}
        </>) : <div className="q-empty">Choose a room.</div>}
        <div className="ra-tealbox">
          <div><Eye size={18} /><b>Students will see {c.free} beds</b></div>
          {types.map((t) => <div key={t} className="ra-tealrow"><span>{t}</span><b>{count(all.filter((r) => r.type_name === t)).free}</b></div>)}
        </div>
      </aside>
    </div>
  );
}
