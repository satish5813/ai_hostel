import { Fragment, useState } from 'react';
import { Button, Card, EmptyState, Select, StatCard } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, toast, useApi, useSession } from '@/lib/ui';

type Share = { share_id: number; student_id: string; name: string; days: number; share_pct: number; units: number; amount: number; paid: number; status: string; due_date: string | null; overdue: boolean };
type Room = { bill_id: number; space_code: string; hostel_code: string; opening: number; closing: number; units: number; included: number; recharged: number; billable: number; rate: number; amount: number;
  occupants: number; shares: Share[] };
type Data = { months: string[]; month: string | null; rooms: Room[]; totals: { rooms: number; units: number; billed: number; paid: number; students: number; unpaid: number; overdue: number } | null };

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const monthName = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

/**
 * ELE-04 Room electricity bills. For a month: each room's units (closing minus opening reading), less the units included
 * in the fee and those bought by recharge, at the approved rate; and each roommate's equal share (by days lived there),
 * which is their Electricity fee demand and whether it is paid. Bills are made on the 1st of each month for the month
 * before; Accounts can make them for a month whose readings came in late.
 */
export default function ElectricityBills() {
  const s = useSession()!;
  const [month, setMonth] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const r = useApi<Data>(`/electricity/bills${month ? `?month=${month}` : ''}`);
  const d = r.data;
  const [busy, setBusy] = useState(false);
  const canMake = s.role === 'Accounts_Section' || s.role === 'admin';
  const last = (() => { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() - 1); return x.toISOString().slice(0, 7); })();
  const make = async () => {
    setBusy(true);
    try { const x = await api<{ rooms: number }>('/electricity/bills/generate', { method: 'POST', json: { month: last } }); toast(x.rooms ? `${x.rooms} rooms billed for ${monthName(last)}` : `Every room with readings is already billed for ${monthName(last)}`); setMonth(last); r.mutate(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  const t = d?.totals;
  return (
    <div className="klh-stack eb" style={{ gap: 16 }}>
      <ScreenHeader code="ELE-04" subtitle="Each room's electricity for the month, shared equally by the roommates (by the days each lived there). Each share is the student's Electricity fee, paid in the fees portal."
        actions={canMake ? <Button variant="secondary" icon="bolt" loading={busy} onClick={make}>Bill {monthName(last)}</Button> : undefined} />
      {d && d.months.length > 0 && (
        <section className="box ct-pick">
          <label className="sd-sel">Month<Select value={d.month ?? ''} onChange={(e) => setMonth(e.target.value)} options={d.months.map((m) => ({ value: m, label: monthName(m) }))} /></label>
        </section>)}
      {d && !d.months.length && <EmptyState icon="bolt" title="No bills yet" body="Bills are made on the 1st of each month for rooms with meter readings at both ends of the month before." />}
      {t && (
        <div className="klh-grid-4">
          <StatCard color="amber" icon="bolt" label="Units used" value={Math.round(t.units).toLocaleString('en-IN')} sub={`${t.rooms} rooms`} />
          <StatCard color="indigo" icon="receipt" label="Billed to students" value={inr(t.billed)} sub={`${t.students} shares`} />
          <StatCard color="brand" icon="wallet" label="Paid" value={inr(t.paid)} sub={`${t.billed ? Math.round((t.paid / t.billed) * 100) : 0}% collected`} />
          <StatCard color="rose" icon="alert" label="Not yet paid" value={String(t.unpaid)} sub={`${t.overdue} overdue`} tone={t.overdue ? 'critical' : undefined} />
        </div>)}
      {d && d.rooms.length > 0 && (
        <Card padding={0} icon="bolt" color="amber" title={`Rooms, ${monthName(d.month!)}`} subtitle="Open a room to see each roommate's share">
          <div className="rc-table-wrap">
            <table className="rc-table eb-table">
              <thead><tr><th>Room</th><th className="rc-n">Readings</th><th className="rc-n">Units</th><th className="rc-n">Included + recharged</th><th className="rc-n">Billed units</th><th className="rc-n">Rate</th><th className="rc-n">Bill</th><th>Shared by</th></tr></thead>
              <tbody>{d.rooms.map((x) => {
                const paid = x.shares.filter((y) => y.paid >= y.amount).length;
                return (
                  <Fragment key={x.bill_id}>
                    <tr className="ct-row" onClick={() => setOpen(open === x.bill_id ? null : x.bill_id)}>
                      <td><button type="button" className="ct-name" aria-expanded={open === x.bill_id}><b>{x.space_code}</b><small>{x.hostel_code}</small></button></td>
                      <td className="rc-n">{x.opening} → {x.closing}</td><td className="rc-n">{x.units}</td><td className="rc-n">{x.included} + {x.recharged}</td>
                      <td className="rc-n">{x.billable}</td><td className="rc-n">₹{x.rate}</td><td className="rc-n"><b>{inr(x.amount)}</b></td>
                      <td>{x.shares.length ? <>{x.shares.length} student{x.shares.length > 1 ? 's' : ''} · <span className={paid === x.shares.length ? 'eb-ok' : 'eb-due'}>{paid} paid</span></>
                        : <span className="klh-muted">No one lived here: borne by the residency</span>}</td>
                    </tr>
                    {open === x.bill_id && (
                      <tr className="ct-open"><td colSpan={8}>
                        <table className="rc-table eb-shares"><thead><tr><th>Student</th><th className="rc-n">Days</th><th className="rc-n">Share</th><th className="rc-n">Units</th><th className="rc-n">Amount</th><th>Status</th></tr></thead>
                          <tbody>{x.shares.map((y) => (
                            <tr key={y.share_id}><td><b>{y.name}</b><small className="sd-sub">{y.student_id}</small></td><td className="rc-n">{y.days}</td><td className="rc-n">{y.share_pct}%</td><td className="rc-n">{y.units}</td>
                              <td className="rc-n">{inr(y.amount)}</td>
                              <td><span className={`xd-pill xd-t-${y.paid >= y.amount ? 'good' : y.overdue ? 'bad' : 'warn'}`}>{y.paid >= y.amount ? 'Paid' : y.overdue ? 'Overdue' : `Due ${y.due_date ? new Date(`${y.due_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}`}</span></td></tr>))}</tbody></table>
                      </td></tr>)}
                  </Fragment>);
              })}</tbody>
            </table>
          </div>
        </Card>)}
    </div>
  );
}
