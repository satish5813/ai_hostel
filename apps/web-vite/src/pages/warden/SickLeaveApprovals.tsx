import { useState } from 'react';
import { Button, Card, ConfirmDialog, DataTable, EmptyState, FilterChip, Notice, Person, StatCard, StatusChip, Tabs, formatDate } from '@/lib/klh';
import { api } from '@/lib/api';
import Approvals from '@/pages/general/Approvals';
import { ScreenHeader, titleCase, useAction, useApi, useSession, words } from '@/lib/ui';

type Leave = { sick_leave_id: number; student_id: string; full_name: string; hostel_name: string; room_code: string; illness_details: string; from_date: string; to_date: string; status: string; visited_by: string | null; visit_remarks: string | null; room_meals_required: boolean };

/** SCK-02 Sick leave approvals. The Floor Warden visits; the Chief Warden records that visit and approves (decision D4). */
export default function SickLeaveApprovals() {
  const s = useSession()!;
  const visits = s.role === 'Floor_Warden' || s.role === 'Chief_Warden';
  const cw = s.role === 'Chief_Warden';
  const [tab, setTab] = useState(visits ? 'visit' : 'decide');
  const [status, setStatus] = useState('');
  const list = useApi<Leave[]>(`/sick-leaves${status ? `?status=${status}` : ''}`);
  const [visit, setVisit] = useState<Leave | null>(null);
  const { run } = useAction();
  const toVisit = (list.data ?? []).filter((l) => l.status === 'Applied' && !l.visited_by);
  const counts = (list.data ?? []).reduce<Record<string, number>>((m, l) => ({ ...m, [l.status]: (m[l.status] ?? 0) + 1 }), {});
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="SCK-02" subtitle={cw ? 'The Floor Warden visits the student in the room. Record what they found, then approve or reject. Approved leave puts the student on the mess sick list.' : visits ? 'Visit the student in the room and record what you found. The Chief Warden approves.' : 'Approved leave puts the student on the mess sick list.'} />
      <div className="klh-grid-4">
        <StatCard color="rose" icon="heart" label="On sick leave now" value={String(counts.Approved ?? 0)} />
        {visits && <StatCard color="orange" icon="pin" label={cw ? 'Visit not recorded' : 'Waiting for your visit'} value={String(toVisit.length)} tone={toVisit.length ? 'warning' : undefined} onClick={() => setTab('visit')} />}
        <StatCard color="violet" icon="inbox" label="In approval" value={String((counts.Applied ?? 0) + (counts.Recommended ?? 0))} />
        <StatCard color="brand" icon="check" label="Closed this year" value={String(counts.Closed ?? 0)} />
      </div>
      <Tabs label="Sick leave" tabs={[...(visits ? [{ id: 'visit', label: cw ? 'Record the visit' : 'Visits to make', count: toVisit.length }] : []), { id: 'decide', label: 'Waiting for my decision' }, { id: 'all', label: 'All sick leave', count: list.data?.length }]} value={tab} onChange={setTab} />
      {tab === 'visit' && (
        <Card padding={0}>
          <DataTable caption="Students who reported sick and have not been visited" rowKey="sick_leave_id" rows={toVisit} loading={!list.data} onRowClick={(r) => setVisit(r as Leave)} empty={<EmptyState icon="heart" title="No visits pending" body="A student appears here the moment they report sick." />}
            columns={[
              { key: 'full_name', label: 'Student', render: (v: string, r: Leave) => <Person name={titleCase(v)} sub={`${r.student_id} · ${r.hostel_name ?? ''} ${r.room_code ?? ''}`} /> },
              { key: 'illness_details', label: 'Reported' },
              { key: 'from_date', label: 'Dates', render: (v: string, r: Leave) => `${formatDate(v)} – ${formatDate(r.to_date)}` },
              { key: 'status', label: '', render: () => <Button size="sm" variant="primary" icon="pin">Record visit</Button> },
            ]} />
        </Card>)}
      {tab === 'decide' && <Approvals only="Sick_Leave" />}
      {tab === 'all' && (
        <Card padding={0}>
          <DataTable caption="Sick leave" rowKey="sick_leave_id" rows={list.data ?? []} loading={!list.data} searchable
            filters={<div className="klh-row" style={{ flexWrap: 'wrap' }}><FilterChip label="All" selected={!status} onClick={() => setStatus('')} />{['Applied', 'Recommended', 'Approved', 'Rejected', 'Closed'].map((st) => <FilterChip key={st} label={words(st)} selected={status === st} onClick={() => setStatus(status === st ? '' : st)} />)}</div>}
            empty={<EmptyState icon="heart" title="No sick leave reported" />}
            columns={[
              { key: 'full_name', label: 'Student', render: (v: string, r: Leave) => <Person name={titleCase(v)} sub={`${r.student_id} · ${r.hostel_name ?? ''} ${r.room_code ?? ''}`} /> },
              { key: 'illness_details', label: 'Reported' },
              { key: 'from_date', label: 'Dates', render: (v: string, r: Leave) => `${formatDate(v)} – ${formatDate(r.to_date)}` },
              { key: 'visited_by', label: 'Visit', render: (v: string | null, r: Leave) => (v ? `${v}: ${r.visit_remarks}` : '—') },
              { key: 'room_meals_required', label: 'Room meals', render: (v: boolean) => (v ? 'Yes' : '—') },
              { key: 'status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
            ]} />
        </Card>)}
      {!visits && <Notice tone="info" title="Only the Chief Warden approves">The Floor Warden visits the student; the Chief Warden records the visit and decides.</Notice>}
      <ConfirmDialog open={!!visit} title={cw ? `Record the visit to ${titleCase(visit?.full_name)}` : `Record your visit to ${titleCase(visit?.full_name)}`} body={visit ? `${visit.illness_details} · ${formatDate(visit.from_date)} to ${formatDate(visit.to_date)} · room ${visit.room_code}` : undefined} tone="primary" confirmLabel="Save visit" requireRemarks remarksLabel={cw ? 'What did the Floor Warden find? (recorded as their visit, now)' : 'What did you find?'}
        onCancel={() => setVisit(null)} onConfirm={(remarks) => { const l = visit!; setVisit(null); run(() => api(`/sick-leaves/${l.sick_leave_id}/visit`, { method: 'POST', json: { visit_remarks: remarks } }).then(() => { list.mutate(); setTab('decide'); }), cw ? 'Visit recorded. Now approve or reject it.' : 'Visit recorded. The Chief Warden decides next.'); }} />
    </div>
  );
}
