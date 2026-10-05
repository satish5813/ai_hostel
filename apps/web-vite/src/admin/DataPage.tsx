import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Button, ConfirmDialog, Drawer, Icon, Notice, StatusChip, formatDate, formatINR } from '@/lib/klh';
import { api, ApiError } from '@/lib/api';
import { downloadCsv } from '@/lib/sheet';
import { toast, useApi, words } from '@/lib/ui';
import { UploadDrawer, templateCsv, type Kind } from '@/pages/admin/Upload';
import { OPTIONS, dataKind, type DataKind, type GridCol } from './registry';

type Row = Record<string, string | number | null>;
type ListResult = { rows: Row[]; total: number; page: number; size: number; sort: string; dir: 'asc' | 'desc'; id: string; filters: string[]; facets: Record<string, string[]>; status: { on: string; off: string } | null };
const FILTER_LABEL: Record<string, string> = { hostel_code: 'Hostel', floor_no: 'Floor', category: 'Kind', room_type: 'Room type', status: 'Status', gender: 'Gender', academic_year: 'Year', condition: 'Condition', meter_type: 'Type', dept_code: 'Department', staff_type: 'Type', hostel_role: 'Duty', shift: 'Shift', student_type: 'Level', programme: 'Programme', hosteller: 'Hosteller' };

function useDebounced<T>(v: T, ms = 300) { const [d, setD] = useState(v); useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]); return d; }

function cell(c: GridCol, r: Row) {
  const v = r[c.key];
  if (v === null || v === undefined || v === '') return <span className="dm-empty">—</span>;
  switch (c.format) {
    case 'money': return <span className="dm-num">{formatINR(Number(v))}</span>;
    case 'num': return <span className="dm-num">{Number(v).toLocaleString('en-IN')}</span>;
    case 'pct': return <span className="dm-num">{Number(v)}%</span>;
    case 'date': return formatDate(String(v));
    case 'yesno': return v === 'Yes' ? <span className="dm-yes"><Icon name="check" size={14} />Yes</span> : <span className="dm-empty">No</span>;
    case 'status': return <StatusChip status={String(v)} />;
    case 'code': return <span className="dm-code">{v}</span>;
    case 'strong': return <span className="dm-strong">{String(v)}{c.sub && r[c.sub] ? <small>{r[c.sub]}</small> : null}</span>;
    default: return words(String(v));
  }
}
const right = (c: GridCol) => c.format === 'num' || c.format === 'money' || c.format === 'pct';

/**
 * One master as a full-screen table: search, filter, sort and page in the database; a row opens in a side panel to edit,
 * Add opens the same panel empty, Upload takes a file. The page fills the window at any size; on phones rows become cards.
 */
