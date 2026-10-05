import { useEffect, useMemo, useState } from 'react';
import { Brush, MapPin, Network, Recycle, RefreshCw, Search, ShieldCheck, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useApi } from '@/lib/ui';
import { BED_CHIP, BedCell, Chip, HostelPills, RaHead, avc, bedState, ini, letterOf, proper, useHostel, type Floor, type Room } from './ra-kit';

type Duty = { zone_id: string | null; space_id: string | null; hostel_role: string; staff_id: string | null; full_name: string | null; regular_name: string | null; source: string };
type Asg = { staff_id: string; full_name: string; hostel_role: string; zone_id: string | null; space_id: string | null };
type Cov = { who: string | null; kind: 'home' | 're' | 'none' | 'na'; from?: string | null };
const ROLES: { k: string; one: string; icon: LucideIcon; bg: string; fg: string; grad: string; glow: string }[] = [
  { k: 'Floor_Warden', one: 'Floor Warden', icon: ShieldCheck, bg: '#F1ECFF', fg: '#5F3DC4', grad: 'linear-gradient(135deg,#7048E8,#5932D1)', glow: 'rgba(112,72,232,.7)' },
  { k: 'Sweeper', one: 'Sweeper', icon: Brush, bg: '#E5F4E8', fg: '#237A37', grad: 'linear-gradient(135deg,#237A37,#1B5E2B)', glow: 'rgba(35,122,55,.7)' },
  { k: 'Scavenger', one: 'Scavenger', icon: Recycle, bg: '#E6F1FB', fg: '#1971C2', grad: 'linear-gradient(135deg,#1971C2,#1557A0)', glow: 'rgba(25,113,194,.7)' },
];
const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

/**
 * Room mapping (design "Room Allotment"): a room is its students plus its Floor Warden, sweeper and scavenger.
 * Staff come from today's roster when it is built (so an absent person's floor shows who covers it), otherwise from
 * the standing mapping.
 */
