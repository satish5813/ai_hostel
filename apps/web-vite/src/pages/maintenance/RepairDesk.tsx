import { useState } from 'react';
import { Button, Drawer, Field, Input, SegmentedControl, StatCard, Textarea } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, toast, useApi, useSession } from '@/lib/ui';
import { ACTION, STATUS, when, type Ticket } from '@/pages/student/MyTickets';

type Desk = { counts: { to_verify: number; to_repair: number; awaiting_student: number; late: number }; tickets: Ticket[] };
const WARDENS = ['Floor_Warden', 'Warden', 'Assistant_Warden', 'Hostel_Incharge', 'Chief_Warden', 'Director_Hostels'];
const MESS = ['Mess_Incharge', 'Mess_Manager', 'Mess_Supervisor'];
const MAINT = ['Maintenance_Supervisor', 'Technician', 'Electrician'];
const AREA: Record<string, string> = { Room: 'Room', Mess: 'Mess', Common: 'Common facility' };
type Filter = 'check' | 'repair' | 'student' | 'all';

/**
 * TKT-03 Repair desk. Wardens check that students' room and common-facility tickets are genuine; the mess in-charge
 * checks and fixes mess tickets; maintenance starts the repair and files the closure report within the time the trade
 * allows. Each step is written to the ticket's history, which the student sees.
 */
export default function RepairDesk() {
  const s = useSession()!;
  const [show, setShow] = useState<'open' | 'all'>('open');
  const r = useApi<Desk>(`/repair-desk?show=${show}`);
  const [f, setF] = useState<Filter>(MAINT.includes(s.role) ? 'repair' : 'check');
  const [act, setAct] = useState<{ t: Ticket; kind: 'verify' | 'resolve' } | null>(null);
  const d = r.data;
  const isWarden = WARDENS.includes(s.role), isMess = MESS.includes(s.role), isMaint = MAINT.includes(s.role) || s.role === 'Chief_Warden';
  // students' tickets are checked first; tickets from floor rounds and inspections go straight to repair
  const toCheck = (t: Ticket) => t.status === 'Open' && !t.l1_decision && t.raiser_type === 'Student';
  const toRepair = (t: Ticket) => ['Assigned', 'In_Progress', 'Reopened'].includes(t.status) || (t.status === 'Open' && t.raiser_type !== 'Student');
  const list = (d?.tickets ?? []).filter((t) => f === 'all' ? true : f === 'check' ? toCheck(t) : f === 'repair' ? toRepair(t) : t.status === 'Resolved');
  const start = async (t: Ticket) => { try { await api(`/repair-desk/${t.ticket_id}/start`, { method: 'POST' }); toast('Repair started'); r.mutate(); } catch (e) { toast((e as Error).message, 'critical'); } };
  return (
    <div className="klh-stack rd" style={{ gap: 16 }}>
      <ScreenHeader code="TKT-03" subtitle={isMaint ? 'Verified tickets to repair, with the time allowed for each trade; file the closure report when done.'
        : isMess ? 'Mess tickets from students: check them, fix them and report what was done.' : "Students' tickets for rooms and common facilities in your hostels: check that each is genuine."} />
      {d && (
        <div className="klh-grid-4">
          <StatCard color="amber" icon="eye" label="To check" value={String(d.counts.to_verify)} sub="Raised, not yet checked" />
          <StatCard color="indigo" icon="settings" label="Being repaired" value={String(d.counts.to_repair)} sub="Verified, not yet done" />
          <StatCard color="brand" icon="check" label="Awaiting the student" value={String(d.counts.awaiting_student)} sub="Repaired; to be confirmed" />
          <StatCard color="rose" icon="alert" label="Late" value={String(d.counts.late)} sub="Past the time allowed" tone={d.counts.late ? 'critical' : undefined} />
        </div>)}
      <section className="box rd-bar">
        <SegmentedControl label="Show" value={f} onChange={(v) => setF(v as Filter)} options={[{ value: 'check', label: 'To check' }, { value: 'repair', label: 'Being repaired' }, { value: 'student', label: 'Awaiting student' }, { value: 'all', label: 'All' }]} />
        <SegmentedControl label="Closed tickets" value={show} onChange={(v) => setShow(v as 'open' | 'all')} options={[{ value: 'open', label: 'Recent' }, { value: 'all', label: 'Include old' }]} />
      </section>
      {!d && <div className="q-empty">Loading…</div>}
      {d && !list.length && <div className="box mm-empty"><b>Nothing here</b><p>No ticket is waiting in this list.</p></div>}
      <div className="rd-list">{list.map((t) => {
        const st = STATUS[t.status] ?? { label: t.status, tone: 'warn' };
        const canCheck = toCheck(t) && t.raised_by !== s.id && (t.area === 'Mess' ? isMess : isWarden);
        const canRepair = toRepair(t) && (t.area === 'Mess' ? isMess : isMaint);
        return (
          <article key={t.ticket_id} className={`box rd-card${t.late ? ' rd-late' : ''}`}>
            <header className="rd-head">
              <span className={`rd-pri rd-p-${t.priority.toLowerCase()}`}>{t.priority}</span>
              <span className="rd-title"><b>{t.item_label ?? t.category_name}</b><small>#{t.ticket_id} · {AREA[t.area] ?? 'Room'} · {t.hostel_code}{t.space_code ? ` ${t.space_code}` : ''}{t.location_note ? ` · ${t.location_note}` : ''}</small></span>
              <span className={`xd-pill xd-t-${st.tone === 'info' ? 'warn' : st.tone}`}>{st.label}</span>
            </header>
            <p className="rd-desc">{t.description}</p>
            <p className="rd-meta">{t.raised_by_name ?? 'Inspection'} · {when(t.raised_date)} · {t.category_name}
              {t.closure_due_at && ['Assigned', 'In_Progress', 'Reopened'].includes(t.status) && <> · <b className={t.late ? 'rd-red' : ''}>fix by {when(t.closure_due_at)}</b></>}
              {t.assigned_name && <> · with {t.assigned_name}</>}</p>
            <details className="rd-hist"><summary>History ({t.events.length})</summary>
              <ol className="tk-time">{t.events.map((e, i) => <li key={i}><b>{ACTION[e.action] ?? e.action}</b><small>{when(e.event_at)}{e.by ? ` · ${e.by}` : ''}</small>{e.note && <span>{e.note}</span>}</li>)}</ol></details>
            {(canCheck || canRepair) && (
              <div className="rd-acts">
                {canCheck && <Button variant="primary" size="sm" icon="check" onClick={() => setAct({ t, kind: 'verify' })}>Check ticket</Button>}
                {canRepair && t.status !== 'In_Progress' && <Button variant="secondary" size="sm" onClick={() => start(t)}>Start repair</Button>}
                {canRepair && <Button variant="primary" size="sm" onClick={() => setAct({ t, kind: 'resolve' })}>Repair done</Button>}
              </div>)}
          </article>);
      })}</div>
      {act?.kind === 'verify' && <VerifyForm t={act.t} onClose={() => setAct(null)} onDone={() => { setAct(null); r.mutate(); }} />}
      {act?.kind === 'resolve' && <ResolveForm t={act.t} onClose={() => setAct(null)} onDone={() => { setAct(null); r.mutate(); }} />}
    </div>
  );
}

