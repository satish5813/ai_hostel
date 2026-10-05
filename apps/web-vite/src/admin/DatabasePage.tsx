import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Database, FileText, KeyRound, Link2, Search, X } from 'lucide-react';
import { Button, ConfirmDialog, Drawer, Icon, Notice } from '@/lib/klh';
import { api, ApiError } from '@/lib/api';
import { downloadCsv } from '@/lib/sheet';
import { toast, useApi, words } from '@/lib/ui';

type Table = { schema: string; table: string; rows: number; cols: number; ref: string | null; name: string | null; per: string | null; wf: string | null; group: string; in_doc: boolean; read_only: boolean };
type Col = { name: string; type: string; udt: string; nullable: boolean; default: string | null; pk: boolean; identity: boolean; generated: boolean; fk: string | null; options: string[] | null; doc: string | null };
type Row = Record<string, unknown>;
type Page = { columns: Col[]; rows: Row[]; total: number; page: number; size: number; sort: string; dir: 'asc' | 'desc'; meta?: Table };
const AUDIT = new Set(['created_at', 'created_by', 'updated_at', 'updated_by']);

function useDebounced<T>(v: T, ms = 300) { const [d, setD] = useState(v); useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]); return d; }
const key = (t: Pick<Table, 'schema' | 'table'>) => `${t.schema}.${t.table}`;
/** Workflow groups in the document's order, then the masters and shared tables, then the rest by schema. */
const groupRank = (g: string) => (g.startsWith('Workflow ') ? g.charCodeAt(9) - 65 : g === 'Masters' ? 20 : g === 'Shared by all workflows' ? 21 : 30);

function show(c: Col, v: unknown) {
  if (v === null || v === undefined || v === '') return <span className="dm-empty">—</span>;
  if (typeof v === 'boolean') return v ? <span className="dm-yes"><Icon name="check" size={14} />Yes</span> : <span className="dm-empty">No</span>;
  if (typeof v === 'object') return <span className="dbx-json">{JSON.stringify(v)}</span>;
  const s = String(v);
  if (c.udt === 'timestamptz' || c.udt === 'timestamp') return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  if (c.pk || c.fk) return <span className="dm-code">{s}</span>;
  if (c.options) return words(s);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}
const numeric = (c: Col) => /^(int|numeric|float)/.test(c.udt);

/**
 * Every table in the hostel database, grouped the way the data model document groups them (Workflows A to N, masters,
 * shared), with its rows. Rows can be added, edited and deleted; the database still applies every rule and trigger, and
 * every change lands in the audit log under the administrator's name.
 */
export default function DatabasePage() {
  const [params, setParams] = useSearchParams();
  const cat = useApi<Table[]>('/db/catalog');
  const [find, setFind] = useState('');
  const sel = params.get('t') ?? '';
  const pick = (t: Table) => setParams({ t: key(t) }, { replace: true });
  const tables = cat.data ?? [];
  const cur = tables.find((t) => key(t) === sel) ?? null;

  const groups = useMemo(() => {
    const f = find.trim().toLowerCase();
    const hit = tables.filter((t) => !f || t.table.includes(f.replace(/\s+/g, '_')) || (t.name ?? '').toLowerCase().includes(f) || (t.ref ?? '').toLowerCase().includes(f));
    const m = new Map<string, Table[]>();
    for (const t of hit) m.set(t.group, [...(m.get(t.group) ?? []), t]);
    return [...m.entries()].sort((a, b) => groupRank(a[0]) - groupRank(b[0]) || a[0].localeCompare(b[0]));
  }, [tables, find]);
  const docCount = tables.filter((t) => t.in_doc).length;

  return (
    <div className="dbx">
      <nav className="dbx-rail" aria-label="Tables">
        <div className="dbx-rail-head">
          <b>Database</b><span>{tables.length ? `${tables.length} tables · ${docCount} from the data model` : 'Loading…'}</span>
          <label className="dm-search"><Search size={15} /><input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a table" aria-label="Find a table" />{find && <button type="button" aria-label="Clear" onClick={() => setFind('')}><X size={14} /></button>}</label>
        </div>
        <div className="dbx-rail-list">
          {groups.map(([g, list]) => (
            <section key={g}>
              <h2>{g}</h2>
              {list.map((t) => (
                <button key={key(t)} type="button" aria-current={sel === key(t)} onClick={() => pick(t)}>
                  {t.ref && <span className="dbx-ref">{t.ref}</span>}
                  <span className="dbx-tname">{words(t.name ?? t.table)}</span>
                  <em>{t.rows.toLocaleString('en-IN')}</em>
                </button>))}
            </section>))}
          {cat.data && !groups.length && <p className="dm-empty dbx-pad">No table matches.</p>}
        </div>
      </nav>
      <section className="dbx-main">
        {cur ? <TableView key={key(cur)} t={cur} onChanged={() => cat.mutate()} />
          : <div className="dm-none dbx-start"><Database size={26} /><b>Choose a table</b><span>The list follows the data model document: Workflows A to N, then the masters and the shared tables. Tables the document does not name are grouped by area.</span></div>}
      </section>
    </div>
  );
}

