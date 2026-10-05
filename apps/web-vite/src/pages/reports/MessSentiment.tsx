import { useMemo, useState } from 'react';
import { Button, Card, EmptyState, Input, SegmentedControl, Select, StatCard } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, toast, useApi } from '@/lib/ui';
import { CHOICE_MEALS, STYLE, mealLabel } from '@/pages/mess/weekly';

type Counts = { ratings: number; raters: number; avg_rating: number | null; score: number | null; positive: number; neutral: number; negative: number };
type DishRow = Counts & { meal: string; dish: string; cuisine: string | null; diet: string | null; fixed: boolean; boys_score: number | null; girls_score: number | null; boys_n: number; girls_n: number;
  chosen: number | null; answered: number | null; popularity: number | null };
type Data = {
  residents: number; kpi: Counts & { comments: number }; prev: Counts & { from: string; to: string };
  by_meal: (Counts & { meal: string; grp: 'Boys' | 'Girls' | null })[]; trend: (Counts & { date: string })[]; dishes: DishRow[];
  comments: { date: string; meal: string; dish: string; rating: number; comment: string; sentiment: string; grp: string }[];
  words: { word: string; weight: number; note: string | null; n: number }[]; messes: { mess_id: number; mess_name: string }[];
};
type Range = { from: string; to: string };

const iso = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const addDays = (s: string, n: number) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const TODAY = iso(new Date());
const PRESETS: Record<string, () => Range> = {
  today: () => ({ from: TODAY, to: TODAY }),
  week: () => { const dow = (new Date(`${TODAY}T00:00:00Z`).getUTCDay() + 6) % 7; return { from: addDays(TODAY, -dow), to: TODAY }; },
  d7: () => ({ from: addDays(TODAY, -6), to: TODAY }),
  month: () => ({ from: `${TODAY.slice(0, 8)}01`, to: TODAY }),
  d30: () => ({ from: addDays(TODAY, -29), to: TODAY }),
};
const PRESET_LABEL: [string, string][] = [['today', 'Today'], ['week', 'This week'], ['d7', 'Last 7 days'], ['month', 'This month'], ['d30', 'Last 30 days'], ['custom', 'Choose dates']];
/** The mood index shown to people: the -1..1 score as -100..+100. */
const mood = (s: number | null | undefined) => (s == null ? '—' : `${s > 0 ? '+' : ''}${Math.round(s * 100)}`);
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
const fmtDay = (s: string) => new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/**
 * RPT-12 Mess sentiment. How students feel about breakfast, lunch, evening snacks and dinner, dish by dish, from their
 * star ratings and the words of their comments; for boys and girls; by day, week or month, with downloads. For the
 * President, Vice President, Pro-VCs, Mess Supervisor, Chief Chef and the mess. Read-only, and no student is named.
 */
