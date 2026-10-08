import { useState } from 'react';
import { Button, Card, DataTable, Drawer, EmptyState, Field, Input, Notice, StatCard, StatusChip, formatDateTime } from '@/lib/klh';
import { ScreenHeader, useApi, words } from '@/lib/ui';

type Row = { audit_id: number; occurred_at: string; kind: string; outcome: string; actor: string | null; role_code: string | null; table_name: string | null; row_key: string | null; detail: Record<string, unknown> | null; hash: string };
type Sum = { kind: string; outcome: string; rows: number; last_at: string };

/** ADM-03 Audit log: every sign-in, creation, edit, approval and refusal, hash-chained. View only. */
export default function AuditLog() {
  const [f, setF] = useState({ table: '', actor: '', kind: '' });
  const [q, setQ] = useState('');
  const list = useApi<Row[]>(`/admin/audit-log${q}`);
  const summary = useApi<Sum[]>('/admin/audit-log/summary');
  const [sel, setSel] = useState<Row | null>(null);
  const total = summary.data?.reduce((a, s) => a + s.rows, 0) ?? 0;
  const refused = summary.data?.filter((s) => s.outcome !== 'allowed').reduce((a, s) => a + s.rows, 0) ?? 0;
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="ADM-03" subtitle="Each row carries the hash of the row before it; a changed or deleted row breaks the chain. Rows cannot be edited here or anywhere." />
      <div className="klh-grid-3">
        <StatCard color="brand" icon="shield" label="Audit rows" value={total.toLocaleString('en-IN')} />
        <StatCard color="rose" icon="alert" label="Refusals" value={String(refused)} sub="rule violations and denied actions" tone={refused ? 'warning' : undefined} />
        <StatCard color="violet" icon="clock" label="Latest" value={summary.data?.length ? formatDateTime(summary.data.map((s) => s.last_at).sort().reverse()[0]).split(',')[1]?.trim() ?? '—' : '—'} sub={summary.data?.length ? formatDateTime(summary.data.map((s) => s.last_at).sort().reverse()[0]).split(',')[0] : undefined} />
      </div>
      <Card>
        <form className="klh-row" style={{ alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }} onSubmit={(e) => { e.preventDefault(); const p = new URLSearchParams(); if (f.table) p.set('table', f.table); if (f.actor) p.set('actor', f.actor); if (f.kind) p.set('kind', f.kind); setQ(p.toString() ? `?${p}` : ''); }}>
          <Field label="Table"><Input value={f.table} onChange={(e) => setF({ ...f, table: e.target.value })} placeholder="hostel.outpass" /></Field>
          <Field label="Actor"><Input value={f.actor} onChange={(e) => setF({ ...f, actor: e.target.value })} placeholder="S-CW or 2600040012" /></Field>
          <Field label="Kind"><Input value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} placeholder="update row" /></Field>
          <Button type="submit" variant="primary" icon="filter">Filter</Button>
          <Button variant="ghost" onClick={() => { setF({ table: '', actor: '', kind: '' }); setQ(''); }}>Clear</Button>
        </form>
      </Card>
      <Card padding={0}>
        <DataTable caption="Audit log (latest 200)" rowKey="audit_id" rows={list.data ?? []} loading={!list.data} searchable pageSize={25} onRowClick={(r) => setSel(r as Row)} selectedKey={sel?.audit_id} empty={<EmptyState icon="shield" title="No audit rows match" />}
          columns={[
            { key: 'audit_id', label: '#', align: 'right' },
            { key: 'occurred_at', label: 'When', render: (v: string) => formatDateTime(v) },
            { key: 'actor', label: 'Who', render: (v: string | null, r: Row) => `${v ?? 'system'}${r.role_code ? ` · ${words(r.role_code)}` : ''}` },
            { key: 'kind', label: 'What' },
            { key: 'table_name', label: 'Where', render: (v: string | null, r: Row) => <span className="klh-code">{v ?? ''}{r.row_key ? ` #${r.row_key}` : ''}</span> },
            { key: 'outcome', label: 'Outcome', render: (v: string) => <StatusChip status={v === 'allowed' ? 'Success' : 'Rejected'} label={v} /> },
            { key: 'hash', label: 'Hash', render: (v: string) => <span className="klh-code klh-muted">{v}…</span> },
          ]} />
      </Card>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? `Audit row ${sel.audit_id}` : ''} subtitle={sel ? `${sel.kind} · ${sel.table_name ?? ''} · ${formatDateTime(sel.occurred_at)}` : undefined}>
        {sel && <pre className="klh-code" style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>{JSON.stringify(sel.detail, null, 2)}</pre>}
      </Drawer>
      <Notice tone="info" title="What is logged">Every sign-in, creation, edit, approval and refusal with name, role and time. Sensitive tables are hash-chained in shared.audit_log; movement events and look-ups have their own append-only tables.</Notice>
    </div>
  );
}
