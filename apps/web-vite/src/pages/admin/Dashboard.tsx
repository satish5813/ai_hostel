import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Drawer, Icon, StatusChip, formatDate, formatDateTime, type T } from '@/lib/klh';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/sheet';
import { greeting, titleCase, toast, today, useApi, useProfile, words } from '@/lib/ui';
import { DATA_KINDS } from '@/admin/registry';
import { templateCsv, type Kind } from './Upload';

type Overview = { counts: Record<string, number> & { current_year: string | null } };
type Check = { key: string; label: string; ok: boolean; detail: string; blocks: boolean; fix: string };
type Readiness = { year: string | null; window: { opens: string | null; closes: string | null; open_now: boolean }; global: Check[];
  hostels: { facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string; beds: number; ready: boolean; blockers: number; warnings: number; checks: Check[] }[] };
type Op = { key: string; title: string; icon: T.IconName; color: T.TileColor; group: string; about: string; count?: number; unit: string; open: string; data?: string; warn?: string };
const n = (v?: number) => (v ?? 0).toLocaleString('en-IN');
const GROUPS = ['Hostel set-up', 'Room inventory', 'People', 'Rules and records'];

/**
 * Data Administrator home: every operation as an icon card, grouped. A card opens a side panel with what can be done:
 * view and edit, add one, upload a file, download the template, export. Anything that needs input is flagged on its card.
 */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const p = useProfile();
  const o = useApi<Overview>('/admin/overview');
  const kinds = useApi<Kind[]>('/admin/import/kinds');
  const [sel, setSel] = useState<Op | null>(null);
  const c = o.data?.counts;
  const rec = (k: string) => kinds.data?.find((x) => x.kind === k);

  const ops: Op[] = [
    { key: 'years', title: 'Academic years', icon: 'calendar', color: 'brand', group: 'Hostel set-up', about: 'The year registrations and fees belong to', count: c?.years, unit: c?.current_year ? `${c.current_year} current` : 'none current', open: '/admin/masters?tab=years', warn: c && !c.current_year ? 'No current year' : undefined },
    ...DATA_KINDS.filter((d) => d.group === 'Hostel set-up').map((d) => ({ key: d.kind, title: d.title, icon: d.icon, color: d.color, group: d.group, about: d.about, count: rec(d.kind)?.records, unit: 'records', open: `/admin/data/${d.kind}`, data: d.kind,
      warn: d.kind === 'rooms' && c?.rooms_without_type ? `${c.rooms_without_type} rooms without a type` : undefined })),
    { key: 'builder', title: 'Room builder', icon: 'building', color: 'cyan', group: 'Hostel set-up', about: 'A whole hostel in one step: floors, rooms, beds', count: c?.rooms, unit: 'rooms', open: '/admin/room-builder' },
    { key: 'roommap', title: 'Room map', icon: 'building', color: 'indigo', group: 'Hostel set-up', about: 'Floors and room tiles for each hostel', count: c?.rooms, unit: 'rooms', open: '/rooms' },
    { key: 'mess', title: 'Mess', icon: 'utensils', color: 'cyan', group: 'Hostel set-up', about: 'Messes, in-charge and yearly fee', count: c?.messes, unit: 'messes', open: '/admin/masters?tab=mess' },
    ...DATA_KINDS.filter((d) => d.group !== 'Hostel set-up').map((d) => ({ key: d.kind, title: d.title, icon: d.icon, color: d.color, group: d.group, about: d.about, count: rec(d.kind)?.records, unit: 'records', open: `/admin/data/${d.kind}`, data: d.kind,
      warn: d.kind === 'duties' && c?.floors_without_warden ? `${c.floors_without_warden} floor without a Floor Manager` : undefined })),
    { key: 'logins', title: 'Logins and hostels', icon: 'key', color: 'rose', group: 'People', about: 'Chief Manager and Room Allotment logins, and their hostels', unit: 'two logins', open: '/admin/logins' },
    { key: 'users', title: 'Users and roles', icon: 'shield', color: 'violet', group: 'People', about: 'Give and remove roles, on written approval', count: c?.users, unit: 'users', open: '/admin/users', warn: c && c.users_with_role < c.users ? `${c.users - c.users_with_role} users hold no role` : undefined },
    { key: 'rules', title: 'Approval rules and settings', icon: 'settings', color: 'brand', group: 'Rules and records', about: 'Who approves what, limits, report access', count: c?.approval_rules, unit: 'approval levels', open: '/admin/settings' },
    { key: 'uploads', title: 'File uploads', icon: 'upload', color: 'brand', group: 'Rules and records', about: 'Upload any master as CSV or Excel; history of every file', count: kinds.data?.filter((k) => k.last).length, unit: 'masters uploaded', open: '/admin/masters?tab=upload' },
    { key: 'audit', title: 'Audit log', icon: 'eye', color: 'brand', group: 'Rules and records', about: 'Every change, approval and refusal, hash-chained', unit: 'view only', open: '/admin/audit-log' },
    { key: 'screens', title: 'Screen map', icon: 'file', color: 'brand', group: 'Rules and records', about: 'All roles, screens and access rights', count: 87, unit: 'screens', open: '/screens' },
  ];
  const attention = ops.filter((x) => x.warn);
  const name = p.data?.full_name ? titleCase(p.data.full_name.split(' ')[0]) : '';

  return (
    <div className="ob">
      <header className="ob-head">
        <div>
          <p className="ob-date">{today()}</p>
          <h1>{greeting()}{name ? `, ${name}` : ''}</h1>
        </div>
        <Button variant="primary" icon="upload" onClick={() => navigate('/admin/masters?tab=upload')}>Upload a file</Button>
      </header>

      {attention.length > 0 && (
        <div className="ob-alert" role="status">
          <Icon name="alert" size={16} /><b>Needs your input</b>
          {attention.map((a) => <button key={a.key} type="button" onClick={() => navigate(a.open)}>{a.warn}<Icon name="chevron-right" size={13} /></button>)}
        </div>)}

      <ReadinessBoard />

      {GROUPS.map((g) => (
        <section key={g} className="ob-group" aria-label={g}>
          <h2>{g}</h2>
          <div className="ob-grid">
            {ops.filter((x) => x.group === g).map((x) => (
              <button key={x.key} type="button" className={`ob-card${x.warn ? ' ob-card-warn' : ''}`} onClick={() => setSel(x)}>
                <span className={`ob-icon klh-tile-${x.color}`}><Icon name={x.icon} size={18} /></span>
                <span className="ob-text"><b>{x.title}</b><span>{x.warn ?? x.about}</span></span>
                <span className="ob-count">{x.count !== undefined ? n(x.count) : ''}<small>{x.unit}</small></span>
              </button>))}
          </div>
        </section>))}

      {sel && <OpPanel op={sel} kind={sel.data ? rec(sel.data) : undefined} onClose={() => setSel(null)} />}
    </div>
  );
}

