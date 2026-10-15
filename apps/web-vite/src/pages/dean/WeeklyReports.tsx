import { useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import { Button, Drawer, Field, Textarea, formatDate, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import { useAction, useApi, useSession } from '@/lib/ui';
import { Chip, RaHead } from '@/pages/office/ra-kit';

type Metrics = { residents: number; nights_marked: number; absences: number; outings: number; late_returns: number; sick_leaves: number; cases: number; repeat_absentees: number };
type Floor = Metrics & { floor_no: number; floor_name: string; on_pass: number; on_sick: number; repeat_absentees: { student_id: string; full_name: string; nights: number }[] };
type Item = { report_id: number; facility_id: string; hostel_code: string; facility_name: string; week_start: string; metrics: Metrics; status: string; cw_remarks: string | null; sent_at: string | null; read_at: string | null; sent_by_name: string | null };
type Detail = Item & { week_end: string; floors: Floor[]; generated_at: string; read_by_name: string | null };
const STATE: Record<string, { label: string; tone: 'neu' | 'warn' | 'ok' }> = { Draft: { label: 'With Chief Manager', tone: 'neu' }, Sent: { label: 'Sent, not read', tone: 'warn' }, Read: { label: 'Read by the Dean', tone: 'ok' } };
const lastMonday = () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7); return d.toISOString().slice(0, 10); };

/**
 * RPT-10 Weekly floor report: each Monday the system prepares last week per hostel, floor by floor. The Chief Manager adds
 * remarks and sends it; the Dean, Students Affairs reads it here (and is told by e-mail and in the app).
 */
export default function WeeklyReports() {
  const s = useSession()!;
  const cw = s.role === 'Chief_Warden';
  const list = useApi<Item[]>('/weekly-reports');
  const [sel, setSel] = useState<number | null>(null);
  const { run, busy } = useAction();
  const weeks = [...new Set((list.data ?? []).map((x) => x.week_start))];
  return (
    <div className="ra-main ov dn">
      <RaHead eyebrow="Weekly floor report" tone="#C2410C" title={cw ? 'Reports for the Dean' : 'Reports from the hostels'}
        sub={cw ? 'Prepared every Monday for last week. Read it, add your remarks and send it to the Dean, Students Affairs.' : 'Sent each week by the Chief Managers: absences, outings, sick leave and discipline, floor by floor.'}
        right={cw ? <Button variant="secondary" loading={busy} onClick={() => run(() => api('/weekly-reports/build', { method: 'POST', json: { week: lastMonday() } }).then(() => list.mutate()), 'Last week\'s reports are up to date')}><RefreshCw size={15} /> Refresh last week</Button> : undefined} />
      {list.data && !weeks.length && <section className="ov-card"><p className="ov-none">{cw ? 'No report yet. Refresh last week to prepare one.' : 'No report has been sent yet.'}</p></section>}
      {weeks.map((w) => (
        <section key={w} className="ov-card" aria-label={`Week of ${w}`}>
          <header><h2>Week of {formatDate(w)}</h2><small>Monday to Sunday</small></header>
          <div className="dn-weeks">{(list.data ?? []).filter((x) => x.week_start === w).map((x) => (
            <button key={x.report_id} type="button" className={`dn-week${x.status === 'Sent' && !cw ? ' dn-week-new' : ''}`} onClick={() => setSel(x.report_id)}>
              <span className="dn-week-top"><b>{x.hostel_code}</b><Chip tone={STATE[x.status].tone}>{STATE[x.status].label}</Chip></span>
              <small>{x.facility_name} · {x.metrics.residents} hostel students</small>
              <span className="dn-week-m">
                <span><b className={x.metrics.absences ? 'dn-attn-tx' : ''}>{x.metrics.absences}</b>absences</span>
                <span><b>{x.metrics.outings}</b>outings</span>
                <span><b className={x.metrics.late_returns ? 'dn-attn-tx' : ''}>{x.metrics.late_returns}</b>late</span>
                <span><b>{x.metrics.sick_leaves}</b>sick</span>
                <span><b className={x.metrics.cases ? 'dn-attn-tx' : ''}>{x.metrics.cases}</b>cases</span>
              </span>
            </button>))}</div>
        </section>))}
      {sel && <ReportPanel id={sel} cw={cw} onClose={() => { setSel(null); list.mutate(); }} />}
    </div>
  );
}

