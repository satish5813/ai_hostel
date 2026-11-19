import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BedDouble, BookOpen, CalendarDays, Clock, FlaskConical, MapPin, Search, Users, Wrench } from 'lucide-react';
import { titleCase, useApi, useSession } from '@/lib/ui';
import '@/styles/timetable.css';

export type ClassBlock = { from_hour: number; to_hour: number; start_time: string | null; end_time: string | null; course_code: string; course_name: string | null; ltps: 'L' | 'T' | 'P' | 'S'; section: string | null; class_room: string | null };
type Day = { day_no: number; day_name: string; classes: ClassBlock[] };
type Week = {
  student: { student_id: string; full_name: string; programme: string | null; year_semester: string | null; hostel_name: string | null; floor_name: string | null; room_code: string | null; bed_code: string | null };
  academic_year: string | null; term: string | null; today_no: number; times_known: boolean; hours_a_week: number; days: Day[];
};

export const KIND: Record<string, { label: string; icon: typeof BookOpen }> = {
  L: { label: 'Lecture', icon: BookOpen }, T: { label: 'Tutorial', icon: Users }, P: { label: 'Practical', icon: FlaskConical }, S: { label: 'Skill', icon: Wrench },
};
/** Course title without the ERP's bracketed stream and "-L1" suffixes. */
export const courseName = (c: ClassBlock) => (c.course_name ? titleCase(c.course_name.replace(/\s*\[.*?\]\s*/g, ' ').replace(/-L\d+$/, '').trim()) : c.course_code);
/** "Hour 3–4" or, once the bell timings are entered, "09:20 – 11:00". */
export const when = (c: ClassBlock) => (c.start_time && c.end_time ? `${c.start_time} – ${c.end_time}` : c.from_hour === c.to_hour ? `Hour ${c.from_hour}` : `Hours ${c.from_hour}–${c.to_hour}`);

/** One class in a day's list: time, course, kind and classroom. */
export function ClassRow({ c }: { c: ClassBlock }) {
  const K = KIND[c.ltps] ?? KIND.L;
  return (
    <li className={`tt-row tt-${c.ltps}`}>
      <span className="tt-when"><Clock size={13} aria-hidden="true" />{when(c)}</span>
      <span className="tt-what"><b>{courseName(c)}</b><small>{c.course_code}{c.section ? ` · ${c.section}` : ''}</small></span>
      <span className="tt-kind"><K.icon size={13} aria-hidden="true" />{K.label}</span>
      <span className="tt-room"><MapPin size={13} aria-hidden="true" />{c.class_room ?? '—'}</span>
    </li>
  );
}

/**
 * ACA-04 Class timetable. Floor managers, wardens and the chief manager type a university ID and see where the student
 * should be today and through the week; a student sees their own.
 */
export default function Timetable() {
  const s = useSession()!;
  const [params, setParams] = useSearchParams();
  const own = s.kind === 'student';
  const id = own ? s.id : params.get('id') ?? '';
  const [q, setQ] = useState(id);
  useEffect(() => setQ(id), [id]);
  const r = useApi<Week>(id ? `/timetable/students/${encodeURIComponent(id)}` : null);
  return (
    <div className="tt">
      {!own && (
        <form className="tt-find" role="search" onSubmit={(e) => { e.preventDefault(); const v = q.trim(); if (v) setParams({ id: v }); }}>
          <label><Search size={17} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value.replace(/\s/g, ''))} placeholder="Student university ID" aria-label="Student university ID" inputMode="numeric" autoFocus={!id} /></label>
          <button type="submit" disabled={!q.trim()}>Show timetable</button>
        </form>)}
      {!own && !id && <p className="tt-hint"><CalendarDays size={18} />Type a student's university ID to see today's classes, the classroom of each and the whole week.</p>}
      {id && r.error && <p className="tt-hint tt-err">{String((r.error as { message?: string }).message ?? 'Not available')}</p>}
      {id && !r.data && !r.error && <p className="tt-hint">Loading…</p>}
      {r.data && <WeekView key={r.data.student.student_id} w={r.data} own={own} />}
    </div>
  );
}

