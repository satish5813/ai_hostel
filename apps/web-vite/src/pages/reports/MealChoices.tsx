import { Fragment, useState } from 'react';
import { Button, Card, EmptyState, Notice, Select, StatCard, StatusChip } from '@/lib/klh';
import { ScreenHeader, useApi } from '@/lib/ui';
import { CHOICE_MEALS, STYLE, mealLabel, WEEK_DAYS, dayDate, dietLabel, dueLabel, weekLabel, type Course, type Option, type Week } from '@/pages/mess/weekly';

type ListWeek = Week & { residents: number; choosers: number };
type Report = Week & {
  participation: { residents: number; slots: number; chose_all: number; chose_some: number; chose_none: number };
  courses: Course[]; dishes: Required<Option>[];
  slots: { day_no: number; meal: string; course_code: string; skipped: number; skipped_default: number; answered: number }[];
  diet: { day_no: number; meal: string; non_veg: number; veg: number; north: number; south: number }[];
};

/**
 * RPT-11 Weekly meal choices: for one mess and week, how many plates of each dish (chosen by students, and given by
 * default at closing), how many skipped, and veg and non-veg eaters per meal. The kitchen cooks from it; the Pro-VC
 * Finance and the Mess In-charge read it for provisions and cost. Counts only: no student's choice is shown.
 */
