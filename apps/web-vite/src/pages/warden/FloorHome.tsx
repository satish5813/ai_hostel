import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Drawer, Icon, Input, Notice, StatusChip, formatDate, formatDateTime, type T } from '@/lib/klh';
import { api } from '@/lib/api';
import { greeting, mobile, titleCase, today, useAction, useApi, useProfile, useSession, words } from '@/lib/ui';
import { initials } from '@/ui/kit';
import { bedLetter } from '@/lib/beds';

export type FloorBed = { zone_id: string; space_id: string; room_code: string; subspace_id: string; bed_code: string; type_name: string | null; bed_status: string; facility_id: string;
  student_id: string | null; full_name: string | null; programme: string | null; mobile: string | null; current_status: string | null; mark: string | null; mark_remarks: string | null; on_pass: string | null; on_sick: number | null };
type Floor = { zone_id: string; floor_name: string; floor_no: number; facility_id: string; hostel_name: string; hostel_code: string };
type Alert = { alert_id: number; alert_type: string; student_id: string | null; full_name: string | null; raised_at: string; severity: string; status: string; action_taken: string | null };
type Sick = { sick_leave_id: number; student_id: string; full_name: string; illness_details: string; from_date: string; to_date: string; status: string; visited_at: string | null; visit_remarks: string | null; room_meals_required: boolean; room_code: string };
type Ret = { outpass_id: number; outpass_no: string; student_id: string; full_name: string; destination: string; leave_from: string; return_by: string; status: string };
type CheckIn = { registration_id: number; student_id: string; full_name: string; programme: string; subspace_id: string; room_code: string; fee_check_status: string };
type Duty = { duty_id: number; zone_id: string; space_id: string | null; space_code: string | null; hostel_role: string; shift: string; source: string; staff_id: string | null; full_name: string | null; mobile_no: string | null; att_status: string | null; facility_id: string };
export type FloorDay = { date: string; floors: Floor[]; beds: FloorBed[]; alerts: Alert[]; sick: Sick[]; returning: Ret[]; checkins: CheckIn[]; staff: Duty[] };
type AccessReq = { request_id: number; full_name: string; room_code: string | null; point_name: string; reason: string; requested_at: string };
type Inbox = { step_id: number; request_type: string; request_id: number; full_name: string; room_code: string | null; summary: string; from_at: string; to_at: string | null }[];

/** Where a resident is tonight, from tonight's mark first, then the approved pass or sick leave, then the tracking status. */
export const stateOf = (b: FloorBed) => {
  if (!b.student_id) return 'empty';
  if (b.mark) return ({ Present: 'in', Absent: 'absent', On_Pass: 'pass', Sick_Leave: 'sick' } as Record<string, string>)[b.mark] ?? 'in';
  if (b.on_pass || b.current_status === 'Outside_On_Pass') return 'pass';
  if (b.on_sick || b.current_status === 'On_Sick_Leave') return 'sick';
  if (b.current_status === 'Not_Seen' || b.current_status === 'Outside_No_Pass' || b.current_status === 'Overdue') return 'absent';
  return 'in';
};
const STATE_LABEL: Record<string, string> = { in: 'In hostel', pass: 'On a pass', sick: 'Sick leave', absent: 'Not seen', empty: 'Empty bed' };
const iso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

type Op = { key: string; title: string; about: string; icon: T.IconName; color: T.TileColor; count?: number; unit: string; warn?: string; go?: string };

/**
 * Floor Warden home (FW): the floors in their charge as one board. Today's numbers, the operations as icon cards
 * (each opens a side panel with the list and the action), and the rooms with every resident's state tonight.
 */
