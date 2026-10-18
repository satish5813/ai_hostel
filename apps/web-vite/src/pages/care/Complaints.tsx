import { useState } from 'react';
import { Lock, MessageSquareWarning, Utensils } from 'lucide-react';
import { Button } from '@/lib/klh';
import { api } from '@/lib/api';
import { toast, useApi } from '@/lib/ui';
import { CAT, GSTATUS, type Grievance } from './Grievances';

type MessG = { feedback_id: number; meal_date: string; slot: string; aspect: string; rating: number | null; details: string; status: string; action_taken: string | null; action_by_name: string | null };
const MEALS = [['Breakfast', 'Breakfast'], ['Lunch', 'Lunch'], ['Evening_Snacks', 'Snacks'], ['Dinner', 'Dinner']] as const;
const todayIso = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const back = (n: number) => new Date(Date.now() + 330 * 60_000 - n * 864e5).toISOString().slice(0, 10);
const when = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/**
 * TKT-07 Complaints (student). A problem with a meal goes to the Mess In-charge; anything else that is not a repair
 * (room-mate, staff conduct, ragging, safety) goes to the wardens, or only to the Chief Manager and Dean when marked
 * confidential. Replies show here.
 */
export default function Complaints() {
  const mess = useApi<{ mess: { mess_name: string } | null; grievances: MessG[] }>('/me/mess-grievances');
  const mine = useApi<Grievance[]>('/me/grievances');
  const [kind, setKind] = useState<'meal' | 'other' | null>(null);
  return (
    <div className="st mo">
      <section className="st-panel mn-head">
        <div className="mn-title"><span className="st-ico mn-ico"><MessageSquareWarning size={20} /></span>
          <span><h1>Complaints</h1><small>About a meal, or anything else that is not a repair. For a broken fan or tap, use Repairs.</small></span></div>
      </section>
      <section className="st-panel">
        <div className="rc-kinds">
          <button type="button" aria-pressed={kind === 'meal'} onClick={() => setKind('meal')} disabled={!mess.data?.mess}><Utensils size={22} /><b>A problem with a meal</b><small>{mess.data?.mess ? `Goes to the ${mess.data.mess.mess_name} in-charge` : 'You are not taking meals in a hostel mess'}</small></button>
          <button type="button" aria-pressed={kind === 'other'} onClick={() => setKind('other')}><MessageSquareWarning size={22} /><b>Something else</b><small>Room-mate, staff, discipline, ragging, safety</small></button>
        </div>
        {kind === 'meal' && <MealForm onDone={() => { setKind(null); mess.mutate(); }} />}
        {kind === 'other' && <OtherForm onDone={() => { setKind(null); mine.mutate(); }} />}
      </section>
      {(mess.data?.grievances.length ?? 0) + (mine.data?.length ?? 0) > 0 && (
        <section className="st-panel">
          <h2>My complaints</h2>
          <ul className="mo-mine">
            {mess.data?.grievances.map((g) => (
              <li key={`m${g.feedback_id}`}><span><b>{MEALS.find((m) => m[0] === g.slot)?.[1]}, {when(g.meal_date)}</b> {g.details}
                {g.action_taken && <small className="mo-reply-s">Mess: {g.action_taken}</small>}</span>
                <span className={`xd-pill xd-t-${g.status === 'Open' ? 'warn' : 'good'}`}>{g.status === 'Open' ? 'Waiting for reply' : g.status}</span></li>))}
            {mine.data?.map((g) => (
              <li key={`g${g.grievance_id}`}><span><b>{CAT[g.category]}, {when(g.raised_at)}</b> {g.description}
                {g.action_taken && g.status === 'Closed' && <small className="mo-reply-s">{g.action_taken}</small>}</span>
                <span className={`xd-pill xd-t-${GSTATUS[g.status]?.tone ?? 'warn'}`}>{g.is_confidential && <Lock size={11} />} {GSTATUS[g.status]?.label ?? g.status}</span></li>))}
          </ul>
        </section>)}
    </div>
  );
}

function MealForm({ onDone }: { onDone: () => void }) {
  const [date, setDate] = useState(todayIso());
  const [slot, setSlot] = useState('Lunch');
  const [aspect, setAspect] = useState('Quality');
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { await api('/me/mess-grievances', { method: 'POST', json: { meal_date: date, slot, aspect, details: text, rating: rating || null } }); toast('Sent to the mess in-charge'); onDone(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  return (
    <div className="mo-form">
      <div className="mo-chips" role="group" aria-label="Day">{[0, 1, 2].map((n) => <button key={n} type="button" aria-pressed={date === back(n)} onClick={() => setDate(back(n))}>{n === 0 ? 'Today' : n === 1 ? 'Yesterday' : when(back(n))}</button>)}</div>
      <div className="mo-chips" role="group" aria-label="Meal">{MEALS.map(([v, l]) => <button key={v} type="button" aria-pressed={slot === v} onClick={() => setSlot(v)}>{l}</button>)}</div>
      <div className="mo-chips" role="group" aria-label="What was wrong">{[['Quality', 'Taste or quality'], ['Quantity', 'Not enough'], ['Both', 'Both']].map(([v, l]) => <button key={v} type="button" aria-pressed={aspect === v} onClick={() => setAspect(v)}>{l}</button>)}</div>
      <div className="mo-chips" role="group" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={rating === n} onClick={() => setRating(rating === n ? 0 : n)}>{'★'.repeat(n)}</button>)}</div>
      <textarea className="rc-why" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="What was wrong? For example: the rice was undercooked and the curd ran out by 1:15." />
      <div className="rc-acts"><Button variant="primary" loading={busy} blockedReason={text.trim().length < 10 ? 'Say what was wrong.' : undefined} onClick={send}>Send to the rasoi</Button></div>
    </div>
  );
}

function OtherForm({ onDone }: { onDone: () => void }) {
  const [cat, setCat] = useState('Room_Mate');
  const [text, setText] = useState('');
  const [conf, setConf] = useState(false);
  const [busy, setBusy] = useState(false);
  const alwaysConf = cat === 'Ragging' || cat === 'Safety';
  const send = async () => {
    setBusy(true);
    try { await api('/me/grievances', { method: 'POST', json: { category: cat, description: text, is_confidential: conf || alwaysConf } }); toast(conf || alwaysConf ? 'Sent to the Chief Manager in confidence' : 'Sent to your managers'); onDone(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  return (
    <div className="mo-form">
      <div className="mo-chips" role="group" aria-label="About">{Object.entries(CAT).filter(([k]) => k !== 'Mess').map(([v, l]) => <button key={v} type="button" aria-pressed={cat === v} onClick={() => setCat(v)}>{l}</button>)}</div>
      <textarea className="rc-why" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="What happened, when and where." />
      <label className="mo-check"><input type="checkbox" checked={conf || alwaysConf} disabled={alwaysConf} onChange={(e) => setConf(e.target.checked)} /> <Lock size={14} /> Confidential: only the Chief Manager and the Dean see it{alwaysConf ? ' (always for ragging and safety)' : ''}</label>
      <div className="rc-acts"><Button variant="primary" loading={busy} blockedReason={text.trim().length < 10 ? 'Describe what happened.' : undefined} onClick={send}>Send</Button></div>
    </div>
  );
}
