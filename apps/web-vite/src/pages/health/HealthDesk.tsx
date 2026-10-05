import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Drawer, Field, Input, Select, StatCard } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, toast, useApi, useSession } from '@/lib/ui';

type Range = { gender: string; low: number | null; high: number | null; critical_low: number | null; critical_high: number | null; normal_text: string | null; note: string | null };
type Test = { test_code: string; panel_code: string; test_name: string; unit: string | null; loinc: string | null; value_type: 'Number' | 'Text'; decimals: number; method: string | null; derived: boolean; ranges: Range[] | null };
type Catalogue = { panels: { panel_code: string; panel_name: string; source: string; specimen: string | null }[]; tests: Test[] };
type Row = { student_id: string; name: string; gender: string; hostel_code: string | null; bed_label: string | null; floor_name: string | null; report_id: number | null; report_no: string | null;
  collected_at: string | null; reports: number; out_of_range: number; severe: number; see_doctor: boolean; bmi: number | null; bmi_flag: string | null; hb: number | null; hb_flag: string | null; findings: string | null };

const META = ['student_id', 'collected_at', 'source', 'device_ref', 'lab_name', 'device_notes'];
const CAPTURE = ['Gym_Manager', 'admin'];
const fmtD = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const download = (name: string, text: string, type = 'text/csv') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([`﻿${text}`], { type })); a.download = name; a.click(); };
const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const rangeText = (r?: Range, d = 1) => !r ? '' : r.normal_text ?? (r.low != null && r.high != null ? `${(+r.low).toFixed(d)}-${(+r.high).toFixed(d)}` : r.high != null ? `<${(+r.high).toFixed(d)}` : r.low != null ? `>${(+r.low).toFixed(d)}` : '');

/** A small CSV reader: quoted fields, commas and new lines inside quotes; rows starting with # are notes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((x) => x.replace(/^﻿/, '').trim())).filter((r) => r.some(Boolean) && !r[0].startsWith('#'));
}

/**
 * HLT-01 Health records. The Gym Manager captures results (equipment upload in the capture format, or typed in) and
 * everyone in care of the student sees their latest report: the Floor Warden for their floors, the Warden for the
 * hostel, the Dean, Students Affairs for all. Students who need a doctor come first.
 */