function ReportPanel({ id, cw, onClose }: { id: number; cw: boolean; onClose: () => void }) {
  const r = useApi<Detail>(`/weekly-reports/${id}`);
  const [remarks, setRemarks] = useState('');
  const { run, busy } = useAction();
  const d = r.data;
  const draft = d?.status === 'Draft';
  return (
    <Drawer open onClose={onClose} title={d ? `${d.hostel_code} · week of ${formatDate(d.week_start)}` : 'Weekly report'} subtitle={d ? `${formatDate(d.week_start)} to ${formatDate(d.week_end)} · ${d.facility_name}` : ''}
      footer={d && cw && draft ? <Button variant="primary" loading={busy} onClick={() => run(() => api(`/weekly-reports/${id}/send`, { method: 'POST', json: { remarks } }).then(onClose), 'Sent to the Dean')}>Send to the Dean</Button>
        : <Button variant="secondary" onClick={() => window.print()}><Printer size={15} /> Print</Button>}>
      {!d ? <p className="klh-muted">Loading…</p> : (
        <div className="klh-stack dn-report" style={{ gap: 14 }}>
          <div className="dn-kpis dn-kpis-sm">
            {([['Residents', d.metrics.residents], ['Absences', d.metrics.absences], ['Nights marked', d.metrics.nights_marked], ['Outings', d.metrics.outings], ['Late returns', d.metrics.late_returns], ['Sick leave', d.metrics.sick_leaves], ['Discipline', d.metrics.cases], ['Absent 2+ nights', d.metrics.repeat_absentees]] as [string, number][]).map(([l, v]) => (
              <div key={l} className={`dn-kpi${['Absences', 'Late returns', 'Discipline', 'Absent 2+ nights'].includes(l) && v > 0 ? ' dn-kpi-attn' : ''}`}><small>{l}</small><b>{v}</b></div>))}
          </div>
          <div className="ov-scroll">
            <table className="ov-table dn-table">
              <thead><tr><th>Floor</th><th>Residency students</th><th>Absent</th><th>On pass</th><th>Sick</th><th>Outings</th><th>Late</th><th>Cases</th></tr></thead>
              <tbody>{d.floors.map((f) => (
                <tr key={f.floor_no}>
                  <th scope="row">{f.floor_name}{f.repeat_absentees.length > 0 && <small className="dn-names">Absent 2+ nights: {f.repeat_absentees.map((x) => `${x.full_name} (${x.nights})`).join(', ')}</small>}</th>
                  <td data-label="Residency students">{f.residents}</td>
                  <td data-label="Absent"><span className={f.absences ? 'dn-attn-tx' : 'klh-muted'}>{f.absences}</span><small className="klh-muted"> / {f.nights_marked}</small></td>
                  <td data-label="On pass">{f.on_pass}</td><td data-label="Sick">{f.on_sick}</td><td data-label="Outings">{f.outings}</td>
                  <td data-label="Late"><span className={f.late_returns ? 'dn-attn-tx' : ''}>{f.late_returns}</span></td>
                  <td data-label="Cases"><span className={f.cases ? 'dn-attn-tx' : ''}>{f.cases}</span></td>
                </tr>))}</tbody>
            </table>
          </div>
          {cw && draft ? <Field label="Your remarks for the Dean" hint="What happened, what you did, what you need"><Textarea rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="For example: two students absent twice; parents called; one late return under inquiry." /></Field>
            : <div className="dn-block"><small>Chief Manager's remarks</small><p>{d.cw_remarks ?? 'No remarks.'}</p><small>{d.sent_by_name ? `Sent by ${d.sent_by_name}` : ''}{d.sent_at ? ` on ${formatDateTime(d.sent_at)}` : ''}{d.read_at ? ` · read ${formatDateTime(d.read_at)}` : ''}</small></div>}
          <p className="klh-muted" style={{ fontSize: 12 }}>Prepared {formatDateTime(d.generated_at)} from the roll call, gate passes, sick leave and the discipline register.</p>
        </div>)}
    </Drawer>
  );
}
