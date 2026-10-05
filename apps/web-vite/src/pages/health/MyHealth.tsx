import { useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { useApi } from '@/lib/ui';
import { HealthReport } from './HealthReport';

type Item = { report_id: number; report_no: string; collected_at: string; source: string; results: number; out_of_range: number };

/** HLT-03 My health: the student's health reports, latest first, each in the laboratory-report layout with suggestions. */
export default function MyHealth() {
  const r = useApi<Item[]>('/me/health');
  const [sel, setSel] = useState<number | null>(null);
  const list = r.data ?? [];
  const id = sel ?? list[0]?.report_id ?? null;
  return (
    <div className="st mh">
      <section className="st-panel mn-head">
        <div className="mn-title"><span className="st-ico mn-ico"><HeartPulse size={20} /></span>
          <span><h1>My health</h1><small>From the gym's health equipment and the laboratory. Your Floor Warden, Warden, the Gym Manager and the Dean can see it.</small></span></div>
      </section>
      {r.data && !list.length && <section className="st-panel"><p className="st-empty">No health report yet. Your first check-up at the gym appears here.</p></section>}
      {list.length > 1 && (
        <div className="st-presets mh-tabs" role="tablist" aria-label="Reports">{list.map((x) => (
          <button key={x.report_id} type="button" role="tab" aria-pressed={x.report_id === id} onClick={() => setSel(x.report_id)}>
            {new Date(x.collected_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}<small>{x.out_of_range ? `${x.out_of_range} to watch` : 'All in range'}</small></button>))}
        </div>)}
      {id && <div className="mh-report"><HealthReport id={id} /></div>}
    </div>
  );
}
