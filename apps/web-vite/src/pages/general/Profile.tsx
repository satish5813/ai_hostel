import { Avatar, Card, HeroHeader, Notice, StatusChip, formatDate } from '@/lib/klh';
import { ScreenHeader, bedLabel, mobile, roomLabel, titleCase, useProfile, useSession, words } from '@/lib/ui';
import { roleDef } from '@/app/screens';
import StudentProfile from './StudentProfile';
import { ChangePasswordForm } from './ChangePassword';

/** GEN-01 My profile and contacts: own details; students add or change a parent contact, verified by OTP. */
export default function Profile() {
  const s = useSession();
  if (!s) return null;
  return s.kind === 'student' ? <StudentProfile /> : s.kind === 'parent' ? <ParentProfile /> : <StaffProfile />;
}

/* ---------- parent ---------- */
function ParentProfile() {
  const p = useProfile();
  const d = p.data as (typeof p.data & { relation?: string; mobile_no?: string; is_verified?: boolean; is_outpass_approver?: boolean; programme?: string; hostel_code?: string; space_id?: string | null; subspace_id?: string | null }) | undefined;
  if (!d) return null;
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="GEN-01" compact />
      <HeroHeader title={<span className="klh-row" style={{ gap: 16 }}><Avatar name={d.contact_name ?? ''} size="xl" color="accent" />{d.contact_name}</span>} subtitle={`${d.relation} of ${titleCase(d.student_name)}`}
        chips={[<StatusChip key="v" status={d.is_verified ? 'Verified' : 'Pending'} label={d.is_verified ? 'Number verified' : 'Not verified'} />, d.is_outpass_approver ? <StatusChip key="a" status="Approver" tone="progress" label="Outing approver" /> : null]} />
      <div className="klh-grid-2">
        <Card icon="phone" color="brand" title="Your contact details" subtitle="Changed by your child from their profile"><dl className="klh-dl"><dt>Name</dt><dd>{d.contact_name}</dd><dt>Relation</dt><dd>{d.relation}</dd><dt>Mobile</dt><dd className="klh-num">{mobile(d.mobile_no)}</dd></dl></Card>
        <Card icon="bed" color="indigo" title="Your child" subtitle={d.programme}><dl className="klh-dl"><dt>Name</dt><dd>{titleCase(d.student_name)}</dd><dt>University ID</dt><dd className="klh-code">{d.student_id}</dd><dt>Residency</dt><dd>{d.hostel_code ?? 'Not a hosteller yet'}</dd>{d.space_id && <><dt>Room</dt><dd>{roomLabel(d.space_id)}-{bedLabel(d.subspace_id).slice(-1)}</dd></>}</dl></Card>
      </div>
      <Notice tone="info" title="What you can see">Your child's outing requests, fee dues and receipts. Not their live location, tickets, grievances or rasoi feedback.</Notice>
    </div>
  );
}

/* ---------- staff ---------- */
function StaffProfile() {
  const s = useSession()!;
  const p = useProfile();
  const d = p.data as (typeof p.data & { salutation?: string; gender?: string; staff_type?: string; dept_code?: string; campus_code?: string; official_email?: string; mobile_no?: string; joining_date?: string; status?: string; blood_group?: string; roles?: { role_code: string; name: string; scope_dept: string; granted_on: string; approval_ref: string | null }[] | null }) | undefined;
  const def = roleDef(s.role);
  if (p.error) return <div className="klh-stack" style={{ gap: 24 }}><ScreenHeader code="GEN-01" compact /><Notice tone="warning" title="No staff record for this ID">The ERP employee master has no row for {s.id}. Sign in with an employee from the fixtures, or import employee_profile.</Notice></div>;
  if (!d) return null;
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="GEN-01" compact />
      <HeroHeader eyebrow={`${d.staff_type ?? ''} · ${d.dept_name ?? d.dept_code ?? ''}`} title={<span className="klh-row" style={{ gap: 16 }}><Avatar name={d.full_name ?? ''} size="xl" color="brand" />{d.salutation ? `${d.salutation} ` : ''}{d.full_name}</span>}
        subtitle={<span><span className="klh-code">{d.staff_id}</span> · {d.designation}</span>} chips={[<StatusChip key="s" status={d.status ?? 'Active'} />, <StatusChip key="r" status={def?.code ?? s.role} label={`${def?.code ?? ''} ${def?.name.split(' (')[0] ?? words(s.role)}`} tone="progress" />]}
        stats={[{ value: String(d.assignments?.length ?? 0), label: 'Active duties' }, { value: String(d.roles?.length ?? 0), label: 'Roles held' }, { value: d.joining_date ? formatDate(d.joining_date) : '—', label: 'Joined' }, { value: d.blood_group ?? '—', label: 'Blood group', gold: true }]} />
      <div className="klh-grid-2">
        <Card icon="user" color="brand" title="Employee record" subtitle="From the university ERP; changes are made there">
          <dl className="klh-dl"><dt>Full name</dt><dd>{d.full_name}</dd><dt>Gender</dt><dd>{d.gender}</dd><dt>Designation</dt><dd>{d.designation}</dd><dt>Department</dt><dd>{d.dept_name ?? d.dept_code}</dd><dt>Campus</dt><dd>{d.campus_code ?? '—'}</dd><dt>Official email</dt><dd>{d.official_email ?? '—'}</dd><dt>Mobile</dt><dd className="klh-num">{mobile(d.mobile_no)}</dd></dl>
        </Card>
        <Card icon="users" color="brand" title="Duties (Staff_Space_Assignment)" subtitle="Your scope comes from these rows, not from a setting">
          {d.assignments?.length ? <dl className="klh-dl">{d.assignments.map((a, i) => <span key={i} style={{ display: 'contents' }}><dt>{words(a.hostel_role)}</dt><dd>{a.hostel_name}{a.floor_name ? `, ${a.floor_name}` : ''} · {a.shift} shift</dd></span>)}</dl> : <p className="klh-muted">No active duty. University-wide roles need none.</p>}
        </Card>
        <Card icon="shield" color="brand" title="Roles (ADM-01)" subtitle="Given by the Data Administrator on written approval">
          {d.roles?.length ? <table className="klh-table"><thead><tr><th>Role</th><th>Scope</th><th>Since</th><th>Approval</th></tr></thead><tbody>{d.roles.map((r) => <tr key={r.role_code + r.scope_dept}><td>{r.name}</td><td>{r.scope_dept}</td><td>{formatDate(r.granted_on)}</td><td className="klh-code">{r.approval_ref ?? '—'}</td></tr>)}</tbody></table> : <p className="klh-muted">No portal roles recorded; this session uses the development role header.</p>}
        </Card>
        {def && <Card icon="eye" color="brand" title="Scope and device" subtitle={def.name}><dl className="klh-dl"><dt>Sees</dt><dd>{def.scope}</dd><dt>Used on</dt><dd>{def.device}</dd></dl></Card>}
        <Card icon="lock" color="brand" title="Password" subtitle={`Username ${s.id}`}><ChangePasswordForm /></Card>
      </div>
    </div>
  );
}
