import { ApprovalTrail, Button, Card, EmptyState, StatusChip, formatDateTime } from '@/lib/klh';
import { ScreenHeader, words } from '@/lib/ui';
import { useOuting } from './OutingLauncher';
import { LIVE_PASS, PENDING_PASS, type Step } from './OutingSheet';

const trailEntry = (st: Step) => ({ level: st.level === 0 ? 'P' : st.level, role: words(st.role), person: st.by, decision: st.decision, at: st.on, remarks: st.remarks });

/**
 * OUT-01 My outings. Ask permission is always here; the request goes to the parent (link), then the Chief Warden, and
 * for a day or more also the Dean, Students Affairs. The QR gate pass appears only once the request is approved.
 */
export default function Outings() {
  const o = useOuting();
  const list = o.passes.data;
  const open = list?.filter((x) => [...LIVE_PASS, ...PENDING_PASS].includes(x.status)) ?? [];
  const past = list?.filter((x) => ['Returned', 'Rejected', 'Cancelled'].includes(x.status)) ?? [];
  return (
    <div className="klh-stack" style={{ gap: 20 }}>
      <ScreenHeader code="OUT-01" compact subtitle="Write why you need to go. Your parent recommends, the Chief Warden approves (and the Dean for a day or more). Your QR gate pass appears only after approval." />

      <div className="st-ask-strip">
        <button type="button" className="st-cta st-cta-solid" onClick={o.ask}>Ask for outing permission</button>
        <small>{o.live ? `You have ${o.live.outpass_no} (${words(o.live.status).toLowerCase()}). One outing at a time.` : o.pending ? `${o.pending.outpass_no} is waiting for approval.` : 'No outing open. You can ask now.'}</small>
      </div>

      {open.map((x) => (
        <Card key={x.outpass_id} icon={LIVE_PASS.includes(x.status) ? 'qr' : 'door'} color="violet" title={x.destination} subtitle={`${x.outpass_no} · ${formatDateTime(x.leave_from)} to ${formatDateTime(x.return_by)} · ${x.reason}`}
          action={<div className="klh-row"><StatusChip status={x.status} /><Button size="sm" variant="secondary" onClick={o.show}>{LIVE_PASS.includes(x.status) ? 'Show pass' : 'See status'}</Button></div>}>
          <ApprovalTrail entries={x.steps.map(trailEntry)} />
        </Card>))}

      <Card icon="clock" color="violet" title="Past outings" padding={0}>
        {!list ? null : past.length === 0 ? <EmptyState icon="door" title="No past outings" body="Returned, rejected and cancelled passes appear here." /> : (
          <table className="klh-table"><thead><tr><th>Pass</th><th>Destination</th><th>Left</th><th>Back by</th><th>Status</th></tr></thead>
            <tbody>{past.map((x) => <tr key={x.outpass_id}><td className="klh-code">{x.outpass_no}</td><td>{x.destination}</td><td>{formatDateTime(x.leave_from)}</td><td>{formatDateTime(x.return_by)}</td><td><StatusChip status={x.status} /></td></tr>)}</tbody></table>)}
      </Card>
      {o.sheet}
    </div>
  );
}
