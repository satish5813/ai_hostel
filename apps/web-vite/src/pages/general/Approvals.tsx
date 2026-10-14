import { useState } from 'react';
import { ApprovalTrail, Button, Card, ConfirmDialog, DataTable, Drawer, EmptyState, FilterChip, Notice, Person, StatCard, StatusChip, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, titleCase, useAction, useApi, useSession, words } from '@/lib/ui';
import { roleDef } from '@/app/screens';

export type Item = { decision?: string; decided_on?: string | null; remarks?: string | null; step_id: number; request_type: string; request_id: number; level: number; approver_role: string; full_name: string; student_id: string; programme: string; summary: string; from_at: string; to_at: string; hostel_name: string; floor_name: string; room_code: string; created_at: string };
export type Trail = { level: number; approver_role: string; decision: string; acted_by: string | null; acted_by_name: string | null; acted_by_contact_name: string | null; decided_on: string | null; remarks: string | null }[];

/**
 * GEN-03 My approvals: everything waiting for this person's decision, across request types.
 * Rules shown on screen: levels in order (the API only lists the lowest pending level), nobody approves their own request,
 * a rejection needs a reason (ConfirmDialog with remarks).
 */
// inbox rows carry decision 'Pending'; only a real decision makes the drawer read-only
const decided = (i: Item) => !!i.decision && i.decision !== 'Pending';

