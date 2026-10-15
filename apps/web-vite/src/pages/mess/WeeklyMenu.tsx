import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Drawer, Field, Input, Notice, SegmentedControl, StatusChip, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, useAction, useApi, useSession } from '@/lib/ui';
import { CHOICE_MEALS, STYLE, mealLabel, WEEK_DAYS, dayDate, dietLabel, dueLabel, weekLabel, type Course, type Fixed, type Option, type Week } from './weekly';

type ListWeek = Week & { dishes: number; residents: number; choosers: number };
type List = { weeks: ListWeek[]; messes: { mess_id: number; mess_name: string; residents: number }[]; courses: Course[]; next: { week_start: string; close_at: string } };
type Detail = Week & { residents: number; courses: Course[]; fixed: Fixed[]; options: Option[] };

const PUBLISHERS = ['Mess_Incharge', 'Mess_Manager'];
const MAKERS = [...PUBLISHERS, 'Cook', 'Catering'];

/**
 * MES-08 Weekly menu. The Mess In-charge or the Chef writes next week's menu for a mess: the fixed items of each
 * food style, and for each course of each day the dishes students choose from (North or South Indian, Veg or
 * Non-veg; breakfast has two or three live-counter items). The Mess In-charge publishes it; students choose until
 * the Friday before the week, and the counts per dish appear here and in RPT-11.
 */
export default function WeeklyMenu() {
  const s = useSession()!;
  const navigate = useNavigate();
  const make = MAKERS.includes(s.role);
  const canPublish = PUBLISHERS.includes(s.role);
  const list = useApi<List>('/weekly-menus');
  const [messId, setMessId] = useState<number | null>(null);
  const [weekId, setWeekId] = useState<number | null>(null);
  const [day, setDay] = useState(1);
  const { run, busy } = useAction();

  const l = list.data;
  const mess = messId ?? l?.messes[0]?.mess_id ?? null;
  const weeks = (l?.weeks ?? []).filter((w) => w.mess_id === mess);
  const shown = weeks.find((w) => w.week_id === weekId) ?? weeks.find((w) => w.week_start === l?.next.week_start) ?? weeks[0];
  const detail = useApi<Detail>(shown ? `/weekly-menus/${shown.week_id}` : null);
  const d = detail.data && detail.data.week_id === shown?.week_id ? detail.data : undefined;
  // the week to start: the first one still open for choice, or the one after the latest the mess has written
  const latest = weeks.reduce<string | null>((a, w) => (!a || w.week_start > a ? w.week_start : a), null);
  const target = !l ? null : latest && latest >= l.next.week_start ? addDays(latest, 7) : l.next.week_start;
  const editable = make && !!d && d.status !== 'Closed';
  const refresh = () => { list.mutate(); detail.mutate(); };

  const createNext = () => run(async () => {
    const copy = weeks[0]?.week_id;
    const r = await api<{ week_id: number }>('/weekly-menus', { method: 'POST', json: { mess_id: mess, week_start: target, copy_from: copy } });
    await list.mutate(); setWeekId(r.week_id); setDay(1);
  }, copy0(weeks[0]));

  const missing = d ? missingOf(d) : [];

  return (
    <div className="klh-stack wm" style={{ gap: 16 }}>
      <ScreenHeader code="MES-08" subtitle={make ? (canPublish ? 'Write next week\'s dishes with the chef, then publish so students can choose before Friday.' : 'Write next week\'s dishes; the Rasoi In-charge publishes them for students to choose.')
        : 'The menu each rasoi offers, and how many students chose each dish.'}
        actions={<Button variant="secondary" icon="file" onClick={() => navigate('/reports/meal-choices')}>Choice report</Button>} />

      <section className="box wm-pick" aria-label="Which week">
        {l && l.messes.length > 1 && <SegmentedControl label="Rasoi" value={String(mess)} onChange={(v) => { setMessId(Number(v)); setWeekId(null); }} options={l.messes.map((m) => ({ value: String(m.mess_id), label: m.mess_name }))} />}
        <div className="wm-weeks" role="tablist" aria-label="Week">
          {weeks.slice(0, 6).map((w) => (
            <button key={w.week_id} type="button" role="tab" aria-selected={w.week_id === shown?.week_id} onClick={() => { setWeekId(w.week_id); setDay(1); }}>
              <b>{weekLabel(w.week_start)}</b><small><StatusChip status={chipOf(w.status, w.is_open)} label={statusLabel(w)} /></small></button>))}
          {make && target && <Button variant="primary" icon="plus" loading={busy} onClick={createNext}>Start week of {dayDate(target, 1)}</Button>}
        </div>
      </section>

      {!shown && l && <section className="box mm-empty"><b>No weekly menu yet</b><p>{make ? 'Start next week\'s menu; the fixed items come in already, and you add the dishes students choose from.' : 'The mess has not written one yet.'}</p></section>}

      {shown && (
        <section className="box wm-week" aria-label="Week">
          <header className="mm-head">
            <div className="mm-title">
              <b>{shown.mess_name} · {weekLabel(shown.week_start)}</b>
              <span>
                <StatusChip status={chipOf(shown.status, shown.is_open)} label={statusLabel(shown)} />
                <small>{shown.status === 'Draft' ? 'Students do not see it yet' : `${shown.choosers} of ${shown.residents} students have chosen`}</small>
                <small>Choices close {dueLabel(shown.choices_close_at)}</small>
                {shown.published_by_name && <small>Published by {shown.published_by_name}</small>}
              </span>
            </div>
            <div className="mm-acts">
              {editable && <CloseTime week={shown} onSaved={refresh} />}
              {make && shown.status === 'Draft' && <Button variant="ghost" loading={busy} onClick={() => run(() => api(`/weekly-menus/${shown.week_id}`, { method: 'DELETE' }).then(() => { setWeekId(null); list.mutate(); }), 'Draft discarded')}>Discard draft</Button>}
              {canPublish && shown.status === 'Draft' && <Button variant="primary" icon="check" loading={busy} blockedReason={missing.length ? `Still to add: ${missing.slice(0, 3).join('; ')}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}.` : undefined}
                onClick={() => run(() => api(`/weekly-menus/${shown.week_id}/publish`, { method: 'POST' }).then(refresh), 'Published; students have been told to choose')}>Publish for choice</Button>}
            </div>
          </header>
          {shown.status === 'Draft' && make && !canPublish && <Notice tone="info" title="Draft">When the week is ready, ask the Rasoi In-charge to publish it.</Notice>}
          {shown.status !== 'Draft' && editable && <Notice tone="info" title="Students are choosing">You can add dishes and correct names. A dish someone has chosen keeps its style and diet, and cannot be removed.</Notice>}

          <div className="mm-days wm-days" role="tablist" aria-label="Day">{WEEK_DAYS.map((n, i) => {
            const gaps = d ? missingOf(d, i + 1).length : 0;
            return <button key={n} type="button" role="tab" aria-selected={day === i + 1} onClick={() => setDay(i + 1)}>{dayDate(shown.week_start, i + 1)}{gaps > 0 && <i aria-label={`${gaps} to add`} />}</button>;
          })}</div>

          {!d ? <div className="q-empty">Loading…</div> : (
            <>
              {editable && <CopyDay week={d} day={day} onDone={detail.mutate} />}
              <div className="wm-meals">
                {CHOICE_MEALS.map((meal) => (
                  <div key={meal} className="wm-meal">
                    <h2>{mealLabel(meal)}</h2>
                    <FixedLine week={d} meal={meal} editable={editable} onSaved={detail.mutate} />
                    {d.courses.filter((c) => c.meals.includes(meal)).map((c) => (
                      <CourseBox key={c.course_code} week={d} day={day} meal={meal} course={c} editable={editable} onChange={() => { detail.mutate(); list.mutate(); }} />))}
                  </div>))}
              </div>
            </>)}
        </section>)}
    </div>
  );
}

