import { useState } from 'react';
import { Button, Card, DataTable, Drawer, EmptyState, Field, Input, Notice, Person, Select, StatCard, StatusChip, formatDate } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, bedLabel, roomLabel, titleCase, useAction, useApi } from '@/lib/ui';
import type { Reg } from './Allotment';

type Asset = { asset_id: string; asset_name: string; asset_category: string };

/** REG-06 Check-in and room handover: key, furniture list (handover), opening meter reading. Office and Floor Manager C. */
export default function CheckIn() {
  const regs = useApi<Reg[]>('/registrations');
  const [sel, setSel] = useState<Reg | null>(null);
  const assets = useApi<Asset[]>(sel?.subspace_id ? `/rooms/${sel.subspace_id.replace(/-B\d+$/, '')}/assets` : null);
  const [key, setKey] = useState('');
  const [reading, setReading] = useState('');
  const [cond, setCond] = useState<Record<string, string>>({});
  const { run, busy } = useAction();
  // a renewal does not check in again: Room Allotment continues the stay on Yearly renewals
  const fresh = (regs.data ?? []).filter((r) => !(r as Reg & { renewal_of?: number | null }).renewal_of);
  const ready = fresh.filter((r) => r.status === 'Confirmed' && r.fee_check_status === 'Verified' && (r as Reg & { cw_status?: string }).cw_status === 'Approved');
  const unchecked = fresh.filter((r) => r.status === 'Confirmed' && !(r.fee_check_status === 'Verified' && (r as Reg & { cw_status?: string }).cw_status === 'Approved'));
  const done = (regs.data ?? []).filter((r) => r.status === 'Checked_In');
  const refresh = () => { regs.mutate(); setSel(null); };
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="REG-06" subtitle="Students whose fees are paid and checked by a Warden. Issue the key, go through the room items with the student, record the opening meter reading." />
      <div className="klh-grid-3">
        <StatCard color="indigo" icon="key" label="Ready to check in" value={String(ready.length)} sub="fees paid and checked" />
        <StatCard color="brand" icon="check" label="Checked in this year" value={String(done.length)} />
        <StatCard color="orange" icon="receipt" label="Waiting for approval" value={String(unchecked.length)} sub={`${(regs.data ?? []).filter((r) => r.status === 'Accepted').length} more with fees still due`} />
      </div>
      <Card padding={0}>
        <DataTable caption="Ready to check in" rowKey="registration_id" rows={ready} loading={!regs.data} searchable onRowClick={(r) => { setSel(r as Reg); setKey(''); setReading(''); setCond({}); }} selectedKey={sel?.registration_id}
          empty={<EmptyState icon="key" title="No one is waiting to check in" body="A student appears here once the Warden has verified the fees and the Chief Manager has approved the bed." />}
          columns={[
            { key: 'full_name', label: 'Student', render: (v: string, r: Reg) => <Person name={titleCase(v)} sub={`${r.student_id} · ${r.programme}`} /> },
            { key: 'hostel_code', label: 'Hostel', render: (v: string, r: Reg) => `${v} · ${r.type_name}` },
            { key: 'subspace_id', label: 'Bed', render: (v: string) => bedLabel(v) },
            { key: 'status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
          ]} />
      </Card>
      <Card padding={0}>
        <DataTable caption="Checked in" rowKey="registration_id" rows={done} loading={!regs.data} searchable pageSize={10} empty={<EmptyState icon="check" title="No check-ins yet" />}
          columns={[
            { key: 'full_name', label: 'Student', render: (v: string, r: Reg) => <Person name={titleCase(v)} sub={r.student_id} /> },
            { key: 'subspace_id', label: 'Bed', render: (v: string) => bedLabel(v) },
            { key: 'key_no', label: 'Key', render: (v: string | null) => <span className="klh-code">{v ?? '—'}</span> },
            { key: 'status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
          ]} />
      </Card>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? `Check in ${titleCase(sel.full_name)}` : ''} subtitle={sel ? `${sel.student_id} · ${roomLabel(sel.subspace_id?.replace(/-B\d+$/, ''))}, bed ${bedLabel(sel.subspace_id).slice(-1)}` : undefined}
        footer={sel && <Button variant="primary" icon="key" loading={busy} blockedReason={!key ? 'Enter the key number.' : reading === '' ? 'Enter the opening meter reading.' : undefined} onClick={() => run(async () => {
          const alloc = await api<{ hostel_alloc_id: number }>('/allocations', { method: 'POST', json: { offer_id: sel.offer_id, key_no: key } });
          await api(`/allocations/${alloc.hostel_alloc_id}/handover`, { method: 'POST', json: { handover_type: 'Check_In', meter_reading: Number(reading), occupant_acknowledged: true, lines: (assets.data ?? []).map((a) => ({ asset_id: a.asset_id, condition: cond[a.asset_id] ?? 'Good' })) } });
          refresh();
        }, `${titleCase(sel.full_name)} checked in`)}>Confirm check-in</Button>}>
        {sel && (
          <div className="klh-stack" style={{ gap: 16 }}>
            <Field label="Key number" required><Input value={key} onChange={(e) => setKey(e.target.value)} autoFocus /></Field>
            <Field label="Opening meter reading (kWh)" required hint="Read from the room meter now; it becomes the student's starting point"><Input type="number" value={reading} onChange={(e) => setReading(e.target.value)} /></Field>
            <div><p className="klh-overline">Room handover list</p>{(assets.data ?? []).map((a) => <div key={a.asset_id} className="klh-row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}><span>{a.asset_name} <span className="klh-code klh-muted">{a.asset_id}</span></span><Select value={cond[a.asset_id] ?? 'Good'} onChange={(e) => setCond({ ...cond, [a.asset_id]: e.target.value })} options={['Good', 'Fair', 'Damaged', 'Missing']} style={{ width: 130 }} /></div>)}{assets.data?.length === 0 && <p className="klh-muted">No tagged items in this room.</p>}</div>
            <Notice tone="info" title="The student acknowledges the list">Damaged or missing items at check-out are charged against this list (Workflow N).</Notice>
            <p className="klh-muted" style={{ fontSize: 13 }}>Applied {formatDate(sel.applied_on)} · plan {sel.plan_status}</p>
          </div>)}
      </Drawer>
    </div>
  );
}
