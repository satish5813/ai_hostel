import { useState } from 'react';
import { AlertTriangle, CheckCircle2, MessageSquareReply } from 'lucide-react';
import { Button, Drawer, Field, SegmentedControl, StatCard, Textarea } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, toast, useApi, useSession } from '@/lib/ui';
import { day, mealName, useMess } from './shared';

type G = { feedback_id: number; meal_date: string; slot: string; aspect: string; rating: number | null; details: string; status: string; submitted_at: string;
  action_taken: string | null; action_by_name: string | null; student_id: string; student_name: string; bed_label: string | null };
type Day = { meal_date: string; slot: string; students: number; strength: number; main_aspect: string | null; open: number; significant: boolean;
  raised_to_management_at: string | null; action_summary: string | null; summary_status: string | null };
const HEADS = ['Mess_Incharge', 'Mess_Manager', 'Chief_Warden', 'Director_Hostels', 'admin'];

/**
 * MES-03 Grievance desk. Students' complaints about a meal, newest open first; the Mess In-charge replies (the student
 * is told) and closes them. A meal that 5 students or a tenth of the mess complain about is significant and is raised
 * to management with what is being done.
 */
export default function GrievanceDesk() {
  const { mess, picker } = useMess();
  const [show, setShow] = useState<'Open' | ''>('Open');
  const r = useApi<{ grievances: G[]; days: Day[] }>(mess ? `/mess-ops/grievances?mess_id=${mess.mess_id}${show ? `&status=${show}` : ''}` : null);
  const [open, setOpen] = useState<G | null>(null);
  const [raise, setRaise] = useState<Day | null>(null);
  const role = useSession()?.role ?? '';
  const canAct = HEADS.includes(role);
  const d = r.data;
  const sig = (d?.days ?? []).filter((x) => x.significant);
  return (
    <div className="klh-stack mo" style={{ gap: 16 }}>
      <ScreenHeader code="MES-03" subtitle="Students' complaints about meals: reply, record what was done, and raise a meal many students complained about to management." actions={picker} />
      {d && (
        <div className="klh-grid-4">
          <StatCard color="amber" icon="inbox" label="Open complaints" value={String(d.grievances.filter((g) => g.status === 'Open').length)} sub="Waiting for a reply" />
          <StatCard color="rose" icon="alert" label="Significant meals" value={String(sig.length)} sub="Last 30 days" tone={sig.some((x) => !x.raised_to_management_at) ? 'warning' : undefined} />
          <StatCard color="indigo" icon="users" label="Meals complained about" value={String(d.days.length)} sub="Last 30 days" />
          <StatCard color="brand" icon="check" label="Raised to management" value={String(sig.filter((x) => x.raised_to_management_at).length)} sub="With action recorded" />
        </div>)}
      {sig.length > 0 && (
        <section className="box mo-sig">
          <h3><AlertTriangle size={17} />Significant meals</h3>
          <p className="mo-muted">A meal is significant when 5 students or a tenth of the mess complain about it.</p>
          <ul>{sig.map((x) => (
            <li key={x.meal_date + x.slot}>
              <span><b>{mealName(x.slot)}, {day(x.meal_date)}</b><small>{x.students} of {x.strength} students · mostly {x.main_aspect?.toLowerCase()} · {x.open} open</small>
                {x.action_summary && <small className="mo-done"><CheckCircle2 size={13} /> {x.action_summary}</small>}</span>
              {canAct && <Button size="sm" variant={x.raised_to_management_at ? 'secondary' : 'primary'} onClick={() => setRaise(x)}>{x.raised_to_management_at ? 'Update action' : 'Raise to management'}</Button>}
            </li>))}</ul>
        </section>)}
      <section className="box rd-bar"><SegmentedControl label="Show" value={show} onChange={(v) => setShow(v as 'Open' | '')} options={[{ value: 'Open', label: 'Open' }, { value: '', label: 'All' }]} /></section>
      {d && !d.grievances.length && <div className="box mm-empty"><b>No complaints here</b><p>Nothing is waiting for a reply.</p></div>}
      <div className="mo-list">{d?.grievances.map((g) => (
        <button key={g.feedback_id} type="button" className="box mo-card" onClick={() => setOpen(g)}>
          <span className="mo-when"><b>{mealName(g.slot)}</b><small>{day(g.meal_date)}</small></span>
          <span className="mo-text">{g.details}<small>{g.student_name} · {g.bed_label ?? g.student_id} · {g.aspect.toLowerCase()}{g.rating ? ` · rated ${g.rating}/5` : ''}</small></span>
          <span className={`xd-pill xd-t-${g.status === 'Open' ? 'warn' : g.status === 'Closed' ? 'good' : 'warn'}`}>{g.status === 'Replied' ? 'Replied' : g.status}</span>
        </button>))}</div>
      {open && <ReplyDrawer g={open} canAct={canAct} onClose={() => setOpen(null)} onDone={() => { setOpen(null); r.mutate(); }} />}
      {raise && mess && <RaiseDrawer messId={mess.mess_id} d={raise} onClose={() => setRaise(null)} onDone={() => { setRaise(null); r.mutate(); }} />}
    </div>
  );
}