export default function MessSentiment() {
  const [preset, setPreset] = useState('d30');
  const [range, setRange] = useState<Range>(PRESETS.d30());
  const [mess, setMess] = useState('');
  const [gender, setGender] = useState<'All' | 'Boys' | 'Girls'>('All');
  const [mealTab, setMealTab] = useState('All');
  const qs = `from=${range.from}&to=${range.to}${mess ? `&mess_id=${mess}` : ''}&gender=${gender}`;
  const r = useApi<Data>(`/mess-sentiment?${qs}`);
  const d = r.data;

  const download = async (grain: 'day' | 'week' | 'month') => {
    try {
      const rows = await api<Record<string, string | number | null>[]>(`/mess-sentiment/export?${qs}&grain=${grain}`);
      const head = ['Period', 'Mess', 'Meal', 'Dish', 'Style', 'Diet', 'Group', 'Ratings', 'Students', 'Average stars', 'Mood (-100..100)', 'Positive', 'Neutral', 'Negative', 'Comments'];
      const lines = rows.map((x) => [x.period, x.mess_name, mealLabel(String(x.meal)), x.dish, x.cuisine ? STYLE[String(x.cuisine)] : 'Daily item', x.diet === 'Non_Veg' ? 'Non-veg' : x.diet || '', x.grp,
        x.ratings, x.raters, x.avg_rating, mood(x.score as number), x.positive, x.neutral, x.negative, x.comments]);
      const csv = [head, ...lines].map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv' }));
      a.download = `RPT-12-mess-sentiment-${grain === 'day' ? 'daily' : grain === 'week' ? 'weekly' : 'monthly'}-${range.from}-to-${range.to}${gender !== 'All' ? `-${gender.toLowerCase()}` : ''}.csv`;
      a.click();
      toast(`${rows.length} rows downloaded`);
    } catch (e) { toast((e as Error).message, 'critical'); }
  };

  return (
    <div className="klh-stack sd" style={{ gap: 18 }}>
      <ScreenHeader code="RPT-12" subtitle="How students feel about each meal and dish, from their star ratings and comments. Mood runs from −100 (all unhappy) to +100 (all happy). No student is named."
        actions={<div className="klh-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" icon="upload" onClick={() => download('day')}>Daily CSV</Button>
          <Button variant="secondary" icon="upload" onClick={() => download('week')}>Weekly CSV</Button>
          <Button variant="secondary" icon="upload" onClick={() => download('month')}>Monthly CSV</Button>
          <Button variant="ghost" icon="file" onClick={() => window.print()}>Print</Button></div>} />

      <section className="box sd-filters" aria-label="Filters">
        <div className="st-presets sd-presets" role="group" aria-label="Period">{PRESET_LABEL.map(([k, l]) => (
          <button key={k} type="button" aria-pressed={preset === k} onClick={() => { setPreset(k); if (k !== 'custom') setRange(PRESETS[k]()); }}>{l}</button>))}</div>
        {preset === 'custom' && (
          <div className="sd-dates">
            <label>From<Input type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })} /></label>
            <label>To<Input type="date" value={range.to} min={range.from} max={TODAY} onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })} /></label>
          </div>)}
        <label className="sd-sel">Mess<Select value={mess} onChange={(e) => setMess(e.target.value)} options={[{ value: '', label: 'All messes' }, ...(d?.messes ?? []).map((m) => ({ value: String(m.mess_id), label: m.mess_name }))]} /></label>
        <SegmentedControl label="Students" value={gender} onChange={(v) => setGender(v as typeof gender)} options={[{ value: 'All', label: 'All' }, { value: 'Boys', label: 'Boys' }, { value: 'Girls', label: 'Girls' }]} />
      </section>

      {!d && <div className="q-empty">Loading…</div>}
      {d && !d.kpi.ratings && <EmptyState icon="utensils" title="No ratings in this period" body="Students rate their meals in the app after eating. Choose a longer period, or another mess." />}
      {d && d.kpi.ratings > 0 && (
        <>
          <div className="klh-grid-4">
            <StatCard color="indigo" icon="users" label="Ratings" value={d.kpi.ratings.toLocaleString('en-IN')} sub={`${d.kpi.raters} of ${d.residents} students · ${d.kpi.comments.toLocaleString('en-IN')} comments`} />
            <StatCard color="amber" icon="heart" label="Average stars" value={d.kpi.avg_rating?.toFixed(2) ?? '—'} sub={d.prev.ratings ? `${delta(d.kpi.avg_rating, d.prev.avg_rating, 2)} vs ${fmtDay(d.prev.from)}–${fmtDay(d.prev.to)}` : 'No earlier period to compare'} />
            <StatCard color="brand" icon="trend-up" label="Mood" value={mood(d.kpi.score)} sub={d.prev.ratings ? `${delta(d.kpi.score == null ? null : d.kpi.score * 100, d.prev.score == null ? null : d.prev.score * 100, 0)} vs the period before` : `${pct(d.kpi.positive, d.kpi.ratings)}% positive`} />
            <StatCard color="rose" icon="alert" label="Unhappy ratings" value={`${pct(d.kpi.negative, d.kpi.ratings)}%`} sub={`${d.kpi.negative.toLocaleString('en-IN')} negative · ${pct(d.kpi.positive, d.kpi.ratings)}% positive`} tone={pct(d.kpi.negative, d.kpi.ratings) >= 30 ? 'warning' : undefined} />
          </div>

          <div className="sd-cols">
            <Card icon="utensils" color="cyan" title="How each meal feels" subtitle="Share of ratings by sentiment, boys and girls side by side">
              <MealBars rows={d.by_meal} gender={gender} />
              <Legend />
            </Card>
            <Card icon="trend-up" color="indigo" title="Mood day by day" subtitle={`${fmtDay(range.from)} to ${fmtDay(range.to)} · ${gender === 'All' ? 'all students' : gender.toLowerCase()}`}>
              <TrendLine rows={d.trend} />
            </Card>
          </div>

          <div className="sd-cols">
            <Card icon="check" color="brand" title="Most liked" subtitle="Dishes with at least 5 ratings, best mood first"><DishList rows={best(d.dishes, 1)} /></Card>
            <Card icon="alert" color="rose" title="Least liked" subtitle="Worth changing or cooking differently"><DishList rows={best(d.dishes, -1)} /></Card>
          </div>

          <Card padding={0} icon="calendar" color="indigo" title="Every dish" subtitle="Picked = share of students who chose it when it was on the menu (its course that day)"
            action={<SegmentedControl label="Meal" value={mealTab} onChange={setMealTab} options={[{ value: 'All', label: 'All' }, ...CHOICE_MEALS.map((m) => ({ value: m, label: m === 'Evening_Snacks' ? 'Snacks' : m }))]} />}>
            <DishTable rows={d.dishes.filter((x) => mealTab === 'All' || x.meal === mealTab)} />
          </Card>

          <div className="sd-cols">
            <Card icon="inbox" color="violet" title="What students say" subtitle="Words found in comments, most frequent first">
              <ul className="sd-words">{d.words.map((w) => (
                <li key={w.word} className={w.weight > 0 ? 'sd-pos' : 'sd-neg'} title={w.note ?? undefined}><i aria-hidden="true" />{w.word}<b>{w.n}</b><span className="sd-sr">{w.weight > 0 ? 'positive' : 'negative'}</span></li>))}
                {!d.words.length && <li className="klh-muted">No comments in this period.</li>}</ul>
            </Card>
            <Card icon="file" color="brand" title="Latest comments" subtitle="Without names">
              <ul className="sd-comments">{d.comments.slice(0, 12).map((c, i) => (
                <li key={i}><span className={`sd-tag sd-${c.sentiment.toLowerCase()}`}>{c.sentiment}</span>
                  <span><q>{c.comment}</q><small>{c.dish} · {mealLabel(c.meal)} · {fmtDay(c.date)} · {c.grp} · {'★'.repeat(c.rating)}</small></span></li>))}</ul>
            </Card>
          </div>
        </>)}
    </div>
  );
}

