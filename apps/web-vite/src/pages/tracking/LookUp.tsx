import { useState } from 'react';
import { Avatar, Button, Card, EmptyState, Field, Input, Notice, Select, StatusChip, Timeline, formatDateTime } from '@/lib/klh';
import { api, ApiError } from '@/lib/api';
import { ScreenHeader, bedLabel, roomLabel, titleCase, useAction, words } from '@/lib/ui';
import type { Detail } from './StatusBoard';

const timeOnly = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/** TRK-02 Student look-up: where one student is now. Every look-up asks for a purpose and is written to the look-up log. */
export default function LookUp() {
  const [sid, setSid] = useState('');
  const [purpose, setPurpose] = useState('Routine');
  const [alertId, setAlertId] = useState('');
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState('');
  const { run, busy } = useAction();
  const look = () => run(async () => { setErr(''); try { setD(await api<Detail>(`/students/${sid.trim()}/location?purpose=${purpose}${alertId ? `&alert_id=${alertId}` : ''}`)); } catch (e) { setD(null); setErr(e instanceof ApiError ? e.message : String(e)); throw e; } }, 'Look-up recorded in the log');
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="TRK-02" subtitle="Students in your scope only. Your name, the purpose and the time are written to TRK-06 Look-up log, which the Chief Manager reviews." />
      <Card icon="search" color="sky" title="Look up a student">
        <form className="klh-row" style={{ alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }} onSubmit={(e) => { e.preventDefault(); look(); }}>
          <Field label="University ID" required><Input value={sid} onChange={(e) => setSid(e.target.value)} placeholder="2600040012" style={{ width: 200 }} autoFocus /></Field>
          <Field label="Purpose" required><Select value={purpose} onChange={(e) => setPurpose(e.target.value)} options={['Routine', 'Alert', 'Parent_Query', 'Emergency'].map((p) => ({ value: p, label: words(p) }))} /></Field>
          <Field label="Alert ID" visible={purpose === 'Alert'} hint="The alert you are acting on"><Input value={alertId} onChange={(e) => setAlertId(e.target.value)} style={{ width: 120 }} /></Field>
          <Button type="submit" variant="primary" icon="pin" loading={busy} blockedReason={!sid ? 'Enter the University ID.' : undefined}>Where is this student?</Button>
        </form>
      </Card>
      {err && <Notice tone="critical" title="Look-up refused">{err}</Notice>}
      {d && (
        <div className="klh-grid-2">
          <Card icon="user" color="sky" title={<span className="klh-row" style={{ gap: 12 }}><Avatar name={titleCase(d.full_name)} size="lg" />{titleCase(d.full_name)}</span>} subtitle={`${d.student_id} · ${d.programme}`} action={<StatusChip status={d.current_status} />}>
            <dl className="klh-dl"><dt>Room</dt><dd>{roomLabel(d.space_id)}-{bedLabel(d.subspace_id).slice(-1)}</dd><dt>Status now</dt><dd>{words(d.current_status)}</dd><dt>Last seen</dt><dd>{d.last_event_at ? `${formatDateTime(d.last_event_at)} · ${d.last_point} (${d.last_direction})` : 'Not seen yet'}</dd></dl>
          </Card>
          <Card icon="clock" color="sky" title="Recent movements" subtitle="Gate, hostel door and corridor events">
            {d.recent.length ? <Timeline items={d.recent.map((e) => ({ time: timeOnly(e.event_at), title: `${e.direction} · ${e.point_name}`, sub: `${e.source} · ${formatDateTime(e.event_at)}`, icon: e.direction === 'Out' ? 'logout' : e.point_type === 'Room_Corridor' ? 'bed' : 'login', tone: e.direction === 'Out' ? 'info' : 'success' }))} /> : <EmptyState icon="pin" title="No movements recorded" />}
          </Card>
        </div>)}
      <Notice tone="info" title="Why the purpose is asked">Location data is sensitive. The policy allows look-ups for routine checks, alerts, parent queries and emergencies; each one is reviewable.</Notice>
    </div>
  );
}
