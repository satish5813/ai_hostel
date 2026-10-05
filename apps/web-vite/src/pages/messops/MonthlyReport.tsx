import { useState } from 'react';
import { Button, Input, StatCard } from '@/lib/klh';
import { ScreenHeader, useApi } from '@/lib/ui';
import { day, downloadCsv, inr, mealName, num, todayIso, useMess } from './shared';

type Report = {
  mess: { mess_id: number; mess_name: string; strength: number }; month: string;
  totals: { days_recorded: number; planned: number; served: number; prep_kg: number; plate_kg: number; deviations: number; scans: number; provisions_cost: number; cost_per_meal: number | null; plate_g_per_meal: number | null };
  by_meal: { meal: string; planned: number; served: number; wastage_kg: number }[];
  days: { record_date: string; served: number; wastage_kg: number }[];
  deviations: { record_date: string; meal: string; deviation_reason: string }[];
  provisions: { name: string; base_unit: string; qty: number; value: number }[];
  received: { value: number; receipts: number };
  grievances: { grievances: number; closed: number; significant_meals: number };
  ratings: { meal: string; avg: number; n: number; positive: number; negative: number }[];
};

/** Vertical bars for one measure a day; thin marks, one hue, the value on hover. */
function DayBars({ rows, value, unit, label }: { rows: { record_date: string }[]; value: (r: never) => number; unit: string; label: string }) {
  const vals = rows.map((r) => value(r as never));
  const max = Math.max(1, ...vals);
  const W = 640, H = 150, pad = 26, bw = (W - pad) / Math.max(rows.length, 1);
  const ticks = [0, max / 2, max];
  return (
    <figure className="mo-chart">
      <figcaption>{label}</figcaption>
      <div className="mo-chart-scroll">
        <svg viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label={label}>
          {ticks.map((t) => { const y = H - (t / max) * (H - 8); return <g key={t}><line x1={pad} x2={W} y1={y} y2={y} className="mo-grid" /><text x={pad - 4} y={y + 4} textAnchor="end" className="mo-axis">{num(t, 0)}</text></g>; })}
          {rows.map((r, i) => { const v = vals[i]; const h = (v / max) * (H - 8); const x = pad + i * bw + bw * 0.15; return (
            <g key={r.record_date}><rect x={x} y={H - h} width={bw * 0.7} height={Math.max(h, 0.5)} rx={2} className="mo-bar"><title>{`${day(r.record_date)}: ${num(v, 1)} ${unit}`}</title></rect>
              {(i === 0 || i === rows.length - 1 || new Date(r.record_date).getDate() % 7 === 1) && <text x={x + bw * 0.35} y={H + 16} textAnchor="middle" className="mo-axis">{new Date(r.record_date).getDate()}</text>}</g>); })}
        </svg>
      </div>
    </figure>
  );
}

/**
 * MES-07 Mess monthly report: plates planned and served, attendance, food wasted per plate, provisions used and their
 * cost per plate, menu changes, complaints and ratings, for one mess and month. Download as CSV for the file.
 */