const delta = (a: number | null, b: number | null, digits: number) => {
  if (a == null || b == null) return '—';
  const v = a - b;
  return `${v > 0 ? '▲ +' : v < 0 ? '▼ ' : ''}${v.toFixed(digits)}`;
};
const best = (rows: DishRow[], dir: 1 | -1) => rows.filter((x) => x.ratings >= 5 && x.score != null).sort((a, b) => dir * ((b.score ?? 0) - (a.score ?? 0))).slice(0, 8);

function Legend() {
  return <p className="sd-legend"><span><i className="sd-sw-pos" />Positive</span><span><i className="sd-sw-neu" />Neutral</span><span><i className="sd-sw-neg" />Negative</span></p>;
}

/** One 100 % bar per meal and group: negative, neutral, positive, each labelled when wide enough. */
function MealBars({ rows, gender }: { rows: Data['by_meal']; gender: string }) {
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const groups = gender === 'All' ? ['Boys', 'Girls'] : [gender];
  return (
    <div className="sd-bars" onMouseLeave={() => setTip(null)}>
      {CHOICE_MEALS.map((m) => (
        <div key={m} className="sd-meal">
          <b>{mealLabel(m)}</b>
          {groups.map((g) => {
            const x = rows.find((r) => r.meal === m && r.grp === g);
            if (!x || !x.ratings) return <div key={g} className="sd-bar-row"><span>{g}</span><span className="klh-muted">No ratings</span></div>;
            const parts: [string, number][] = [['neg', x.negative], ['neu', x.neutral], ['pos', x.positive]];
            return (
              <div key={g} className="sd-bar-row">
                <span>{g}</span>
                <span className="sd-bar" role="img" aria-label={`${mealLabel(m)}, ${g}: ${pct(x.positive, x.ratings)}% positive, ${pct(x.neutral, x.ratings)}% neutral, ${pct(x.negative, x.ratings)}% negative, mood ${mood(x.score)}`}>
                  {parts.map(([k, n]) => n > 0 && (
                    <i key={k} className={`sd-seg sd-${k}`} style={{ flexGrow: n }}
                      onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, text: `${mealLabel(m)} · ${g}: ${n} ${k === 'pos' ? 'positive' : k === 'neu' ? 'neutral' : 'negative'} (${pct(n, x.ratings)}%) of ${x.ratings}` })}>
                      {pct(n, x.ratings) >= 12 && <em>{pct(n, x.ratings)}%</em>}</i>))}
                </span>
                <span className="sd-mood" title="Mood">{mood(x.score)}</span>
              </div>);
          })}
        </div>))}
      {tip && <div className="sd-tip" style={{ left: tip.x + 12, top: tip.y + 12 }}>{tip.text}</div>}
    </div>
  );
}

