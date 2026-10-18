import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, Checkbox, DataTable, EmptyState, Field, Input, Notice, Select, StatusChip, formatDate, formatINR } from '@/lib/klh';
import { api } from '@/lib/api';
import { Panel, PillTabs } from '@/ui/kit';
import { ScreenHeader, titleCase, useAction, useApi, words } from '@/lib/ui';
import UploadCentre from './Upload';

type Year = { academic_year: string; start_date: string; end_date: string; is_current: boolean; registration_opens: string | null; registration_closes: string | null; renewal_opens: string | null; renewal_closes: string | null };
type Hostel = { facility_id: string; facility_name: string; hostel_code: string; hostel_gender: string; gate_close_time: string | null; status: string; floors: { zone_id: string; zone_name: string; spaces: { space_category: string; beds: number }[] }[] };
type RoomType = { room_type_id: number; type_name: string; sharing_count: number; is_ac: boolean; attached_bath?: boolean };
type Fee = { fee_id: number; room_type_id: number; type_name: string; facility_id: string; hostel_code: string; academic_year: string; registration_fee: string; hostel_fee: string; instalment_1_pct: string; instalment_2_due_date: string; caution_deposit: string; elec_caution_deposit: string; meter_charge: string };
type Mess = { mess_id: number; mess_name: string; facility_id: string; facility_name: string | null; incharge_id: string | null; incharge_name: string | null; capacity: number; annual_fee: string; status: string };
type Staff = { staff_id: string; full_name: string; designation: string; dept_code: string; staff_type: string; mobile_no: string; duties: number; roles: string | null; status: string };
type Student = { student_id: string; full_name: string; gender: string; programme: string; dept_code: string | null; status: string; room: string | null; verified_contacts: number };

const TABS = [
  { id: 'upload', label: 'Upload files', icon: 'upload' as const },
  { id: 'years', label: 'Academic years', icon: 'calendar' as const }, { id: 'hostels', label: 'Hostels', icon: 'building' as const }, { id: 'types', label: 'Room types', icon: 'key' as const },
  { id: 'fees', label: 'Fees', icon: 'wallet' as const }, { id: 'mess', label: 'Rasoi', icon: 'utensils' as const }, { id: 'staff', label: 'Staff', icon: 'users' as const }, { id: 'students', label: 'Students', icon: 'user' as const },
];

/** Masters: the inputs every workflow reads. Entered by the Data Administrator, in the order of the tabs. */
export default function Masters() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'upload';
  return (
    <div className="klh-stack" style={{ gap: 16 }}>
      <ScreenHeader code="ADM-04" subtitle="Upload each master as a file, or add single records under its tab. A workflow refuses to start when its master is missing: no registration without a fee, no check-in without a bed." />
      <PillTabs tabs={TABS} value={tab} onChange={(id) => setParams({ tab: id })} />
      {tab === 'upload' && <UploadCentre />}
      {tab === 'years' && <Years />}
      {tab === 'hostels' && <Hostels />}
      {tab === 'types' && <RoomTypes />}
      {tab === 'fees' && <Fees />}
      {tab === 'mess' && <Messes />}
      {tab === 'staff' && <StaffTab />}
      {tab === 'students' && <Students />}
    </div>
  );
}

function Split({ table, form, formTitle, formSub, extra }: { table: ReactNode; form: ReactNode; formTitle: string; formSub?: string; extra?: ReactNode }) {
  return <div className="ui-bento"><Panel className="ui-c8" flush>{table}</Panel><div className="ui-c4 klh-stack" style={{ gap: 12 }}><Panel title={formTitle} sub={formSub}>{form}</Panel>{extra}</div></div>;
}

/**
 * The dates students can apply for a hostel (Stage 1), and the earlier renewal window in which this year's hostel students
 * keep their bed or ask for another for the next year. Outside them only the hostel office can register a student.
 */
