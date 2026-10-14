import { useState } from 'react';
import { Button, Drawer, Field, Input, SegmentedControl, Select, StatCard, Textarea } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, toast, useApi, useSession } from '@/lib/ui';
import { CATEGORY, KIND_LABEL, Ledger, day, inr, type Account, type Entry, type Kind } from './shared';

type Hostel = { facility_id: string; hostel_name: string; residents: number; holding: number; held: number; paid_in: number; deducted: number; refunded: number; proposed: number;
  proposals: number; not_paid: number; to_collect: number; to_refund: number; to_refund_amount: number };
type Row = { student_id: string; name: string; programme: string; hostel_name: string | null; bed_label: string | null; resident: boolean; vacate_status: string | null;
  paid_in: number; deducted: number; refunded: number; proposed: number; balance: number; to_pay: number };
type Detail = Account & { student: Row & { facility_id: string }; dues: { demand_id: number; fee_head: string; instalment_no: number; reference_type: string | null; balance: number; due_date: string; status: string }[];
  damages: { handover_id: number; handover_type: string; handover_on: string; damage: number; items: string | null }[] };
type Show = '' | 'proposals' | 'refund' | 'unpaid' | 'deducted';
const PROPOSE = ['Floor_Warden', 'Warden', 'Chief_Warden', 'Director_Hostels', 'Accounts_Section', 'admin'];
const DECIDE = ['Chief_Warden', 'Director_Hostels', 'admin'];
const ACCOUNTS = ['Accounts_Section', 'admin'];

/**
 * CDP-01 Caution deposits. What the hostels hold for each student, hostel by hostel; wardens propose deductions with the
 * reason, the Chief Manager approves them, Accounts pays unpaid dues from a deposit and refunds the balance to leavers.
 */
export default function CautionDeposits() {
  const s = useSession()!;
  const sum = useApi<Hostel[]>('/caution/summary');
  const [show, setShow] = useState<Show>('');
  const [q, setQ] = useState('');
  const [fac, setFac] = useState('');
  const list = useApi<Row[]>(`/caution/students?show=${show}&q=${encodeURIComponent(q)}&facility_id=${fac}`);
  const [open, setOpen] = useState<string | null>(null);
  const h = sum.data ?? [];
  const tot = (k: keyof Hostel) => h.reduce((a, x) => a + Number(x[k]), 0);
  return (
    <div className="klh-stack cd-desk" style={{ gap: 16 }}>
      <ScreenHeader code="CDP-01" subtitle="Refundable deposits held for students: every deduction with its reason and approval, dues paid from it, refunds to leavers." />
      {sum.data && (
        <div className="klh-grid-4">
          <StatCard color="brand" icon="shield" label="Held now" value={inr(tot('held'))} sub={`${tot('holding')} students · ${inr(tot('paid_in'))} paid in`} />
          <StatCard color="rose" icon="alert" label="Deducted" value={inr(tot('deducted'))} sub={`${inr(tot('proposed'))} waiting in ${tot('proposals')} proposal${tot('proposals') === 1 ? '' : 's'}`} />
          <StatCard color="indigo" icon="check" label="Refunded" value={inr(tot('refunded'))} sub={`${tot('to_refund')} leaver${tot('to_refund') === 1 ? '' : 's'} to refund · ${inr(tot('to_refund_amount'))}`} />
          <StatCard color="amber" icon="clock" label="To collect" value={inr(tot('to_collect'))} sub={`${tot('not_paid')} resident${tot('not_paid') === 1 ? '' : 's'} with no deposit`} />
        </div>)}
      {h.length > 1 && (
        <section className="box cd-hostels">
          <table>
            <thead><tr><th>Hostel</th><th className="r">Hostel students</th><th className="r">Held</th><th className="r">Deducted</th><th className="r">Refunded</th><th className="r">Waiting</th><th className="r">To refund</th></tr></thead>
            <tbody>{h.map((x) => (
              <tr key={x.facility_id} className={fac === x.facility_id ? 'cd-sel' : ''} onClick={() => setFac(fac === x.facility_id ? '' : x.facility_id)}>
                <td><b>{x.hostel_name}</b></td><td className="r">{x.residents}</td><td className="r">{inr(x.held)}</td><td className="r">{inr(x.deducted)}</td><td className="r">{inr(x.refunded)}</td>
                <td className="r">{x.proposals ? `${x.proposals} · ${inr(x.proposed)}` : '—'}</td><td className="r">{x.to_refund ? `${x.to_refund} · ${inr(x.to_refund_amount)}` : '—'}</td></tr>))}</tbody>
          </table>
        </section>)}
      <section className="box rd-bar">
        <label className="sd-sel">Find<Input placeholder="Name, ID or room" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <SegmentedControl label="Show" value={show} onChange={(v) => setShow(v as Show)} options={[{ value: '', label: 'Everyone' }, { value: 'proposals', label: 'Deductions waiting' },
          { value: 'refund', label: 'To refund' }, { value: 'deducted', label: 'With deductions' }, { value: 'unpaid', label: 'No deposit' }]} />
      </section>
      <section className="box cd-list">
        {!list.data && <p className="q-empty">Loading…</p>}
        {list.data && !list.data.length && <p className="q-empty">No student in this list.</p>}
        <ul>{list.data?.map((r) => (
          <li key={r.student_id}><button type="button" onClick={() => setOpen(r.student_id)}>
            <span className="cd-who"><b>{r.name}</b><small>{r.student_id} · {r.bed_label ?? '—'}{!r.resident ? ' · left' : r.vacate_status === 'Approved' ? ' · leaving' : ''}</small></span>
            <span className="cd-num"><b>{inr(r.balance)}</b><small>held</small></span>
            <span className="cd-num"><b>{r.deducted ? `−${inr(r.deducted)}` : '—'}</b><small>deducted</small></span>
            <span className="cd-tags">
              {r.proposed > 0 && <span className="xd-pill xd-t-warn">{inr(r.proposed)} waiting</span>}
              {r.to_pay > 0 && <span className="xd-pill xd-t-warn">{inr(r.to_pay)} to pay</span>}
              {r.refunded > 0 && <span className="xd-pill xd-t-good">Refunded {inr(r.refunded)}</span>}
              {r.resident && r.balance === 0 && r.to_pay === 0 && <span className="xd-pill xd-t-bad">No deposit</span>}
            </span>
          </button></li>))}</ul>
      </section>
      {open && <StudentDrawer sid={open} role={s.role} me={s.id} onClose={() => setOpen(null)} onDone={() => { list.mutate(); sum.mutate(); }} />}
    </div>
  );
}

