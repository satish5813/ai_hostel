import { useMemo, useState } from 'react';
import { CalendarClock, Check, ChefHat, Coffee, Cookie, Leaf, Soup, Sparkles, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { Button } from '@/lib/klh';
import { api } from '@/lib/api';
import { toast, useAction, useApi } from '@/lib/ui';
import { CHOICE_MEALS, STYLE, mealLabel, WEEK_DAYS, dayDate, dietLabel, dueLabel, slotsOf, weekShort, type Course, type Fixed, type Option, type Week } from '@/pages/mess/weekly';

export type Choice = { day_no: number; meal: string; course_code: string; option_id: number | null; source: 'Student' | 'Default' | 'Staff' };
export type StudentWeek = Week & { fixed: Fixed[]; options: Option[]; choices: Choice[] };
export type MealChoices = { me: { mess_name: string; region: string; diet: string; cuisine: 'South' | 'North'; hostel_code: string } | null; today?: string; courses: Course[]; weeks: StudentWeek[] };

const MEAL_ICON: Record<string, LucideIcon> = { Breakfast: Coffee, Lunch: UtensilsCrossed, Evening_Snacks: Cookie, Dinner: Soup };
const key = (d: number, m: string, c: string) => `${d}|${m}|${c}`;

/** Progress of one student on a week: slots answered out of slots offered. */
export function progressOf(w: StudentWeek) {
  const slots = slotsOf(w.options);
  const done = w.choices.filter((c) => slots.has(key(c.day_no, c.meal, c.course_code))).length;
  return { done, total: slots.size };
}

/**
 * MES-09 Choose my meals. Each day the student gets the fixed items of their food style (idli or poha at breakfast;
 * white rice and curd, or pulka, white rice and curd) and chooses, course by course, among the dishes the mess offers,
 * each North or South Indian and Veg or Non-veg. Choices for a week close when the Friday before it begins; what is
 * left open is then filled with the dish that fits the student's food choice, except live-counter items, which are
 * made to order and so are made only for those who chose them.
 */
export default function MealChoicePage() {
  const r = useApi<MealChoices>('/me/meal-choices');
  const d = r.data;
  const firstOpen = d?.weeks.find((w) => w.is_open)?.week_id;
  const [weekId, setWeekId] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [version, setVersion] = useState(0);   // the choices are kept on the page; a fill reloads them from the server

  if (!d) return <div className="st"><p className="st-empty">Loading…</p></div>;
  if (!d.me) return <div className="st"><section className="st-panel"><h2>Choose my meals</h2><p className="st-empty">You choose your meals once you live in a hostel and eat at its mess.</p></section></div>;
  const w = d.weeks.find((x) => x.week_id === (weekId ?? firstOpen)) ?? d.weeks[0];
  const me = d.me;

  return (
    <div className="st mc">
      <section className="st-panel mn-head">
        <div className="mn-title">
          <span className="st-ico mn-ico"><ChefHat size={20} /></span>
          <span><h1>Choose my meals</h1><small>{me.mess_name}</small></span>
        </div>
        <div className="mn-chips" aria-label="My food choice">
          <span><UtensilsCrossed size={13} />{STYLE[me.cuisine]}</span>
          <span><Leaf size={13} />{dietLabel(me.diet)}</span>
        </div>
      </section>

      {!w ? <section className="st-panel"><p className="st-empty">The mess has not published a weekly menu yet. You will get a message when it does.</p></section> : (
        <>
          {d.weeks.length > 1 && (
            <div className="st-presets mc-weeks" role="tablist" aria-label="Week">{d.weeks.map((x) => (
              <button key={x.week_id} type="button" role="tab" aria-pressed={x.week_id === w.week_id} onClick={() => { setWeekId(x.week_id); setDay(null); }}>
                {x.is_open ? 'Next week' : 'This week'}<small>{weekShort(x.week_start)}</small></button>))}
            </div>)}
          <WeekChoices key={`${w.week_id}-${version}`} week={w} courses={d.courses} me={me} today={d.today} day={day} setDay={setDay}
            onFilled={() => r.mutate().then(() => setVersion((v) => v + 1))} />
        </>)}
    </div>
  );
}

/** The week's choices of one student. `staff`: the Chief Chef enters them for the student (until the week begins). */
export function WeekChoices({ week: w, courses, me, today, day, setDay, onFilled, staff }: { week: StudentWeek; courses: Course[]; me: { cuisine: string; diet: string }; today?: string; day: number | null; setDay: (d: number) => void; onFilled?: () => void;
  staff?: { saveUrl: string; canEnter: boolean; name: string } }) {
  const [mine, setMine] = useState<Record<string, Choice>>(() => Object.fromEntries(w.choices.map((c) => [key(c.day_no, c.meal, c.course_code), c])));
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const slots = useMemo(() => slotsOf(w.options), [w.options]);
  const done = Object.keys(mine).filter((k) => slots.has(k)).length;
  const todayNo = today ? Math.round((Date.parse(today) - Date.parse(w.week_start)) / 86_400_000) + 1 : 0;
  const sel = day ?? (todayNo >= 1 && todayNo <= 7 ? todayNo : 1);
  const dayDone = (n: number) => [...slots].filter((k) => k.startsWith(`${n}|`)).every((k) => mine[k]);
  const open = staff ? staff.canEnter : w.is_open;

  const pick = async (d: number, meal: string, c: Course, optionId: number | null) => {
    const k = key(d, meal, c.course_code);
    const before = mine[k];
    setMine((m) => ({ ...m, [k]: { day_no: d, meal, course_code: c.course_code, option_id: optionId, source: staff ? 'Staff' : 'Student' } }));
    setBusyKey(k);
    try { await api(staff ? staff.saveUrl : `/me/meal-choices/${w.week_id}`, { method: 'PUT', json: { day_no: d, meal, course_code: c.course_code, option_id: optionId } }); }
    catch (e) { setMine((m) => { const n = { ...m }; if (before) n[k] = before; else delete n[k]; return n; }); toast((e as Error).message, 'critical'); }
    finally { setBusyKey(null); }
  };

  return (
    <>
      <div className={`mn-pending mc-due${open ? '' : ' mc-closed'}`}>
        <CalendarClock size={18} />
        <span>
          <b>{staff ? (open ? `Entering for ${staff.name}` : `${staff.name}: this week has begun`) : open ? `Choose by ${dueLabel(w.choices_close_at)}` : `Choices closed ${dueLabel(w.choices_close_at)}`}</b>
          <small>{staff ? (open ? `You can enter or correct choices until the week begins, also after students' choices closed (${dueLabel(w.choices_close_at)}). Each one is recorded as entered by you.` : 'Choices can no longer be entered.')
            : open ? 'Anything you leave open is filled with the dish that fits your food choice. Live-counter breakfast is made only if you choose it.'
            : 'What you did not choose was filled in for you; it is marked "given".'}</small>
        </span>
        <span className="mc-count" aria-label={`${done} of ${slots.size} chosen`}><span><b>{done}</b>/{slots.size}</span><i><i style={{ width: `${slots.size ? (done / slots.size) * 100 : 0}%` }} /></i></span>
      </div>

      {open && !staff && onFilled && <QuickFill week={w} me={me as NonNullable<MealChoices['me']>} left={slots.size - done} onDone={(n) => { onFilled(); toast(n ? `${n} dishes chosen for you; change any you like` : 'Nothing left to fill'); }} />}

      <section className="st-panel mc-week" aria-label="Meals">
        <div className="st-days" role="tablist" aria-label="Day">{WEEK_DAYS.map((n, i) => (
          <button key={n} type="button" role="tab" aria-selected={sel === i + 1} onClick={() => setDay(i + 1)}>
            <b>{n.slice(0, 3)}</b><small>{dayDate(w.week_start, i + 1).slice(4)}</small>{dayDone(i + 1) && <i className="mc-tick" aria-label="all chosen"><Check size={10} /></i>}</button>))}</div>

        {CHOICE_MEALS.map((meal) => {
          const Ico = MEAL_ICON[meal];
          const fixed = w.fixed.filter((f) => f.meal === meal);
          const cs = courses.filter((c) => c.meals.includes(meal) && w.options.some((o) => o.day_no === sel && o.meal === meal && o.course_code === c.course_code));
          return (
            <div key={meal} className="mc-meal">
              <h2><span className="st-meal-ico"><Ico size={16} /></span>{mealLabel(meal)}</h2>
              {fixed.length > 0 && (
                <p className="mc-fixed">{[...fixed].sort((a, b) => Number(b.cuisine === me.cuisine) - Number(a.cuisine === me.cuisine)).map((f) => (
                  <span key={f.cuisine} className={f.cuisine === me.cuisine ? 'mc-mine' : ''}><small>{STYLE[f.cuisine]}{f.cuisine === me.cuisine ? ' · yours' : ''}</small>{f.items}</span>))}</p>)}
              {cs.map((c) => {
                const k = key(sel, meal, c.course_code);
                const ch = mine[k];
                const opts = w.options.filter((o) => o.day_no === sel && o.meal === meal && o.course_code === c.course_code);
                return (
                  <fieldset key={c.course_code} className="mc-course" disabled={!open}>
                    <legend>{c.course_name}{c.default_on_close === 'Skip' && <em>Made to order</em>}{!ch && open && <em className="mc-todo">Choose</em>}{ch?.source === 'Default' && <em>Given</em>}{ch?.source === 'Staff' && <em>Entered by the chef</em>}</legend>
                    <div className="mc-opts">
                      {opts.map((o) => (
                        <button key={o.option_id} type="button" aria-pressed={ch?.option_id === o.option_id} className={o.diet === 'Veg' ? 'mc-veg' : 'mc-nv'} disabled={!open || busyKey === k}
                          onClick={() => pick(sel, meal, c, o.option_id)}>
                          <span className="mc-dot" aria-hidden="true" /><b>{o.dish}</b><small>{STYLE[o.cuisine]} · {dietLabel(o.diet)}</small></button>))}
                      {c.can_skip && (
                        <button type="button" className="mc-skip" aria-pressed={!!ch && ch.option_id === null} disabled={!open || busyKey === k} onClick={() => pick(sel, meal, c, null)}>
                          <b>{c.default_on_close === 'Skip' ? 'Not today' : 'No thanks'}</b><small>{c.default_on_close === 'Skip' ? 'Idli or poha is enough' : 'Skip this'}</small></button>)}
                    </div>
                  </fieldset>);
              })}
            </div>);
        })}
        {!w.options.some((o) => o.day_no === sel) && <p className="st-empty">No choices on this day.</p>}
      </section>
    </>
  );
}

/** Fill every open course with the dishes of one food style and diet; the student changes what they like after. */
function QuickFill({ week, me, left, onDone }: { week: StudentWeek; me: NonNullable<MealChoices['me']>; left: number; onDone: (n: number) => void }) {
  const [f, setF] = useState<{ cuisine: string; diet: string }>({ cuisine: me.cuisine, diet: me.diet });
  const { run, busy } = useAction();
  if (left === 0) return null;
  return (
    <section className="st-panel mc-fill" aria-label="Fill the rest for me">
      <span className="mc-fill-tx"><Sparkles size={16} /><span><b>Fill the rest for me</b><small>{left} still open. Live-counter items are left for you to pick.</small></span></span>
      <div className="st-presets">{(['South', 'North'] as const).map((v) => <button key={v} type="button" aria-pressed={f.cuisine === v} onClick={() => setF({ ...f, cuisine: v })}>{STYLE[v]}</button>)}</div>
      <div className="st-presets">{(['Veg', 'Non_Veg'] as const).map((v) => <button key={v} type="button" aria-pressed={f.diet === v} onClick={() => setF({ ...f, diet: v })}>{dietLabel(v)}</button>)}</div>
      <Button variant="primary" size="sm" loading={busy} onClick={() => run(() => api<{ filled: number }>(`/me/meal-choices/${week.week_id}/fill`, { method: 'POST', json: f }).then((r) => onDone(r.filled)), '')}>Fill</Button>
    </section>
  );
}
