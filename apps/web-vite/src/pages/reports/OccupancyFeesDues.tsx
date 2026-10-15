import { BarChart, Button, Card, DataTable, DonutChart, EmptyState, Notice, StatCard, StatusChip, formatDate, formatINR } from '@/lib/klh';
import { ScreenHeader, titleCase, useApi, words } from '@/lib/ui';

type H = { facility_id: string; hostel_name: string; hostel_code: string; total_beds: string; occupied_beds: string; vacant_beds: string; held_beds: string; registrations: string; demanded: string; collected: string; overdue: string; students_overdue: string };
type D = { student_id: string; full_name: string; hostel_code: string | null; fee_head: string; instalment_no: number; amount_due: string; amount_paid: string; due_date: string; status: string };

/** RPT-07 Occupancy, fees and dues: beds, collections, overdue. Read-only; each opening is logged. */
export default function OccupancyFeesDues() {
  const r = useApi<{ hostels: H[]; open_demands: D[] }>('/reports/occupancy-fees-dues');
  const h = r.data?.hostels ?? [];
  const sum = (k: keyof H) => h.reduce((a, x) => a + Number(x[k]), 0);
  const exportCsv = () => {
    const rows = [['Hostel', 'Total beds', 'Occupied', 'Vacant', 'Held', 'Registrations', 'Demanded', 'Collected', 'Overdue', 'Students overdue'], ...h.map((x) => [x.hostel_code, x.total_beds, x.occupied_beds, x.vacant_beds, x.held_beds, x.registrations, x.demanded, x.collected, x.overdue, x.students_overdue])];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv' })); a.download = `RPT-07-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  };
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="RPT-07" subtitle="Beds, collections and overdue amounts per hostel, as of now. Reports can be viewed and exported, never edited; this opening has been logged." actions={<Button variant="secondary" icon="download" onClick={exportCsv} blockedReason={!h.length ? 'Nothing to export.' : undefined}>Export CSV</Button>} />
      <div className="klh-grid-4">
        <StatCard color="indigo" icon="bed" label="Occupancy" value={sum('total_beds') ? `${Math.round((sum('occupied_beds') / sum('total_beds')) * 100)}%` : '—'} sub={`${sum('occupied_beds')} of ${sum('total_beds')} beds`} />
        <StatCard color="brand" icon="receipt" label="Demanded" value={formatINR(sum('demanded'))} sub={`${sum('registrations')} registrations`} />
        <StatCard color="orange" icon="wallet" label="Collected" value={formatINR(sum('collected'))} sub={sum('demanded') ? `${Math.round((sum('collected') / sum('demanded')) * 100)}% of demand` : undefined} />
        <StatCard color="rose" icon="alert" label="Overdue" value={formatINR(sum('overdue'))} sub={`${sum('students_overdue')} students`} tone={sum('overdue') ? 'critical' : undefined} />
      </div>
      <div className="klh-grid-2">
        <Card icon="bed" color="indigo" title="Beds"><DonutChart data={[{ label: 'Occupied', value: sum('occupied_beds'), color: 'c1' }, { label: 'Vacant', value: sum('vacant_beds'), color: 'c4' }, { label: 'Held', value: sum('held_beds'), color: 'c2' }]} centerValue={String(sum('total_beds'))} centerLabel="beds" legend label="Beds" /></Card>
        <Card icon="wallet" color="orange" title="Collection by hostel">{h.length ? <BarChart data={h.map((x) => ({ label: x.hostel_code, value: Number(x.collected), highlight: Number(x.overdue) > 0 }))} unit="₹" showValues label="Collected by hostel" /> : <EmptyState icon="wallet" title="No hostels" />}</Card>
      </div>
      <Card padding={0}>
        <DataTable caption="Per residency" rowKey="facility_id" rows={h} loading={!r.data} empty={<EmptyState icon="building" title="No hostels" />}
          columns={[
            { key: 'hostel_name', label: 'Hostel', render: (v: string, x: H) => <span style={{ whiteSpace: 'nowrap' }}>{v} ({x.hostel_code})</span> },
            { key: 'occupied_beds', label: 'Occupied / total', align: 'right', render: (v: string, x: H) => <span className="klh-num">{v} / {x.total_beds}</span> },
            { key: 'vacant_beds', label: 'Vacant', align: 'right' },
            { key: 'held_beds', label: 'Held', align: 'right' },
            { key: 'demanded', label: 'Demanded', align: 'right', render: (v: string) => <span className="klh-num">{formatINR(v)}</span> },
            { key: 'collected', label: 'Collected', align: 'right', render: (v: string) => <span className="klh-num">{formatINR(v)}</span> },
            { key: 'overdue', label: 'Overdue', align: 'right', render: (v: string, x: H) => <b className="klh-num" style={{ color: Number(v) ? 'var(--critical-fg)' : undefined }}>{formatINR(v)}{Number(x.students_overdue) ? ` · ${x.students_overdue}` : ''}</b> },
          ]} />
      </Card>
      <Card padding={0}>
        <DataTable caption="Open demands" rowKey="student_id" rows={(r.data?.open_demands ?? []).map((d, i) => ({ ...d, student_id: `${d.student_id}-${i}` , sid: d.student_id }))} loading={!r.data} searchable pageSize={15} empty={<EmptyState icon="receipt" title="Nothing outstanding" />}
          columns={[
            { key: 'full_name', label: 'Student', render: (v: string, d: D & { sid: string }) => `${titleCase(v)} · ${d.sid}` },
            { key: 'hostel_code', label: 'Hostel', render: (v: string | null) => v ?? '—' },
            { key: 'fee_head', label: 'Fee', render: (v: string, d: D) => `${words(v)}${v === 'Hostel' ? `, instalment ${d.instalment_no}` : ''}` },
            { key: 'amount_due', label: 'Balance', align: 'right', render: (v: string, d: D) => <span className="klh-num">{formatINR(Number(v) - Number(d.amount_paid))}</span> },
            { key: 'due_date', label: 'Due', render: (v: string) => formatDate(v) },
            { key: 'status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
          ]} />
      </Card>
      <Notice tone="info" title="Scope">Wardens see their own residency; Residency Accounts, the Chief Manager and the Pro-VC Finance see all (Report_Visibility).</Notice>
    </div>
  );
}
