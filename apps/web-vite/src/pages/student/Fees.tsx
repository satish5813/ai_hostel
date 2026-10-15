import { useState } from 'react';
import { Button, Card, Countdown, DataTable, EmptyState, Money, Notice, StatCard, StatusChip, formatDateTime, formatINR } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, titleCase, useAction, useApi, useProfile, useSession, words } from '@/lib/ui';
import { Brand } from '@/app/shell';

type Demand = { demand_id: number; fee_head: string; instalment_no: number; reference_type?: string | null; amount_due: string; amount_paid: string; due_date: string; status: string };
type Receipt = { receipt_id: number; receipt_no: string; demand_id: number; fee_head: string; instalment_no: number; reference_type?: string | null; amount: string; paid_on: string; payment_mode: string; gateway_ref: string | null; gateway_status: string; collected_by: string | null };
/** What a demand is for; the hostel-fee difference and the electricity share settled on a room change are named as such. */
const forWhat = (d: { fee_head: string; instalment_no: number; reference_type?: string | null }) =>
  d.reference_type === 'room_change' ? (d.fee_head === 'Hostel' ? 'Hostel fee difference (room change)' : `${words(d.fee_head)} up to the room change`)
    : `${words(d.fee_head)}${d.fee_head === 'Residency' ? `, instalment ${d.instalment_no}` : ''}`;
type Dues = { demands: Demand[]; totals: { fee_head: string; balance: string }[]; receipts: Receipt[] };

/** REG-02 Fees and receipts. Student: pay online, download receipts. Parent and Hostel Accounts: view. */
export default function Fees() {
  const s = useSession()!;
  const p = useProfile();
  const studentId = s.kind === 'parent' ? p.data?.student_id : s.id;
  const dues = useApi<Dues>(studentId ? `/students/${studentId}/demands` : null);
  const [print, setPrint] = useState<Receipt | null>(null);
  const open = (dues.data?.demands ?? []).filter((d) => ['Pending', 'Part_Paid', 'Overdue'].includes(d.status));
  const openTotal = open.reduce((a, d) => a + Number(d.amount_due) - Number(d.amount_paid), 0);
  const nextDue = open.slice().sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const paid = (dues.data?.receipts ?? []).reduce((a, r) => a + Number(r.amount), 0);
  if (print) return <ReceiptPrint r={print} studentId={studentId!} name={p.data?.student_name ?? p.data?.full_name} onBack={() => setPrint(null)} />;
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="REG-02" compact subtitle={s.kind === 'parent' ? `Fee dues and receipts of ${titleCase(p.data?.student_name)}. View only.` : undefined} />
      <div className="klh-grid-3">
        <StatCard color="orange" icon="wallet" label="Outstanding" value={formatINR(openTotal)} sub={nextDue ? `next due ${formatDateTime(nextDue.due_date).split(',')[0]}` : 'nothing due'} tone={open.some((d) => d.status === 'Overdue') ? 'critical' : undefined} />
        <StatCard color="brand" icon="receipt" label="Paid so far" value={formatINR(paid)} sub={`${dues.data?.receipts.length ?? 0} receipts`} />
        <StatCard color="indigo" icon="clock" label="Next due" value={nextDue ? <Countdown until={nextDue.due_date} /> : '—'} sub={nextDue ? forWhat(nextDue) : 'all settled'} />
      </div>
      <Card icon="wallet" color="orange" title="Fee demands" subtitle={open.length ? `${open.length} to pay` : 'All paid'}>
        {!dues.data ? null : dues.data.demands.length === 0 ? <p className="klh-muted">Fees appear once you apply for a room.</p> : (
          <div className="klh-stack" style={{ gap: 12 }}>
            {dues.data.demands.filter((d) => !(d.status === 'Waived' && Number(d.amount_due) === 0)).map((d) => (
              <div key={d.demand_id} className="klh-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div><div style={{ fontWeight: 600 }}>{forWhat(d)}</div><Money amount={d.status === 'Paid' ? Number(d.amount_due) : Number(d.amount_due) - Number(d.amount_paid)} dueDate={d.due_date} status={d.status} /></div>
                {s.kind === 'student' && ['Pending', 'Part_Paid', 'Overdue'].includes(d.status) ? <Pay demand={d} onDone={() => dues.mutate()} /> : <StatusChip status={d.status} />}
              </div>))}
          </div>)}
      </Card>
      <Card icon="receipt" color="orange" title="Receipts" subtitle="Receipts are never edited; a refund is a new entry" padding={0}>
        <DataTable caption="Receipts" rowKey="receipt_id" rows={dues.data?.receipts ?? []} loading={!dues.data} onRowClick={(r) => setPrint(r as Receipt)} empty={<EmptyState icon="receipt" title="No receipts yet" />}
          columns={[
            { key: 'receipt_no', label: 'Receipt', render: (v: string) => <span className="klh-code">{v}</span> },
            { key: 'fee_head', label: 'For', render: (_v: string, r: Receipt) => forWhat(r) },
            { key: 'amount', label: 'Amount', align: 'right', render: (v: string) => <b className="klh-num">{formatINR(v, true)}</b> },
            { key: 'paid_on', label: 'Paid on', render: (v: string) => formatDateTime(v) },
            { key: 'payment_mode', label: 'Mode', render: (v: string, r: Receipt) => `${v}${r.gateway_ref ? ` · ${r.gateway_ref}` : ''}` },
            { key: 'gateway_status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
          ]} />
      </Card>
      {s.kind === 'student' && <Notice tone="info" title="Online payment">Payments go through the university gateway (Razorpay). In development the Pay button confirms at once and issues the receipt.</Notice>}
    </div>
  );
}