const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const copy0 = (w?: ListWeek) => (w ? `Started from ${weekLabel(w.week_start)}; change what differs` : 'Week started');
const chipOf = (status: string, open: boolean) => (status === 'Draft' ? 'Pending' : open ? 'Active' : 'Inactive');
const statusLabel = (w: Week) => (w.status === 'Draft' ? 'Draft' : w.is_open ? 'Open for choice' : 'Closed');

/** What publishing still needs: each course below its minimum number of dishes on a day. */
function missingOf(d: Detail, onlyDay?: number) {
  const out: string[] = [];
  for (let n = 1; n <= 7; n++) {
    if (onlyDay && n !== onlyDay) continue;
    for (const c of d.courses) for (const meal of c.meals) {
      const have = d.options.filter((o) => o.day_no === n && o.meal === meal && o.course_code === c.course_code).length;
      if (have < c.min_options) out.push(`${WEEK_DAYS[n - 1].slice(0, 3)} ${meal.toLowerCase()} ${c.course_name.toLowerCase()}${c.min_options > 1 ? ` (${c.min_options - have} more)` : ''}`);
    }
  }
  return out;
}

function FixedLine({ week, meal, editable, onSaved }: { week: Detail; meal: string; editable: boolean; onSaved: () => void }) {
  const [edit, setEdit] = useState<Fixed | null>(null);
  const items = (['South', 'North'] as const).map((c) => week.fixed.find((f) => f.meal === meal && f.cuisine === c) ?? { meal, cuisine: c, items: '' });
  return (
    <div className="wm-fixed">
      <small>Every day, for everyone</small>
      {items.map((f) => (
        <button key={f.cuisine} type="button" disabled={!editable} onClick={() => setEdit(f)} aria-label={`${STYLE[f.cuisine]} fixed items: ${f.items || 'none'}${editable ? '. Change' : ''}`}>
          <b>{STYLE[f.cuisine]}</b>{f.items || <em>None</em>}</button>))}
      {edit && <FixedEditor week={week} f={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); onSaved(); }} />}
    </div>
  );
}

