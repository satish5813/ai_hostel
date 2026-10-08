import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Field, Icon, Input, ProgressRing, Select, StatusChip, formatDate, formatINR } from '@/lib/klh';
import { api } from '@/lib/api';
import { Checklist, Panel, Welcome, initials, type Segment } from '@/ui/kit';
import { ScreenHeader, bedLabel, mobile, roomLabel, titleCase, useAction, useApi, useSession, words } from '@/lib/ui';

type Me = {
  student_id: string; full_name: string; gender: string; programme: string; student_type: string; admission_type: string; offering_mode: string | null; regulation: string | null; year_semester: string | null;
  date_of_birth: string; blood_group: string | null; disability: string | null; nationality: string; personal_email: string; admission_date: string | null; father_name: string | null; mother_name: string | null;
  dept_code: string | null; dept_name: string | null; counsellor_id: string | null; counsellor_name: string | null; counsellor_mobile: string | null; is_hosteller: boolean; status: string;
  addresses: { hno: string; street: string; landmark: string; city: string; district: string; state: string; pincode: string; type: string }[] | null;
  contacts: { contact_id: number; relation: string; contact_name: string; mobile_no: string; is_verified: boolean; is_outpass_approver: boolean }[];
  stay: { facility_id: string; space_id: string; subspace_id: string } | null;
};
type Reg = { registration_no: string; hostel_code: string; type_name: string; status: string; applied_on: string; key_no: string | null; allocation_date: string | null; registration_fee_status: string | null; plan_status: string | null };
type Meter = { meter_no: string; units_this_month: string | null; included_units_per_month: string | null; recharged_this_month: string; units_left: string | null };
const age = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 864e5));
const STAGE: Record<string, number> = { Applied: 1, Fee_Paid: 2, Waitlisted: 2, Allotted: 3, Accepted: 4, Confirmed: 5, Checked_In: 6 };

