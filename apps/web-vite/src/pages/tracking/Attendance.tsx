import { useMemo, useState } from 'react';
import { Button, Drawer, EmptyState, Icon, Notice, SegmentedControl, Select, StatusChip, formatDate, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import { Panel, Row, Stat, initials } from '@/ui/kit';
import { ScreenHeader, bedLabel, roomLabel, titleCase, useAction, useApi, useProfile, useSession, words } from '@/lib/ui';

type Student = { student_id: string; full_name: string; programme: string; space_id: string; subspace_id: string; room_code: string; zone_id: string; floor_name: string; current_status: string | null };
type Outing = { student_id: string; outpass_id: number; outpass_no: string; destination: string; leave_from: string; return_by: string; status: string; outing_category: string };
type Sick = { student_id: string; sick_leave_id: number; illness_details: string; from_date: string; to_date: string; status: string };
type Mark = { student_id: string; att_date: string; status: string; marked_by: string; remarks: string | null };
type Register = { students: Student[]; outings: Outing[]; sick: Sick[]; marks: Mark[] };

const DAYS = 14;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const TINTS = ['klh-tile-brand', 'klh-tile-violet', 'klh-tile-sky', 'klh-tile-amber', 'klh-tile-rose', 'klh-tile-indigo'];
const CONFIRMED = ['Approved', 'Out', 'Returned', 'Overdue'];

/**
 * Attendance register (TRK-07, an addition to the 87 screens): every resident against every day.
 * Outings and sick leave are drawn as bars from the requests themselves; the night roll call adds a mark per night.
 */
export default function Attendance() {
  const s = useSession()!;
  const profile = useProfile();
  const hostels = useApi<{ facility_id: string; facility_name: string }[]>('/hostels');
  const [facility, setFacility] = useState('');
  const fac = facility || profile.data?.assignments?.[0]?.facility_id || hostels.data?.[0]?.facility_id || '';
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [start, setStart] = useState(() => addDays(today, -6));
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => addDays(start, i)), [start]);
  const reg = useApi<Register>(fac ? `/attendance?facility_id=${fac}&from=${iso(days[0])}&to=${iso(days[DAYS - 1])}` : null);
  const [roll, setRoll] = useState(false);
  const canMark = ['Floor_Warden', 'Warden', 'Assistant_Warden', 'Chief_Warden'].includes(s.role);
  const idx = (d: string | Date) => Math.round((new Date(typeof d === 'string' && d.length === 10 ? `${d}T00:00:00` : d).setHours(0, 0, 0, 0) - days[0].getTime()) / 864e5);
  const todayIso = iso(today);
  const lastNight = iso(addDays(today, -1));
  const d = reg.data;
  const marksOn = (date: string) => (d?.marks ?? []).filter((m) => m.att_date.slice(0, 10) === date);
  const away = (st: Student, date: string) => (d?.outings ?? []).find((o) => o.student_id === st.student_id && CONFIRMED.includes(o.status) && o.leave_from.slice(0, 10) <= date && iso(new Date(o.return_by)) >= date);
  const sickOn = (st: Student, date: string) => (d?.sick ?? []).find((l) => l.student_id === st.student_id && l.status === 'Approved' && l.from_date.slice(0, 10) <= date && l.to_date.slice(0, 10) >= date);
  const cols = { gridTemplateColumns: `repeat(${DAYS}, var(--att-col))` };
  const upcoming = (d?.outings ?? []).filter((o) => iso(new Date(o.return_by)) >= todayIso).sort((a, b) => a.leave_from.localeCompare(b.leave_from));
  const absences = (d?.marks ?? []).filter((m) => m.status === 'Absent').sort((a, b) => b.att_date.localeCompare(a.att_date));
  const nameOf = (id: string) => titleCase(d?.students.find((x) => x.student_id === id)?.full_name);

  return (
    <div className="klh-stack" style={{ gap: 18 }}>
      <ScreenHeader code="TRK-07" subtitle="Outings and sick leave come from the approved requests. You take the night roll call; an absence with no pass raises a Not Seen alert."
        actions={canMark ? <Button variant="primary" icon="check" onClick={() => setRoll(true)} blockedReason={!d?.students.length ? 'No residents in your scope.' : undefined}>Take tonight's roll call</Button> : undefined} />
      {d && (
        <div className="ad-stats">
          <Stat icon="users" color="brand" label="Residents" value={String(d.students.length)} />
          <Stat icon="check" color="sky" label="Present last night" value={String(marksOn(lastNight).filter((m) => m.status === 'Present').length)} sub={`${marksOn(lastNight).filter((m) => m.status === 'Absent').length} absent`} />
          <Stat icon="door" color="violet" label="On a pass today" value={String(d.students.filter((st) => away(st, todayIso)).length)} />
          <Stat icon="heart" color="rose" label="On sick leave" value={String(d.students.filter((st) => sickOn(st, todayIso)).length)} />
        </div>)}

      <Panel flush title="Register" sub={`${formatDate(days[0])} to ${formatDate(days[DAYS - 1])}`}
        action={<div className="klh-row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Select value={fac} onChange={(e) => setFacility(e.target.value)} options={(hostels.data ?? []).map((h) => ({ value: h.facility_id, label: h.facility_name }))} />
          <Button size="sm" variant="secondary" icon="chevron-left" iconOnly onClick={() => setStart(addDays(start, -7))}>Earlier week</Button>
          <Button size="sm" variant="secondary" onClick={() => setStart(addDays(today, -6))}>Today</Button>
          <Button size="sm" variant="secondary" icon="chevron-right" iconOnly onClick={() => setStart(addDays(start, 7))}>Later week</Button>
        </div>}>
        <div className="ui-att">
          <div className="ui-att-grid">
            <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', alignSelf: 'end', padding: '0 0 8px 4px' }}>Residents</div>
            <div className="ui-att-days" style={cols}>
              {days.map((day) => { const w = day.getDay() === 0 || day.getDay() === 6; const t = iso(day) === todayIso; return (
                <div key={iso(day)} className={`ui-att-day${t ? ' ui-att-day-today' : w ? ' ui-att-day-off' : ''}`}>{day.toLocaleDateString('en-IN', { weekday: 'short' })}<b>{day.getDate()}</b></div>); })}
            </div>
            {d?.students.map((st, n) => (
              <div key={st.student_id} style={{ display: 'contents' }}>
                <div className="ui-att-person">
                  <span className={`ui-att-avatar ${TINTS[n % TINTS.length]}`}>{initials(st.full_name)}</span>
                  <span style={{ minWidth: 0 }}><span className="ui-att-name" style={{ display: 'block' }}>{titleCase(st.full_name)}</span><span className="ui-att-meta" style={{ display: 'block' }}>{roomLabel(st.space_id)}-{bedLabel(st.subspace_id).slice(-1)} · {st.programme}</span></span>
                </div>
                <div className="ui-att-row" style={cols}>
                  {days.map((day, i) => { const date = iso(day); const w = day.getDay() === 0 || day.getDay() === 6; const m = d.marks.find((x) => x.student_id === st.student_id && x.att_date.slice(0, 10) === date); return (
                    <div key={date} className={`ui-att-cell${w ? ' ui-att-cell-off' : ''}${date === todayIso ? ' ui-att-cell-today' : ''}`} style={{ gridColumn: i + 1 }} title={m ? `${formatDate(date)}: ${words(m.status)}, marked by ${m.marked_by}` : undefined}>
                      {m?.status === 'Present' && <span className="ui-att-mark" aria-label="Present" />}
                      {m?.status === 'Absent' && <span className="ui-att-absent">Absent</span>}
                    </div>); })}
                  {d.outings.filter((o) => o.student_id === st.student_id).map((o) => { const a = Math.max(0, idx(o.leave_from)), b = Math.min(DAYS - 1, idx(o.return_by)); if (b < 0 || a > DAYS - 1) return null; return (
                    <div key={`o${o.outpass_id}`} className={`ui-att-bar ${CONFIRMED.includes(o.status) ? 'ui-att-bar-outing' : 'ui-att-bar-pending'}`} style={{ gridColumn: `${a + 1} / ${b + 2}` }} title={`${o.outpass_no} · ${o.destination} · ${formatDateTime(o.leave_from)} to ${formatDateTime(o.return_by)} · ${words(o.status)}`}>
                      <span className="ui-att-bar-icon"><Icon name="door" size={13} /></span>{b - a >= 1 && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Outing, {o.destination}</span>}{b - a >= 2 && <span className="ui-att-bar-chip">{words(o.status)}</span>}
                    </div>); })}
                  {d.sick.filter((l) => l.student_id === st.student_id).map((l) => { const a = Math.max(0, idx(l.from_date.slice(0, 10))), b = Math.min(DAYS - 1, idx(l.to_date.slice(0, 10))); if (b < 0 || a > DAYS - 1) return null; return (
                    <div key={`s${l.sick_leave_id}`} className="ui-att-bar ui-att-bar-sick" style={{ gridColumn: `${a + 1} / ${b + 2}` }} title={`Sick leave · ${l.illness_details} · ${formatDate(l.from_date)} to ${formatDate(l.to_date)} · ${words(l.status)}`}>
                      <span className="ui-att-bar-icon"><Icon name="heart" size={13} /></span>{b - a >= 1 && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Sick leave</span>}{b - a >= 2 && <span className="ui-att-bar-chip">{words(l.status)}</span>}
                    </div>); })}
                </div>
              </div>))}
          </div>
          {d && d.students.length === 0 && <EmptyState icon="users" title="No residents in your scope" body="Residents appear here after check-in, on the floors you are assigned to." />}
        </div>
        <div className="klh-row" style={{ gap: 16, padding: '0 20px 16px', fontSize: 12.5, color: 'var(--ink-muted)', flexWrap: 'wrap' }}>
          <span className="klh-row" style={{ gap: 6 }}><span className="ui-att-mark" />Present at roll call</span>
          <span className="klh-row" style={{ gap: 6 }}><span className="ui-att-absent">Absent</span>no pass</span>
          <span className="klh-row" style={{ gap: 6 }}><span style={{ width: 22, height: 10, borderRadius: 4 }} className="ui-att-bar-outing" />Outing, approved</span>
          <span className="klh-row" style={{ gap: 6 }}><span style={{ width: 22, height: 10, borderRadius: 4 }} className="ui-att-bar-pending" />Outing, still in approval</span>
          <span className="klh-row" style={{ gap: 6 }}><span style={{ width: 22, height: 10, borderRadius: 4 }} className="ui-att-bar-sick" />Sick leave</span>
        </div>
      </Panel>

      <div className="ui-bento">
        <Panel className="ui-c4" title="Outings" sub="Leaving or away from today">
          {upcoming.length ? upcoming.slice(0, 6).map((o) => <Row key={o.outpass_id} left={`${nameOf(o.student_id)}, ${o.destination}`} sub={`${formatDateTime(o.leave_from)} to ${formatDateTime(o.return_by)}`} right={<StatusChip status={o.status} />} />) : <p className="klh-muted" style={{ margin: 0 }}>No one is away or due to leave.</p>}
        </Panel>
        <Panel className="ui-c4" title="Sick leave" sub="Meals go to the room once approved">
          {d?.sick.length ? d.sick.map((l) => <Row key={l.sick_leave_id} left={nameOf(l.student_id)} sub={`${formatDate(l.from_date)} to ${formatDate(l.to_date)} · ${l.illness_details}`} right={<StatusChip status={l.status} />} />) : <p className="klh-muted" style={{ margin: 0 }}>No sick leave in this fortnight.</p>}
        </Panel>
        <Panel className="ui-c4" title="Absences at roll call" sub="Each raised a Not Seen alert (TRK-03)">
          {absences.length ? absences.slice(0, 6).map((m) => <Row key={m.student_id + m.att_date} left={nameOf(m.student_id)} sub={`Night of ${formatDate(m.att_date)} · marked by ${m.marked_by}`} right={<span className="ui-att-absent">Absent</span>} />) : <p className="klh-muted" style={{ margin: 0 }}>No absences recorded.</p>}
        </Panel>
      </div>

      {roll && d && <RollCall date={todayIso} facility={fac} students={d.students} existing={marksOn(todayIso)} away={(st) => !!away(st, todayIso)} sick={(st) => !!sickOn(st, todayIso)} onClose={() => setRoll(false)} onDone={() => { reg.mutate(); setRoll(false); }} />}
    </div>
  );
}

