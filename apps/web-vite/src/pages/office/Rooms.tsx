import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Checkbox, Drawer, Field, Icon, Input, Notice, Select, StatusChip } from '@/lib/klh';
import { api } from '@/lib/api';
import { Panel, PillTabs } from '@/ui/kit';
import { ScreenHeader, useAction, useApi, useSession, words } from '@/lib/ui';
import { can } from '@/app/screens';

type Space = { space_id: string; space_code: string; space_name: string; space_category: string; status: string; room_type_id: number | null; type_name: string | null; sharing_count: number | null; is_ac: boolean | null; reserved_for: string | null; is_accessible: boolean | null; beds: number; occupied: number };
type Floor = { zone_id: string; zone_name: string; sequence_no: number; spaces: Space[] };
type Hostel = { facility_id: string; facility_name: string; hostel_code: string; hostel_gender: string; floors: Floor[] };
type RoomType = { room_type_id: number; type_name: string; sharing_count: number; is_ac: boolean };
const typeCode = (s: Space) => (s.space_category !== 'Hostel_Room' ? words(s.space_category) : s.sharing_count ? `${s.sharing_count}S ${s.is_ac ? 'AC' : 'NAC'}` : 'No type');
/** "301-306, 310" -> ['301', … '306', '310']; "G01-G40" keeps the G and the two digits (room numbering D8) */
const expand = (text: string) => text.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean).flatMap((part) => {
  const m = part.match(/^([A-Z]*)(\d+)\s*-\s*\1?(\d+)$/); if (!m) return [part];
  const a = Number(m[2]), b = Number(m[3]), w = m[1] ? m[2].length : 0;
  return b >= a && b - a < 200 ? Array.from({ length: b - a + 1 }, (_, i) => `${m[1]}${String(a + i).padStart(w, '0')}`) : [part];
});
/** Room numbers start with the floor: G01… on the ground floor, 101… on floor 1, 1201… on floor 12. */
const floorRange = (seq: number) => (seq <= 0 ? 'G01-G40' : `${seq}01-${seq}40`);

/**
 * MAP-01 Rooms and beds. One block per hostel: rooms or other areas, a tab per floor, a tile per room.
 * The Data Administrator (X) and the Hostel Office (C E) add floors and rooms; everyone else reads.
 */
export default function Rooms() {
  const s = useSession()!;
  const navigate = useNavigate();
  const builds = can(s.role, 'MAP-01', 'X') || can(s.role, 'MAP-01', 'C');
  const hostels = useApi<Hostel[]>('/structure');
  const types = useApi<RoomType[]>('/room-types');
  const [add, setAdd] = useState<{ hostel: Hostel; floor: Floor; category: string } | null>(null);
  const [edit, setEdit] = useState<{ hostel: Hostel; floor: Floor; space: Space } | null>(null);
  return (
    <div className="klh-stack" style={{ gap: 18 }}>
      <ScreenHeader code="MAP-01" subtitle={builds ? 'Add a floor, then its rooms. A room gets one bed for each sharing place of its room type.' : 'Buildings, floors, rooms and beds. View only for your role.'}
        actions={s.role === 'admin' ? <Button variant="accent" icon="plus" onClick={() => navigate('/admin/masters?tab=hostels')}>Add residency</Button> : undefined} />
      {hostels.data?.length === 0 && <Notice tone="warning" title="No hostel building yet">The Data Administrator adds the first residency under Masters.</Notice>}
      {hostels.data?.map((h) => <HostelBlock key={h.facility_id} hostel={h} builds={builds} onAdd={(floor, category) => setAdd({ hostel: h, floor, category })} onEdit={(floor, space) => setEdit({ hostel: h, floor, space })} onChange={() => hostels.mutate()} />)}
      {add && <AddRooms ctx={add} types={types.data ?? []} onClose={() => setAdd(null)} onDone={() => { hostels.mutate(); setAdd(null); }} />}
      {edit && <EditRoom ctx={edit} types={types.data ?? []} editable={builds} onClose={() => setEdit(null)} onDone={() => { hostels.mutate(); setEdit(null); }} />}
    </div>
  );
}