export default function FloorHome() {
  const s = useSession()!;
  const navigate = useNavigate();
  const p = useProfile();
  const day = useApi<FloorDay>('/floor/today');
  const inbox = useApi<Inbox>('/approvals/inbox');
  const tickets = useApi<{ status: string; late: boolean }[]>('/tickets');
  const access = useApi<AccessReq[]>('/access/requests');
  const [zone, setZone] = useState('all');
  const [panel, setPanel] = useState<string | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const d = day.data;
  const inZone = <X extends { zone_id?: string }>(x: X) => zone === 'all' || x.zone_id === zone;
  const beds = (d?.beds ?? []).filter(inZone);
  const res = beds.filter((b) => b.student_id);
  const count = (st: string) => res.filter((b) => stateOf(b) === st).length;
  const marked = res.filter((b) => b.mark).length;
  const visitsDue = (d?.sick ?? []).filter((x) => x.status === 'Approved' && !x.visited_at).length;
  const staff = (d?.staff ?? []).filter((x) => inZone(x));
  const staffIn = staff.filter((x) => x.att_status === 'Present' || x.att_status === 'Half_Day').length;
  const name = p.data?.full_name ? titleCase(p.data.full_name.split(' ')[0]) : s.id;
  const hostel = d?.floors[0]?.hostel_name;
  const hour = new Date().getHours();

  const ops: Op[] = [
    { key: 'roll', title: 'Roll call', about: 'Morning, study hours and night, room by room', icon: 'check', color: 'brand', count: marked, unit: `of ${res.length} tonight`, warn: hour >= 21 && marked < res.length ? 'Night roll call is due' : undefined, go: '/roll-call' },
    { key: 'repairs', title: 'Floor round and repairs', about: 'Checklist for each room and washroom; faults become tickets', icon: 'settings', color: 'amber', count: tickets.data?.filter((t) => t.status !== 'Closed').length, unit: 'open repairs',
      warn: tickets.data?.some((t) => t.status === 'Resolved') ? `${tickets.data.filter((t) => t.status === 'Resolved').length} repair to confirm` : tickets.data?.some((t) => t.late) ? 'A repair is late' : undefined, go: '/maintenance' },
    { key: 'access', title: 'Entry approvals', about: 'Students asking to enter out of hours', icon: 'lock', color: 'indigo', count: access.data?.length, unit: 'waiting', warn: access.data?.length ? `${access.data.length} at the gate` : undefined },
    { key: 'approvals', title: 'Approvals', about: 'Outings and sick leave waiting for you', icon: 'inbox', color: 'violet', count: inbox.data?.length, unit: 'waiting', warn: inbox.data?.length ? `${inbox.data.length} waiting for you` : undefined },
    { key: 'sick', title: 'Sick students', about: 'Visit, check meals, close when well', icon: 'heart', color: 'rose', count: d?.sick.length, unit: 'on leave', warn: visitsDue ? `${visitsDue} visit${visitsDue > 1 ? 's' : ''} due` : undefined },
    { key: 'alerts', title: 'Alerts', about: 'Not seen, overdue, no pass', icon: 'alert', color: 'orange', count: d?.alerts.length, unit: 'open', warn: d?.alerts.length ? `${d.alerts.length} to act on` : undefined },
    { key: 'returns', title: 'Outings today', about: 'Leaving or due back today, and overdue', icon: 'door', color: 'sky', count: d?.returning.length, unit: 'students' },
    { key: 'checkins', title: 'New arrivals', about: 'Students moving into your rooms', icon: 'key', color: 'indigo', count: d?.checkins.length, unit: 'expected' },
    { key: 'staff', title: 'Floor staff', about: 'Sweepers and scavengers on your floors today', icon: 'users', color: 'cyan', count: staffIn, unit: `of ${staff.length} present`, warn: staff.some((x) => x.source === 'Open') ? 'A place has nobody' : undefined },
    { key: 'register', title: 'Attendance register', about: 'Each resident against each day', icon: 'calendar', color: 'brand', unit: 'two weeks', go: '/attendance' },
    { key: 'students', title: 'Student performance', about: 'Results, CRT, skills and achievements of your residents', icon: 'trend-up', color: 'violet', unit: 'open', go: '/academics' },
  ];
  const rooms = useMemo(() => {
    const m = new Map<string, FloorBed[]>();
    beds.forEach((b) => m.set(b.space_id, [...(m.get(b.space_id) ?? []), b]));
    return [...m.entries()];
  }, [beds]);

  return (
    <div className="pg">
      <div className="pg-head">
        <div>
          <p style={{ margin: 0, fontSize: 'var(--t-small)', color: 'var(--ink-muted)' }}>{today()}</p>
          <h1>{greeting()}, {name}</h1>
          <p>{hostel ? `Floor Warden, ${hostel} · ${d!.floors.map((f) => f.floor_name).join(', ')}` : 'No floor is assigned to you yet. The Chief Warden maps Floor Wardens in the Mapping centre.'}</p>
        </div>
        <div className="pg-actions"><Button variant="primary" icon="check" blockedReason={!res.length ? 'No residents on your floors.' : undefined} onClick={() => navigate('/roll-call')}>{marked && marked === res.length ? 'Roll call done' : 'Take roll call'}</Button></div>
      </div>

      {(d?.floors.length ?? 0) > 1 && (
        <div className="fl-tabs" role="tablist" aria-label="Floor" style={{ padding: 0 }}>
          <button role="tab" className="fl-tab" aria-selected={zone === 'all'} onClick={() => setZone('all')}>All my floors<small>{(d?.beds ?? []).filter((b) => b.student_id).length}</small></button>
          {d!.floors.map((f) => <button key={f.zone_id} role="tab" className="fl-tab" aria-selected={zone === f.zone_id} onClick={() => setZone(f.zone_id)}>{f.floor_name}<small>{d!.beds.filter((b) => b.zone_id === f.zone_id && b.student_id).length}</small></button>)}
        </div>)}

      <div className="stg stg-static" aria-label="Tonight">
        <div><b>{res.length}</b><span>Residents</span></div>
        <div><b>{count('in')}</b><span>In hostel</span></div>
        <div><b>{count('pass')}</b><span>On a pass</span></div>
        <div><b>{count('sick')}</b><span>Sick leave</span></div>
        <div className={count('absent') ? 'stg-warn' : undefined}><b>{count('absent')}</b><span>Not seen</span></div>
        <div><b>{beds.length - res.length}</b><span>Empty beds</span></div>
      </div>

      <div className="ob-grid">
        {ops.map((o) => (
          <button key={o.key} type="button" className={`ob-card${o.warn ? ' ob-card-warn' : ''}`} onClick={() => (o.go ? navigate(o.go) : setPanel(o.key))}>
            <span className={`ob-icon klh-tile-${o.color}`}><Icon name={o.icon} size={18} /></span>
            <span className="ob-text"><b>{o.title}</b><span>{o.warn ?? o.about}</span></span>
            <span className="ob-count">{o.count !== undefined ? o.count : ''}<small>{o.unit}</small></span>
          </button>))}
      </div>

      <section className="box" aria-label="Rooms">
        <div className="box-head"><h2>Rooms tonight</h2><span className="grow" />
          <span className="legend"><span><i className="dot dot-in" />In</span><span><i className="dot dot-pass" />Pass</span><span><i className="dot dot-sick" />Sick</span><span><i className="dot dot-absent" />Not seen</span></span>
        </div>
        {!d && <div className="q-empty">Loading…</div>}
        <div className="fr-rooms">
          {rooms.map(([space, list]) => (
            <button key={space} type="button" className="fr-room" onClick={() => setRoom(space)}>
              <span className="rm-top"><span className="rm-no">{list[0].room_code}</span><span className="rm-type">{list.filter((b) => b.student_id).length}/{list.length}</span></span>
              <span className="fr-people">
                {list.map((b) => b.student_id
                  ? <span key={b.subspace_id} className={`fr-person fr-${stateOf(b)}`} title={`${titleCase(b.full_name)}: ${STATE_LABEL[stateOf(b)]}`}>{initials(b.full_name)}</span>
                  : <span key={b.subspace_id} className="fr-person fr-empty" title="Empty bed" />)}
              </span>
            </button>))}
        </div>
      </section>

      {room && <RoomPanel beds={(d?.beds ?? []).filter((b) => b.space_id === room)} onClose={() => setRoom(null)} />}
      {panel === 'approvals' && <ApprovalsPanel inbox={inbox.data ?? []} onClose={() => setPanel(null)} onDone={() => { inbox.mutate(); day.mutate(); }} />}
      {panel === 'sick' && <SickPanel list={d?.sick ?? []} onClose={() => setPanel(null)} onDone={() => day.mutate()} />}
      {panel === 'alerts' && <AlertsPanel list={d?.alerts ?? []} onClose={() => setPanel(null)} onDone={() => day.mutate()} />}
      {panel === 'returns' && <ReturnsPanel list={d?.returning ?? []} onClose={() => setPanel(null)} />}
      {panel === 'checkins' && <CheckinsPanel list={d?.checkins ?? []} onClose={() => setPanel(null)} />}
      {panel === 'access' && <AccessPanel list={access.data ?? []} onClose={() => setPanel(null)} onDone={() => access.mutate()} />}
      {panel === 'staff' && <StaffPanel list={staff} date={d?.date ?? iso()} onClose={() => setPanel(null)} onDone={() => day.mutate()} />}
    </div>
  );
}

