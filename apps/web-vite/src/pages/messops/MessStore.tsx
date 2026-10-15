import { useMemo, useState } from 'react';
import { PackageCheck, Plus, Trash2 } from 'lucide-react';
import { Button, Drawer, Field, Input, SegmentedControl, Select, StatCard } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, toast, useApi, useSession } from '@/lib/ui';
import { MEALS, day, inr, mealName, mealNow, num, todayIso, useMess, type Meal } from './shared';

type Stock = { sku: string; name: string; base_unit: string; reorder_level: number | null; received: number; issued: number; on_hand: number; avg_rate: number | null;
  stock_value: number; last_received: string | null; last_issued: string | null; next_expiry: string | null; reorder: boolean; daily_use: number | null; days_left: number | null };
type Receipt = { receipt_id: number; received_on: string; supplier: string; bill_no: string | null; received_by_name: string | null; items: number; value: number; lines: string };
type Issue = { issue_id: number; issue_date: string; meal: string; student_strength: number | null; remarks: string | null; issued_by_name: string | null;
  acknowledged_by_name: string | null; acknowledged_at: string | null; items: number; value: number; lines: string };
type Line = { sku: string; qty: string; rate: string; expiry_date: string };
const KEEPERS = ['Mess_Storekeeper', 'Mess_Incharge', 'Mess_Manager', 'admin'];
const ACK = ['Mess_Supervisor', 'Chief_Chef', 'Mess_Incharge', 'Mess_Manager', 'admin'];

/**
 * MES-05 Mess store. Provisions received with the supplier's bill, issued to the kitchen meal by meal (the Mess
 * Supervisor acknowledges what reached the kitchen), and what is left: the store never issues more than it holds,
 * and an item is flagged when it would last less than four days at the last two weeks' use.
 */