/** Daily mood as a line around the zero line, with a crosshair and tooltip. */
function TrendLine({ rows }: { rows: Data['trend'] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = 200, L = 36, R = 10, T = 12, B = 26;
  // the scale follows the data (in steps of 25), always keeping the zero line in view
  const [lo, hi] = useMemo(() => {
    const v = rows.map((r) => r.score ?? 0);
    return [Math.min(-0.25, Math.floor((Math.min(...v) - 0.05) * 4) / 4), Math.max(0.25, Math.ceil((Math.max(...v) + 0.05) * 4) / 4)];
  }, [rows]);
  const yOf = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const pts = useMemo(() => rows.map((r, i) => ({ ...r, x: L + (rows.length > 1 ? (i / (rows.length - 1)) * (W - L - R) : (W - L - R) / 2), y: T + ((hi - (r.score ?? 0)) / (hi - lo)) * (H - T - B) })), [rows, lo, hi]);
  if (!rows.length) return <p className="klh-muted">No ratings.</p>;
  const yTicks: number[] = []; for (let v = hi; v >= lo - 1e-9; v -= 0.25) yTicks.push(Math.round(v * 100) / 100);
  const h = hover != null ? pts[hover] : null;
  const ticks = pts.filter((_, i) => i === 0 || i === pts.length - 1 || (pts.length > 8 && i % Math.ceil(pts.length / 6) === 0));
  return (
    <div className="sd-trend">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Mood from ${mood(rows[0].score)} on ${fmtDay(rows[0].date)} to ${mood(rows[rows.length - 1].score)} on ${fmtDay(rows[rows.length - 1].date)}`}
        onMouseMove={(e) => { const b = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const x = ((e.clientX - b.left) / b.width) * W; let k = 0; pts.forEach((p, i) => { if (Math.abs(p.x - x) < Math.abs(pts[k].x - x)) k = i; }); setHover(k); }}
        onMouseLeave={() => setHover(null)}>
        {yTicks.map((v) => (
          <g key={v}><line x1={L} x2={W - R} y1={yOf(v)} y2={yOf(v)} className={v === 0 ? 'sd-zero' : 'sd-grid'} />
            <text x={L - 6} y={yOf(v) + 4} className="sd-axis" textAnchor="end">{v > 0 ? `+${Math.round(v * 100)}` : Math.round(v * 100)}</text></g>))}
        {ticks.map((p, i) => <text key={p.date} x={p.x} y={H - 6} className="sd-axis" textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}>{fmtDay(p.date)}</text>)}
        <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} className="sd-line" />
        {h && <><line x1={h.x} x2={h.x} y1={T} y2={H - B} className="sd-cross" /><circle cx={h.x} cy={h.y} r={5} className="sd-dot" /></>}
      </svg>
      {h && <div className="sd-tip sd-tip-in" style={{ left: `${(h.x / W) * 100}%` }}>{fmtDay(h.date)}: mood {mood(h.score)} · {h.avg_rating?.toFixed(1)}★ · {h.ratings} ratings</div>}
    </div>
  );
}

function SentBar({ x }: { x: Counts }) {
  return (
    <span className="sd-mini" role="img" aria-label={`${pct(x.positive, x.ratings)}% positive, ${pct(x.negative, x.ratings)}% negative`} title={`${x.positive} positive · ${x.neutral} neutral · ${x.negative} negative`}>
      {x.negative > 0 && <i className="sd-neg" style={{ flexGrow: x.negative }} />}{x.neutral > 0 && <i className="sd-neu" style={{ flexGrow: x.neutral }} />}{x.positive > 0 && <i className="sd-pos" style={{ flexGrow: x.positive }} />}
    </span>
  );
}

function DishList({ rows }: { rows: DishRow[] }) {
  if (!rows.length) return <p className="klh-muted">Not enough ratings yet.</p>;
  return (
    <ol className="sd-dishes">{rows.map((x) => (
      <li key={`${x.meal}-${x.dish}`}>
        <span><b>{x.dish}</b><small>{mealLabel(x.meal)}{x.cuisine && x.cuisine !== 'Both' ? ` · ${STYLE[x.cuisine]}` : ''}{x.diet ? ` · ${x.diet === 'Veg' ? 'Veg' : 'Non-veg'}` : ''} · {x.ratings} ratings</small></span>
        <SentBar x={x} />
        <span className="sd-num">{x.avg_rating?.toFixed(1)}★<small>mood {mood(x.score)}</small></span>
      </li>))}</ol>
  );
}

function DishTable({ rows }: { rows: DishRow[] }) {
  const [sort, setSort] = useState<'score' | 'ratings' | 'popularity'>('score');
  const [all, setAll] = useState(false);
  const sorted = [...rows].sort((a, b) => ((b[sort] ?? -9) as number) - ((a[sort] ?? -9) as number));
  const th = (k: typeof sort, label: string) => <th className="rc-n"><button type="button" className="sd-sort" aria-pressed={sort === k} onClick={() => setSort(k)}>{label}{sort === k ? ' ▾' : ''}</button></th>;
  return (
    <div className="rc-table-wrap">
      <table className="rc-table sd-table">
        <thead><tr><th>Dish</th><th>Meal</th><th>Sentiment</th>{th('ratings', 'Ratings')}<th className="rc-n">Stars</th>{th('score', 'Mood')}<th className="rc-n">Boys</th><th className="rc-n">Girls</th>{th('popularity', 'Picked')}</tr></thead>
        <tbody>{(all ? sorted : sorted.slice(0, 25)).map((x) => (
          <tr key={`${x.meal}-${x.dish}`}>
            <td><b>{x.dish}</b><small className="sd-sub">{x.fixed && !x.diet ? 'Daily item' : `${x.cuisine ? STYLE[x.cuisine] : ''}${x.diet ? ` · ${x.diet === 'Veg' ? 'Veg' : 'Non-veg'}` : ''}`}</small></td>
            <td>{mealLabel(x.meal)}</td><td><SentBar x={x} /></td><td className="rc-n">{x.ratings}</td><td className="rc-n">{x.avg_rating?.toFixed(1)}</td>
            <td className="rc-n"><b>{mood(x.score)}</b></td><td className="rc-n">{x.boys_n ? mood(x.boys_score) : '—'}</td><td className="rc-n">{x.girls_n ? mood(x.girls_score) : '—'}</td>
            <td className="rc-n">{x.popularity != null ? `${Math.round(x.popularity * 100)}%` : '—'}</td></tr>))}</tbody>
      </table>
      {sorted.length > 25 && <div className="sd-more"><Button variant="ghost" onClick={() => setAll(!all)}>{all ? 'Show the first 25' : `Show all ${sorted.length} dishes`}</Button></div>}
    </div>
  );
}
