import { useState } from 'react';
import { Button, Checkbox, ConfirmDialog, Drawer, EmptyState, Field, Input, Notice, Select, StatCard, StatusChip, Textarea, formatDateTime } from '@/lib/klh';
import { api, ApiError } from '@/lib/api';
import { readSheetFile } from '@/lib/sheet';
import { Panel, PillTabs } from '@/ui/kit';
import { ScreenHeader, toast, useApi, words } from '@/lib/ui';

type Account = { account_id: number; username: string; kind: 'student' | 'staff'; email: string | null; status: 'Invited' | 'Active' | 'Disabled'; mail_status: string; mail_error: string | null; mailed_on: string | null;
  last_login: string | null; locked: boolean; full_name: string | null; detail: string | null; roles: string[]; hostels: string[] | null };
type RoleInfo = { code: string; label: string; group: string; hostel: boolean; does: string };
type Summary = { students: number; student_logins: number; residents: number; staff_with_role: number; staff_logins: number; active: number; invited: number; disabled: number; mail_queued: number; mail_failed: number; no_email: number;
  roles: { code: string; label: string; group: string; people: number; logins: number }[]; mail_configured: boolean; web_url: string; invite_days: number };
type Hostel = { facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string };
const MAIL: Record<string, { label: string; tone: 'success' | 'progress' | 'warning' | 'critical' | 'neutral' }> = {
  Sent: { label: 'E-mail sent', tone: 'success' }, Queued: { label: 'In the queue', tone: 'progress' }, Failed: { label: 'E-mail failed', tone: 'critical' }, No_Email: { label: 'No e-mail address', tone: 'warning' }, Not_Sent: { label: 'Not sent yet', tone: 'neutral' } };
const STATUS: Record<string, { label: string; tone: 'success' | 'progress' | 'neutral' }> = { Active: { label: 'Active', tone: 'success' }, Invited: { label: 'Waiting for a password', tone: 'progress' }, Disabled: { label: 'Disabled', tone: 'neutral' } };
const say = (e: unknown) => (e instanceof ApiError ? e.message : String(e));

/**
 * Logins (migration 128). The administrator makes a login for a student or a staff member, one at a time or many at
 * once, and each person is e-mailed a one-time link to set their own password. A staff login is given its role, the
 * hostels it covers and the written approval here too. Nobody's password is seen or typed by the office.
 */