export default function MessStore() {
  const { mess, picker } = useMess();
  const r = useApi<{ stock: Stock[]; receipts: Receipt[]; issues: Issue[] }>(mess ? `/mess-ops/store?mess_id=${mess.mess_id}` : null);
  const [tab, setTab] = useState<'stock' | 'receipts' | 'issues'>('stock');
  const [form, setForm] = useState<'receive' | 'issue' | null>(null);
  const role = useSession()?.role ?? '';
  const d = r.data;
  const low = (d?.stock ?? []).filter((s) => s.reorder && (s.daily_use ?? 0) > 0);
  const toAck = (d?.issues ?? []).filter((i) => !i.acknowledged_at);
  const ack = async (id: number) => {
    try { await api(`/mess-ops/store/issues/${id}/acknowledge`, { method: 'POST' }); toast('Acknowledged'); r.mutate(); } catch (e) { toast((e as Error).message, 'critical'); }
  };
  return (
    <div className="klh-stack mo" style={{ gap: 16 }}>
      <ScreenHeader code="MES-05" subtitle="Provisions received, issued to the kitchen and left in the store, with a warning before anything runs out."
        actions={<div className="klh-row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>{picker}
          {KEEPERS.includes(role) && <><Button variant="secondary" icon="plus" onClick={() => setForm('receive')}>Receive goods</Button><Button variant="primary" icon="upload" onClick={() => setForm('issue')}>Issue to kitchen</Button></>}</div>} />
      {d && (
        <div className="klh-grid-4">
          <StatCard color="brand" icon="wallet" label="Stock value" value={inr(d.stock.reduce((a, s) => a + s.stock_value, 0))} sub={`${d.stock.filter((s) => s.on_hand > 0).length} items in store`} />
          <StatCard color="rose" icon="alert" label="Running low" value={String(low.length)} sub="Under four days left" tone={low.length ? 'warning' : undefined} />
          <StatCard color="amber" icon="clock" label="To acknowledge" value={String(toAck.length)} sub="Issues the kitchen has not signed" />
          <StatCard color="indigo" icon="receipt" label="Received this month" value={inr(d.receipts.filter((x) => x.received_on.slice(0, 7) === todayIso().slice(0, 7)).reduce((a, x) => a + x.value, 0))} sub="From suppliers' bills" />
        </div>)}
      <section className="box rd-bar"><SegmentedControl label="Show" value={tab} onChange={(v) => setTab(v as typeof tab)} options={[{ value: 'stock', label: 'Stock' }, { value: 'issues', label: 'Issues to kitchen' }, { value: 'receipts', label: 'Goods received' }]} /></section>
      {d && tab === 'stock' && (
        <div className="box mo-table"><table>
          <thead><tr><th>Item</th><th className="r">In store</th><th className="r">Use a day</th><th className="r">Days left</th><th className="r">Value</th><th>Last received</th><th>Next expiry</th></tr></thead>
          <tbody>{[...d.stock].sort((a, b) => Number(b.reorder) - Number(a.reorder) || a.name.localeCompare(b.name)).map((s) => (
            <tr key={s.sku} className={s.reorder && (s.daily_use ?? 0) > 0 ? 'mo-low' : ''}>
              <td><b>{s.name}</b>{s.reorder && (s.daily_use ?? 0) > 0 && <span className="xd-pill xd-t-bad">Order now</span>}</td>
              <td className="r">{num(s.on_hand, 2)} {s.base_unit}</td><td className="r">{s.daily_use ? `${num(s.daily_use, 2)} ${s.base_unit}` : '—'}</td>
              <td className="r">{s.days_left ?? '—'}</td><td className="r">{inr(s.stock_value)}</td><td>{day(s.last_received)}</td><td>{day(s.next_expiry)}</td></tr>))}</tbody>
        </table></div>)}
      {d && tab === 'issues' && (
        <div className="mo-list">{d.issues.map((i) => (
          <article key={i.issue_id} className="box mo-card mo-static">
            <span className="mo-when"><b>{mealName(i.meal)}</b><small>{day(i.issue_date)}</small></span>
            <span className="mo-text">{i.lines}<small>{i.items} items · {inr(i.value)}{i.student_strength ? ` · for ${i.student_strength} students` : ''} · issued by {i.issued_by_name ?? '—'}</small></span>
            {i.acknowledged_at ? <span className="xd-pill xd-t-good">Received by {i.acknowledged_by_name}</span>
              : ACK.includes(role) ? <Button size="sm" variant="primary" icon="check" onClick={() => ack(i.issue_id)}>Acknowledge</Button> : <span className="xd-pill xd-t-warn">Not acknowledged</span>}
          </article>))}</div>)}
      {d && tab === 'receipts' && (
        <div className="mo-list">{d.receipts.map((x) => (
          <article key={x.receipt_id} className="box mo-card mo-static">
            <span className="mo-when"><b>{day(x.received_on)}</b><small>{x.bill_no ?? 'No bill no.'}</small></span>
            <span className="mo-text"><b>{x.supplier}</b> · {x.lines}<small>{x.items} items · received by {x.received_by_name ?? '—'}</small></span>
            <span className="mo-amt">{inr(x.value)}</span>
          </article>))}</div>)}
      {form && mess && d && <StoreForm kind={form} messId={mess.mess_id} strength={mess.strength} stock={d.stock} onClose={() => setForm(null)} onDone={() => { setForm(null); r.mutate(); }} />}
    </div>
  );
}