const WINDOWS = {
  registration: { title: 'Registration window', sub: 'New students can apply only between these dates', path: 'window', o: 'registration_opens', c: 'registration_closes', what: 'Registration' },
  renewal: { title: 'Renewal window', sub: 'Students living in a hostel renew for this year; usually before new registration opens', path: 'renewal-window', o: 'renewal_opens', c: 'renewal_closes', what: 'Renewal' },
} as const;
function YearWindow({ kind, years, onSaved }: { kind: keyof typeof WINDOWS; years: Year[]; onSaved: () => void }) {
  const W = WINDOWS[kind];
  const cur = years.find((y) => y.is_current) ?? years[0];
  // hostel students renew for the year after the current one
  const def = kind === 'renewal' ? years.filter((y) => cur && y.start_date > cur.start_date).sort((a, b) => a.start_date.localeCompare(b.start_date))[0] ?? cur : cur;
  const [year, setYear] = useState('');
  const y = years.find((x) => x.academic_year === year) ?? def;
  const [f, setF] = useState({ opens: '', closes: '' });
  useEffect(() => { if (y) setF({ opens: y[W.o]?.slice(0, 10) ?? '', closes: y[W.c]?.slice(0, 10) ?? '' }); }, [y?.academic_year, y?.[W.o], y?.[W.c]]);   // eslint-disable-line react-hooks/exhaustive-deps
  const { run, busy } = useAction();
  if (!y) return null;
  return (
    <Panel title={W.title} sub={W.sub}>
      <form className="klh-stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); run(() => api(`/admin/academic-years/${y.academic_year}/${W.path}`, { method: 'POST', json: { opens: f.opens || null, closes: f.closes || null } }).then(onSaved), f.opens ? `${W.what} for ${y.academic_year} opens ${formatDate(f.opens)}` : `${W.what} for ${y.academic_year} closed`); }}>
        <Field label="Year"><Select value={y.academic_year} onChange={(e) => setYear(e.target.value)} options={years.map((x) => ({ value: x.academic_year, label: `${x.academic_year}${x.is_current ? ' (current)' : ''}` }))} /></Field>
        <Field label="Opens"><Input type="date" value={f.opens} onChange={(e) => setF({ ...f, opens: e.target.value })} /></Field>
        <Field label="Closes"><Input type="date" value={f.closes} onChange={(e) => setF({ ...f, closes: e.target.value })} /></Field>
        <div className="klh-row" style={{ gap: 8, flexWrap: 'wrap' }}><Button type="submit" variant="primary" loading={busy} blockedReason={f.opens && !f.closes ? 'Set the closing date.' : f.opens && f.closes < f.opens ? 'It closes before it opens.' : undefined}>Save window</Button>
          {y[W.o] && <Button variant="ghost" onClick={() => setF({ opens: '', closes: '' })}>Clear (close {W.what.toLowerCase()})</Button>}</div>
      </form>
    </Panel>);
}

function Years() {
  const list = useApi<Year[]>('/admin/academic-years');
  const [f, setF] = useState({ academic_year: '', start_date: '', end_date: '' });
  const { run, busy } = useAction();
  return <Split formTitle="Add an academic year" formSub="Registrations, fees and allotments belong to one year"
    table={<DataTable caption="Academic years" rowKey="academic_year" rows={list.data ?? []} loading={!list.data} empty={<EmptyState icon="calendar" title="No academic year" body="Add the year hostels open for." />}
      columns={[
        { key: 'academic_year', label: 'Year', render: (v: string) => <b style={{ fontWeight: 600 }}>{v}</b> },
        { key: 'start_date', label: 'Starts', render: (v: string) => formatDate(v) },
        { key: 'end_date', label: 'Ends', render: (v: string) => formatDate(v) },
        { key: 'registration_opens', label: 'Students can apply', render: (v: string | null, r: Year) => (v ? `${formatDate(v)} – ${formatDate(r.registration_closes!)}` : <span className="klh-muted">Not open</span>) },
        { key: 'renewal_opens', label: 'Hostel students renew', render: (v: string | null, r: Year) => (v ? `${formatDate(v)} – ${formatDate(r.renewal_closes!)}` : <span className="klh-muted">Not open</span>) },
        { key: 'is_current', label: 'Current', render: (v: boolean, r: Year) => (v ? <StatusChip status="Active" label="Current year" /> : <Button size="sm" variant="ghost" onClick={() => run(() => api(`/admin/academic-years/${r.academic_year}/current`, { method: 'POST' }).then(() => list.mutate()), `${r.academic_year} is now the current year`)}>Make current</Button>) },
      ]} />}
    form={<form className="klh-stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); run(() => api('/admin/academic-years', { method: 'POST', json: f }).then(() => { list.mutate(); setF({ academic_year: '', start_date: '', end_date: '' }); }), 'Academic year added'); }}>
      <Field label="Year" required hint="Like 2027-28"><Input value={f.academic_year} onChange={(e) => setF({ ...f, academic_year: e.target.value })} placeholder="2027-28" /></Field>
      <Field label="Starts" required><Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
      <Field label="Ends" required><Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
      <div><Button type="submit" variant="primary" icon="plus" loading={busy} blockedReason={!/^\d{4}-\d{2}$/.test(f.academic_year) ? 'Enter the year as 2027-28.' : !f.start_date || !f.end_date ? 'Set both dates.' : undefined}>Add year</Button></div>
    </form>}
    extra={<><YearWindow kind="renewal" years={list.data ?? []} onSaved={() => list.mutate()} /><YearWindow kind="registration" years={list.data ?? []} onSaved={() => list.mutate()} /></>} />;
}