function ReplyDrawer({ g, canAct, onClose, onDone }: { g: G; canAct: boolean; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState(g.action_taken ?? '');
  const [busy, setBusy] = useState(false);
  const send = async (close: boolean) => {
    setBusy(true);
    try { await api(`/mess-ops/grievances/${g.feedback_id}/reply`, { method: 'POST', json: { action_taken: text, close } }); toast(close ? 'Replied and closed' : 'Reply sent'); onDone(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  const blocked = text.trim().length < 5 ? 'Write the reply.' : undefined;
  return (
    <Drawer open onClose={onClose} title={`${mealName(g.slot)}, ${day(g.meal_date)}`} subtitle={`${g.student_name} · ${g.bed_label ?? g.student_id}`}
      footer={canAct && g.status !== 'Closed' ? <div className="klh-row" style={{ gap: 8 }}>
        <Button variant="primary" icon="check" loading={busy} blockedReason={blocked} onClick={() => send(true)}>Reply and close</Button>
        <Button variant="secondary" loading={busy} blockedReason={blocked} onClick={() => send(false)}>Reply, keep open</Button></div> : undefined}>
      <div className="klh-stack" style={{ gap: 14 }}>
        <p className="mo-quote">“{g.details}”</p>
        <p className="mo-muted">{g.aspect === 'Both' ? 'Quality and quantity' : g.aspect}{g.rating ? ` · rated ${g.rating} of 5` : ''} · sent {new Date(g.submitted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        {canAct && g.status !== 'Closed'
          ? <Field label={<><MessageSquareReply size={14} /> Reply to the student</>} hint="Say what happened and what the mess has done. The student sees this."><Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} /></Field>
          : g.action_taken && <div className="mo-reply"><b>Reply{g.action_by_name ? ` from ${g.action_by_name}` : ''}</b><p>{g.action_taken}</p></div>}
      </div>
    </Drawer>
  );
}

function RaiseDrawer({ messId, d, onClose, onDone }: { messId: number; d: Day; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState(d.action_summary ?? '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api('/mess-ops/grievance-days/raise', { method: 'POST', json: { mess_id: messId, meal_date: d.meal_date, slot: d.slot, action_summary: text || null } }); toast('Raised to management'); onDone(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  return (
    <Drawer open onClose={onClose} title={`${mealName(d.slot)}, ${day(d.meal_date)}`} subtitle={`${d.students} of ${d.strength} students complained`}
      footer={<Button variant="primary" loading={busy} onClick={save}>{d.raised_to_management_at ? 'Save action' : 'Raise to management'}</Button>}>
      <Field label="What is being done" hint="The Chief Manager, the Dean and the management reports see this."><Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="For example: backup gas cylinder now kept; menu changes announced on the notice board." /></Field>
    </Drawer>
  );
}
