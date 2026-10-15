import { useState } from 'react';
import { CalendarClock, Coffee, Cookie, Globe2, Leaf, Soup, UtensilsCrossed, Users, type LucideIcon } from 'lucide-react';
import { Button, Field, Select, formatDate } from '@/lib/klh';
import { api } from '@/lib/api';
import { useAction, useApi } from '@/lib/ui';

type Item = { day_no: number; meal: string; dishes: string };
export type MyMenu = {
  me: { hostel_gender: string; hostel_code: string; mess_name: string | null; region: string; diet: string; country: string | null; is_foreign: boolean; menu_title: string | null; international_allowed: boolean;
    pending_change_id: number | null; change_from: string | null; next_region: string; next_diet: string; next_country: string | null; next_title: string | null } | null;
  items: Item[]; next_items: Item[]; countries: string[]; today: number | null; next_monday: string | null;
};
export const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MEAL_SLOTS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'Breakfast', label: 'Breakfast', icon: Coffee }, { id: 'Lunch', label: 'Lunch', icon: UtensilsCrossed },
  { id: 'Evening_Snacks', label: 'Evening snacks', icon: Cookie }, { id: 'Dinner', label: 'Dinner', icon: Soup },
];
const FOOD: Record<string, string> = { South: 'South Indian', North: 'North Indian', International: 'My country' };
export const foodName = (region: string, country: string | null) => (region === 'International' ? `${country} food` : FOOD[region]);

/**
 * MES-01 for a student: this week's menu for their group (Boys or Girls hostel, local or foreign student, food, diet),
 * and the weekly change of food. A change applies from next Monday; until then it can be changed again or withdrawn.
 */
export default function MyMenuPage() {
  const m = useApi<MyMenu>('/me/menu');
  const [week, setWeek] = useState<'this' | 'next'>('this');
  const [day, setDay] = useState<number | null>(null);
  const d = m.data;
  if (!d) return <div className="st"><p className="st-empty">Loading…</p></div>;
  if (!d.me) return <div className="st"><section className="st-panel"><h2>Mess menu</h2><p className="st-empty">Your menu appears here once you live in a residency and have a mess subscription.</p></section></div>;
  const me = d.me;
  const showNext = week === 'next' && !!me.pending_change_id;
  const items = showNext ? d.next_items : d.items;
  const sel = day ?? (showNext ? 1 : d.today ?? 1);
  const meal = (slot: string) => items.find((i) => i.day_no === sel && i.meal === slot)?.dishes;

  return (
    <div className="st mn">
      <section className="st-panel mn-head">
        <div className="mn-title">
          <span className="st-ico mn-ico"><UtensilsCrossed size={20} /></span>
          <span><h1>Mess menu</h1><small>{me.mess_name ?? me.hostel_code}</small></span>
        </div>
        <div className="mn-chips" aria-label="Your group">
          <span><Users size={13} />{me.hostel_gender} hostel</span>
          <span><Globe2 size={13} />{me.is_foreign ? 'Foreign student' : 'Local student'}</span>
          <span><UtensilsCrossed size={13} />{foodName(me.region, me.country)}</span>
          <span><Leaf size={13} />{me.diet === 'Veg' ? 'Veg' : 'Non-veg'}</span>
        </div>
      </section>

      {me.pending_change_id && (
        <div className="mn-pending">
          <CalendarClock size={18} />
          <span><b>From Monday {formatDate(me.change_from!)}: {foodName(me.next_region, me.next_country)}, {me.next_diet === 'Veg' ? 'veg' : 'non-veg'}</b>
            <small>You can change it again or withdraw it until Sunday night.</small></span>
          <WithdrawButton onDone={() => m.mutate()} />
        </div>)}

      <div className="mn-cols">
        <section className="st-panel mn-week" aria-label="Menu">
          <div className="mn-week-head">
            <h2>{showNext ? `From Monday ${formatDate(me.change_from!)}` : 'This week'}</h2>
            {me.pending_change_id && (
              <div className="st-presets mn-switch" role="tablist">
                <button type="button" role="tab" aria-pressed={week === 'this'} onClick={() => { setWeek('this'); setDay(null); }}>This week</button>
                <button type="button" role="tab" aria-pressed={week === 'next'} onClick={() => { setWeek('next'); setDay(null); }}>Next week</button>
              </div>)}
          </div>
          <div className="st-days" role="tablist" aria-label="Day">{WEEK.map((n, i) => (
            <button key={n} type="button" role="tab" aria-selected={sel === i + 1} onClick={() => setDay(i + 1)}><b>{n.slice(0, 3)}</b>{!showNext && i + 1 === d.today && <small>Today</small>}</button>))}</div>
          {items.length ? (
            <ul className="st-meals mn-meals">{MEAL_SLOTS.map((s) => (
              <li key={s.id}><span className="st-meal-ico"><s.icon size={16} /></span><span className="st-line-tx"><b>{s.label}</b><small>{meal(s.id) ?? 'Not set'}</small></span></li>))}</ul>
          ) : <p className="st-empty">There is no approved menu for this group yet. The residency office prepares it.</p>}
        </section>
        <FoodChoice m={d} onDone={() => { m.mutate(); setWeek('next'); setDay(null); }} />
      </div>
    </div>
  );
}