export default function MonthlyReport() {
  const { mess, picker } = useMess();
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const r = useApi<Report>(mess ? `/mess-ops/monthly?mess_id=${mess.mess_id}&month=${month}` : null);
  const d = r.data;
  const t = d?.totals;
  const csv = () => d && downloadCsv(`MES-07-${d.mess.mess_name.replace(/\s+/g, '-')}-${month}.csv`, [
    ['Mess monthly report', d.mess.mess_name, month], [],
    ['Days recorded', t!.days_recorded], ['Plates planned', t!.planned], ['Plates served', t!.served], ['Counter scans', t!.scans],
    ['Kitchen waste kg', t!.prep_kg], ['Plate waste kg', t!.plate_kg], ['Plate waste g per plate', t!.plate_g_per_meal], ['Provisions used (Rs)', t!.provisions_cost], ['Cost per plate (Rs)', t!.cost_per_meal],
    ['Goods received (Rs)', d.received.value], ['Complaints', d.grievances.grievances], ['Significant meals', d.grievances.significant_meals], [],
    ['Meal', 'Planned', 'Served', 'Waste kg'], ...d.by_meal.map((m) => [mealName(m.meal), m.planned, m.served, m.wastage_kg]), [],
    ['Provision', 'Quantity', 'Unit', 'Value (Rs)'], ...d.provisions.map((p) => [p.name, p.qty, p.base_unit, p.value]), [],
    ['Menu changes'], ...d.deviations.map((x) => [x.record_date, mealName(x.meal), x.deviation_reason])]);
  const att = t && t.planned ? (100 * t.served) / t.planned : null;
  return (
    <div className="klh-stack mo" style={{ gap: 16 }}>
      <ScreenHeader code="MES-07" subtitle="The month for one mess: plates, attendance, waste, provisions and cost per plate, menu changes, complaints and ratings."
        actions={<div className="klh-row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>{picker}
          <label className="mo-pick">Month<Input type="month" value={month} max={todayIso().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} /></label>
          <Button variant="secondary" icon="download" disabled={!d} onClick={csv}>Download CSV</Button></div>} />
      {d && t && !t.days_recorded && <div className="box mm-empty"><b>No daily records for {month}</b><p>The report fills in from the Mess daily record (MES-06).</p></div>}
      {d && t && t.days_recorded > 0 && (
        <>
          <div className="klh-grid-4">
            <StatCard color="brand" icon="utensils" label="Plates served" value={num(t.served, 0)} sub={`${att != null ? `${num(att, 0)}% of ${num(t.planned, 0)} planned` : ''} · ${t.days_recorded} days`} />
            <StatCard color="indigo" icon="wallet" label="Cost per plate" value={t.cost_per_meal != null ? inr(t.cost_per_meal) : '—'} sub={`${inr(t.provisions_cost)} of provisions used`} />
            <StatCard color="amber" icon="trash" label="Plate waste" value={t.plate_g_per_meal != null ? `${t.plate_g_per_meal} g` : '—'} sub={`a plate · ${num(t.prep_kg + t.plate_kg, 0)} kg in all`} />
            <StatCard color="rose" icon="inbox" label="Complaints" value={String(d.grievances.grievances)} sub={`${d.grievances.significant_meals} significant meal${d.grievances.significant_meals === 1 ? '' : 's'} · ${d.grievances.closed} closed`} />
          </div>
          <section className="box mo-charts">
            <DayBars rows={d.days} value={(x: { served: number }) => x.served} unit="plates" label="Plates served each day" />
            <DayBars rows={d.days} value={(x: { wastage_kg: number }) => x.wastage_kg} unit="kg" label="Food wasted each day (kitchen and plates, kg)" />
          </section>
          <div className="mo-two">
            <section className="box mo-table"><h3>By meal</h3><table>
              <thead><tr><th>Meal</th><th className="r">Planned</th><th className="r">Served</th><th className="r">Attendance</th><th className="r">Waste kg</th><th className="r">Rating</th></tr></thead>
              <tbody>{d.by_meal.map((m) => { const rt = d.ratings.find((x) => x.meal === m.meal); return (
                <tr key={m.meal}><td><b>{mealName(m.meal)}</b></td><td className="r">{num(m.planned, 0)}</td><td className="r">{num(m.served, 0)}</td>
                  <td className="r">{m.planned ? `${num((100 * m.served) / m.planned, 0)}%` : '—'}</td><td className="r">{num(m.wastage_kg, 1)}</td>
                  <td className="r">{rt ? `${num(rt.avg, 1)} / 5 (${rt.n})` : '—'}</td></tr>); })}</tbody>
            </table></section>
            <section className="box mo-table"><h3>Provisions used</h3><table>
              <thead><tr><th>Item</th><th className="r">Quantity</th><th className="r">Value</th></tr></thead>
              <tbody>{d.provisions.slice(0, 12).map((p) => <tr key={p.name}><td>{p.name}</td><td className="r">{num(p.qty, 1)} {p.base_unit}</td><td className="r">{inr(p.value)}</td></tr>)}</tbody>
            </table>{d.provisions.length > 12 && <p className="mo-muted">and {d.provisions.length - 12} more in the CSV</p>}</section>
          </div>
          {d.deviations.length > 0 && <section className="box"><h3>Menu changes</h3><ul className="mo-dev">{d.deviations.map((x) => <li key={x.record_date + x.meal}><b>{day(x.record_date)}, {mealName(x.meal)}</b> {x.deviation_reason}</li>)}</ul></section>}
        </>)}
    </div>
  );
}
