import { useState } from 'react';
import { Button, Card, DataTable, Drawer, EmptyState, Field, Input, Notice, Select, StatusChip, Tabs, formatDateTime, formatINR } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, useAction, useApi, words } from '@/lib/ui';
import { ROLES } from '@/app/screens';

type Rule = { rule_id: number; request_type: string; level: number; approver_role: string; approver_name: string | null; condition_key: string | null; condition_value: string | null; is_mandatory: boolean; sla_hours: number; status: string };
type Setting = { setting_key: string; module: string; amount: string | null; value_text: string | null; meaning: string | null; updated_at: string; updated_by: string | null };
type Vis = { report_code: string; role_code: string; role_name: string | null; scope: string; status: string };

/** ADM-02 Approval rules and settings: approval levels, limits, report visibility. Set up on written approval. */
export default function Settings() {
  const [tab, setTab] = useState('rules');
  const rules = useApi<Rule[]>('/admin/approval-rules');
  const settings = useApi<Setting[]>('/admin/settings');
  const vis = useApi<Vis[]>('/admin/report-visibility');
  const roles = useApi<{ role_code: string; name: string }[]>('/admin/roles');
  const [rule, setRule] = useState<Rule | null>(null);
  const [rf, setRf] = useState({ sla_hours: '', approver_role: '', status: 'Active' });
  const [setting, setSetting] = useState<Setting | null>(null);
  const [sv, setSv] = useState('');
  const [vf, setVf] = useState({ report_code: '', role_code: '', scope: 'Hostel', status: 'Active' });
  const { run, busy } = useAction();
  const docRole = (code: string) => ROLES.find((r) => r.roles.includes(code))?.code;
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="ADM-02" subtitle="Who approves what and in which order, the money limits and policy numbers, and which role may open which report. Every change is audited." />
      <Tabs label="Settings" tabs={[{ id: 'rules', label: 'Approval rules', count: rules.data?.length }, { id: 'settings', label: 'Limits and settings', count: settings.data?.length }, { id: 'reports', label: 'Report visibility', count: vis.data?.length }]} value={tab} onChange={setTab} />
      {tab === 'rules' && (
        <Card padding={0}>
          <DataTable caption="Approval rules (SH1)" rowKey="rule_id" rows={rules.data ?? []} loading={!rules.data} onRowClick={(r) => { setRule(r as Rule); setRf({ sla_hours: String((r as Rule).sla_hours), approver_role: (r as Rule).approver_role, status: (r as Rule).status }); }} empty={<EmptyState icon="settings" title="No rules" />}
            columns={[
              { key: 'request_type', label: 'Request', render: (v: string) => <StatusChip status={v} tone="info" /> },
              { key: 'level', label: 'Level', align: 'right', render: (v: number) => (v === 0 ? 'P (parent)' : String(v)) },
              { key: 'approver_name', label: 'Approver', render: (v: string | null, r: Rule) => `${docRole(r.approver_role) ? `${docRole(r.approver_role)} · ` : ''}${v ?? words(r.approver_role)}` },
              { key: 'condition_key', label: 'When', render: (v: string | null, r: Rule) => (v ? `${words(v)} = ${words(r.condition_value)}` : 'Always') },
              { key: 'sla_hours', label: 'SLA', align: 'right', render: (v: number) => `${v} h` },
              { key: 'is_mandatory', label: 'Mandatory', render: (v: boolean) => (v ? 'Yes' : 'No') },
              { key: 'status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
            ]} />
        </Card>)}
      {tab === 'settings' && (
        <Card padding={0}>
          <DataTable caption="Policy settings" rowKey="setting_key" rows={settings.data ?? []} loading={!settings.data} onRowClick={(r) => { setSetting(r as Setting); setSv((r as Setting).amount ?? (r as Setting).value_text ?? ''); }} empty={<EmptyState icon="settings" title="No settings" />}
            columns={[
              { key: 'setting_key', label: 'Setting', render: (v: string) => <span className="klh-code">{v}</span> },
              { key: 'module', label: 'Module' },
              { key: 'amount', label: 'Value', align: 'right', render: (v: string | null, r: Setting) => <b className="klh-num">{v !== null ? (r.setting_key.includes('limit') ? formatINR(v) : Number(v)) : r.value_text}</b> },
              { key: 'meaning', label: 'Meaning', render: (v: string | null) => v ?? '' },
              { key: 'updated_at', label: 'Changed', render: (v: string, r: Setting) => `${formatDateTime(v)}${r.updated_by ? ` · ${r.updated_by}` : ''}` },
            ]} />
        </Card>)}
      {tab === 'reports' && (
        <div className="klh-stack" style={{ gap: 16 }}>
          <Card icon="eye" color="brand" title="Give a role a report" subtitle="Scope decides how much of the report the role sees">
            <form className="klh-row" style={{ alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }} onSubmit={(e) => { e.preventDefault(); run(() => api('/admin/report-visibility', { method: 'POST', json: vf }).then(() => vis.mutate()), 'Report visibility saved'); }}>
              <Field label="Report code" required><Input value={vf.report_code} onChange={(e) => setVf({ ...vf, report_code: e.target.value })} placeholder="occupancy_fees_dues" /></Field>
              <Field label="Role" required><Select value={vf.role_code} onChange={(e) => setVf({ ...vf, role_code: e.target.value })} options={[{ value: '', label: 'Choose' }, ...(roles.data ?? []).map((r) => ({ value: r.role_code, label: r.name }))]} /></Field>
              <Field label="Scope" required><Select value={vf.scope} onChange={(e) => setVf({ ...vf, scope: e.target.value })} options={['Own', 'Floor', 'Hostel', 'All']} /></Field>
              <Field label="Status"><Select value={vf.status} onChange={(e) => setVf({ ...vf, status: e.target.value })} options={['Active', 'Inactive']} /></Field>
              <Button type="submit" variant="primary" loading={busy} blockedReason={!vf.report_code || !vf.role_code ? 'Fill report and role.' : undefined}>Save</Button>
            </form>
          </Card>
          <Card padding={0}>
            <DataTable caption="Report visibility" rowKey="report_code" rows={(vis.data ?? []).map((v) => ({ ...v, report_code: `${v.report_code}|${v.role_code}`, code: v.report_code }))} loading={!vis.data} searchable pageSize={20} empty={<EmptyState icon="eye" title="No report visibility rows" />}
              columns={[
                { key: 'code', label: 'Report', render: (v: string) => <span className="klh-code">{v}</span> },
                { key: 'role_name', label: 'Role', render: (v: string | null, r: Vis) => `${docRole(r.role_code) ? `${docRole(r.role_code)} · ` : ''}${v ?? r.role_code}` },
                { key: 'scope', label: 'Scope', render: (v: string) => <StatusChip status={v} tone="neutral" /> },
                { key: 'status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
              ]} />
          </Card>
        </div>)}
      <Drawer open={!!rule} onClose={() => setRule(null)} title={rule ? `${words(rule.request_type)} · level ${rule.level}` : ''} subtitle="Approval rule" footer={rule && <Button variant="primary" loading={busy} onClick={() => run(() => api(`/admin/approval-rules/${rule.rule_id}`, { method: 'POST', json: { sla_hours: Number(rf.sla_hours), approver_role: rf.approver_role, status: rf.status } }).then(() => { rules.mutate(); setRule(null); }), 'Rule updated')}>Save rule</Button>}>
        {rule && (
          <div className="klh-stack" style={{ gap: 16 }}>
            <Field label="Approver role" required><Select value={rf.approver_role} onChange={(e) => setRf({ ...rf, approver_role: e.target.value })} options={(roles.data ?? []).map((r) => ({ value: r.role_code, label: r.name }))} /></Field>
            <Field label="SLA (hours)" required><Input type="number" value={rf.sla_hours} onChange={(e) => setRf({ ...rf, sla_hours: e.target.value })} /></Field>
            <Field label="Status"><Select value={rf.status} onChange={(e) => setRf({ ...rf, status: e.target.value })} options={['Active', 'Inactive']} /></Field>
            <Notice tone="warning" title="On written approval only">Changing who approves changes every new request from now on; running requests keep their steps.</Notice>
          </div>)}
      </Drawer>
      <Drawer open={!!setting} onClose={() => setSetting(null)} title={setting?.setting_key ?? ''} subtitle={setting?.meaning ?? undefined} footer={setting && <Button variant="primary" loading={busy} onClick={() => run(() => api(`/admin/settings/${setting.setting_key}`, { method: 'POST', json: setting.amount !== null ? { amount: Number(sv) } : { value_text: sv } }).then(() => { settings.mutate(); setSetting(null); }), 'Setting saved')}>Save</Button>}>
        {setting && <Field label={setting.amount !== null ? 'Value (number)' : 'Value'} required><Input type={setting.amount !== null ? 'number' : 'text'} value={sv} onChange={(e) => setSv(e.target.value)} /></Field>}
      </Drawer>
    </div>
  );
}
