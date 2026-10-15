import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { BedDouble, ChevronDown, GraduationCap, Hourglass, Lock, Phone, Search, ShieldCheck, Brush, Recycle, Users, UserRound, type LucideIcon } from 'lucide-react';
import { useApi, useSession } from '@/lib/ui';
import { BED_CHIP, Chip, HostelPills, RaHead, avc, bedState, ini, letterOf, proper, useHostel, type BoardBed, type Floor, type Room } from './ra-kit';

type Bed = BoardBed & { staff_id?: string | null; staff_name?: string | null; staff_designation?: string | null };
type Asg = { staff_id: string; full_name: string; mobile_no: string | null; hostel_role: string; zone_id: string | null; space_id: string | null; shift: string };
type Duty = { zone_id: string | null; space_id: string | null; hostel_role: string; staff_id: string | null; full_name: string | null; regular_name: string | null; source: string };
type Who = { name: string | null; phone?: string | null; cover?: string | null };
const FLOOR_ROLES: { k: string; one: string; icon: LucideIcon }[] = [
  { k: 'Floor_Warden', one: 'Floor Manager', icon: ShieldCheck }, { k: 'Sweeper', one: 'Sweeper', icon: Brush }, { k: 'Scavenger', one: 'Scavenger', icon: Recycle },
];
const STATES = [['all', 'All rooms'], ['occ', 'Occupied'], ['free', 'Vacant'], ['held', 'Held'], ['blocked', 'Blocked']] as const;
type StateKey = (typeof STATES)[number][0];
const TODAY = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const words = (s: string) => (({ Chief_Warden: 'Chief Manager', Floor_Warden: 'Floor Manager' } as Record<string, string>)[s] ?? s).replace(/_/g, ' ');

/**
 * Hostel allotment (Chief Manager, Room Allotment): the whole hostel at a glance, floor by floor. Every room shows its beds
 * with the student (or the faculty member living there), and every floor shows the staff responsible for it today.
 * Floors open one at a time, so a hostel of 13 floors and 520 rooms stays quick.
 */