function Hostels() {
  const navigate = useNavigate();
  const list = useApi<Hostel[]>('/structure');
  const [f, setF] = useState({ hostel_code: '', facility_name: '', hostel_gender: 'Boys', floors: '4', gate_close_time: '21:30' });
  const { run, busy } = useAction();
  return <Split formTitle="Add a residency building" formSub="Creates the building and its floors. Rooms are added in Room management."
    table={<DataTable caption="Hostels" rowKey="facility_id" rows={list.data ?? []} loading={!list.data} onRowClick={() => navigate('/rooms')} empty={<EmptyState icon="building" title="No hostel yet" body="Add the first building on the right." />}
      columns={[
        { key: 'hostel_code', label: 'Code', render: (v: string) => <span className="klh-code">{v}</span> },
        { key: 'facility_name', label: 'Hostel', render: (v: string) => <b style={{ fontWeight: 600 }}>{v}</b> },
        { key: 'hostel_gender', label: 'For' },
        { key: 'floors', label: 'Floors', align: 'right', render: (v: Hostel['floors']) => v.length },
        { key: 'facility_id', label: 'Rooms', align: 'right', render: (_v: string, r: Hostel) => r.floors.reduce((a, fl) => a + fl.spaces.filter((s) => s.space_category === 'Hostel_Room').length, 0) },
        { key: 'status', label: 'Beds', align: 'right', render: (_v: string, r: Hostel) => r.floors.reduce((a, fl) => a + fl.spaces.reduce((b, s) => b + Number(s.beds), 0), 0) },
        { key: 'gate_close_time', label: 'Gate closes', render: (v: string | null) => v?.slice(0, 5) ?? '—' },
      ]} />}
    form={<form className="klh-stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); run(() => api('/admin/hostels', { method: 'POST', json: { ...f, floors: Number(f.floors) } }).then(() => { list.mutate(); setF({ hostel_code: '', facility_name: '', hostel_gender: 'Boys', floors: '4', gate_close_time: '21:30' }); }), 'Hostel added. Add its rooms next.'); }}>
      <Field label="Residency name" required><Input value={f.facility_name} onChange={(e) => setF({ ...f, facility_name: e.target.value })} placeholder="Boys Residency 2" /></Field>
      <div className="klh-grid-2" style={{ gap: 12 }}>
        <Field label="Code" required hint="Prefix of room IDs"><Input value={f.hostel_code} onChange={(e) => setF({ ...f, hostel_code: e.target.value.toUpperCase() })} placeholder="BH2" /></Field>
        <Field label="For" required><Select value={f.hostel_gender} onChange={(e) => setF({ ...f, hostel_gender: e.target.value })} options={['Boys', 'Girls', 'Staff']} /></Field>
        <Field label="Floors" required><Input type="number" min={1} max={30} value={f.floors} onChange={(e) => setF({ ...f, floors: e.target.value })} /></Field>
        <Field label="Gate closes"><Input type="time" value={f.gate_close_time} onChange={(e) => setF({ ...f, gate_close_time: e.target.value })} /></Field>
      </div>
      <div className="klh-row"><Button type="submit" variant="primary" icon="plus" loading={busy} blockedReason={!f.facility_name ? 'Name the hostel.' : !/^[A-Z0-9]{2,8}$/.test(f.hostel_code) ? 'Code: 2 to 8 letters or digits.' : undefined}>Add residency</Button><Button variant="ghost" icon="building" onClick={() => navigate('/rooms')}>Room management</Button></div>
    </form>} />;
}