function RoomPanel({ beds, onClose }: { beds: FloorBed[]; onClose: () => void }) {
  return (
    <Drawer open onClose={onClose} title={`Room ${beds[0]?.room_code}`} subtitle={beds[0]?.type_name ?? undefined}>
      <div className="bedlist">
        {beds.map((b) => (
          <div key={b.subspace_id} style={{ alignItems: 'flex-start' }}>
            <span className={`fr-person fr-${stateOf(b)}`}>{b.student_id ? initials(b.full_name) : ''}</span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {b.student_id ? <><b style={{ fontWeight: 600 }}>{titleCase(b.full_name)}</b><small>{b.student_id} · {b.programme} · bed {bedLetter(b.bed_code)}</small>
                <small>{STATE_LABEL[stateOf(b)]}{b.on_pass ? ` (${b.on_pass})` : ''}{b.mark ? ' · marked tonight' : ''}{b.mark_remarks ? ` · ${b.mark_remarks}` : ''}</small></> : <small>Bed {bedLetter(b.bed_code)} is empty</small>}
            </span>
            {b.mobile && <a className="tag" href={`tel:${b.mobile}`} aria-label={`Call ${titleCase(b.full_name)}`}><Icon name="phone" size={12} />{mobile(b.mobile)}</a>}
          </div>))}
      </div>
    </Drawer>
  );
}