export default function DataPage() {
  const { kind = '' } = useParams();
  const def = dataKind(kind);
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [open, setOpen] = useState<Row | 'new' | null>(null);
  const [upload, setUpload] = useState(false);
  const [preset, setPreset] = useState<Row | null>(null);
  const shown = useRef(kind);
  useEffect(() => {
    // another master: start clean; "?new=1" and "?upload=1" (from the operations board) open the panel straight away
    if (shown.current !== kind) { shown.current = kind; setQ(''); setFilters({}); setSort(null); setPage(0); setOpen(null); setUpload(false); }
    // "?f_hostel_role=Sweeper" starts filtered; "?new=1&p_hostel_role=Sweeper" opens the form filled in (Mapping centre)
    const wantNew = params.get('new'), wantUpload = params.get('upload');
    const f = Object.fromEntries([...params.entries()].filter(([k]) => k.startsWith('f_')).map(([k, v]) => [k.slice(2), v]));
    const p = Object.fromEntries([...params.entries()].filter(([k]) => k.startsWith('p_')).map(([k, v]) => [k.slice(2), v]));
    if (Object.keys(f).length) setFilters(f);
    setPreset(Object.keys(p).length ? p : null);
    if (wantNew) setOpen('new');
    if (wantUpload) setUpload(true);
    if (wantNew || wantUpload || Object.keys(f).length || Object.keys(p).length) setParams({}, { replace: true });
  }, [kind, params, setParams]);
  useEffect(() => { setPage(0); }, [dq, filters, size]);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ q: dq, page: String(page), size: String(size) });
    if (sort) { p.set('sort', sort.key); p.set('dir', sort.dir); }
    Object.entries(filters).forEach(([k, v]) => v && p.set(`f_${k}`, v));
    return p.toString();
  }, [dq, page, size, sort, filters]);
  const list = useApi<ListResult>(def ? `/admin/data/${kind}?${qs}` : null);
  const kinds = useApi<Kind[]>('/admin/import/kinds');
  const importKind = kinds.data?.find((k) => k.kind === kind);
  if (!def) return <Notice tone="warning" title="No such data list">Choose a master from the menu.</Notice>;

  const d = list.data;
  const from = d ? d.page * d.size + 1 : 0; const to = d ? Math.min(d.total, (d.page + 1) * d.size) : 0;
  const active = Object.values(filters).filter(Boolean).length + (dq ? 1 : 0);
  const exportAll = async () => {
    try {
      const rows = await api<Row[]>(`/admin/data/${kind}/export?${qs}`);
      const keys = rows.length ? Object.keys(rows[0]) : def.columns.map((c) => c.key);
      downloadCsv(`${kind}-${new Date().toISOString().slice(0, 10)}.csv`, [keys, ...rows.map((r) => keys.map((k) => (r[k] ?? '') as string))]);
      toast(`${rows.length.toLocaleString('en-IN')} rows exported`);
    } catch (e) { toast(e instanceof ApiError ? e.message : String(e), 'critical'); }
  };
  const sortBy = (k: string) => setSort((s) => (s?.key === k ? (s.dir === 'asc' ? { key: k, dir: 'desc' } : null) : { key: k, dir: 'asc' }));

  return (
    <div className="dm">
      <header className="dm-head">
        <span className={`dm-head-icon klh-tile-${def.color}`}><Icon name={def.icon} size={18} /></span>
        <div className="dm-head-text">
          <h1>{def.title}<span className="dm-count">{d ? d.total.toLocaleString('en-IN') : ''}</span></h1>
          <p>{def.about}</p>
        </div>
        <div className="dm-head-actions">
          <Button size="sm" variant="ghost" icon="download" onClick={exportAll}>Export</Button>
          {importKind && <Button size="sm" variant="secondary" icon="upload" onClick={() => setUpload(true)}>Upload</Button>}
          {def.editable || def.addable ? <Button size="sm" variant="primary" icon="plus" onClick={() => setOpen('new')}>Add {def.one}</Button> : null}
        </div>
      </header>

      <div className="dm-tools">
        <label className="dm-search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${def.title.toLowerCase()}`} aria-label={`Search ${def.title}`} />{q && <button type="button" aria-label="Clear search" onClick={() => setQ('')}><Icon name="x" size={14} /></button>}</label>
        {d?.filters.map((f) => (d.facets[f]?.length ?? 0) > 1 && (
          <select key={f} className={`dm-filter${filters[f] ? ' dm-filter-on' : ''}`} value={filters[f] ?? ''} onChange={(e) => setFilters({ ...filters, [f]: e.target.value })} aria-label={`Filter by ${FILTER_LABEL[f] ?? f}`}>
            <option value="">{FILTER_LABEL[f] ?? words(f)}: all</option>
            {d.facets[f].map((v) => <option key={v} value={v}>{words(v)}</option>)}
          </select>))}
        {active > 0 && <button type="button" className="dm-clear" onClick={() => { setQ(''); setFilters({}); }}>Clear</button>}
      </div>

      <div className="dm-grid" role="region" aria-label={`${def.title} table`} tabIndex={0}>
        <table>
          <thead><tr>{def.columns.map((c) => (
            <th key={c.key} style={c.width ? { width: c.width } : undefined} className={right(c) ? 'dm-r' : undefined} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              <button type="button" onClick={() => sortBy(c.key)}>{c.label}{sort?.key === c.key ? <Icon name={sort.dir === 'asc' ? 'chevron-down' : 'chevron-left'} size={12} /> : null}</button>
            </th>))}</tr></thead>
          <tbody>
            {!d && Array.from({ length: 8 }, (_, i) => <tr key={i} className="dm-skel">{def.columns.map((c) => <td key={c.key}><span /></td>)}</tr>)}
            {d?.rows.map((r) => {
              const id = String(r[d.id]);
              return (
                <tr key={id} tabIndex={0} aria-selected={open !== 'new' && open?.[d.id] === r[d.id]} onClick={() => setOpen(r)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(r); }}>
                  {def.columns.map((c) => <td key={c.key} data-label={c.label} className={right(c) ? 'dm-r' : undefined}>{cell(c, r)}</td>)}
                </tr>);
            })}
          </tbody>
        </table>
        {d && d.rows.length === 0 && (
          <div className="dm-none">
            <Icon name={def.icon} size={22} />
            <b>{active ? 'Nothing matches' : `No ${def.title.toLowerCase()} yet`}</b>
            <span>{active ? 'Change the search or the filters.' : 'Add one, or upload a file.'}</span>
            {active ? <Button size="sm" variant="secondary" onClick={() => { setQ(''); setFilters({}); }}>Clear search and filters</Button>
              : importKind && <Button size="sm" variant="primary" icon="upload" onClick={() => setUpload(true)}>Upload a file</Button>}
          </div>)}
      </div>

      <footer className="dm-foot">
        <span>{d ? (d.total ? `${from.toLocaleString('en-IN')}–${to.toLocaleString('en-IN')} of ${d.total.toLocaleString('en-IN')}` : '0 records') : 'Loading…'}</span>
        <span className="dm-foot-r">
          <label className="dm-size">Rows <select value={size} onChange={(e) => setSize(Number(e.target.value))}>{[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <button type="button" className="dm-pg" aria-label="Previous page" disabled={!d || d.page === 0} onClick={() => setPage(page - 1)}><Icon name="chevron-left" size={16} /></button>
          <button type="button" className="dm-pg" aria-label="Next page" disabled={!d || to >= d.total} onClick={() => setPage(page + 1)}><Icon name="chevron-right" size={16} /></button>
        </span>
      </footer>

      {open && <RecordPanel def={def} importKind={importKind} row={open === 'new' ? null : open} preset={preset} status={d?.status ?? null} idKey={d?.id ?? ''} onClose={() => setOpen(null)} onSaved={() => list.mutate()} />}
      {upload && importKind && <UploadDrawer kind={importKind} onClose={() => setUpload(false)} onDone={() => { list.mutate(); kinds.mutate(); }} onTemplate={() => templateCsv(importKind)} />}
    </div>
  );
}