function RoomTypes() {
  const list = useApi<RoomType[]>('/room-types');
  const [f, setF] = useState({ type_name: '', sharing_count: '2', is_ac: false, attached_bath: true });
  const { run, busy } = useAction();
  return <Split formTitle="Add a room type" formSub="Sharing decides how many beds a room of this type gets"
    table={<DataTable caption="Room types" rowKey="room_type_id" rows={list.data ?? []} loading={!list.data} empty={<EmptyState icon="key" title="No room types" />}
      columns={[
        { key: 'type_name', label: 'Room type', render: (v: string) => <b style={{ fontWeight: 600 }}>{v}</b> },
        { key: 'sharing_count', label: 'Beds in a room', align: 'right' },
        { key: 'is_ac', label: 'Air conditioning', render: (v: boolean) => (v ? 'AC' : 'Non-AC') },
      ]} />}
    form={<form className="klh-stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); run(() => api('/admin/room-types', { method: 'POST', json: { ...f, sharing_count: Number(f.sharing_count) } }).then(() => { list.mutate(); setF({ ...f, type_name: '' }); }), 'Room type added'); }}>
      <Field label="Name" required><Input value={f.type_name} onChange={(e) => setF({ ...f, type_name: e.target.value })} placeholder="5-sharing non-AC" /></Field>
      <Field label="Beds in a room" required><Input type="number" min={1} max={12} value={f.sharing_count} onChange={(e) => setF({ ...f, sharing_count: e.target.value })} /></Field>
      <Checkbox label="Air conditioned" checked={f.is_ac} onChange={(v) => setF({ ...f, is_ac: v })} />
      <Checkbox label="Attached bathroom" checked={f.attached_bath} onChange={(v) => setF({ ...f, attached_bath: v })} />
      <div><Button type="submit" variant="primary" icon="plus" loading={busy} blockedReason={f.type_name.length < 3 ? 'Name the room type.' : undefined}>Add room type</Button></div>
    </form>} />;
}

