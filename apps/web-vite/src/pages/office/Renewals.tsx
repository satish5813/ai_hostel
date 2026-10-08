import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Drawer, Field, Input, Notice, formatDate } from '@/lib/klh';
import { api } from '@/lib/api';
import { titleCase, useAction, useApi, useSession } from '@/lib/ui';
import { initials } from '@/ui/kit';
import { can } from '@/app/screens';

type Row = { registration_id: number; student_id: string; full_name: string; programme: string | null; next_year_intent: string | null; bed_label: string; facility_id: string; hostel_code: string; floor_name: string;
  next_registration_id: number | null; next_registration_no: string | null; next_status: string | null; fee_check_status: string | null; cw_status: string | null; keeps_room: boolean; next_bed: string | null; stage: string };
type Board = { next_year: string | null; continue_from: string | null; can_continue: boolean; summary: { residents: number; continued: number; ready: number; leaving: number; undecided: number; in_progress: number }; rows: Row[] };

const DONE = ['Continued', 'Ready to continue', 'Leaving', 'Not decided'];
const TABS: { id: string; label: string; test: (r: Row) => boolean }[] = [
  { id: 'ready', label: 'Ready to continue', test: (r) => r.stage === 'Ready to continue' },
  { id: 'progress', label: 'Renewing', test: (r) => !DONE.includes(r.stage) },
  { id: 'undecided', label: 'Not decided', test: (r) => r.stage === 'Not decided' },
  { id: 'leaving', label: 'Leaving', test: (r) => r.stage === 'Leaving' },
  { id: 'continued', label: 'Continued', test: (r) => r.stage === 'Continued' },
  { id: 'all', label: 'All residents', test: () => true },
];
const tone = (s: string) => (s === 'Continued' || s === 'Ready to continue' ? 'tag-ok' : s === 'Leaving' ? 'tag-bad' : s === 'Not decided' ? '' : 'tag-warn');

/**
 * REG-14 Yearly renewals. Every resident of this year and where they are with next year: renewing (and at which step),
 * leaving, or not decided. When a renewal is paid, fee-checked and approved, Room Allotment continues the stay into the
 * new year: the same bed and key carry on with no break, or the student moves to the bed they accepted.
 */
export default function Renewals() {
  const s = useSession()!;
  const doIt = can(s.role, 'REG-14', 'C') || can(s.role, 'REG-14', 'A');
  const hostels = useApi<{ facility_id: string; facility_name: string }[]>('/hostels');
  const [facility, setFacility] = useState('');
  const [tab, setTab] = useState('progress');
  const board = useApi<Board>(`/renewals${facility ? `?facility_id=${facility}` : ''}`);
  const [sel, setSel] = useState<Row | null>(null);
  const all = board.data?.rows ?? [];
  const t = TABS.find((x) => x.id === tab)!;
  const rows = all.filter(t.test);
  return (
    <div className="pg">
      <div className="pg-head">
        <div><p>{board.data?.next_year ? `Renewal for ${board.data.next_year}. Residents keep their bed, ask for another room or tell you they are leaving. ` : 'The next academic year is not set up yet. '}
          {board.data?.continue_from ? `Continue stay opens on ${formatDate(board.data.continue_from)}.` : ''}</p></div>
        <div className="pg-actions"><select className="dm-filter" aria-label="Hostel" value={facility} onChange={(e) => setFacility(e.target.value)}><option value="">All my hostels</option>{(hostels.data ?? []).map((h) => <option key={h.facility_id} value={h.facility_id}>{h.facility_name}</option>)}</select></div>
      </div>
      <div className="stg" role="group" aria-label="Stage">
        {TABS.map((x) => <button key={x.id} type="button" aria-pressed={tab === x.id} onClick={() => setTab(x.id)}><b>{board.data ? all.filter(x.test).length : ''}</b><span>{x.label}</span></button>)}
      </div>
      <section className="box">
        <div className="q">
          {!board.data && <div className="q-empty">Loading…</div>}
          {board.data && rows.length === 0 && <div className="q-empty">{tab === 'ready' ? 'Nobody is ready yet. A renewal is ready once it is paid, fee-checked and approved by the Chief Warden.' : 'Nobody here.'}</div>}
          {rows.map((r) => (
            <button key={r.registration_id} type="button" className="q-row" style={{ gridTemplateColumns: '34px minmax(0, 1.4fr) minmax(0, 1fr) auto' }} onClick={() => setSel(r)}>
              <span className="q-av">{initials(r.full_name)}</span>
              <span className="q-text"><b>{titleCase(r.full_name)}</b><span>{r.student_id}{r.programme ? ` · ${r.programme}` : ''}</span></span>
              <span className="q-text"><b>{r.bed_label}</b><span>{r.next_registration_no ? `${r.keeps_room ? 'Keeps this bed' : r.next_bed ? `Moves to ${r.next_bed}` : 'Asked for another room'} · ${r.next_registration_no}` : r.floor_name}</span></span>
              <span className={`tag ${tone(r.stage)}`}>{r.stage}</span>
            </button>))}
        </div>
      </section>
      {sel && <RenewalPanel r={sel} b={board.data!} doIt={doIt} onClose={() => setSel(null)} onDone={() => { board.mutate(); setSel(null); }} />}
    </div>
  );
}