function FixedEditor({ week, f, onClose, onSaved }: { week: Detail; f: Fixed; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState(f.items);
  const { run, busy } = useAction();
  return (
    <Drawer open onClose={onClose} title={`${f.meal} · ${STYLE[f.cuisine]}`} subtitle={`Fixed items, ${weekLabel(week.week_start)}`}
      footer={<Button variant="primary" loading={busy} blockedReason={!v.trim() ? 'Write at least one item.' : undefined}
        onClick={() => run(() => api(`/weekly-menus/${week.week_id}/fixed`, { method: 'PUT', json: { meal: f.meal, cuisine: f.cuisine, items: v } }).then(onSaved), 'Fixed items saved')}>Save</Button>}>
      <Field label="Items" hint="Served every day of this week to students of this food style, without choosing. Separate with commas."><Input value={v} onChange={(e) => setV(e.target.value)} /></Field>
    </Drawer>
  );
}

function CourseBox({ week, day, meal, course: c, editable, onChange }: { week: Detail; day: number; meal: string; course: Course; editable: boolean; onChange: () => void }) {
  const opts = week.options.filter((o) => o.day_no === day && o.meal === meal && o.course_code === c.course_code);
  const [edit, setEdit] = useState<Option | null>(null);
  const [adding, setAdding] = useState(false);
  const full = c.max_options != null && opts.length >= c.max_options;
  const short = opts.length < c.min_options;
  const showCounts = week.status !== 'Draft';
  return (
    <div className={`wm-course${short ? ' wm-short' : ''}`}>
      <div className="wm-course-h">
        <b>{c.course_name}</b>
        <small>{c.min_options === c.max_options ? `${c.min_options}` : c.max_options ? `${c.min_options} to ${c.max_options} dishes` : `at least ${c.min_options}`}{c.can_skip ? ' · may be skipped' : ''}{c.default_on_close === 'Skip' ? ' · made only for those who choose' : ''}</small>
      </div>
      <ul className="wm-opts">
        {opts.map((o) => (
          <li key={o.option_id} className={o.diet === 'Veg' ? 'mc-veg' : 'mc-nv'}>
            <button type="button" disabled={!editable} onClick={() => setEdit(o)} aria-label={`${o.dish}, ${STYLE[o.cuisine]}, ${dietLabel(o.diet)}${editable ? '. Change' : ''}`}>
              <span className="mc-dot" aria-hidden="true" /><b>{o.dish}</b><small>{STYLE[o.cuisine]} · {dietLabel(o.diet)}</small>
              {showCounts && <span className="wm-n" title={`${o.chosen ?? 0} chose, ${o.defaulted ?? 0} given by default`}>{o.plates ?? 0}</span>}</button></li>))}
        {editable && !full && !adding && <li><button type="button" className="wm-add" onClick={() => setAdding(true)}>+ Add a dish</button></li>}
      </ul>
      {adding && <DishForm week={week} title={`${WEEK_DAYS[day - 1]} ${mealLabel(meal).toLowerCase()} · ${c.course_name}`} hint={c.hint}
        onClose={() => setAdding(false)} save={(b) => api(`/weekly-menus/${week.week_id}/options`, { method: 'POST', json: { ...b, day_no: day, meal, course_code: c.course_code } }).then(() => { setAdding(false); onChange(); })} />}
      {edit && <DishForm week={week} title={`${WEEK_DAYS[day - 1]} ${mealLabel(meal).toLowerCase()} · ${c.course_name}`} hint={c.hint} option={edit}
        onClose={() => setEdit(null)} save={(b) => api(`/weekly-menu-options/${edit.option_id}`, { method: 'PUT', json: b }).then(() => { setEdit(null); onChange(); })}
        remove={() => api(`/weekly-menu-options/${edit.option_id}`, { method: 'DELETE' }).then(() => { setEdit(null); onChange(); })} />}
    </div>
  );
}

type DishBody = { dish: string; cuisine: string; diet: string };
function DishForm({ week, title, hint, option, onClose, save, remove }: { week: Detail; title: string; hint: string | null; option?: Option; onClose: () => void; save: (b: DishBody) => Promise<unknown>; remove?: () => Promise<unknown> }) {
  const [b, setB] = useState<DishBody>({ dish: option?.dish ?? '', cuisine: option?.cuisine ?? 'South', diet: option?.diet ?? 'Veg' });
  const { run, busy } = useAction();
  const chosen = (option?.plates ?? 0) > 0;
  return (
    <Drawer open onClose={onClose} title={option ? 'Change dish' : 'Add a dish'} subtitle={`${title} · ${weekLabel(week.week_start)}`}
      footer={<div className="klh-row" style={{ gap: 8 }}>
        <Button variant="primary" loading={busy} blockedReason={b.dish.trim().length < 2 ? 'Write the dish name.' : undefined} onClick={() => run(() => save(b), option ? 'Dish saved' : 'Dish added')}>{option ? 'Save' : 'Add dish'}</Button>
        {remove && <Button variant="danger" loading={busy} blockedReason={chosen ? `${option!.plates} students chose it; it stays.` : undefined} onClick={() => run(remove, 'Dish removed')}>Remove</Button>}</div>}>
      <div className="klh-stack" style={{ gap: 14 }}>
        <Field label="Dish" hint={hint ?? 'Non-veg means chicken or egg: fish, prawns and mutton are not served.'}><Input autoFocus value={b.dish} onChange={(e) => setB({ ...b, dish: e.target.value })} placeholder="Gutti vankaya curry" /></Field>
        <SegmentedControl label="Style" value={b.cuisine} onChange={(v) => setB({ ...b, cuisine: v })} options={[{ value: 'South', label: 'South Indian' }, { value: 'North', label: 'North Indian' }, { value: 'Both', label: 'Both' }]} />
        <SegmentedControl label="Diet" value={b.diet} onChange={(v) => setB({ ...b, diet: v })} options={[{ value: 'Veg', label: 'Veg' }, { value: 'Non_Veg', label: 'Non-veg' }]} />
        {chosen && <Notice tone="info">{option!.plates} students chose this dish, so only its name can be corrected.</Notice>}
      </div>
    </Drawer>
  );
}

/** Copy a day's dishes to other days that do not have them yet: write Monday, then fill the week and change what differs. */
function CopyDay({ week, day, onDone }: { week: Detail; day: number; onDone: () => void }) {
  const [to, setTo] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const { run, busy } = useAction();
  useEffect(() => { setTo([]); setOpen(false); }, [day]);
  if (!week.options.some((o) => o.day_no === day)) return null;
  return (
    <div className="wm-copy">
      {!open ? <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>Copy {WEEK_DAYS[day - 1]}'s dishes to other days…</Button> : (
        <>
          <span>Copy to</span>
          <div className="st-presets">{WEEK_DAYS.map((n, i) => i + 1 === day ? null : (
            <button key={n} type="button" aria-pressed={to.includes(i + 1)} onClick={() => setTo(to.includes(i + 1) ? to.filter((x) => x !== i + 1) : [...to, i + 1])}>{n.slice(0, 3)}</button>))}</div>
          <Button size="sm" variant="secondary" loading={busy} blockedReason={!to.length ? 'Choose the days.' : undefined}
            onClick={() => run(() => api<{ added: number }>(`/weekly-menus/${week.week_id}/copy-day`, { method: 'POST', json: { from_day: day, to_days: to } }).then(() => { setOpen(false); onDone(); }), 'Copied to the courses those days did not have yet')}>Copy</Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </>)}
    </div>
  );
}

