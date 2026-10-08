import { useMemo, useState } from 'react';
import { BedMap, Button, Card, ConfirmDialog, DataTable, EmptyState, Field, Input, Notice, Person, Select, StatusChip, formatDate } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, bedLabel, roomLabel, titleCase, useAction, useApi, useSession } from '@/lib/ui';
import type { Bed } from './Allotment';

type Alloc = { hostel_alloc_id: number; staff_id: string; full_name: string; designation: string; subspace_id: string; room_code: string; floor_name: string; hostel_name: string; allocation_date: string; vacate_date: string | null; key_no: string; approved_by: string; status: string };
type Staff = { staff_id: string; full_name: string; designation: string; dept_code: string };

/** MAP-05 Staff room allotment: rooms for resident faculty and staff (after approval). Office C. */
export default function StaffRooms() {
  const hostels = useApi<{ facility_id: string; facility_name: string }[]>('/hostels');
  const [facility, setFacility] = useState('');
  const fac = facility || hostels.data?.[0]?.facility_id || '';
  const list = useApi<Alloc[]>(`/staff-allocations${fac ? `?facility_id=${fac}` : ''}`);
  const beds = useApi<Bed[]>(fac ? `/beds?facility_id=${fac}` : null);
  const [q, setQ] = useState('');
  const staff = useApi<Staff[]>(q.length >= 2 ? `/staff?q=${encodeURIComponent(q)}` : null);
  const role = useSession()?.role;
  const cw = role === 'Chief_Warden' || role === 'Director_Hostels';
  const [f, setF] = useState({ staff_id: '', subspace_id: '', key_no: '', reason: '' });
  const [vacate, setVacate] = useState<Alloc | null>(null);
  const { run, busy } = useAction();
  const rooms = useMemo(() => {
    const bySpace = new Map<string, Bed[]>();
    (beds.data ?? []).filter((b) => b.reserved_for === 'Staff' || b.bed_status === 'Vacant').forEach((b) => bySpace.set(b.space_id, [...(bySpace.get(b.space_id) ?? []), b]));
    return [...bySpace.entries()].map(([space, l]) => ({ no: roomLabel(space), type: l[0].type_name, reserved: l[0].reserved_for as 'None', maintenance: l[0].room_status === 'Under_Maintenance', beds: l.map((b) => ({ id: b.subspace_id, status: (b.bed_status === 'Damaged' ? 'Under Maintenance' : b.bed_status) as 'Vacant', occupant: b.student_id ?? undefined })) }));
  }, [beds.data]);
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="MAP-05" subtitle="Resident faculty and staff get a room on the Chief Warden's approval. Rooms reserved for staff appear first."
        actions={<Field label="Hostel"><Select value={fac} onChange={(e) => setFacility(e.target.value)} options={(hostels.data ?? []).map((h) => ({ value: h.facility_id, label: h.facility_name }))} /></Field>} />
      <div className="klh-grid-2">
        <Card icon="user" color="brand" title={cw ? 'Allot a room to a staff member' : 'Ask for a staff room'}>
          <form className="klh-stack" style={{ gap: 16 }} onSubmit={(e) => { e.preventDefault(); run(() => (cw ? api('/staff-allocations', { method: 'POST', json: { staff_id: f.staff_id, subspace_id: f.subspace_id, key_no: f.key_no, approved_by: '', remarks: f.reason || undefined } })
              : api('/exceptions', { method: 'POST', json: { kind: 'Staff_Room', staff_id: f.staff_id, subspace_id: f.subspace_id, key_no: f.key_no, reason: f.reason } })).then(() => { list.mutate(); beds.mutate(); setF({ staff_id: '', subspace_id: '', key_no: '', reason: '' }); }), cw ? 'Room allotted' : 'Sent to the Chief Warden'); }}>
            <Field label="Find staff" hint="Name or employee ID"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least two characters" /></Field>
            {staff.data && <Field label="Staff member" required><Select value={f.staff_id} onChange={(e) => setF({ ...f, staff_id: e.target.value })} options={[{ value: '', label: 'Choose' }, ...staff.data.map((x) => ({ value: x.staff_id, label: `${x.full_name} · ${x.designation} (${x.staff_id})` }))]} /></Field>}
            <Field label="Bed" required derived={!!f.subspace_id} value={f.subspace_id ? `${roomLabel(f.subspace_id.replace(/-B\d+$/, ''))}, bed ${bedLabel(f.subspace_id).slice(-1)}` : undefined}>{!f.subspace_id && <p className="klh-muted" style={{ margin: 0 }}>Pick a vacant bed on the map.</p>}</Field>
            <div className="klh-grid-2">
              <Field label="Key number" required><Input value={f.key_no} onChange={(e) => setF({ ...f, key_no: e.target.value })} /></Field>
              <Field label="Reason" required={!cw} hint={cw ? 'Optional' : 'The Chief Warden reads this'}><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Visiting faculty for the semester" /></Field>
            </div>
            <div><Button type="submit" variant="primary" icon="key" loading={busy} blockedReason={!f.staff_id ? 'Choose the staff member.' : !f.subspace_id ? 'Pick a bed on the map.' : !f.key_no ? 'Enter the key number.' : !cw && f.reason.trim().length < 5 ? 'Write the reason.' : undefined}>{cw ? 'Allot room' : 'Send to the Chief Warden'}</Button></div>
          </form>
        </Card>
        <Card icon="bed" color="brand" title="Vacant beds and staff rooms">{rooms.length ? <BedMap rooms={rooms} selectable selected={f.subspace_id} onSelect={(id) => setF({ ...f, subspace_id: id })} legend /> : <Notice tone="info" title="No vacant beds">Reserve a room for staff under MAP-01 Rooms and beds.</Notice>}</Card>
      </div>
      <Card padding={0}>
        <DataTable caption="Staff allotments" rowKey="hostel_alloc_id" rows={list.data ?? []} loading={!list.data} searchable onRowClick={(r) => (r as Alloc).status === 'Active' && setVacate(r as Alloc)} empty={<EmptyState icon="user" title="No staff rooms allotted" />}
          columns={[
            { key: 'full_name', label: 'Staff', render: (v: string, r: Alloc) => <Person name={titleCase(v)} sub={`${r.staff_id} · ${r.designation}`} /> },
            { key: 'room_code', label: 'Room', render: (v: string, r: Alloc) => `${r.hostel_name} ${v}, bed ${bedLabel(r.subspace_id).slice(-1)}` },
            { key: 'allocation_date', label: 'Since', render: (v: string) => formatDate(v) },
            { key: 'key_no', label: 'Key', render: (v: string) => <span className="klh-code">{v}</span> },
            { key: 'approved_by', label: 'Approved by' },
            { key: 'status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
          ]} />
      </Card>
      <ConfirmDialog open={!!vacate} title={`Vacate ${titleCase(vacate?.full_name)} from ${vacate?.room_code}?`} body="The bed becomes vacant today. Record the key return and room condition under Workflow N when it is built." tone="danger" confirmLabel="Vacate" onCancel={() => setVacate(null)} onConfirm={() => { const a = vacate!; setVacate(null); run(() => api(`/staff-allocations/${a.hostel_alloc_id}/vacate`, { method: 'POST' }).then(() => { list.mutate(); beds.mutate(); }), 'Vacated'); }} />
    </div>
  );
}
