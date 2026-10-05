import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Brush, CalendarCheck, Lock, Plane, Recycle, ShieldCheck, Sparkles, TriangleAlert, UserCheck, UserX, Users, type LucideIcon } from 'lucide-react';
import { Button, Drawer, Field, Select } from '@/lib/klh';
import { api } from '@/lib/api';
import { toast, useAction, useApi, useSession } from '@/lib/ui';
import { can } from '@/app/screens';
import { HostelPills, RaHead, avc, ini, proper, useHostel } from './ra-kit';

type Person = { staff_id: string; full_name: string; mobile_no: string; main_role: string; roles: string; status: string | null; in_time: string | null; duties: number };
type Duty = { duty_id: number; zone_id: string | null; zone_name: string | null; floor_no: number | null; space_id: string | null; space_code: string | null; hostel_role: string; shift: string; staff_id: string | null; full_name: string | null; regular_staff_id: string | null; regular_name: string | null; source: string;
  room_from: string | null; room_to: string | null; rooms: number | null };
type Day = { date: string; people: Person[]; duties: Duty[]; floors: { zone_id: string; zone_name: string; floor_no: number; residents: number; rooms: number }[] };
const room = (code: string) => code.replace(/^[A-Z]+\d*-/, '');
const rangeOf = (x: Duty) => (x.room_from ? (x.room_from === x.room_to ? `Room ${room(x.room_from)}` : `Rooms ${room(x.room_from)}–${room(x.room_to!)}`) : 'Whole floor');

const ROLES: { k: string; label: string; one: string; icon: LucideIcon; bg: string; fg: string }[] = [
  { k: 'Floor_Warden', label: 'Floor Wardens', one: 'Floor Warden', icon: ShieldCheck, bg: '#F1ECFF', fg: '#5F3DC4' },
  { k: 'Sweeper', label: 'Sweepers', one: 'Sweeper', icon: Brush, bg: '#E5F4E8', fg: '#237A37' },
  { k: 'Scavenger', label: 'Scavengers', one: 'Scavenger', icon: Recycle, bg: '#E6F1FB', fg: '#1971C2' },
];
const OTHER = { k: 'other', label: 'Wardens and security', one: '', icon: Users, bg: '#FFF0E6', fg: '#C2410C' };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = iso(new Date());
const week = () => { const t = new Date(); const m = new Date(t); m.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return Array.from({ length: 7 }, (_, i) => { const d = new Date(m); d.setDate(m.getDate() + i); return d; }); };
const SEG: [string, string][] = [['Present', 'ok'], ['Absent', 'crit'], ['Leave', 'warn']];
const isIn = (st?: string | null) => st === 'Present' || st === 'Half_Day';

/**
 * MAP-06 Staff attendance (design "Room Allotment"): mark today's Floor Wardens, sweepers and scavengers; Auto-assign
 * then shares every floor among those present (a floor is split by room ranges when fewer people than floors are in).
 * A cell, or one share of it, can be given to someone else by hand.
 * Past days are read-only.
 */
