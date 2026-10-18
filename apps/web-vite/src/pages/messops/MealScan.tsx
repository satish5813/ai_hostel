import { useEffect, useRef, useState } from 'react';
import { Ban, CheckCircle2, CircleAlert, HeartPulse, ScanLine } from 'lucide-react';
import { SegmentedControl } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, useApi } from '@/lib/ui';
import { MEALS, mealName, mealNow, useMess, type Meal } from './shared';

type Result = { result: 'ok' | 'already' | 'not_subscribed' | 'other_mess' | 'sick' | 'unknown'; message: string;
  student?: { student_id: string; name: string; photo: string | null; bed_label: string | null; diet: string | null; cuisine: string | null } };
type Summary = { scanned: number; strength: number; sick: number; recent: { student_id: string; name: string; scanned_at: string }[] };
const LOOK: Record<Result['result'], { cls: string; icon: typeof CheckCircle2; title: string }> = {
  ok: { cls: 'mo-ok', icon: CheckCircle2, title: 'Allowed' }, already: { cls: 'mo-warn', icon: CircleAlert, title: 'Already eaten' },
  not_subscribed: { cls: 'mo-bad', icon: Ban, title: 'No rasoi plan' }, other_mess: { cls: 'mo-bad', icon: Ban, title: 'Other rasoi' },
  sick: { cls: 'mo-warn', icon: HeartPulse, title: 'On sick leave' }, unknown: { cls: 'mo-bad', icon: Ban, title: 'Not found' },
};

/**
 * MES-04 Meal scan at the counter. The ID card scanner types the student ID and Enter (or the supervisor types it);
 * the screen says at once whether the student may eat here now, and counts the meal.
 */
export default function MealScan() {
  const { mess, picker } = useMess();
  const [meal, setMeal] = useState<Meal>(mealNow());
  const [id, setId] = useState('');
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const sum = useApi<Summary>(mess ? `/mess-ops/scan?mess_id=${mess.mess_id}&meal=${meal}` : null);
  useEffect(() => { input.current?.focus(); }, [meal, mess, res]);
  const scan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mess || !id.trim() || busy) return;
    setBusy(true);
    try { setRes(await api<Result>('/mess-ops/scan', { method: 'POST', json: { mess_id: mess.mess_id, meal, student_id: id } })); sum.mutate(); }
    catch (err) { setRes({ result: 'unknown', message: (err as Error).message }); } finally { setBusy(false); setId(''); }
  };
  const s = sum.data;
  const look = res ? LOOK[res.result] : null;
  return (
    <div className="klh-stack mo" style={{ gap: 16 }}>
      <ScreenHeader code="MES-04" subtitle="Scan or type the student ID at the counter; the screen says at once whether the student may eat here." actions={picker} />
      <section className="box rd-bar"><SegmentedControl label="Meal" value={meal} onChange={(v) => { setMeal(v as Meal); setRes(null); }} options={MEALS.map((m) => ({ value: m, label: mealName(m) }))} /></section>
      <div className="mo-scan">
        <form className="box mo-scan-in" onSubmit={scan}>
          <label htmlFor="mo-id"><ScanLine size={18} /> Student ID</label>
          <input id="mo-id" ref={input} value={id} onChange={(e) => setId(e.target.value)} autoComplete="off" inputMode="text" placeholder="Scan or type the ID" disabled={!mess} />
          <div className={`mo-result ${look?.cls ?? ''}`} aria-live="assertive">
            {res && look ? (
              <>
                {res.student?.photo ? <img src={res.student.photo} alt="" /> : <span className="mo-face">{(res.student?.name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>}
                <span><b><look.icon size={20} /> {look.title}</b><strong>{res.student?.name ?? ''}</strong><small>{res.message}{res.student?.bed_label ? ` · ${res.student.bed_label}` : ''}{res.student?.diet ? ` · ${res.student.diet}` : ''}</small></span>
              </>) : <span className="mo-muted">Waiting for the next student</span>}
          </div>
        </form>
        <section className="box mo-count">
          <div><b>{s?.scanned ?? '—'}</b><small>of {s?.strength ?? '—'} eaten {mealName(meal).toLowerCase()}</small></div>
          <div className="bar"><i style={{ width: `${s && s.strength ? Math.min(100, (100 * s.scanned) / s.strength) : 0}%` }} /></div>
          <small>{s?.sick ?? 0} on sick leave get the meal in their room</small>
          <ol>{s?.recent.map((x) => <li key={x.student_id}><span>{x.name}</span><small>{new Date(x.scanned_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</small></li>)}</ol>
        </section>
      </div>
    </div>
  );
}
