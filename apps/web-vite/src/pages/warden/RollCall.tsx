import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ConfirmDialog, Notice } from '@/lib/klh';
import { api } from '@/lib/api';
import { titleCase, toast, useAction, useApi } from '@/lib/ui';
import { initials } from '@/ui/kit';
import type { FloorBed, FloorDay } from './FloorHome';
import { bedLetter } from '@/lib/beds';

const MARKS = [{ v: 'Present', k: 'In', c: 's-p' }, { v: 'Absent', k: 'Not seen', c: 's-a' }, { v: 'On_Pass', k: 'Pass', c: 's-l' }, { v: 'Sick_Leave', k: 'Sick', c: 's-l' }];
/** What the roll call suggests before anyone taps: the approved pass or sick leave. Everyone else waits to be seen. */
const suggest = (b: FloorBed) => (b.on_pass ? 'On_Pass' : b.on_sick ? 'Sick_Leave' : '');
type Session = { session_id: number; session_name: string; starts_at: string; ends_at: string; method: string; is_night: boolean; raises_alert: boolean; today: boolean; marked: number };
const nowHm = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
/** The session running now, else the next one today, else the last one. */
const pick = (list: Session[]) => { const t = nowHm(); const today = list.filter((x) => x.today);
  return today.find((x) => x.starts_at <= t && t <= x.ends_at) ?? today.find((x) => x.starts_at > t) ?? today[today.length - 1]; };

/**
 * TRK-08 Night roll call (addition). Room by room on the phone: tap In, Not seen, Pass or Sick for each resident.
 * Passes and sick leave are filled in from the approved requests. Saving marks the night; a resident not seen
 * without a pass raises a Not Seen alert to the Floor Warden.
 */