function TableView({ t, onChanged }: { t: Table; onChanged: () => void }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [sort, setSort] = useState<{ k: string; dir: 'asc' | 'desc' } | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [open, setOpen] = useState<Row | 'new' | null>(null);
  const [about, setAbout] = useState(false);
  useEffect(() => setPage(0), [dq, size]);
  const qs = new URLSearchParams({ q: dq, page: String(page), size: String(size), ...(sort ? { sort: sort.k, dir: sort.dir } : {}) }).toString();
  const res = useApi<Page>(`/db/tables/${t.schema}/${t.table}?${qs}`);
  const d = res.data;
  const cols = d?.columns ?? [];
  const shown = cols.filter((c) => !AUDIT.has(c.name));
  const pk = cols.filter((c) => c.pk);
  const from = d ? d.page * d.size + 1 : 0, to = d ? Math.min(d.total, (d.page + 1) * d.size) : 0;
  const sortBy = (k: string) => setSort((s) => (s?.k === k ? (s.dir === 'asc' ? { k, dir: 'desc' } : null) : { k, dir: 'asc' }));
  const reload = () => { res.mutate(); onChanged(); };
  const exportPage = () => {
    if (!d) return;
    const keys = cols.map((c) => c.name);
    downloadCsv(`${t.table}-${new Date().toISOString().slice(0, 10)}.csv`, [keys, ...d.rows.map((r) => keys.map((k) => { const v = r[k]; return v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); }))]);
  };

  return (
    <div className="dm">
      <header className="dm-head">
        <span className="dm-head-icon klh-tile-teal"><Database size={18} /></span>
        <div className="dm-head-text">
          <h1>{words(t.name ?? t.table)}<span className="dm-count">{d ? d.total.toLocaleString('en-IN') : ''}</span></h1>
          <p><span className="dm-code">{t.schema}.{t.table}</span>{t.ref ? ` · ${t.ref}` : ''}{t.per ? ` · ${t.per}` : ''}</p>
        </div>
        <div className="dm-head-actions">
          <Button size="sm" variant="ghost" onClick={() => setAbout(true)}>Columns</Button>
          <Button size="sm" variant="ghost" icon="download" onClick={exportPage}>Export page</Button>
          {!t.read_only && <Button size="sm" variant="primary" icon="plus" onClick={() => setOpen('new')}>Add row</Button>}
        </div>
      </header>
      <div className="dm-tools">
        <label className="dm-search"><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search every column" aria-label="Search rows" />{q && <button type="button" aria-label="Clear search" onClick={() => setQ('')}><X size={14} /></button>}</label>
        {t.read_only && <span className="dbx-ro">Kept by the system: read only</span>}
      </div>
      <div className="dm-grid" role="region" aria-label={`${t.table} rows`} tabIndex={0}>
        <table>
          <thead><tr>{shown.map((c) => (
            <th key={c.name} className={numeric(c) && !c.pk && !c.fk ? 'dm-r' : undefined} aria-sort={sort?.k === c.name ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} title={c.doc ?? c.type}>
              <button type="button" onClick={() => sortBy(c.name)}>{c.pk && <KeyRound size={11} />}{c.fk && !c.pk && <Link2 size={11} />}{c.name}{sort?.k === c.name ? <Icon name={sort.dir === 'asc' ? 'chevron-down' : 'chevron-left'} size={12} /> : null}</button>
            </th>))}</tr></thead>
          <tbody>
            {!d && Array.from({ length: 8 }, (_, i) => <tr key={i} className="dm-skel"><td colSpan={1}><span /></td></tr>)}
            {d?.rows.map((r, i) => (
              <tr key={pk.length ? pk.map((c) => String(r[c.name])).join('|') : i} tabIndex={0} onClick={() => setOpen(r)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(r); }}>
                {shown.map((c) => <td key={c.name} data-label={c.name} className={numeric(c) && !c.pk && !c.fk ? 'dm-r' : undefined}>{show(c, r[c.name])}</td>)}
              </tr>))}
          </tbody>
        </table>
        {d && d.rows.length === 0 && (
          <div className="dm-none"><Database size={22} /><b>{dq ? 'Nothing matches' : 'No rows yet'}</b><span>{dq ? 'Change the search.' : t.read_only ? 'The system fills this table.' : 'Add the first row.'}</span></div>)}
      </div>
      <footer className="dm-foot">
        <span>{d ? (d.total ? `${from.toLocaleString('en-IN')}–${to.toLocaleString('en-IN')} of ${d.total.toLocaleString('en-IN')}` : '0 rows') : 'Loading…'}</span>
        <span className="dm-foot-r">
          <label className="dm-size">Rows <select value={size} onChange={(e) => setSize(Number(e.target.value))}>{[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <button type="button" className="dm-pg" aria-label="Previous page" disabled={!d || d.page === 0} onClick={() => setPage(page - 1)}><Icon name="chevron-left" size={16} /></button>
          <button type="button" className="dm-pg" aria-label="Next page" disabled={!d || to >= d.total} onClick={() => setPage(page + 1)}><Icon name="chevron-right" size={16} /></button>
        </span>
      </footer>
      {open && d && <RowPanel t={t} cols={cols} row={open === 'new' ? null : open} onClose={() => setOpen(null)} onSaved={reload} />}
      {about && d && <ColumnsPanel t={t} cols={cols} onClose={() => setAbout(false)} />}
    </div>
  );
}