export default function MealChoices() {
  const list = useApi<{ weeks: ListWeek[] }>('/weekly-menus');
  const weeks = (list.data?.weeks ?? []).filter((w) => w.status !== 'Draft');
  const [id, setId] = useState<number | null>(null);
  const sel = weeks.find((w) => w.week_id === id) ?? weeks.find((w) => w.is_open) ?? weeks[0];
  const r = useApi<Report>(sel ? `/weekly-menus/${sel.week_id}/report` : null);
  const d = r.data && r.data.week_id === sel?.week_id ? r.data : undefined;
  const [day, setDay] = useState<number | 'all'>('all');

  const exportCsv = () => {
    if (!d) return;
    const rows = [['Mess', 'Date', 'Meal', 'Course', 'Dish', 'Style', 'Diet', 'Chosen', 'Given by default', 'Plates'],
      ...d.dishes.map((o) => [d.mess_name, dayDate(d.week_start, o.day_no), mealLabel(o.meal), d.courses.find((c) => c.course_code === o.course_code)?.course_name ?? o.course_code, o.dish, STYLE[o.cuisine], dietLabel(o.diet), o.chosen, o.defaulted, o.plates])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map((row) => row.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = `RPT-11-${d.mess_name.replace(/\s+/g, '-')}-${d.week_start}.csv`; a.click();
  };

  const p = d?.participation;
  const days = day === 'all' ? [1, 2, 3, 4, 5, 6, 7] : [day];
  const vegOf = (n: number, meal: string) => d?.diet.find((x) => x.day_no === n && x.meal === meal);

  return (
    <div className="klh-stack" style={{ gap: 20 }}>
      <ScreenHeader code="RPT-11" subtitle="Plates of each dish for a week, from the students' choices; counts only. Reports can be viewed and exported, never edited."
        actions={<div className="klh-row" style={{ gap: 8 }}>
          <Button variant="secondary" icon="file" disabled={!d} onClick={() => window.print()}>Print</Button>
          <Button variant="secondary" icon="upload" disabled={!d} onClick={exportCsv}>Export CSV</Button></div>} />

      <div className="klh-row rc-pick" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label className="rc-label">Rasoi and week
          <Select value={sel ? String(sel.week_id) : ''} onChange={(e) => setId(Number(e.target.value))}
            options={weeks.map((w) => ({ value: String(w.week_id), label: `${w.mess_name} · ${weekLabel(w.week_start)}${w.is_open ? ' · open' : ''}` }))} /></label>
        {d && <StatusChip status={d.is_open ? 'Active' : 'Inactive'} label={d.is_open ? `Open until ${dueLabel(d.choices_close_at)}` : 'Closed; defaults filled in'} />}
      </div>

      {list.data && !weeks.length && <EmptyState icon="utensils" title="No published weekly menu yet" body="The report fills in once the Mess In-charge publishes a week and students choose." />}

      {d && p && (
        <>
          {d.is_open && <Notice tone="info" title="Choices are still open">The numbers grow until {dueLabel(d.choices_close_at)}. Then each student who has not chosen is given the dish that fits their food choice, and the plates here are final.</Notice>}
          <div className="klh-grid-4">
            <StatCard color="indigo" icon="users" label="Students eating here" value={String(p.residents)} sub={`${p.slots} choices each this week`} />
            <StatCard color="brand" icon="check" label="Chose everything" value={String(p.chose_all)} sub={p.residents ? `${Math.round((p.chose_all / p.residents) * 100)}%` : undefined} />
            <StatCard color="amber" icon="edit" label="Chose some" value={String(p.chose_some)} />
            <StatCard color="rose" icon="alert" label="Did not choose" value={String(p.chose_none)} sub={d.is_open ? 'Will get the dishes of their food choice' : 'Given the dishes of their food choice'} tone={p.chose_none ? 'warning' : undefined} />
          </div>

          <Card icon="utensils" color="cyan" title="Veg and non-veg eaters" subtitle="A student counts as non-veg at a meal if any dish they take is non-veg.">
            <div className="rc-table-wrap">
              <table className="rc-table">
                <thead><tr><th>Meal</th>{WEEK_DAYS.map((n, i) => <th key={n}>{dayDate(d.week_start, i + 1)}</th>)}</tr></thead>
                <tbody>{CHOICE_MEALS.map((meal) => (
                  <tr key={meal}><th>{mealLabel(meal)}</th>{WEEK_DAYS.map((n, i) => { const v = vegOf(i + 1, meal); return <td key={n}><span className="rc-veg">{v?.veg ?? 0}</span> · <span className="rc-nv">{v?.non_veg ?? 0}</span></td>; })}</tr>))}</tbody>
              </table>
            </div>
            <p className="rc-legend"><span className="rc-veg">veg</span> · <span className="rc-nv">non-veg</span></p>
          </Card>

          <Card padding={0} icon="calendar" color="indigo" title="Plates per dish" action={
            <Select aria-label="Day" value={String(day)} onChange={(e) => setDay(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              options={[{ value: 'all', label: 'Whole week' }, ...WEEK_DAYS.map((n, i) => ({ value: String(i + 1), label: dayDate(d.week_start, i + 1) }))]} />}>
            <div className="rc-table-wrap">
              <table className="rc-table rc-dishes">
                <thead><tr><th>Course</th><th>Dish</th><th>Style · diet</th><th className="rc-n">Chosen</th><th className="rc-n">Given</th><th className="rc-n">Plates</th></tr></thead>
                <tbody>{days.map((n) => CHOICE_MEALS.map((meal) => {
                  const cs = d.courses.filter((c) => c.meals.includes(meal));
                  return (
                    <Fragment key={`${n}-${meal}`}>
                      <tr className="rc-group"><th colSpan={6}>{dayDate(d.week_start, n)} · {mealLabel(meal)}</th></tr>
                      {cs.map((c) => {
                        const opts = d.dishes.filter((o) => o.day_no === n && o.meal === meal && o.course_code === c.course_code);
                        const sl = d.slots.find((x) => x.day_no === n && x.meal === meal && x.course_code === c.course_code);
                        const skipped = (sl?.skipped ?? 0) + (sl?.skipped_default ?? 0);
                        return (
                          <Fragment key={c.course_code}>
                            {opts.map((o, j) => (
                              <tr key={o.option_id}>
                                {j === 0 && <td rowSpan={opts.length + (c.can_skip ? 1 : 0)} className="rc-course">{c.course_name}</td>}
                                <td>{o.dish}</td><td className={o.diet === 'Veg' ? 'rc-veg' : 'rc-nv'}>{STYLE[o.cuisine]} · {dietLabel(o.diet)}</td>
                                <td className="rc-n">{o.chosen}</td><td className="rc-n">{o.defaulted}</td><td className="rc-n"><b>{o.plates}</b></td></tr>))}
                            {c.can_skip && opts.length > 0 && (
                              <tr className="rc-skip"><td>{c.default_on_close === 'Skip' ? 'None (not made)' : 'Skipped'}</td><td />
                                <td className="rc-n">{sl?.skipped ?? 0}</td><td className="rc-n">{sl?.skipped_default ?? 0}</td><td className="rc-n">{skipped}</td></tr>)}
                          </Fragment>);
                      })}
                    </Fragment>);
                }))}</tbody>
              </table>
            </div>
          </Card>
        </>)}
    </div>
  );
}