function ApprovalsPanel({ inbox, onClose, onDone }: { inbox: Inbox; onClose: () => void; onDone: () => void }) {
  const navigate = useNavigate();
  const { run, busy } = useAction();
  const [why, setWhy] = useState<Record<number, string>>({});
  const decide = (id: number, decision: 'Approved' | 'Rejected') => run(() => api(`/approvals/${id}/decide`, { method: 'POST', json: { decision, remarks: why[id] || undefined } }).then(onDone), decision === 'Approved' ? 'Approved; sent to the next level' : 'Rejected');
  return (
    <Drawer open onClose={onClose} title="Approvals" subtitle="Outings and sick leave of students on your floors" footer={<Button variant="ghost" onClick={() => navigate('/approvals')}>Open My approvals</Button>}>
      {!inbox.length && <p className="klh-muted">Nothing is waiting for you.</p>}
      <div className="klh-stack" style={{ gap: 10 }}>
        {inbox.map((a) => (
          <div key={a.step_id} className="box" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="klh-row" style={{ justifyContent: 'space-between' }}><b>{titleCase(a.full_name)}</b><span className="tag">{words(a.request_type)}</span></div>
            <span style={{ fontSize: 13 }}>{a.summary}</span>
            <small className="klh-muted">{a.room_code ? `Room ${a.room_code} · ` : ''}{formatDateTime(a.from_at)}{a.to_at ? ` to ${formatDateTime(a.to_at)}` : ''}</small>
            <Input placeholder="Note (needed to reject)" value={why[a.step_id] ?? ''} onChange={(e) => setWhy({ ...why, [a.step_id]: e.target.value })} />
            <div className="klh-row"><Button size="sm" variant="primary" icon="check" loading={busy} onClick={() => decide(a.step_id, 'Approved')}>Approve</Button><Button size="sm" variant="secondary" loading={busy} blockedReason={!why[a.step_id] ? 'Write why first.' : undefined} onClick={() => decide(a.step_id, 'Rejected')}>Reject</Button></div>
          </div>))}
      </div>
    </Drawer>
  );
}

