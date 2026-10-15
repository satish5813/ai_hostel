import { Fragment, useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Field, Input, Notice, SegmentedControl, Select, StatusChip, Textarea, formatDate, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import { titleCase, useAction, useApi, useSession } from '@/lib/ui';
import MyMenuPage from '@/pages/student/MyMenu';

type Cycle = { cycle_id: number; hostel_gender: string; region: string; country: string | null; diet: string; mess_id: number | null; mess_name: string | null; title: string; notes: string | null;
  status: string; effective_from: string; approved_by_name: string | null; approved_by: string | null; approved_on: string | null; updated_at: string | null; eaters: number };
type Item = { day_no: number; meal: string; dishes: string };
type Detail = Cycle & { items: Item[]; live_items: Item[] | null; live_id: number | null; draft_id: number | null };
type Hostel = { facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string; accommodation_type: string; residents: number };
type List = { cycles: Cycle[]; residents: { hostel_gender: string; is_foreign: boolean; region: string; country: string | null; diet: string; n: number; no_menu: number; next_week: number }[]; hostels: Hostel[]; pending_changes: number };

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MEALS = [{ id: 'Breakfast', label: 'Breakfast' }, { id: 'Lunch', label: 'Lunch' }, { id: 'Evening_Snacks', label: 'Snacks' }, { id: 'Dinner', label: 'Dinner' }];
const FOOD = [{ value: 'South', label: 'South Indian' }, { value: 'North', label: 'North Indian' }, { value: 'International', label: 'International' }];
const isoToday = () => ((new Date().getDay() + 6) % 7) + 1;
const same = (a: Cycle, k: { g: string; r: string; c: string; d: string }) => a.hostel_gender === k.g && a.region === k.r && (a.region !== 'International' || a.country === k.c) && a.diet === k.d && a.mess_id == null;

/**
 * MES-01 Routine menu. One week of four meals for each kind of student: Boys or Girls hostel, South Indian, North
 * Indian or a country's food (apartments and overseas students), Veg or Non-veg. The administrator changes a menu on a
 * draft; the Chief Manager approves it and the students who eat it see it from then on.
 */
export default function MessMenu() {
  const s = useSession()!;
  return s.kind === 'student' ? <MyMenuPage /> : <StaffMenu />;
}

function StaffMenu() {
  const s = useSession()!;
  const cw = s.role === 'Chief_Warden';
  const edit = cw || s.role === 'admin';
  const list = useApi<List>('/menus');
  const [k, setK] = useState({ g: 'Boys', r: 'South', c: '', d: 'Veg' });
  const [newCountry, setNewCountry] = useState('');
  const [sel, setSel] = useState<number | null>(null);    // a draft opened explicitly
  const [cell, setCell] = useState<{ day: number; meal: string } | null>(null);
  const [day, setDay] = useState(isoToday());
  const { run, busy } = useAction();

  const all = list.data?.cycles ?? [];
  const countries = useMemo(() => [...new Set(all.filter((c) => c.country).map((c) => c.country!))].sort(), [all]);
  useEffect(() => { if (k.r === 'International' && !k.c && countries.length) setK((x) => ({ ...x, c: countries[0] })); }, [k.r, k.c, countries]);
  const live = all.find((c) => c.status === 'Approved' && same(c, k));
  const draft = all.find((c) => c.status === 'Draft' && same(c, k));
  const showId = sel && (sel === draft?.cycle_id || sel === live?.cycle_id) ? sel : live?.cycle_id ?? draft?.cycle_id ?? null;
  const detail = useApi<Detail>(showId ? `/menus/${showId}` : null);
  const d = detail.data && detail.data.cycle_id === showId ? detail.data : undefined;
  const isDraft = d?.status === 'Draft';
  const meal = (items: Item[] | null | undefined, day: number, m: string) => items?.find((i) => i.day_no === day && i.meal === m)?.dishes ?? '';
  const changed = (day: number, m: string) => !!(isDraft && d?.live_items && meal(d.items, day, m) !== meal(d.live_items, day, m));
  const nChanged = isDraft && d?.live_items ? DAYS.reduce((a, _, i) => a + MEALS.filter((m) => changed(i + 1, m.id)).length, 0) : 0;
  const filled = d ? d.items.length : 0;
  const refresh = () => { list.mutate(); detail.mutate(); };
  const startDraft = (copyFrom?: number) => run(async () => {
    const r = await api<{ cycle_id: number }>('/menus', { method: 'POST', json: { hostel_gender: k.g, region: k.r, country: k.r === 'International' ? k.c : null, diet: k.d, copy_from: copyFrom } });
    setSel(r.cycle_id); list.mutate();
  }, '');
  const residents = (list.data?.residents ?? []).filter((x) => x.hostel_gender === k.g && x.region === k.r && x.diet === k.d && (k.r !== 'International' || x.country === k.c)).reduce((a, x) => a + x.n, 0);

  return (
    <div className="pg mm">
      <div className="pg-head">
        <div><p>One week of meals for each kind of student. {s.role === 'admin' ? 'You prepare changes on a draft; the Chief Manager approves them.' : cw ? 'The administrator prepares changes on a draft; you approve them.' : 'Approved menus are what the students see.'}</p></div>
        <div className="pg-actions"><Button variant="secondary" icon="file" onClick={() => window.print()}>Print this week</Button></div>
      </div>

      <section className="box mm-pick" aria-label="Which menu">
        <SegmentedControl label="Hostel" value={k.g} onChange={(g) => { setK({ ...k, g }); setSel(null); }} options={[{ value: 'Boys', label: 'Boys' }, { value: 'Girls', label: 'Girls' }]} />
        <SegmentedControl label="Students" value={k.r === 'International' ? 'Foreign' : 'Local'} onChange={(v) => { setK({ ...k, r: v === 'Foreign' ? 'International' : 'South', c: '' }); setSel(null); }}
          options={[{ value: 'Local', label: 'Local' }, { value: 'Foreign', label: 'Foreign' }]} />
        {k.r !== 'International' && <SegmentedControl label="Food" value={k.r} onChange={(r) => { setK({ ...k, r }); setSel(null); }} options={FOOD.slice(0, 2)} />}
        {k.r === 'International' && (
          <div className="mm-country">
            <Field label="Country"><Select value={k.c} onChange={(e) => { setK({ ...k, c: e.target.value }); setSel(null); }} options={countries} /></Field>
            {edit && <form className="mm-add" onSubmit={(e) => { e.preventDefault(); const c = titleCase(newCountry.trim()); if (!c) return; setK({ ...k, c }); setNewCountry(''); setSel(null); }}>
              <Field label="Add a country"><Input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="Thailand" /></Field><Button type="submit" variant="ghost" icon="plus">Add</Button></form>}
          </div>)}
        <SegmentedControl label="Diet" value={k.d} onChange={(d) => { setK({ ...k, d }); setSel(null); }} options={[{ value: 'Veg', label: 'Veg' }, { value: 'Non_Veg', label: 'Non-veg' }]} />
      </section>

      <section className="box mm-week" aria-label="Week">
        <header className="mm-head">
          <div className="mm-title">
            <b>{d?.title ?? `${k.g} · ${k.r === 'International' ? k.c || 'Country' : FOOD.find((f) => f.value === k.r)!.label} · ${k.d === 'Veg' ? 'Veg' : 'Non-veg'}`}</b>
            <span>
              {d ? <StatusChip status={d.status === 'Approved' ? 'Active' : 'Pending'} label={d.status === 'Approved' ? 'Approved' : 'Draft'} /> : <StatusChip status="Pending" label="No menu" />}
              {d?.status === 'Approved' && <small>{d.approved_by_name ? `by ${d.approved_by_name} · ` : ''}{d.approved_on ? formatDate(d.approved_on) : ''} · from {formatDate(d.effective_from)}</small>}
              {isDraft && <small>{filled} of 28 meals · {d!.live_items ? `${nChanged} changed from the approved menu` : 'new menu'}</small>}
              <small>{residents} student{residents === 1 ? '' : 's'} with this choice</small>
            </span>
          </div>
          <div className="mm-acts">
            {d && !isDraft && draft && <Button variant="secondary" onClick={() => setSel(draft.cycle_id)}>Open the draft</Button>}
            {d && !isDraft && !draft && edit && <Button variant="secondary" icon="edit" loading={busy} onClick={() => startDraft(d.cycle_id)}>Change this menu</Button>}
            {isDraft && live && <Button variant="ghost" onClick={() => setSel(live.cycle_id)}>See approved</Button>}
            {isDraft && edit && <Button variant="ghost" loading={busy} onClick={() => run(() => api(`/menus/${d!.cycle_id}`, { method: 'DELETE' }).then(() => { setSel(null); list.mutate(); }), 'Draft discarded')}>Discard draft</Button>}
            {isDraft && cw && <Button variant="primary" icon="check" loading={busy} blockedReason={filled < 28 ? `Fill all 28 meals first (${28 - filled} to go).` : undefined}
              onClick={() => run(() => api(`/menus/${d!.cycle_id}/approve`, { method: 'POST' }).then(() => { setSel(null); refresh(); }), 'Menu approved; students see it now')}>Approve menu</Button>}
          </div>
        </header>
        {isDraft && s.role === 'admin' && <Notice tone="info" title="Draft">Click a meal to change it. Students keep seeing the approved menu until the Chief Manager approves this draft.</Notice>}
        {!d && !list.data && <div className="q-empty">Loading…</div>}
        {!showId && list.data && (
          <div className="mm-empty"><b>No menu for these students yet</b><p>{edit ? 'Start an empty week, or copy a menu that is close and change what differs.' : 'The administrator has not prepared this menu.'}</p>
            {edit && <div className="klh-row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button variant="primary" icon="plus" loading={busy} onClick={() => startDraft()}>Start an empty week</Button>
              <CopyFrom cycles={all.filter((c) => c.status === 'Approved')} onPick={(id) => startDraft(id)} />
            </div>}
          </div>)}
        {d && (
          <>
            <div className="mm-days" role="tablist" aria-label="Day">{DAYS.map((n, i) => <button key={n} type="button" role="tab" aria-selected={day === i + 1} onClick={() => setDay(i + 1)}>{n.slice(0, 3)}{i + 1 === isoToday() && <i aria-label="today" />}</button>)}</div>
            <div className="mm-grid" role="table" aria-label="Meals of the week">
              <div role="row" className="mm-row mm-row-h"><span role="columnheader" />{DAYS.map((n, i) => <span key={n} role="columnheader" className={`${i + 1 === isoToday() ? 'mm-today' : ''}${i + 1 === day ? ' mm-on' : ''}`}>{n}{i + 1 === isoToday() && <small>Today</small>}</span>)}</div>
              {MEALS.map((m) => (
                <div role="row" key={m.id} className="mm-row">
                  <span role="rowheader" className="mm-meal">{m.label}</span>
                  {DAYS.map((n, i) => {
                    const text = meal(d.items, i + 1, m.id);
                    const ch = changed(i + 1, m.id);
                    const body = <>{text ? text.split(', ').map((x, j) => <Fragment key={j}>{j ? <span className="mm-sep">, </span> : null}<span>{x}</span></Fragment>) : <em>Not set</em>}{ch && <small className="mm-ch">Changed</small>}</>;
                    const cls = `mm-cell${i + 1 === isoToday() ? ' mm-today' : ''}${i + 1 === day ? ' mm-on' : ''}${ch ? ' mm-changed' : ''}${!text ? ' mm-blank' : ''}`;
                    return isDraft && edit
                      ? <button key={n} type="button" role="cell" className={cls} aria-label={`${n} ${m.label}: ${text || 'not set'}. Change`} onClick={() => setCell({ day: i + 1, meal: m.id })}>{body}</button>
                      : <span key={n} role="cell" className={cls}>{body}</span>;
                  })}
                </div>))}
            </div>
            {d.notes && <p className="st-note mm-notes">{d.notes}</p>}
          </>)}
      </section>

      <div className="mm-cols">
        <section className="box mm-panel" aria-label="Students by food choice">
          <h2>Students by food choice</h2>
          <p className="mm-sub">This week, and from next Monday after {list.data?.pending_changes ?? 0} change{list.data?.pending_changes === 1 ? '' : 's'} students asked for. The mess plans next week from the second number.</p>
          <ul className="mm-res">{(list.data?.residents ?? []).slice().sort((a, b) => b.n - a.n).map((x, i) => (
            <li key={i}><button type="button" onClick={() => { setK({ g: x.hostel_gender, r: x.region, c: x.country ?? '', d: x.diet }); setSel(null); }}>
              <span>{x.hostel_gender} · {x.is_foreign ? 'Foreign' : 'Local'} · {x.region === 'International' ? x.country : FOOD.find((f) => f.value === x.region)!.label} · {x.diet === 'Veg' ? 'Veg' : 'Non-veg'}</span><b title="This week">{x.n}</b><small className={x.next_week !== x.n ? 'mm-warn' : 'mm-next'} title="From next Monday">next week {x.next_week}</small>{x.no_menu > 0 && <small className="mm-warn">{x.no_menu} without a menu</small>}</button></li>))}
            {list.data && !list.data.residents.length && <li className="q-empty">No one lives in a residency yet.</li>}</ul>
        </section>
        <section className="box mm-panel" aria-label="Apartments">
          <h2>Apartments</h2>
          <p className="mm-sub">Students in an apartment, and overseas students, may choose their own country's food.</p>
          <ul className="mm-res">{(list.data?.hostels ?? []).map((h) => (
            <li key={h.facility_id} className="mm-hostel"><span><b>{h.hostel_code}</b> {h.facility_name}<small>{h.hostel_gender} · {h.residents} living</small></span>
              {s.role === 'admin'
                ? <Select aria-label={`${h.hostel_code} type`} value={h.accommodation_type} options={['Hostel', 'Apartment']} onChange={(e) => run(() => api(`/menus/hostels/${h.facility_id}/accommodation`, { method: 'POST', json: { type: e.target.value } }).then(() => list.mutate()), `${h.hostel_code} is now ${e.target.value === 'Apartment' ? 'an apartment' : 'a hostel'}`)} />
                : <StatusChip status={h.accommodation_type === 'Apartment' ? 'Active' : 'Inactive'} label={h.accommodation_type} />}</li>))}</ul>
        </section>
      </div>

      {cell && d && <MealEditor cycle={d} day={cell.day} meal={cell.meal} text={meal(d.items, cell.day, cell.meal)} was={d.live_items ? meal(d.live_items, cell.day, cell.meal) : null}
        onClose={() => setCell(null)} onSaved={() => { detail.mutate(); setCell(null); }} />}
    </div>
  );
}

function CopyFrom({ cycles, onPick }: { cycles: Cycle[]; onPick: (id: number) => void }) {
  const [v, setV] = useState('');
  return (
    <form className="mm-add" onSubmit={(e) => { e.preventDefault(); if (v) onPick(Number(v)); }}>
      <Select aria-label="Copy from" value={v} onChange={(e) => setV(e.target.value)} options={[{ value: '', label: 'Copy a menu…' }, ...cycles.map((c) => ({ value: String(c.cycle_id), label: c.title }))]} />
      <Button type="submit" variant="secondary" disabled={!v}>Copy</Button>
    </form>
  );
}

function MealEditor({ cycle, day, meal, text, was, onClose, onSaved }: { cycle: Detail; day: number; meal: string; text: string; was: string | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState(text);
  const { run, busy } = useAction();
  const label = MEALS.find((m) => m.id === meal)!.label;
  const save = () => run(() => api(`/menus/${cycle.cycle_id}/meals`, { method: 'PUT', json: { day_no: day, meal, dishes: v } }).then(onSaved), '');
  return (
    <Drawer open onClose={onClose} title={`${DAYS[day - 1]} · ${label}`} subtitle={`${cycle.title} · draft`}
      footer={<div className="klh-row"><Button variant="primary" loading={busy} blockedReason={!v.trim() ? 'Write at least one dish.' : v.trim() === text ? 'Nothing changed.' : undefined} onClick={save}>Save meal</Button>
        {was !== null && was !== text && <Button variant="ghost" onClick={() => setV(was)}>Use the approved meal</Button>}</div>}>
      <div className="klh-stack" style={{ gap: 14 }}>
        <Field label="Dishes" hint="Separate the dishes with commas, in serving order, ending with the drink."><Textarea rows={4} value={v} onChange={(e) => setV(e.target.value)} /></Field>
        {was !== null && <div className="mm-was"><small>Approved menu</small><p>{was || 'Not set'}</p></div>}
        <p className="klh-muted" style={{ fontSize: 12.5 }}>Last change to this menu {cycle.updated_at ? formatDateTime(cycle.updated_at) : 'when it was created'}.</p>
      </div>
    </Drawer>
  );
}

