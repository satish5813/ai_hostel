import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { BedDouble, BookOpen, GraduationCap, IndianRupee, Search, X } from 'lucide-react';
import { useApi, useScrollLock } from '@/lib/ui';
import { OutcomeList, bestOffer, type Outcome } from '@/pages/general/Outcomes';

type Term = { semester_no: number; term_label: string; sgpa: number | null; cgpa: number | null; attendance_pct: number | null; backlogs: number };
type Course = { course_code: string; course_name: string | null; pct: number | null; as_of: string; academic_year: string; term: string; held: number; attended: number };
type Fee = { head: string; due: number; paid: number; outstanding: number | null; next_due: string | null; overdue: boolean };
type Card = {
  student: { student_id: string; name: string; programme: string | null; year_semester: string | null; dept_name: string | null; gender: string | null;
    hostel_code: string | null; hostel_name: string | null; floor_name: string | null; room_code: string | null; bed_code: string | null; allocation_date: string | null };
  terms: Term[]; courses: Course[]; fees: Fee[]; receipts: { receipts: number; last_paid_on: string | null }; outcomes?: Outcome[];
};

const MIN = 75;
const pct = (n: number | null | undefined) => (n == null ? '—' : `${Math.round(n)}%`);
const tone = (n: number | null | undefined) => (n == null ? 'none' : n < 65 ? 'bad' : n < MIN ? 'warn' : 'good');
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const day = (s: string | null) => (s ? new Date(`${s.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const title = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Ai|Ml|Iot|Ds|Ii|Iii|Iv)\b/g, (m) => m.toUpperCase());
const HEAD: Record<string, string> = { Hostel: 'Hostel fee', Electricity: 'Electricity', Mess: 'Mess fee', Registration: 'Registration', Caution_Deposit: 'Caution deposit', Electricity_Deposit: 'Electricity deposit', Meter_Charge: 'Meter charge' };

/* ---------------------------------------------------------------- opening a card from any list on the dashboard */

const Ctx = createContext<(id: string) => void>(() => {});
/** Wraps the dashboard: any student name inside can open the student's card. */
export function StudentCardHost({ children }: { children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  return <Ctx.Provider value={setId}>{children}{id && <StudentCard id={id} onClose={() => setId(null)} />}</Ctx.Provider>;
}
/** A student's name in a dashboard table: a button that opens their card. */
export function StudentName({ id, name }: { id: string; name: string }) {
  const open = useContext(Ctx);
  return <button type="button" className="xs-name" onClick={() => open(id)} title="Open the student's card"><b>{name}</b><small>{id}</small></button>;
}

/** The top bar's search: a university ID opens that student's card. */
export function FindStudent() {
  const open = useContext(Ctx);
  const [q, setQ] = useState('');
  return (
    <form className="xs-find" role="search" onSubmit={(e) => { e.preventDefault(); const id = q.trim(); if (id) open(id); }}>
      <Search size={15} aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value.replace(/\s/g, ''))} placeholder="Student ID" aria-label="Find a student by university ID" inputMode="numeric" />
      <button type="submit" disabled={!q.trim()}>Open</button>
    </form>
  );
}

/* ---------------------------------------------------------------- the card */

function Bar({ v }: { v: number | null }) {
  return <span className="xs-track" aria-hidden="true"><i className={`xs-${tone(v)}`} style={{ width: `${Math.max(0, Math.min(100, v ?? 0))}%` }} /><em style={{ left: `${MIN}%` }} /></span>;
}

/**
 * EXE-01 student card: for the President, Vice Presidents, Pro-VCs and the other dashboard users. Who and where the
 * student is, this semester's class attendance course by course, every semester's attendance and result, and fees by kind.
 */
export function StudentCard({ id, onClose }: { id: string; onClose: () => void }) {
  const r = useApi<Card>(`/exec/students/${id}`);
  useScrollLock();
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  const d = r.data;
  const now = d?.terms[d.terms.length - 1];
  const graded = d ? [...d.terms].reverse().find((t) => t.cgpa != null || t.sgpa != null) : undefined;
  const backlogs = d?.terms.reduce((a, t) => a + (t.backlogs || 0), 0) ?? 0;
  const short = d?.courses.filter((c) => (c.pct ?? 100) < MIN).length ?? 0;
  const owed = d?.fees.reduce((a, f) => a + (f.outstanding ?? 0), 0) ?? 0;
  const asked = d?.fees.reduce((a, f) => a + f.due, 0) ?? 0, paid = d?.fees.reduce((a, f) => a + f.paid, 0) ?? 0;
  const st = d?.student;
  const best = bestOffer(d?.outcomes ?? []);

  return (
    <div className="xs-wrap" role="dialog" aria-modal="true" aria-label={st ? `${st.name}, student card` : 'Student card'} onClick={onClose}>
      <div className="xs-card" onClick={(e) => e.stopPropagation()}>
        <header className="xs-head">
          <span className="xs-av" aria-hidden="true">{st ? st.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('') : '·'}</span>
          <div className="xs-who">
            <h3>{st?.name ?? (r.error ? 'Not available' : 'Loading…')}</h3>
            {st && <p>{st.student_id} · {st.programme ?? st.dept_name ?? ''}{st.year_semester ? ` · ${st.year_semester}` : ''}</p>}
            {st?.room_code && <p className="xs-room"><BedDouble size={13} />{st.hostel_name ?? st.hostel_code} · {st.floor_name} · room {st.room_code}{st.bed_code ? `, bed ${st.bed_code}` : ''}</p>}
          </div>
          <button type="button" className="xs-x" onClick={onClose} aria-label="Close" autoFocus><X size={18} /></button>
        </header>

        {r.error && <p className="xs-empty">{String((r.error as { message?: string }).message ?? 'This student is not open to you.')}</p>}
        {d && (
          <div className="xs-body">
            <div className="xs-tiles">
              <div className={`xs-tile xs-${tone(now?.attendance_pct)}`}>
                <span className="xs-ring" style={{ ['--v' as string]: `${Math.max(0, Math.min(100, now?.attendance_pct ?? 0))}` }}><b>{pct(now?.attendance_pct)}</b></span>
                <span><small>Class attendance</small><b>{now ? `${now.term_label}` : 'No record'}</b>
                  <small>{d.courses.length ? (short ? `${short} of ${d.courses.length} courses below ${MIN}%` : `All ${d.courses.length} courses at ${MIN}%+`) : now ? `Semester ${now.semester_no}` : ''}</small></span>
              </div>
              <div className={`xs-tile ${backlogs ? 'xs-bad' : 'xs-good'}`}>
                <span className="xs-ico"><GraduationCap size={20} /></span>
                <span><small>Result</small><b>{graded?.cgpa != null ? `CGPA ${graded.cgpa.toFixed(2)}` : 'No result yet'}</b>
                  <small>{graded?.sgpa != null ? `SGPA ${graded.sgpa.toFixed(2)} · ` : ''}{backlogs ? `${backlogs} backlog${backlogs === 1 ? '' : 's'}` : 'no backlogs'}</small>
                  {best && <small className="xs-placed">Placed: {best.organisation}{best.ctc_lpa != null ? ` · ${best.ctc_lpa} LPA` : ''}</small>}</span>
              </div>
              <div className={`xs-tile ${d.fees.some((f) => f.overdue) ? 'xs-bad' : owed ? 'xs-warn' : 'xs-good'}`}>
                <span className="xs-ico"><IndianRupee size={20} /></span>
                <span><small>Fees</small><b>{owed ? `${inr(owed)} due` : asked ? 'All paid' : 'No fee raised'}</b>
                  <small>{inr(paid)} paid of {inr(asked)}{d.receipts.last_paid_on ? ` · last ${day(d.receipts.last_paid_on)}` : ''}</small></span>
              </div>
            </div>

            <div className="xs-cols">
              <section className="xs-sec">
                <h4><BookOpen size={15} />{d.courses.length ? `${d.courses[0].academic_year} ${d.courses[0].term} semester · course by course` : 'This semester'}
                  {d.courses.length > 0 && <span className="xs-asof">as on {day(d.courses[0].as_of)}</span>}</h4>
                {d.courses.length ? (
                  <ul className="xs-bars">{d.courses.map((c) => (
                    <li key={c.course_code}><span className="xs-bar-tx"><b>{c.course_name ? title(c.course_name) : c.course_code}</b><small>{c.course_code} · {c.attended} of {c.held} classes</small></span>
                      <Bar v={c.pct} /><span className={`xs-v xs-${tone(c.pct)}`}>{pct(c.pct)}</span></li>))}
                  </ul>) : <p className="xs-empty">Course-wise attendance is not loaded for this student.</p>}
              </section>

              <div className="xs-side">
                <section className="xs-sec">
                  <h4>Semester by semester</h4>
                  {d.terms.length ? (
                    <table className="xs-terms"><thead><tr><th>Semester</th><th>Attendance</th><th className="n">SGPA</th><th className="n">CGPA</th></tr></thead>
                      <tbody>{d.terms.map((t) => (
                        <tr key={t.semester_no} className={t === now ? 'xs-now' : undefined}><td><b>Sem {t.semester_no}</b><small>{t.term_label}</small></td>
                          <td><span className={`xs-pill xs-${tone(t.attendance_pct)}`}>{pct(t.attendance_pct)}</span></td>
                          <td className="n">{t.sgpa?.toFixed(2) ?? '—'}</td><td className="n">{t.cgpa?.toFixed(2) ?? '—'}</td></tr>))}
                      </tbody></table>) : <p className="xs-empty">No semester records yet.</p>}
                </section>
                <section className="xs-sec">
                  <h4>Fees by kind</h4>
                  {d.fees.length ? (
                    <table className="xs-terms"><thead><tr><th>Fee</th><th className="n">Charged</th><th className="n">Paid</th><th className="n">Due</th></tr></thead>
                      <tbody>{d.fees.map((f) => (
                        <tr key={f.head}><td><b>{HEAD[f.head] ?? f.head.replace(/_/g, ' ')}</b><small>{f.outstanding ? (f.overdue ? 'Overdue' : `by ${day(f.next_due)}`) : 'Paid'}</small></td>
                          <td className="n">{inr(f.due)}</td><td className="n">{inr(f.paid)}</td><td className={`n${f.outstanding ? (f.overdue ? ' xs-txt-bad' : ' xs-txt-warn') : ''}`}><b>{f.outstanding ? inr(f.outstanding) : '—'}</b></td></tr>))}
                      </tbody></table>) : <p className="xs-empty">No fee raised.</p>}
                </section>
              </div>
            </div>
            {(d.outcomes?.length ?? 0) > 0 && <section className="xs-sec"><h4>Placements and offers</h4><OutcomeList list={d.outcomes!} /></section>}
            <p className="xs-note">Minimum class attendance {MIN}%. Attendance and results from the university ERP; fees from the residency accounts.</p>
          </div>)}
      </div>
    </div>
  );
}
