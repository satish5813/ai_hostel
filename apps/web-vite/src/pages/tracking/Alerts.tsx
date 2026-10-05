import { useState } from 'react';
import { Button, Card, Checkbox, DataTable, Drawer, EmptyState, FilterChip, Notice, Person, StatCard, StatusChip, Textarea, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, titleCase, useAction, useApi, useSession, words } from '@/lib/ui';
import { can } from '@/app/screens';

type Alert = { alert_id: number; alert_type: string; student_id: string | null; student_name: string | null; facility_id: string | null; severity: string; raised_at: string; status: string; assigned_to: string | null; parent_informed: boolean | null; acknowledged_at: string | null; action_taken: string | null; related_type: string | null; related_id: number | null };

/** TRK-03 Alerts: no pass, overdue, not seen, missed register and others. Acknowledge, record the action taken, close. */
export default function Alerts() {
  const s = useSession()!;
  const edits = can(s.role, 'TRK-03', 'E');
  const [status, setStatus] = useState('Open');
  const list = useApi<Alert[]>(`/alerts${status ? `?status=${status}` : ''}`);
  const [sel, setSel] = useState<Alert | null>(null);
  const [action, setAction] = useState('');
  const [parent, setParent] = useState(false);
  const { run, busy } = useAction();
  const critical = list.data?.filter((a) => a.severity === 'Critical').length ?? 0;
  const byType = (list.data ?? []).reduce<Record<string, number>>((m, a) => ({ ...m, [a.alert_type]: (m[a.alert_type] ?? 0) + 1 }), {});
  const update = (a: Alert, st: 'Acknowledged' | 'Closed') => run(() => api(`/alerts/${a.alert_id}`, { method: 'POST', json: { status: st, action_taken: action || undefined, parent_informed: parent } }).then(() => { list.mutate(); setSel(null); }), st === 'Closed' ? 'Alert closed' : 'Acknowledged; you are now acting on it');
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="TRK-03" subtitle="Raised by the gate (no pass, overdue), the night register (not seen), the fee desk, the meters and the mess. Alerts in your scope only." />
      <div className="klh-grid-4">
        <StatCard color="sky" icon="alert" label={`${status || 'All'} alerts`} value={String(list.data?.length ?? 0)} />
        <StatCard color="rose" icon="alert" label="Critical" value={String(critical)} tone={critical ? 'critical' : undefined} />
        <StatCard color="violet" icon="door" label="No pass or overdue" value={String((byType.No_Pass_Exit ?? 0) + (byType.Pass_Overdue ?? 0))} />
        <StatCard color="orange" icon="clock" label="Not seen" value={String(byType.Not_Seen ?? 0)} />
      </div>
      <Card padding={0}>
        <DataTable caption="Alerts" rowKey="alert_id" rows={list.data ?? []} loading={!list.data} searchable onRowClick={(r) => { setSel(r as Alert); setAction((r as Alert).action_taken ?? ''); setParent(!!(r as Alert).parent_informed); }} selectedKey={sel?.alert_id}
          filters={<div className="klh-row">{['Open', 'Acknowledged', 'Closed', ''].map((st) => <FilterChip key={st || 'all'} label={st || 'All'} selected={status === st} onClick={() => setStatus(st)} />)}</div>}
          empty={<EmptyState icon="shield" title="All quiet" body="Alerts raised by the gate, the meters and the fee desk appear here." />}
          columns={[
            { key: 'severity', label: 'Severity', render: (v: string) => <StatusChip status={v} /> },
            { key: 'alert_type', label: 'Alert', render: (v: string) => words(v) },
            { key: 'student_name', label: 'Student', render: (v: string | null, r: Alert) => (v ? <Person name={titleCase(v)} sub={r.student_id ?? ''} /> : '—') },
            { key: 'raised_at', label: 'Raised', render: (v: string) => formatDateTime(v) },
            { key: 'assigned_to', label: 'For', render: (v: string | null) => (v ? words(v) : '—') },
            { key: 'status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
          ]} />
      </Card>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? words(sel.alert_type) : ''} subtitle={sel ? `${sel.student_name ? `${titleCase(sel.student_name)} · ${sel.student_id} · ` : ''}raised ${formatDateTime(sel.raised_at)}` : undefined}
        footer={sel && edits && sel.status !== 'Closed' && <div className="klh-row" style={{ justifyContent: 'flex-end' }}>{sel.status === 'Open' && <Button variant="secondary" loading={busy} onClick={() => update(sel, 'Acknowledged')}>Acknowledge</Button>}<Button variant="primary" icon="check" loading={busy} blockedReason={!action ? 'Record the action taken before closing.' : undefined} onClick={() => update(sel, 'Closed')}>Close alert</Button></div>}>
        {sel && (
          <div className="klh-stack" style={{ gap: 16 }}>
            <dl className="klh-dl"><dt>Severity</dt><dd><StatusChip status={sel.severity} /></dd><dt>Status</dt><dd><StatusChip status={sel.status} /></dd><dt>For</dt><dd>{sel.assigned_to ? words(sel.assigned_to) : '—'}</dd>{sel.acknowledged_at && <><dt>Acknowledged</dt><dd>{formatDateTime(sel.acknowledged_at)}</dd></>}{sel.related_type && <><dt>Related</dt><dd>{sel.related_type} {sel.related_id}</dd></>}</dl>
            {edits && sel.status !== 'Closed' ? (<>
              <Textarea rows={3} value={action} onChange={(e) => setAction(e.target.value)} placeholder="What did you do? (e.g. called the student; parent informed; found in the library)" />
              <Checkbox label="Parent informed" checked={parent} onChange={setParent} />
              {sel.student_id && <Notice tone="info" title="Need to know where the student is?">Use TRK-02 Student look-up with purpose Alert and this alert's ID {sel.alert_id}.</Notice>}
            </>) : <Notice tone={sel.status === 'Closed' ? 'success' : 'info'} title={sel.status === 'Closed' ? 'Closed' : 'View only'}>{sel.action_taken ?? 'No action recorded.'}</Notice>}
          </div>)}
      </Drawer>
    </div>
  );
}
