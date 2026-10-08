import { useState } from 'react';
import { Button, ConfirmDialog, Drawer, Notice, StatusChip, formatDate, formatDateTime, formatINR } from '@/lib/klh';
import { api } from '@/lib/api';
import { titleCase, useAction, useApi, useSession, words } from '@/lib/ui';
import { initials } from '@/ui/kit';
import { can } from '@/app/screens';

type Check = { registration_id: number; registration_no: string; student_id: string; full_name: string; programme: string; hostel_code: string; type_name: string; status: string; subspace_id: string | null;
  fee_check_status: string; fee_check_remarks: string | null; fee_checked_on: string | null; fee_checked_by: string | null; amount_due: number; amount_paid: number; open_demands: number; receipts: number; last_paid: string | null; modes: string };
type Dues = { demands: { demand_id: number; fee_head: string; instalment_no: number; amount_due: string; amount_paid: string; due_date: string; status: string }[];
  receipts: { receipt_id: number; receipt_no: string; fee_head: string; amount: string; paid_on: string; payment_mode: string; gateway_ref: string | null }[] };
/** BH1-301-B2 -> BH1-301 · bed 2 */
export const bedText = (id: string) => id.replace(/^(.*)-B(\d+)$/, '$1 · bed $2');
const TABS = [{ id: 'Pending', label: 'To check' }, { id: 'Query', label: 'Queries raised' }, { id: 'Verified', label: 'Verified' }, { id: 'All', label: 'All' }];

/** REG-09 Fee check. Before the key is issued a Warden compares what was demanded with what was received, and verifies or raises a query. */
export default function FeeChecks() {
  const s = useSession()!;
  const approve = can(s.role, 'REG-09', 'A');
  const hostels = useApi<{ facility_id: string; facility_name: string }[]>('/hostels');
  const [facility, setFacility] = useState('');
  const [tab, setTab] = useState('Pending');
  const list = useApi<Check[]>(`/fee-checks?status=All${facility ? `&facility_id=${facility}` : ''}`);
  const [sel, setSel] = useState<Check | null>(null);
  const all = list.data ?? [];
  const rows = tab === 'All' ? all : all.filter((r) => r.fee_check_status === tab && (tab !== 'Pending' || r.status === 'Confirmed'));
  const count = (id: string) => (id === 'All' ? all.length : all.filter((r) => r.fee_check_status === id && (id !== 'Pending' || r.status === 'Confirmed')).length);
  return (
    <div className="pg">
      <div className="pg-head">
        <div><p>Every demand of the student is paid; confirm the receipts match before the office issues the key. A query sends the student back to the accounts desk.</p></div>
        <div className="pg-actions"><select className="dm-filter" aria-label="Hostel" value={facility} onChange={(e) => setFacility(e.target.value)}><option value="">All hostels</option>{(hostels.data ?? []).map((h) => <option key={h.facility_id} value={h.facility_id}>{h.facility_name}</option>)}</select></div>
      </div>
      <div className="stg" role="group" aria-label="Status">
        {TABS.map((t) => <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}><b>{list.data ? count(t.id) : ''}</b><span>{t.label}</span></button>)}
      </div>
      <section className="box">
        <div className="q">
          {!list.data && <div className="q-empty">Loading…</div>}
          {list.data && rows.length === 0 && <div className="q-empty">{tab === 'Pending' ? 'Nothing to check. Students appear here once all their fees are paid.' : 'Nothing here.'}</div>}
          {rows.map((r) => {
            const ok = r.amount_paid >= r.amount_due && r.open_demands === 0;
            return (
              <button key={r.registration_id} type="button" className="q-row" style={{ gridTemplateColumns: '34px minmax(0, 1.4fr) minmax(0, 1fr) auto' }} onClick={() => setSel(r)}>
                <span className="q-av">{initials(r.full_name)}</span>
                <span className="q-text"><b>{titleCase(r.full_name)}</b><span>{r.student_id} · {r.subspace_id ? bedText(r.subspace_id) : `${r.hostel_code} · ${r.type_name}`}</span></span>
                <span className="q-text"><b style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(r.amount_paid)} <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>of {formatINR(r.amount_due)}</span></b><span>{r.receipts} receipt{r.receipts === 1 ? '' : 's'}{r.modes ? ` · ${r.modes}` : ''}{r.last_paid ? ` · ${formatDate(r.last_paid)}` : ''}</span></span>
                {r.fee_check_status === 'Verified' ? <span className="tag tag-ok">Verified</span> : r.fee_check_status === 'Query' ? <span className="tag tag-bad">Query</span> : r.status !== 'Confirmed' ? <span className="tag tag-warn">Fees due</span> : ok ? <span className="tag tag-ok">Matches</span> : <span className="tag tag-warn">Check</span>}
              </button>);
          })}
        </div>
      </section>
      {sel && <CheckPanel c={sel} approve={approve} onClose={() => setSel(null)} onDone={() => { list.mutate(); setSel(null); }} />}
    </div>
  );
}