function HostelBlock({ hostel, builds, onAdd, onEdit, onChange }: { hostel: Hostel; builds: boolean; onAdd: (floor: Floor, category: string) => void; onEdit: (floor: Floor, space: Space) => void; onChange: () => void }) {
  const [kind, setKind] = useState('rooms');
  const [zone, setZone] = useState(hostel.floors[0]?.zone_id ?? '');
  const { run, busy } = useAction();
  const floor = hostel.floors.find((f) => f.zone_id === zone) ?? hostel.floors[0];
  const spaces = (floor?.spaces ?? []).filter((x) => (kind === 'rooms' ? x.space_category === 'Hostel_Room' : x.space_category !== 'Hostel_Room'));
  const totals = useMemo(() => hostel.floors.reduce((a, f) => ({ rooms: a.rooms + f.spaces.filter((x) => x.space_category === 'Hostel_Room').length, beds: a.beds + f.spaces.reduce((b, x) => b + Number(x.beds), 0), occ: a.occ + f.spaces.reduce((b, x) => b + Number(x.occupied), 0), other: a.other + f.spaces.filter((x) => x.space_category !== 'Hostel_Room').length }), { rooms: 0, beds: 0, occ: 0, other: 0 }), [hostel]);
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', margin: '4px 2px 10px' }}>
        <h2 style={{ fontSize: 19, lineHeight: '26px', fontWeight: 600, margin: 0 }}>{hostel.facility_name}</h2>
        <span className="klh-muted" style={{ fontSize: 13 }}>{hostel.hostel_code}, {hostel.hostel_gender.toLowerCase()} · {totals.rooms} rooms · {totals.beds} beds · {totals.occ} occupied</span>
      </div>
      <PillTabs size="sm" value={kind} onChange={setKind} tabs={[{ id: 'rooms', label: 'Hostel rooms', icon: 'bed', count: totals.rooms }, { id: 'other', label: 'Common areas', icon: 'building', count: totals.other }]} />
      <Panel style={{ marginTop: 10, padding: '4px 16px 16px' }}>
        <div className="ui-floors">
          <div className="ui-floor-tabs" role="tablist" aria-label={`Floors of ${hostel.facility_name}`}>
            {hostel.floors.map((f) => <button key={f.zone_id} role="tab" aria-selected={f.zone_id === floor?.zone_id} className="ui-floor-tab" onClick={() => setZone(f.zone_id)}>{f.zone_name}</button>)}
          </div>
          {builds && <button className="ui-dashed" disabled={busy} onClick={() => run(() => api<{ zone_id: string }>(`/hostels/${hostel.facility_id}/floors`, { method: 'POST', json: {} }).then((r) => { onChange(); setZone(r.zone_id); }), 'Floor added')}><Icon name="plus" size={14} />Add floor</button>}
        </div>
        <div className="ui-rooms">
          {builds && floor && <button className="ui-room ui-room-add" onClick={() => onAdd(floor, kind === 'rooms' ? 'Hostel_Room' : 'Common_Area')}><Icon name="plus" size={18} />{kind === 'rooms' ? 'Add room' : 'Add area'}</button>}
          {spaces.map((x) => (
            <button key={x.space_id} className={`ui-room${x.status === 'Under_Maintenance' ? ' ui-room-off' : ''}`} onClick={() => onEdit(floor!, x)} title={`${x.space_name}${x.type_name ? `, ${x.type_name}` : ''}${x.reserved_for && x.reserved_for !== 'None' ? `, reserved for ${x.reserved_for.toLowerCase()}` : ''}`}>
              <span className="ui-room-cap">{x.space_category === 'Hostel_Room' ? 'Room no' : 'Area'}</span>
              <span className="ui-room-no">{x.space_code}</span>
              {x.beds > 0 && <span className="ui-beds" aria-label={`${x.occupied} of ${x.beds} beds occupied`}>{Array.from({ length: Number(x.beds) }, (_, i) => <span key={i} className={`ui-bed${i < Number(x.occupied) ? ' ui-bed-on' : ''}`} />)}</span>}
              <span className="ui-room-type">{typeCode(x)}</span>
            </button>))}
          {!builds && spaces.length === 0 && <p className="klh-muted" style={{ gridColumn: '1 / -1', margin: 0 }}>Nothing on this floor yet.</p>}
        </div>
        {builds && spaces.length === 0 && <p className="klh-muted" style={{ margin: '4px 4px 0', fontSize: 13 }}>{kind === 'rooms' ? `No rooms on this floor yet. Add a range such as ${floorRange(floor?.sequence_no ?? 1)} in one go.` : 'No toilet block, common room or store recorded on this floor.'}</p>}
      </Panel>
    </section>
  );
}

