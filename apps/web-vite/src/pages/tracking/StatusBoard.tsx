import { useState } from 'react';
import { Button, Card, DataTable, Drawer, EmptyState, Field, FilterChip, Notice, Person, Select, StatCard, StatusChip, Timeline, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, bedLabel, roomLabel, titleCase, useApi, useProfile, words } from '@/lib/ui';

export type Loc = { student_id: string; full_name: string; programme: string; zone_id: string; space_id: string; subspace_id: string; current_status: string; last_event_at: string | null; last_point: string | null; last_direction: string | null };
export type Detail = Loc & { recent: { event_at: string; direction: string; source: string; point_name: string; point_type: string }[] };
const timeOnly = (d: string) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/** TRK-01 Student status board: current status of each hosteller in the viewer's scope (floor, hostel or all). */
export default function StatusBoard() {
  const hostels = useApi<{ facility_id: string; facility_name: string }[]>('/hostels');
  const profile = useProfile();
  const [facility, setFacility] = useState('');
  const fac = facility || profile.data?.assignments?.[0]?.facility_id || hostels.data?.[0]?.facility_id || '';
  const [purpose, setPurpose] = useState('Routine');
  const board = useApi<Loc[]>(fac ? `/locations?facility_id=${fac}` : null);
  const [filter, setFilter] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const counts = (board.data ?? []).reduce<Record<string, number>>((m, l) => ({ ...m, [l.current_status]: (m[l.current_status] ?? 0) + 1 }), {});
  const rows = (board.data ?? []).filter((l) => !filter || l.current_status === filter);
  const floors = profile.data?.assignments?.filter((a) => a.floor_name).map((a) => a.floor_name).join(', ');
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="TRK-01" subtitle={floors ? `Students of ${floors}. Opening one student's movements is a look-up and is logged (TRK-02).` : 'Opening one student’s movements is a look-up and is logged (TRK-02).'}
        actions={<div className="klh-row"><Field label="Hostel"><Select value={fac} onChange={(e) => setFacility(e.target.value)} options={(hostels.data ?? []).map((h) => ({ value: h.facility_id, label: h.facility_name }))} /></Field><Field label="Purpose of look-up"><Select value={purpose} onChange={(e) => setPurpose(e.target.value)} options={['Routine', 'Alert', 'Parent_Query', 'Emergency'].map((p) => ({ value: p, label: words(p) }))} /></Field></div>} />
      <div className="klh-grid-4">
        <StatCard color="brand" icon="bed" label="In hostel" value={String((counts.In_Room ?? 0) + (counts.In_Hostel ?? 0))} />
        <StatCard color="sky" icon="building" label="On campus" value={String(counts.On_Campus ?? 0)} />
        <StatCard color="violet" icon="door" label="Outside on pass" value={String(counts.Outside_On_Pass ?? 0)} />
        <StatCard color="rose" icon="alert" label="Outside with no pass" value={String(counts.Outside_No_Pass ?? 0)} tone={counts.Outside_No_Pass ? 'critical' : undefined} sub={counts.Overdue ? `${counts.Overdue} overdue` : undefined} />
      </div>
      <Card padding={0}>
        <DataTable caption="Hostel students" rowKey="student_id" rows={rows} loading={!board.data} searchable searchPlaceholder="Search name, ID or room" onRowClick={(r) => api<Detail>(`/students/${(r as Loc).student_id}/location?purpose=${purpose}`).then(setDetail)}
          filters={<div className="klh-row" style={{ flexWrap: 'wrap' }}><FilterChip label="All" count={board.data?.length} selected={!filter} onClick={() => setFilter('')} />{Object.entries(counts).map(([k, n]) => <FilterChip key={k} label={words(k)} count={n} selected={filter === k} onClick={() => setFilter(filter === k ? '' : k)} />)}</div>}
          empty={<EmptyState icon="users" title="No hostel students in your scope" />}
          columns={[
            { key: 'full_name', label: 'Student', render: (v: string, r: Loc) => <Person name={titleCase(v)} sub={`${r.student_id} · ${r.programme}`} /> },
            { key: 'space_id', label: 'Room', render: (v: string, r: Loc) => `${roomLabel(v)}-${bedLabel(r.subspace_id).slice(-1)}` },
            { key: 'current_status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
            { key: 'last_event_at', label: 'Last seen', render: (v: string | null, r: Loc) => (v ? `${formatDateTime(v)} · ${r.last_point} (${r.last_direction})` : 'Not seen yet') },
          ]} />
      </Card>
      <Notice tone="info" title="Append-only">Movement events come from gate scans, card readers and cameras. They are never edited or deleted here.</Notice>
      <Drawer open={!!detail} onClose={() => setDetail(null)} title={detail ? titleCase(detail.full_name) : ''} subtitle={detail ? `${detail.student_id} · ${roomLabel(detail.space_id)} · ${words(detail.current_status)}` : undefined} footer={<Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>}>
        {detail && (detail.recent.length ? <Timeline items={detail.recent.map((e) => ({ time: timeOnly(e.event_at), title: `${e.direction} · ${e.point_name}`, sub: `${e.source} · ${formatDateTime(e.event_at)}`, icon: e.direction === 'Out' ? 'logout' : e.point_type === 'Room_Corridor' ? 'bed' : 'login', tone: e.direction === 'Out' ? 'info' : 'success' }))} /> : <EmptyState icon="pin" title="No movements recorded" />)}
      </Drawer>
    </div>
  );
}
