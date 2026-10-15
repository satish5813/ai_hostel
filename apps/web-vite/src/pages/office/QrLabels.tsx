import { useState } from 'react';
import { Button, Card, Field, Input, Notice, Select, StatusChip } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, roomLabel, useAction, useApi } from '@/lib/ui';
import type { Bed } from './Allotment';

type Label = { url: string; png_data_url: string; space_id: string };

/** MAP-03 QR labels: generate and print the label for each room and area. Office C. */
export default function QrLabels() {
  const hostels = useApi<{ facility_id: string; facility_name: string }[]>('/hostels');
  const [facility, setFacility] = useState('');
  const fac = facility || hostels.data?.[0]?.facility_id || '';
  const beds = useApi<Bed[]>(fac ? `/beds?facility_id=${fac}` : null);
  const [spaceId, setSpaceId] = useState('');
  const [label, setLabel] = useState<Label | null>(null);
  const [sheet, setSheet] = useState<Label[]>([]);
  const { run, busy } = useAction();
  const rooms = [...new Set((beds.data ?? []).map((b) => b.space_id))];
  const show = (id: string) => api<Label>(`/spaces/${id}/qr/label`).then(setLabel).catch(() => run(() => api(`/spaces/${id}/qr`, { method: 'POST' }).then(() => api<Label>(`/spaces/${id}/qr/label`)).then(setLabel), 'Label created'));
  const printAll = () => run(async () => { const all: Label[] = []; for (const r of rooms) { try { all.push(await api<Label>(`/spaces/${r}/qr/label`)); } catch { await api(`/spaces/${r}/qr`, { method: 'POST' }); all.push(await api<Label>(`/spaces/${r}/qr/label`)); } } setSheet(all); setTimeout(() => window.print(), 300); }, `${rooms.length} labels ready to print`);
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="MAP-03" subtitle="One live label per room, toilet block, common area or store. Scanning it opens MAP-04 Room page with the people responsible and their phone numbers."
        actions={<Field label="Hostel"><Select value={fac} onChange={(e) => setFacility(e.target.value)} options={(hostels.data ?? []).map((h) => ({ value: h.facility_id, label: h.facility_name }))} /></Field>} />
      <div className="klh-grid-2">
        <Card icon="qr" color="brand" title="One label" subtitle="Show the current label, or make a new one (the old one stops working)">
          <div className="klh-row" style={{ alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
            <Field label="Place" required><Select value={spaceId} onChange={(e) => setSpaceId(e.target.value)} options={[{ value: '', label: 'Choose a room' }, ...rooms.map((r) => ({ value: r, label: roomLabel(r) }))]} /></Field>
            <Field label="Or any space ID"><Input value={spaceId} onChange={(e) => setSpaceId(e.target.value)} placeholder="BH1-T1" /></Field>
            <Button variant="soft" icon="eye" blockedReason={!spaceId ? 'Choose a place.' : undefined} onClick={() => show(spaceId)}>Show</Button>
            <Button variant="primary" icon="qr" blockedReason={!spaceId ? 'Choose a place.' : undefined} loading={busy} onClick={() => run(() => api(`/spaces/${spaceId}/qr`, { method: 'POST' }).then(() => api<Label>(`/spaces/${spaceId}/qr/label`)).then(setLabel), 'New label made; the old one no longer works')}>New label</Button>
          </div>
          {label && <div className="klh-label-print" style={{ marginTop: 16, textAlign: 'center' }}><img src={label.png_data_url} alt="Door label QR" style={{ width: 200, height: 200 }} /><p style={{ fontWeight: 700, fontSize: 18, margin: '8px 0 0' }}>{roomLabel(label.space_id)}</p><p className="klh-muted klh-code" style={{ wordBreak: 'break-all', fontSize: 12 }}>{label.url}</p><Button variant="ghost" icon="download" onClick={() => { setSheet([label]); setTimeout(() => window.print(), 300); }}>Print</Button></div>}
        </Card>
        <Card icon="download" color="brand" title="Print sheet" subtitle={`All ${rooms.length} rooms of this residency on one sheet`}>
          <Notice tone="info" title="Stick one label per door">Each label carries a token that cannot be guessed. Reprinting uses the same token; only "New label" replaces it.</Notice>
          <div style={{ marginTop: 16 }}><Button variant="primary" icon="download" loading={busy} blockedReason={!rooms.length ? 'No rooms in this hostel.' : undefined} onClick={printAll}>Prepare and print {rooms.length} labels</Button></div>
          {sheet.length > 0 && <p className="klh-muted" style={{ marginTop: 12 }}>{sheet.length} labels prepared <StatusChip status="Active" label="Ready" /></p>}
        </Card>
      </div>
      {sheet.length > 0 && (
        <div className="klh-print-sheet">
          {sheet.map((l) => <div key={l.space_id} className="klh-print-label"><img src={l.png_data_url} alt="" /><div className="klh-print-name">{roomLabel(l.space_id)}</div><div className="klh-print-sub">KL Residencies · scan for help</div></div>)}
        </div>)}
    </div>
  );
}
