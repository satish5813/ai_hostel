import { useEffect, useState } from 'react';
import { Button, Checkbox, ConfirmDialog, Drawer, EmptyState, Field, Input, Notice } from '@/lib/klh';
import { api, ApiError } from '@/lib/api';
import { Panel, PillTabs } from '@/ui/kit';
import { ScreenHeader, titleCase, toast, useApi } from '@/lib/ui';

type Login = { user_id: number; staff_id: string; full_name: string; designation: string | null; mobile_no: string | null; active: boolean; role: 'Chief_Warden' | 'Room_Allotment'; approval_ref: string | null; granted_on: string | null; facilities: string[] };
type Hostel = { facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string };
type Staff = { staff_id: string; full_name: string; designation: string | null; dept_code: string | null };
const ROLE = { Chief_Warden: 'Chief Manager', Room_Allotment: 'Room Allotment' } as const;
type Role = keyof typeof ROLE;

/**
 * Logins and hostels (decision D7). Only two staff logins exist in this release: Chief Manager and Room Allotment.
 * Each is given the hostels it may see; the person sees nothing else. Roles are given on a written approval and never to oneself.
 */
export default function Logins() {
  const list = useApi<Login[]>('/admin/logins');
  const hostels = useApi<Hostel[]>('/hostels');
  const [tab, setTab] = useState<Role>('Chief_Warden');
  const [edit, setEdit] = useState<Login | 'new' | null>(null);
  const [off, setOff] = useState<Login | null>(null);
  const rows = (list.data ?? []).filter((l) => l.role === tab);
  const code = (f: string) => hostels.data?.find((h) => h.facility_id === f)?.hostel_code ?? f.replace(/^H-/, '');
  const uncovered = (hostels.data ?? []).filter((h) => !(list.data ?? []).some((l) => l.role === tab && l.facilities.includes(h.facility_id)));

  const disable = async () => {
    const l = off!; setOff(null);
    try { await api(`/admin/logins/${l.staff_id}/${l.role}/disable`, { method: 'POST' }); toast(`${titleCase(l.full_name)} can no longer sign in as ${ROLE[l.role]}`); list.mutate(); }
    catch (e) { toast(e instanceof ApiError ? e.message : String(e), 'critical'); }
  };

  return (
    <div className="klh-stack" style={{ gap: 16 }}>
      <ScreenHeader code="ADM-01" title="Logins and hostels" subtitle="The Chief Manager and Room Allotment logins, and the hostels each one covers. A login sees only its hostels. Students sign in with their university ID; parents and the Dean act by link."
        actions={<Button variant="primary" icon="plus" onClick={() => setEdit('new')}>Give a login</Button>} />
      <PillTabs tabs={(Object.keys(ROLE) as Role[]).map((r) => ({ id: r, label: ROLE[r], count: (list.data ?? []).filter((l) => l.role === r).length }))} value={tab} onChange={(v) => setTab(v as Role)} />
      {uncovered.length > 0 && <Notice tone="warning" title={`${uncovered.length} hostel${uncovered.length > 1 ? 's have' : ' has'} no ${ROLE[tab]}`}>{uncovered.map((h) => h.hostel_code).join(', ')}. {tab === 'Chief_Warden' ? 'Nobody can give the final approval there.' : 'Nobody can verify fees or check students in there.'}</Notice>}
      <Panel flush>
        {list.data && !rows.length ? <EmptyState icon="shield" title={`No ${ROLE[tab]} login yet`} body="Give one to a staff member and choose their hostels." /> : (
          <table className="klh-table lg-table">
            <thead><tr><th>Person</th><th>Hostels</th><th>Approval</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {rows.map((l) => (
                <tr key={`${l.staff_id}-${l.role}`}>
                  <td><b>{titleCase(l.full_name)}</b><small className="lg-sub">{l.staff_id}{l.designation ? ` · ${l.designation}` : ''}</small></td>
                  <td>{l.facilities.length ? <span className="lg-chips">{l.facilities.map((f) => <span key={f} className="lg-chip">{code(f)}</span>)}</span> : <span className="klh-muted">No hostel: sees nothing</span>}</td>
                  <td className="klh-muted">{l.approval_ref ?? '—'}</td>
                  <td className="lg-act"><Button size="sm" variant="ghost" onClick={() => setEdit(l)}>Hostels</Button><Button size="sm" variant="ghost" onClick={() => setOff(l)}>Remove</Button></td>
                </tr>))}
            </tbody>
          </table>)}
      </Panel>
      {edit && <LoginPanel login={edit === 'new' ? null : edit} role={tab} hostels={hostels.data ?? []} onClose={() => setEdit(null)} onSaved={() => list.mutate()} />}
      <ConfirmDialog open={!!off} title={off ? `Remove ${titleCase(off.full_name)}'s ${ROLE[off.role]} login?` : ''} body="Their hostels end today and the role is taken away. The audit log keeps the record." tone="danger" confirmLabel="Remove login" onCancel={() => setOff(null)} onConfirm={disable} />
    </div>
  );
}

