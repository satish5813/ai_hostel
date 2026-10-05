import { useState } from 'react';
import { ApprovalTrail, Button, Card, EmptyState, Field, Input, Notice, StatusChip, Textarea, formatDate } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, useAction, useApi, words } from '@/lib/ui';
import { DIET, STEP_ROLE, type Diet } from '@/pages/warden/sickDiet';

type Leave = { sick_leave_id: number; illness_details: string; from_date: string; to_date: string; status: string; visited_by: string | null; visit_remarks: string | null; room_meals_required: boolean; applied_on: string };
type Detail = Leave & { diet: Diet; diet_note: string | null; steps: { level: number; approver_role: string; decision: string; acted_by: string | null; acted_by_name?: string | null; decided_on: string | null; remarks: string | null }[]; deliveries: { meal_date: string; slot: string; status: string }[] };

/** The day after a date (an extension starts the day after the leave ends, so no meal is sent twice). */
const dayAfter = (d: string) => new Date(new Date(`${d.slice(0, 10)}T00:00:00Z`).getTime() + 864e5).toISOString().slice(0, 10);

/** SCK-01 My sick leave: apply for sick leave or an extension; own sick leaves. */
export default function SickLeave() {
  const list = useApi<Leave[]>('/sick-leaves/mine');
  const current = list.data?.find((l) => ['Applied', 'Recommended', 'Approved'].includes(l.status));
  const detail = useApi<Detail>(current ? `/sick-leaves/${current.sick_leave_id}` : null);
  const [f, setF] = useState({ illness_details: '', from_date: '', to_date: '' });
  const [extend, setExtend] = useState('');
  const { run, busy } = useAction();
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="SCK-01" compact subtitle="Your Floor Warden visits you first, then the building in-charge approves. Meals then come to your room, light food if you need it." />

      {current && detail.data ? (
        <Card icon="heart" color="rose" title={current.status === 'Approved' ? 'Approved sick leave' : 'Sick leave in progress'} subtitle={`${formatDate(current.from_date)} to ${formatDate(current.to_date)}`} action={<StatusChip status={current.status} />}>
          <p style={{ marginTop: 0 }}>{current.illness_details}</p>
          {current.status === 'Applied' && !current.visited_by && <Notice tone="info" title="Waiting for the Floor Warden's visit">Stay in your room; the Floor Warden comes to see you and decides what food to send.</Notice>}
          {current.visited_by && DIET[detail.data.diet] && <Notice tone="info" title={`Food to your room: ${DIET[detail.data.diet].label}`}>{DIET[detail.data.diet].menu}{detail.data.diet_note ? `. ${detail.data.diet_note}` : ''}</Notice>}
          {current.visited_by && <Notice tone="progress" title={`Visited by ${current.visited_by}`}>{current.visit_remarks}</Notice>}
          <div style={{ marginTop: 16 }}><ApprovalTrail entries={detail.data.steps.map((s) => ({ level: s.level, role: STEP_ROLE[s.approver_role] ?? words(s.approver_role), person: s.acted_by_name ?? s.acted_by ?? undefined, decision: s.decision, at: s.decided_on ?? undefined, remarks: s.remarks ?? undefined }))} /></div>
          {current.status === 'Approved' && (
            <div style={{ marginTop: 16 }}>
              <p className="klh-overline">Meals to your room</p>
              <div className="klh-row" style={{ flexWrap: 'wrap' }}>{detail.data.deliveries.map((d) => <StatusChip key={d.meal_date + d.slot} status={d.status} label={`${formatDate(d.meal_date)} ${words(d.slot)}: ${words(d.status)}`} />)}</div>
            </div>)}
          <div className="klh-row" style={{ marginTop: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Button variant="soft" icon="check" loading={busy} onClick={() => run(() => api(`/sick-leaves/${current.sick_leave_id}/close`, { method: 'POST', json: {} }).then(() => { list.mutate(); detail.mutate(); }), 'Glad you are better. Leave closed.')}>I am well now</Button>
            {current.status === 'Approved' && <form className="klh-row" style={{ alignItems: 'flex-end' }} onSubmit={(e) => { e.preventDefault(); run(() => api('/sick-leaves', { method: 'POST', json: { illness_details: `Extension: ${current.illness_details}`, from_date: dayAfter(current.to_date), to_date: extend, extended_from_id: current.sick_leave_id } }).then(() => { list.mutate(); setExtend(''); }), 'Extension requested. Your Floor Warden will visit again.'); }}>
              <Field label="Ask for an extension until"><Input type="date" value={extend} min={dayAfter(current.to_date)} onChange={(e) => setExtend(e.target.value)} /></Field>
              <Button type="submit" variant="secondary" blockedReason={!extend ? 'Pick the new end date.' : undefined} loading={busy}>Request extension</Button>
            </form>}
          </div>
        </Card>
      ) : (
        <Card icon="heart" color="rose" title="Report that you are unwell">
          <form className="klh-stack" style={{ gap: 20 }} onSubmit={(e) => { e.preventDefault(); run(() => api('/sick-leaves', { method: 'POST', json: f }).then(() => { list.mutate(); setF({ illness_details: '', from_date: '', to_date: '' }); }), 'Reported. Your Floor Warden will come and see you.'); }}>
            <Field label="What is wrong" required><Textarea rows={3} value={f.illness_details} onChange={(e) => setF({ ...f, illness_details: e.target.value })} required /></Field>
            <div className="klh-grid-2">
              <Field label="From" required><Input type="date" value={f.from_date} onChange={(e) => setF({ ...f, from_date: e.target.value })} required /></Field>
              <Field label="Until" required><Input type="date" value={f.to_date} onChange={(e) => setF({ ...f, to_date: e.target.value })} required /></Field>
            </div>
            <div><Button type="submit" variant="accent" pill size="lg" icon="heart" loading={busy}>Report sick leave</Button></div>
          </form>
        </Card>
      )}

      <Card icon="clock" color="rose" title="History" padding={0}>
        {!list.data ? null : list.data.filter((l) => !current || l.sick_leave_id !== current.sick_leave_id).length === 0 ? <EmptyState icon="heart" title="No sick leave on record" /> : (
          <table className="klh-table"><thead><tr><th>Dates</th><th>Details</th><th>Room meals</th><th>Status</th></tr></thead>
            <tbody>{list.data.filter((l) => !current || l.sick_leave_id !== current.sick_leave_id).map((l) => <tr key={l.sick_leave_id}><td>{formatDate(l.from_date)} – {formatDate(l.to_date)}</td><td>{l.illness_details}</td><td>{l.room_meals_required ? 'Yes' : '—'}</td><td><StatusChip status={l.status} /></td></tr>)}</tbody></table>)}
      </Card>
    </div>
  );
}
