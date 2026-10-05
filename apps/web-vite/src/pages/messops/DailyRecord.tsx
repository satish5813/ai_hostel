import { useEffect, useState } from 'react';
import { Button, Input } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, toast, useApi, useSession } from '@/lib/ui';
import { mealName, num, todayIso, useMess } from './shared';

type Row = { meal: string; meals_planned: number | null; meals_served: number | null; prep_wastage_kg: number | null; plate_wastage_kg: number | null; menu_followed: boolean | null;
  deviation_reason: string | null; recorded_by_name: string | null; strength: number; scanned: number; issued_for: number };
type Edit = { meal: string; planned: string; served: string; prep: string; plate: string; followed: boolean; reason: string };
const WRITERS = ['Mess_Supervisor', 'Chief_Chef', 'Mess_Incharge', 'Mess_Manager', 'admin'];

/**
 * MES-06 Mess daily record. For each meal of a day: plates planned, plates served (the counter scans fill it in),
 * food wasted in the kitchen and on plates, and whether the menu was followed (and if not, why).
 */
export default function DailyRecord() {
  const { mess, picker } = useMess();
  const [date, setDate] = useState(todayIso());
  const r = useApi<Row[]>(mess ? `/mess-ops/daily?mess_id=${mess.mess_id}&date=${date}` : null);
  const [rows, setRows] = useState<Edit[]>([]);
  const [busy, setBusy] = useState(false);
  const can = WRITERS.includes(useSession()?.role ?? '');
  useEffect(() => {
    if (r.data) setRows(r.data.map((x) => ({ meal: x.meal, planned: String(x.meals_planned ?? x.strength), served: String(x.meals_served ?? (x.scanned || '')),
      prep: x.prep_wastage_kg == null ? '' : String(x.prep_wastage_kg), plate: x.plate_wastage_kg == null ? '' : String(x.plate_wastage_kg),
      followed: x.menu_followed ?? true, reason: x.deviation_reason ?? '' })));
  }, [r.data]);
  const set = (i: number, k: keyof Edit, v: string | boolean) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const save = async () => {
    setBusy(true);
    try {
      await api('/mess-ops/daily', { method: 'PUT', json: { mess_id: mess!.mess_id, record_date: date, meals: rows.map((x) => ({ meal: x.meal, meals_planned: Number(x.planned || 0),
        meals_served: x.served === '' ? null : Number(x.served), prep_wastage_kg: Number(x.prep || 0), plate_wastage_kg: Number(x.plate || 0), menu_followed: x.followed, deviation_reason: x.followed ? null : x.reason })) } });
      toast('Day saved'); r.mutate();
    } catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  const served = rows.reduce((a, x) => a + Number(x.served || 0), 0), waste = rows.reduce((a, x) => a + Number(x.prep || 0) + Number(x.plate || 0), 0);
  const recorded = r.data?.some((x) => x.meals_planned != null);
  const missing = rows.find((x) => !x.followed && !x.reason.trim());
  return (
    <div className="klh-stack mo" style={{ gap: 16 }}>
      <ScreenHeader code="MES-06" subtitle="Each meal of the day: plates planned and served, food wasted, and whether the menu was followed."
        actions={<div className="klh-row" style={{ gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>{picker}<label className="mo-pick">Day<Input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} /></label></div>} />
      <div className="box mo-table"><table className="mo-daily">
        <thead><tr><th>Meal</th><th className="r">Planned</th><th className="r">Served</th><th className="r">Kitchen waste kg</th><th className="r">Plate waste kg</th><th>Menu followed</th></tr></thead>
        <tbody>{rows.map((x, i) => { const src = r.data?.[i]; return (
          <tr key={x.meal}>
            <td><b>{mealName(x.meal)}</b><small>{src?.scanned ? `${src.scanned} scanned at the counter` : 'No scans'}{src?.issued_for ? ` · store issued for ${src.issued_for}` : ''}</small></td>
            <td className="r"><Input inputMode="numeric" value={x.planned} disabled={!can} onChange={(e) => set(i, 'planned', e.target.value)} aria-label={`${mealName(x.meal)} planned`} /></td>
            <td className="r"><Input inputMode="numeric" value={x.served} disabled={!can} onChange={(e) => set(i, 'served', e.target.value)} aria-label={`${mealName(x.meal)} served`} /></td>
            <td className="r"><Input inputMode="decimal" value={x.prep} disabled={!can} onChange={(e) => set(i, 'prep', e.target.value)} aria-label={`${mealName(x.meal)} kitchen waste`} /></td>
            <td className="r"><Input inputMode="decimal" value={x.plate} disabled={!can} onChange={(e) => set(i, 'plate', e.target.value)} aria-label={`${mealName(x.meal)} plate waste`} /></td>
            <td><label className="mo-check"><input type="checkbox" checked={x.followed} disabled={!can} onChange={(e) => set(i, 'followed', e.target.checked)} /> Yes</label>
              {!x.followed && <Input value={x.reason} disabled={!can} onChange={(e) => set(i, 'reason', e.target.value)} placeholder="What changed and why" aria-label={`${mealName(x.meal)} reason`} />}</td>
          </tr>); })}</tbody>
      </table></div>
      <div className="klh-row mo-foot" style={{ gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span><b>{num(served, 0)}</b> plates served · <b>{num(waste, 1)} kg</b> wasted{served ? ` · ${num((waste * 1000) / served, 0)} g a plate` : ''}</span>
        {recorded && <span className="mo-muted">Recorded by {r.data?.find((x) => x.recorded_by_name)?.recorded_by_name ?? '—'}</span>}
        {can && <Button variant="primary" icon="check" loading={busy} blockedReason={missing ? `${mealName(missing.meal)}: say why the menu changed.` : undefined} onClick={save}>{recorded ? 'Update the day' : 'Save the day'}</Button>}
      </div>
    </div>
  );
}