function OpPanel({ op, kind, onClose }: { op: Op; kind?: Kind; onClose: () => void }) {
  const navigate = useNavigate();
  const go = (to: string) => { onClose(); navigate(to); };
  const exportAll = async () => {
    const rows = await api<Record<string, unknown>[]>(`/admin/data/${op.data}/export`);
    const keys = rows.length ? Object.keys(rows[0]) : [];
    downloadCsv(`${op.data}-${new Date().toISOString().slice(0, 10)}.csv`, [keys, ...rows.map((r) => keys.map((k) => (r[k] ?? '') as string))]);
    toast(`${rows.length.toLocaleString('en-IN')} rows exported`);
  };
  const actions: { icon: T.IconName; label: string; sub: string; run: () => void; main?: boolean }[] = op.data ? [
    { icon: 'eye', label: 'View and edit', sub: 'Search, filter and sort; open a row to edit it', run: () => go(op.open), main: true },
    { icon: 'plus', label: 'Add one', sub: 'A single record, checked the same way as a file', run: () => go(`${op.open}?new=1`) },
    ...(kind ? [{ icon: 'upload' as T.IconName, label: 'Upload a file', sub: 'CSV or Excel; checked row by row before anything is saved', run: () => go(`${op.open}?upload=1`) },
      { icon: 'download' as T.IconName, label: 'Download template', sub: `${kind.columns.length} columns with a sample row`, run: () => templateCsv(kind) }] : []),
    { icon: 'file', label: 'Export all', sub: 'Every record as a CSV file', run: exportAll },
  ] : [{ icon: 'arrow-right', label: 'Open', sub: op.about, run: () => go(op.open), main: true }];
  return (
    <Drawer open onClose={onClose} title={op.title} subtitle={op.about}>
      <div className="ob-panel">
        <div className="ob-panel-facts">
          <div><span>{op.unit === 'records' ? 'Records' : words(op.unit)}</span><b>{op.count !== undefined ? n(op.count) : '—'}</b></div>
          {kind?.last && <div><span>Last upload</span><b><StatusChip status={kind.last.status} label={kind.last.status === 'Partially_Completed' ? `${kind.last.rows_failed} refused` : words(kind.last.status)} /></b><small>{formatDateTime(kind.last.received_at)}</small></div>}
          {op.warn && <div className="ob-panel-warn"><span>Needs input</span><b>{op.warn}</b></div>}
        </div>
        <div className="ob-actions">
          {actions.map((a) => (
            <button key={a.label} type="button" className={a.main ? 'ob-action ob-action-main' : 'ob-action'} onClick={a.run}>
              <span className="ob-action-icon"><Icon name={a.icon} size={17} /></span>
              <span className="ob-action-text"><b>{a.label}</b><small>{a.sub}</small></span>
              <Icon name="chevron-right" size={15} />
            </button>))}
        </div>
      </div>
    </Drawer>
  );
}

