import { useState } from 'react';
import { Avatar, Button, Card, DataTable, Drawer, EmptyState, Field, Input, Money, Notice, Select, StatCard, StatusChip, Tabs, formatDate, formatDateTime, formatINR } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, titleCase, useAction, useApi, useSession, words } from '@/lib/ui';
import { can } from '@/app/screens';

type Demand = { demand_id: number; fee_head: string; instalment_no: number; amount_due: string; amount_paid: string; due_date: string; status: string };
type Receipt = { receipt_id: number; receipt_no: string; fee_head: string; instalment_no: number; amount: string; paid_on: string; payment_mode: string; gateway_ref: string | null; gateway_status: string; collected_by: string | null };
type Totals = { fee_head: string; amount_due: string; amount_paid: string; balance: string };
type Reg = { registration_id: number; student_id: string; full_name: string; hostel_code: string; status: string; registration_fee_status: string | null; plan_status: string | null; plan_amount_due: string; plan_amount_paid: string };

/** REG-07 Dues and collections: fee demands, receipts, overdue list. Hostel Accounts C E (cash/DD receipts, reconcile); Warden and Office V; Pro-VC Finance A (waivers). */
export default function Dues() {
  const s = useSession()!;
  const collects = can(s.role, 'REG-07', 'C');
  const [tab, setTab] = useState('student');
  const [sid, setSid] = useState('');
  const [q, setQ] = useState('');
  const dues = useApi<{ demands: Demand[]; totals: Totals[]; receipts: Receipt[] }>(q ? `/students/${q}/demands` : null);
  const student = useApi<{ full_name: string; programme: string; stay: { space_id: string } | null }>(q ? `/students/${q}` : null);
  const regs = useApi<Reg[]>('/registrations');
  const [sel, setSel] = useState<Demand | null>(null);
  const balance = dues.data?.totals.reduce((a, t) => a + Number(t.balance ?? 0), 0) ?? 0;
  const overdue = dues.data?.demands.filter((d) => d.status === 'Overdue').length ?? 0;
  const pending = (regs.data ?? []).filter((r) => (r.plan_status && r.plan_status !== 'Paid') || r.registration_fee_status === 'Pending' || r.registration_fee_status === 'Overdue');
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="REG-07" subtitle={collects ? 'Record cash or DD receipts; reconcile online payments; raise damage and fine demands. A fee waiver or reduction needs the Pro-VC Finance.' : 'View the dues of your hostel.'} />
      <Tabs label="Dues" tabs={[{ id: 'student', label: 'One student' }, { id: 'overdue', label: 'Dues and overdue list', count: pending.length }]} value={tab} onChange={setTab} />
      {tab === 'overdue' && (
        <Card padding={0}>
          <DataTable caption="Registrations with money outstanding" rowKey="registration_id" rows={pending} loading={!regs.data} searchable onRowClick={(r) => { setSid((r as Reg).student_id); setQ((r as Reg).student_id); setTab('student'); }} empty={<EmptyState icon="receipt" title="Nothing outstanding" />}
            columns={[
              { key: 'full_name', label: 'Student', render: (v: string, r: Reg) => `${titleCase(v)} · ${r.student_id}` },
              { key: 'hostel_code', label: 'Hostel' },
              { key: 'registration_fee_status', label: 'Registration fee', render: (v: string | null) => <StatusChip status={v ?? 'Pending'} /> },
              { key: 'plan_status', label: 'Fee plan', render: (v: string | null, r: Reg) => (v ? <span><StatusChip status={v} /> <span className="klh-num klh-muted">{formatINR(r.plan_amount_paid)} of {formatINR(r.plan_amount_due)}</span></span> : '—') },
              { key: 'status', label: 'Registration', render: (v: string) => <StatusChip status={v} /> },
            ]} />
        </Card>)}
      {tab === 'student' && (
        <>
          <Card icon="search" color="orange" title="Find a student">
            <form className="klh-row" style={{ alignItems: 'flex-end', gap: 12 }} onSubmit={(e) => { e.preventDefault(); setQ(sid); }}>
              <Field label="University ID" required><Input value={sid} onChange={(e) => setSid(e.target.value)} placeholder="2600040010" style={{ width: 220 }} /></Field>
              <Button type="submit" variant="primary" icon="search">Look up</Button>
            </form>
          </Card>
          {q && student.error && <Notice tone="critical" title="No student with that ID">Check the University ID and try again.</Notice>}
          {q && student.data && (
            <>
              <div className="klh-row" style={{ gap: 16 }}><Avatar name={titleCase(student.data.full_name)} size="lg" /><div><div style={{ fontSize: 18, fontWeight: 700 }}>{titleCase(student.data.full_name)}</div><div className="klh-muted">{q} · {student.data.programme}{student.data.stay ? ` · ${student.data.stay.space_id.replace(/^H-/, '')}` : ''}</div></div></div>
              <div className="klh-grid-4">
                <StatCard color={balance > 0 ? 'orange' : 'brand'} icon="wallet" label="Outstanding" value={formatINR(balance)} tone={balance > 0 ? (overdue ? 'critical' : 'warning') : 'success'} sub={overdue ? `${overdue} overdue` : balance > 0 ? 'not yet due' : 'nothing due'} />
                {dues.data?.totals.slice(0, 3).map((t) => <StatCard key={t.fee_head} color={t.fee_head === 'Electricity' ? 'amber' : t.fee_head === 'Mess' ? 'cyan' : 'indigo'} label={words(t.fee_head)} icon={t.fee_head === 'Electricity' ? 'bolt' : t.fee_head === 'Mess' ? 'utensils' : 'receipt'} value={formatINR(t.balance)} sub={`${formatINR(t.amount_paid)} paid of ${formatINR(t.amount_due)}`} />)}
              </div>
              <Card padding={0}>
                <DataTable caption="Fee demands" rowKey="demand_id" rows={dues.data?.demands ?? []} loading={!dues.data} onRowClick={(r) => setSel(r as Demand)} selectedKey={sel?.demand_id} empty={<EmptyState icon="receipt" title="No fees raised for this student" />}
                  columns={[
                    { key: 'fee_head', label: 'Fee head', render: (v: string, r: Demand) => `${words(v)}${v === 'Hostel' ? `, instalment ${r.instalment_no}` : ''}` },
                    { key: 'amount_due', label: 'Amount due', align: 'right', render: (v: string) => <b className="klh-num">{formatINR(v)}</b> },
                    { key: 'amount_paid', label: 'Paid', align: 'right', render: (v: string) => <span className="klh-num">{formatINR(v)}</span> },
                    { key: 'due_date', label: 'Due date', render: (v: string) => formatDate(v) },
                    { key: 'status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
                  ]} />
              </Card>
              <Card padding={0}>
                <DataTable caption="Receipts" rowKey="receipt_id" rows={dues.data?.receipts ?? []} loading={!dues.data} empty={<EmptyState icon="receipt" title="No receipts" />}
                  columns={[
                    { key: 'receipt_no', label: 'Receipt', render: (v: string) => <span className="klh-code">{v}</span> },
                    { key: 'fee_head', label: 'For', render: (v: string, r: Receipt) => `${words(v)}${v === 'Hostel' ? `, instalment ${r.instalment_no}` : ''}` },
                    { key: 'amount', label: 'Amount', align: 'right', render: (v: string) => <b className="klh-num">{formatINR(v, true)}</b> },
                    { key: 'paid_on', label: 'Paid on', render: (v: string) => formatDateTime(v) },
                    { key: 'payment_mode', label: 'Mode', render: (v: string, r: Receipt) => `${v}${r.gateway_ref ? ` · ${r.gateway_ref}` : ''}${r.collected_by ? ` · by ${r.collected_by}` : ''}` },
                    { key: 'gateway_status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
                  ]} />
              </Card>
            </>)}
        </>)}
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? `${words(sel.fee_head)}${sel.fee_head === 'Residency' ? `, instalment ${sel.instalment_no}` : ''}` : ''} subtitle={student.data ? `${titleCase(student.data.full_name)} · ${q}` : undefined}>
        {sel && (
          <div className="klh-stack" style={{ gap: 20 }}>
            <Money amount={Number(sel.amount_due) - Number(sel.amount_paid)} dueDate={sel.due_date} status={sel.status} paise />
            <dl className="klh-dl"><dt>Demanded</dt><dd className="klh-num">{formatINR(sel.amount_due, true)}</dd><dt>Paid</dt><dd className="klh-num">{formatINR(sel.amount_paid, true)}</dd><dt>Due</dt><dd>{formatDate(sel.due_date)}</dd></dl>
            {['Pending', 'Part_Paid', 'Overdue'].includes(sel.status) ? (collects ? <CashReceipt demand={sel} onDone={() => { dues.mutate(); setSel(null); }} /> : <Notice tone="info" title="Collection is by Hostel Accounts">Your role views dues; it cannot collect money.</Notice>) : <Notice tone="success" title="Settled">No balance on this demand. Receipts cannot be edited; a refund is a new entry.</Notice>}
            {['Pending', 'Part_Paid', 'Overdue'].includes(sel.status) && <Notice tone="warning" title="Waiver or reduction">Only the Pro-VC Finance can waive or reduce a fee (REG-07 A). Send the demand and reason through GEN-03.</Notice>}
          </div>)}
      </Drawer>
    </div>
  );
}

function CashReceipt({ demand, onDone }: { demand: Demand; onDone: () => void }) {
  const [amount, setAmount] = useState(Number(demand.amount_due) - Number(demand.amount_paid));
  const [mode, setMode] = useState('Cash');
  const [ref, setRef] = useState('');
  const { run, busy } = useAction();
  return (
    <div className="klh-stack" style={{ gap: 16 }}>
      <p className="klh-overline">Record cash or DD receipt</p>
      <Field label="Amount received" required><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
      <Field label="Mode" required><Select value={mode} onChange={(e) => setMode(e.target.value)} options={['Cash', 'DD']} /></Field>
      <Field label="DD number" visible={mode === 'DD'} required><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
      <Button variant="primary" icon="receipt" loading={busy} blockedReason={amount <= 0 ? 'Enter the amount received.' : mode === 'DD' && !ref ? 'Enter the DD number.' : undefined} onClick={() => run(() => api(`/demands/${demand.demand_id}/receipts`, { method: 'POST', json: { amount, payment_mode: mode, reference: ref || undefined } }).then(onDone), `Receipt issued for ${formatINR(amount)}`)}>Record receipt</Button>
    </div>
  );
}