function RollCall({ date, facility, students, existing, away, sick, onClose, onDone }: { date: string; facility: string; students: Student[]; existing: Mark[]; away: (s: Student) => boolean; sick: (s: Student) => boolean; onClose: () => void; onDone: () => void }) {
  const [marks, setMarks] = useState<Record<string, string>>(() => Object.fromEntries(students.map((st) => [st.student_id, existing.find((m) => m.student_id === st.student_id)?.status ?? (away(st) ? 'On_Pass' : sick(st) ? 'Sick_Leave' : 'Present')])));
  const { run, busy } = useAction();
  const absent = Object.values(marks).filter((v) => v === 'Absent').length;
  return (
    <Drawer open onClose={onClose} title="Night roll call" subtitle={`${formatDate(date)} · ${students.length} residents`}
      footer={<Button variant="primary" icon="check" loading={busy} onClick={() => run(() => api('/attendance/mark', { method: 'POST', json: { att_date: date, facility_id: facility, marks: students.map((st) => ({ student_id: st.student_id, status: marks[st.student_id] })) } }).then(onDone), absent ? `Roll call saved. ${absent} Not Seen alert${absent > 1 ? 's' : ''} raised.` : 'Roll call saved. Everyone accounted for.')}>Save roll call</Button>}>
      <div className="klh-stack" style={{ gap: 4 }}>
        {students.map((st) => { const auto = away(st) ? 'On an approved pass' : sick(st) ? 'On sick leave, in room' : null; return (
          <div key={st.student_id} className="ui-row">
            <div style={{ minWidth: 0 }}><div className="ui-row-title">{titleCase(st.full_name)}</div><div className="ui-row-sub">{roomLabel(st.space_id)}-{bedLabel(st.subspace_id).slice(-1)} · {st.student_id}</div></div>
            {auto ? <StatusChip status={marks[st.student_id]} label={auto} tone="info" /> : <SegmentedControl label={`Roll call for ${st.full_name}`} value={marks[st.student_id]} onChange={(v) => setMarks({ ...marks, [st.student_id]: v })} options={[{ value: 'Present', label: 'Present' }, { value: 'Absent', label: 'Absent' }]} />}
          </div>); })}
        {absent > 0 && <Notice tone="warning" title={`${absent} marked absent`}>Saving raises a Not Seen alert for each, assigned to the Floor Warden of the floor.</Notice>}
      </div>
    </Drawer>
  );
}
