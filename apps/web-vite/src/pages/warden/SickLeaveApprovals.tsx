import { useState } from 'react';
import { Button, Card, DataTable, Drawer, EmptyState, Field, FilterChip, Input, Person, StatCard, StatusChip, Tabs, Textarea, formatDate } from '@/lib/klh';
import { api } from '@/lib/api';
import Approvals from '@/pages/general/Approvals';
import { ScreenHeader, titleCase, toast, useApi, useSession, words } from '@/lib/ui';
import { DIET, STEP_ROLE, type Diet } from './sickDiet';

type Leave = { sick_leave_id: number; student_id: string; full_name: string; hostel_name: string; room_code: string; illness_details: string; from_date: string; to_date: string; status: string;
  visited_by: string | null; visit_remarks: string | null; room_meals_required: boolean; diet: Diet; diet_note: string | null; waiting_for: string | null };
const DIET_ROLES = ['Floor_Warden', 'Warden', 'Hostel_Incharge', 'Chief_Warden', 'Director_Hostels'];

/**
 * SCK-02 Sick leave approvals. The Floor Manager visits the student, records what they found, chooses the food to send
 * (light, liquid or normal) and approves; the building in-charge (Warden) approves next, and meals go to the room.
 * Where a floor has no Floor Manager, or the hostel no Warden, the Chief Manager takes that step.
 */
export default function SickLeaveApprovals() {
  const s = useSession()!;
  const visits = ['Floor_Warden', 'Chief_Warden', 'Director_Hostels'].includes(s.role);
  const [tab, setTab] = useState(visits ? 'visit' : 'decide');
  const [status, setStatus] = useState('');
  const list = useApi<Leave[]>(`/sick-leaves${status ? `?status=${status}` : ''}`);
  const [visit, setVisit] = useState<Leave | null>(null);
  const [diet, setDiet] = useState<Leave | null>(null);
  const toVisit = (list.data ?? []).filter((l) => l.status === 'Applied' && !l.visited_by);
  const counts = (list.data ?? []).reduce<Record<string, number>>((m, l) => ({ ...m, [l.status]: (m[l.status] ?? 0) + 1 }), {});
  const canDiet = DIET_ROLES.includes(s.role);
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="SCK-02" subtitle={visits ? 'Visit the student in the room, record what you found and choose the food to send; then approve. The building in-charge approves next.'
        : 'The Floor Manager has visited and chosen the food; approve to send meals to the room.'} />
      <div className="klh-grid-4">
        <StatCard color="rose" icon="heart" label="On sick leave now" value={String(counts.Approved ?? 0)} />
        {visits && <StatCard color="orange" icon="pin" label="Waiting for a visit" value={String(toVisit.length)} tone={toVisit.length ? 'warning' : undefined} onClick={() => setTab('visit')} />}
        <StatCard color="violet" icon="inbox" label="In approval" value={String((counts.Applied ?? 0) + (counts.Recommended ?? 0))} />
        <StatCard color="brand" icon="check" label="Closed" value={String(counts.Closed ?? 0)} />
      </div>
      <Tabs label="Sick leave" tabs={[...(visits ? [{ id: 'visit', label: 'Visits to make', count: toVisit.length }] : []), { id: 'decide', label: 'Waiting for my approval' }, { id: 'all', label: 'All sick leave', count: list.data?.length }]} value={tab} onChange={setTab} />
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
          <DataTable caption="Sick leave" rowKey="sick_leave_id" rows={list.data ?? []} loading={!list.data} searchable onRowClick={canDiet ? (r) => { const l = r as Leave; if (['Applied', 'Recommended', 'Approved'].includes(l.status)) setDiet(l); } : undefined}
            filters={<div className="klh-row" style={{ flexWrap: 'wrap' }}><FilterChip label="All" selected={!status} onClick={() => setStatus('')} />{['Applied', 'Recommended', 'Approved', 'Rejected', 'Closed'].map((st) => <FilterChip key={st} label={words(st)} selected={status === st} onClick={() => setStatus(status === st ? '' : st)} />)}</div>}
            empty={<EmptyState icon="heart" title="No sick leave reported" />}
            columns={[
              { key: 'full_name', label: 'Student', render: (v: string, r: Leave) => <Person name={titleCase(v)} sub={`${r.student_id} · ${r.hostel_name ?? ''} ${r.room_code ?? ''}`} /> },
              { key: 'illness_details', label: 'Reported' },
              { key: 'from_date', label: 'Dates', render: (v: string, r: Leave) => `${formatDate(v)} – ${formatDate(r.to_date)}` },
              { key: 'diet', label: 'Food to room', render: (v: Diet, r: Leave) => <span className={`xd-pill xd-t-${DIET[v]?.tone ?? 'warn'}`} title={r.diet_note ?? DIET[v]?.menu}>{DIET[v]?.label ?? v}</span> },
              { key: 'status', label: 'Status', render: (v: string, r: Leave) => <span className="klh-stack" style={{ gap: 2 }}><StatusChip status={v} />{r.waiting_for && <small className="klh-muted">With the {STEP_ROLE[r.waiting_for] ?? words(r.waiting_for)}</small>}</span> },
            ]} />
        </Card>)}
      {visit && <VisitDrawer l={visit} onClose={() => setVisit(null)} onDone={() => { setVisit(null); list.mutate(); setTab('decide'); }} />}
      {diet && <DietDrawer l={diet} onClose={() => setDiet(null)} onDone={() => { setDiet(null); list.mutate(); }} />}
    </div>
  );
}