function Fees() {
  const years = useApi<Year[]>('/admin/academic-years');
  const hostels = useApi<Hostel[]>('/structure');
  const types = useApi<RoomType[]>('/room-types');
  const current = years.data?.find((y) => y.is_current)?.academic_year ?? '';
  const [year, setYear] = useState('');
  const y = year || current;
  const list = useApi<Fee[]>(y ? `/admin/room-type-fees?academic_year=${y}` : null);
  const [f, setF] = useState({ facility_id: '', room_type_id: '', registration_fee: '5000', hostel_fee: '', instalment_1_pct: '60', instalment_2_due_date: '', caution_deposit: '10000', elec_caution_deposit: '2000', meter_charge: '500' });
  const { run, busy } = useAction();
  return <Split formTitle={`Set a fee for ${y}`} formSub="One row per residency and room type. Saving again replaces the amounts."
    table={<DataTable caption="Fees" rowKey="fee_id" rows={list.data ?? []} loading={!list.data} searchable
      onRowClick={(r) => { const x = r as Fee; setF({ facility_id: x.facility_id, room_type_id: String(x.room_type_id), registration_fee: String(Number(x.registration_fee)), hostel_fee: String(Number(x.hostel_fee)), instalment_1_pct: String(Number(x.instalment_1_pct)), instalment_2_due_date: x.instalment_2_due_date,
        caution_deposit: String(Number(x.caution_deposit)), elec_caution_deposit: String(Number(x.elec_caution_deposit)), meter_charge: String(Number(x.meter_charge)) }); }}
      filters={<Select value={y} onChange={(e) => setYear(e.target.value)} options={(years.data ?? []).map((x) => ({ value: x.academic_year, label: x.academic_year }))} />}
      empty={<EmptyState icon="wallet" title={`No fees for ${y}`} body="Students cannot register for a room type until its fee is set." />}
      columns={[
        { key: 'hostel_code', label: 'Hostel', render: (v: string) => <span className="klh-code">{v}</span> },
        { key: 'type_name', label: 'Room type' },
        { key: 'registration_fee', label: 'Registration', align: 'right', render: (v: string) => <span className="klh-num">{formatINR(v)}</span> },
        { key: 'hostel_fee', label: 'Hostel fee a year', align: 'right', render: (v: string) => <b className="klh-num" style={{ fontWeight: 600 }}>{formatINR(v)}</b> },
        { key: 'caution_deposit', label: 'Caution deposit', align: 'right', render: (v: string) => <span className="klh-num">{formatINR(v)}</span> },
        { key: 'elec_caution_deposit', label: 'Electricity deposit', align: 'right', render: (v: string) => <span className="klh-num">{formatINR(v)}</span> },
        { key: 'meter_charge', label: 'Meter charge a year', align: 'right', render: (v: string) => <span className="klh-num">{formatINR(v)}</span> },
        { key: 'instalment_1_pct', label: 'First instalment', align: 'right', render: (v: string) => `${Number(v)}%` },
        { key: 'instalment_2_due_date', label: 'Second due', render: (v: string) => formatDate(v) },
      ]} />}
    form={<form className="klh-stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); run(() => api('/admin/room-type-fees', { method: 'POST', json: { facility_id: f.facility_id, room_type_id: Number(f.room_type_id), academic_year: y, registration_fee: Number(f.registration_fee), hostel_fee: Number(f.hostel_fee), instalment_1_pct: Number(f.instalment_1_pct), instalment_2_due_date: f.instalment_2_due_date,
      caution_deposit: Number(f.caution_deposit), elec_caution_deposit: Number(f.elec_caution_deposit), meter_charge: Number(f.meter_charge) } }).then(() => list.mutate()), 'Fee saved'); }}>
      <Field label="Hostel" required><Select value={f.facility_id} onChange={(e) => setF({ ...f, facility_id: e.target.value })} options={[{ value: '', label: 'Choose' }, ...(hostels.data ?? []).map((h) => ({ value: h.facility_id, label: h.facility_name }))]} /></Field>
      <Field label="Room type" required><Select value={f.room_type_id} onChange={(e) => setF({ ...f, room_type_id: e.target.value })} options={[{ value: '', label: 'Choose' }, ...(types.data ?? []).map((t) => ({ value: String(t.room_type_id), label: t.type_name }))]} /></Field>
      <div className="klh-grid-2" style={{ gap: 12 }}>
        <Field label="Registration fee (₹)" required hint="Not refundable"><Input type="number" value={f.registration_fee} onChange={(e) => setF({ ...f, registration_fee: e.target.value })} /></Field>
        <Field label="Residency fee a year (₹)" required><Input type="number" value={f.hostel_fee} onChange={(e) => setF({ ...f, hostel_fee: e.target.value })} /></Field>
        <Field label="First instalment (%)" required><Input type="number" min={1} max={100} value={f.instalment_1_pct} onChange={(e) => setF({ ...f, instalment_1_pct: e.target.value })} /></Field>
        <Field label="Second instalment due" required><Input type="date" value={f.instalment_2_due_date} onChange={(e) => setF({ ...f, instalment_2_due_date: e.target.value })} /></Field>
        <Field label="Caution deposit (₹)" hint="Refundable; on joining only"><Input type="number" min={0} value={f.caution_deposit} onChange={(e) => setF({ ...f, caution_deposit: e.target.value })} /></Field>
        <Field label="Electricity caution deposit (₹)" hint="Refundable; on joining only"><Input type="number" min={0} value={f.elec_caution_deposit} onChange={(e) => setF({ ...f, elec_caution_deposit: e.target.value })} /></Field>
        <Field label="Electricity meter charge a year (₹)" hint="Every year, also on renewal"><Input type="number" min={0} value={f.meter_charge} onChange={(e) => setF({ ...f, meter_charge: e.target.value })} /></Field>
      </div>
      <p className="klh-muted" style={{ margin: 0, fontSize: 13 }}>Joining: registration, both deposits, residency fee, rasoi fee and meter charge. Renewal: residency fee, rasoi fee and meter charge only.</p>
      <Field label="Second instalment" derived value={f.hostel_fee ? formatINR(Number(f.hostel_fee) * (100 - Number(f.instalment_1_pct)) / 100) : '—'} />
      <div><Button type="submit" variant="primary" loading={busy} blockedReason={!f.facility_id || !f.room_type_id ? 'Choose residency and room type.' : !f.hostel_fee ? 'Enter the residency fee.' : !f.instalment_2_due_date ? 'Set the second due date.' : undefined}>Save fee</Button></div>
    </form>} />;
}

