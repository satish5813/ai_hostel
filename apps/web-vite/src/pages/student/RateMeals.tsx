import { useState } from 'react';
import { Navigate } from 'react-router';
import { Coffee, Cookie, MessageSquare, Soup, Star, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { toast, useApi, useSession } from '@/lib/ui';
import { mealLabel } from '@/pages/mess/weekly';

type Dish = { date: string; meal: string; dish: string; option_id: number | null; diet: string | null; rating: number | null; comment: string | null; sentiment: string | null };
type Ratings = { days: { date: string; meals: { meal: string; dishes: Dish[] }[] }[] };

const ICON: Record<string, LucideIcon> = { Breakfast: Coffee, Lunch: UtensilsCrossed, Evening_Snacks: Cookie, Dinner: Soup };
const WORD = ['', 'Did not like it', 'Not good', 'Okay', 'Good', 'Loved it'];
const dayName = (iso: string, today: string) => {
  const diff = Math.round((Date.parse(today) - Date.parse(iso)) / 86_400_000);
  return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
};

/**
 * MES-02 Rate my meals. A student gives each dish they ate one to five stars, and may say why; meals of today and the
 * last three days can be rated or changed. The mess and management see the ratings together, never the student's name.
 */
export default function RateMeals() {
  const s = useSession()!;
  const r = useApi<Ratings>(s.kind === 'student' ? '/me/meal-ratings' : null);
  if (s.kind !== 'student') return <Navigate to="/reports/mess-sentiment" replace />;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const d = r.data;
  const total = d?.days.reduce((a, x) => a + x.meals.reduce((b, m) => b + m.dishes.length, 0), 0) ?? 0;
  const rated = d?.days.reduce((a, x) => a + x.meals.reduce((b, m) => b + m.dishes.filter((z) => z.rating).length, 0), 0) ?? 0;

  return (
    <div className="st rm">
      <section className="st-panel mn-head">
        <div className="mn-title">
          <span className="st-ico mn-ico"><Star size={20} /></span>
          <span><h1>Rate my meals</h1><small>Your stars tell the mess what to cook again. Nobody sees your name.</small></span>
        </div>
        {d && total > 0 && <div className="mn-chips"><span>{rated} of {total} dishes rated</span></div>}
      </section>
      {!d && <p className="st-empty">Loading…</p>}
      {d && !d.days.length && <section className="st-panel"><p className="st-empty">Meals you eat appear here once they are served, for three days.</p></section>}
      {d?.days.map((day) => (
        <section key={day.date} className="st-panel rm-day" aria-label={dayName(day.date, today)}>
          <h2>{dayName(day.date, today)}</h2>
          {day.meals.map((m) => {
            const Ico = ICON[m.meal];
            return (
              <div key={m.meal} className="rm-meal">
                <h3><span className="st-meal-ico"><Ico size={15} /></span>{mealLabel(m.meal)}</h3>
                <ul>{m.dishes.map((x) => <DishRow key={x.dish} d={x} onSaved={() => r.mutate()} />)}</ul>
              </div>);
          })}
        </section>))}
    </div>
  );
}

function DishRow({ d, onSaved }: { d: Dish; onSaved: () => void }) {
  const [stars, setStars] = useState(d.rating ?? 0);
  const [comment, setComment] = useState(d.comment ?? '');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async (n: number, text = comment) => {
    setBusy(true);
    try {
      await api('/me/meal-ratings', { method: 'PUT', json: { meal_date: d.date, meal: d.meal, dish: d.dish, rating: n, comment: text.trim() || null } });
      onSaved();
      if (n <= 2 && !text.trim()) setOpen(true);   // a low rating: ask what was wrong
    } catch (e) { setStars(d.rating ?? 0); toast((e as Error).message, 'critical'); }
    finally { setBusy(false); }
  };
  return (
    <li className="rm-dish">
      <div className="rm-row">
        <span className="rm-name"><b>{d.dish}</b>{d.diet && <small className={d.diet === 'Veg' ? 'rc-veg' : 'rc-nv'}>{d.diet === 'Veg' ? 'Veg' : 'Non-veg'}</small>}{!d.option_id && <small>Daily item</small>}</span>
        <span className="rm-stars" role="radiogroup" aria-label={`Rate ${d.dish}`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? 's' : ''}: ${WORD[n]}`} disabled={busy}
              className={n <= stars ? 'on' : ''} onClick={() => { setStars(n); save(n); }}><Star size={22} /></button>))}
        </span>
        <button type="button" className="rm-say" aria-expanded={open} aria-label={`Comment on ${d.dish}`} onClick={() => setOpen(!open)}><MessageSquare size={16} />{d.comment ? '1' : ''}</button>
      </div>
      {stars > 0 && <small className="rm-word">{WORD[stars]}{d.sentiment && ` · read as ${d.sentiment.toLowerCase()}`}</small>}
      {open && (
        <form className="rm-comment" onSubmit={(e) => { e.preventDefault(); if (!stars) { toast('Give the stars first', 'warning'); return; } save(stars, comment); setOpen(false); }}>
          <input aria-label={`What did you think of ${d.dish}?`} maxLength={400} placeholder="Too salty, served cold, chala bagundi…" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button type="submit" disabled={busy}>Save</button>
        </form>)}
    </li>
  );
}
