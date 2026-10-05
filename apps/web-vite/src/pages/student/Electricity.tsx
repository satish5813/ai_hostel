import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BarChart, Button, Card, EmptyState, Field, Input, Notice, ProgressRing, Slider, StatusChip, UsageMeter, formatDateTime, formatINR } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, roomLabel, useAction, useApi } from '@/lib/ui';

type Pos = { meter_id: number; meter_no: string; space_id: string; last_reading: string; last_reading_at: string; units_this_month: string | null; included_units_per_month: string | null; recharged_this_month: string; units_left: string | null; rate_per_unit: string | null;
  recharges: { recharge_id: number; units_credited: string; status: string; created_at: string }[]; monthly: { usage_month: string; units_used: string; included_units: string; recharged_units: string; excess_units: string }[] };

/** ELE-01 My electricity: units used, balance, online recharge (own room only). */
export default function Electricity() {
  const m = useApi<Pos>('/meters/mine');
  const [amount, setAmount] = useState(200);
  const { run, busy } = useAction();
  if (m.error) return <div className="klh-stack" style={{ gap: 24 }}><ScreenHeader code="ELE-01" compact /><Card padding={0}><EmptyState icon="bolt" title="No meter is linked to you yet" body="Your room meter is linked when you check in." /></Card></div>;
  if (!m.data) return null;
  const d = m.data; const used = Number(d.units_this_month ?? 0); const included = Number(d.included_units_per_month ?? 0); const recharged = Number(d.recharged_this_month); const left = Number(d.units_left ?? 0); const rate = Number(d.rate_per_unit ?? 0);
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="ELE-01" compact subtitle={<span>Room {roomLabel(d.space_id)} · meter <span className="klh-code">{d.meter_no}</span> · {included} units a month are included in your fee.</span>} />
      {!rate && <Notice tone="warning" title="No approved tariff">The electricity tariff for your room type has not been approved yet, so balance and recharge are not available.</Notice>}
      {rate > 0 && left < 10 && <Notice tone="critical" title="Low balance">Only {left.toFixed(0)} units left this month. Recharge to avoid a cut-off.</Notice>}
      <div className="klh-grid-2">
        <Card icon="bolt" color="amber" title="This month" subtitle={`Last reading ${d.last_reading} kWh, ${formatDateTime(d.last_reading_at)}`}>
          <div className="klh-row" style={{ gap: 24, alignItems: 'center' }}>
            <ProgressRing value={Math.max(left, 0)} max={Math.max(included + recharged, 1)} color={left < 10 ? 'red' : 'green'} label={`${left.toFixed(0)}`} sublabel="units left" ariaLabel={`${left.toFixed(0)} units left`} />
            <div style={{ flex: 1 }}><UsageMeter used={used} included={included} unit="kWh" footnote={`${recharged.toFixed(0)} units recharged · ${formatINR(rate)} per extra unit`} /></div>
          </div>
        </Card>
        <Card icon="wallet" color="amber" title="Recharge" subtitle="Paid online; credited to the meter immediately">
          <form className="klh-stack" style={{ gap: 20 }} onSubmit={(e) => { e.preventDefault(); run(async () => {
            const r = await api<{ demand: { demand_id: number }; order: { mode: string } }>(`/meters/${d.meter_id}/recharge`, { method: 'POST', json: { amount } });
            if (r.order.mode === 'dev') await api('/payments/dev-confirm', { method: 'POST', json: { demand_id: r.demand.demand_id, amount } });
            m.mutate();
          }, `Recharged ${(amount / rate).toFixed(1)} units`); }}>
            <Slider label="Amount" min={50} max={1000} step={50} value={amount} onChange={setAmount} format={(v) => formatINR(v)} caption={(v) => (rate ? `${(v / rate).toFixed(1)} units` : '')} presets={[100, 200, 500]} />
            <Field label="Or type an amount"><Input type="number" min={50} step={50} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
            <div><Button type="submit" variant="accent" pill size="lg" icon="wallet" loading={busy} blockedReason={!rate ? 'No approved tariff yet.' : undefined}>Pay {formatINR(amount)}{rate ? ` for ${(amount / rate).toFixed(1)} units` : ''}</Button></div>
          </form>
        </Card>
      </div>
      <div className="klh-grid-2">
        <Card icon="clock" color="amber" title="Recharges" padding={0}>
          {d.recharges.length === 0 ? <EmptyState icon="bolt" title="No recharges yet" /> : <table className="klh-table"><thead><tr><th>When</th><th style={{ textAlign: 'right' }}>Units</th><th>Status</th></tr></thead><tbody>{d.recharges.map((r) => <tr key={r.recharge_id}><td>{formatDateTime(r.created_at)}</td><td className="klh-num" style={{ textAlign: 'right' }}>{Number(r.units_credited).toFixed(1)}</td><td><StatusChip status={r.status} /></td></tr>)}</tbody></table>}
        </Card>
        <Card icon="gauge" color="amber" title="Use by month" subtitle={`Against the ${included}-unit allowance`}>
          {d.monthly.length === 0 ? <p className="klh-muted">The first monthly summary arrives on the 1st.</p> : <BarChart data={d.monthly.slice().reverse().map((r) => ({ label: new Date(r.usage_month).toLocaleDateString('en-IN', { month: 'short' }), value: Number(r.units_used), highlight: Number(r.excess_units) > 0 }))} limit={included} limitLabel="Included" unit="kWh" showValues label="Units used by month" />}
        </Card>
      </div>
      <MyRoomBills />
    </div>
  );
}