export default function AllotmentView() {
  const navigate = useNavigate();
  const s = useSession();
  const H = useHostel();
  const board = useApi<Floor[]>(H.id ? `/allotment/board?facility_id=${H.id}` : null);
  const asg = useApi<Asg[]>(H.id ? `/assignments?facility_id=${H.id}` : null);
  const roster = useApi<{ duties: Duty[] }>(H.id && s?.role !== 'admin' ? `/roster?facility_id=${H.id}&date=${TODAY}` : null);
  const floors = board.data ?? [];
  const [q, setQ] = useState('');
  const [state, setState] = useState<StateKey>('all');
  const [open, setOpen] = useState<Set<string>>(new Set());
  useEffect(() => { setOpen(new Set(floors.slice(0, 1).map((f) => f.zone_id))); }, [H.id, floors.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  /** Who looks after a floor today: the roster (with covers) when it is built, otherwise the standing assignment. */
  const floorStaff = useMemo(() => {
    const m = new Map<string, Who>();
    for (const f of floors) for (const r of FLOOR_ROLES) {
      const d = roster.data?.duties.find((x) => x.hostel_role === r.k && x.zone_id === f.zone_id && !x.space_id);
      const a = (asg.data ?? []).find((x) => x.hostel_role === r.k && x.zone_id === f.zone_id && !x.space_id);
      const phone = (id?: string | null) => (asg.data ?? []).find((x) => x.staff_id === id)?.mobile_no ?? null;
      m.set(`${f.zone_id}|${r.k}`, d ? (d.source === 'Open' ? { name: null, cover: d.regular_name } : { name: d.full_name, phone: phone(d.staff_id), cover: d.source === 'Cover' ? d.regular_name : null }) : a ? { name: a.full_name, phone: a.mobile_no } : { name: null });
    }
    return m;
  }, [floors, roster.data, asg.data]);
  const roomStaff = (spaceId: string) => (asg.data ?? []).filter((a) => a.space_id === spaceId);
  const chief = (asg.data ?? []).filter((a) => a.hostel_role === 'Chief_Warden' && !a.zone_id);

  const t = q.trim().toLowerCase();
  const matchBed = (b: Bed) => !t || [b.full_name, b.student_id, b.staff_name, b.staff_id, b.programme].some((v) => (v ?? '').toLowerCase().includes(t));
  const visible = (r: Room) => {
    const beds = r.beds as Bed[];
    const stateOk = state === 'all' || beds.some((b) => bedState(b, r) === state || (state === 'blocked' && bedState(b, r) === 'off'));
    const textOk = !t || r.room_code.toLowerCase().includes(t) || beds.some(matchBed);
    return stateOk && textOk;
  };
  const shown = floors.map((f) => ({ f, rooms: f.rooms.filter(visible) })).filter((x) => x.rooms.length || (!t && state === 'all'));
  const isOpen = (z: string) => open.has(z) || !!t;
  const toggle = (z: string) => setOpen((o) => { const n = new Set(o); if (n.has(z)) n.delete(z); else n.add(z); return n; });

  const all = floors.flatMap((f) => f.rooms.flatMap((r) => (r.beds as Bed[]).map((b) => ({ b, r }))));
  const count = (st: string) => all.filter(({ b, r }) => bedState(b, r) === st).length;
  const faculty = all.filter(({ b }) => b.staff_id).length;
  const kpis: { label: string; value: number; sub: string; icon: LucideIcon; tone: string }[] = [
    { label: 'Beds', value: all.length, sub: `${floors.length} floors · ${floors.reduce((a, f) => a + f.rooms.length, 0)} rooms`, icon: BedDouble, tone: '#EBEFFF|#364FC7' },
    { label: 'Students in', value: count('occ') - faculty, sub: `${faculty} faculty or staff living in`, icon: GraduationCap, tone: '#E5F4E8|#237A37' },
    { label: 'Held for applicants', value: count('held'), sub: 'Offered, not yet checked in', icon: Hourglass, tone: '#FFF4D6|#8A5300' },
    { label: 'Vacant', value: count('free'), sub: `${count('blocked') + count('off')} more blocked or under repair`, icon: Lock, tone: '#E6F1FB|#1971C2' },
  ];

  return (
    <div className="ra-main av">
      <RaHead eyebrow="Whole residency · floors, rooms, beds and staff" tone="#0B7A71" title="Hostel allotment"
        sub={chief.length ? `Chief Manager: ${chief.map((c) => proper(c.full_name)).join(', ')}` : 'Every bed with its student, every floor with the staff responsible for it today.'}
        right={<HostelPills list={H.list} value={H.id} onPick={H.pick} />} />

      <div className="ra-kpis">
        {kpis.map((k) => { const [bg, fg] = k.tone.split('|'); const I = k.icon; return (
          <div key={k.label} className="ra-kpi"><span className="ra-kpi-ico" style={{ background: bg, color: fg }}><I size={20} /></span><div><span>{k.label}</span><b>{k.value.toLocaleString('en-IN')}</b><small>{k.sub}</small></div></div>); })}
      </div>

      <div className="av-tools">
        <label className="ra-search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a student, staff member or room" aria-label="Find a student, staff member or room" /></label>
        <div className="ra-seg av-states" role="group" aria-label="Show">
          {STATES.map(([k, l]) => <button key={k} type="button" aria-pressed={state === k} className={state === k ? 'ra-on' : undefined} onClick={() => setState(k)}>{l}</button>)}
        </div>
        <span className="av-gap" />
        <button type="button" className="av-link" onClick={() => setOpen(new Set(floors.map((f) => f.zone_id)))}>Open all floors</button>
        <button type="button" className="av-link" onClick={() => setOpen(new Set())}>Close all</button>
      </div>

      {!board.data && H.id && <div className="q-empty">Loading the hostel…</div>}
      {board.data && !shown.length && <div className="q-empty">Nothing matches. Clear the search or choose All rooms.</div>}

      <div className="av-floors">
        {shown.map(({ f, rooms }) => {
          const beds = f.rooms.flatMap((r) => r.beds);
          const occ = beds.filter((b) => b.bed_status === 'Occupied').length;
          const o = isOpen(f.zone_id);
          return (
            <section key={f.zone_id} className={`av-floor${o ? ' av-floor-open' : ''}`}>
              <button type="button" className="av-floor-head" aria-expanded={o} onClick={() => toggle(f.zone_id)}>
                <span className="av-floor-name"><b>{f.floor_name}</b><small>{f.rooms.length} rooms · {occ}/{beds.length} beds occupied{t || state !== 'all' ? ` · ${rooms.length} shown` : ''}</small></span>
                <span className="av-bar" aria-hidden="true"><i style={{ width: `${beds.length ? (occ / beds.length) * 100 : 0}%` }} /></span>
                <span className="av-staff">
                  {FLOOR_ROLES.map((r) => { const w = floorStaff.get(`${f.zone_id}|${r.k}`) ?? { name: null }; const I = r.icon; return (
                    <span key={r.k} className={`av-who${w.name ? '' : ' av-who-none'}${w.cover ? ' av-who-cover' : ''}`} title={`${r.one}: ${w.name ? proper(w.name) : 'nobody'}${w.cover ? ` (covering for ${proper(w.cover)})` : ''}`}>
                      <I size={13} />{w.name ? proper(w.name) : r.k === 'Floor_Warden' ? 'No Floor Manager' : `No ${r.one.toLowerCase()}`}</span>); })}
                </span>
                <ChevronDown className="av-chev" size={18} />
              </button>
              {o && (
                <div className="av-body">
                  <div className="av-floorstaff">
                    {FLOOR_ROLES.map((r) => { const w = floorStaff.get(`${f.zone_id}|${r.k}`) ?? { name: null }; return (
                      <span key={r.k}><small>{r.one}</small><b>{w.name ? proper(w.name) : '—'}</b>{w.cover && <em>Covering for {proper(w.cover)} today</em>}{w.phone && <a href={`tel:${w.phone}`} className="av-phone"><Phone size={12} />{w.phone}</a>}</span>); })}
                  </div>
                  <div className="av-rooms">
                    {rooms.map((r) => {
                      const rb = r.beds as Bed[]; const filled = rb.filter((b) => b.bed_status === 'Occupied').length; const extra = roomStaff(r.space_id);
                      return (
                        <article key={r.space_id} className="av-room">
                          <header><span className="ra-mono">{H.hostel?.hostel_code}-{r.room_code}</span><small>{r.type_name ?? 'No type'}{r.block ? ` · blocked: ${words(r.block.reason).toLowerCase()}` : ''}</small><em>{filled}/{rb.length}</em></header>
                          <ul>
                            {rb.map((b) => {
                              const st = bedState(b, r); const hit = !!t && matchBed(b);
                              const name = b.staff_name ?? b.full_name; const a = avc(name);
                              return (
                                <li key={b.subspace_id} className={hit ? 'av-hit' : undefined}>
                                  <span className={`av-letter av-${st}`}>{letterOf(b.bed_code)}</span>
                                  {name ? <span className="av-av" style={{ background: a[0], color: a[1] }}>{ini(name)}</span> : <span className="av-av av-av-empty"><UserRound size={13} /></span>}
                                  {b.staff_id ? (
                                    <span className="av-person"><b>{proper(b.staff_name)}</b><small>{b.staff_designation ?? 'Faculty'} · {b.staff_id}</small></span>
                                  ) : b.student_id ? (
                                    <button type="button" className="av-person av-person-link" disabled={s?.role === 'admin'} onClick={() => navigate(`/academics/${b.student_id}`)}>
                                      <b>{proper(b.full_name)}</b><small>{b.student_id}{b.programme ? ` · ${b.programme}` : ''}</small></button>
                                  ) : <span className="av-person"><b className="av-muted">{BED_CHIP[st][0]}</b></span>}
                                  {b.staff_id ? <Chip tone="info">Faculty</Chip> : st === 'held' ? <Chip tone="warn">Held</Chip> : st === 'occ' ? null : <Chip tone={BED_CHIP[st][1]}>{BED_CHIP[st][0]}</Chip>}
                                </li>);
                            })}
                          </ul>
                          {extra.length > 0 && <footer>{extra.map((x) => <span key={x.staff_id + x.hostel_role}><Users size={12} />{words(x.hostel_role)}: {proper(x.full_name)}</span>)}</footer>}
                        </article>);
                    })}
                  </div>
                </div>)}
            </section>);
        })}
      </div>
    </div>
  );
}