function CloseTime({ week, onSaved }: { week: Week; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const local = (iso: string) => new Date(Date.parse(iso) + 330 * 60_000).toISOString().slice(0, 16);   // shown in IST
  const [v, setV] = useState(local(week.choices_close_at));
  const { run, busy } = useAction();
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>Closing time</Button>
      {open && (
        <Drawer open onClose={() => setOpen(false)} title="When choices close" subtitle={`${week.mess_name} · ${weekLabel(week.week_start)}`}
          footer={<Button variant="primary" loading={busy} onClick={() => run(() => api(`/weekly-menus/${week.week_id}`, { method: 'PUT', json: { choices_close_at: `${v}:00+05:30` } }).then(() => { setOpen(false); onSaved(); }), 'Closing time saved')}>Save</Button>}>
          <div className="klh-stack" style={{ gap: 12 }}>
            <Field label="Close at (India time)" hint="Usually when the Friday before the week begins, so the kitchen can order provisions. It must be before the week starts.">
              <Input type="datetime-local" value={v} onChange={(e) => setV(e.target.value)} /></Field>
            <p className="klh-muted" style={{ fontSize: 12.5 }}>Now: {formatDateTime(week.choices_close_at)}. At closing, every student who has not chosen gets the dish that fits their food choice; live-counter items are made only for those who chose them.</p>
          </div>
        </Drawer>)}
    </>
  );
}