function WeekView({ w, own }: { w: Week; own: boolean }) {
  const st = w.student;
  const days = w.days.filter((d) => d.day_no <= 6 || d.classes.length);
  const [pick, setPick] = useState(() => (days.some((d) => d.day_no === w.today_no) ? w.today_no : days[0]?.day_no ?? 1));
  const day = days.find((d) => d.day_no === pick);
  const hours = (d: Day) => d.classes.reduce((a, c) => a + c.to_hour - c.from_hour + 1, 0);
  return (
    <>
      <section className="tt-who">
        <span className="tt-av" aria-hidden="true">{st.full_name.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('')}</span>
        <div className="tt-who-tx">
          <h2>{own ? 'My classes' : titleCase(st.full_name)}</h2>
          <p>{st.student_id}{st.programme ? ` · ${st.programme}` : ''}{st.year_semester ? ` · ${st.year_semester}` : ''}</p>
          {st.room_code && <p className="tt-bed"><BedDouble size={13} aria-hidden="true" />{st.hostel_name} · {st.floor_name} · room {st.room_code}{st.bed_code ? `, bed ${st.bed_code}` : ''}</p>}
        </div>
        <span className="tt-term">{w.academic_year ? <><b>{w.academic_year} {w.term}</b><small>{w.hours_a_week} class hours a week</small></> : <b>No timetable</b>}</span>
      </section>

      {!w.academic_year ? <p className="tt-hint">No class timetable is loaded for this student yet.</p> : <WeekGrid w={w} days={days} />}

      {w.academic_year && (
        <section className="tt-card">
          <div className="tt-days" role="tablist" aria-label="Day">
            {days.map((d) => (
              <button key={d.day_no} type="button" role="tab" aria-selected={d.day_no === pick} className={`${d.day_no === pick ? 'on' : ''}${d.day_no === w.today_no ? ' today' : ''}`} onClick={() => setPick(d.day_no)}>
                <b>{d.day_name.slice(0, 3)}</b><small>{d.day_no === w.today_no ? 'Today' : d.classes.length ? `${hours(d)} h` : 'Free'}</small>
              </button>))}
          </div>
          <h3>{day?.day_no === w.today_no ? `Today, ${day.day_name}` : day?.day_name}<span>{day?.classes.length ? `${day.classes.length} class${day.classes.length > 1 ? 'es' : ''} · ${hours(day)} hours` : 'No classes'}</span></h3>
          {day?.classes.length ? <ul className="tt-list">{day.classes.map((c) => <ClassRow key={`${c.from_hour}-${c.course_code}`} c={c} />)}</ul> : <p className="tt-free">No classes on this day.</p>}
          {!w.times_known && <p className="tt-note">Times are the university's teaching hours (Hour 1, Hour 2 …) until the bell timings are entered.</p>}
        </section>)}

    </>
  );
}

/**
 * A student's classes for the leadership's student card (pages/exec/StudentCard.tsx): today's classes with
 * their rooms, then the weekly table. Same data and access rules as ACA-04.
 */
export function StudentWeek({ id }: { id: string }) {
  const r = useApi<Week>(`/timetable/students/${encodeURIComponent(id)}`);
  if (r.error) return <p className="tt-free">{String((r.error as { message?: string }).message ?? 'The timetable is not available.')}</p>;
  if (!r.data) return <p className="tt-free">Loading the timetable…</p>;
  const w = r.data;
  if (!w.academic_year) return <p className="tt-free">No class timetable is loaded for this student yet.</p>;
  const days = w.days.filter((d) => d.day_no <= 6 || d.classes.length);
  const today = days.find((d) => d.day_no === w.today_no);
  const next = today?.classes.length ? null : days.find((d) => d.day_no > w.today_no && d.classes.length) ?? days.find((d) => d.classes.length);
  return (
    <div className="tt tt-in-card">
      <section className="tt-card">
        <h3>{today?.classes.length ? `Today, ${today.day_name}` : `No classes today${next ? ` · next on ${next.day_name}` : ''}`}<span>{today?.classes.length ? `${today.classes.length} class${today.classes.length > 1 ? 'es' : ''}` : ''}</span></h3>
        {(today?.classes.length ? today.classes : next?.classes ?? []).length
          ? <ul className="tt-list">{(today?.classes.length ? today.classes : next!.classes).map((c) => <ClassRow key={`${c.from_hour}-${c.course_code}`} c={c} />)}</ul>
          : <p className="tt-free">No classes this week.</p>}
        {!w.times_known && <p className="tt-note">Times show as the university's teaching hours (Hour 1, Hour 2 …) until the bell timings are entered.</p>}
      </section>
      <WeekGrid w={w} days={days} />
    </div>
  );
}

/** The timetable as the university prints it: days down, Hour 1 to Hour 11 (or later) across, one cell per hour. */
function WeekGrid({ w, days }: { w: Week; days: Day[] }) {
  const at = (d: Day, h: number) => d.classes.find((c) => c.from_hour <= h && c.to_hour >= h);
  const last = Math.max(11, ...days.flatMap((d) => d.classes.map((c) => c.to_hour)));
  const cols = Array.from({ length: last }, (_, i) => i + 1);
  const time = (h: number) => days.flatMap((d) => d.classes).find((c) => c.from_hour === h && c.start_time)?.start_time;
  return (
    <section className="tt-card">
      <h3>Weekly timetable<span>{w.academic_year} {w.term} semester · {w.hours_a_week} hours a week</span></h3>
      <div className="tt-scroll">
        <table className="tt-grid">
          <thead><tr><th className="tt-dayh">Day / Hour</th>{cols.map((h) => <th key={h}><b>{h}</b>{time(h) && <small>{time(h)}</small>}</th>)}</tr></thead>
          <tbody>{days.map((d) => (
            <tr key={d.day_no} className={d.day_no === w.today_no ? 'today' : undefined}>
              <th className="tt-dayh">{d.day_name.slice(0, 3)}{d.day_no === w.today_no && <small>Today</small>}</th>
              {cols.map((h) => {
                const c = at(d, h);
                return c
                  ? <td key={h} className={`tt-${c.ltps}`} title={`${courseName(c)} · ${KIND[c.ltps]?.label} · room ${c.class_room ?? ''}`}><b>{c.course_code}</b><span>{c.ltps}{c.section ? ` · ${c.section}` : ''}</span><small>{c.class_room}</small></td>
                  : <td key={h} className="tt-empty">–</td>;
              })}
            </tr>))}
          </tbody>
        </table>
      </div>
      <p className="tt-legend">{Object.entries(KIND).map(([k, v]) => <span key={k} className={`tt-${k}`}><i />{k} {v.label}</span>)}</p>
      <Courses days={days} />
    </section>
  );
}

/** Course code to course name, so the codes in the table can be read. */
function Courses({ days }: { days: Day[] }) {
  const m = new Map<string, ClassBlock>();
  for (const d of days) for (const c of d.classes) if (!m.has(c.course_code)) m.set(c.course_code, c);
  return <dl className="tt-courses">{[...m.values()].sort((a, b) => a.course_code.localeCompare(b.course_code)).map((c) => <div key={c.course_code}><dt>{c.course_code}</dt><dd>{courseName(c)}</dd></div>)}</dl>;
}
