import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, Checkbox, Field, Icon, Input, Notice, Select } from '@/lib/klh';
import { api, ApiError } from '@/lib/api';
import { Panel } from '@/ui/kit';
import { ScreenHeader, toast, useApi } from '@/lib/ui';

type Hostel = { facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string; no_of_floors: number | null };
type RoomType = { room_type_id: number; type_name: string; sharing_count: number; is_ac: boolean };
type Range = { from: string; to: string; room_type_id: string };
type Plan = {
  hostel: string; floors: { name: string; first: string; last: string; exists: boolean }[]; new_floors: number; new_rooms: number; new_beds: number; skipped: number;
  by_type: { room_type_id: number; type_name: string; rooms: number; beds: number }[]; unused_positions: number; built: boolean;
};
const n = (v: number) => v.toLocaleString('en-IN');

/**
 * Room builder (Administrator): a whole building in one step. Floors, rooms per floor and which room numbers are which
 * room type; the preview shows every count before anything is saved. Numbers follow decision D8: the floor, then two digits.
 */
export default function RoomBuilder() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const hostels = useApi<Hostel[]>('/hostels');
  const types = useApi<RoomType[]>('/room-types');
  const [hostel, setHostel] = useState(params.get('hostel') ?? '');
  const [floors, setFloors] = useState('13');
  const [ground, setGround] = useState(true);
  const [perFloor, setPerFloor] = useState('40');
  const [ranges, setRanges] = useState<Range[]>([{ from: '1', to: '40', room_type_id: '' }]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!hostel && hostels.data?.length) setHostel(hostels.data[0].facility_id); }, [hostels.data, hostel]);
  useEffect(() => { if (types.data?.length && ranges.some((r) => !r.room_type_id)) setRanges((rs) => rs.map((r) => (r.room_type_id ? r : { ...r, room_type_id: String(types.data![0].room_type_id) }))); }, [types.data]);   // eslint-disable-line react-hooks/exhaustive-deps

  const body = useMemo(() => ({
    floors: Number(floors), ground, rooms_per_floor: Number(perFloor),
    ranges: ranges.map((r) => ({ from: Number(r.from), to: Number(r.to), room_type_id: Number(r.room_type_id) })),
  }), [floors, ground, perFloor, ranges]);
  const invalid = !hostel ? 'Choose a hostel.' : !(body.floors >= 1 && body.floors <= 30) ? 'Floors: 1 to 30.' : !(body.rooms_per_floor >= 1 && body.rooms_per_floor <= 99) ? 'Rooms per floor: 1 to 99.'
    : body.ranges.some((r) => !r.room_type_id || !r.from || !r.to) ? 'Give every range its rooms and a room type.' : '';

  // preview on every change
  useEffect(() => {
    if (invalid) { setPlan(null); return; }
    const t = setTimeout(() => {
      api<Plan>(`/admin/hostels/${hostel}/build`, { method: 'POST', json: { ...body, dry_run: true } })
        .then((p) => { setPlan(p); setProblem(''); })
        .catch((e) => { setPlan(null); setProblem(e instanceof ApiError ? e.message : String(e)); });
    }, 300);
    return () => clearTimeout(t);
  }, [hostel, body, invalid]);

  const build = async () => {
    setBusy(true);
    try {
      const p = await api<Plan>(`/admin/hostels/${hostel}/build`, { method: 'POST', json: { ...body, dry_run: false } });
      setPlan({ ...p, new_rooms: 0, new_beds: 0, new_floors: 0, skipped: p.skipped + p.new_rooms });
      toast(`${n(p.new_rooms)} rooms and ${n(p.new_beds)} beds built in ${p.hostel}`);
      hostels.mutate();
    } catch (e) { setProblem(e instanceof ApiError ? e.message : String(e)); } finally { setBusy(false); }
  };
  const setRange = (i: number, k: keyof Range, v: string) => setRanges(ranges.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const h = hostels.data?.find((x) => x.facility_id === hostel);
  const typeLabel = (t: RoomType) => `${t.type_name} · ${t.sharing_count} bed${t.sharing_count > 1 ? 's' : ''}`;

  return (
    <div className="klh-stack" style={{ gap: 16 }}>
      <ScreenHeader code="ADM-05" title="Room builder" subtitle="Build every floor, room and bed of a hostel in one step. Room numbers start with the floor: G01 on the ground floor, 101 on floor 1, 1207 on floor 12. Beds are lettered A, B, C." />
      <div className="ui-bento">
        <Panel className="ui-c5" title="Pattern" sub={h ? `${h.facility_name} · ${h.hostel_gender}` : undefined}>
          <div className="klh-stack" style={{ gap: 14 }}>
            <Field label="Hostel" required><Select value={hostel} onChange={(e) => setHostel(e.target.value)} options={(hostels.data ?? []).map((x) => ({ value: x.facility_id, label: `${x.hostel_code} · ${x.facility_name}` }))} /></Field>
            <div className="rb-row">
              <Field label="Floors" required hint={ground ? `G and 1 to ${Math.max(0, Number(floors) - 1)}` : `1 to ${floors}`}><Input type="number" min={1} max={30} value={floors} onChange={(e) => setFloors(e.target.value)} /></Field>
              <Field label="Rooms on each floor" required><Input type="number" min={1} max={99} value={perFloor} onChange={(e) => setPerFloor(e.target.value)} /></Field>
            </div>
            <Checkbox label="Count the ground floor" description="Its rooms are G01, G02 …" checked={ground} onChange={setGround} />
            <div className="rb-ranges">
              <span className="rb-cap">Room types by room number on each floor</span>
              {ranges.map((r, i) => (
                <div key={i} className="rb-range">
                  <Input aria-label="From room" type="number" min={1} value={r.from} onChange={(e) => setRange(i, 'from', e.target.value)} />
                  <span>to</span>
                  <Input aria-label="To room" type="number" min={1} value={r.to} onChange={(e) => setRange(i, 'to', e.target.value)} />
                  <Select aria-label="Room type" value={r.room_type_id} onChange={(e) => setRange(i, 'room_type_id', e.target.value)} options={(types.data ?? []).map((t) => ({ value: String(t.room_type_id), label: typeLabel(t) }))} />
                  {ranges.length > 1 && <button type="button" className="rb-x" aria-label="Remove this range" onClick={() => setRanges(ranges.filter((_, j) => j !== i))}><Icon name="x" size={14} /></button>}
                </div>))}
              <div><Button size="sm" variant="ghost" icon="plus" onClick={() => { const last = Number(ranges.at(-1)?.to ?? 0); setRanges([...ranges, { from: String(Math.min(last + 1, Number(perFloor))), to: perFloor, room_type_id: ranges.at(-1)?.room_type_id ?? '' }]); }}>Add a range</Button></div>
            </div>
          </div>
        </Panel>

        <Panel className="ui-c7" title="Preview" sub="Nothing is saved until you build">
          {problem && <Notice tone="critical" title="Check the pattern">{problem}</Notice>}
          {!plan && !problem && <p className="klh-muted">{invalid || 'Working out the counts…'}</p>}
          {plan && (
            <div className="klh-stack" style={{ gap: 16 }}>
              <div className="rb-figs">
                <div><b>{n(plan.new_rooms)}</b><span>new rooms</span></div>
                <div><b>{n(plan.new_beds)}</b><span>new beds</span></div>
                <div><b>{plan.floors.length}</b><span>floors{plan.new_floors ? `, ${plan.new_floors} new` : ''}</span></div>
                <div><b>{n(plan.skipped)}</b><span>already built</span></div>
              </div>
              {plan.unused_positions > 0 && <Notice tone="warning" title={`${plan.unused_positions} room number${plan.unused_positions > 1 ? 's' : ''} on each floor have no type`}>Those rooms are not built. Add a range for them if they exist.</Notice>}
              <div className="rb-floors" aria-label="Floors">
                {[...plan.floors].reverse().map((f) => <div key={f.name} className={f.exists ? 'rb-floor rb-floor-old' : 'rb-floor'}><b>{f.name}</b><span className="ra-mono">{f.first} – {f.last}</span></div>)}
              </div>
              {plan.by_type.length > 0 && (
                <table className="klh-table">
                  <thead><tr><th>Room type</th><th className="klh-num">Rooms</th><th className="klh-num">Beds</th></tr></thead>
                  <tbody>{plan.by_type.map((t) => <tr key={t.room_type_id}><td>{t.type_name}</td><td className="klh-num">{n(t.rooms)}</td><td className="klh-num">{n(t.beds)}</td></tr>)}</tbody>
                </table>)}
              <div className="klh-row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <Button variant="primary" icon="building" loading={busy} blockedReason={plan.new_rooms || plan.new_floors ? undefined : 'Everything in this pattern is already built.'} onClick={build}>
                  {plan.new_rooms ? `Build ${n(plan.new_rooms)} rooms and ${n(plan.new_beds)} beds` : 'Build'}</Button>
                <Button variant="ghost" onClick={() => navigate('/rooms')}>Open the room map</Button>
              </div>
              <p className="klh-muted" style={{ margin: 0, fontSize: 13 }}>Rooms are built without meters or QR labels; the set-up board lists what is still missing.</p>
            </div>)}
        </Panel>
      </div>
    </div>
  );
}