export default function RollCall() {
  const navigate = useNavigate();
  const day = useApi<FloorDay>('/floor/today');
  const sessions = useApi<Session[]>('/attendance/sessions');
  const [sid, setSid] = useState<number | null>(null);
  const session = sessions.data?.find((x) => x.session_id === sid) ?? (sessions.data ? pick(sessions.data) : undefined);
  const saved = useApi<{ student_id: string; status: string }[]>(session ? `/attendance/sessions/${session.session_id}/marks` : null);
  const [zone, setZone] = useState('');
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [loadedFor, setLoadedFor] = useState<number | null>(null);
  const [ask, setAsk] = useState(false);
  const { run, busy } = useAction();
  const d = day.data;
  useEffect(() => {
    if (!d || !session || !saved.data || loadedFor === session.session_id) return;
    const got = new Map(saved.data.map((m) => [m.student_id, m.status]));
    setMarks(Object.fromEntries(d.beds.filter((b) => b.student_id).map((b) => [b.student_id!, got.get(b.student_id!) ?? suggest(b)])));
    setLoadedFor(session.session_id);
  }, [d, session, saved.data, loadedFor]);
  const floor = zone || d?.floors[0]?.zone_id || '';
  const residents = (d?.beds ?? []).filter((b) => b.student_id);
  const here = residents.filter((b) => b.zone_id === floor);
  const rooms = useMemo(() => { const m = new Map<string, FloorBed[]>(); here.forEach((b) => m.set(b.room_code, [...(m.get(b.room_code) ?? []), b])); return [...m.entries()]; }, [here]);
  const done = residents.filter((b) => marks[b.student_id!]).length;
  const absent = residents.filter((b) => marks[b.student_id!] === 'Absent');
  const set = (id: string, v: string) => setMarks({ ...marks, [id]: marks[id] === v ? '' : v });
  const restPresent = (list: FloorBed[]) => setMarks({ ...marks, ...Object.fromEntries(list.filter((b) => !marks[b.student_id!]).map((b) => [b.student_id!, 'Present'])) });
  const save = () => run(async () => {
    const byHostel = new Map<string, { student_id: string; status: string }[]>();
    residents.filter((b) => marks[b.student_id!]).forEach((b) => byHostel.set(b.facility_id, [...(byHostel.get(b.facility_id) ?? []), { student_id: b.student_id!, status: marks[b.student_id!] }]));
    for (const [facility_id, list] of byHostel) await api('/attendance/session-mark', { method: 'POST', json: { session_id: session!.session_id, att_date: d!.date, facility_id, marks: list } });
    await Promise.all([day.mutate(), sessions.mutate(), saved.mutate()]);
    toast(`${session!.session_name} saved: ${done} of ${residents.length} marked${absent.length ? `, ${absent.length} not seen` : ''}`);
    if (done === residents.length && session!.is_night) navigate('/home');
  });

  return (
    <div className="pg rc">
      <div className="rc-sessions" role="tablist" aria-label="Session">
        {(sessions.data ?? []).filter((x) => x.today).map((x) => (
          <button key={x.session_id} role="tab" type="button" aria-selected={session?.session_id === x.session_id} onClick={() => { setSid(x.session_id); setLoadedFor(null); }}>
            <b>{x.session_name}</b><span>{x.starts_at} to {x.ends_at} · {x.method === 'Manual' ? 'by hand' : x.method}</span><small>{x.marked} marked</small>
          </button>))}
      </div>
      <div className="pg-head">
        <p>{d ? `${new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} · ${d.floors[0]?.hostel_name ?? ''}` : ''}. {session && session.method !== 'Manual' ? `Students check in by ${session.method} at the point; mark here anyone who could not.` : 'Passes and sick leave are filled in for you.'}{session?.raises_alert ? ' Not seen raises an alert.' : ''}</p>
        <div className="pg-actions"><button type="button" className="dm-clear" onClick={() => restPresent(here)}>Mark the rest of this floor in</button></div>
      </div>
      <div className="hbar rc-progress" aria-label={`${done} of ${residents.length} marked`}><i className="b-occ" style={{ width: `${(100 * done) / Math.max(1, residents.length)}%` }} /></div>
      {d && d.floors.length > 1 && (
        <div className="fl-tabs" role="tablist" aria-label="Floor" style={{ padding: 0 }}>
          {d.floors.map((f) => { const list = residents.filter((b) => b.zone_id === f.zone_id); const n = list.filter((b) => marks[b.student_id!]).length;
            return <button key={f.zone_id} role="tab" className="fl-tab" aria-selected={floor === f.zone_id} onClick={() => setZone(f.zone_id)}>{f.floor_name}<small>{n}/{list.length}</small></button>; })}
        </div>)}
      {d && !residents.length && <Notice tone="info" title="Nobody to call">No resident lives on your floors yet.</Notice>}
      {d && residents.length > 0 && !here.length && <p className="klh-muted">Nobody lives on this floor yet.</p>}
      <div className="rc-rooms">
        {rooms.map(([no, list]) => (
          <section key={no} className="box rc-room" aria-label={`Room ${no}`}>
            <div className="box-head"><h2>Room {no}</h2><span className="grow" /><span className="tag">{list.filter((b) => marks[b.student_id!]).length}/{list.length}</span></div>
            {list.map((b) => (
              <div key={b.student_id} className="rc-row">
                <span className="pr-av">{initials(b.full_name)}</span>
                <span className="pr-text"><b>{titleCase(b.full_name)}</b><span>Bed {bedLetter(b.bed_code)}{b.on_pass ? ` · pass ${b.on_pass}` : ''}{b.on_sick ? ' · on sick leave' : ''}</span></span>
                <span className="seg rc-seg" role="group" aria-label={`Tonight for ${titleCase(b.full_name)}`}>
                  {MARKS.map((m) => <button key={m.v} type="button" className={m.c} aria-pressed={marks[b.student_id!] === m.v} onClick={() => set(b.student_id!, m.v)}>{m.k}</button>)}
                </span>
              </div>))}
          </section>))}
      </div>
      <div className="rc-bar">
        <span><b>{done}</b> of {residents.length} marked{absent.length ? ` · ${absent.length} not seen` : ''}</span>
        <button type="button" className="selbar-btn selbar-go" disabled={busy || !done || !session} onClick={() => (absent.length && session?.raises_alert ? setAsk(true) : save())}>Save {session?.session_name.toLowerCase() ?? 'roll call'}</button>
      </div>
      <ConfirmDialog open={ask} title={`${absent.length} not seen tonight`} body={`${absent.map((b) => titleCase(b.full_name)).join(', ')}. Each gets a Not Seen alert assigned to you, and the Warden sees it on the alert board.`} confirmLabel="Save and raise alerts"
        onCancel={() => setAsk(false)} onConfirm={() => { setAsk(false); save(); }} />
    </div>
  );
}