export default function HealthDesk() {
  const s = useSession()!;
  const navigate = useNavigate();
  const capture = CAPTURE.includes(s.role);
  const [q, setQ] = useState('');
  const [show, setShow] = useState<'all' | 'doctor' | 'out' | 'none'>('all');
  const list = useApi<Row[]>(`/health/students${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  const cat = useApi<Catalogue>('/health/catalogue');
  const [entry, setEntry] = useState(false);
  const [guide, setGuide] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const rows = list.data ?? [];
  const shown = rows.filter((r) => show === 'all' || (show === 'doctor' ? r.see_doctor : show === 'out' ? r.out_of_range > 0 : !r.report_id));
  const measured = rows.filter((r) => r.report_id);
  const cnt = (f: (r: Row) => boolean) => measured.filter(f).length;

  const template = () => {
    if (!cat.data) return;
    const codes = cat.data.tests.filter((t) => !t.derived).map((t) => t.test_code);
    const unitRow = ['# units', '', '', '', '', '', ...cat.data.tests.filter((t) => !t.derived).map((t) => t.unit ?? (t.value_type === 'Text' ? 'text' : ''))];
    const nameRow = ['# test', 'YYYY-MM-DD HH:MM', 'Device | Lab | Manual', 'equipment id', 'laboratory', 'equipment summary', ...cat.data.tests.filter((t) => !t.derived).map((t) => t.test_name)];
    download('health-capture-template.csv', [[...META, ...codes], nameRow, unitRow].map((r) => r.map(csvCell).join(',')).join('\n'));
  };
  const upload = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try {
      const grid = parseCsv(await f.text());
      if (grid.length < 2) throw new Error('The file has a header row but no students');
      const head = grid[0].map((h) => h.trim());
      if (!head.includes('student_id') || !head.includes('collected_at')) throw new Error('The first row must be the template header (student_id, collected_at, …)');
      const rowsIn = grid.slice(1).map((cells) => {
        const o: Record<string, string> = {}; head.forEach((h, i) => { o[h] = cells[i] ?? ''; });
        const results: Record<string, string> = {}; Object.entries(o).forEach(([k, v]) => { if (!META.includes(k) && v !== '') results[k] = v; });
        const d = new Date(o.collected_at.replace(' ', 'T'));
        const at = o.collected_at.length <= 10 ? `${o.collected_at}T08:00:00+05:30` : Number.isNaN(d.getTime()) ? o.collected_at : d.toISOString();
        return { student_id: o.student_id, collected_at: at, source: (o.source || 'Upload') as 'Upload', device_ref: o.device_ref || null, lab_name: o.lab_name || null, device_notes: o.device_notes || null, results };
      }).filter((r) => r.student_id && !r.student_id.startsWith('#'));
      const r = await api<{ saved: number; failed: { row: number; student_id: string; error: string }[] }>('/health/import', { method: 'POST', json: { rows: rowsIn } });
      toast(r.failed.length ? `${r.saved} reports saved; ${r.failed.length} rows not saved: ${r.failed.slice(0, 3).map((x) => `row ${x.row} ${x.student_id}: ${x.error}`).join('; ')}` : `${r.saved} reports saved`, r.failed.length ? 'warning' : 'success');
      list.mutate();
    } catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div className="klh-stack hd" style={{ gap: 16 }}>
      <ScreenHeader code="HLT-01" subtitle={capture ? 'Capture each student\'s health profile from the gym equipment or the laboratory; every report shows results against reference ranges, with suggestions for food and activity.'
        : 'Health reports of the students in your care, latest first among those who need attention. Each opening of a report is recorded.'}
        actions={capture ? <div className="klh-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" icon="file" onClick={() => setGuide(true)}>Capture format</Button>
          <Button variant="secondary" icon="upload" onClick={template}>Download template</Button>
          <Button variant="secondary" icon="upload" loading={busy} onClick={() => fileRef.current?.click()}>Upload results</Button>
          <Button variant="primary" icon="plus" onClick={() => setEntry(true)}>Enter results</Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => upload(e.target.files?.[0])} /></div> : undefined} />
      <div className="klh-grid-4">
        <StatCard color="indigo" icon="users" label="Students measured" value={`${measured.length}/${rows.length}`} sub={`${rows.length - measured.length} not yet`} />
        <StatCard color="rose" icon="alert" label="Should see a doctor" value={String(cnt((r) => r.see_doctor))} sub="From their latest report" tone={cnt((r) => r.see_doctor) ? 'critical' : undefined} />
        <StatCard color="amber" icon="heart" label="Low haemoglobin" value={String(cnt((r) => r.hb_flag === 'L' || r.hb_flag === 'LL'))} sub={`${cnt((r) => r.hb_flag === 'LL')} very low`} />
        <StatCard color="brand" icon="gauge" label="Weight outside healthy range" value={String(cnt((r) => !!r.bmi_flag && r.bmi_flag !== 'N'))} sub={`${cnt((r) => r.bmi_flag === 'H' || r.bmi_flag === 'HH')} over · ${cnt((r) => r.bmi_flag === 'L' || r.bmi_flag === 'LL')} under`} />
      </div>
      <section className="box hd-bar">
        <label className="sd-sel">Find<Input placeholder="Name, ID or room" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <div className="st-presets" role="group" aria-label="Show">{([['all', 'Everyone'], ['doctor', 'See a doctor'], ['out', 'Out of range'], ['none', 'Not measured']] as const).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={show === k} onClick={() => setShow(k)}>{l}</button>))}</div>
      </section>
      <section className="box hd-list" aria-label="Students">
        {!list.data && <p className="q-empty">Loading…</p>}
        {list.data && !shown.length && <p className="q-empty">No student matches.</p>}
        <ul>{shown.map((r) => (
          <li key={r.student_id}>
            <button type="button" disabled={!r.report_id} onClick={() => r.report_id && navigate(`/health/report/${r.report_id}`)}>
              <span className="hd-who"><b>{r.name}</b><small>{r.student_id} · {r.gender} · {r.bed_label ?? '—'}</small></span>
              <span className="hd-when">{r.report_id ? <><b>{fmtD(r.collected_at!)}</b><small>{r.reports} report{r.reports === 1 ? '' : 's'}</small></> : <small>Not measured yet</small>}</span>
              <span className="hd-key">{r.bmi != null && <span className={`hd-chip ${r.bmi_flag && r.bmi_flag !== 'N' ? 'hd-chip-off' : ''}`}>BMI {r.bmi.toFixed(1)}</span>}
                {r.hb != null && <span className={`hd-chip ${r.hb_flag && r.hb_flag !== 'N' ? 'hd-chip-off' : ''}`}>Hb {r.hb.toFixed(1)}</span>}</span>
              <span className="hd-find">{r.report_id ? (r.out_of_range ? <><b>{r.out_of_range} out of range</b><small>{r.findings}</small></> : <b className="hd-ok">All in range</b>) : null}</span>
              <span className="hd-flag">{r.see_doctor && <span className="xd-pill xd-t-bad">See a doctor</span>}</span>
            </button>
          </li>))}</ul>
      </section>
      {guide && cat.data && <FormatGuide cat={cat.data} onClose={() => setGuide(false)} onTemplate={template} />}
      {entry && cat.data && <EntryForm cat={cat.data} students={rows} onClose={() => setEntry(false)} onSaved={(id) => { setEntry(false); list.mutate(); navigate(`/health/report/${id}`); }} />}
    </div>
  );
}

/** The capture format: every column of the template with its unit, LOINC code and reference interval. */
function FormatGuide({ cat, onClose, onTemplate }: { cat: Catalogue; onClose: () => void; onTemplate: () => void }) {
  const csv = () => download('health-capture-format.csv', [['column', 'panel', 'test', 'unit', 'loinc', 'type', 'method', 'male range', 'female range', 'note', 'calculated'],
    ...META.map((m) => [m, 'Report', { student_id: 'University student ID (required)', collected_at: 'Date and time of the sitting (required)', source: 'Device, Lab or Manual', device_ref: 'Equipment serial or ID', lab_name: 'Laboratory name', device_notes: 'Text summary from the equipment' }[m]!, '', '', 'Text', '', '', '', '', '']),
    ...cat.tests.map((t) => { const m = t.ranges?.find((r) => r.gender === 'Male') ?? t.ranges?.find((r) => r.gender === 'Any'); const f = t.ranges?.find((r) => r.gender === 'Female') ?? t.ranges?.find((r) => r.gender === 'Any');
      return [t.test_code, cat.panels.find((p) => p.panel_code === t.panel_code)!.panel_name, t.test_name, t.unit ?? '', t.loinc ?? '', t.value_type, t.method ?? '', rangeText(m, t.decimals), rangeText(f, t.decimals), m?.note ?? '', t.derived ? 'yes, when not sent' : ''];
    })].map((r) => r.map((x) => csvCell(String(x))).join(',')).join('\n'));
  return (
    <Drawer open onClose={onClose} title="Health capture format" subtitle={`${cat.tests.length} tests in ${cat.panels.length} panels · one row per student per sitting`}
      footer={<div className="klh-row" style={{ gap: 8 }}><Button variant="primary" icon="upload" onClick={onTemplate}>Download template</Button><Button variant="secondary" icon="file" onClick={csv}>Download this list</Button></div>}>
      <div className="hd-guide">
        <p>The equipment or laboratory sends one row per student per sitting: the six report columns, then any of the test columns below (blank = not done). Values are numbers in the unit shown; urine colour, protein, glucose and ketones are words (Negative, Trace, 1+ …). BMI, VLDL, LDL and the cholesterol ratio are worked out when not sent. The equipment can also send the same as JSON to <code>POST /api/health/reports</code>: <code>{'{'}"student_id", "collected_at", "source", "results": {'{'}"HB": 13.4, …{'}'}{'}'}</code>.</p>
        {cat.panels.map((p) => (
          <section key={p.panel_code}><h4>{p.panel_name}<small>{p.source === 'Device' ? 'Gym equipment' : 'Laboratory'}{p.specimen ? ` · ${p.specimen}` : ''}</small></h4>
            <table><thead><tr><th>Column</th><th>Test</th><th>Unit</th><th>Men</th><th>Women</th><th>LOINC</th></tr></thead>
              <tbody>{cat.tests.filter((t) => t.panel_code === p.panel_code).map((t) => { const m = t.ranges?.find((r) => r.gender === 'Male') ?? t.ranges?.find((r) => r.gender === 'Any'); const f = t.ranges?.find((r) => r.gender === 'Female') ?? t.ranges?.find((r) => r.gender === 'Any');
                return <tr key={t.test_code}><td><code>{t.test_code}</code></td><td>{t.test_name}{t.derived && <small> (calculated)</small>}</td><td>{t.unit ?? (t.value_type === 'Text' ? 'word' : '')}</td><td>{rangeText(m, t.decimals)}</td><td>{rangeText(f, t.decimals)}</td><td>{t.loinc ?? '—'}</td></tr>; })}</tbody></table>
          </section>))}
      </div>
    </Drawer>
  );
}

/** Type in one sitting's results, panel by panel, each field showing its unit and range and turning red when outside it. */
function EntryForm({ cat, students, onClose, onSaved }: { cat: Catalogue; students: Row[]; onClose: () => void; onSaved: (reportId: number) => void }) {
  const [sid, setSid] = useState('');
  const [when, setWhen] = useState(() => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 16));
  const [source, setSource] = useState('Device');
  const [device, setDevice] = useState('');
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const gender = students.find((x) => x.student_id === sid)?.gender ?? 'Male';
  const rangeOf = (t: Test) => t.ranges?.find((r) => r.gender === gender) ?? t.ranges?.find((r) => r.gender === 'Any');
  const off = (t: Test) => { const v = vals[t.test_code]; const r = rangeOf(t); if (!v || !r || t.value_type === 'Text') return false; const n = Number(v); return (r.low != null && n < r.low) || (r.high != null && n > r.high); };
  const filled = Object.values(vals).filter(Boolean).length;
  const opts = useMemo(() => students.map((x) => ({ value: x.student_id, label: `${x.name} · ${x.student_id} · ${x.bed_label ?? ''}` })), [students]);
  const save = async () => {
    setBusy(true);
    try { const r = await api<{ report_id: number; report_no: string }>('/health/reports', { method: 'POST', json: { student_id: sid, collected_at: `${when}:00+05:30`, source, device_ref: device || null, results: vals } });
      toast(`Report ${r.report_no} saved`); onSaved(r.report_id); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); }
  };
  return (
    <Drawer open onClose={onClose} title="Enter health results" subtitle={`${filled} result${filled === 1 ? '' : 's'} filled · leave blank what was not measured`}
      footer={<Button variant="primary" loading={busy} blockedReason={!sid ? 'Choose the student.' : !filled ? 'Fill at least one result.' : undefined} onClick={save}>Save report</Button>}>
      <div className="hd-entry">
        <Field label="Student"><Select value={sid} onChange={(e) => setSid(e.target.value)} options={[{ value: '', label: 'Choose…' }, ...opts]} /></Field>
        <div className="hd-entry-row">
          <Field label="Collected"><Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></Field>
          <Field label="Source"><Select value={source} onChange={(e) => setSource(e.target.value)} options={[{ value: 'Device', label: 'Gym equipment' }, { value: 'Lab', label: 'Laboratory' }, { value: 'Manual', label: 'Measured by hand' }]} /></Field>
          <Field label="Equipment ID"><Input value={device} onChange={(e) => setDevice(e.target.value)} placeholder="BODY-01" /></Field>
        </div>
        {cat.panels.map((p) => (
          <details key={p.panel_code} open={p.source === 'Device'}><summary>{p.panel_name}<small>{cat.tests.filter((t) => t.panel_code === p.panel_code && vals[t.test_code]).length} filled</small></summary>
            <div className="hd-fields">{cat.tests.filter((t) => t.panel_code === p.panel_code && !t.derived).map((t) => (
              <label key={t.test_code} className={off(t) ? 'hd-off' : ''}>
                <span>{t.test_name}<small>{t.unit ?? ''}{rangeText(rangeOf(t), t.decimals) ? ` · ${rangeText(rangeOf(t), t.decimals)}` : ''}</small></span>
                <input inputMode={t.value_type === 'Number' ? 'decimal' : 'text'} value={vals[t.test_code] ?? ''} placeholder={t.value_type === 'Text' ? (rangeOf(t)?.normal_text ?? '') : ''}
                  onChange={(e) => setVals({ ...vals, [t.test_code]: e.target.value })} aria-label={`${t.test_name}${t.unit ? `, ${t.unit}` : ''}`} />
              </label>))}</div>
          </details>))}
      </div>
    </Drawer>
  );
}