export default function Accounts() {
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const qs = new URLSearchParams({ ...(kind && { kind }), ...(status && { status }), ...(q.trim() && { q: q.trim() }) }).toString();
  const list = useApi<Account[]>(`/admin/accounts${qs ? `?${qs}` : ''}`);
  const sum = useApi<Summary>('/admin/accounts/summary');
  const roles = useApi<RoleInfo[]>('/admin/accounts/roles');
  const hostels = useApi<Hostel[]>('/hostels');
  const [panel, setPanel] = useState<'one' | 'many' | null>(null);
  const [link, setLink] = useState<{ who: string; link: string } | null>(null);
  const [off, setOff] = useState<Account | null>(null);
  const refresh = () => { list.mutate(); sum.mutate(); };
  const act = async (fn: () => Promise<unknown>, done: string) => { try { await fn(); toast(done); refresh(); } catch (e) { toast(say(e), 'critical'); } };
  const s = sum.data;
  const label = (code: string) => roles.data?.find((r) => r.code === code)?.label ?? words(code);

  const sendAgain = (a: Account) => act(() => api(`/admin/accounts/${a.account_id}/invite`, { method: 'POST', json: { mode: 'mail' } }), s?.mail_configured ? `Invitation sent to ${a.full_name ?? a.username}` : 'Put in the queue: it goes out when the mail server is set up');
  const copyLink = async (a: Account) => {
    try {
      const r = await api<{ link: string }>(`/admin/accounts/${a.account_id}/invite`, { method: 'POST', json: { mode: 'link' } });
      try { await navigator.clipboard.writeText(r.link); } catch { /* shown on screen instead */ }
      setLink({ who: a.full_name ?? a.username, link: r.link }); refresh();
    } catch (e) { toast(say(e), 'critical'); }
  };

  return (
    <div className="klh-stack" style={{ gap: 16 }}>
      <ScreenHeader code="ADM-05" title="Logins" subtitle="Make a login for a student or a staff member, one or many. Each person gets an e-mail with a one-time link and sets their own password. A staff login also gets its role and hostels here."
        actions={<div className="klh-row" style={{ gap: 8 }}><Button variant="secondary" icon="users" onClick={() => setPanel('many')}>Create many</Button><Button variant="primary" icon="plus" onClick={() => setPanel('one')}>Create a login</Button></div>} />

      {s && (
        <div className="klh-grid-4">
          <StatCard color="brand" icon="users" label="Students with a login" value={`${s.student_logins} of ${s.students}`} sub={`${s.residents} live in a residency now`} />
          <StatCard color="violet" icon="shield" label="Staff with a login" value={`${s.staff_logins} of ${s.staff_with_role}`} sub="staff who hold a role" />
          <StatCard color="sky" icon="clock" label="Waiting for a password" value={String(s.invited)} sub={`${s.active} active · ${s.disabled} disabled`} />
          <StatCard color={s.mail_failed || s.no_email ? 'orange' : 'green'} icon="mail" label="Invitations" value={s.mail_queued ? `${s.mail_queued} in the queue` : 'Queue empty'} sub={`${s.mail_failed} failed · ${s.no_email} with no address`} />
        </div>)}

      {s && !s.mail_configured && <Notice tone="warning" title="The mail server is not set up yet">Invitations wait in the queue until SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM are set on the server. Until then use "Copy link" and give the link in person.</Notice>}
      {s && s.mail_configured && (s.mail_failed > 0 || s.mail_queued > 0) && (
        <Notice tone={s.mail_failed ? 'critical' : 'info'} title={s.mail_failed ? `${s.mail_failed} invitation${s.mail_failed === 1 ? '' : 's'} could not be sent` : `${s.mail_queued} invitation${s.mail_queued === 1 ? '' : 's'} going out`}
          action={<Button size="sm" variant="secondary" onClick={() => act(() => api('/admin/accounts/requeue', { method: 'POST' }), 'Sending again')}>Send again</Button>}>
          The reason is shown against each login. A wrong address is corrected in the student or staff record, then sent again.</Notice>)}
      {link && (
        <Notice tone="success" title={`One-time link for ${link.who}`} action={<Button size="sm" variant="ghost" onClick={() => setLink(null)}>Done</Button>}>
          Copied. Give it to the person only; it works once, for {s?.invite_days ?? 7} days, and replaces any link sent before.<br /><code style={{ wordBreak: 'break-all' }}>{link.link}</code></Notice>)}

      <Panel title="How many logins" sub="Every role that signs in, what it is responsible for, and how many of its people have a login. Parents act through one-time links and Security through the gate devices: they have no login." flush>
        <table className="klh-table lg-table">
          <thead><tr><th>Role</th><th>Responsible for</th><th style={{ textAlign: 'right' }}>People</th><th style={{ textAlign: 'right' }}>With a login</th></tr></thead>
          <tbody>
            {(s?.roles ?? []).filter((r) => r.people > 0 || ['Student', 'admin', 'Chief_Warden', 'Floor_Warden', 'Room_Allotment', 'Accounts_Section'].includes(r.code)).map((r) => (
              <tr key={r.code}>
                <td><b>{r.label}</b><small className="lg-sub">{r.group}</small></td>
                <td className="klh-muted">{r.code === 'Student' ? 'Their own registration, fees, outings, mess, repairs and record, in the phone app or the portal' : roles.data?.find((x) => x.code === r.code)?.does}</td>
                <td style={{ textAlign: 'right' }}>{r.people}</td>
                <td style={{ textAlign: 'right' }}>{r.logins === r.people && r.people > 0 ? <StatusChip status="Done" tone="success" label={`${r.logins}`} /> : <b>{r.logins}</b>}</td>
              </tr>))}
          </tbody>
        </table>
      </Panel>

      <div className="klh-row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <PillTabs tabs={[{ id: '', label: 'Everyone' }, { id: 'student', label: 'Students', count: s?.student_logins }, { id: 'staff', label: 'Staff', count: s?.staff_logins }]} value={kind} onChange={setKind} />
        <span style={{ flex: 1 }} />
        <div style={{ width: 190 }}><Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" options={[{ value: '', label: 'Any status' }, { value: 'Invited', label: 'Waiting for a password' }, { value: 'Active', label: 'Active' }, { value: 'Disabled', label: 'Disabled' }]} /></div>
        <div style={{ width: 260 }}><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a name, ID or e-mail" aria-label="Search logins" /></div>
      </div>
      <Panel flush>
        {list.data && !list.data.length ? <EmptyState icon="shield" title="No logins here yet" body="Create one, or create many at once for the students and staff already loaded." /> : (
          <table className="klh-table lg-table">
            <thead><tr><th>Person</th><th>Role and residencies</th><th>Login</th><th>Invitation</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {(list.data ?? []).map((a) => (
                <tr key={a.account_id}>
                  <td><b>{a.full_name ?? a.username}</b><small className="lg-sub">{a.username}{a.detail ? ` · ${a.detail}` : ''}</small><small className="lg-sub">{a.email ?? 'no e-mail address'}</small></td>
                  <td>{a.roles.length ? a.roles.map(label).join(', ') : <span className="klh-muted">No role</span>}{(a.hostels ?? []).length > 0 && <span className="lg-chips" style={{ marginTop: 4 }}>{a.hostels!.map((h) => <span key={h} className="lg-chip">{h}</span>)}</span>}</td>
                  <td><StatusChip status={a.status} tone={STATUS[a.status].tone} label={STATUS[a.status].label} />{a.locked && <small className="lg-sub">Locked for a few minutes: too many wrong passwords</small>}<small className="lg-sub">{a.last_login ? `Last signed in ${formatDateTime(a.last_login)}` : 'Never signed in'}</small></td>
                  <td><StatusChip status={a.mail_status} tone={MAIL[a.mail_status]?.tone} label={MAIL[a.mail_status]?.label ?? a.mail_status} />{a.mailed_on && <small className="lg-sub">{formatDateTime(a.mailed_on)}</small>}{a.mail_error && <small className="lg-sub" style={{ color: 'var(--crit, #B42318)' }}>{a.mail_error}</small>}</td>
                  <td className="lg-act">
                    {a.status !== 'Disabled' && <Button size="sm" variant="ghost" onClick={() => sendAgain(a)}>{a.status === 'Active' ? 'Reset password' : 'Send again'}</Button>}
                    {a.status !== 'Disabled' && <Button size="sm" variant="ghost" onClick={() => copyLink(a)}>Copy link</Button>}
                    {a.status === 'Disabled' ? <Button size="sm" variant="ghost" onClick={() => act(() => api(`/admin/accounts/${a.account_id}/status`, { method: 'POST', json: { active: true } }), 'Login enabled')}>Enable</Button>
                      : <Button size="sm" variant="ghost" onClick={() => setOff(a)}>Disable</Button>}
                  </td>
                </tr>))}
            </tbody>
          </table>)}
      </Panel>
      {(list.data?.length ?? 0) >= 500 && <p className="klh-muted">Showing the newest 500. Search to find anyone else.</p>}

      {panel === 'one' && <OnePanel roles={roles.data ?? []} hostels={hostels.data ?? []} onClose={() => setPanel(null)} onSaved={refresh} />}
      {panel === 'many' && s && <ManyPanel sum={s} hostels={hostels.data ?? []} onClose={() => setPanel(null)} onSaved={refresh} />}
      <ConfirmDialog open={!!off} title={off ? `Disable the login of ${off.full_name ?? off.username}?` : ''} body="They are signed out everywhere within half a minute and cannot sign in until the login is enabled again. Their records stay as they are." tone="danger" confirmLabel="Disable login"
        onCancel={() => setOff(null)} onConfirm={() => { const a = off!; setOff(null); act(() => api(`/admin/accounts/${a.account_id}/status`, { method: 'POST', json: { active: false } }), 'Login disabled'); }} />
    </div>
  );
}