export default function RoomMapping() {
  const H = useHostel();
  const board = useApi<Floor[]>(H.id ? `/allotment/board?facility_id=${H.id}` : null);
  const roster = useApi<{ duties: Duty[] }>(H.id ? `/roster?facility_id=${H.id}&date=${TODAY}` : null);
  const asg = useApi<Asg[]>(H.id ? `/assignments?facility_id=${H.id}` : null);
  const floors = board.data ?? [];
  const [zone, setZone] = useState('');
  const [sel, setSel] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { setZone(''); setSel(''); setQ(''); }, [H.id]);
  const f = floors.find((x) => x.zone_id === zone) ?? floors[0];

  const cov = useMemo(() => {
    const out = new Map<string, Cov>(); const duties = roster.data?.duties ?? [];
    for (const fl of floors) for (const r of ROLES) {
      const d = duties.find((x) => x.hostel_role === r.k && x.zone_id === fl.zone_id);
      if (d) { out.set(`${r.k}|${fl.zone_id}`, d.source === 'Open' ? { who: null, kind: 'none', from: d.regular_name } : d.source === 'Cover' ? { who: d.full_name, kind: 're', from: d.regular_name } : { who: d.full_name, kind: 'home' }); continue; }
      const a = (asg.data ?? []).find((x) => x.hostel_role === r.k && x.zone_id === fl.zone_id);
      const na = r.k === 'Scavenger' && duties.some((x) => x.zone_id === fl.zone_id);   // roster built, no washroom on this floor
      out.set(`${r.k}|${fl.zone_id}`, a ? { who: a.full_name, kind: 'home' } : na ? { who: null, kind: 'na' } : { who: null, kind: 'none' });
    }
    return out;
  }, [floors, roster.data, asg.data]);
  const c = (role: string, z: string) => cov.get(`${role}|${z}`) ?? { who: null, kind: 'none' as const };

  const t = q.trim().toLowerCase();
  const hits = t.length > 1 ? floors.flatMap((fl) => fl.rooms.flatMap((r) => r.beds.filter((b) => b.full_name && (b.full_name.toLowerCase().includes(t) || (b.student_id ?? '').includes(t))).map((b) => ({ fl, r, b })))) : [];
  const hitRooms = new Set(hits.map((h) => h.r.space_id));
  const room: Room | undefined = (f?.rooms ?? []).find((r) => r.space_id === sel) ?? f?.rooms[0];
  const roomFloor = floors.find((x) => x.rooms.some((r) => r.space_id === room?.space_id)) ?? f;

  return (
    <div className="ra-split ra-split-wide">
      <main className="ra-main">
        <RaHead eyebrow="Room = Students + Floor Warden + Sweeper + Scavenger" tone="#1971C2" title="Room mapping" sub="Each bed is mapped to a student and each floor to its staff. Staff follow today's attendance."
          right={<HostelPills list={H.list} value={H.id} onPick={H.pick} />} />
        <div className="ra-tools">
          <div className="ra-floors" role="tablist" aria-label="Floor">
            {floors.map((x) => <button key={x.zone_id} role="tab" aria-selected={x.zone_id === f?.zone_id} onClick={() => { setZone(x.zone_id); setSel(''); }}>{x.floor_name}</button>)}
          </div>
          <label className="ra-search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a student by name or ID" aria-label="Find a student" /></label>
          {t.length > 1 && <button type="button" className="ra-found" onClick={() => { if (hits.length) { setZone(hits[0].fl.zone_id); setSel(hits[0].r.space_id); } }}>
            <MapPin size={14} />{hits.length ? `${proper(hits[0].b.full_name)} · ${hits[0].r.room_code}-${letterOf(hits[0].b.bed_code)} · ${hits[0].fl.floor_name}${hits.length > 1 ? ` (+${hits.length - 1} more)` : ''}` : 'No student found'}</button>}
        </div>
        {f && <div className="ra-staff3">
          {ROLES.map((r) => { const x = c(r.k, f.zone_id); const I = x.who || x.kind === 'na' ? r.icon : TriangleAlert;
            return (
              <div key={r.k} className="ra-staffcard" style={{ background: x.who ? r.grad : x.kind === 'na' ? 'linear-gradient(135deg,#98A2B3,#667085)' : 'linear-gradient(135deg,#E5484D,#B42318)', boxShadow: `0 12px 24px -16px ${x.who ? r.glow : 'rgba(16,24,40,.5)'}` }}>
                <span className="ra-kpi-ico ra-glass"><I size={20} /></span>
                <div><span>{r.one} · {f.floor_name}</span><b>{x.who ? proper(x.who) : x.kind === 'na' ? 'No washroom' : 'Uncovered'}</b><small>{x.kind === 'home' ? 'Home floor' : x.kind === 're' ? `Covering for ${proper(x.from)} today` : x.kind === 'na' ? 'Nothing to clean on this floor' : 'Map someone, or run Auto-assign on Staff attendance'}</small></div>
              </div>); })}
        </div>}
        {!board.data && <div className="q-empty">Loading rooms…</div>}
        <div className="ra-rooms ra-rooms-map">
          {(f?.rooms ?? []).map((r) => { const occ = r.beds.filter((b) => b.bed_status === 'Occupied').length; const on = room?.space_id === r.space_id; const hit = hitRooms.has(r.space_id);
            return (
              <button key={r.space_id} type="button" aria-pressed={on} className={`ra-room ra-maproom${on ? ' ra-room-on ra-room-on-sky' : ''}${hit ? ' ra-room-hit' : ''}`} style={{ opacity: t.length > 1 && hits.length && !hit ? 0.4 : 1 }} onClick={() => setSel(r.space_id)}>
                <span className="ra-room-top"><span className="ra-mono">{H.hostel?.hostel_code}-{r.room_code}</span><small>{r.type_name ?? ''}</small><em>{occ}/{r.beds.length}</em></span>
                {r.beds.map((b) => { const st = bedState(b, r); return (
                  <span key={b.subspace_id} className="ra-mapbed"><BedCell b={b} room={r} size="sm" /><span style={{ fontWeight: b.full_name ? 600 : 500, color: b.full_name ? 'var(--ax-tx)' : 'var(--ax-tx3)' }}>{b.full_name ? proper(b.full_name) : st === 'held' ? 'Held' : st === 'blocked' ? 'Blocked' : 'Vacant'}</span></span>); })}
                <span className="ra-staffchips">
                  {ROLES.map((x) => { const v = c(x.k, f!.zone_id); const I = v.who ? x.icon : TriangleAlert;
                    return <span key={x.k} title={`${x.one}: ${v.who ? proper(v.who) : 'Uncovered'}`} style={v.kind === 'none' ? { background: '#FDECEC', color: '#B42318' } : v.kind === 're' ? { background: '#FFF4D6', color: '#8A5300' } : v.kind === 'na' ? { background: '#EEF1F5', color: '#667085' } : { background: x.bg, color: x.fg }}><I size={11} />{v.who ? ini(v.who) : '—'}</span>; })}
                </span>
              </button>); })}
        </div>
      </main>
      <aside className="ra-aside">
        {room ? (<>
          <div className="ra-sel"><span className="ra-sel-ico" style={{ background: 'linear-gradient(135deg,#1971C2,#1557A0)', boxShadow: '0 10px 20px -10px rgba(25,113,194,.7)' }}><Network size={24} /></span>
            <div><b className="ra-mono">{H.hostel?.hostel_code}-{room.room_code}</b><span>{room.type_name ?? 'No room type'} · {roomFloor?.floor_name} · {H.hostel?.facility_name}</span></div></div>
          <div className="ra-list"><span className="ra-cap">Students by bed</span>
            {room.beds.map((b) => { const st = bedState(b, room); const a = avc(b.full_name); const hl = hits.some((h) => h.b.subspace_id === b.subspace_id);
              return (
                <div key={b.subspace_id} className="ra-row" style={hl ? { background: '#E6F1FB' } : undefined}>
                  <span className="ra-mono ra-bedid">{room.room_code}-{letterOf(b.bed_code)}</span>
                  {b.full_name && <span className="ra-av" style={{ background: a[0], color: a[1] }}>{ini(b.full_name)}</span>}
                  <span className="ra-row-text"><b>{b.full_name ? proper(b.full_name) : BED_CHIP[st][0]}</b>{b.student_id && <small className="ra-mono">{b.student_id}</small>}</span>
                  <Chip tone={BED_CHIP[st][1]}>{BED_CHIP[st][0]}</Chip>
                </div>); })}
          </div>
          <div className="ra-list"><span className="ra-cap">Mapped staff</span>
            {ROLES.map((r) => { const v = c(r.k, roomFloor!.zone_id); const I = r.icon;
              return (
                <div key={r.k} className="ra-row ra-row-plain"><span className="ra-tile" style={v.who ? { background: r.bg, color: r.fg } : { background: '#FDECEC', color: '#B42318' }}><I size={17} /></span>
                  <span className="ra-row-text"><small>{r.one}</small><b>{v.who ? proper(v.who) : v.kind === 'na' ? 'Not needed' : 'Uncovered'}</b></span>
                  <Chip tone={v.kind === 'home' ? 'ok' : v.kind === 're' ? 'warn' : v.kind === 'na' ? 'neu' : 'crit'}>{v.kind === 'home' ? 'Home floor' : v.kind === 're' ? 'Reassigned today' : v.kind === 'na' ? 'No washroom' : 'Uncovered'}</Chip></div>); })}
          </div>
          <div className="ra-note ra-sky-n"><RefreshCw size={14} />Staff mapping follows Staff attendance. When someone is absent, the floor moves to whoever Auto-assign picked.</div>
        </>) : <div className="q-empty">No rooms on this floor.</div>}
      </aside>
    </div>
  );
}