function WithdrawButton({ onDone }: { onDone: () => void }) {
  const { run, busy } = useAction();
  return <Button size="sm" variant="secondary" loading={busy} onClick={() => run(() => api('/me/food', { method: 'DELETE' }).then(onDone), 'Change withdrawn; your food stays the same')}>Withdraw</Button>;
}

function FoodChoice({ m, onDone }: { m: MyMenu; onDone: () => void }) {
  const me = m.me!;
  const [f, setF] = useState({ region: me.next_region, diet: me.next_diet, country: me.next_country ?? me.country ?? m.countries[0] ?? '' });
  const { run, busy } = useAction();
  const country = f.region === 'International' ? f.country : null;
  const unchanged = f.region === me.next_region && f.diet === me.next_diet && country === (me.next_region === 'International' ? me.next_country : null);
  const backToNow = f.region === me.region && f.diet === me.diet && country === (me.region === 'International' ? me.country : null);
  const save = () => run(() => api('/me/food', { method: 'POST', json: { region: f.region, diet: f.diet, country } }).then(onDone),
    backToNow ? 'Your food stays the same next week' : `Changed from Monday ${formatDate(m.next_monday!)}`);
  const options: [string, string][] = [['South', 'South Indian'], ['North', 'North Indian'], ...(me.international_allowed ? [['International', 'My country'] as [string, string]] : [])];
  return (
    <section className="st-panel mn-choice" aria-label="Change my food">
      <h2>Change my food</h2>
      <p className="st-note"><CalendarClock size={14} />Every week you can change your food. A change applies from Monday {formatDate(m.next_monday!)}, so the mess can plan.</p>
      <div className="mn-group">
        <span><small>Residency</small><b>{me.hostel_gender}</b></span>
        <span><small>Student</small><b>{me.is_foreign ? 'Foreign' : 'Local'}</b></span>
      </div>
      <div><span className="st-label">Food</span>
        <div className="st-presets">{options.map(([v, l]) => <button key={v} type="button" aria-pressed={f.region === v} onClick={() => setF({ ...f, region: v })}>{l}</button>)}</div>
        {!me.is_foreign && <small className="mn-hint">Food by country is for foreign students and apartment residents.</small>}
      </div>
      {f.region === 'International' && <Field label="Country"><Select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} options={m.countries} /></Field>}
      <div><span className="st-label">Diet</span>
        <div className="st-presets">{([['Veg', 'Veg'], ['Non_Veg', 'Non-veg']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={f.diet === v} onClick={() => setF({ ...f, diet: v })}>{l}</button>)}</div>
      </div>
      <Button variant="primary" loading={busy} blockedReason={unchanged ? 'Choose a different food or diet.' : f.region === 'International' && !f.country ? 'Choose the country.' : undefined} onClick={save}>
        {backToNow && me.pending_change_id ? 'Keep my current food' : `Change from Monday ${formatDate(m.next_monday!)}`}</Button>
    </section>
  );
}