function SickPanel({ list, onClose, onDone }: { list: Sick[]; onClose: () => void; onDone: () => void }) {
  const { run, busy } = useAction();
  const [note, setNote] = useState<Record<number, string>>({});
  return (
    <Drawer open onClose={onClose} title="Sick students" subtitle="Visit each student on sick leave and record what you saw">
      {!list.length && <p className="klh-muted">Nobody on your floors is on sick leave.</p>}
      <div className="klh-stack" style={{ gap: 10 }}>
        {list.map((x) => (
          <div key={x.sick_leave_id} className="box" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="klh-row" style={{ justifyContent: 'space-between' }}><b>{titleCase(x.full_name)}</b><StatusChip status={x.status} /></div>
            <span style={{ fontSize: 13 }}>{x.illness_details}</span>
            <small className="klh-muted">Room {x.room_code} · {formatDate(x.from_date)} to {formatDate(x.to_date)}{x.room_meals_required ? ' · meals to the room' : ''}</small>
            {x.visited_at ? <Notice tone="success" title={`Visited ${formatDateTime(x.visited_at)}`}>{x.visit_remarks}</Notice>
              : x.status === 'Approved' ? <>
                <Input placeholder="What you saw (at least 3 letters)" value={note[x.sick_leave_id] ?? ''} onChange={(e) => setNote({ ...note, [x.sick_leave_id]: e.target.value })} />
                <div><Button size="sm" variant="primary" icon="heart" loading={busy} blockedReason={(note[x.sick_leave_id] ?? '').length < 3 ? 'Write a short note first.' : undefined}
                  onClick={() => run(() => api(`/sick-leaves/${x.sick_leave_id}/visit`, { method: 'POST', json: { visit_remarks: note[x.sick_leave_id] } }).then(onDone), 'Visit recorded')}>Record visit</Button></div>
              </> : <small className="klh-muted">Waiting for approval.</small>}
          </div>))}
      </div>
    </Drawer>
  );
}

function AlertsPanel({ list, onClose, onDone }: { list: Alert[]; onClose: () => void; onDone: () => void }) {
  const { run, busy } = useAction();
  const [note, setNote] = useState<Record<number, string>>({});
  const act = (a: Alert, status: 'Acknowledged' | 'Closed') => run(() => api(`/alerts/${a.alert_id}`, { method: 'POST', json: { status, action_taken: note[a.alert_id] || undefined } }).then(onDone), status === 'Closed' ? 'Alert closed' : 'Alert acknowledged');
  return (
    <Drawer open onClose={onClose} title="Alerts" subtitle="Students not seen, overdue or out without a pass">
      {!list.length && <p className="klh-muted">No open alerts.</p>}
      <div className="klh-stack" style={{ gap: 10 }}>
        {list.map((a) => (
          <div key={a.alert_id} className="box" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="klh-row" style={{ justifyContent: 'space-between' }}><b>{words(a.alert_type)}</b><StatusChip status={a.status} /></div>
            <small className="klh-muted">{a.full_name ? `${titleCase(a.full_name)} · ` : ''}{formatDateTime(a.raised_at)}</small>
            {a.action_taken && <span style={{ fontSize: 13 }}>{a.action_taken}</span>}
            <Input placeholder="What you did (needed to close)" value={note[a.alert_id] ?? ''} onChange={(e) => setNote({ ...note, [a.alert_id]: e.target.value })} />
            <div className="klh-row">
              {a.status === 'Open' && <Button size="sm" variant="secondary" loading={busy} onClick={() => act(a, 'Acknowledged')}>Acknowledge</Button>}
              <Button size="sm" variant="primary" icon="check" loading={busy} blockedReason={!note[a.alert_id] ? 'Write what you did first.' : undefined} onClick={() => act(a, 'Closed')}>Close</Button>
            </div>
          </div>))}
      </div>
    </Drawer>
  );
}

function ReturnsPanel({ list, onClose }: { list: Ret[]; onClose: () => void }) {
  return (
    <Drawer open onClose={onClose} title="Outings today" subtitle="Leaving today, due back today, or overdue">
      {!list.length && <p className="klh-muted">No outings start or end today.</p>}
      <div className="bedlist">
        {list.map((o) => (
          <div key={o.outpass_id}>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><b style={{ fontWeight: 600 }}>{titleCase(o.full_name)}</b><small>{o.destination} · back by {formatDateTime(o.return_by)}</small></span>
            <StatusChip status={o.status} />
          </div>))}
      </div>
    </Drawer>
  );
}

