import { useState } from 'react';
import { ApprovalTrail, Button, Card, ConfirmDialog, DataTable, Drawer, EmptyState, FilterChip, Notice, Person, StatCard, StatusChip, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, titleCase, useAction, useApi, useSession, words } from '@/lib/ui';
import { roleDef } from '@/app/screens';

export type Item = { step_id: number; request_type: string; request_id: number; level: number; approver_role: string; full_name: string; student_id: string; programme: string; summary: string; from_at: string; to_at: string; hostel_name: string; floor_name: string; room_code: string; created_at: string };
export type Trail = { level: number; approver_role: string; decision: string; acted_by: string | null; acted_by_name: string | null; acted_by_contact_name: string | null; decided_on: string | null; remarks: string | null }[];

/**
 * GEN-03 My approvals: everything waiting for this person's decision, across request types.
 * Rules shown on screen: levels in order (the API only lists the lowest pending level), nobody approves their own request,
 * a rejection needs a reason (ConfirmDialog with remarks).
 */
export default function Approvals({ only }: { only?: string }) {
  const s = useSession();
  const inbox = useApi<Item[]>(s ? '/approvals/inbox' : null);
  const [type, setType] = useState(only ?? '');
  const [sel, setSel] = useState<Item | null>(null);
  const trail = useApi<Trail>(sel ? `/approvals/${sel.request_type}/${sel.request_id}` : null);
  const [reject, setReject] = useState<Item | null>(null);
  const { run, busy } = useAction();
  const decide = (i: Item, decision: 'Approved' | 'Rejected', remarks?: string) => run(() => api(`/approvals/${i.step_id}/decide`, { method: 'POST', json: { decision, remarks } }).then(() => { inbox.mutate(); setSel(null); }), `${words(i.request_type)} for ${titleCase(i.full_name)} ${decision.toLowerCase()}`);
  const rows = (inbox.data ?? []).filter((i) => !type || i.request_type === type);
  const types = [...new Set((inbox.data ?? []).map((i) => i.request_type))];
  const def = s ? roleDef(s.role) : undefined;
  const levelNote = (i: Item) => i.request_type === 'Outpass' ? (i.level === 1 ? 'Level 1: Floor Warden' : i.level === 2 ? 'Level 2: Chief Warden (final for a same-day outing)' : 'Level 3: Dean, Students Affairs (outing of a day or more)') : i.request_type === 'Sick_Leave' ? (i.level === 1 ? 'Level 1: Floor Warden recommends after the in-person visit' : 'Level 2: Chief Warden cross-checks and approves') : `Level ${i.level}`;
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      {!only && <ScreenHeader code="GEN-03" subtitle={`Requests waiting at your level. ${def?.code === 'FW' ? 'Every request goes on to the Chief Warden after you.' : def?.code === 'CW' ? 'Your decision is final for a same-day outing and for sick leave.' : ''}`} />}
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
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? `${words(sel.request_type)} · ${titleCase(sel.full_name)}` : ''} subtitle={sel ? `${sel.student_id} · ${sel.programme} · ${sel.hostel_name ?? ''} ${sel.room_code ?? ''}` : undefined}
        footer={sel && <div className="klh-row" style={{ justifyContent: 'flex-end' }}><Button variant="danger" onClick={() => setReject(sel)}>Reject</Button><Button variant="primary" icon="check" loading={busy} onClick={() => decide(sel, 'Approved')}>Approve</Button></div>}>
        {sel && (
          <div className="klh-stack" style={{ gap: 20 }}>
            <dl className="klh-dl"><dt>Details</dt><dd>{sel.summary}</dd><dt>From</dt><dd>{formatDateTime(sel.from_at)}</dd>{sel.to_at && <><dt>To</dt><dd>{formatDateTime(sel.to_at)}</dd></>}<dt>Applied</dt><dd>{formatDateTime(sel.created_at)}</dd><dt>Your level</dt><dd>{levelNote(sel)}</dd></dl>
            <div><p className="klh-overline">Approval trail</p>{trail.data && <ApprovalTrail entries={trail.data.map((t) => ({ level: t.level === 0 ? 'P' : t.level, role: words(t.approver_role), person: t.acted_by_name ?? t.acted_by_contact_name ?? undefined, decision: t.decision, at: t.decided_on ?? undefined, remarks: t.remarks ?? undefined }))} />}</div>
            <Notice tone="info" title="Levels in order">The Approve button shows only because every earlier level is done. A rejection ends the request; the student and parent are told.</Notice>
          </div>)}
      </Drawer>
      <ConfirmDialog open={!!reject} title={`Reject ${words(reject?.request_type)} for ${titleCase(reject?.full_name)}?`} tone="danger" confirmLabel="Reject" requireRemarks remarksLabel="Reason (the student sees this)" onCancel={() => setReject(null)} onConfirm={(remarks) => { const i = reject!; setReject(null); decide(i, 'Rejected', remarks); }} />
    </div>
  );
}