export default function DutyRoster() {
  const s = useSession()!;
  const edit = can(s.role, 'MAP-06', 'E');
  const mark = can(s.role, 'MAP-06', 'C') || edit;
  const H = useHostel();
  const [date, setDate] = useState(TODAY);
  const [slot, setSlot] = useState<Duty | null>(null);
  useEffect(() => setDate(TODAY), [H.id]);
  const day = useApi<Day>(H.id ? `/roster?facility_id=${H.id}&date=${date}` : null);
  const { run: act, busy } = useAction();
  const run = (fn: () => Promise<unknown>) => act(fn, '');
  const d = day.data;
  const past = date !== TODAY;
  const people = d?.people ?? [];
  const cnt = (v: string) => people.filter((p) => (v === 'Present' ? isIn(p.status) : p.status === v)).length;
  const duties = d?.duties ?? [];
  // a floor may be shared: one duty per person, each with a room range (washroom blocks for scavengers)
  const roleDuties = (role: string, zone: string) => duties.filter((x) => x.hostel_role === role && x.zone_id === zone && (role === 'Scavenger' || !x.space_id));
  const floors = (d?.floors ?? []).filter((f) => f.residents > 0 || duties.some((x) => x.zone_id === f.zone_id));
  const built = duties.length > 0;
  const uncovered = duties.filter((x) => x.source === 'Open' && ROLES.some((r) => r.k === x.hostel_role)).length;
  // how many can do each role today, and how the rooms are shared among them
  const roomsTotal = floors.reduce((a, f) => a + (f.rooms ?? 0), 0);
  const avail = ROLES.map((r) => {
    const mine = people.filter((p) => p.roles.split(', ').includes(r.k));
    const doing = new Set(duties.filter((x) => x.hostel_role === r.k && x.staff_id).map((x) => x.staff_id));
    return { ...r, mapped: mine.length, here: mine.filter((p) => isIn(p.status)).length, doing: doing.size,
      helpers: [...doing].filter((id) => !mine.some((p) => p.staff_id === id)).length, unmarked: mine.filter((p) => !p.status).length };
  });
  const changes = duties.filter((x) => x.source === 'Cover' && ROLES.some((r) => r.k === x.hostel_role));
  const floorsOf = (id: string) => [...new Set(duties.filter((x) => x.staff_id === id || x.regular_staff_id === id).map((x) => x.zone_name).filter(Boolean))];

  const setMark = (id: string, status: string) => run(async () => { await api('/roster/attendance', { method: 'POST', json: { facility_id: H.id, date, marks: [{ staff_id: id, status }] } }); await day.mutate(); });
  const markRest = () => run(async () => { const m = people.filter((p) => !p.status).map((p) => ({ staff_id: p.staff_id, status: 'Present' })); if (m.length) await api('/roster/attendance', { method: 'POST', json: { facility_id: H.id, date, marks: m } }); await day.mutate(); toast(m.length ? `${m.length} marked present` : 'Everyone is already marked'); });
  const auto = () => run(async () => {
    const r = await api<{ open: number; split: boolean; floor_wardens: number; sweepers: number; scavengers: number; floors: number; rooms: number }>('/roster/generate', { method: 'POST', json: { facility_id: H.id, date } });
    await day.mutate();
    const n = (k: number, one: string) => `${k} ${one}${k === 1 ? '' : 's'}`;
    const who = `${n(r.floor_wardens, 'floor warden')}, ${n(r.sweepers, 'sweeper')}, ${n(r.scavengers, 'scavenger')}`;
    toast(r.open ? `${who} assigned; ${n(r.open, 'place')} wait for someone to be marked present` : `${who} cover all ${r.floors} floors (${r.rooms} rooms)${r.split ? ', rooms shared equally' : ''}`, r.open ? 'warning' : 'success');
  });

  const kpis: { label: string; value: string | number; sub: string; icon: LucideIcon; bg: string; dark?: boolean; glow: string }[] = [
    { label: 'Present', value: `${cnt('Present')}/${people.length}`, sub: 'Marked in today', icon: UserCheck, bg: 'linear-gradient(135deg,#237A37,#1B5E2B)', glow: 'rgba(35,122,55,.9)' },
    { label: 'Absent', value: cnt('Absent'), sub: 'Not marked in', icon: UserX, bg: 'linear-gradient(135deg,#C2255C,#A61E4D)', glow: 'rgba(194,37,92,.9)' },
    { label: 'On leave', value: cnt('Leave'), sub: 'Approved leave', icon: Plane, bg: 'linear-gradient(135deg,#FFD166,#FF7A45)', dark: true, glow: 'rgba(255,122,69,.9)' },
    !built ? { label: 'Roster not built', value: floors.length * 3, sub: 'Places to fill · run Auto-assign', icon: Sparkles, bg: 'linear-gradient(135deg,#E5484D,#B42318)', glow: 'rgba(229,72,77,.9)' }
      : uncovered ? { label: 'Waiting for staff', value: uncovered, sub: 'Nobody marked present for these', icon: TriangleAlert, bg: 'linear-gradient(135deg,#E5484D,#B42318)', glow: 'rgba(229,72,77,.9)' }
      : { label: 'Floors covered', value: `${floors.length}/${floors.length}`, sub: 'Every role, every floor', icon: ShieldCheck, bg: 'linear-gradient(135deg,#0B7A71,#0A5F6E)', glow: 'rgba(11,122,113,.9)' },
  ];
  const groups = [...ROLES.map((r) => ({ ...r, list: people.filter((p) => p.main_role === r.k) })), { ...OTHER, list: people.filter((p) => !ROLES.some((r) => r.k === p.main_role)) }].filter((g) => g.list.length);
  const others = duties.filter((x) => !ROLES.some((r) => r.k === x.hostel_role));
  const days = useMemo(week, []);
  const openSlot = (x?: Duty) => { if (x && edit && !past) setSlot(x); };

  return (
    <div className="ra-page">
      <RaHead eyebrow="Daily · Wardens, Sweepers, Scavengers" tone="#237A37" title="Staff attendance" sub="Mark today's attendance. Auto-assign shares every floor and room among the staff who are present, equally and in floor order."
        right={<HostelPills list={H.list} value={H.id} onPick={H.pick} />} />
      <div className="ra-days">
        {days.map((x) => { const v = iso(x); const fut = v > TODAY; const on = v === date; const today = v === TODAY;
          return <button key={v} type="button" disabled={fut} aria-pressed={on} className={on ? (today ? 'ra-day-today' : 'ra-day-on') : ''} onClick={() => setDate(v)}>
            <small>{x.toLocaleDateString('en-IN', { weekday: 'short' })}</small><b>{String(x.getDate()).padStart(2, '0')}</b><em>{today ? 'Today' : fut ? '' : 'Done'}</em></button>; })}
        <span className="ra-vsep" />
        <div className="ra-shift"><b><CalendarCheck size={15} />Today's roster</b><small>Mark first, then Auto-assign</small></div>
      </div>
      <div className="ra-kpis">
        {kpis.map((k) => { const I = k.icon; return (
          <div key={k.label} className={`ra-gkpi${k.dark ? ' ra-gkpi-dark' : ''}`} style={{ background: k.bg, boxShadow: `0 14px 28px -16px ${k.glow}` }}>
            <I size={84} className="ra-gkpi-bg" /><span className="ra-kpi-ico ra-glass"><I size={22} /></span>
            <div><span>{k.label}</span><b>{k.value}</b><small>{k.sub}</small></div></div>); })}
      </div>
      {past && <div className="ra-note ra-neu-n"><Lock size={15} />Past attendance is read-only.</div>}
      <div className="ra-att">
        <section className="ra-card-s">
          <div className="ra-card-h"><h2>Roster</h2>{mark && !past && <button type="button" className="ra-small" disabled={busy || !people.length} onClick={markRest}>Mark rest present</button>}</div>
          {!d && <div className="q-empty">Loading…</div>}
          {d && !people.length && <div className="q-empty">Nobody is mapped to this hostel yet. Map staff in the Mapping centre.</div>}
          {groups.map((g) => { const I = g.icon;
            return (
              <div key={g.k} className="ra-group">
                <div className="ra-group-h"><span style={{ background: g.bg, color: g.fg }}><I size={14} /></span><b>{g.label}</b><small>{g.list.filter((p) => isIn(p.status)).length}/{g.list.length} present</small></div>
                {g.list.map((p) => { const a = avc(p.full_name); const st = p.status;
                  return (
                    <div key={p.staff_id} className="ra-person-row">
                      <span className="ra-av ra-av-lg" style={{ background: a[0], color: a[1] }}>{ini(p.full_name)}</span>
                      <span className="ra-row-text"><b>{proper(p.full_name)}</b><small>{floorsOf(p.staff_id).join(', ') || p.roles.replace(/_/g, ' ')} · <em className={isIn(st) ? 'ra-ok-t' : st === 'Leave' ? 'ra-warn-t' : 'ra-crit-t'}>{isIn(st) ? `In ${p.in_time ?? ''}`.trim() : st === 'Leave' ? 'On leave' : st === 'Absent' ? 'Absent' : 'Not marked in'}</em></small></span>
                      <span className="ra-seg" role="radiogroup" aria-label={`${proper(p.full_name)} attendance`}>
                        {SEG.map(([v, tone]) => <button key={v} type="button" role="radio" aria-checked={st === v} className={st === v ? `ra-${tone}` : ''} disabled={!mark || past || busy} onClick={() => setMark(p.staff_id, v)}>{v}</button>)}
                      </span>
                    </div>); })}
              </div>); })}
        </section>
        <section className="ra-card-s">
          <div className="ra-card-h"><div><h2>Floor coverage{past ? '' : ' today'}</h2><small>{H.hostel?.facility_name} · {floors.length} floors · 3 roles</small></div>
            {edit && !past && <button type="button" className="ra-primary ra-primary-sm" disabled={busy} onClick={auto}><Sparkles size={16} />Auto-assign</button>}</div>
          <div className="ra-avail">{avail.map((a) => { const I = a.icon; return (
            <div key={a.k} className={a.doing === 0 ? 'ra-avail-none' : ''}>
              <span className="ra-avail-ico" style={{ background: a.bg, color: a.fg }}><I size={15} /></span>
              <span><b>{a.here} of {a.mapped} {a.label.toLowerCase()} present</b>
                <small>{a.doing === 0 ? (a.unmarked ? `${a.unmarked} not marked in yet: mark them, then Auto-assign` : built ? 'Nobody to assign' : 'Run Auto-assign')
                  : a.k === 'Scavenger' ? `${a.doing} on the washrooms${a.helpers ? ` (${a.helpers} standing in)` : ''}`
                  : `${a.doing} for ${floors.length} floors · about ${Math.ceil(roomsTotal / a.doing)} rooms each${a.helpers ? ` · ${a.helpers} standing in` : ''}`}</small></span>
            </div>); })}</div>
          <div className="ra-cov">
            <span />{ROLES.map((r) => { const I = r.icon; return <span key={r.k} className="ra-cov-h"><I size={14} style={{ color: r.fg }} />{r.one}</span>; })}
            {floors.map((f) => (<div key={f.zone_id} className="ra-cov-row">
              <div className="ra-cov-f"><b>{f.zone_name}</b><small>{f.residents} students</small></div>
              {ROLES.map((r) => { const list = roleDuties(r.k, f.zone_id); const x = list[0];
                if (list.length > 1 || (x && x.room_from)) return (
                  <div key={r.k} className="ra-cell ra-cell-split">
                    {list.map((y) => (
                      <button key={y.duty_id} type="button" disabled={!edit || past} onClick={() => openSlot(y)} title={edit && !past ? 'Give this share to someone else' : undefined}>
                        <span className="ra-av ra-av-sm" style={y.source === 'Open' ? { background: '#E5484D', color: '#FFF' } : { background: r.bg, color: r.fg }}>{y.source === 'Open' ? '!' : ini(y.full_name)}</span>
                        <span><b>{y.source === 'Open' ? 'Nobody present' : proper(y.full_name)}</b><small>{r.k === 'Scavenger' ? `Washroom ${y.space_code ?? ''}` : rangeOf(y)}{y.rooms && y.room_from ? ` · ${y.rooms} room${y.rooms === 1 ? '' : 's'}` : ''}</small></span>
                      </button>))}
                  </div>);
                if (!x) return <div key={r.k} className="ra-cell ra-cell-none"><span className="ra-av ra-av-cell" style={{ background: '#98A2B3', color: '#FFF' }}>–</span><span><b>{built && r.k === 'Scavenger' ? 'No washroom' : 'Not planned'}</b><small>{built && r.k === 'Scavenger' ? 'Nothing to clean here' : 'Run Auto-assign'}</small></span></div>;
                const cls = x.source === 'Open' ? 'ra-cell ra-cell-crit' : x.source === 'Cover' ? 'ra-cell ra-cell-warn' : 'ra-cell';
                return (
                  <button key={r.k} type="button" className={cls} disabled={!edit || past} onClick={() => openSlot(x)} title={edit && !past ? 'Give this place to someone else' : undefined}>
                    {x.source === 'Open' ? <span className="ra-av ra-av-cell" style={{ background: '#E5484D', color: '#FFF' }}><TriangleAlert size={13} /></span>
                      : <span className="ra-av ra-av-cell" style={x.source === 'Cover' ? { background: '#F5A524', color: '#2B1405' } : { background: r.bg, color: r.fg }}>{ini(x.full_name)}</span>}
                    <span><b>{x.source === 'Open' ? 'Nobody present' : proper(x.full_name)}</b>
                      <small>{x.source === 'Open' ? `Mark ${r.label.toLowerCase()} present, then Auto-assign` : x.source === 'Cover' ? (x.regular_name ? `Covering for ${proper(x.regular_name)}` : 'Standing in') : x.source === 'Manual' ? 'Set by hand' : x.space_code ? `Washroom ${x.space_code}` : `Home floor${x.rooms ? ` · ${x.rooms} room${x.rooms === 1 ? '' : 's'}` : ''}`}</small></span>
                  </button>); })}
            </div>))}
          </div>
          {changes.length > 0 && <div className="ra-changes"><b>Reassigned today</b>{changes.map((x) => <span key={x.duty_id}><ArrowRightLeft size={13} />{x.zone_name}{x.room_from ? ` (${rangeOf(x).toLowerCase()})` : ''} · {x.hostel_role.replace(/_/g, ' ')}: {x.regular_name ? `${proper(x.regular_name)} → ` : ''}{proper(x.full_name)}</span>)}</div>}
          {others.length > 0 && <div className="ra-others"><span className="ra-cap">Other places today</span>{others.map((x) => <div key={x.duty_id} className="ra-row"><span className="ra-row-text"><b>{x.hostel_role.replace(/_/g, ' ')}{x.shift !== 'General' ? ` · ${x.shift.toLowerCase()}` : ''}</b><small>{x.full_name ? proper(x.full_name) : 'Nobody available'}{x.source === 'Cover' ? ` · for ${proper(x.regular_name)}` : ''}</small></span></div>)}</div>}
          <div className="ra-legend ra-legend-sm"><span><i className="ra-lg-home" />Home floor</span><span><i className="ra-lg-re" />Reassigned</span><span><i className="ra-lg-split" />Floor shared by rooms</span><span><i className="ra-lg-un" />Nobody present</span></div>
        </section>
      </div>
      {slot && <SlotPanel d={slot} people={people} onClose={() => setSlot(null)} onDone={() => { setSlot(null); day.mutate(); }} />}
    </div>
  );
}