function Messes() {
  const list = useApi<Mess[]>('/admin/messes');
  const hostels = useApi<Hostel[]>('/structure');
  const [f, setF] = useState({ mess_name: '', facility_id: '', incharge_id: '', capacity: '400', annual_fee: '48000' });
  const { run, busy } = useAction();
  return <Split formTitle="Add a rasoi" formSub="The rasoi fee is demanded with the residency fee when the student picks a cuisine"
    table={<DataTable caption="Messes" rowKey="mess_id" rows={list.data ?? []} loading={!list.data} empty={<EmptyState icon="utensils" title="No mess yet" />}
      columns={[
        { key: 'mess_name', label: 'Rasoi', render: (v: string) => <b style={{ fontWeight: 600 }}>{v}</b> },
        { key: 'facility_name', label: 'Hostel', render: (v: string | null) => v ?? '—' },
        { key: 'incharge_name', label: 'In-charge', render: (v: string | null, r: Mess) => (v ? `${titleCase(v)} (${r.incharge_id})` : '—') },
        { key: 'capacity', label: 'Seats', align: 'right' },
        { key: 'annual_fee', label: 'Fee a year', align: 'right', render: (v: string) => <span className="klh-num">{formatINR(v)}</span> },
        { key: 'status', label: 'Status', render: (v: string) => <StatusChip status={v} /> },
      ]} />}
    form={<form className="klh-stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); run(() => api('/admin/messes', { method: 'POST', json: { ...f, capacity: Number(f.capacity), annual_fee: Number(f.annual_fee), incharge_id: f.incharge_id || undefined } }).then(() => { list.mutate(); setF({ ...f, mess_name: '' }); }), 'Rasoi added'); }}>
      <Field label="Rasoi name" required><Input value={f.mess_name} onChange={(e) => setF({ ...f, mess_name: e.target.value })} placeholder="Boys Residency 2 Rasoi" /></Field>
      <Field label="Serves hostel" required><Select value={f.facility_id} onChange={(e) => setF({ ...f, facility_id: e.target.value })} options={[{ value: '', label: 'Choose' }, ...(hostels.data ?? []).map((h) => ({ value: h.facility_id, label: h.facility_name }))]} /></Field>
      <Field label="In-charge" hint="Employee ID"><Input value={f.incharge_id} onChange={(e) => setF({ ...f, incharge_id: e.target.value })} placeholder="S-MS" /></Field>
      <div className="klh-grid-2" style={{ gap: 12 }}>
        <Field label="Seats" required><Input type="number" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></Field>
        <Field label="Fee a year (₹)" required><Input type="number" value={f.annual_fee} onChange={(e) => setF({ ...f, annual_fee: e.target.value })} /></Field>
      </div>
      <div><Button type="submit" variant="primary" icon="plus" loading={busy} blockedReason={f.mess_name.length < 3 ? 'Name the mess.' : !f.facility_id ? 'Choose the hostel.' : undefined}>Add rasoi</Button></div>
    </form>} />;
}