function CheckinsPanel({ list, onClose }: { list: CheckIn[]; onClose: () => void }) {
  return (
    <Drawer open onClose={onClose} title="New arrivals" subtitle="Students with fees paid, moving into your rooms. The office issues the key; you do the room handover with them.">
      {!list.length && <p className="klh-muted">Nobody is moving in.</p>}
      <div className="bedlist">
        {list.map((c) => (
          <div key={c.registration_id}>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><b style={{ fontWeight: 600 }}>{titleCase(c.full_name)}</b><small>{c.student_id} · {c.programme} · room {c.room_code}, bed {c.subspace_id.replace(/^.*-B/, '')}</small></span>
            <span className={c.fee_check_status === 'Verified' ? 'tag tag-ok' : 'tag tag-warn'}>{c.fee_check_status === 'Verified' ? 'Ready' : 'Fee check'}</span>
          </div>))}
      </div>
    </Drawer>
  );
}

function StaffPanel({ list, date, onClose, onDone }: { list: Duty[]; date: string; onClose: () => void; onDone: () => void }) {
  const navigate = useNavigate();
  const { run, busy } = useAction();
  const mark = (x: Duty, status: string) => run(() => api('/roster/attendance', { method: 'POST', json: { facility_id: x.facility_id, date, marks: [{ staff_id: x.staff_id, status }] } }).then(onDone));
  return (
    <Drawer open onClose={onClose} title="Floor staff today" subtitle="Who cleans your floors and washrooms today; mark them as they report" footer={<Button variant="ghost" onClick={() => navigate('/duty-roster')}>Open the duty roster</Button>}>
      {!list.length && <p className="klh-muted">The Warden has not built today's roster yet.</p>}
      <div className="bedlist">
        {list.map((x) => (
          <div key={x.duty_id}>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <b style={{ fontWeight: 600 }}>{x.full_name ? titleCase(x.full_name) : 'Nobody available'}</b>
              <small>{words(x.hostel_role)}{x.space_code ? `, washroom ${x.space_code}` : ''} · {x.shift}{x.source === 'Cover' ? ' · covering' : ''}{x.mobile_no ? ` · ${mobile(x.mobile_no)}` : ''}</small>
            </span>
            {x.staff_id && <span className="seg" role="group" aria-label="Attendance" aria-disabled={busy}>
              {[{ v: 'Present', k: 'P', c: 's-p' }, { v: 'Absent', k: 'A', c: 's-a' }].map((m) => <button key={m.v} type="button" className={m.c} aria-pressed={x.att_status === m.v} aria-label={m.v} onClick={() => mark(x, m.v)}>{m.k}</button>)}
            </span>}
          </div>))}
      </div>
    </Drawer>
  );
}

function AccessPanel({ list, onClose, onDone }: { list: AccessReq[]; onClose: () => void; onDone: () => void }) {
  const { run, busy } = useAction();
  const [why, setWhy] = useState<Record<number, string>>({});
  const decide = (id: number, approve: boolean) => run(() => api(`/access/requests/${id}/decide`, { method: 'POST', json: { approve, remarks: why[id] || undefined } }).then(onDone), approve ? 'Let in for the next hour' : 'Refused');
  return (
    <Drawer open onClose={onClose} title="Entry approvals" subtitle="Your residents at a gate or the gym out of hours">
      {!list.length && <p className="klh-muted">Nobody is waiting.</p>}
      <div className="klh-stack" style={{ gap: 10 }}>
        {list.map((r) => (
          <div key={r.request_id} className="box" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="klh-row" style={{ justifyContent: 'space-between' }}><b>{titleCase(r.full_name)}</b><span className="tag">{r.point_name}</span></div>
            <small className="klh-muted">{r.room_code ? `Room ${r.room_code} · ` : ''}{formatDateTime(r.requested_at)} · {r.reason}</small>
            <Input placeholder="Note (needed to refuse)" value={why[r.request_id] ?? ''} onChange={(e) => setWhy({ ...why, [r.request_id]: e.target.value })} />
            <div className="klh-row"><Button size="sm" variant="primary" icon="check" loading={busy} onClick={() => decide(r.request_id, true)}>Let in</Button><Button size="sm" variant="secondary" loading={busy} blockedReason={!why[r.request_id] ? 'Write why first.' : undefined} onClick={() => decide(r.request_id, false)}>Refuse</Button></div>
          </div>))}
      </div>
    </Drawer>
  );
}
