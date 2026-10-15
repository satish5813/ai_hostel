import { useMemo, useState } from 'react';
import { Input, SegmentedControl, StatusChip } from '@/lib/klh';
import { ScreenHeader, useApi } from '@/lib/ui';
import { WeekChoices, type StudentWeek } from '@/pages/student/MealChoice';
import { STYLE, dietLabel, dueLabel, weekLabel, type Course, type Week } from './weekly';

type ListWeek = Week & { residents: number };
type Resident = { student_id: string; name: string; hostel_code: string; cuisine: string; diet: string; grp: string; by_student: number; by_staff: number; by_default: number };
type Residents = Week & { slots: number; can_enter: boolean; students: Resident[] };
type One = { student: { student_id: string; name: string; hostel_code: string; cuisine: string; diet: string }; week: StudentWeek; courses: Course[] };

/**
 * MES-10 Enter choices for students. The Chief Chef (or the Mess In-charge) enters a student's dishes for a week from
 * a paper slip, or for a student without a phone, until the week begins; each is recorded as entered by them. After
 * students' choices close, this replaces a dish the student was given by default.
 */
export default function EnterChoices() {
  const list = useApi<{ weeks: ListWeek[]; messes: { mess_id: number; mess_name: string }[] }>('/weekly-menus');
  const [messId, setMessId] = useState<number | null>(null);
  const [weekId, setWeekId] = useState<number | null>(null);
  const [sid, setSid] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [show, setShow] = useState<'todo' | 'all'>('todo');
  const [day, setDay] = useState<number | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const mess = messId ?? list.data?.messes[0]?.mess_id ?? null;
  const weeks = (list.data?.weeks ?? []).filter((w) => w.mess_id === mess && w.status !== 'Draft' && w.week_start > today).sort((a, b) => a.week_start.localeCompare(b.week_start));
  const week = weeks.find((w) => w.week_id === weekId) ?? weeks[0];
  const res = useApi<Residents>(week ? `/weekly-menus/${week.week_id}/residents` : null);
  const one = useApi<One>(week && sid ? `/weekly-menus/${week.week_id}/students/${sid}` : null);
  const r = res.data && res.data.week_id === week?.week_id ? res.data : undefined;
  const students = useMemo(() => (r?.students ?? [])
    .filter((s) => !q || `${s.name} ${s.student_id} ${s.hostel_code}`.toLowerCase().includes(q.toLowerCase()))
    .filter((s) => show === 'all' || s.by_student + s.by_staff < r!.slots), [r, q, show]);

  return (
    <div className="klh-stack ec" style={{ gap: 16 }}>
      <ScreenHeader code="MES-10" subtitle="Enter a student's dishes from a paper slip, or for a student without a phone, until the week begins. Each entry is recorded under your name." />
      <section className="box wm-pick" aria-label="Which week">
        {list.data && list.data.messes.length > 1 && <SegmentedControl label="Mess" value={String(mess)} onChange={(v) => { setMessId(Number(v)); setWeekId(null); setSid(null); }} options={list.data.messes.map((m) => ({ value: String(m.mess_id), label: m.mess_name }))} />}
        <div className="wm-weeks" role="tablist" aria-label="Week">{weeks.map((w) => (
          <button key={w.week_id} type="button" role="tab" aria-selected={w.week_id === week?.week_id} onClick={() => { setWeekId(w.week_id); setSid(null); }}>
            <b>{weekLabel(w.week_start)}</b><small><StatusChip status={w.is_open ? 'Active' : 'Inactive'} label={w.is_open ? `Students choose until ${dueLabel(w.choices_close_at)}` : 'Students\' choices closed'} /></small></button>))}
          {list.data && !weeks.length && <p className="klh-muted">No published week is still to come. Publish next week's menu first.</p>}
        </div>
      </section>

      {r && (
        <div className="ec-cols">
          <section className="box ec-list" aria-label="Students">
            <div className="ec-tools">
              <Input aria-label="Find a student" placeholder="Name, ID or residency" value={q} onChange={(e) => setQ(e.target.value)} />
              <SegmentedControl label="Show" value={show} onChange={(v) => setShow(v as 'todo' | 'all')} options={[{ value: 'todo', label: 'Not finished' }, { value: 'all', label: 'Everyone' }]} />
            </div>
            <ul>{students.map((s) => {
              const own = s.by_student + s.by_staff;
              return (
                <li key={s.student_id}><button type="button" aria-pressed={sid === s.student_id} onClick={() => { setSid(s.student_id); setDay(null); res.mutate(); }}>
                  <span><b>{s.name}</b><small>{s.student_id} · {s.hostel_code} · {s.grp} · {STYLE[s.cuisine]} {dietLabel(s.diet).toLowerCase()}</small></span>
                  <span className={`ec-n${own >= r.slots ? ' ec-done' : ''}`}>{own}/{r.slots}{s.by_staff > 0 && <small>{s.by_staff} by chef</small>}{s.by_default > 0 && <small>{s.by_default} given</small>}</span>
                </button></li>);
            })}
              {!students.length && <li className="q-empty">{show === 'todo' ? 'Everyone has chosen the whole week.' : 'No student matches.'}</li>}</ul>
          </section>
          <section className="ec-edit" aria-label="Choices">
            {!sid && <div className="box mm-empty"><b>Choose a student</b><p>Their week opens here; tap a dish to record it.</p></div>}
            {sid && !one.data && <div className="box q-empty">Loading…</div>}
            {one.data && one.data.student.student_id === sid && (
              <div className="st ec-st">
                <WeekChoices key={`${sid}-${week!.week_id}`} week={one.data.week} courses={one.data.courses} me={one.data.student} day={day} setDay={setDay}
                  staff={{ saveUrl: `/weekly-menus/${week!.week_id}/students/${sid}`, canEnter: r.can_enter, name: `${one.data.student.name} (${one.data.student.student_id})` }} />
              </div>)}
          </section>
        </div>)}
    </div>
  );
}