function StaffTab() {
  const navigate = useNavigate();
  const list = useApi<Staff[]>('/admin/staff');
  const depts = useApi<{ dept_code: string; dept_name: string }[]>('/admin/departments');
  const [f, setF] = useState({ staff_id: '', salutation: 'Mr.', first_name: '', last_name: '', gender: 'Male', dept_code: 'HOSTELS', designation: '', staff_type: 'Warden', mobile_no: '', official_email: '' });
  const { run, busy } = useAction();
  return <Split formTitle="Add a staff member" formSub="Normally imported from the employee master. After adding: give a role, then a duty."
    table={<DataTable caption="Staff" rowKey="staff_id" rows={list.data ?? []} loading={!list.data} searchable searchPlaceholder="Search name or employee ID" pageSize={12} onRowClick={() => navigate('/admin/users')} empty={<EmptyState icon="users" title="No staff" />}
      columns={[
        { key: 'full_name', label: 'Name', render: (v: string, r: Staff) => <span><b style={{ fontWeight: 600 }}>{titleCase(v)}</b> <span className="klh-code klh-muted">{r.staff_id}</span></span> },
        { key: 'designation', label: 'Designation' },
        { key: 'dept_code', label: 'Dept' },
        { key: 'roles', label: 'Roles', render: (v: string | null) => (v ? words(v) : <StatusChip status="Pending" label="No role" />) },
        { key: 'duties', label: 'Duties', align: 'right' },
      ]} />}
    form={<form className="klh-stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); run(() => api('/admin/staff', { method: 'POST', json: f }).then(() => { list.mutate(); setF({ ...f, staff_id: '', first_name: '', last_name: '', mobile_no: '', official_email: '', designation: '' }); }), 'Staff member added. Give a role under Users and roles.'); }}>
      <div className="klh-grid-2" style={{ gap: 12 }}>
        <Field label="Employee ID" required><Input value={f.staff_id} onChange={(e) => setF({ ...f, staff_id: e.target.value })} /></Field>
        <Field label="Title"><Select value={f.salutation} onChange={(e) => setF({ ...f, salutation: e.target.value })} options={['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.']} /></Field>
        <Field label="First name" required><Input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></Field>
        <Field label="Last name"><Input value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></Field>
        <Field label="Gender" required><Select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} options={['Male', 'Female', 'Other']} /></Field>
        <Field label="Staff type" required><Select value={f.staff_type} onChange={(e) => setF({ ...f, staff_type: e.target.value })} options={['Warden', 'Admin', 'Security', 'Mess', 'Maintenance', 'Housekeeping', 'Faculty', 'Medical', 'Counsellor', 'Other']} /></Field>
      </div>
      <Field label="Designation" required><Input value={f.designation} onChange={(e) => setF({ ...f, designation: e.target.value })} placeholder="Floor Manager" /></Field>
      <Field label="Department" required><Select value={f.dept_code} onChange={(e) => setF({ ...f, dept_code: e.target.value })} options={(depts.data ?? []).map((d) => ({ value: d.dept_code, label: `${d.dept_name} (${d.dept_code})` }))} /></Field>
      <div className="klh-grid-2" style={{ gap: 12 }}>
        <Field label="Mobile" required hint="10 digits"><Input value={f.mobile_no} onChange={(e) => setF({ ...f, mobile_no: e.target.value })} /></Field>
        <Field label="Official e-mail"><Input type="email" value={f.official_email} onChange={(e) => setF({ ...f, official_email: e.target.value })} /></Field>
      </div>
      <div><Button type="submit" variant="primary" icon="plus" loading={busy} blockedReason={!f.staff_id || !f.first_name ? 'Enter the employee ID and name.' : !f.designation ? 'Enter the designation.' : !/^[6-9]\d{9}$/.test(f.mobile_no) ? 'Enter a 10-digit mobile number.' : undefined}>Add staff member</Button></div>
    </form>} />;
}