function AddRooms({ ctx, types, onClose, onDone }: { ctx: { hostel: Hostel; floor: Floor; category: string }; types: RoomType[]; onClose: () => void; onDone: () => void }) {
  const isRoom = ctx.category === 'Hostel_Room';
  const [f, setF] = useState({ numbers: '', category: isRoom ? 'Hostel_Room' : 'Common_Area', room_type_id: '', reserved_for: 'None', is_accessible: false });
  const { run, busy } = useAction();
  const nos = expand(f.numbers);
  const rt = types.find((t) => String(t.room_type_id) === f.room_type_id);
  const bad = nos.find((n) => !/^[A-Za-z0-9]{1,6}$/.test(n));
  return (
    <Drawer open onClose={onClose} title={isRoom ? 'Add rooms' : 'Add an area'} subtitle={`${ctx.hostel.facility_name}, ${ctx.floor.zone_name}`}
      footer={<Button variant="primary" icon="plus" loading={busy} blockedReason={!nos.length ? 'Enter at least one number.' : bad ? `"${bad}" is not a valid number.` : isRoom && !rt ? 'Choose the room type.' : undefined}
        onClick={() => run(() => api(`/floors/${ctx.floor.zone_id}/rooms`, { method: 'POST', json: { room_nos: nos, space_category: f.category, room_type_id: isRoom ? Number(f.room_type_id) : undefined, reserved_for: f.reserved_for, is_accessible: f.is_accessible } }).then(onDone), `${nos.length} ${isRoom ? 'room' : 'area'}${nos.length > 1 ? 's' : ''} added`)}>Add {nos.length || ''} {isRoom ? `room${nos.length === 1 ? '' : 's'}` : `area${nos.length === 1 ? '' : 's'}`}</Button>}>
      <div className="klh-stack" style={{ gap: 16 }}>
        <Field label={isRoom ? 'Room numbers' : 'Area codes'} required hint={isRoom ? `Floor number, then a two-digit room: ${floorRange(ctx.floor.sequence_no)} (ground floor: G01-G40)` : 'For example T3 or CR1'}><Input value={f.numbers} onChange={(e) => setF({ ...f, numbers: e.target.value })} placeholder={isRoom ? floorRange(ctx.floor.sequence_no) : 'T3'} autoFocus /></Field>
        {!isRoom && <Field label="Kind of area" required><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={['Common_Area', 'Toilet_Block', 'Store', 'Mess_Hall', 'Office'].map((c) => ({ value: c, label: words(c) }))} /></Field>}
        {isRoom && (<>
          <Field label="Room type" required><Select value={f.room_type_id} onChange={(e) => setF({ ...f, room_type_id: e.target.value })} options={[{ value: '', label: 'Choose' }, ...types.map((t) => ({ value: String(t.room_type_id), label: t.type_name }))]} /></Field>
          <Field label="Reserved for"><Select value={f.reserved_for} onChange={(e) => setF({ ...f, reserved_for: e.target.value })} options={['None', 'Staff', 'Guest', 'Medical']} /></Field>
          <Checkbox label="Accessible rooms" description="Ground floor or lift access, wide door, grab rails" checked={f.is_accessible} onChange={(v) => setF({ ...f, is_accessible: v })} />
          <Field label="This will create" derived value={nos.length && rt ? `${nos.length} room${nos.length > 1 ? 's' : ''} and ${nos.length * rt.sharing_count} beds` : 'Enter numbers and a room type'} />
        </>)}
        <Notice tone="info" title="Room IDs">Each room is stored as {ctx.hostel.hostel_code}-number, for example {ctx.hostel.hostel_code}-{nos[0] ?? '301'}. The ID is printed on the door label.</Notice>
      </div>
    </Drawer>
  );
}

