import { useState } from 'react';
import { Button, Card, ConfirmDialog, DataTable, Drawer, EmptyState, Field, Input, Notice, Person, Select, StatCard, StatusChip, formatDate } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, titleCase, useAction, useApi, useSession } from '@/lib/ui';
import { ROLES } from '@/app/screens';

type Role = { role_code: string; name: string; module: string };
type UserRole = { role_code: string; name: string; scope_dept: string; granted_on: string; granted_by: string | null; approval_ref: string | null };
type User = { user_id: number; staff_id: string | null; full_name: string; email: string | null; title: string | null; home_dept: string | null; active: boolean; roles: UserRole[]; duties: string };

/** ADM-01 Users and roles: give and remove roles, on written approval; never to oneself. */
export default function Users() {
  const s = useSession()!;
  const users = useApi<User[]>('/admin/users');
  const roles = useApi<Role[]>('/admin/roles');
  const [sel, setSel] = useState<User | null>(null);
  const [f, setF] = useState({ role_code: '', scope_dept: 'HOSTELS', approval_ref: '' });
  const [revoke, setRevoke] = useState<UserRole | null>(null);
  const { run, busy } = useAction();
  const docRole = (code: string) => ROLES.find((r) => r.roles.includes(code));
  const refresh = async () => { const list = await users.mutate(); if (sel) setSel(list?.find((u) => u.user_id === sel.user_id) ?? null); };
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="ADM-01" subtitle="Every grant quotes the written approval and records who gave it. The administrator cannot give a role to self, and holds no workflow screens." />
      <div className="klh-grid-3">
        <StatCard color="brand" icon="users" label="Users" value={String(users.data?.length ?? 0)} />
        <StatCard color="violet" icon="shield" label="Roles defined" value={String(roles.data?.length ?? 0)} sub="portal.role" />
        <StatCard color="orange" icon="alert" label="Users with no role" value={String(users.data?.filter((u) => !u.roles.length).length ?? 0)} />
      </div>
      <Card padding={0}>
        <DataTable caption="Users" rowKey="user_id" rows={users.data ?? []} loading={!users.data} searchable searchPlaceholder="Search name, ID or e-mail" onRowClick={(r) => { setSel(r as User); setF({ role_code: '', scope_dept: (r as User).home_dept ?? 'RESIDENCIES', approval_ref: '' }); }} selectedKey={sel?.user_id} empty={<EmptyState icon="users" title="No users" />}
          columns={[
            { key: 'full_name', label: 'Person', render: (v: string, u: User) => <Person name={titleCase(v)} sub={`${u.staff_id ?? ''} · ${u.title ?? ''}`} /> },
            { key: 'home_dept', label: 'Department' },
            { key: 'roles', label: 'Roles', render: (v: UserRole[]) => (v.length ? <span className="klh-row" style={{ gap: 6, flexWrap: 'wrap' }}>{v.map((r) => <StatusChip key={r.role_code + r.scope_dept} status={r.role_code} tone="progress" label={`${docRole(r.role_code)?.code ?? ''} ${r.name}`.trim()} />)}</span> : <span className="klh-muted">none</span>) },
            { key: 'duties', label: 'Duties', align: 'right' },
            { key: 'active', label: 'Status', render: (v: boolean) => <StatusChip status={v ? 'Active' : 'Inactive'} /> },
          ]} />
      </Card>
      <Drawer open={!!sel} onClose={() => setSel(null)} title={sel ? titleCase(sel.full_name) : ''} subtitle={sel ? `${sel.staff_id ?? ''} · ${sel.title ?? ''} · ${sel.email ?? ''}` : undefined}>
        {sel && (
          <div className="klh-stack" style={{ gap: 20 }}>
            <div><p className="klh-overline">Roles held</p>{sel.roles.length ? <table className="klh-table"><thead><tr><th>Role</th><th>Scope</th><th>Since</th><th>Approval</th><th /></tr></thead><tbody>{sel.roles.map((r) => <tr key={r.role_code + r.scope_dept}><td>{r.name}<br /><span className="klh-muted" style={{ fontSize: 12 }}>{docRole(r.role_code) ? `${docRole(r.role_code)!.code} · ${docRole(r.role_code)!.scope}` : r.role_code}</span></td><td>{r.scope_dept}</td><td>{formatDate(r.granted_on)}</td><td className="klh-code">{r.approval_ref ?? '—'}</td><td><Button size="sm" variant="ghost" icon="trash" onClick={() => setRevoke(r)}>Remove</Button></td></tr>)}</tbody></table> : <p className="klh-muted">No roles.</p>}</div>
            {sel.staff_id === s.id ? <Notice tone="warning" title="This is you">Your own roles are changed by another administrator.</Notice> : (
              <form className="klh-stack" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); run(() => api(`/admin/users/${sel.user_id}/roles`, { method: 'POST', json: f }).then(refresh), 'Role given'); }}>
                <p className="klh-overline">Give a role</p>
                <Field label="Role" required><Select value={f.role_code} onChange={(e) => setF({ ...f, role_code: e.target.value })} options={[{ value: '', label: 'Choose' }, ...(roles.data ?? []).map((r) => ({ value: r.role_code, label: `${docRole(r.role_code)?.code ? `${docRole(r.role_code)!.code} · ` : ''}${r.name}` }))]} /></Field>
                <Field label="Scope department" required hint="Department code the role applies to"><Input value={f.scope_dept} onChange={(e) => setF({ ...f, scope_dept: e.target.value })} /></Field>
                <Field label="Written approval reference" required hint="File or letter number of the approval; recorded with the grant"><Input value={f.approval_ref} onChange={(e) => setF({ ...f, approval_ref: e.target.value })} placeholder="HO/2026/ROLES/07" /></Field>
                <div><Button type="submit" variant="primary" icon="plus" loading={busy} blockedReason={!f.role_code ? 'Choose the role.' : !f.approval_ref ? 'Quote the written approval.' : undefined}>Give role</Button></div>
              </form>)}
            <Notice tone="info" title="Scope is not typed here">A warden's floor or hostel comes from MAP-02 Staff mapping; the role only opens the screens.</Notice>
          </div>)}
      </Drawer>
      <ConfirmDialog open={!!revoke} title={`Remove ${revoke?.name} from ${titleCase(sel?.full_name)}?`} body="The screens of this role disappear at the next sign-in." tone="danger" confirmLabel="Remove role" onCancel={() => setRevoke(null)} onConfirm={() => { const r = revoke!; setRevoke(null); run(() => api(`/admin/users/${sel!.user_id}/roles/${r.role_code}/${r.scope_dept}`, { method: 'DELETE' }).then(refresh), 'Role removed'); }} />
    </div>
  );
}
