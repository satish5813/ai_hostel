import { useMemo, useState } from 'react';
import { BedMap, Card, ConfirmDialog, DonutChart, Field, Select, StatCard } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, roomLabel, useAction, useApi, useSession } from '@/lib/ui';
import { can } from '@/app/screens';
import type { Bed } from './Allotment';
import { bedLetter } from '@/lib/beds';

/** REG-08 Occupancy board: beds vacant, held, occupied, under maintenance. Office E marks a bed blocked or released; Maintenance E marks a room under maintenance. */
export default function Occupancy() {
  const s = useSession()!;
  const hostels = useApi<{ facility_id: string; facility_name: string }[]>('/hostels');
  const [facility, setFacility] = useState('');
  const fac = facility || hostels.data?.[0]?.facility_id || '';
  const beds = useApi<Bed[]>(fac ? `/beds?facility_id=${fac}` : null);
  const [pick, setPick] = useState<{ bed: Bed; action: 'block' | 'release' | 'maintain' | 'fit' } | null>(null);
  const { run } = useAction();
  const officeEdit = can(s.role, 'REG-08', 'E') && ['Office_Staff', 'Room_Allotment', 'Chief_Warden', 'Director_Hostels'].includes(s.role);
  const maintEdit = s.role === 'Maintenance_Supervisor';
  const counts = useMemo(() => (beds.data ?? []).reduce<Record<string, number>>((m, b) => ({ ...m, [b.room_status === 'Under_Maintenance' ? 'Under_Maintenance' : b.bed_status]: (m[b.room_status === 'Under_Maintenance' ? 'Under_Maintenance' : b.bed_status] ?? 0) + 1 }), {}), [beds.data]);
  const floors = useMemo(() => {
    const byFloor = new Map<string, Map<string, Bed[]>>();
    (beds.data ?? []).forEach((b) => { const f = byFloor.get(b.floor_name) ?? new Map(); f.set(b.space_id, [...(f.get(b.space_id) ?? []), b]); byFloor.set(b.floor_name, f); });
    return [...byFloor.entries()].map(([floor, rooms]) => ({ floor, rooms: [...rooms.entries()].map(([space, list]) => ({ no: roomLabel(space), type: list[0].type_name, reserved: list[0].reserved_for as 'None', maintenance: list[0].room_status === 'Under_Maintenance', blockedReason: list[0].room_status === 'Under_Maintenance' ? 'Under maintenance' : undefined, beds: list.map((b) => ({ id: b.subspace_id, status: (b.bed_status === 'Damaged' ? 'Under Maintenance' : b.bed_status) as 'Vacant', occupant: b.student_id ?? undefined })) })) }));
  }, [beds.data]);
  const total = beds.data?.length ?? 0;
  const onPick = (id: string) => {
    const b = beds.data?.find((x) => x.subspace_id === id); if (!b) return;
    if (maintEdit) setPick({ bed: b, action: b.room_status === 'Under_Maintenance' ? 'fit' : 'maintain' });
    else if (officeEdit && b.bed_status === 'Vacant') setPick({ bed: b, action: 'block' });
    else if (officeEdit && b.bed_status === 'Damaged') setPick({ bed: b, action: 'release' });
  };
  const title = pick ? ({ block: `Block bed ${pick.bed.room_code}-${bedLetter(pick.bed.bed_code)}?`, release: `Release bed ${pick.bed.room_code}-${bedLetter(pick.bed.bed_code)}?`, maintain: `Mark room ${pick.bed.room_code} under maintenance?`, fit: `Mark room ${pick.bed.room_code} fit again?` })[pick.action] : '';
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="REG-08" subtitle={officeEdit ? 'Click a vacant bed to block it, or a blocked bed to release it, with a reason. Occupied and held beds change only through the workflow.' : maintEdit ? 'Click a bed to mark its room under maintenance or fit again.' : 'View only.'}
        actions={<Field label="Hostel"><Select value={fac} onChange={(e) => setFacility(e.target.value)} options={(hostels.data ?? []).map((h) => ({ value: h.facility_id, label: h.facility_name }))} /></Field>} />
      <div className="klh-grid-4">
        <StatCard color="indigo" icon="bed" label="Occupancy" value={total ? `${Math.round(((counts.Occupied ?? 0) / total) * 100)}%` : '—'} sub={`${counts.Occupied ?? 0} of ${total} beds`} />
        <StatCard color="brand" icon="check" label="Vacant" value={String(counts.Vacant ?? 0)} />
        <StatCard color="violet" icon="clock" label="Held" value={String(counts.Held ?? 0)} sub="offer awaiting acceptance" />
        <StatCard color="orange" icon="alert" label="Blocked or under maintenance" value={String((counts.Damaged ?? 0) + (counts.Under_Maintenance ?? 0))} />
      </div>
      <div className="klh-grid-2">
        <Card icon="gauge" color="indigo" title="Beds by state"><DonutChart data={[{ label: 'Occupied', value: counts.Occupied ?? 0, color: 'c1' }, { label: 'Vacant', value: counts.Vacant ?? 0, color: 'c4' }, { label: 'Held', value: counts.Held ?? 0, color: 'c2' }, { label: 'Blocked', value: (counts.Damaged ?? 0) + (counts.Under_Maintenance ?? 0), color: 'c3' }]} centerValue={String(total)} centerLabel="beds" legend label="Beds by state" /></Card>
        <Card icon="info" color="indigo" title="How a bed changes state"><ul style={{ margin: 0, paddingLeft: 20 }}><li>Vacant to Held: a room offer (REG-05); back to Vacant when the hold ends or the student declines.</li><li>Held to Occupied: check-in (REG-06). Occupied to Vacant: check-out (Workflow N).</li><li>Vacant to Blocked and back: the Residency Office, with a reason (this screen).</li><li>Room under maintenance: the Maintenance Supervisor (this screen); its beds cannot be offered.</li></ul></Card>
      </div>
      {floors.map((f) => <Card key={f.floor} icon="building" color="indigo" title={f.floor} subtitle={`${f.rooms.length} rooms`}><BedMap rooms={f.rooms} selectable={officeEdit || maintEdit} onSelect={onPick} legend /></Card>)}
      <ConfirmDialog open={!!pick} title={title} tone={pick?.action === 'block' || pick?.action === 'maintain' ? 'danger' : 'primary'} confirmLabel={pick ? ({ block: 'Block bed', release: 'Release bed', maintain: 'Mark under maintenance', fit: 'Mark fit' })[pick.action] : ''} requireRemarks remarksLabel="Reason (recorded in the audit log)"
        onCancel={() => setPick(null)} onConfirm={(reason) => { const p = pick!; setPick(null); run(() => (p.action === 'block' || p.action === 'release' ? api(`/beds/${p.bed.subspace_id}/status`, { method: 'POST', json: { status: p.action === 'block' ? 'Damaged' : 'Vacant', reason } }) : api(`/rooms/${p.bed.space_id}/status`, { method: 'POST', json: { status: p.action === 'maintain' ? 'Under_Maintenance' : 'Available', reason } })).then(() => beds.mutate()), 'Recorded'); }} />
    </div>
  );
}
