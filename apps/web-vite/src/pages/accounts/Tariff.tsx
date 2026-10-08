import { useState } from 'react';
import { Button, Card, ConfirmDialog, DataTable, EmptyState, Field, Input, Notice, Select, StatusChip, formatDate, formatINR } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, useAction, useApi, useSession } from '@/lib/ui';
import { can } from '@/app/screens';

type Tariff = { tariff_id: number; room_type_id: number; included_units_per_month: string; rate_per_unit: string; effective_from: string; effective_to: string | null; approved_by: string | null };

/** ELE-03 Electricity tariff: Hostel Accounts enters a rate (X), it takes effect after the Pro-VC Finance approves it (A). */
export default function TariffPage() {
  const s = useSession()!;
  const enters = can(s.role, 'ELE-03', 'X');
  const approves = can(s.role, 'ELE-03', 'A');
  const tariffs = useApi<Tariff[]>('/tariffs');
  const types = useApi<{ room_type_id: number; type_name: string }[]>('/room-types');
  const [f, setF] = useState({ room_type_id: '', included_units_per_month: '60', rate_per_unit: '8.50', effective_from: '' });
  const [approve, setApprove] = useState<Tariff | null>(null);
  const { run, busy } = useAction();
  const name = (id: number) => types.data?.find((t) => t.room_type_id === id)?.type_name ?? String(id);
  const waiting = (tariffs.data ?? []).filter((t) => !t.approved_by);
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="ELE-03" subtitle="Units included in the hostel fee and the price of each extra unit, per room type. Only an approved rate reaches the meters and the students." />
      {approves && waiting.length > 0 && <Notice tone="warning" title={`${waiting.length} rate${waiting.length > 1 ? 's' : ''} waiting for your approval`}>Click a row marked Pending to approve it.</Notice>}
      <div className="klh-grid-2">
        {enters && (
          <Card icon="bolt" color="amber" title="New rate" subtitle="Takes effect after approval">
            <form className="klh-stack" style={{ gap: 16 }} onSubmit={(e) => { e.preventDefault(); run(() => api('/tariffs', { method: 'POST', json: { room_type_id: Number(f.room_type_id), included_units_per_month: Number(f.included_units_per_month), rate_per_unit: Number(f.rate_per_unit), effective_from: f.effective_from } }).then(() => tariffs.mutate()), 'Rate entered; the Pro-VC Finance has been asked to approve it'); }}>
              <Field label="Room type" required><Select value={f.room_type_id} onChange={(e) => setF({ ...f, room_type_id: e.target.value })} options={[{ value: '', label: 'Choose' }, ...(types.data ?? []).map((t) => ({ value: String(t.room_type_id), label: t.type_name }))]} /></Field>
              <div className="klh-grid-2">
                <Field label="Units included each month" required><Input type="number" value={f.included_units_per_month} onChange={(e) => setF({ ...f, included_units_per_month: e.target.value })} /></Field>
                <Field label="Price per extra unit (₹)" required><Input type="number" step="0.01" value={f.rate_per_unit} onChange={(e) => setF({ ...f, rate_per_unit: e.target.value })} /></Field>
              </div>
              <Field label="Effective from" required><Input type="date" value={f.effective_from} onChange={(e) => setF({ ...f, effective_from: e.target.value })} /></Field>
              <Field label="Approved by" derived value="Pro-VC Finance, through GEN-03" />
              <div><Button type="submit" variant="primary" loading={busy} blockedReason={!f.room_type_id ? 'Choose a room type.' : !f.effective_from ? 'Set the effective date.' : undefined}>Enter rate</Button></div>
            </form>
          </Card>)}
        <Card padding={0}>
          <DataTable caption="Rates over time" rowKey="tariff_id" rows={tariffs.data ?? []} loading={!tariffs.data} empty={<EmptyState icon="bolt" title="No tariff yet" />} onRowClick={approves ? (r) => !(r as Tariff).approved_by && setApprove(r as Tariff) : undefined}
            columns={[
              { key: 'room_type_id', label: 'Room type', render: (v: number) => name(v) },
              { key: 'included_units_per_month', label: 'Included', align: 'right', render: (v: string) => `${Number(v)} kWh` },
              { key: 'rate_per_unit', label: 'Extra unit', align: 'right', render: (v: string) => formatINR(v, true) },
              { key: 'effective_from', label: 'From', render: (v: string) => formatDate(v) },
              { key: 'effective_to', label: 'To', render: (v: string | null) => (v ? formatDate(v) : 'Current') },
              { key: 'approved_by', label: 'Approval', render: (v: string | null) => (v ? <StatusChip status="Approved" label={`Approved · ${v}`} /> : <StatusChip status="Pending" />) },
            ]} />
        </Card>
      </div>
      <ConfirmDialog open={!!approve} title={`Approve the rate for ${approve ? name(approve.room_type_id) : ''}?`} body={approve ? `${Number(approve.included_units_per_month)} units included, ${formatINR(approve.rate_per_unit, true)} per extra unit, from ${formatDate(approve.effective_from)}. Students see it from that date.` : undefined} tone="primary" confirmLabel="Approve rate" onCancel={() => setApprove(null)} onConfirm={() => { const t = approve!; setApprove(null); run(() => api(`/tariffs/${t.tariff_id}/approve`, { method: 'POST' }).then(() => tariffs.mutate()), 'Rate approved'); }} />
    </div>
  );
}