/** One login: a student by university ID, or a staff member with the role, hostels and written approval. */
function OnePanel({ roles, hostels, onClose, onSaved }: { roles: RoleInfo[]; hostels: Hostel[]; onClose: () => void; onSaved: () => void }) {
  const [kind, setKind] = useState<'student' | 'staff'>('staff');
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [ref, setRef] = useState('');
  const [send, setSend] = useState(true);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const info = roles.find((r) => r.code === role);
  const blocked = !id.trim() ? 'Enter the ID.' : kind === 'staff' && role && ref.trim().length < 3 ? 'Quote the written approval for the role.' : kind === 'staff' && info?.hostel && !picked.length ? 'Tick at least one hostel.' : undefined;
  const save = async () => {
    setBusy(true); setProblem('');
    try {
      await api('/admin/accounts', { method: 'POST', json: { kind, user_ref: id.trim(), email: email.trim() || null, send, ...(kind === 'staff' && role ? { role, facility_ids: picked, approval_ref: ref.trim() } : {}) } });
      toast(send ? 'Login created and the invitation is on its way' : 'Login created'); onSaved(); onClose();
    } catch (e) { setProblem(say(e)); } finally { setBusy(false); }
  };
  return (
    <Drawer open onClose={onClose} title="Create a login" subtitle="The person sets their own password from the e-mail"
      footer={<div className="dm-panel-foot"><span style={{ flex: 1 }} /><Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button><Button variant="primary" size="sm" loading={busy} blockedReason={blocked} onClick={save}>Create login</Button></div>}>
      <div className="klh-stack" style={{ gap: 16 }}>
        {problem && <Notice tone="critical" title="Not created">{problem}</Notice>}
        <div className="lg-roles" role="radiogroup" aria-label="Who is the login for">
          <button type="button" role="radio" aria-checked={kind === 'staff'} onClick={() => setKind('staff')}><b>Staff member</b><small>Warden, office, accounts, rasoi, maintenance, management</small></button>
          <button type="button" role="radio" aria-checked={kind === 'student'} onClick={() => setKind('student')}><b>Student</b><small>Signs in with the university ID, in the app or the portal</small></button>
        </div>
        <Field label={kind === 'student' ? 'University ID' : 'Employee ID'} required hint={kind === 'student' ? 'The student must be loaded already (upload 9)' : 'The staff member must be loaded already (upload 7)'}><Input value={id} onChange={(e) => setId(e.target.value)} placeholder={kind === 'student' ? '2600040030' : 'E1042'} autoFocus /></Field>
        <Field label="E-mail address" hint="Leave empty to use the address on their record"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@kluniversity.in" /></Field>
        {kind === 'staff' && (<>
          <Field label="Role" hint={info ? info.does : 'Leave as it is if the person already holds a role'}>
            <Select value={role} onChange={(e) => { setRole(e.target.value); setPicked([]); }}
              options={[{ value: '', label: 'Keep the roles they already hold' }, ...roles.map((r) => ({ value: r.code, label: `${r.group} · ${r.label}` }))]} />
          </Field>
          {info?.hostel && (
            <fieldset className="lg-hostels"><legend>Residencies this login covers</legend>
              {hostels.map((h) => <Checkbox key={h.facility_id} label={`${h.hostel_code} · ${h.facility_name}`} description={h.hostel_gender} checked={picked.includes(h.facility_id)} onChange={(v) => setPicked(v ? [...picked, h.facility_id] : picked.filter((x) => x !== h.facility_id))} />)}
            </fieldset>)}
          {role && <Field label="Written approval" required hint="Order or letter number, for example HO/2026/ROLES/12"><Input value={ref} onChange={(e) => setRef(e.target.value)} /></Field>}
          {role && !info?.hostel && <Notice tone="info" title="No hostels to tick for this role">{info?.label} is not limited to a hostel here; floors, messes and areas are set on the Staff mapping and Mess screens.</Notice>}
        </>)}
        <Checkbox label="Send the invitation e-mail now" description="Otherwise the login is made and you send it later, or copy the link" checked={send} onChange={setSend} />
      </div>
    </Drawer>
  );
}