function StudentDrawer({ sid, role, me, onClose, onDone }: { sid: string; role: string; me: string; onClose: () => void; onDone: () => void }) {
  const r = useApi<Detail>(`/caution/students/${sid}`);
  const d = r.data;
  const [form, setForm] = useState<'deduct' | 'refund' | 'opening' | null>(null);
  const [busy, setBusy] = useState(false);
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const run = async (fn: () => Promise<{ entry_no?: string }>, msg: string) => {
    setBusy(true);
    try { const x = await fn(); toast(`${msg}${x?.entry_no ? ` (${x.entry_no})` : ''}`); setForm(null); await r.mutate(); onDone(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  const decide = (e: Entry, decision: 'Approved' | 'Rejected') => run(() => api(`/caution/entries/${e.entry_id}/decide`, { method: 'POST', json: { decision, remarks: remarks[e.entry_id] || null } }), decision === 'Approved' ? 'Deduction approved' : 'Deduction refused');
  const payDue = (demandId: number) => run(() => api(`/caution/students/${sid}/pay-due`, { method: 'POST', json: { demand_id: demandId } }), 'Paid from the deposit');
  const canDecide = DECIDE.includes(role), isAcc = ACCOUNTS.includes(role);
  return (
    <Drawer open onClose={onClose} title={d ? d.student.name : 'Caution deposit'} subtitle={d ? `${sid} · ${d.student.programme} · ${d.student.hostel_name ?? ''} ${d.student.bed_label ?? ''}` : ''}
      footer={d && (
        <div className="klh-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {PROPOSE.includes(role) && <Button variant="secondary" onClick={() => setForm('deduct')}>Propose a deduction</Button>}
          {isAcc && <Button variant="primary" onClick={() => setForm('refund')} blockedReason={d.balance <= 0 ? 'Nothing is held.' : d.proposed > 0 ? 'Decide the waiting deduction first.' : undefined}>Refund</Button>}
          {isAcc && (d.hostel_balance === 0 || d.elec_balance === 0) && <Button variant="secondary" onClick={() => setForm('opening')}>Deposit held from before</Button>}
        </div>)}>
      {!d && <p className="q-empty">Loading…</p>}
      {d && (
        <div className="cd-det">
          <div className="cd-det-top">
            <span><small>Held</small><b>{inr(d.balance)}</b><small>Caution {inr(d.hostel_balance)} · Electricity {inr(d.elec_balance)}</small></span><span><small>Paid in</small><b>{inr(d.paid_in)}</b></span>
            <span><small>Deducted</small><b>{inr(d.deducted)}</b></span><span><small>Refunded</small><b>{inr(d.refunded)}</b></span>
          </div>
          {form === 'deduct' && <DeductForm d={d} busy={busy} onCancel={() => setForm(null)} onSave={(b) => run(() => api(`/caution/students/${sid}/deductions`, { method: 'POST', json: b }), 'Deduction proposed to the Chief Manager')} />}
          {form === 'refund' && <RefundForm d={d} busy={busy} onCancel={() => setForm(null)} onSave={(b) => run(() => api(`/caution/students/${sid}/refund`, { method: 'POST', json: b }), 'Refund recorded')} />}
          {form === 'opening' && <OpeningForm busy={busy} onCancel={() => setForm(null)} onSave={(b) => run(() => api(`/caution/students/${sid}/opening`, { method: 'POST', json: b }), 'Deposit recorded')} />}
          {isAcc && d.balance > 0 && d.dues.length > 0 && (
            <section className="cd-box"><h4>Unpaid dues that the deposit can pay</h4>
              <ul className="cd-dues">{d.dues.map((x) => (
                <li key={x.demand_id}><span><b>{x.reference_type === 'room_change' ? `${x.fee_head.replace('_', ' ')} (room change)` : x.fee_head.replace('_', ' ')}{x.fee_head === 'Hostel' && x.reference_type !== 'room_change' ? `, instalment ${x.instalment_no}` : ''}</b>
                  <small>{inr(x.balance)} · due {day(x.due_date)}{x.status === 'Overdue' ? ' · overdue' : ''}</small></span>
                  <Button size="sm" variant="secondary" loading={busy} onClick={() => payDue(x.demand_id)}>Pay {inr(Math.min(x.balance, d.balance))} from deposit</Button></li>))}</ul>
            </section>)}
          <section className="cd-box"><h4>Account</h4>
            <Ledger entries={d.entries} actions={(e) => canDecide && e.status === 'Proposed' && e.proposed_by !== me ? (
              <span className="cd-decide">
                <Textarea rows={1} placeholder="Remarks (needed to refuse)" value={remarks[e.entry_id] ?? ''} onChange={(x) => setRemarks({ ...remarks, [e.entry_id]: x.target.value })} />
                <Button size="sm" variant="primary" icon="check" loading={busy} onClick={() => decide(e, 'Approved')}>Approve</Button>
                <Button size="sm" variant="secondary" loading={busy} blockedReason={(remarks[e.entry_id] ?? '').trim().length < 3 ? 'Write why in the remarks.' : undefined} onClick={() => decide(e, 'Rejected')}>Refuse</Button>
              </span>) : null} />
          </section>
        </div>)}
    </Drawer>
  );
}

const KindField = ({ value, onChange, d }: { value: Kind; onChange: (k: Kind) => void; d?: Detail }) => (
  <Field label="Deposit"><Select value={value} onChange={(e) => onChange(e.target.value as Kind)}
    options={(['Hostel', 'Electricity'] as Kind[]).map((k) => ({ value: k, label: `${KIND_LABEL[k]}${d ? ` (${inr(k === 'Hostel' ? d.hostel_balance : d.elec_balance)} held)` : ''}` }))} /></Field>);
const heldOf = (d: Detail, k: Kind) => (k === 'Hostel' ? d.hostel_balance : d.elec_balance);

function DeductForm({ d, busy, onCancel, onSave }: { d: Detail; busy: boolean; onCancel: () => void; onSave: (b: object) => void }) {
  const [kind, setKind] = useState<Kind>('Hostel');
  const [cat, setCat] = useState('Damage');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [ho, setHo] = useState<number | null>(null);
  const fromHandover = (id: string) => { const h = d.damages.find((x) => x.handover_id === Number(id)); setHo(h ? h.handover_id : null);
    if (h) { setCat('Damage'); setAmount(String(h.damage)); setReason(`Damage found at the ${h.handover_type.toLowerCase().replace('_', ' ')} on ${day(h.handover_on)}: ${h.items ?? ''}`); } };
  const n = Number(amount);
  return (
    <section className="cd-box cd-form"><h4>Propose a deduction</h4>
      {d.damages.length > 0 && <Field label="From a room handover"><Select value={ho ? String(ho) : ''} onChange={(e) => fromHandover(e.target.value)}
        options={[{ value: '', label: 'None' }, ...d.damages.map((h) => ({ value: String(h.handover_id), label: `${day(h.handover_on)} · ${inr(h.damage)} · ${h.items ?? ''}` }))]} /></Field>}
      <KindField value={kind} onChange={setKind} d={d} />
      <div className="cd-row">
        <Field label="For"><Select value={cat} onChange={(e) => setCat(e.target.value)} options={Object.entries(CATEGORY).filter(([k]) => k !== 'Unpaid_Dues').map(([value, label]) => ({ value, label }))} /></Field>
        <Field label="Amount (₹)" hint={`${inr(heldOf(d, kind))} held`}><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      </div>
      <Field label="Reason" hint="The student sees this. Say what happened and how the amount was worked out."><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="klh-row" style={{ gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" loading={busy} blockedReason={!(n > 0) ? 'Enter the amount.' : n > heldOf(d, kind) ? 'More than is held.' : reason.trim().length < 10 ? 'Write the reason.' : undefined}
          onClick={() => onSave({ kind, category: cat, amount: n, reason, handover_id: ho })}>Send to the Chief Manager</Button>
      </div>
    </section>
  );
}

function RefundForm({ d, busy, onCancel, onSave }: { d: Detail; busy: boolean; onCancel: () => void; onSave: (b: object) => void }) {
  const [kind, setKind] = useState<Kind>(d.hostel_balance > 0 ? 'Hostel' : 'Electricity');
  const [amount, setAmount] = useState(String(heldOf(d, d.hostel_balance > 0 ? 'Hostel' : 'Electricity')));
  const [mode, setMode] = useState('NEFT');
  const [ref, setRef] = useState('');
  const [acct, setAcct] = useState('');
  const [reason, setReason] = useState('Balance of caution deposit refunded on leaving the hostel');
  const n = Number(amount);
  return (
    <section className="cd-box cd-form"><h4>Refund the deposit</h4>
      {d.dues.length > 0 && <p className="cd-warn">The student still owes {inr(d.dues.reduce((a, x) => a + x.balance, 0))}. Pay those dues from the deposit first if they are to be settled from it.</p>}
      <KindField value={kind} onChange={(k) => { setKind(k); setAmount(String(heldOf(d, k))); }} d={d} />
      <div className="cd-row">
        <Field label="Amount (₹)" hint={`${inr(heldOf(d, kind))} held; refund each deposit on its own line`}><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Sent by"><Select value={mode} onChange={(e) => setMode(e.target.value)} options={['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque']} /></Field>
      </div>
      <div className="cd-row">
        <Field label="Bank reference" hint="UTR, or the cheque number"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
        <Field label="To account" hint="Bank and last 4 digits only"><Input value={acct} onChange={(e) => setAcct(e.target.value)} placeholder="SBI ****1234" /></Field>
      </div>
      <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="klh-row" style={{ gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" loading={busy} blockedReason={!(n > 0) ? 'Enter the amount.' : n > heldOf(d, kind) ? 'More than is held.' : ref.trim().length < 4 ? 'Enter the bank reference.' : undefined}
          onClick={() => onSave({ kind, amount: n, mode, ref, account: acct || null, reason })}>Record refund</Button>
      </div>
    </section>
  );
}

function OpeningForm({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: (b: object) => void }) {
  const [kind, setKind] = useState<Kind>('Hostel');
  const [amount, setAmount] = useState('10000');
  const [reason, setReason] = useState('Caution deposit held before the system');
  return (
    <section className="cd-box cd-form"><h4>Deposit already held</h4>
      <KindField value={kind} onChange={(k) => { setKind(k); setAmount(k === 'Hostel' ? '10000' : '2000'); }} />
      <div className="cd-row">
        <Field label="Amount (₹)"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Reason" hint="Where it was recorded before"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
      <div className="klh-row" style={{ gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" loading={busy} blockedReason={!(Number(amount) > 0) ? 'Enter the amount.' : undefined} onClick={() => onSave({ kind, amount: Number(amount), reason })}>Record</Button>
      </div>
    </section>
  );
}
