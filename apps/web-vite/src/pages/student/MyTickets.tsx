import { useEffect, useState } from 'react';
import { BedDouble, Building2, CheckCircle2, Clock, RotateCcw, Utensils, Wrench, XCircle, type LucideIcon } from 'lucide-react';
import { Button } from '@/lib/klh';
import { api } from '@/lib/api';
import { toast, useApi } from '@/lib/ui';

export type Item = { item_code: string; area: 'Room' | 'Mess' | 'Common'; category_name: string; label: string; hint: string | null; priority: string; sla_hours: number };
export type TicketEvent = { action: string; event_at: string; note: string | null; by: string | null };
export type Ticket = { ticket_id: number; area: string; item_label: string | null; category_name: string; description: string; location_note: string | null; priority: string; status: string;
  hostel_code: string | null; space_code: string | null; raised_by_name: string | null; raiser_type: string; raised_by: string; raised_date: string; deadline_at: string | null; closure_due_at: string | null; l1_decision: string | null;
  l1_remarks: string | null; l1_by_name: string | null; assigned_name: string | null; closure_report: string | null; student_confirmed: boolean | null; late: boolean; events: TicketEvent[] };
type Mine = { stay: { bed_label: string; hostel_code: string; mess_name: string | null } | null; items: Item[]; tickets: Ticket[] };

const AREAS: { k: Item['area']; label: string; icon: LucideIcon; sub: string }[] = [
  { k: 'Room', label: 'My room', icon: BedDouble, sub: 'Furniture, fan, lights, tap, toilet' },
  { k: 'Mess', label: 'Mess', icon: Utensils, sub: 'Food, hygiene, water, dining hall' },
  { k: 'Common', label: 'Common facility', icon: Building2, sub: 'Lift, corridor lights, reading room, activity room' },
];
export const ACTION: Record<string, string> = { Raised: 'Reported', Verified: 'Checked: genuine', Rejected: 'Checked: not genuine', Escalated: 'Sent for repair', Started: 'Repair started',
  Closure_Report: 'Repair done', Confirmed: 'Confirmed by student', Auto_Closed: 'Closed automatically', Assigned: 'Assigned' };
export const STATUS: Record<string, { label: string; tone: string }> = {
  Open: { label: 'Waiting to be checked', tone: 'warn' }, Assigned: { label: 'Sent for repair', tone: 'warn' }, In_Progress: { label: 'Being repaired', tone: 'warn' },
  Resolved: { label: 'Repaired: please confirm', tone: 'info' }, Closed: { label: 'Closed', tone: 'good' }, Reopened: { label: 'Reopened', tone: 'bad' },
};
export const when = (s: string) => new Date(s).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/**
 * TKT-01 My tickets. A student reports something wrong in their room, the mess or a common facility, follows it
 * through the warden's check and the repair, and confirms when it is fixed (or reopens it).
 */