function StoreForm({ kind, messId, strength, stock, onClose, onDone }: { kind: 'receive' | 'issue'; messId: number; strength: number; stock: Stock[]; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(todayIso());
  const [supplier, setSupplier] = useState('');
  const [bill, setBill] = useState('');
  const [meal, setMeal] = useState<Meal>(mealNow());
  const [lines, setLines] = useState<Line[]>([{ sku: '', qty: '', rate: '', expiry_date: '' }]);
  const [busy, setBusy] = useState(false);
  const by = useMemo(() => new Map(stock.map((s) => [s.sku, s])), [stock]);
  const set = (i: number, k: keyof Line, v: string) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: v, ...(k === 'sku' && kind === 'receive' ? { rate: String(by.get(v)?.avg_rate ?? '') } : {}) } : l)));
  const ok = lines.filter((l) => l.sku && Number(l.qty) > 0);
  const over = kind === 'issue' ? ok.find((l) => Number(l.qty) > (by.get(l.sku)?.on_hand ?? 0)) : undefined;
  const total = kind === 'receive' ? ok.reduce((a, l) => a + Number(l.qty) * Number(l.rate || 0), 0) : ok.reduce((a, l) => a + Number(l.qty) * (by.get(l.sku)?.avg_rate ?? 0), 0);
  const save = async () => {
    setBusy(true);
    try {
      if (kind === 'receive') await api('/mess-ops/store/receipts', { method: 'POST', json: { mess_id: messId, received_on: date, supplier, bill_no: bill || null,
        lines: ok.map((l) => ({ sku: l.sku, qty: Number(l.qty), rate: Number(l.rate || 0), expiry_date: l.expiry_date || null })) } });
      else await api('/mess-ops/store/issues', { method: 'POST', json: { mess_id: messId, issue_date: date, meal, student_strength: strength, lines: ok.map((l) => ({ sku: l.sku, qty: Number(l.qty) })) } });
      toast(kind === 'receive' ? 'Goods received into the store' : 'Issued to the kitchen; the supervisor acknowledges it'); onDone();
    } catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  const blocked = !ok.length ? 'Add at least one item with a quantity.' : kind === 'receive' && supplier.trim().length < 2 ? 'Enter the supplier.' : over ? `Only ${num(by.get(over.sku)?.on_hand, 2)} ${by.get(over.sku)?.base_unit} of ${by.get(over.sku)?.name} in store.` : undefined;
  const items = [...stock].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Drawer open onClose={onClose} title={kind === 'receive' ? 'Receive goods' : 'Issue to the kitchen'} subtitle={`${ok.length} item${ok.length === 1 ? '' : 's'} · ${inr(total)}`}
      footer={<Button variant="primary" icon="check" loading={busy} blockedReason={blocked} onClick={save}>{kind === 'receive' ? 'Save receipt' : 'Issue'}</Button>}>
      <div className="klh-stack" style={{ gap: 12 }}>
        <div className="mo-row">
          <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          {kind === 'receive' ? <Field label="Bill no."><Input value={bill} onChange={(e) => setBill(e.target.value)} /></Field>
            : <Field label="For"><Select value={meal} onChange={(e) => setMeal(e.target.value as Meal)} options={MEALS.map((m) => ({ value: m, label: mealName(m) }))} /></Field>}
        </div>
        {kind === 'receive' && <Field label="Supplier"><Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Sri Lakshmi Traders" /></Field>}
        <div className="mo-lines">{lines.map((l, i) => { const s = by.get(l.sku); return (
          <div key={i} className={`mo-line ${kind}`}>
            <Select value={l.sku} onChange={(e) => set(i, 'sku', e.target.value)} options={[{ value: '', label: 'Item…' }, ...items.map((x) => ({ value: x.sku, label: `${x.name} (${num(x.on_hand, 1)} ${x.base_unit})` }))]} aria-label="Item" />
            <Input inputMode="decimal" value={l.qty} onChange={(e) => set(i, 'qty', e.target.value)} placeholder={s ? s.base_unit : 'Qty'} aria-label="Quantity" />
            {kind === 'receive' && <Input inputMode="decimal" value={l.rate} onChange={(e) => set(i, 'rate', e.target.value)} placeholder="Rate ₹" aria-label="Rate" />}
            {kind === 'receive' && <Input type="date" value={l.expiry_date} onChange={(e) => set(i, 'expiry_date', e.target.value)} aria-label="Expiry" />}
            <button type="button" className="mo-x" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Remove line" disabled={lines.length === 1}><Trash2 size={16} /></button>
          </div>); })}</div>
        <Button variant="ghost" size="sm" onClick={() => setLines([...lines, { sku: '', qty: '', rate: '', expiry_date: '' }])}><Plus size={14} /> Add item</Button>
        {kind === 'issue' && <p className="mo-muted"><PackageCheck size={14} /> The Rasoi Supervisor acknowledges what reached the kitchen.</p>}
      </div>
    </Drawer>
  );
}