/** GEN-01 for a student: the whole ERP record on one screen, with the hostel stay beside it. */
export default function StudentProfile() {
  const s = useSession()!;
  const navigate = useNavigate();
  const me = useApi<Me>(`/students/${s.id}`);
  const regs = useApi<Reg[]>('/registrations/mine');
  const dues = useApi<{ demands: { amount_due: string; amount_paid: string; status: string }[] }>(`/students/${s.id}/demands`);
  const meter = useApi<Meter>('/meters/mine');
  const passes = useApi<{ status: string }[]>('/outpasses/mine');
  const { run, busy } = useAction();
  const m = me.data;
  if (!m) return null;
  const reg = regs.data?.find((r) => !['Cancelled', 'Vacated'].includes(r.status));
  const stage = reg ? STAGE[reg.status] ?? 0 : 0;
  const due = (dues.data?.demands ?? []).filter((d) => ['Pending', 'Part_Paid', 'Overdue'].includes(d.status)).reduce((a, d) => a + Number(d.amount_due) - Number(d.amount_paid), 0);
  const left = Number(meter.data?.units_left ?? 0), allowance = Number(meter.data?.included_units_per_month ?? 0) + Number(meter.data?.recharged_this_month ?? 0);
  const approver = m.contacts.find((c) => c.is_outpass_approver);
  const journey: Segment[] = ['Applied', 'Fee paid', 'Allotted', 'Accepted', 'Fees paid', 'Checked in'].map((label, i) => ({ label, weight: 1, value: i < stage ? (i === stage - 1 && stage < 6 ? 'Now' : 'Done') : '', tone: i < stage - 1 || stage === 6 ? 'dark' : i === stage - 1 ? 'accent' : 'hatch' }));
  const room = m.stay ? `${roomLabel(m.stay.space_id)}-${bedLabel(m.stay.subspace_id).slice(-1)}` : null;

  return (
    <div className="klh-stack" style={{ gap: 18 }}>
      <ScreenHeader code="GEN-01" bare />
      <Welcome title={titleCase(m.full_name)}
        subtitle={<span><span className="klh-code">{m.student_id}</span>, {m.programme}{m.year_semester ? `, ${m.year_semester}` : ''}</span>}
        chips={<><StatusChip status={m.status} /><StatusChip status={m.is_hosteller ? 'Checked_In' : 'Pending'} label={m.is_hosteller ? 'Hosteller' : 'Day scholar'} tone={m.is_hosteller ? 'success' : 'neutral'} /></>}
        segments={reg ? journey : undefined}
        stats={[{ value: passes.data?.length ?? 0, label: 'Outings', icon: 'door' }, { value: meter.data ? left.toFixed(0) : '—', label: 'Units left', icon: 'bolt' }, { value: formatINR(due), label: due ? 'To pay' : 'Nothing due', icon: 'wallet', gold: due > 0 }]} />

      <div className="ui-bento">
        <div className="ui-c3">
          <div className="ui-photo">
            <span className="ui-photo-initials" aria-hidden="true">{initials(m.full_name)}</span>
            <span className="ui-photo-name">{titleCase(m.full_name)}</span>
            <span className="ui-photo-sub">{m.dept_name ?? m.dept_code ?? m.programme}</span>
            <span className="ui-photo-chip">{room ? `Room ${room}` : 'No room yet'}</span>
          </div>
        </div>

        <Panel className="ui-c3" title="Hostel stay" sub={reg ? `Registration ${reg.registration_no}` : 'Not registered'} action={<Button variant="ghost" size="sm" iconOnly icon="arrow-right" onClick={() => navigate('/registration')}>Open registration</Button>}>
          {m.stay && reg ? (
            <dl className="klh-dl"><dt>Hostel</dt><dd>{reg.hostel_code}</dd><dt>Room</dt><dd>{roomLabel(m.stay.space_id)}</dd><dt>Bed</dt><dd>{bedLabel(m.stay.subspace_id).slice(-1)}</dd><dt>Room type</dt><dd>{reg.type_name}</dd><dt>Key</dt><dd className="klh-code">{reg.key_no ?? '—'}</dd><dt>Since</dt><dd>{formatDate(reg.allocation_date)}</dd></dl>
          ) : <p className="klh-muted" style={{ margin: 0 }}>{reg ? `Your registration is ${words(reg.status).toLowerCase()}. The room appears here after check-in.` : 'Apply for a room under Hostel registration.'}</p>}
        </Panel>

        <Panel className="ui-c3" title="Electricity" sub={meter.data ? `Meter ${meter.data.meter_no}` : 'Linked at check-in'} action={<Button variant="ghost" size="sm" iconOnly icon="arrow-right" onClick={() => navigate('/electricity')}>Open electricity</Button>}>
          {meter.data ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <ProgressRing value={Math.max(left, 0)} max={Math.max(allowance, 1)} size={132} color={left < 10 ? 'red' : 'green'} label={left.toFixed(0)} sublabel="units left" ariaLabel={`${left.toFixed(0)} units left`} />
              <span className="klh-muted" style={{ fontSize: 12.5 }}>{Number(meter.data.units_this_month ?? 0).toFixed(0)} of {Number(meter.data.included_units_per_month ?? 0).toFixed(0)} kWh used this month</span>
            </div>) : <p className="klh-muted" style={{ margin: 0 }}>No meter is linked to you yet.</p>}
        </Panel>

        <div className="ui-c3 ui-r2">
          <Checklist title="Hostel checklist" items={[
            { label: 'Parent number verified', meta: m.contacts.some((c) => c.is_verified && c.relation !== 'Self') ? 'By OTP' : 'Verify a parent contact below', done: m.contacts.some((c) => c.is_verified && c.relation !== 'Self'), icon: 'phone' },
            { label: 'Outing approver chosen', meta: approver ? `${approver.contact_name}, ${approver.relation.toLowerCase()}` : 'Needed before the first outing', done: !!approver, icon: 'users' },
            { label: 'Registration fee', meta: reg?.registration_fee_status ? words(reg.registration_fee_status) : 'After you apply', done: reg?.registration_fee_status === 'Paid', icon: 'receipt', onClick: () => navigate('/fees') },
            { label: 'Room accepted', meta: stage >= 4 ? reg?.type_name : 'After the office offers a bed', done: stage >= 4, icon: 'key', onClick: () => navigate('/registration') },
            { label: 'Hostel and mess fees', meta: reg?.plan_status ? words(reg.plan_status) : 'After you accept the room', done: stage >= 5, icon: 'wallet', onClick: () => navigate('/fees') },
            { label: 'Checked in', meta: reg?.allocation_date ? formatDate(reg.allocation_date) : 'At the hostel office', done: stage >= 6, icon: 'bed' },
          ]} />
        </div>

        <Panel className="ui-c4" title="Record" sub="From the university ERP. Changes are made there.">
          <div className="ui-accordion">
            <details open><summary>Personal<Icon name="chevron-down" size={16} /></summary><div>
              <dl className="klh-dl"><dt>Gender</dt><dd>{m.gender}</dd><dt>Born</dt><dd>{formatDate(m.date_of_birth)}, {age(m.date_of_birth)} years{age(m.date_of_birth) < 18 ? ' (parent consent needed)' : ''}</dd><dt>Blood group</dt><dd>{m.blood_group ?? '—'}</dd><dt>Disability</dt><dd>{m.disability && m.disability !== 'NA' ? m.disability : 'None'}</dd><dt>Nationality</dt><dd>{titleCase(m.nationality)}</dd><dt>E-mail</dt><dd style={{ wordBreak: 'break-all' }}>{m.personal_email}</dd><dt>Father</dt><dd>{m.father_name ? titleCase(m.father_name) : '—'}</dd><dt>Mother</dt><dd>{m.mother_name ? titleCase(m.mother_name) : '—'}</dd></dl></div></details>
            <details><summary>Academic<Icon name="chevron-down" size={16} /></summary><div>
              <dl className="klh-dl"><dt>Programme</dt><dd>{m.programme}</dd><dt>Level</dt><dd>{m.student_type}</dd><dt>Department</dt><dd>{m.dept_name ?? m.dept_code ?? '—'}</dd><dt>Admission</dt><dd>{words(m.admission_type)}{m.admission_date ? `, ${formatDate(m.admission_date)}` : ''}</dd><dt>Mode</dt><dd>{words(m.offering_mode) || '—'}</dd><dt>Regulation</dt><dd>{m.regulation ?? '—'}</dd><dt>Year, semester</dt><dd>{m.year_semester ?? '—'}</dd><dt>Counsellor</dt><dd>{m.counsellor_name ? `${titleCase(m.counsellor_name)}${m.counsellor_mobile ? `, ${mobile(m.counsellor_mobile)}` : ''}` : 'Not assigned'}</dd></dl></div></details>
            <details><summary>Addresses<Icon name="chevron-down" size={16} /></summary><div>
              {m.addresses?.length ? m.addresses.map((a, i) => <p key={i} style={{ margin: '0 0 8px', fontSize: 13.5 }}><b style={{ fontWeight: 600 }}>{a.type}</b><br />{[a.hno, a.street, a.landmark, a.city, a.district, a.state, a.pincode].filter(Boolean).join(', ')}</p>) : <p className="klh-muted" style={{ margin: 0 }}>No address on record.</p>}</div></details>
          </div>
        </Panel>

        <Panel className="ui-c5" title="Family contacts" sub="Verify each number by OTP. One parent or guardian recommends your outings.">
          {m.contacts.map((c) => (
            <div key={c.contact_id} className="ui-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span className="ui-att-avatar klh-tile-brand">{initials(c.contact_name)}</span>
                <div style={{ minWidth: 0 }}><div className="ui-row-title">{titleCase(c.contact_name)} <span className="klh-muted" style={{ fontWeight: 400 }}>{c.relation.toLowerCase()}</span></div><div className="ui-row-sub klh-num">{mobile(c.mobile_no)}</div></div>
              </div>
              <div className="klh-row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {c.is_verified ? <StatusChip status="Verified" /> : <Button size="sm" variant="soft" loading={busy} onClick={() => run(() => api(`/contacts/${c.contact_id}/verify`, { method: 'POST', json: { otp: '000000' } }).then(() => me.mutate()), 'Number verified')}>Verify by OTP</Button>}
                {c.is_outpass_approver ? <StatusChip status="Approver" tone="progress" /> : c.relation !== 'Self' && <Button size="sm" variant="ghost" onClick={() => run(() => api(`/contacts/${c.contact_id}/outpass-approver`, { method: 'POST' }).then(() => me.mutate()), `${titleCase(c.contact_name)} will recommend outings`)}>Make approver</Button>}
              </div>
            </div>))}
          {m.contacts.length === 0 && <p className="klh-muted" style={{ margin: '0 0 8px' }}>No contacts yet. Add a parent or guardian.</p>}
          <AddContact studentId={m.student_id} onDone={() => me.mutate()} />
        </Panel>
      </div>
    </div>
  );
}

function AddContact({ studentId, onDone }: { studentId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ relation: 'Father', contact_name: '', mobile_no: '' });
  const { run, busy } = useAction();
  if (!open) return <div style={{ marginTop: 12 }}><button className="ui-dashed" onClick={() => setOpen(true)}><Icon name="plus" size={14} />Add a contact</button></div>;
  return (
    <form className="klh-row" style={{ alignItems: 'flex-end', gap: 10, marginTop: 12, flexWrap: 'wrap' }} onSubmit={(e) => { e.preventDefault(); run(() => api(`/students/${studentId}/contacts`, { method: 'POST', json: f }).then(() => { setF({ relation: 'Father', contact_name: '', mobile_no: '' }); setOpen(false); onDone(); }), 'Contact added. Verify the number by OTP.'); }}>
      <Field label="Relation"><Select value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })} options={['Father', 'Mother', 'Guardian']} /></Field>
      <Field label="Name"><Input value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} required /></Field>
      <Field label="Mobile"><Input value={f.mobile_no} onChange={(e) => setF({ ...f, mobile_no: e.target.value })} required pattern="[6-9][0-9]{9}" placeholder="10 digits" /></Field>
      <Button type="submit" variant="primary" loading={busy}>Add</Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </form>
  );
}
