import { useRef, useState } from 'react';
import { Button, Drawer, Icon, Notice, StatusChip, formatDateTime } from '@/lib/klh';
import { api, ApiError } from '@/lib/api';
import { downloadCsv, normHeader, readSheetFile, type Sheet } from '@/lib/sheet';
import { Meter, Panel } from '@/ui/kit';
import { titleCase, toast, useApi, words } from '@/lib/ui';

type Col = { key: string; label: string; required: boolean; hint: string | null; sample: string; accepts: string[] };
type Batch = { batch_id: number; source: string; file_name: string; received_at: string; rows_total: number; rows_ok: number; rows_failed: number; status: string; processed_by: string | null; processed_by_name?: string | null; error_report?: string | null };
export type Kind = { kind: string; order: number; title: string; target: string; note: string; records: number; last: Batch | null; columns: Col[] };
type RowError = { row: number; key?: string; message: string };
type Result = { ok: number; failed: number; errors: RowError[] };
const CHUNK = 500;
const ICON: Record<string, 'building' | 'key' | 'bed' | 'wallet' | 'receipt' | 'bolt' | 'users' | 'shield' | 'user'> = { hostels: 'building', room_types: 'key', rooms: 'bed', fees: 'wallet', assets: 'receipt', meters: 'bolt', staff: 'users', duties: 'shield', students: 'user' };

export const templateCsv = (k: Kind) => downloadCsv(`${k.order}-${k.kind}-template.csv`, [k.columns.map((c) => c.key), k.columns.map((c) => c.sample)]);

/**
 * Bulk upload of masters. One line per master, in set-up order: how many records there are, how the last upload went,
 * a template to fill, and Upload. The file is read in the browser, checked row by row by the server, and only then loaded.
 */
export default function UploadCentre() {
  const kinds = useApi<Kind[]>('/admin/import/kinds');
  const batches = useApi<Batch[]>('/admin/import/batches');
  const [open, setOpen] = useState<Kind | null>(null);
  const [log, setLog] = useState<Batch | null>(null);
  const template = (k: Kind) => templateCsv(k);
  return (
    <div className="ui-bento">
      <Panel className="ui-c8" flush title="Upload a master" sub="Work down the list. Each file is checked row by row before anything is saved.">
        <div className="ui-up">
          {kinds.data?.map((k) => (
            <div key={k.kind} className="ui-up-row">
              <span className="ui-up-no">{k.order}</span>
              <span className="ui-up-icon"><Icon name={ICON[k.kind] ?? 'file'} size={16} /></span>
              <div className="ui-up-main"><div className="ui-up-title">{k.title}</div><div className="ui-up-note">{k.note}</div></div>
              <div className="ui-up-count"><b>{k.records.toLocaleString('en-IN')}</b><span>records</span></div>
              <div className="ui-up-last">{k.last ? <><StatusChip status={k.last.status} label={k.last.status === 'Partially_Completed' ? `${k.last.rows_failed} refused` : words(k.last.status)} /><span>{formatDateTime(k.last.received_at)}</span></> : <span>Never uploaded</span>}</div>
              <div className="ui-up-actions">
                <Button size="sm" variant="ghost" icon="download" onClick={() => template(k)}>Template</Button>
                <Button size="sm" variant="primary" icon="upload" onClick={() => setOpen(k)}>Upload</Button>
              </div>
            </div>))}
        </div>
      </Panel>

      <Panel className="ui-c4" title="Recent uploads" sub="Every upload is kept: file, rows, who and when">
        {batches.data?.length ? batches.data.slice(0, 9).map((b) => (
          <button key={b.batch_id} type="button" className="ui-row ui-row-btn" onClick={() => setLog(b)}>
            <div style={{ minWidth: 0 }}><div className="ui-row-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.file_name}</div><div className="ui-row-sub">{b.rows_ok.toLocaleString('en-IN')} of {b.rows_total.toLocaleString('en-IN')} rows, {formatDateTime(b.received_at)}</div></div>
            <StatusChip status={b.status} label={b.status === 'Partially_Completed' ? `${b.rows_failed} refused` : words(b.status)} />
          </button>)) : <p className="klh-muted" style={{ margin: 0 }}>Nothing uploaded yet.</p>}
      </Panel>

      {open && <UploadDrawer kind={open} onClose={() => setOpen(null)} onDone={() => { kinds.mutate(); batches.mutate(); }} onTemplate={() => template(open)} />}
      <Drawer open={!!log} onClose={() => setLog(null)} title={log?.file_name ?? ''} subtitle={log ? `${words(log.source)}, ${formatDateTime(log.received_at)}, by ${log.processed_by_name ? titleCase(log.processed_by_name) : log.processed_by ?? 'system'}` : undefined}>
        {log && (
          <div className="klh-stack" style={{ gap: 14 }}>
            <Tally read={log.rows_total} ok={log.rows_ok} failed={log.rows_failed} okLabel="Loaded" />
            {log.error_report ? <div><p className="klh-overline">Refused rows</p><pre className="ui-up-report">{log.error_report}</pre></div> : <Notice tone="success" title="Every row was loaded" />}
          </div>)}
      </Drawer>
    </div>
  );
}