/** The side panel: every field of the record, the fixed ones read-only, Save and Activate or Deactivate. */
function RecordPanel({ def, importKind, row, preset, status, idKey, onClose, onSaved }: { def: DataKind; importKind?: Kind; row: Row | null; preset?: Row | null; status: ListResult['status']; idKey: string; onClose: () => void; onSaved: () => void }) {
  const isNew = !row;
  const fields = (importKind?.columns ?? []).filter((c) => !def.hidden?.includes(c.key));
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => { const src = row ?? preset; return [f.key, src?.[f.key] === null || src?.[f.key] === undefined ? '' : String(src[f.key])]; })));
  useEffect(() => { setForm(Object.fromEntries(fields.map((f) => { const src = row ?? preset; return [f.key, src?.[f.key] === null || src?.[f.key] === undefined ? '' : String(src[f.key])]; }))); }, [row, importKind]);   // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [confirm, setConfirm] = useState(false);
  const hostels = useApi<{ rows: Row[] }>(fields.some((f) => f.key === 'hostel_code') ? '/admin/data/hostels?size=500' : null);
  const types = useApi<{ rows: Row[] }>(fields.some((f) => f.key === 'room_type') ? '/admin/data/room_types?size=500' : null);
  const options = (key: string) => key === 'hostel_code' ? hostels.data?.rows.map((h) => String(h.hostel_code)) : key === 'room_type' ? types.data?.rows.map((t) => String(t.type_name)) : def.options?.[key] ?? OPTIONS[key];
  const extra = row ? def.columns.filter((c) => !fields.some((f) => f.key === c.key) && c.key !== 'status' && c.key !== idKey) : [];
  const missing = fields.filter((f) => f.required && !(form[f.key] ?? '').trim()).map((f) => f.label);
  const isOn = !row || !status || row.status === status.on;
  const title = isNew ? `Add ${def.one}` : String(row[def.columns[0].key] ?? row[idKey]);

  const save = async () => {
    setBusy(true); setProblem('');
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim() !== ''));
      await api(`/admin/import/${def.kind}/save`, { method: 'POST', json: { row: body } });
      toast(isNew ? `${def.one.charAt(0).toUpperCase() + def.one.slice(1)} added` : 'Saved'); onSaved(); onClose();
    } catch (e) { setProblem(e instanceof ApiError ? e.message : String(e)); } finally { setBusy(false); }
  };
  const toggle = async () => {
    setConfirm(false); setBusy(true);
    try { await api(`/admin/data/${def.kind}/${encodeURIComponent(String(row![idKey]))}/status`, { method: 'POST', json: { active: !isOn } }); toast(isOn ? `Marked ${words(status!.off).toLowerCase()}` : 'Marked active'); onSaved(); onClose(); }
    catch (e) { setProblem(e instanceof ApiError ? e.message : String(e)); } finally { setBusy(false); }
  };
  const canEdit = isNew || def.editable;

  return (
    <>
    <Drawer open onClose={onClose} title={title} subtitle={isNew ? def.about : row?.status ? `${def.title} · ${words(String(row.status))}` : def.title}
      footer={<div className="dm-panel-foot">
        {!isNew && status && (isOn ? <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>{status.off === 'Ended' ? 'End duty' : `Mark ${words(status.off).toLowerCase()}`}</Button> : status.off !== 'Ended' && <Button variant="secondary" size="sm" onClick={toggle}>Mark active</Button>)}
        <span style={{ flex: 1 }} />
        <Button variant="ghost" size="sm" onClick={onClose}>{canEdit ? 'Cancel' : 'Close'}</Button>
        {canEdit && <Button variant="primary" size="sm" loading={busy} blockedReason={missing.length ? `Fill ${missing.slice(0, 2).join(', ')}${missing.length > 2 ? '…' : ''}.` : undefined} onClick={save}>{isNew ? 'Add' : 'Save changes'}</Button>}
      </div>}>
      <div className="dm-panel">
        {extra.length > 0 && <div className="dm-facts">{extra.map((c) => <div key={c.key}><span>{c.label}</span><b>{cell(c, row!)}</b></div>)}</div>}
        {problem && <Notice tone="critical" title="Not saved">{problem}</Notice>}
        {!canEdit && <Notice tone="info" title="Duties are added or ended, not edited">To change a duty, end it and add the new one.</Notice>}
        {!importKind && <p className="dm-empty">Loading the form…</p>}
        <div className="dm-form">
          {fields.map((f) => {
            const locked = !isNew && (def.locked.includes(f.key) || !canEdit);
            const opts = options(f.key);
            const date = /date|_on$|expiry/.test(f.key);
            return (
              <label key={f.key} className={`dm-field${locked ? ' dm-locked' : ''}`}>
                <span className="dm-label">{f.label}{f.required && !locked ? <i aria-hidden="true">*</i> : null}{locked && <Icon name="lock" size={12} />}</span>
                {locked ? <span className="dm-value">{(form[f.key] ?? '') ? words((form[f.key] ?? '')) : '—'}</span>
                  : opts ? <select value={(form[f.key] ?? '')} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} required={f.required}><option value="">{f.required ? 'Choose' : 'Not set'}</option>{opts.map((o) => <option key={o} value={o}>{words(o)}</option>)}</select>
                  : <input type={date ? 'date' : 'text'} value={date ? (form[f.key] ?? '').slice(0, 10) : (form[f.key] ?? '')} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.sample || undefined} required={f.required} />}
                {f.hint && !locked && !opts && <small>{f.hint}</small>}
              </label>);
          })}
        </div>
        {!isNew && <p className="dm-note"><Icon name="lock" size={12} />Locked fields identify the record. To change them, mark this one inactive and add a new one.</p>}
      </div>
    </Drawer>
    <ConfirmDialog open={confirm} title={status?.off === 'Ended' ? 'End this duty?' : `Mark ${title} ${words(status?.off ?? '').toLowerCase()}?`} body={status?.off === 'Ended' ? 'The person loses this scope today. The record is kept.' : 'It stays in the records and can be marked active again.'} tone="danger" confirmLabel={status?.off === 'Ended' ? 'End duty' : `Mark ${words(status?.off ?? '').toLowerCase()}`} onCancel={() => setConfirm(false)} onConfirm={toggle} />
    </>
  );
}
