import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Drawer, Icon, type T } from '@/lib/klh';
import { api } from '@/lib/api';
import { downloadCsv } from '@/lib/sheet';
import { toast, useApi, useSession } from '@/lib/ui';
import { can } from '@/app/screens';
import { templateCsv, type Kind } from '@/pages/admin/Upload';

type Sum = { facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string; beds: number; students: number; floors: number; floors_warden: number; floors_sweeper: number; washrooms: number; washrooms_scavenger: number; wardens: number; guard_shifts: number };
type Op = { key: string; title: string; about: string; icon: T.IconName; color: T.TileColor; done: number; of: number; unit: string; kind: 'bed_map' | 'duties'; role?: string };

/**
 * MAP-07 Mapping centre. Everything that ties a person to a place, in one board:
 * students to beds, Floor Managers and sweepers to floors, scavengers to washroom blocks, guards to shifts, wardens to hostels.
 * Each card opens the list (search, filter, end), a one-at-a-time form, or a file upload checked row by row.
 */
export default function MappingCentre() {
  const s = useSession()!;
  const navigate = useNavigate();
  const edit = can(s.role, 'MAP-07', 'C') || can(s.role, 'MAP-07', 'X');
  const sum = useApi<Sum[]>('/mapping/summary');
  const kinds = useApi<Kind[]>('/admin/import/kinds');
  const [sel, setSel] = useState<Op | null>(null);
  const t = (sum.data ?? []).reduce((a, h) => ({ beds: a.beds + h.beds, students: a.students + h.students, floors: a.floors + h.floors, fw: a.fw + h.floors_warden, sw: a.sw + h.floors_sweeper, wr: a.wr + h.washrooms, sc: a.sc + h.washrooms_scavenger, wd: a.wd + (h.wardens ? 1 : 0), gs: a.gs + (h.guard_shifts ?? 0) }),
    { beds: 0, students: 0, floors: 0, fw: 0, sw: 0, wr: 0, sc: 0, wd: 0, gs: 0 });
  const hostels = sum.data?.length ?? 0;
  const ops: Op[] = [
    { key: 'beds', title: 'Students in beds', about: 'Who lives in which bed', icon: 'bed', color: 'indigo', done: t.students, of: t.beds, unit: 'beds filled', kind: 'bed_map' },
    { key: 'Floor_Warden', title: 'Floor Managers', about: 'One for every floor with hostel students', icon: 'shield', color: 'violet', done: t.fw, of: t.floors, unit: 'floors covered', kind: 'duties', role: 'Floor_Warden' },
    { key: 'Sweeper', title: 'Sweepers', about: 'Floors and corridors, morning shift', icon: 'sparkle', color: 'cyan', done: t.sw, of: t.floors, unit: 'floors covered', kind: 'duties', role: 'Sweeper' },
    { key: 'Scavenger', title: 'Scavengers', about: 'Washroom blocks, morning shift', icon: 'door', color: 'sky', done: t.sc, of: t.wr, unit: 'washrooms covered', kind: 'duties', role: 'Scavenger' },
    { key: 'Security_Guard', title: 'Security guards', about: 'Morning, evening and night at each hostel', icon: 'lock', color: 'orange', done: t.gs, of: hostels * 3, unit: 'shifts covered', kind: 'duties', role: 'Security_Guard' },
    { key: 'Warden', title: 'Managers', about: 'Warden and Chief Manager of each hostel', icon: 'users', color: 'brand', done: t.wd, of: hostels, unit: 'hostels covered', kind: 'duties', role: 'Warden' },
  ];
  return (
    <div className="pg">
      <div className="pg-head">
        <div><p>Students to beds, and every warden, sweeper, scavenger and guard to the place they look after. The daily roster and the door labels read from here.</p></div>
        <div className="pg-actions"><button type="button" className="dm-clear" onClick={() => navigate('/duty-roster')}>Today’s roster</button></div>
      </div>
      <div className="ob-grid">
        {ops.map((o) => {
          const gap = o.of - o.done;
          return (
            <button key={o.key} type="button" className={`ob-card${gap > 0 && o.key !== 'beds' ? ' ob-card-warn' : ''}`} onClick={() => setSel(o)}>
              <span className={`ob-icon klh-tile-${o.color}`}><Icon name={o.icon} size={18} /></span>
              <span className="ob-text"><b>{o.title}</b><span>{gap > 0 && o.key !== 'beds' ? `${gap} still to map` : o.about}</span></span>
              <span className="ob-count">{o.done}<small>of {o.of} {o.unit.split(' ')[0]}</small></span>
            </button>);
        })}
      </div>
      <section aria-label="By hostel">
        <h2 style={{ margin: '4px 0 8px 2px', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-muted)' }}>By hostel</h2>
        <div className="mc-hostels">
          {(sum.data ?? []).map((h) => (
            <div key={h.facility_id} className="mc-h">
              <header><span className="hs-code">{h.hostel_code}</span><span style={{ display: 'flex', flexDirection: 'column' }}><b>{h.facility_name}</b><span>{h.hostel_gender} · {h.floors} floors · {h.beds} beds</span></span></header>
              <Line label="Students in beds" done={h.students} of={h.beds} soft />
              <Line label="Floor Manager on each floor" done={h.floors_warden} of={h.floors} />
              <Line label="Sweeper on each floor" done={h.floors_sweeper} of={h.floors} />
              <Line label="Scavenger for each washroom" done={h.washrooms_scavenger} of={h.washrooms} />
              <Line label="Guard shifts" done={h.guard_shifts ?? 0} of={3} />
              <Line label="Warden" done={h.wardens ? 1 : 0} of={1} />
            </div>))}
        </div>
      </section>
      {sel && <MapPanel op={sel} edit={edit} kind={kinds.data?.find((k) => k.kind === sel.kind)} onClose={() => setSel(null)} />}
    </div>
  );
}

function Line({ label, done, of, soft }: { label: string; done: number; of: number; soft?: boolean }) {
  const ok = done >= of;
  return (
    <div className="mc-line">
      <span className={ok ? 'mc-ok' : soft ? undefined : 'mc-gap'} style={{ display: 'grid' }}><Icon name={ok ? 'check' : soft ? 'bed' : 'alert'} size={14} /></span>
      <span>{label}</span>
      <span className={`num${ok || soft ? '' : ' mc-gap'}`}>{done}/{of}</span>
    </div>
  );
}

function MapPanel({ op, edit, kind, onClose }: { op: Op; edit: boolean; kind?: Kind; onClose: () => void }) {
  const navigate = useNavigate();
  const go = (to: string) => { onClose(); navigate(to); };
  const base = `/mapping/data/${op.kind}`;
  const role = op.role ? `f_hostel_role=${op.role}` : '';
  const exportAll = async () => {
    const rows = await api<Record<string, unknown>[]>(`/admin/data/${op.kind}/export${op.role ? `?f_hostel_role=${op.role}` : ''}`);
    const keys = rows.length ? Object.keys(rows[0]) : [];
    downloadCsv(`${op.key.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`, [keys, ...rows.map((r) => keys.map((k) => (r[k] ?? '') as string))]);
    toast(`${rows.length} rows exported`);
  };
  const actions: { icon: T.IconName; label: string; sub: string; run: () => void; main?: boolean }[] = [
    { icon: 'eye', label: 'See the list', sub: op.kind === 'bed_map' ? 'Search by student, hostel, floor or room' : 'Search, filter by hostel and shift; end a duty', run: () => go(`${base}${role ? `?${role}` : ''}`), main: true },
    ...(edit ? [
      { icon: 'plus' as T.IconName, label: op.kind === 'bed_map' ? 'Put one student in a bed' : `Map one ${op.title.toLowerCase().replace(/s$/, '')}`, sub: 'Checked the same way as a file', run: () => go(`${base}?new=1${op.role ? `&p_hostel_role=${op.role}` : ''}`) },
      { icon: 'upload' as T.IconName, label: 'Upload a file', sub: op.kind === 'bed_map' ? 'University ID, hostel, room, bed; checked row by row' : 'Employee ID, duty, hostel, floor or washroom', run: () => go(`${base}?upload=1`) },
      ...(kind ? [{ icon: 'download' as T.IconName, label: 'Download template', sub: `${kind.columns.length} columns with a sample row`, run: () => templateCsv(kind) }] : []),
    ] : []),
    { icon: 'file', label: 'Export', sub: 'As a CSV file', run: exportAll },
    op.kind === 'bed_map' ? { icon: 'key', label: 'Allotment desk', sub: 'Offer beds, block rooms, check-in queue', run: () => go('/allotment') } : { icon: 'calendar', label: 'Today’s roster', sub: 'Attendance and who covers whom today', run: () => go('/duty-roster') },
  ];
  return (
    <Drawer open onClose={onClose} title={op.title} subtitle={op.about}>
      <div className="ob-panel">
        <div className="ob-panel-facts">
          <div><span>Mapped</span><b>{op.done}</b><small>{op.unit}</small></div>
          <div><span>Places</span><b>{op.of}</b></div>
          {op.of > op.done && op.kind === 'duties' && <div className="ob-panel-warn"><span>Still to map</span><b>{op.of - op.done}</b></div>}
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
