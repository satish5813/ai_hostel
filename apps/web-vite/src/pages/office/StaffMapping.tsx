import { useState } from 'react';
import { Button, Card, Checkbox, ConfirmDialog, DataTable, EmptyState, Field, Input, Notice, Person, Select, StatCard, StatusChip, formatDate } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, titleCase, useAction, useApi, useSession, words } from '@/lib/ui';
import { can } from '@/app/screens';

type Asg = { assignment_id: number; staff_id: string; full_name: string; mobile_no: string; hostel_role: string; facility_id: string; zone_id: string | null; space_id: string | null; shift: string; from_date: string; show_on_qr: boolean };
const ROLES = ['Chief_Warden', 'Warden', 'Assistant_Warden', 'Floor_Warden', 'Office_Staff', 'Room_Allotment', 'Accounts_Section', 'Security_Officer', 'Security_Guard', 'Mess_Incharge', 'Mess_Supervisor', 'Housekeeping_Supervisor', 'Cleaner', 'Maintenance_Supervisor', 'Electrician', 'Facility_Incharge', 'Counsellor'];

/** MAP-02 Staff mapping: who is responsible for which hostel, floor or area. Chief Manager C E; Warden A (cleaners); Dean A (wardens). */
export default function StaffMapping() {
  const s = useSession()!;
  const editable = can(s.role, 'MAP-02', 'C');
  const hostels = useApi<{ facility_id: string; facility_name: string }[]>('/hostels');
  const [facility, setFacility] = useState('');
  const list = useApi<Asg[]>(`/assignments${facility ? `?facility_id=${facility}` : ''}`);
  const floors = useApi<{ hostel_name: string; floor_name: string; occupied_beds: number }[]>('/reports/floors-without-warden');
  const [f, setF] = useState({ staff_id: '', hostel_role: 'Floor_Warden', zone_id: '', space_id: '', shift: 'General', show_on_qr: true });
  const [end, setEnd] = useState<Asg | null>(null);
  const { run, busy } = useAction();
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="MAP-02" subtitle={editable ? 'Assign Floor Managers and Facility In-charges; end assignments. Scope for every staff screen comes from these rows.' : 'View the mapping of your hostel; approve the assignments your role approves.'} />
      <div className="klh-grid-3">
        <StatCard color="brand" icon="users" label="Active duties" value={String(list.data?.length ?? 0)} />
        <StatCard color="violet" icon="building" label="Floor Managers" value={String(list.data?.filter((a) => a.hostel_role === 'Floor_Warden').length ?? 0)} />
        <StatCard color="orange" icon="alert" label="Floors with no Floor Manager" value={String(floors.data?.length ?? 0)} tone={floors.data?.length ? 'critical' : undefined} sub={floors.data?.map((x) => `${x.hostel_name} ${x.floor_name}`).join(', ') || 'all floors covered'} />
      </div>
      {editable && (
        <Card icon="users" color="brand" title="Assign a duty" subtitle="Who is responsible for a hostel, a floor or an area, and in which shift">
          <form className="klh-stack" style={{ gap: 16 }} onSubmit={(e) => { e.preventDefault(); run(() => api('/assignments', { method: 'POST', json: { ...f, facility_id: facility, zone_id: f.zone_id || undefined, space_id: f.space_id || undefined } }).then(() => { list.mutate(); floors.mutate(); }), 'Duty assigned'); }}>
            <div className="klh-grid-3">
              <Field label="Hostel" required><Select value={facility} onChange={(e) => setFacility(e.target.value)} options={[{ value: '', label: 'Choose' }, ...(hostels.data ?? []).map((h) => ({ value: h.facility_id, label: h.facility_name }))]} /></Field>
              <Field label="Employee ID" required><Input value={f.staff_id} onChange={(e) => setF({ ...f, staff_id: e.target.value })} required /></Field>
              <Field label="Duty" required><Select value={f.hostel_role} onChange={(e) => setF({ ...f, hostel_role: e.target.value })} options={ROLES.map((r) => ({ value: r, label: words(r) }))} /></Field>
              <Field label="Shift"><Select value={f.shift} onChange={(e) => setF({ ...f, shift: e.target.value })} options={['General', 'Morning', 'Evening', 'Night']} /></Field>
              <Field label="Floor" hint="Zone ID; empty means the whole hostel"><Input value={f.zone_id} onChange={(e) => setF({ ...f, zone_id: e.target.value })} placeholder="BH1-F1" /></Field>
              <Field label="Area" hint="Space ID of a toilet block, store or common room"><Input value={f.space_id} onChange={(e) => setF({ ...f, space_id: e.target.value })} placeholder="BH1-T1" /></Field>
            </div>
            <Checkbox label="Show on door labels" description="Name and phone appear on the QR page of every place this duty covers" checked={f.show_on_qr} onChange={(v) => setF({ ...f, show_on_qr: v })} />
            <div><Button type="submit" variant="primary" icon="plus" loading={busy} blockedReason={!facility ? 'Choose a hostel.' : !f.staff_id ? 'Enter the employee ID.' : undefined}>Assign duty</Button></div>
          </form>
        </Card>)}
      {!editable && <Notice tone="info" title="Approvals">Warden: approve cleaner assignments proposed by Housekeeping. Dean, Students Affairs: approve Warden and Chief Manager assignments. Approval requests arrive in GEN-03 My approvals.</Notice>}
      <Card padding={0}>
        <DataTable caption="Current duties" rowKey="assignment_id" rows={list.data ?? []} loading={!list.data} searchable onRowClick={editable ? (r) => setEnd(r as Asg) : undefined}
          filters={!editable ? <Select value={facility} onChange={(e) => setFacility(e.target.value)} options={[{ value: '', label: 'All hostels' }, ...(hostels.data ?? []).map((h) => ({ value: h.facility_id, label: h.facility_name }))]} /> : undefined}
          empty={<EmptyState icon="users" title="No duties assigned" body="Every floor with occupied beds needs an active Floor Manager." />}
          columns={[
            { key: 'full_name', label: 'Person', render: (v: string, r: Asg) => <Person name={titleCase(v)} sub={`${r.staff_id} · ${r.mobile_no}`} /> },
            { key: 'hostel_role', label: 'Duty', render: (v: string) => words(v) },
            { key: 'zone_id', label: 'Covers', render: (v: string | null, r: Asg) => v ?? r.space_id ?? 'Whole hostel' },
            { key: 'shift', label: 'Shift' },
            { key: 'from_date', label: 'Since', render: (v: string) => formatDate(v) },
            { key: 'show_on_qr', label: 'On labels', render: (v: boolean) => (v ? <StatusChip status="Active" label="Shown" /> : '—') },
          ]} />
      </Card>
      <ConfirmDialog open={!!end} title={`End this duty for ${titleCase(end?.full_name)}?`} body={end ? `${words(end.hostel_role)} · ${end.zone_id ?? end.space_id ?? 'whole hostel'} · ${end.shift} shift. The person's screens for this scope disappear the same day.` : undefined} tone="danger" confirmLabel="End duty" onCancel={() => setEnd(null)} onConfirm={() => { const a = end!; setEnd(null); run(() => api(`/assignments/${a.assignment_id}/end`, { method: 'POST', json: {} }).then(() => { list.mutate(); floors.mutate(); }), 'Duty ended'); }} />
    </div>
  );
}
