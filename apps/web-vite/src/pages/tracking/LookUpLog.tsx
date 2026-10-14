import { useState } from 'react';
import { Button, Card, DataTable, EmptyState, Field, Input, Notice, Person, StatCard, StatusChip, formatDateTime } from '@/lib/klh';
import { ScreenHeader, titleCase, useApi, words } from '@/lib/ui';

type Row = { log_id: number; viewer_staff_id: string; viewer_name: string | null; viewer_designation: string | null; student_id: string; student_name: string | null; viewed_at: string; purpose: string; alert_id: number | null };

/** TRK-06 Look-up log: who looked up which student, and why. Chief Manager reviews; append-only. */
export default function LookUpLog() {
  const [student, setStudent] = useState('');
  const [viewer, setViewer] = useState('');
  const [q, setQ] = useState('');
  const list = useApi<Row[]>(`/reports/location-access-log${q}`);
  const byPurpose = (list.data ?? []).reduce<Record<string, number>>((m, r) => ({ ...m, [r.purpose]: (m[r.purpose] ?? 0) + 1 }), {});
  const viewers = new Set((list.data ?? []).map((r) => r.viewer_staff_id)).size;
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="TRK-06" subtitle="Every location look-up with the viewer, the student, the purpose and the time. Rows are written by the system and never edited." />
      <div className="klh-grid-4">
        <StatCard color="sky" icon="eye" label="Look-ups" value={String(list.data?.length ?? 0)} sub="latest 500" />
        <StatCard color="brand" icon="users" label="Viewers" value={String(viewers)} />
        <StatCard color="rose" icon="alert" label="Emergency" value={String(byPurpose.Emergency ?? 0)} />
        <StatCard color="violet" icon="phone" label="Parent query" value={String(byPurpose.Parent_Query ?? 0)} />
      </div>
      <Card>
        <form className="klh-row" style={{ alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }} onSubmit={(e) => { e.preventDefault(); const p = new URLSearchParams(); if (student) p.set('student_id', student); if (viewer) p.set('viewer', viewer); setQ(p.toString() ? `?${p}` : ''); }}>
          <Field label="Student ID"><Input value={student} onChange={(e) => setStudent(e.target.value)} placeholder="2600040012" /></Field>
          <Field label="Viewer (employee ID)"><Input value={viewer} onChange={(e) => setViewer(e.target.value)} placeholder="S-FW" /></Field>
          <Button type="submit" variant="primary" icon="filter">Filter</Button>
          <Button variant="ghost" onClick={() => { setStudent(''); setViewer(''); setQ(''); }}>Clear</Button>
        </form>
      </Card>
      <Card padding={0}>
        <DataTable caption="Look-ups" rowKey="log_id" rows={list.data ?? []} loading={!list.data} searchable pageSize={25} empty={<EmptyState icon="shield" title="No look-ups recorded" />}
          columns={[
            { key: 'viewed_at', label: 'When', render: (v: string) => formatDateTime(v) },
            { key: 'viewer_name', label: 'Who looked', render: (v: string | null, r: Row) => <Person name={v ? titleCase(v) : r.viewer_staff_id} sub={`${r.viewer_staff_id}${r.viewer_designation ? ` · ${r.viewer_designation}` : ''}`} /> },
            { key: 'student_name', label: 'At whom', render: (v: string | null, r: Row) => <Person name={v ? titleCase(v) : r.student_id} sub={r.student_id} /> },
            { key: 'purpose', label: 'Purpose', render: (v: string) => <StatusChip status={v} tone={v === 'Emergency' ? 'critical' : v === 'Alert' ? 'warning' : 'neutral'} label={words(v)} /> },
            { key: 'alert_id', label: 'Alert', render: (v: number | null) => (v ? <span className="klh-code">{v}</span> : '—') },
          ]} />
      </Card>
      <Notice tone="info" title="What to look for">Repeated routine look-ups of the same student by one person, look-ups outside the viewer's floor or hostel, and emergencies without a matching alert.</Notice>
    </div>
  );
}