function RenewalPanel({ r, b, doIt, onClose, onDone }: { r: Row; b: Board; doIt: boolean; onClose: () => void; onDone: () => void }) {
  const navigate = useNavigate();
  const { run, busy } = useAction();
  const [key, setKey] = useState('');
  const ready = r.stage === 'Ready to continue';
  const moving = ready && !r.keeps_room;
  const footer = ready && doIt
    ? <Button variant="primary" icon="check" loading={busy} blockedReason={!b.can_continue ? `Opens on ${formatDate(b.continue_from)}, before ${b.next_year} starts.` : moving && !key.trim() ? 'Give the key for the new room.' : undefined}
        onClick={() => run(() => api(`/registrations/${r.next_registration_id}/continue-stay`, { method: 'POST', json: key.trim() ? { key_no: key.trim() } : {} }).then(onDone), `${titleCase(r.full_name)} continues into ${b.next_year}`)}>Continue stay</Button>
    : r.stage === 'Fee check' ? <Button variant="secondary" onClick={() => navigate('/fee-checks')}>Open fee check</Button>
    : r.stage === 'Chief Warden' ? <Button variant="secondary" onClick={() => navigate('/allotment-approvals')}>Open approvals</Button>
    : undefined;
  return (
    <Drawer open onClose={onClose} title={titleCase(r.full_name)} subtitle={`${r.student_id}${r.programme ? ` · ${r.programme}` : ''}`} footer={footer}>
      <div className="klh-stack" style={{ gap: 16 }}>
        <div className="facts">
          <div><span>This year</span><b>{r.bed_label}</b></div>
          <div><span>{b.next_year ?? 'Next year'}</span><b>{r.stage === 'Leaving' ? 'Leaving' : r.keeps_room ? r.bed_label : r.next_bed ?? (r.next_registration_no ? 'Bed to be offered' : 'Not decided')}</b></div>
          <div><span>Stage</span><b>{r.stage}</b></div>
        </div>
        {r.next_registration_no && (
          <div className="facts">
            <div><span>Renewal</span><b>{r.next_registration_no}</b></div>
            <div><span>Fee check</span><b>{r.fee_check_status ?? '—'}</b></div>
            <div><span>Chief Warden</span><b>{r.cw_status ?? '—'}</b></div>
          </div>)}
        {r.stage === 'Not decided' && <Notice tone="info" title="No choice yet">The student sees a renewal card on their home page while the renewal window is open.</Notice>}
        {r.stage === 'Leaving' && <Notice tone="warning" title="Not staying next year">The bed is free for {b.next_year}. The student vacates through the usual vacating process at the end of the year.</Notice>}
        {ready && (r.keeps_room
          ? <Notice tone="success" title="Same bed, no break">The bed, key and meter carry on into {b.next_year}. Last year's mess subscription is closed and the new one starts.</Notice>
          : <><Notice tone="info" title="Room change">The student moves from {r.bed_label} to {r.next_bed}. Collect the old key and hand over the new one.</Notice>
              <Field label="Key for the new room" required><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="K-204-2" /></Field></>)}
      </div>
    </Drawer>
  );
}