/** Text form of a value for an input; dates and times cut to what the input accepts. */
function asInput(c: Col, v: unknown) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  const s = String(v);
  if (c.udt === 'date') return s.slice(0, 10);
  if (c.udt === 'timestamptz' || c.udt === 'timestamp') { const d = new Date(s); return Number.isNaN(+d) ? s : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  return s;
}
function toValue(c: Col, s: string): unknown {
  if (s === '') return null;
  if (c.udt === 'bool') return s === 'true';
  if (c.udt === 'timestamptz' || c.udt === 'timestamp') return new Date(s).toISOString();
  if (c.udt === 'json' || c.udt === 'jsonb') { try { return JSON.parse(s); } catch { return s; } }
  return s;
}

function RowPanel({ t, cols, row, onClose, onSaved }: { t: Table; cols: Col[]; row: Row | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !row;
  const fields = cols.filter((c) => !AUDIT.has(c.name) && !c.generated && !(isNew && c.identity));
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((c) => [c.name, row ? asInput(c, row[c.name]) : ''])));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [confirm, setConfirm] = useState(false);
  const pk = cols.filter((c) => c.pk);
  const keyOf = () => Object.fromEntries(pk.map((c) => [c.name, row![c.name]]));
  const missing = fields.filter((c) => !c.nullable && !c.default && !c.identity && !(form[c.name] ?? '').trim()).map((c) => c.name);
  const canEdit = !t.read_only && (isNew || pk.length > 0);
  const url = `/db/tables/${t.schema}/${t.table}`;

  const save = async () => {
    setBusy(true); setProblem('');
    try {
      if (isNew) {
        await api(`${url}/insert`, { method: 'POST', json: { values: Object.fromEntries(fields.filter((c) => form[c.name] !== '').map((c) => [c.name, toValue(c, form[c.name])])) } });
        toast('Row added');
      } else {
        const changed = fields.filter((c) => !c.pk && form[c.name] !== asInput(c, row![c.name]));
        if (!changed.length) { onClose(); return; }
        await api(`${url}/update`, { method: 'POST', json: { key: keyOf(), values: Object.fromEntries(changed.map((c) => [c.name, toValue(c, form[c.name])])) } });
        toast('Saved');
      }
      onSaved(); onClose();
    } catch (e) { setProblem(e instanceof ApiError ? e.message : String(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    setConfirm(false); setBusy(true); setProblem('');
    try { await api(`${url}/delete`, { method: 'POST', json: { key: keyOf() } }); toast('Row deleted'); onSaved(); onClose(); }
    catch (e) { setProblem(e instanceof ApiError ? e.message : String(e)); } finally { setBusy(false); }
  };
  const title = isNew ? `Add to ${words(t.name ?? t.table)}` : pk.map((c) => String(row![c.name])).join(' · ') || 'Row';

  return (
    <>
      <Drawer open onClose={onClose} title={title} subtitle={`${t.schema}.${t.table}`}
        footer={<div className="dm-panel-foot">
          {!isNew && canEdit && <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>Delete</Button>}
          <span style={{ flex: 1 }} />
          <Button variant="ghost" size="sm" onClick={onClose}>{canEdit ? 'Cancel' : 'Close'}</Button>
          {canEdit && <Button variant="primary" size="sm" loading={busy} blockedReason={missing.length ? `Fill ${missing.slice(0, 2).join(', ')}${missing.length > 2 ? '…' : ''}.` : undefined} onClick={save}>{isNew ? 'Add row' : 'Save changes'}</Button>}
        </div>}>
        <div className="dm-panel">
          {problem && <Notice tone="critical" title={isNew ? 'Not added' : 'Not saved'}>{problem}</Notice>}
          {t.read_only && <Notice tone="info" title="Read only">The system writes this table; it cannot be changed by hand.</Notice>}
          {!isNew && !pk.length && <Notice tone="info" title="No key">This table has no primary key, so its rows can only be read here.</Notice>}
          <div className="dm-form">
            {fields.map((c) => {
              const locked = !canEdit || (!isNew && c.pk) || c.identity;
              const v = form[c.name] ?? '';
              const set = (x: string) => setForm({ ...form, [c.name]: x });
              const req = !c.nullable && !c.default && !c.identity;
              const long = c.udt === 'text' || c.udt === 'jsonb' || c.udt === 'json';
              return (
                <label key={c.name} className={`dm-field${locked ? ' dm-locked' : ''}${long ? ' dbx-wide' : ''}`}>
                  <span className="dm-label">{c.name}{req && !locked ? <i aria-hidden="true">*</i> : null}{locked && <Icon name="lock" size={12} />}</span>
                  {locked ? <span className="dm-value">{v || '—'}</span>
                    : c.udt === 'bool' ? <select value={v} onChange={(e) => set(e.target.value)}><option value="">{req ? 'Choose' : 'Not set'}</option><option value="true">Yes</option><option value="false">No</option></select>
                    : c.options ? <select value={v} onChange={(e) => set(e.target.value)}><option value="">{req ? 'Choose' : c.default ? 'Default' : 'Not set'}</option>{c.options.map((o) => <option key={o} value={o}>{words(o)}</option>)}</select>
                    : long ? <textarea rows={2} value={v} onChange={(e) => set(e.target.value)} />
                    : <input value={v} onChange={(e) => set(e.target.value)} inputMode={numeric(c) ? 'decimal' : undefined}
                        type={c.udt === 'date' ? 'date' : c.udt === 'timestamptz' || c.udt === 'timestamp' ? 'datetime-local' : c.udt === 'time' ? 'time' : 'text'}
                        placeholder={c.default && isNew ? 'Default' : undefined} />}
                  <small>{c.type}{c.fk ? ` · links to ${c.fk}` : ''}{c.doc ? ` · ${c.doc}` : ''}</small>
                </label>);
            })}
          </div>
          {!isNew && <div className="dm-facts">{cols.filter((c) => AUDIT.has(c.name)).map((c) => <div key={c.name}><span>{c.name}</span><b>{show(c, row![c.name])}</b></div>)}</div>}
        </div>
      </Drawer>
      <ConfirmDialog open={confirm} title="Delete this row?" body="The database refuses if other rows still point to it. The deletion is kept in the audit log." tone="danger" confirmLabel="Delete" onCancel={() => setConfirm(false)} onConfirm={remove} />
    </>
  );
}

function ColumnsPanel({ t, cols, onClose }: { t: Table; cols: Col[]; onClose: () => void }) {
  return (
    <Drawer open onClose={onClose} title={`${words(t.name ?? t.table)}: columns`} subtitle={t.per ?? `${t.schema}.${t.table}`}>
      <div className="dbx-cols">
        {cols.map((c) => (
          <div key={c.name}>
            <b className="dm-code">{c.pk && <KeyRound size={11} />}{c.name}</b>
            <span>{c.type}{c.nullable ? '' : ', required'}{c.fk ? `, links to ${c.fk}` : ''}{c.options ? `: ${c.options.map(words).join(' / ')}` : ''}</span>
            {c.doc && <p><FileText size={12} />{c.doc}</p>}
          </div>))}
      </div>
    </Drawer>
  );
}