function DietChoice({ value, onChange }: { value: Diet; onChange: (d: Diet) => void }) {
  return (
    <div className="klh-stack" style={{ gap: 8 }} role="radiogroup" aria-label="Food to the room">
      {(Object.keys(DIET) as Diet[]).map((d) => (
        <label key={d} className="klh-row" style={{ gap: 10, alignItems: 'flex-start', padding: '10px 12px', border: '1px solid var(--line, #E4E8EF)', borderRadius: 12, cursor: 'pointer', background: value === d ? 'var(--brand-tint, #E6F4F1)' : undefined }}>
          <input type="radio" name="diet" checked={value === d} onChange={() => onChange(d)} style={{ marginTop: 4 }} />
          <span><b>{DIET[d].label}</b><br /><small className="klh-muted">{DIET[d].menu}</small></span>
        </label>))}
    </div>
  );
}

function VisitDrawer({ l, onClose, onDone }: { l: Leave; onClose: () => void; onDone: () => void }) {
  const [remarks, setRemarks] = useState('');
  const [diet, setDiet] = useState<Diet>('Light');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api(`/sick-leaves/${l.sick_leave_id}/visit`, { method: 'POST', json: { visit_remarks: remarks, diet, diet_note: note || null } }); toast('Visit recorded. Approve it in "Waiting for my approval".'); onDone(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  return (
    <Drawer open onClose={onClose} title={`Visit to ${titleCase(l.full_name)}`} subtitle={`${l.illness_details} · ${formatDate(l.from_date)} to ${formatDate(l.to_date)} · room ${l.room_code ?? ''}`}
      footer={<Button variant="primary" icon="check" loading={busy} blockedReason={remarks.trim().length < 3 ? 'Write what you found.' : undefined} onClick={save}>Save visit</Button>}>
      <div className="klh-stack" style={{ gap: 16 }}>
        <Field label="What did you find?" required><Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="For example: temperature 101 °F, resting; seen by the campus doctor." /></Field>
        <Field label="Food to send to the room"><DietChoice value={diet} onChange={setDiet} /></Field>
        <Field label="Note for the kitchen" hint="No spice, no milk, what the doctor said"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Drawer>
  );
}

function DietDrawer({ l, onClose, onDone }: { l: Leave; onClose: () => void; onDone: () => void }) {
  const [diet, setDiet] = useState<Diet>(l.diet ?? 'Light');
  const [note, setNote] = useState(l.diet_note ?? '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api(`/sick-leaves/${l.sick_leave_id}/diet`, { method: 'POST', json: { diet, diet_note: note || null } }); toast(`Food changed to ${DIET[diet].label.toLowerCase()} from the next meal`); onDone(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  return (
    <Drawer open onClose={onClose} title={`Food for ${titleCase(l.full_name)}`} subtitle="Meals not yet served follow the change; the kitchen sees it on its sick list."
      footer={<Button variant="primary" icon="check" loading={busy} blockedReason={diet === l.diet && note === (l.diet_note ?? '') ? 'Nothing changed.' : undefined} onClick={save}>Save</Button>}>
      <div className="klh-stack" style={{ gap: 16 }}>
        <DietChoice value={diet} onChange={setDiet} />
        <Field label="Note for the kitchen"><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Drawer>
  );
}