type Bill = { month: string; space_id: string; room_units: number; included: number; recharged: number; billable: number; rate: number; room_amount: number; occupants: number;
  days: number; share_pct: number; units: number; amount: number; paid: number; status: string; due_date: string | null; overdue: boolean; roommates: string | null };

/** The room's monthly bill and this student's equal share of it, which is an Electricity fee in the fees portal. */
function MyRoomBills() {
  const b = useApi<{ bills: Bill[]; totals: { billed: number; paid: number; due: number } }>('/me/electricity-bills');
  const navigate = useNavigate();
  if (!b.data || !b.data.bills.length) return null;
  const { bills, totals } = b.data;
  const month = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return (
    <Card icon="receipt" color="amber" title="My share of the room's bill" padding={0}
      subtitle={`Units your room used beyond the included ${bills[0].included} and any recharges, shared equally with your roommates. All electricity so far: ${formatINR(totals.billed)} billed, ${formatINR(totals.paid)} paid.`}
      action={totals.due > 0 ? <Button variant="accent" pill icon="wallet" onClick={() => navigate('/fees')}>Pay {formatINR(totals.due)}</Button> : undefined}>
      <table className="klh-table">
        <thead><tr><th>Month</th><th style={{ textAlign: 'right' }}>Room units</th><th style={{ textAlign: 'right' }}>Billed units × rate</th><th style={{ textAlign: 'right' }}>Room bill</th><th>Shared with</th><th style={{ textAlign: 'right' }}>My share</th><th>Status</th></tr></thead>
        <tbody>{bills.map((x) => (
          <tr key={x.month}>
            <td>{month(x.month)}</td><td style={{ textAlign: 'right' }}>{x.room_units}</td><td style={{ textAlign: 'right' }}>{x.billable} × {formatINR(x.rate)}</td>
            <td style={{ textAlign: 'right' }}>{formatINR(x.room_amount)}</td>
            <td>{x.roommates ?? 'No one: you alone'}{x.share_pct < 100 ? ` · your share ${x.share_pct}%` : ''}{x.days < 28 ? ` (${x.days} days)` : ''}</td>
            <td style={{ textAlign: 'right' }}><b>{formatINR(x.amount)}</b></td>
            <td><StatusChip status={x.paid >= x.amount ? 'Paid' : x.overdue ? 'Overdue' : 'Pending'} label={x.paid >= x.amount ? 'Paid' : x.overdue ? 'Overdue' : 'To pay'} /></td></tr>))}</tbody>
      </table>
    </Card>
  );
}
