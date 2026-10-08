import { useState } from 'react';
import { Button, Card, DataTable, EmptyState, Field, Input, Notice, Select, StatCard, StatusChip } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, useAction, useApi, useSession, words } from '@/lib/ui';

type Point = { point_id: number; point_name: string; point_type: string; facility_id: string | null; zone_id: string | null; space_id: string | null; device_type: string; device_ref: string | null; status: string };

/** TRK-05 Capture points: gates, card readers and cameras. Security Officer only (X). */
export default function CapturePoints() {
  const s = useSession()!;
  const setsUp = s.role === 'Security_Officer' || s.role === 'Chief_Warden';
  const hostels = useApi<{ facility_id: string; facility_name: string }[]>('/hostels');
  const list = useApi<Point[]>('/capture-points');
  const [f, setF] = useState({ point_name: '', point_type: 'Hostel_Gate', facility_id: '', zone_id: '', space_id: '', device_type: 'QR_Scanner', device_ref: '' });
  const { run, busy } = useAction();
  const by = (t: string) => list.data?.filter((p) => p.device_type === t).length ?? 0;
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="TRK-05" subtitle={setsUp ? 'Register the gates, card readers and cameras that record movements. A movement is accepted only from a registered, active point.' : 'The Security Officer registers capture points. Guards view them.'} />
      <div className="klh-grid-4">
        <StatCard color="sky" icon="pin" label="Capture points" value={String(list.data?.length ?? 0)} />
        <StatCard color="brand" icon="qr" label="QR scanners" value={String(by('QR_Scanner'))} />
        <StatCard color="indigo" icon="key" label="Card readers" value={String(by('Card_Reader'))} />
        <StatCard color="violet" icon="eye" label="Cameras" value={String(by('Camera'))} />
      </div>
      {setsUp && (
        <Card icon="plus" color="sky" title="Register a capture point">
          <form className="klh-stack" style={{ gap: 16 }} onSubmit={(e) => { e.preventDefault(); run(() => api('/capture-points', { method: 'POST', json: { ...f, facility_id: f.facility_id || undefined, zone_id: f.zone_id || undefined, space_id: f.space_id || undefined, device_ref: f.device_ref || undefined } }).then(() => { list.mutate(); setF({ ...f, point_name: '', device_ref: '' }); }), 'Capture point registered'); }}>
            <div className="klh-grid-3">
              <Field label="Name" required><Input value={f.point_name} onChange={(e) => setF({ ...f, point_name: e.target.value })} placeholder="BH1 east gate" /></Field>
              <Field label="Type" required><Select value={f.point_type} onChange={(e) => setF({ ...f, point_type: e.target.value })} options={['Campus_Gate', 'Hostel_Gate', 'Room_Corridor', 'Mess', 'Facility'].map((t) => ({ value: t, label: words(t) }))} /></Field>
              <Field label="Device" required><Select value={f.device_type} onChange={(e) => setF({ ...f, device_type: e.target.value })} options={['QR_Scanner', 'Card_Reader', 'Camera', 'Manual'].map((t) => ({ value: t, label: words(t) }))} /></Field>
              <Field label="Hostel"><Select value={f.facility_id} onChange={(e) => setF({ ...f, facility_id: e.target.value })} options={[{ value: '', label: 'Campus-wide' }, ...(hostels.data ?? []).map((h) => ({ value: h.facility_id, label: h.facility_name }))]} /></Field>
              <Field label="Floor" hint="Zone ID, for a corridor camera"><Input value={f.zone_id} onChange={(e) => setF({ ...f, zone_id: e.target.value })} placeholder="BH1-F1" /></Field>
              <Field label="Device reference" hint="Serial or vendor ID"><Input value={f.device_ref} onChange={(e) => setF({ ...f, device_ref: e.target.value })} /></Field>
            </div>
            <div><Button type="submit" variant="primary" icon="plus" loading={busy} blockedReason={!f.point_name ? 'Give the point a name.' : undefined}>Register</Button></div>
          </form>
        </Card>)}
      <Card padding={0}>
        <DataTable caption="Capture points" rowKey="point_id" rows={list.data ?? []} loading={!list.data} searchable empty={<EmptyState icon="pin" title="No capture points" />}
          columns={[
            { key: 'point_name', label: 'Name' },
            { key: 'point_type', label: 'Type', render: (v: string) => words(v) },
            { key: 'device_type', label: 'Device', render: (v: string, r: Point) => `${words(v)}${r.device_ref ? ` · ${r.device_ref}` : ''}` },
            { key: 'facility_id', label: 'Where', render: (v: string | null, r: Point) => [v?.replace(/^H-/, ''), r.zone_id, r.space_id].filter(Boolean).join(' · ') || 'Campus' },
            { key: 'status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
          ]} />
      </Card>
      <Notice tone="info" title="Consent">Movements are recorded only for students who have given tracking consent (policy version in ADM-02). Without consent the scan is refused.</Notice>
    </div>
  );
}