export default function MyTickets() {
  const r = useApi<Mine>('/me/tickets');
  const d = r.data;
  const [area, setArea] = useState<Item['area'] | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [text, setText] = useState('');
  const [where, setWhere] = useState('');
  const [busy, setBusy] = useState(false);
  // arriving from the home page: start at the top, with the form in view
  useEffect(() => { window.scrollTo(0, 0); document.querySelector('.tk')?.scrollIntoView({ block: 'start' }); }, [d == null]);
  if (!d) return <div className="st"><p className="st-empty">Loading…</p></div>;
  if (!d.stay) return <div className="st"><section className="st-panel"><h2>My tickets</h2><p className="st-empty">You can raise repair tickets once you live in a hostel.</p></section></div>;
  const open = d.tickets.filter((t) => t.status !== 'Closed');
  const reset = () => { setArea(null); setItem(null); setText(''); setWhere(''); };
  const submit = async () => {
    setBusy(true);
    try {
      const t = await api<{ ticket_id: number }>('/me/tickets', { method: 'POST', json: { item_code: item!.item_code, description: text, location_note: where || null } });
      toast(`Ticket ${t.ticket_id} raised; the ${item!.area === 'Mess' ? 'mess in-charge' : 'floor warden'} will check it`); reset(); r.mutate();
    } catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  return (
    <div className="st tk">
      <section className="st-panel mn-head">
        <div className="mn-title"><span className="st-ico mn-ico"><Wrench size={20} /></span><span><h1>My tickets</h1><small>{d.stay.bed_label}{d.stay.mess_name ? ` · ${d.stay.mess_name}` : ''}</small></span></div>
        <div className="mn-chips"><span>{open.length} open</span><span>{d.tickets.length - open.length} closed</span></div>
      </section>

      <section className="st-panel tk-new" aria-label="Report a problem">
        <h2>Report a problem</h2>
        <div className="tk-areas" role="radiogroup" aria-label="Where">{AREAS.map((a) => (
          <button key={a.k} type="button" role="radio" aria-checked={area === a.k} onClick={() => { setArea(a.k); setItem(null); }}>
            <a.icon size={20} /><b>{a.label}</b><small>{a.sub}</small></button>))}</div>
        {area && (
          <>
            <span className="st-label">What is wrong?</span>
            <div className="tk-items">{d.items.filter((i) => i.area === area).map((i) => (
              <button key={i.item_code} type="button" aria-pressed={item?.item_code === i.item_code} onClick={() => setItem(i)}><b>{i.label}</b>{i.hint && <small>{i.hint}</small>}</button>))}</div>
          </>)}
        {item && (
          <div className="tk-form">
            {area === 'Common' && <label className="tk-field">Where is it?<input value={where} maxLength={120} onChange={(e) => setWhere(e.target.value)} placeholder="2nd floor corridor, east wing" /></label>}
            <label className="tk-field">Describe the problem<textarea rows={3} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} placeholder="What happens, since when" /></label>
            <p className="st-note"><Clock size={14} />{item.category_name}: usually fixed within {item.sla_hours < 24 ? `${item.sla_hours} hours` : `${Math.round(item.sla_hours / 24)} day${item.sla_hours >= 48 ? 's' : ''}`} once checked.</p>
            <div className="tk-acts">
              <Button variant="primary" loading={busy} blockedReason={text.trim().length < 5 ? 'Describe the problem.' : area === 'Common' && !where.trim() ? 'Say where it is.' : undefined} onClick={submit}>Raise ticket</Button>
              <Button variant="ghost" onClick={reset}>Cancel</Button>
            </div>
          </div>)}
      </section>

      {d.tickets.map((t) => <TicketCard key={t.ticket_id} t={t} onChange={() => r.mutate()} />)}
      {!d.tickets.length && <p className="st-empty">You have not raised any tickets.</p>}
    </div>
  );
}

function TicketCard({ t, onChange }: { t: Ticket; onChange: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const st = STATUS[t.status] ?? { label: t.status, tone: 'warn' };
  const confirm = async (fixed: boolean) => {
    setBusy(true);
    try { await api(`/me/tickets/${t.ticket_id}/confirm`, { method: 'POST', json: { fixed, note: note || null } }); toast(fixed ? 'Thank you; ticket closed' : 'Reopened; the repairers have been told'); onChange(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  return (
    <section className="st-panel tk-card" aria-label={`Ticket ${t.ticket_id}`}>
      <div className="tk-head">
        <span><b>{t.item_label ?? t.category_name}</b><small>#{t.ticket_id} · {t.area === 'Room' ? `Room ${t.space_code ?? ''}` : t.area === 'Mess' ? 'Mess' : t.location_note} · {when(t.raised_date)}</small></span>
        <span className={`xd-pill xd-t-${st.tone === 'info' ? 'warn' : st.tone}`}>{st.label}</span>
      </div>
      <p className="tk-desc">{t.description}</p>
      {t.late && <p className="tk-late"><Clock size={13} />Past the time allowed to fix it.</p>}
      <ol className="tk-time">{t.events.map((e, i) => (
        <li key={i} className={e.action === 'Rejected' || (e.action === 'Confirmed' && e.note?.startsWith('Not fixed')) ? 'tk-bad' : e.action === 'Confirmed' || e.action === 'Closure_Report' ? 'tk-good' : ''}>
          <b>{ACTION[e.action] ?? e.action}</b><small>{when(e.event_at)}{e.by ? ` · ${e.by}` : ''}</small>{e.note && <span>{e.note}</span>}</li>))}</ol>
      {t.status === 'Resolved' && (
        <div className="tk-confirm">
          <span className="st-label">Is it fixed?</span>
          <input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Anything to add (optional)" />
          <div className="tk-acts">
            <Button variant="primary" icon="check" loading={busy} onClick={() => confirm(true)}>Yes, it is fixed</Button>
            <Button variant="secondary" loading={busy} onClick={() => confirm(false)}>No, still not fixed</Button>
          </div>
        </div>)}
      {t.status === 'Closed' && t.l1_decision === 'Not_Genuine' && <p className="tk-note"><XCircle size={14} />Closed after checking{t.l1_remarks ? `: ${t.l1_remarks}` : ''}. Raise it again if the problem comes back.</p>}
      {t.status === 'Closed' && t.student_confirmed && <p className="tk-note tk-ok"><CheckCircle2 size={14} />You confirmed the repair.</p>}
      {t.status === 'Reopened' && <p className="tk-note"><RotateCcw size={14} />Reopened; the repairers have 24 hours.</p>}
    </section>
  );
}