export default function Approvals({ only }: { only?: string }) {
  const s = useSession();
  const inbox = useApi<Item[]>(s ? '/approvals/inbox' : null);
  const done = useApi<Item[]>(s ? '/approvals/decided' : null); // what this person already decided; opens in the same drawer, read-only
  const [type, setType] = useState(only ?? '');
  const [sel, setSel] = useState<Item | null>(null);
  const trail = useApi<Trail>(sel ? `/approvals/${sel.request_type}/${sel.request_id}` : null);
  const proof = useApi<{ photo: string; mime: string; amount: number; paid_on: string; reference: string | null; dues: number | null; ocr_status: string; ocr_checks: { check: string; expected: string; found: string | null; ok: boolean | null }[] | null; demands: { fee_head: string; instalment_no: number | null; balance: number; status: string }[] }>(sel?.request_type === 'Payment_Proof' ? `/payment-proofs/${sel.request_id}` : null);
  const [reject, setReject] = useState<Item | null>(null);
  const { run, busy } = useAction();
  const decide = (i: Item, decision: 'Approved' | 'Rejected', remarks?: string) => run(() => api(`/approvals/${i.step_id}/decide`, { method: 'POST', json: { decision, remarks } }).then(() => { inbox.mutate(); setSel(null); }), `${words(i.request_type)} for ${titleCase(i.full_name)} ${decision.toLowerCase()}`);
  const rows = (inbox.data ?? []).filter((i) => !type || i.request_type === type);
  const types = [...new Set((inbox.data ?? []).map((i) => i.request_type))];
  const def = s ? roleDef(s.role) : undefined;
  const levelNote = (i: Item) => i.request_type === 'Payment_Proof' ? (i.level === 1 ? 'Level 1: Floor Manager checks the receipt against the portal' : 'Level 2: Chief Manager approves the payment (final: receipts are issued, the registration moves on)') : i.request_type === 'Outpass' ? (i.level === 1 ? 'Level 1: Floor Manager' : 'Level 2: Chief Manager (final: issues the QR pass)') : i.request_type === 'Sick_Leave' ? (i.level === 1 ? 'Level 1: Floor Manager recommends after the in-person visit' : 'Level 2: Chief Manager cross-checks and approves') : `Level ${i.level}`;
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      {!only && <ScreenHeader code="GEN-03" subtitle={`Requests waiting at your level. ${def?.code === 'FW' ? 'Every request goes on to the Chief Manager after you.' : def?.code === 'CW' ? 'Your decision is final for a same-day outing and for sick leave.' : ''}`} />}
      <div className="klh-grid-3">
        <StatCard color="violet" icon="inbox" label="Waiting for you" value={String(inbox.data?.length ?? 0)} sub={inbox.data?.length ? `oldest ${formatDateTime(inbox.data[0].created_at)}` : 'inbox is clear'} />
        {types.map((t) => <StatCard key={t} color={t === 'Outpass' ? 'violet' : t === 'Sick_Leave' ? 'rose' : 'brand'} icon={t === 'Outpass' ? 'door' : t === 'Sick_Leave' ? 'heart' : 'logout'} label={words(t)} value={String(inbox.data?.filter((i) => i.request_type === t).length ?? 0)} onClick={() => setType(type === t ? '' : t)} />)}
      </div>
      <Card padding={0}>
        <DataTable caption="Requests waiting for your decision" rowKey="step_id" rows={rows} loading={!inbox.data} searchable searchPlaceholder="Search student or ID" onRowClick={(r) => setSel(r as Item)} selectedKey={sel?.step_id}
          filters={!only && types.length > 1 ? <div className="klh-row"><FilterChip label="All" count={inbox.data?.length} selected={!type} onClick={() => setType('')} />{types.map((t) => <FilterChip key={t} label={words(t)} selected={type === t} onClick={() => setType(type === t ? '' : t)} />)}</div> : undefined}
          empty={<EmptyState icon="inbox" title="Nothing waiting for you" body="Requests arrive here once the earlier levels have decided." />}
          columns={[
            { key: 'request_type', label: 'Request', render: (v: string) => <StatusChip status={v} tone="info" /> },
            { key: 'full_name', label: 'Student', render: (v: string, r: Item) => <Person name={titleCase(v)} sub={`${r.student_id} · ${r.hostel_name ?? ''} ${r.room_code ?? ''}`} /> },
            { key: 'summary', label: 'Details' },
            { key: 'from_at', label: 'From', render: (v: string) => formatDateTime(v) },
            { key: 'to_at', label: 'To', render: (v: string) => (v ? formatDateTime(v) : '—') },
            { key: 'level', label: 'Level', align: 'right' },
          ]} />
      </Card>
      {!only && (done.data?.length ?? 0) > 0 && <Card padding={0}>
        <DataTable caption="Decided by you" rowKey="step_id" rows={done.data ?? []} searchable searchPlaceholder="Search student or ID" onRowClick={(r) => setSel(r as Item)} selectedKey={sel?.step_id}
          columns={[
            { key: 'request_type', label: 'Request', render: (v: string) => <StatusChip status={v} tone="info" /> },
            { key: 'full_name', label: 'Student', render: (v: string, r: Item) => <Person name={titleCase(v)} sub={`${r.student_id} · ${r.hostel_name ?? ''} ${r.room_code ?? ''}`} /> },
            { key: 'summary', label: 'Details' },
            { key: 'decision', label: 'Your decision', render: (v: string) => <StatusChip status={v} /> },
            { key: 'decided_on', label: 'When', render: (v: string | null) => (v ? formatDateTime(v) : '—') },
            { key: 'level', label: 'Level', align: 'right' },
          ]} />
      </Card>}
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? `${words(sel.request_type)} · ${titleCase(sel.full_name)}` : ''} subtitle={sel ? `${sel.student_id} · ${sel.programme} · ${sel.hostel_name ?? ''} ${sel.room_code ?? ''}` : undefined}
        footer={sel && !decided(sel) && <div className="klh-row" style={{ justifyContent: 'flex-end' }}><Button variant="danger" onClick={() => setReject(sel)}>Reject</Button><Button variant="primary" icon="check" loading={busy} onClick={() => decide(sel, 'Approved')}>Approve</Button></div>}>
        {sel && (
          <div className="klh-stack" style={{ gap: 20 }}>
            <dl className="klh-dl"><dt>Details</dt><dd>{sel.summary}</dd><dt>From</dt><dd>{formatDateTime(sel.from_at)}</dd>{sel.to_at && <><dt>To</dt><dd>{formatDateTime(sel.to_at)}</dd></>}<dt>Applied</dt><dd>{formatDateTime(sel.created_at)}</dd><dt>Your level</dt><dd>{levelNote(sel)}</dd></dl>
            {sel.request_type === 'Payment_Proof' && proof.data && (
              <div className="klh-stack" style={{ gap: 12 }}>
                <p className="klh-overline">The receipt</p>
                {proof.data.mime === 'application/pdf'
                  ? <><iframe title="Receipt PDF" src={proof.data.photo} style={{ width: '100%', height: 420, border: '1px solid var(--klh-line, #DCE5E4)', borderRadius: 12 }} /><a href={proof.data.photo} target="_blank" rel="noreferrer">Open the PDF in a new tab</a></>
                  : <a href={proof.data.photo} target="_blank" rel="noreferrer"><img src={proof.data.photo} alt="Receipt uploaded by the student" style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 12, border: '1px solid var(--klh-line, #DCE5E4)' }} /></a>}
                <Notice tone={proof.data.ocr_status === 'Matched' ? 'success' : proof.data.ocr_status === 'Mismatch' ? 'critical' : 'info'} title={`System check: ${proof.data.ocr_status === 'Matched' ? 'the receipt matches what was claimed' : proof.data.ocr_status === 'Mismatch' ? 'something on the receipt differs' : proof.data.ocr_status === 'Unreadable' ? 'the receipt could not be read; check it by eye' : 'the receipt is being read'}`}>
                  {proof.data.ocr_checks && <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{proof.data.ocr_checks.map((c) => <li key={c.check}>{c.ok === true ? '✓' : c.ok === false ? '✗' : '·'} {c.check}: expected {c.expected}{c.ok === false ? ` — not found on the receipt` : c.found && c.found !== c.expected ? ` — found ${c.found}` : ''}</li>)}</ul>}
                </Notice>
                <dl className="klh-dl"><dt>Amount on receipt</dt><dd>₹{proof.data.amount.toLocaleString('en-IN')}</dd><dt>Paid on</dt><dd>{proof.data.paid_on}</dd><dt>Reference</dt><dd>{proof.data.reference ?? '—'}</dd>
                  <dt>Fees it pays</dt><dd>{proof.data.demands.length ? proof.data.demands.map((d) => `${words(d.fee_head)}${d.instalment_no && d.fee_head === 'Hostel' ? ` part ${d.instalment_no}` : ''} ₹${d.balance.toLocaleString('en-IN')} (${words(d.status)})`).join(', ') : 'none: money for the wallet'}</dd>
                  {proof.data.dues != null && <><dt>Dues on those fees</dt><dd>₹{proof.data.dues.toLocaleString('en-IN')}{proof.data.amount > proof.data.dues ? ` · ₹${(proof.data.amount - proof.data.dues).toLocaleString('en-IN')} would go to the wallet` : proof.data.amount < proof.data.dues ? ' · less than the dues: part payment' : ''}</dd></>}</dl>
              </div>)}
            <div><p className="klh-overline">Approval trail</p>{trail.data && <ApprovalTrail entries={trail.data.map((t) => ({ level: t.level === 0 ? 'P' : t.level, role: words(t.approver_role), person: t.acted_by_name ?? t.acted_by_contact_name ?? undefined, decision: t.decision, at: t.decided_on ?? undefined, remarks: t.remarks ?? undefined }))} />}</div>
            {decided(sel) ? <Notice tone={sel.decision === 'Approved' ? 'success' : 'neutral'} title={`You ${sel.decision!.toLowerCase()} this${sel.decided_on ? ` on ${formatDateTime(sel.decided_on)}` : ''}`}>{sel.remarks ?? 'No remarks.'}</Notice>
              : <Notice tone="info" title="Levels in order">The Approve button shows only because every earlier level is done. A rejection ends the request; the student and parent are told.</Notice>}
          </div>)}
      </Drawer>
      <ConfirmDialog open={!!reject} title={`Reject ${words(reject?.request_type)} for ${titleCase(reject?.full_name)}?`} tone="danger" confirmLabel="Reject" requireRemarks remarksLabel="Reason (the student sees this)" onCancel={() => setReject(null)} onConfirm={(remarks) => { const i = reject!; setReject(null); decide(i, 'Rejected', remarks); }} />
    </div>
  );
}