/** Can registration open? Everything a student needs to go from applying to a key, hostel by hostel. */
function ReadinessBoard() {
  const navigate = useNavigate();
  const r = useApi<Readiness>('/admin/readiness');
  const d = r.data;
  if (!d) return <section className="rd" aria-busy="true"><p className="klh-muted">Checking every hostel…</p></section>;
  const ready = d.hostels.filter((h) => h.ready).length;
  const g = d.global.filter((x) => !x.ok);
  return (
    <section className="rd" aria-label="Ready for registration">
      <div className="rd-head">
        <div><h2>Ready for registration</h2><p>{ready} of {d.hostels.length} hostels ready · {d.year ?? 'no current year'} · {d.window.opens ? <>window {formatDate(d.window.opens)} to {formatDate(d.window.closes!)} <StatusChip status={d.window.open_now ? 'Active' : 'Closed'} label={d.window.open_now ? 'Open now' : 'Closed today'} /></> : 'no registration window'}</p></div>
      </div>
      {g.length > 0 && <div className="rd-global">{g.map((x) => <button key={x.key} type="button" className={x.blocks ? 'rd-fix rd-fix-block' : 'rd-fix'} onClick={() => navigate(x.fix)}><Icon name={x.blocks ? 'alert' : 'info'} size={13} /><b>{x.label}</b>{x.detail}</button>)}</div>}
      <div className="rd-list">
        {d.hostels.map((h) => {
          const bad = h.checks.filter((c) => !c.ok);
          return (
            <div key={h.facility_id} className={`rd-row${h.ready ? '' : ' rd-row-block'}`}>
              <span className="rd-code">{h.hostel_code}</span>
              <span className="rd-name"><b>{h.facility_name}</b><small>{h.hostel_gender} · {n(h.beds)} beds</small></span>
              <span className="rd-state">{h.ready ? <StatusChip status="Active" label={h.warnings ? `Ready · ${h.warnings} to finish` : 'Ready'} /> : <StatusChip status="Rejected" label={`${h.blockers} blocking`} />}</span>
              <span className="rd-fixes">{bad.map((c) => <button key={c.key} type="button" className={c.blocks ? 'rd-fix rd-fix-block' : 'rd-fix'} title={c.detail} onClick={() => navigate(c.fix.startsWith('/admin/room-builder') ? `${c.fix}?hostel=${h.facility_id}` : c.fix)}>{c.label}<small>{c.detail}</small></button>)}</span>
            </div>);
        })}
      </div>
    </section>
  );
}