function Students() {
  const list = useApi<Student[]>('/admin/students');
  const depts = useApi<{ dept_code: string; dept_name: string }[]>('/admin/departments');
  const [f, setF] = useState({ student_id: '', full_name: '', gender: 'Male', student_type: 'UG', programme: '', date_of_birth: '', personal_email: '', dept_code: '', father_name: '', parent_mobile: '' });
  const { run, busy } = useAction();
  return <Split formTitle="Add a student" formSub="Normally imported from the student register. Aadhaar, PAN and bank details are never stored here."
    table={<>
      <DataTable caption="Students" rowKey="student_id" rows={list.data ?? []} loading={!list.data} searchable searchPlaceholder="Search name or University ID" pageSize={12} empty={<EmptyState icon="user" title="No students" />}
        columns={[
          { key: 'student_id', label: 'University ID', render: (v: string) => <span className="klh-code">{v}</span> },
          { key: 'full_name', label: 'Name', render: (v: string) => <b style={{ fontWeight: 600 }}>{titleCase(v)}</b> },
          { key: 'programme', label: 'Programme' },
          { key: 'gender', label: 'Gender' },
          { key: 'room', label: 'Room', render: (v: string | null) => v ?? <span className="klh-muted">Not a residency student</span> },
          { key: 'verified_contacts', label: 'Verified contacts', align: 'right' },
        ]} />
      <div style={{ padding: '0 16px 16px' }}><Notice tone="info" title="Bulk import">The yearly load comes from the ERP student profile export (9,449 rows in the sample). This form is for single additions.</Notice></div>
    </>}
    form={<form className="klh-stack" style={{ gap: 14 }} onSubmit={(e) => { e.preventDefault(); run(() => api('/admin/students', { method: 'POST', json: { ...f, dept_code: f.dept_code || undefined, father_name: f.father_name || undefined, parent_mobile: f.parent_mobile || undefined } }).then(() => { list.mutate(); setF({ ...f, student_id: '', full_name: '', personal_email: '', father_name: '', parent_mobile: '' }); }), 'Student added'); }}>
      <div className="klh-grid-2" style={{ gap: 12 }}>
        <Field label="University ID" required><Input value={f.student_id} onChange={(e) => setF({ ...f, student_id: e.target.value })} placeholder="2600040030" /></Field>
        <Field label="Level" required><Select value={f.student_type} onChange={(e) => setF({ ...f, student_type: e.target.value })} options={['UG', 'PG', 'PhD']} /></Field>
      </div>
      <Field label="Full name" required><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
      <div className="klh-grid-2" style={{ gap: 12 }}>
        <Field label="Gender" required hint="Decides which hostels are offered"><Select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} options={['Male', 'Female', 'Other']} /></Field>
        <Field label="Date of birth" required><Input type="date" value={f.date_of_birth} onChange={(e) => setF({ ...f, date_of_birth: e.target.value })} /></Field>
        <Field label="Programme" required><Input value={f.programme} onChange={(e) => setF({ ...f, programme: e.target.value })} placeholder="Btech CSE" /></Field>
        <Field label="Department"><Select value={f.dept_code} onChange={(e) => setF({ ...f, dept_code: e.target.value })} options={[{ value: '', label: 'Not set' }, ...(depts.data ?? []).map((d) => ({ value: d.dept_code, label: d.dept_code }))]} /></Field>
      </div>
      <Field label="E-mail" required><Input type="email" value={f.personal_email} onChange={(e) => setF({ ...f, personal_email: e.target.value })} /></Field>
      <div className="klh-grid-2" style={{ gap: 12 }}>
        <Field label="Father's name"><Input value={f.father_name} onChange={(e) => setF({ ...f, father_name: e.target.value })} /></Field>
        <Field label="Parent mobile" hint="Verified by OTP later"><Input value={f.parent_mobile} onChange={(e) => setF({ ...f, parent_mobile: e.target.value })} /></Field>
      </div>
      <div><Button type="submit" variant="primary" icon="plus" loading={busy} blockedReason={f.student_id.length < 5 ? 'Enter the University ID.' : f.full_name.length < 3 ? 'Enter the name.' : !f.date_of_birth ? 'Enter the date of birth.' : !f.programme ? 'Enter the programme.' : !f.personal_email ? 'Enter the e-mail.' : undefined}>Add student</Button></div>
    </form>} />;
}