/** Many logins: everyone of a kind who has none yet, or a list of IDs typed, pasted or read from a file. */
function ManyPanel({ sum, hostels, onClose, onSaved }: { sum: Summary; hostels: Hostel[]; onClose: () => void; onSaved: () => void }) {
  const [scope, setScope] = useState<'residents' | 'students' | 'staff' | 'list'>('residents');
  const [fac, setFac] = useState('');
  const [text, setText] = useState('');
  const [send, setSend] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [done, setDone] = useState<{ created: number; queued: number; unknown: string[] } | null>(null);
  const ids = text.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
  const fromFile = async (f?: File) => { if (!f) return; try { const sh = await readSheetFile(f); const col = sh.headers[0]; setText(sh.rows.map((r) => r[col]).filter(Boolean).join('\n')); } catch (e) { setProblem(say(e)); } };
  const save = async () => {
    setBusy(true); setProblem('');
    try {
      const r = await api<{ created: number; queued: number; unknown: string[] }>('/admin/accounts/bulk', { method: 'POST', json: { scope, send, ...(fac && scope !== 'list' ? { facility_id: fac } : {}), ...(scope === 'list' ? { ids } : {}) } });
      setDone(r); onSaved();
    } catch (e) { setProblem(say(e)); } finally { setBusy(false); }
  };
  const OPTIONS: [typeof scope, string, string][] = [
    ['residents', 'Students living in a hostel', `${sum.residents} residents; those with a login already are left alone`],
    ['students', 'Every student loaded', `${sum.students} students, so that new students can apply from their phone`],
    ['staff', 'Staff who hold a role', `${sum.staff_with_role} staff with a role; ${sum.staff_logins} have a login`],
    ['list', 'A list of IDs', 'University or employee IDs, typed, pasted or read from a file'],
  ];
  return (
    <Drawer open onClose={onClose} title="Create many logins" subtitle="People who already have a login are left as they are"
      footer={<div className="dm-panel-foot"><span style={{ flex: 1 }} /><Button variant="ghost" size="sm" onClick={onClose}>{done ? 'Close' : 'Cancel'}</Button>
        {!done && <Button variant="primary" size="sm" loading={busy} blockedReason={scope === 'list' && !ids.length ? 'Give at least one ID.' : undefined} onClick={save}>Create logins</Button>}</div>}>
      <div className="klh-stack" style={{ gap: 16 }}>
        {problem && <Notice tone="critical" title="Not created">{problem}</Notice>}
        {done ? (<>
          <Notice tone="success" title={`${done.created} login${done.created === 1 ? '' : 's'} created`}>{send ? `${done.queued} invitation${done.queued === 1 ? '' : 's'} ${sum.mail_configured ? 'going out now' : 'in the queue'}.` : 'No e-mail sent: send them from the list when you are ready.'}
            {done.created - done.queued > 0 && send ? ` ${done.created - done.queued} have no e-mail address: copy their link, or add an address and send again.` : ''}</Notice>
          {done.unknown.length > 0 && <Notice tone="warning" title={`${done.unknown.length} ID${done.unknown.length === 1 ? ' was' : 's were'} not found`}>{done.unknown.slice(0, 40).join(', ')}{done.unknown.length > 40 ? '…' : ''}. Students must be loaded first (upload 9); staff must be loaded and hold a role (uploads 7 and 8).</Notice>}
        </>) : (<>
          <div className="lg-roles" role="radiogroup" aria-label="Who gets a login" style={{ gridTemplateColumns: '1fr' }}>
            {OPTIONS.map(([v, t, d]) => <button key={v} type="button" role="radio" aria-checked={scope === v} onClick={() => setScope(v)}><b>{t}</b><small>{d}</small></button>)}
          </div>
          {scope !== 'list' && (
            <Field label="Only this residency" hint={scope === 'students' ? 'With a hostel chosen: its hostel students and the students who have applied to it' : 'Leave empty for all hostels'}>
              <Select value={fac} onChange={(e) => setFac(e.target.value)} options={[{ value: '', label: 'All hostels' }, ...hostels.map((h) => ({ value: h.facility_id, label: `${h.hostel_code} · ${h.facility_name}` }))]} />
            </Field>)}
          {scope === 'list' && (<>
            <Field label="IDs" hint={`${ids.length} ID${ids.length === 1 ? '' : 's'} · one on a line, or separated by commas`}><Textarea rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={'2600040030\n2600040031\nE1042'} /></Field>
            <label className="klh-muted" style={{ fontSize: 13 }}>Or read the first column of an Excel or CSV file: <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => fromFile(e.target.files?.[0])} /></label>
          </>)}
          <Checkbox label="Send the invitation e-mails now" description={sum.mail_configured ? 'About five a second; the page shows the queue going down' : 'The mail server is not set up: they will wait in the queue'} checked={send} onChange={setSend} />
        </>)}
      </div>
    </Drawer>
  );
}
