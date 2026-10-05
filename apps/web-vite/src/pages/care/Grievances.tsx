import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button, Drawer, Field, SegmentedControl, StatCard, Textarea } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, toast, useApi, useSession } from '@/lib/ui';

export type Grievance = { grievance_id: number; student_id?: string; student_name?: string; bed_label?: string | null; hostel_name?: string | null; category: string; description: string;
  is_confidential: boolean; status: string; raised_at: string; action_taken: string | null; closed_at: string | null; assigned_name: string | null };
export const CAT: Record<string, string> = { Room_Mate: 'Room-mate', Discipline: 'Discipline', Mess: 'Mess', Staff_Conduct: 'Staff conduct', Ragging: 'Ragging', Safety: 'Safety', Other: 'Other' };
export const GSTATUS: Record<string, { label: string; tone: string }> = { Open: { label: 'Open', tone: 'warn' }, In_Review: { label: 'Being looked into', tone: 'warn' },
  Escalated: { label: 'With the Chief Warden', tone: 'bad' }, Closed: { label: 'Closed', tone: 'good' } };
const when = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const HEADS = ['Chief_Warden', 'Director_Hostels', 'Dean_Students_Affairs', 'admin'];

/**
 * TKT-06 Grievances that are not repairs: room-mates, staff conduct, discipline, ragging, safety. Wardens take them up
 * and close them with what was done; anything serious goes to the Chief Warden. Ragging and safety complaints, and any
 * the student marks confidential, are seen only by the Chief Warden and the Dean.
 */
export default function Grievances() {
  const [show, setShow] = useState<'open' | ''>('open');
  const r = useApi<{ rows: Grievance[]; counts: { open: number; in_review: number; escalated: number; closed_30: number } }>(`/grievances${show ? '?status=open' : ''}`);
  const [open, setOpen] = useState<Grievance | null>(null);
  const d = r.data;
  return (
    <div className="klh-stack mo" style={{ gap: 16 }}>
      <ScreenHeader code="TKT-06" subtitle="Students' grievances that are not repairs: take them up, close them with what was done, or send them to the Chief Warden." />
      {d && (
        <div className="klh-grid-4">
          <StatCard color="amber" icon="inbox" label="New" value={String(d.counts.open)} sub="Not yet taken up" />
          <StatCard color="indigo" icon="eye" label="Being looked into" value={String(d.counts.in_review)} sub="Taken up by a warden" />
          <StatCard color="rose" icon="alert" label="With the Chief Warden" value={String(d.counts.escalated)} sub="Escalated" />
          <StatCard color="brand" icon="check" label="Closed" value={String(d.counts.closed_30)} sub="Last 30 days" />
        </div>)}
      <section className="box rd-bar"><SegmentedControl label="Show" value={show} onChange={(v) => setShow(v as typeof show)} options={[{ value: 'open', label: 'Not closed' }, { value: '', label: 'All' }]} /></section>
      {d && !d.rows.length && <div className="box mm-empty"><b>Nothing here</b><p>No grievance is waiting.</p></div>}
      <div className="mo-list">{d?.rows.map((g) => { const st = GSTATUS[g.status]; return (
        <button key={g.grievance_id} type="button" className={`box mo-card ${['Ragging', 'Safety'].includes(g.category) ? 'mo-serious' : ''}`} onClick={() => setOpen(g)}>
          <span className="mo-when"><b>{CAT[g.category]}</b><small>{when(g.raised_at)}</small></span>
          <span className="mo-text">{g.description}<small>{g.student_name} · {g.bed_label ?? g.student_id}{g.is_confidential ? ' · confidential' : ''}{g.assigned_name ? ` · with ${g.assigned_name}` : ''}</small></span>
          <span className={`xd-pill xd-t-${st?.tone ?? 'warn'}`}>{g.is_confidential && <Lock size={11} />} {st?.label ?? g.status}</span>
        </button>); })}</div>
      {open && <ActDrawer g={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); r.mutate(); }} />}
    </div>
  );
}

function ActDrawer({ g, onClose, onDone }: { g: Grievance; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState(g.action_taken ?? '');
  const [busy, setBusy] = useState(false);
  const head = HEADS.includes(useSession()?.role ?? '');
  const act = async (status: 'In_Review' | 'Escalated' | 'Closed') => {
    setBusy(true);
    try { await api(`/grievances/${g.grievance_id}/act`, { method: 'POST', json: { status, action_taken: text || null } }); toast(GSTATUS[status].label); onDone(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  const closed = g.status === 'Closed';
  return (
    <Drawer open onClose={onClose} title={`${CAT[g.category]} · ${g.student_name}`} subtitle={`${g.bed_label ?? g.student_id} · raised ${when(g.raised_at)}${g.is_confidential ? ' · confidential' : ''}`}
      footer={closed ? undefined : <div className="klh-row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <Button variant="primary" icon="check" loading={busy} blockedReason={!text.trim() ? 'Say what was done.' : undefined} onClick={() => act('Closed')}>Close</Button>
        {g.status === 'Open' && <Button variant="secondary" loading={busy} onClick={() => act('In_Review')}>Take it up</Button>}
        {!head && g.status !== 'Escalated' && <Button variant="secondary" loading={busy} onClick={() => act('Escalated')}>Send to the Chief Warden</Button>}</div>}>
      <div className="klh-stack" style={{ gap: 14 }}>
        <p className="mo-quote">“{g.description}”</p>
        {closed ? <div className="mo-reply"><b>Closed{g.assigned_name ? ` by ${g.assigned_name}` : ''}</b><p>{g.action_taken}</p></div>
          : <Field label="What was done" hint="The student is told when it is closed."><Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} /></Field>}
      </div>
    </Drawer>
  );
}