function SlotPanel({ d, people, onClose, onDone }: { d: Duty; people: Person[]; onClose: () => void; onDone: () => void }) {
  const here = people.filter((p) => isIn(p.status));
  const [who, setWho] = useState(d.staff_id ?? '');
  const { run, busy } = useAction();
  return (
    <Drawer open onClose={onClose} title={`${d.hostel_role.replace(/_/g, ' ')}${d.shift !== 'General' ? `, ${d.shift.toLowerCase()} shift` : ''}`} subtitle={d.space_code ? `Washroom ${d.space_code}${d.zone_name ? `, ${d.zone_name}` : ''}` : d.zone_name ?? 'Whole hostel'}
      footer={<Button variant="primary" loading={busy} onClick={() => run(() => api(`/roster/duties/${d.duty_id}`, { method: 'POST', json: { staff_id: who || null } }).then(onDone), who ? 'Place changed; kept when Auto-assign runs again' : 'Place left open')}>Save</Button>}>
      <div className="klh-stack" style={{ gap: 14 }}>
        <p className="klh-muted" style={{ margin: 0 }}>Now: {d.full_name ? proper(d.full_name) : 'nobody'}{d.regular_name ? ` · mapped person ${proper(d.regular_name)}` : ''}</p>
        <Field label="Give this place to" hint="People marked present today"><Select value={who} onChange={(e) => setWho(e.target.value)} options={[{ value: '', label: 'Nobody (leave open)' }, ...here.map((p) => ({ value: p.staff_id, label: `${proper(p.full_name)} · ${p.main_role.replace(/_/g, ' ')} · ${p.duties} place${p.duties === 1 ? '' : 's'}` }))]} /></Field>
      </div>
    </Drawer>
  );
}
