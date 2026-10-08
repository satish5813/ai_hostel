import { useState } from 'react';
import { ApprovalTrail, Button, Card, ConfirmDialog, EmptyState, Notice, StatusChip, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, titleCase, useAction, useApi, useSession, words } from '@/lib/ui';

type Item = { step_id: number; request_id: number; full_name: string; student_id: string; summary: string; from_at: string; to_at: string; hostel_name: string; room_code: string };
type Outpass = { outpass_id: number; outpass_no: string; destination: string; reason: string; leave_from: string; return_by: string; status: string; steps: { level: number; role: string; decision: string; by?: string; on?: string; remarks?: string }[] };

/** OUT-02 Parent recommendation: recommend or decline the child's outing. The parent step is a recommendation only. */
export default function ParentRecommendation() {
  const s = useSession();
  const inbox = useApi<Item[]>(s ? '/approvals/inbox' : null);
  const history = useApi<Outpass[]>(s ? '/outpasses/mine' : null);
  const { run, busy } = useAction();
  const [refuse, setRefuse] = useState<Item | null>(null);
  const contactId = Number(s?.id.replace('contact:', ''));
  const decide = (i: Item, decision: 'Approved' | 'Rejected', remarks?: string) => run(() => api(`/approvals/${i.step_id}/parent`, { method: 'POST', json: { contact_id: contactId, decision, remarks } }).then(() => { inbox.mutate(); history.mutate(); }), decision === 'Approved' ? 'Recommended. The Floor Warden is next.' : 'Declined');
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="OUT-02" compact subtitle="Your recommendation goes to the Floor Warden and Chief Warden. You get an SMS when the pass is issued." />
      {inbox.data?.length === 0 && <Card padding={0}><EmptyState icon="door" title="Nothing to recommend right now" body="New outing requests from your child appear here." /></Card>}
      {inbox.data?.map((i) => (
        <Card key={i.step_id} icon="door" color="violet" title={`${titleCase(i.full_name)} wants to go to ${i.summary.split(' → ')[1] ?? i.summary}`} subtitle={`${i.summary.split(' → ')[0]} · ${i.hostel_name}, room ${i.room_code}`}>
          <dl className="klh-dl"><dt>Leaving</dt><dd>{formatDateTime(i.from_at)}</dd><dt>Back by</dt><dd>{formatDateTime(i.to_at)}</dd></dl>
          <div className="klh-row" style={{ marginTop: 16, gap: 12 }}>
            <Button variant="accent" pill size="lg" icon="check" loading={busy} onClick={() => decide(i, 'Approved')}>Yes, I recommend it</Button>
            <Button variant="danger" size="lg" onClick={() => setRefuse(i)}>No</Button>
          </div>
        </Card>))}
      <Notice tone="info" title="Recommendation, not approval">The hostel decides. You cannot approve on behalf of the hostel, and you do not see your child's live location.</Notice>
      <Card icon="clock" color="violet" title="Earlier outings" padding={0}>
        {!history.data ? null : history.data.length === 0 ? <EmptyState icon="door" title="No outings yet" /> : (
          <div className="klh-stack" style={{ gap: 0 }}>{history.data.slice(0, 10).map((o) => (
            <div key={o.outpass_id} style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
              <div className="klh-row" style={{ justifyContent: 'space-between' }}><div><b>{o.destination}</b> <span className="klh-muted">· {o.reason}</span><div className="klh-muted" style={{ fontSize: 13 }}>{o.outpass_no} · {formatDateTime(o.leave_from)} to {formatDateTime(o.return_by)}</div></div><StatusChip status={o.status} /></div>
              <div style={{ marginTop: 8 }}><ApprovalTrail entries={o.steps.map((st) => ({ level: st.level === 0 ? 'P' : st.level, role: words(st.role), person: st.by, decision: st.decision, at: st.on, remarks: st.remarks }))} /></div>
            </div>))}</div>)}
      </Card>
      <ConfirmDialog open={!!refuse} title="Decline this outing?" body="Your child and the wardens will see that you declined." tone="danger" confirmLabel="Decline" requireRemarks remarksLabel="Reason (shown to the wardens)" onCancel={() => setRefuse(null)} onConfirm={(remarks) => { const i = refuse!; setRefuse(null); decide(i, 'Rejected', remarks); }} />
    </div>
  );
}
