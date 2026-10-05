import { useNavigate, useParams } from 'react-router';
import { Activity, AlertTriangle, ArrowDownRight, ArrowLeft, ArrowRightLeft, ArrowUpRight, Cpu, Dumbbell, Eye, Printer, Stethoscope, Utensils } from 'lucide-react';
import { Logo } from '@/ui/kit';
import { useApi } from '@/lib/ui';

type Result = { panel_code: string; panel_name: string; specimen: string | null; test_code: string; test_name: string; unit: string | null; method: string | null; decimals: number;
  value_type: string; value_num: number | null; value_text: string | null; flag: string; low: number | null; high: number | null; normal_text: string | null; note: string | null; previous: number | null };
type Advice = { area: 'Food' | 'Activity' | 'Doctor'; finding: string; advice: string; mess_tip: string | null; test_code: string; flag: string };
export type ReportData = {
  report: { report_id: number; report_no: string; student_id: string; collected_at: string; reported_at: string; source: string; device_ref: string | null; lab_name: string | null;
    device_notes: string | null; name: string; gender: string; date_of_birth: string; programme: string; blood_group: string | null; hostel_name: string | null; bed_label: string | null;
    entered_by_name: string | null; photo: string | null };
  results: Result[]; advice: Advice[]; views: { role_code: string; n: number; last: string }[];
};
const FLAG: Record<string, { label: string; mark: string; cls: string }> = {
  L: { label: 'Low', mark: 'L', cls: 'hr-low' }, LL: { label: 'Very low', mark: 'LL', cls: 'hr-low hr-sev' }, H: { label: 'High', mark: 'H', cls: 'hr-high' },
  HH: { label: 'Very high', mark: 'HH', cls: 'hr-high hr-sev' }, A: { label: 'Abnormal', mark: '*', cls: 'hr-high' },
};
const dt = (s: string) => new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const age = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 864e5));
const fmt = (v: number | null, d: number) => (v == null ? '' : v.toFixed(d));
const interval = (r: Result) => r.normal_text ?? (r.low != null && r.high != null ? `${fmt(r.low, r.decimals)} – ${fmt(r.high, r.decimals)}` : r.high != null ? `< ${fmt(r.high, r.decimals)}` : r.low != null ? `> ${fmt(r.low, r.decimals)}` : '—');

/** HLT-02 Health report, laid out like a diagnostic laboratory report. `id` from the route, or given by a parent page. */
export default function HealthReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <div className="hr-page">
      <div className="hr-tools">
        <button type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} />Back</button>
        <button type="button" onClick={() => window.print()}><Printer size={16} />Print or save as PDF</button>
      </div>
      {id && <HealthReport id={Number(id)} />}
    </div>
  );
}