function LoginPanel({ login, role: defRole, hostels, onClose, onSaved }: { login: Login | null; role: Role; hostels: Hostel[]; onClose: () => void; onSaved: () => void }) {
  const [role, setRole] = useState<Role>(login?.role ?? defRole);
  const [q, setQ] = useState('');
  const [staff, setStaff] = useState<Staff | null>(login ? { staff_id: login.staff_id, full_name: login.full_name, designation: login.designation, dept_code: null } : null);
  const [found, setFound] = useState<Staff[]>([]);
  const [picked, setPicked] = useState<string[]>(login?.facilities ?? []);
  const [ref, setRef] = useState(login?.approval_ref ?? '');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (login || q.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(() => api<Staff[]>(`/staff?q=${encodeURIComponent(q.trim())}`).then((r) => setFound(r.slice(0, 8))).catch(() => setFound([])), 250);
    return () => clearTimeout(t);
  }, [q, login]);
  const save = async () => {
    setBusy(true); setProblem('');
    try {
      await api('/admin/logins', { method: 'POST', json: { staff_id: staff!.staff_id, role, facility_ids: picked, approval_ref: ref.trim() } });
      toast(login ? 'Hostels saved' : `${titleCase(staff!.full_name)} can now sign in as ${ROLE[role]}`); onSaved(); onClose();
    } catch (e) { setProblem(e instanceof ApiError ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <Drawer open onClose={onClose} title={login ? `${titleCase(login.full_name)} · ${ROLE[login.role]}` : 'Give a login'} subtitle="A login sees only the hostels ticked here"
      footer={<div className="dm-panel-foot"><span style={{ flex: 1 }} /><Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" loading={busy} blockedReason={!staff ? 'Choose the staff member.' : ref.trim().length < 3 ? 'Quote the written approval.' : undefined} onClick={save}>{login ? 'Save hostels' : 'Give login'}</Button></div>}>
      <div className="klh-stack" style={{ gap: 16 }}>
        {problem && <Notice tone="critical" title="Not saved">{problem}</Notice>}
        {!login && (
          <>
            <div className="lg-roles" role="radiogroup" aria-label="Login">
              {(Object.keys(ROLE) as Role[]).map((r) => <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)}><b>{ROLE[r]}</b><small>{r === 'Chief_Warden' ? 'Final approvals, exceptions, alerts' : 'Allotment desk, fee check, check-in'}</small></button>)}
            </div>
            {staff ? (
              <div className="lg-picked"><span><b>{titleCase(staff.full_name)}</b><small>{staff.staff_id}{staff.designation ? ` · ${staff.designation}` : ''}</small></span><Button size="sm" variant="ghost" onClick={() => setStaff(null)}>Change</Button></div>
            ) : (
              <Field label="Staff member" required hint="Name or employee ID">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff" autoFocus />
                {found.length > 0 && <div className="lg-found">{found.map((s) => <button key={s.staff_id} type="button" onClick={() => { setStaff(s); setQ(''); }}><b>{titleCase(s.full_name)}</b><small>{s.staff_id}{s.designation ? ` · ${s.designation}` : ''}</small></button>)}</div>}
              </Field>)}
          </>)}
        <fieldset className="lg-hostels"><legend>Hostels</legend>
          {hostels.map((h) => <Checkbox key={h.facility_id} label={`${h.hostel_code} · ${h.facility_name}`} description={h.hostel_gender} checked={picked.includes(h.facility_id)} onChange={(v) => setPicked(v ? [...picked, h.facility_id] : picked.filter((x) => x !== h.facility_id))} />)}
          <div className="klh-row" style={{ gap: 8 }}><Button size="sm" variant="ghost" onClick={() => setPicked(hostels.map((h) => h.facility_id))}>All hostels</Button><Button size="sm" variant="ghost" onClick={() => setPicked([])}>None</Button></div>
        </fieldset>
        <Field label="Written approval" required hint="Order or letter number, for example HO/2026/CW/04"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
      </div>
    </Drawer>
  );
}