function VerifyForm({ t, onClose, onDone }: { t: Ticket; onClose: () => void; onDone: () => void }) {
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (genuine: boolean) => {
    setBusy(true);
    try { await api(`/repair-desk/${t.ticket_id}/verify`, { method: 'POST', json: { genuine, remarks: remarks || null } }); toast(genuine ? 'Sent for repair' : 'Closed as not genuine; the student is told why'); onDone(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  return (
    <Drawer open onClose={onClose} title="Check the ticket" subtitle={`#${t.ticket_id} · ${t.item_label ?? t.category_name}`}
      footer={<div className="klh-row" style={{ gap: 8 }}>
        <Button variant="primary" loading={busy} onClick={() => go(true)}>Genuine: send for repair</Button>
        <Button variant="danger" loading={busy} blockedReason={!remarks.trim() ? 'Say why it is not genuine; the student sees it.' : undefined} onClick={() => go(false)}>Not genuine</Button></div>}>
      <div className="klh-stack" style={{ gap: 12 }}>
        <p className="rd-desc">{t.description}</p>
        <Field label="Remarks" hint="What you found. Needed when the ticket is not genuine."><Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
      </div>
    </Drawer>
  );
}

function ResolveForm({ t, onClose, onDone }: { t: Ticket; onClose: () => void; onDone: () => void }) {
  const [report, setReport] = useState('');
  const [cost, setCost] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await api(`/repair-desk/${t.ticket_id}/resolve`, { method: 'POST', json: { report, cost: cost ? Number(cost) : null } }); toast('Closure report filed; the student will confirm'); onDone(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  return (
    <Drawer open onClose={onClose} title="Closure report" subtitle={`#${t.ticket_id} · ${t.item_label ?? t.category_name}`}
      footer={<Button variant="primary" loading={busy} blockedReason={report.trim().length < 5 ? 'Say what was done.' : undefined} onClick={go}>File the report</Button>}>
      <div className="klh-stack" style={{ gap: 12 }}>
        <p className="rd-desc">{t.description}</p>
        <Field label="What was done"><Textarea rows={4} value={report} onChange={(e) => setReport(e.target.value)} placeholder="Replaced the regulator and capacitor; fan tested at all speeds" /></Field>
        <Field label="Cost of parts (₹)" hint="Optional"><Input type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
      </div>
    </Drawer>
  );
}
