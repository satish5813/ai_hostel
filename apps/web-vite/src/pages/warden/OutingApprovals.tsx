import { useState } from 'react';
import { ApprovalTrail, Button, Card, DataTable, Drawer, EmptyState, FilterChip, Notice, Person, StatCard, StatusChip, Tabs, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import Approvals from '@/pages/general/Approvals';
import { ScreenHeader, titleCase, useAction, useApi, useSession, words } from '@/lib/ui';

type Step = { level: number; role: string; decision: string; by?: string; on?: string; remarks?: string };
type Outpass = { outpass_id: number; outpass_no: string; student_id: string; full_name: string; reason: string; destination: string; leave_from: string; return_by: string; outing_category: string; levels_required: number; contact_during_leave: string; status: string; actual_out_at: string | null; actual_in_at: string | null; late_by_minutes: number | null; applied_on: string; steps: Step[] };

/** OUT-03 Outing approvals: level 1 Floor Manager, level 2 Chief Manager, who issues the QR pass (migration 122: no parent or Dean step). */
export default function OutingApprovals() {
  const [tab, setTab] = useState('decide');
  const [status, setStatus] = useState('');
  const list = useApi<Outpass[]>(`/outpasses${status ? `?status=${status}` : ''}`);
  const [sel, setSel] = useState<Outpass | null>(null);
  const counts = (list.data ?? []).reduce<Record<string, number>>((m, o) => ({ ...m, [o.status]: (m[o.status] ?? 0) + 1 }), {});
  const { run, busy } = useAction();
  const role = useSession()?.role;
  const waiting = sel?.steps.find((st) => st.decision === 'Pending');
  const byLink = waiting && (waiting.role === 'Parent' || waiting.role === 'Dean_Students_Affairs');
  const history = sel ? (list.data ?? []).filter((o) => o.student_id === sel.student_id && o.outpass_id !== sel.outpass_id) : [];
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="OUT-03" subtitle="The Floor Manager approves (level 1), then the Chief Manager (level 2). The QR gate pass is issued when the Chief Manager approves, for a same-day outing and for a day or more. The parent gets an SMS when the pass is issued." />
      <Tabs label="Outing approvals" tabs={[{ id: 'decide', label: 'Waiting for my decision' }, { id: 'all', label: 'All outings', count: list.data?.length }]} value={tab} onChange={setTab} />
      {tab === 'decide' && <Approvals only="Outpass" />}
      {tab === 'all' && (
        <>
          <div className="klh-grid-4">
            <StatCard color="violet" icon="door" label="Out now" value={String(counts.Out ?? 0)} />
            <StatCard color="rose" icon="alert" label="Overdue" value={String(counts.Overdue ?? 0)} tone={counts.Overdue ? 'critical' : undefined} />
            <StatCard color="brand" icon="check" label="Approved, not yet out" value={String(counts.Approved ?? 0)} />
            <StatCard color="sky" icon="clock" label="In approval" value={String((counts.Applied ?? 0) + (counts.Parent_Recommended ?? 0) + (counts.L1_Approved ?? 0) + (counts.L2_Approved ?? 0))} />
          </div>
          <Card padding={0}>
            <DataTable caption="Outings" rowKey="outpass_id" rows={list.data ?? []} loading={!list.data} searchable onRowClick={(r) => setSel(r as Outpass)} selectedKey={sel?.outpass_id}
              filters={<div className="klh-row" style={{ flexWrap: 'wrap' }}><FilterChip label="All" selected={!status} onClick={() => setStatus('')} />{['Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved', 'Approved', 'Out', 'Overdue', 'Returned', 'Rejected'].map((st) => <FilterChip key={st} label={words(st)} selected={status === st} onClick={() => setStatus(status === st ? '' : st)} />)}</div>}
              empty={<EmptyState icon="door" title="No outings" />}
              columns={[
                { key: 'outpass_no', label: 'Pass', render: (v: string) => <span className="klh-code">{v}</span> },
                { key: 'full_name', label: 'Student', render: (v: string, r: Outpass) => <Person name={titleCase(v)} sub={r.student_id} /> },
                { key: 'destination', label: 'Destination', render: (v: string, r: Outpass) => `${v} · ${r.reason}` },
                { key: 'leave_from', label: 'From', render: (v: string) => formatDateTime(v) },
                { key: 'return_by', label: 'Back by', render: (v: string, r: Outpass) => `${formatDateTime(v)}${r.late_by_minutes ? ` · ${r.late_by_minutes} min late` : ''}` },
                { key: 'outing_category', label: 'Category', render: (v: string) => <StatusChip status={v} /> },
                { key: 'status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
              ]} />
          </Card>
        </>)}
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? `${sel.outpass_no} · ${titleCase(sel.full_name)}` : ''} subtitle={sel ? `${sel.student_id} · ${sel.destination}` : undefined}>
        {sel && (
          <div className="klh-stack" style={{ gap: 16 }}>
            <dl className="klh-dl"><dt>Reason</dt><dd>{sel.reason}</dd><dt>From</dt><dd>{formatDateTime(sel.leave_from)}</dd><dt>Back by</dt><dd>{formatDateTime(sel.return_by)}</dd><dt>Category</dt><dd><StatusChip status={sel.outing_category} /> {sel.levels_required} levels</dd><dt>Contact during leave</dt><dd className="klh-num">{sel.contact_during_leave}</dd>{sel.actual_out_at && <><dt>Went out</dt><dd>{formatDateTime(sel.actual_out_at)}</dd></>}{sel.actual_in_at && <><dt>Came back</dt><dd>{formatDateTime(sel.actual_in_at)}</dd></>}<dt>Status</dt><dd><StatusChip status={sel.status} /></dd></dl>
            <div><p className="klh-overline">Approval trail</p><ApprovalTrail entries={sel.steps.filter((st) => st.decision !== 'Skipped').map((st) => ({ level: st.level === 0 ? 'P' : st.level, role: words(st.role), person: st.by, decision: st.decision, at: st.on, remarks: st.remarks }))} /></div>
            <div><p className="klh-overline">Outing history of this student</p>{history.length ? <table className="klh-table"><tbody>{history.slice(0, 8).map((o) => <tr key={o.outpass_id}><td className="klh-code">{o.outpass_no}</td><td>{o.destination}</td><td>{formatDateTime(o.leave_from)}</td><td><StatusChip status={o.status} />{o.late_by_minutes ? <span className="klh-muted"> {o.late_by_minutes} min late</span> : null}</td></tr>)}</tbody></table> : <p className="klh-muted">First outing this year.</p>}</div>
            {byLink && <Notice tone="info" title={waiting!.role === 'Parent' ? "Waiting for the parent's reply" : "Waiting for the Dean's approval"}>A one-time link was sent{waiting!.role === 'Parent' ? ' by SMS' : ' by e-mail'}. If it expired or was lost, send a new one.{role === 'Chief_Warden' && <div style={{ marginTop: 8 }}><Button size="sm" variant="secondary" loading={busy} onClick={() => run(() => api(`/outpasses/${sel.outpass_id}/resend-link`, { method: 'POST' }), 'New link sent')}>Send the link again</Button></div>}</Notice>}
            <Notice tone="info" title="Decide from the first tab">Decisions are taken in "Waiting for my decision" (GEN-03), where only requests at your level appear.</Notice>
          </div>)}
      </Drawer>
    </div>
  );
}