export function HealthReport({ id }: { id: number }) {
  const r = useApi<ReportData>(`/health/reports/${id}`);
  if (r.error) return <p className="hr-empty">{(r.error as Error).message}</p>;
  if (!r.data) return <p className="hr-empty">Loading the report…</p>;
  const { report: h, results, advice, views } = r.data;
  const panels = [...new Set(results.map((x) => x.panel_code))];
  const flagged = results.filter((x) => FLAG[x.flag]);
  const doctor = advice.filter((a) => a.area === 'Doctor'), food = advice.filter((a) => a.area === 'Food'), act = advice.filter((a) => a.area === 'Activity');
  return (
    <article className="hr" aria-label={`Health report ${h.report_no}`}>
      <header className="hr-head">
        <div className="hr-brand"><Logo cut="mark" height={40} /><span><b>KL University Hostels</b><small>Student Health and Fitness Centre</small></span></div>
        <div className="hr-title"><b>Health report</b><small>{h.report_no}</small></div>
      </header>

      <section className="hr-patient">
        {h.photo ? <img src={h.photo} alt="" className="hr-photo" /> : <span className="hr-photo hr-initials">{h.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>}
        <dl>
          <div><dt>Name</dt><dd><b>{h.name}</b></dd></div>
          <div><dt>Student ID</dt><dd className="hr-mono">{h.student_id}</dd></div>
          <div><dt>Age / Gender</dt><dd>{age(h.date_of_birth)} years / {h.gender}</dd></div>
          <div><dt>Blood group</dt><dd>{h.blood_group ?? '—'}</dd></div>
          <div><dt>Programme</dt><dd>{h.programme}</dd></div>
          <div><dt>Hostel / Room</dt><dd>{h.hostel_name ?? '—'}{h.bed_label ? ` · ${h.bed_label}` : ''}</dd></div>
          <div><dt>Collected</dt><dd>{dt(h.collected_at)}</dd></div>
          <div><dt>Reported</dt><dd>{dt(h.reported_at)}</dd></div>
          <div><dt>Source</dt><dd>{h.source === 'Device' ? 'Gym equipment' : h.source}{h.device_ref ? ` · ${h.device_ref}` : ''}{h.lab_name ? ` · ${h.lab_name}` : ''}</dd></div>
        </dl>
      </section>

      <section className={`hr-summary ${flagged.length ? '' : 'hr-summary-ok'}`}>
        {flagged.length ? <><AlertTriangle size={18} /><span><b>{flagged.length} result{flagged.length === 1 ? '' : 's'} outside the reference range</b>
          <small>{flagged.map((x) => `${x.test_name} (${FLAG[x.flag].label.toLowerCase()})`).join(' · ')}</small></span></>
          : <><Activity size={18} /><span><b>All results within the reference range</b><small>Keep up the balanced diet and regular activity.</small></span></>}
      </section>

      {panels.map((p) => { const rows = results.filter((x) => x.panel_code === p); return (
        <section key={p} className="hr-panel">
          <h3>{rows[0].panel_name}{rows[0].specimen && <small>{rows[0].specimen}</small>}</h3>
          <table className="hr-table">
            <thead><tr><th>Test</th><th className="r">Result</th><th>Unit</th><th>Biological ref. interval</th><th className="r hr-prev">Previous</th></tr></thead>
            <tbody>{rows.map((x) => { const f = FLAG[x.flag]; const v = x.value_type === 'Text' ? x.value_text : fmt(x.value_num, x.decimals);
              const ch = x.previous != null && x.value_num != null ? x.value_num - x.previous : null;
              return (
                <tr key={x.test_code} className={f ? f.cls : ''}>
                  <td><b>{x.test_name}</b>{x.method && <small>{x.method}</small>}</td>
                  <td className="r hr-val">{v}{f && <em title={f.label}>{f.mark}</em>}</td>
                  <td>{x.unit ?? ''}</td>
                  <td>{interval(x)}{x.note && <small>{x.note}</small>}</td>
                  <td className="r hr-prev">{x.previous != null ? <span>{fmt(x.previous, x.decimals)}{ch != null && Math.abs(ch) > 10 ** -x.decimals / 2 && (ch > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)}</span> : '—'}</td>
                </tr>); })}</tbody>
          </table>
        </section>); })}

      <section className="hr-advice">
        <h3>Suggestions</h3>
        <p className="hr-small">Based on this report, as general guidance for wellness. They are not a diagnosis: a doctor's advice comes first.</p>
        {doctor.length > 0 && (
          <div className="hr-box hr-doc"><h4><Stethoscope size={17} />See a doctor</h4>
            <ul>{doctor.map((a, i) => <li key={i}><b>{a.finding}.</b> {a.advice}</li>)}</ul></div>)}
        <div className="hr-cols">
          <div className="hr-box hr-food"><h4><Utensils size={17} />Food</h4>
            {food.length ? <ul>{food.map((a, i) => <li key={i}><b>{a.finding}.</b> {a.advice}{a.mess_tip && <span className="hr-tip">In the mess: {a.mess_tip}</span>}</li>)}</ul>
              : <p>A balanced plate at every meal: half vegetables and salad, a quarter dal, paneer, egg or other protein, a quarter rice, roti or millet; curd daily; water through the day.</p>}</div>
          <div className="hr-box hr-act"><h4><Dumbbell size={17} />Physical activity</h4>
            {act.length ? <ul>{act.map((a, i) => <li key={i}><b>{a.finding}.</b> {a.advice}</li>)}</ul>
              : <p>At least 150 minutes a week of brisk walking, sport, cycling or swimming, and strength training twice a week; 7-8 hours of sleep.</p>}</div>
        </div>
      </section>

      {h.device_notes && <section className="hr-device"><Cpu size={16} /><span><b>Equipment's own summary</b><small>{h.device_notes}</small></span></section>}

      <footer className="hr-foot">
        <span>Entered by {h.entered_by_name ?? 'the gym equipment'} · Reference intervals are for young adults and may differ from the laboratory's own.</span>
        {views.length > 0 && <span className="hr-views"><Eye size={13} />Seen by {views.map((v) => `${v.role_code.replace(/_/g, ' ')} (${v.n})`).join(', ')}</span>}
        <span className="hr-end"><ArrowRightLeft size={12} />End of report</span>
      </footer>
    </article>
  );
}