function EditRoom({ ctx, types, editable, onClose, onDone }: { ctx: { hostel: Hostel; floor: Floor; space: Space }; types: RoomType[]; editable: boolean; onClose: () => void; onDone: () => void }) {
  const x = ctx.space;
  const isRoom = x.space_category === 'Hostel_Room';
  const [f, setF] = useState({ room_type_id: String(x.room_type_id ?? ''), reserved_for: x.reserved_for ?? 'None', is_accessible: !!x.is_accessible, approved_by: '' });
  const { run, busy } = useAction();
  const typeChanged = String(x.room_type_id ?? '') !== f.room_type_id;
  return (
    <Drawer open onClose={onClose} title={`${isRoom ? 'Room' : words(x.space_category)} ${x.space_code}`} subtitle={`${ctx.hostel.facility_name}, ${ctx.floor.zone_name} · ${x.space_id}`}
      footer={editable && isRoom ? <Button variant="primary" loading={busy} blockedReason={!f.room_type_id ? 'Choose the room type.' : undefined} onClick={() => run(() => api(`/rooms/${x.space_id}/profile`, { method: 'POST', json: { room_type_id: Number(f.room_type_id), reserved_for: f.reserved_for, is_accessible: f.is_accessible, approved_by: f.approved_by || undefined } }).then(onDone), 'Room updated')}>Save room</Button> : undefined}>
      <div className="klh-stack" style={{ gap: 16 }}>
        <dl className="klh-dl"><dt>Status</dt><dd><StatusChip status={x.status} /></dd>{isRoom && <><dt>Beds</dt><dd>{x.beds} beds, {x.occupied} occupied</dd></>}</dl>
        {isRoom && (editable ? (<>
          <Field label="Room type" required><Select value={f.room_type_id} onChange={(e) => setF({ ...f, room_type_id: e.target.value })} options={[{ value: '', label: 'Choose' }, ...types.map((t) => ({ value: String(t.room_type_id), label: t.type_name }))]} /></Field>
          {typeChanged && <Notice tone="warning" title="Beds are not changed">Changing the room type changes the fee band only. The room keeps its {x.beds} beds.</Notice>}
          <Field label="Reserved for"><Select value={f.reserved_for} onChange={(e) => setF({ ...f, reserved_for: e.target.value })} options={['None', 'Staff', 'Guest', 'Medical']} /></Field>
          <Checkbox label="Accessible room" checked={f.is_accessible} onChange={(v) => setF({ ...f, is_accessible: v })} />
          <Field label="Approved by" hint="Employee ID of the Chief Manager, when the Residency Office corrects a room"><Input value={f.approved_by} onChange={(e) => setF({ ...f, approved_by: e.target.value })} placeholder="S-CW" /></Field>
        </>) : <dl className="klh-dl"><dt>Room type</dt><dd>{x.type_name ?? 'Not set'}</dd><dt>Reserved for</dt><dd>{x.reserved_for}</dd><dt>Accessible</dt><dd>{x.is_accessible ? 'Yes' : 'No'}</dd></dl>)}
        <Notice tone="info" title="Blocking a bed or a room">Use REG-08 Occupancy board to block a bed or mark the room under maintenance; it needs a reason and is audited.</Notice>
      </div>
    </Drawer>
  );
}