function Tally({ read, ok, failed, okLabel }: { read: number; ok: number; failed: number; okLabel: string }) {
  return (
    <div className="ui-up-tally">
      <div><b>{read.toLocaleString('en-IN')}</b><span>Rows read</span></div>
      <div><b style={{ color: 'var(--success-fg)' }}>{ok.toLocaleString('en-IN')}</b><span>{okLabel}</span></div>
      <div><b style={{ color: failed ? 'var(--critical-fg)' : undefined }}>{failed.toLocaleString('en-IN')}</b><span>Refused</span></div>
    </div>
  );
}

export function UploadDrawer({ kind, onClose, onDone, onTemplate }: { kind: Kind; onClose: () => void; onDone: () => void; onTemplate: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [phase, setPhase] = useState<'pick' | 'checking' | 'checked' | 'loading' | 'done'>('pick');
  const [progress, setProgress] = useState(0);
  const [check, setCheck] = useState<Result | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [problem, setProblem] = useState('');
  const [over, setOver] = useState(false);

  const accepts = new Map<string, Col>(); kind.columns.forEach((c) => c.accepts.forEach((a) => accepts.set(a, c)));
  const kept = (sheet?.headers ?? []).filter((h) => accepts.has(normHeader(h)));
  const dropped = (sheet?.headers ?? []).filter((h) => !accepts.has(normHeader(h)));
  const found = new Set(kept.map((h) => accepts.get(normHeader(h))!.key));
  const missing = kind.columns.filter((c) => c.required && !found.has(c.key));
  /** Only the columns this master knows are sent. Anything else (identity numbers, bank details) stays in the browser. */
  const slim = (rows: Record<string, string>[]) => rows.map((r) => Object.fromEntries(kept.map((h) => [h, r[h]])));

  const run = async (path: 'check' | 'load', sh: Sheet, name: string): Promise<Result> => {
    const total: Result = { ok: 0, failed: 0, errors: [] }; let batch: number | undefined;
    for (let off = 0; off < sh.rows.length; off += CHUNK) {
      const rows = sh.rows.slice(off, off + CHUNK).map((r) => Object.fromEntries(Object.entries(r).filter(([h]) => accepts.has(normHeader(h)))));
      const res = await api<Result & { batch_id?: number }>(`/admin/import/${kind.kind}/${path}`, { method: 'POST', json: path === 'check' ? { rows, offset: off } : { rows, offset: off, rows_total: sh.rows.length, file_name: name, batch_id: batch } });
      batch = res.batch_id ?? batch; total.ok += res.ok; total.failed += res.failed; if (total.errors.length < 60) total.errors.push(...res.errors);
      setProgress(Math.min(sh.rows.length, off + CHUNK));
    }
    return total;
  };
  const choose = async (f: File | undefined) => {
    if (!f) return;
    setProblem(''); setFile(f); setCheck(null); setResult(null); setProgress(0);
    try {
      const sh = await readSheetFile(f);
      if (!sh.rows.length) throw new Error('The file has a header but no rows');
      setSheet(sh); setPhase('checking');
      setCheck(await run('check', sh, f.name)); setPhase('checked');
    } catch (e) { setSheet(null); setPhase('pick'); setProblem(e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e)); }
  };
  const load = async () => {
    if (!sheet || !file) return;
    setPhase('loading'); setProgress(0);
    try { const r = await run('load', sheet, file.name); setResult(r); setPhase('done'); onDone(); toast(`${r.ok.toLocaleString('en-IN')} ${kind.title.toLowerCase()} rows loaded${r.failed ? `, ${r.failed} refused` : ''}`, r.failed ? 'warning' : 'success'); }
    catch (e) { setPhase('checked'); setProblem(e instanceof ApiError ? e.message : String(e)); onDone(); }
  };
  const reset = () => { setFile(null); setSheet(null); setCheck(null); setResult(null); setPhase('pick'); setProblem(''); if (input.current) input.current.value = ''; };
  const busy = phase === 'checking' || phase === 'loading';

  return (
    <Drawer open onClose={onClose} title={`Upload ${kind.title.toLowerCase()}`} subtitle={kind.note}
      footer={phase === 'checked' && check ? <div className="klh-row" style={{ justifyContent: 'flex-end' }}><Button variant="ghost" onClick={reset}>Choose another file</Button><Button variant="primary" icon="upload" blockedReason={missing.length ? `Column missing: ${missing.map((m) => m.label).join(', ')}.` : !check.ok ? 'No row passed the check.' : undefined} onClick={load}>Load {check.ok.toLocaleString('en-IN')} rows</Button></div>
        : phase === 'done' ? <div className="klh-row" style={{ justifyContent: 'flex-end' }}><Button variant="ghost" onClick={reset}>Upload another file</Button><Button variant="primary" onClick={onClose}>Done</Button></div> : undefined}>
      <div className="klh-stack" style={{ gap: 16 }}>
        <input ref={input} type="file" accept=".csv,.xlsx,.txt" hidden onChange={(e) => choose(e.target.files?.[0])} />

        {phase === 'pick' && (<>
          <button type="button" className={`ui-drop${over ? ' ui-drop-over' : ''}`} onClick={() => input.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); choose(e.dataTransfer.files?.[0]); }}>
            <span className="ui-drop-icon"><Icon name="upload" size={20} /></span>
            <span className="ui-drop-title">Drop the file here, or choose it</span>
            <span className="ui-drop-sub">CSV or Excel (.xlsx). The first row holds the column names.</span>
          </button>
          {problem && <Notice tone="critical" title="The file could not be used">{problem}</Notice>}
          <div>
            <div className="klh-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}><span className="klh-overline">Columns</span><Button size="sm" variant="soft" icon="download" onClick={onTemplate}>Download template</Button></div>
            <div className="ui-cols">{kind.columns.map((c) => <span key={c.key} className={`ui-col${c.required ? ' ui-col-req' : ''}`} title={c.hint ?? undefined}>{c.label}</span>)}</div>
            <p className="klh-muted" style={{ fontSize: 12, margin: '8px 0 0' }}>Darker columns are needed. Column names in your file can be these or the ERP export's own names; any other column is ignored and never leaves this computer.</p>
          </div>
        </>)}

        {busy && sheet && (
          <div className="klh-stack" style={{ gap: 10 }}>
            <div className="ui-up-file"><Icon name="file" size={16} /><span>{file?.name}</span></div>
            <Meter value={progress} max={sheet.rows.length} />
            <p className="klh-muted" style={{ margin: 0, fontSize: 13 }}>{phase === 'checking' ? 'Checking' : 'Loading'} {progress.toLocaleString('en-IN')} of {sheet.rows.length.toLocaleString('en-IN')} rows</p>
          </div>)}

        {phase === 'checked' && check && sheet && (<>
          <div className="ui-up-file"><Icon name="file" size={16} /><span>{file?.name}</span></div>
          <Tally read={sheet.rows.length} ok={check.ok} failed={check.failed} okLabel="Ready to load" />
          {problem && <Notice tone="critical" title="Loading stopped">{problem}</Notice>}
          {missing.length > 0 && <Notice tone="critical" title="A needed column is missing">{missing.map((m) => m.label).join(', ')}. Add it to the file, or start from the template.</Notice>}
          <div><p className="klh-overline">Columns used</p><div className="ui-cols">{kept.map((h) => <span key={h} className="ui-col ui-col-req">{accepts.get(normHeader(h))!.label}</span>)}</div></div>
          {dropped.length > 0 && <div><p className="klh-overline">Ignored, not sent</p><div className="ui-cols">{dropped.map((h) => <span key={h} className="ui-col ui-col-off">{h}</span>)}</div></div>}
          <Preview rows={slim(sheet.rows.slice(0, 4))} headers={kept.slice(0, 5)} label={(h) => accepts.get(normHeader(h))!.label} />
          <Refused errors={check.errors} total={check.failed} />
        </>)}

        {phase === 'done' && result && sheet && (<>
          <Notice tone={result.failed ? 'warning' : 'success'} title={result.failed ? `${result.ok.toLocaleString('en-IN')} rows loaded, ${result.failed.toLocaleString('en-IN')} refused` : `All ${result.ok.toLocaleString('en-IN')} rows loaded`}>Uploading the same file again is safe: existing records are updated, not duplicated.</Notice>
          <Tally read={sheet.rows.length} ok={result.ok} failed={result.failed} okLabel="Loaded" />
          <Refused errors={result.errors} total={result.failed} />
        </>)}
      </div>
    </Drawer>
  );
}

function Preview({ rows, headers, label }: { rows: Record<string, string>[]; headers: string[]; label: (h: string) => string }) {
  if (!rows.length) return null;
  return (
    <div><p className="klh-overline">First rows</p>
      <div style={{ overflowX: 'auto' }}><table className="klh-table ui-up-preview"><thead><tr>{headers.map((h) => <th key={h}>{label(h)}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{headers.map((h) => <td key={h}>{r[h]}</td>)}</tr>)}</tbody></table></div>
    </div>
  );
}
function Refused({ errors, total }: { errors: RowError[]; total: number }) {
  if (!total) return null;
  return (
    <div><p className="klh-overline">Refused rows {total > errors.length ? `(first ${errors.length} of ${total.toLocaleString('en-IN')})` : ''}</p>
      <div className="ui-up-errors">{errors.slice(0, 40).map((e, i) => <div key={i}><span className="klh-code">Row {e.row}</span>{e.key && <span className="klh-code klh-muted">{e.key}</span>}<span>{e.message}</span></div>)}</div>
      <p className="klh-muted" style={{ fontSize: 12, margin: '8px 0 0' }}>Correct these rows in the file and upload it again; the rows already loaded are not duplicated.</p>
    </div>
  );
}
