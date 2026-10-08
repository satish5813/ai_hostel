import { useState } from 'react';
import { Button, Card, DataTable, Drawer, EmptyState, Field, Input, Notice, Select, StatCard, StatusChip, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, roomLabel, useAction, useApi, useSession } from '@/lib/ui';
import { can } from '@/app/screens';

type Pos = { meter_id: number; meter_no: string; space_id: string; space_code: string; hostel_name: string; floor_name: string; last_reading: string | null; last_reading_at: string | null; units_this_month: string | null; units_left: string | null; included_units_per_month: string | null };
type Reading = { reading_id: number; reading_kwh: string; reading_at: string; source: string; recorded_by: string | null };

/** ELE-02 Meters and readings: meter register and readings. Maintenance C E (register meters, manual readings); Hostel Accounts V. */
export default function Meters() {
  const s = useSession()!;
  const edits = can(s.role, 'ELE-02', 'C');
  const hostels = useApi<{ facility_id: string; facility_name: string }[]>('/hostels');
  const [facility, setFacility] = useState('');
  const list = useApi<Pos[]>(`/meters${facility ? `?facility_id=${facility}` : ''}`);
  const [sel, setSel] = useState<Pos | null>(null);
  const readings = useApi<Reading[]>(sel ? `/meters/${sel.meter_id}/readings` : null);
  const [reading, setReading] = useState('');
  const [nf, setNf] = useState({ space_id: '', meter_no: '', meter_type: 'Manual', device_ref: '', installed_on: '' });
  const [showNew, setShowNew] = useState(false);
  const { run, busy } = useAction();
  const low = list.data?.filter((m) => m.units_left !== null && Number(m.units_left) < 10).length ?? 0;
  const stale = list.data?.filter((m) => !m.last_reading_at || Date.now() - new Date(m.last_reading_at).getTime() > 35 * 864e5).length ?? 0;
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="ELE-02" subtitle={edits ? 'Register meters and enter manual readings. Smart meters push their own readings; a reading can never be lower than the last one.' : 'Readings and recharges, view only.'} actions={edits ? <Button variant="primary" icon="plus" onClick={() => setShowNew(true)}>Register meter</Button> : undefined} />
      <div className="klh-grid-3">
        <StatCard color="amber" icon="gauge" label="Active meters" value={String(list.data?.length ?? 0)} />
        <StatCard color="orange" icon="bolt" label="Low balance" value={String(low)} tone={low ? 'warning' : undefined} sub="under 10 units left" />
        <StatCard color="rose" icon="alert" label="No reading this month" value={String(stale)} tone={stale ? 'critical' : undefined} />
      </div>
      <Card padding={0}>
        <DataTable caption="Room meters" rowKey="meter_id" rows={list.data ?? []} loading={!list.data} searchable searchPlaceholder="Search room or meter" onRowClick={(r) => { setSel(r as Pos); setReading(''); }} selectedKey={sel?.meter_id}
          filters={<Select value={facility} onChange={(e) => setFacility(e.target.value)} options={[{ value: '', label: 'All hostels' }, ...(hostels.data ?? []).map((h) => ({ value: h.facility_id, label: h.facility_name }))]} />}
          empty={<EmptyState icon="gauge" title="No active meters" />}
          columns={[
            { key: 'space_code', label: 'Room', render: (_v: string, r: Pos) => `${roomLabel(r.space_id)} · ${r.hostel_name}, ${r.floor_name}` },
            { key: 'meter_no', label: 'Meter', render: (v: string) => <span className="klh-code">{v}</span> },
            { key: 'last_reading', label: 'Last reading', align: 'right', render: (v: string | null, r: Pos) => (v ? <span className="klh-num">{v} kWh<br /><span className="klh-muted" style={{ fontSize: 12 }}>{formatDateTime(r.last_reading_at)}</span></span> : '—') },
            { key: 'units_this_month', label: 'This month', align: 'right', render: (v: string | null, r: Pos) => (v !== null ? `${Number(v).toFixed(1)} / ${Number(r.included_units_per_month ?? 0)}` : '—') },
            { key: 'units_left', label: 'Left', align: 'right', render: (v: string | null) => (v !== null ? <b className="klh-num" style={{ color: Number(v) < 10 ? 'var(--critical-fg)' : undefined }}>{Number(v).toFixed(1)}</b> : <StatusChip status="Pending" label="No tariff" />) },
          ]} />
      </Card>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? `Meter ${sel.meter_no} · ${roomLabel(sel.space_id)}` : ''} subtitle={sel?.last_reading ? `last ${sel.last_reading} kWh on ${formatDateTime(sel.last_reading_at)}` : 'no reading yet'}>
        {sel && (
          <div className="klh-stack" style={{ gap: 16 }}>
            {edits && (<>
              <Field label="Reading now (kWh)" required hint="Must not be lower than the last reading"><Input type="number" step="0.1" value={reading} onChange={(e) => setReading(e.target.value)} autoFocus /></Field>
              {sel.last_reading && reading !== '' && Number(reading) < Number(sel.last_reading) && <Notice tone="critical" title="Lower than the last reading">The database refuses readings that go backwards. Check the meter.</Notice>}
              <Button variant="primary" icon="check" loading={busy} blockedReason={reading === '' ? 'Enter the reading.' : undefined} onClick={() => run(() => api(`/meters/${sel.meter_id}/readings`, { method: 'POST', json: { reading_kwh: Number(reading) } }).then(() => { list.mutate(); readings.mutate(); setReading(''); }), `Reading saved for ${roomLabel(sel.space_id)}`)}>Save reading</Button>
            </>)}
            <div><p className="klh-overline">Readings</p>{readings.data?.length ? <table className="klh-table"><thead><tr><th>When</th><th style={{ textAlign: 'right' }}>kWh</th><th>Source</th></tr></thead><tbody>{readings.data.slice(0, 20).map((r) => <tr key={r.reading_id}><td>{formatDateTime(r.reading_at)}</td><td className="klh-num" style={{ textAlign: 'right' }}>{r.reading_kwh}</td><td><StatusChip status={r.source} /></td></tr>)}</tbody></table> : <p className="klh-muted">No readings yet.</p>}</div>
          </div>)}
      </Drawer>
      <Drawer open={showNew} onClose={() => setShowNew(false)} title="Register a meter" subtitle="One active meter per room"
        footer={<Button variant="primary" loading={busy} blockedReason={!nf.space_id || !nf.meter_no || !nf.installed_on ? 'Fill room, meter number and installed date.' : undefined} onClick={() => run(() => api('/meters', { method: 'POST', json: { ...nf, device_ref: nf.device_ref || undefined } }).then(() => { list.mutate(); setShowNew(false); }), 'Meter registered')}>Register</Button>}>
        <div className="klh-stack" style={{ gap: 16 }}>
          <Field label="Room (space ID)" required><Input value={nf.space_id} onChange={(e) => setNf({ ...nf, space_id: e.target.value })} placeholder="BH1-201" /></Field>
          <Field label="Meter number" required><Input value={nf.meter_no} onChange={(e) => setNf({ ...nf, meter_no: e.target.value })} /></Field>
          <Field label="Type" required><Select value={nf.meter_type} onChange={(e) => setNf({ ...nf, meter_type: e.target.value })} options={['Manual', 'Smart_Prepaid']} /></Field>
          <Field label="Device reference" visible={nf.meter_type === 'Smart_Prepaid'} hint="ID in the vendor system"><Input value={nf.device_ref} onChange={(e) => setNf({ ...nf, device_ref: e.target.value })} /></Field>
          <Field label="Installed on" required><Input type="date" value={nf.installed_on} onChange={(e) => setNf({ ...nf, installed_on: e.target.value })} /></Field>
        </div>
      </Drawer>
    </div>
  );
}