function CheckPanel({ c, approve, onClose, onDone }: { c: Check; approve: boolean; onClose: () => void; onDone: () => void }) {
  const dues = useApi<Dues>(`/students/${c.student_id}/demands`);
  const { run, busy } = useAction();
  const [query, setQuery] = useState(false);
  const ready = c.status === 'Confirmed';
  return (
    <>
      <Drawer open onClose={onClose} title={titleCase(c.full_name)} subtitle={`${c.registration_no} · ${c.student_id} · ${c.programme}`}
        footer={approve && c.fee_check_status !== 'Verified' ? <div className="klh-row"><Button variant="primary" icon="check" loading={busy} blockedReason={!ready ? 'Some fees are still due.' : undefined} onClick={() => run(() => api(`/registrations/${c.registration_id}/fee-check`, { method: 'POST', json: { decision: 'Verified' } }).then(onDone), 'Fees verified; ready to check in')}>Verify fees</Button><Button variant="secondary" icon="alert" onClick={() => setQuery(true)}>Raise a query</Button></div> : undefined}>
        <div className="klh-stack" style={{ gap: 16 }}>
          <div className="facts">
            <div><span>Demanded</span><b>{formatINR(c.amount_due)}</b></div>
            <div><span>Received</span><b>{formatINR(c.amount_paid)}</b></div>
            <div><span>Bed</span><b>{c.subspace_id ? bedText(c.subspace_id) : '—'}</b></div>
          </div>
          {c.fee_check_status === 'Query' && <Notice tone="critical" title="Query raised">{c.fee_check_remarks}</Notice>}
          {c.fee_check_status === 'Verified' && <Notice tone="success" title="Verified">By {titleCase(c.fee_checked_by)} on {formatDateTime(c.fee_checked_on)}.</Notice>}
          <div>
            <p className="klh-overline" style={{ marginBottom: 6 }}>Demands</p>
            <div className="bedlist">
              {(dues.data?.demands ?? []).map((d) => <div key={d.demand_id}><span style={{ flex: 1 }}>{words(d.fee_head)}{d.fee_head === 'Hostel' ? `, instalment ${d.instalment_no}` : ''} <small>due {formatDate(d.due_date)}</small></span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(d.amount_due)}</span><StatusChip status={d.status} /></div>)}
              {dues.data && !dues.data.demands.length && <div><small>No demands</small></div>}
            </div>
          </div>
          <div>
            <p className="klh-overline" style={{ marginBottom: 6 }}>Receipts</p>
            <div className="bedlist">
              {(dues.data?.receipts ?? []).map((r) => <div key={r.receipt_id}><span style={{ flex: 1, minWidth: 0 }}><span className="klh-code">{r.receipt_no}</span> <small>{words(r.fee_head)} · {r.payment_mode}{r.gateway_ref ? ` · ${r.gateway_ref}` : ''} · {formatDateTime(r.paid_on)}</small></span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(r.amount)}</b></div>)}
              {dues.data && !dues.data.receipts.length && <div><small>No receipts</small></div>}
            </div>
          </div>
        </div>
      </Drawer>
      <ConfirmDialog open={query} title="Raise a query on these fees?" body="The student and the accounts desk see your note. Check-in stays closed until the fees are verified." confirmLabel="Raise query" tone="danger" requireRemarks remarksLabel="What does not match?"
        onCancel={() => setQuery(false)} onConfirm={(r) => { setQuery(false); run(() => api(`/registrations/${c.registration_id}/fee-check`, { method: 'POST', json: { decision: 'Query', remarks: r } }).then(onDone), 'Query raised'); }} />
    </>
  );
}