function Pay({ demand, onDone }: { demand: Demand; onDone: () => void }) {
  const { run, busy } = useAction();
  const balance = Number(demand.amount_due) - Number(demand.amount_paid);
  return <Button variant="accent" pill size="sm" icon="wallet" loading={busy} onClick={() => run(async () => {
    const order = await api<{ mode: string; order_id?: string; key_id?: string; amount: number }>('/payments/orders', { method: 'POST', json: { demand_id: demand.demand_id } });
    if (order.mode === 'dev') await api('/payments/dev-confirm', { method: 'POST', json: { demand_id: demand.demand_id, amount: balance } });
    else alert(`Razorpay order ${order.order_id} for ₹${order.amount} (key ${order.key_id}). The receipt is recorded by the webhook.`);
    onDone();
  }, `Paid ${formatINR(balance)}. Receipt issued!`)}>Pay {formatINR(balance)}</Button>;
}

/** Printable receipt (download = print to PDF). */
function ReceiptPrint({ r, studentId, name, onBack }: { r: Receipt; studentId: string; name?: string; onBack: () => void }) {
  return (
    <div className="klh-stack" style={{ gap: 16 }}>
      <div className="klh-row no-print" style={{ justifyContent: 'space-between' }}><Button variant="ghost" icon="chevron-left" onClick={onBack}>Back to fees</Button><Button variant="primary" icon="download" onClick={() => window.print()}>Download / print</Button></div>
      <div className="klh-card" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
        <div className="klh-row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}><Brand cut="full" height={52} /><div style={{ textAlign: 'right' }}><div className="klh-overline">Fee receipt</div><div className="klh-code" style={{ fontSize: 18, fontWeight: 700 }}>{r.receipt_no}</div></div></div>
        <dl className="klh-dl" style={{ marginTop: 16 }}>
          <dt>Received from</dt><dd>{titleCase(name)} ({studentId})</dd>
          <dt>Towards</dt><dd>{forWhat(r)}</dd>
          <dt>Amount</dt><dd className="klh-num" style={{ fontSize: 20, fontWeight: 700 }}>{formatINR(r.amount, true)}</dd>
          <dt>Paid on</dt><dd>{formatDateTime(r.paid_on)}</dd>
          <dt>Mode</dt><dd>{r.payment_mode}{r.gateway_ref ? ` · ref ${r.gateway_ref}` : ''}{r.collected_by ? ` · collected by ${r.collected_by}` : ''}</dd>
          <dt>Status</dt><dd><StatusChip status={r.gateway_status} /></dd>
        </dl>
        <p className="klh-muted" style={{ fontSize: 12, marginTop: 24 }}>Computer-generated receipt of KL Residencies. The registration fee is not refundable. Hostel and mess fees are refundable only as per the vacating rules.</p>
      </div>
    </div>
  );
}
