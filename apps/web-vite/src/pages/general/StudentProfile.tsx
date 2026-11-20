import { useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle, Award, BadgeCheck, BedDouble, BookOpen, Briefcase, Camera, CheckCircle2, ChevronRight, Compass, DoorOpen, GraduationCap, HeartPulse, IdCard, IndianRupee,
  KeyRound, MapPin, Moon, Phone, ShieldCheck, Sparkles, Trophy, UserRound, Users, Wallet, Zap, type LucideIcon,
} from 'lucide-react';
import { Button, Field, Input, Select, formatDate, formatINR } from '@/lib/klh';
import { api } from '@/lib/api';
import { squarePhoto } from '@/lib/photo';
import { ChangePasswordForm } from './ChangePassword';
import { mobile, titleCase, toast, useAction, useApi, useSession, words } from '@/lib/ui';

type Me = {
  student_id: string; full_name: string; gender: string; programme: string; student_type: string; admission_type: string; offering_mode: string | null; regulation: string | null; year_semester: string | null;
  date_of_birth: string; blood_group: string | null; disability: string | null; nationality: string; personal_email: string; admission_date: string | null; father_name: string | null; mother_name: string | null;
  dept_code: string | null; dept_name: string | null; counsellor_id: string | null; counsellor_name: string | null; counsellor_mobile: string | null; is_hosteller: boolean; status: string; photo: string | null;
  addresses: { hno: string; street: string; landmark: string; city: string; district: string; state: string; pincode: string; type: string }[] | null;
  contacts: { contact_id: number; relation: string; contact_name: string; mobile_no: string; is_verified: boolean; is_outpass_approver: boolean }[];
};
type Term = { semester_no: number; term_label: string; sgpa: number | null; cgpa: number | null; credits: number | null; attendance_pct: number | null; backlogs: number };
type P360 = {
  hostel: { night_pct: number | null; nights_missed: number; outings: number; late_returns: number; alerts: number; sick_days: number; dues: number };
  terms: Term[];
  crt: { attendance: { month: string; held: number; attended: number }[]; tests: { id: number; test_name: string; test_date: string; category: string; score: number; max_score: number; percentile: number | null }[] };
  certs: { id: number; title: string; provider: string; category: string; issued_on: string; verified: boolean }[];
  activities: { id: number; type: string; title: string; role: string | null; from_date: string; to_date: string | null; hours: number | null }[];
  achievements: { id: number; title: string; level: string; category: string; achieved_on: string; award: string | null; verified: boolean }[];
};
type Room = { bed_label: string; hostel_name: string; hostel_code: string; floor_name: string; type_name: string; is_ac: boolean; sharing_count: number; key_no: string | null; allocation_date: string };
type Dues = { demands: { demand_id: number; fee_head: string; amount_due: string; amount_paid: string; due_date: string; status: string }[];
  totals: { fee_head: string; amount_due: string; amount_paid: string; balance: string }[]; receipts: { receipt_no: string; fee_head: string; amount: string; paid_on: string; payment_mode: string }[] };

const GOAL: Record<string, string> = { Placement_Product: 'Placement, product companies', Placement_Services: 'Placement, IT services', Higher_Studies: 'Higher studies',
  Govt_Exams: 'Government exams', Entrepreneurship: 'Start-up', Core_Other: 'Core or other field', Undecided: 'Not decided yet' };
const ATT_MIN = 75;
const age = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 864e5));
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const inr = (n: number) => formatINR(Math.round(n));
type Tone = 'good' | 'warn' | 'bad' | 'none';

/**
 * GEN-01 for a student: their profile in one place. The photo and record, academic standing (SGPA and CGPA by term,
 * attendance against the minimum, backlogs), placement training, activities, achievements and certifications; the
 * hostel stay, fees, hostel life, electricity and career goal; family contacts, which the student verifies and from
 * which they choose who recommends their outings. Changes to the record itself are made in the ERP.
 */
export default function StudentProfile() {
  const s = useSession()!;
  const navigate = useNavigate();
  const me = useApi<Me>(`/students/${s.id}`);
  const p = useApi<P360>(`/students/${s.id}/360`);
  const room = useApi<Room | null>('/me/room');
  const dues = useApi<Dues>(`/students/${s.id}/demands`);
  const goal = useApi<{ goal: string } | null>('/me/career-goal');
  const meter = useApi<{ units_left: string | null; meter_no: string }>('/meters/mine');
  const m = me.data;
  if (!m) return <div className="sp"><p className="sp-loading">Loading your profile…</p></div>;
  const d = p.data;
  const terms = d?.terms ?? [];
  const last = terms[terms.length - 1];
  const backlogs = last?.backlogs ?? 0;
  const att = last?.attendance_pct ?? null;
  const due = (dues.data?.totals ?? []).reduce((a, t) => a + Number(t.balance), 0);
  const name = titleCase(m.full_name);

  const stats: { icon: LucideIcon; label: string; value: string; t: Tone }[] = [
    { icon: GraduationCap, label: 'CGPA', value: last?.cgpa != null ? last.cgpa.toFixed(2) : '—', t: last?.cgpa == null ? 'none' : last.cgpa >= 7 ? 'good' : last.cgpa >= 6 ? 'warn' : 'bad' },
    { icon: BookOpen, label: 'Attendance', value: att != null ? `${att}%` : '—', t: att == null ? 'none' : att >= ATT_MIN ? 'good' : 'bad' },
    { icon: AlertTriangle, label: 'Backlogs', value: String(backlogs), t: backlogs ? 'bad' : 'good' },
    { icon: Wallet, label: 'Fees due', value: inr(due), t: due > 0 ? 'warn' : 'good' },
    { icon: Moon, label: 'Roll call', value: d?.hostel.night_pct != null ? `${d.hostel.night_pct}%` : '—', t: d?.hostel.night_pct == null ? 'none' : d.hostel.night_pct >= 90 ? 'good' : 'warn' },
    { icon: Trophy, label: 'Activities & awards', value: String((d?.activities.length ?? 0) + (d?.achievements.length ?? 0) + (d?.certs.length ?? 0)), t: 'none' },
  ];

  return (
    <div className="sp">
      {/* ---------------- header ---------------- */}
      <section className="sp-hero">
        <Photo m={m} onSaved={() => me.mutate()} />
        <div className="sp-id">
          <p className="sp-eyebrow">{m.dept_name ?? m.dept_code ?? 'Student'}</p>
          <h1>{name}</h1>
          <p className="sp-sub"><span className="sp-mono">{m.student_id}</span> · {m.programme}{m.year_semester ? ` · ${m.year_semester}` : ''}</p>
          <div className="sp-chips">
            <span className="sp-chip sp-chip-on"><CheckCircle2 size={13} />{words(m.status)}</span>
            <span className="sp-chip"><BedDouble size={13} />{room.data ? room.data.bed_label : m.is_hosteller ? 'Hosteller' : 'Day scholar'}</span>
            {goal.data?.goal && goal.data.goal !== 'Undecided' && <span className="sp-chip"><Compass size={13} />{GOAL[goal.data.goal]}</span>}
            {m.blood_group && <span className="sp-chip"><HeartPulse size={13} />{m.blood_group}</span>}
          </div>
        </div>
        <ul className="sp-stats">{stats.map((x) => (
          <li key={x.label} className={`sp-t-${x.t}`}><x.icon size={16} /><b>{x.value}</b><small>{x.label}</small></li>))}</ul>
      </section>

      <div className="sp-grid">
        {/* ---------------- main column ---------------- */}
        <div className="sp-col">
          <Card icon={GraduationCap} title="Academic performance" sub={last ? `${last.term_label} · ${terms.length} term${terms.length === 1 ? '' : 's'} on record` : 'Results appear after the first term'}>
            {terms.length ? (
              <>
                <div className="sp-acad">
                  <div className="sp-big"><b>{last.cgpa?.toFixed(2) ?? '—'}</b><small>CGPA</small>
                    {terms.length > 1 && last.sgpa != null && terms[terms.length - 2].sgpa != null && (
                      <em className={last.sgpa >= terms[terms.length - 2].sgpa! ? 'sp-up' : 'sp-down'}>
                        {last.sgpa >= terms[terms.length - 2].sgpa! ? '▲' : '▼'} SGPA {Math.abs(last.sgpa - terms[terms.length - 2].sgpa!).toFixed(2)} on last term</em>)}</div>
                  <GpaChart terms={terms} />
                </div>
                <div className="sp-table-wrap">
                  <table className="sp-table">
                    <thead><tr><th>Term</th><th className="n">SGPA</th><th className="n">CGPA</th><th className="n">Credits</th><th>Attendance</th><th className="n">Backlogs</th></tr></thead>
                    <tbody>{terms.map((t) => (
                      <tr key={t.semester_no}><td><b>Sem {t.semester_no}</b>{t.term_label !== `Sem ${t.semester_no}` && <small>{t.term_label}</small>}</td><td className="n">{t.sgpa?.toFixed(2) ?? '—'}</td><td className="n">{t.cgpa?.toFixed(2) ?? '—'}</td>
                        <td className="n">{t.credits ?? '—'}</td>
                        <td><AttBar v={t.attendance_pct} /></td>
                        <td className="n">{t.backlogs ? <span className="sp-pill sp-t-bad"><AlertTriangle size={11} />{t.backlogs}</span> : <span className="sp-pill sp-t-good">None</span>}</td></tr>))}</tbody>
                  </table>
                </div>
                {(backlogs > 0 || (att != null && att < ATT_MIN)) && (
                  <p className="sp-warn"><AlertTriangle size={15} />{[backlogs ? `${backlogs} backlog${backlogs > 1 ? 's' : ''} to clear` : null, att != null && att < ATT_MIN ? `attendance ${att}% is below ${ATT_MIN}%` : null].filter(Boolean).join(' and ')}. Your counsellor{m.counsellor_name ? `, ${titleCase(m.counsellor_name)},` : ''} can help.</p>)}
              </>) : <Empty text="No term results yet." />}
          </Card>

          <Card icon={Briefcase} title="Placement training" sub="Practice tests and training sessions">
            {d && d.crt.tests.length ? <Crt crt={d.crt} /> : <Empty text="No placement-training tests yet." />}
          </Card>

          <Card icon={Sparkles} title="Activities, achievements and certifications">
            {d && (d.activities.length || d.achievements.length || d.certs.length) ? (
              <div className="sp-tiles">
                {d.achievements.map((a) => <Tile key={`a${a.id}`} icon={Trophy} kind="Achievement" title={a.title} meta={`${a.level} level${a.award ? ` · ${a.award}` : ''} · ${formatDate(a.achieved_on)}`} verified={a.verified} accent="gold" />)}
                {d.activities.map((a) => <Tile key={`v${a.id}`} icon={Award} kind={words(a.type)} title={a.title} meta={`${a.role ?? 'Member'} · ${formatDate(a.from_date)}${a.to_date ? ` to ${formatDate(a.to_date)}` : ', ongoing'}${a.hours ? ` · ${a.hours} h` : ''}`} accent="teal" />)}
                {d.certs.map((c) => <Tile key={`c${c.id}`} icon={BadgeCheck} kind={`${c.category} certification`} title={c.title} meta={`${c.provider} · ${formatDate(c.issued_on)}`} verified={c.verified} accent="blue" />)}
              </div>) : <Empty text="Clubs, sports, internships, certifications and awards you add with your counsellor appear here." />}
          </Card>

          <Card icon={IdCard} title="Personal record" sub="From the university ERP. Changes are made there.">
            <dl className="sp-dl">
              <Item label="Gender" value={m.gender} />
              <Item label="Date of birth" value={`${formatDate(m.date_of_birth)} · ${age(m.date_of_birth)} years`} />
              <Item label="Nationality" value={m.nationality} />
              <Item label="Email" value={m.personal_email} />
              <Item label="Father" value={m.father_name ? titleCase(m.father_name) : '—'} />
              <Item label="Mother" value={m.mother_name ? titleCase(m.mother_name) : '—'} />
              <Item label="Admission" value={`${words(m.admission_type)}${m.admission_date ? ` · ${formatDate(m.admission_date)}` : ''}`} />
              <Item label="Regulation" value={m.regulation ?? '—'} />
              <Item label="Counsellor" value={m.counsellor_name ? `${titleCase(m.counsellor_name)}${m.counsellor_mobile ? ` · ${mobile(m.counsellor_mobile)}` : ''}` : 'Not assigned'} />
              {m.disability && <Item label="Disability" value={m.disability} />}
            </dl>
            {m.addresses?.map((a, i) => <p key={i} className="sp-addr"><MapPin size={14} /><span><b>{a.type}</b>{[a.hno, a.street, a.landmark, a.city, a.district, a.state, a.pincode].filter(Boolean).join(', ')}</span></p>)}
          </Card>
        </div>

        {/* ---------------- side column ---------------- */}
        <div className="sp-col">
          <Card icon={BedDouble} title="Residency stay" action={<Go onClick={() => navigate('/registration')} />}>
            {room.data ? (
              <>
                <div className="sp-room"><b>{room.data.bed_label}</b><small>{room.data.hostel_name}</small></div>
                <dl className="sp-dl sp-dl-2">
                  <Item label="Floor" value={room.data.floor_name} /><Item label="Room type" value={room.data.type_name} />
                  <Item label="Key" value={room.data.key_no ?? '—'} /><Item label="Since" value={formatDate(room.data.allocation_date)} />
                </dl>
              </>) : <Empty text="Your room appears here after check-in." />}
          </Card>

          <Card icon={IndianRupee} title="Fees" action={<Go onClick={() => navigate('/fees')} />}>
            {dues.data ? <Fees d={dues.data} onPay={() => navigate('/fees')} /> : <Empty text="Loading…" />}
          </Card>

          <Card icon={DoorOpen} title="Residency life" sub="This term">
            {d ? (
              <ul className="sp-life">
                <li><Moon size={15} /><span>Night roll call</span><b>{d.hostel.night_pct != null ? `${d.hostel.night_pct}%` : '—'}</b></li>
                <li><DoorOpen size={15} /><span>Outings</span><b>{d.hostel.outings}</b></li>
                <li><AlertTriangle size={15} /><span>Late returns</span><b className={d.hostel.late_returns ? 'sp-red' : ''}>{d.hostel.late_returns}</b></li>
                <li><HeartPulse size={15} /><span>Sick days</span><b>{d.hostel.sick_days}</b></li>
                <li><Zap size={15} /><span>Electricity units left</span><b>{meter.data?.units_left != null ? Number(meter.data.units_left).toFixed(0) : '—'}</b></li>
              </ul>) : <Empty text="Loading…" />}
          </Card>

          <Card icon={Compass} title="Career goal" action={<Go onClick={() => navigate('/home')} />}>
            <div className="sp-goal"><b>{goal.data ? GOAL[goal.data.goal] ?? words(goal.data.goal) : 'Not chosen yet'}</b>
              <small>{goal.data?.goal && goal.data.goal !== 'Undecided' ? 'Your counsellor uses this to guide you. Change it from My career goal on Home.' : 'Tell us what you aim for, from My career goal on Home.'}</small></div>
          </Card>

          <Card icon={Users} title="Family contacts" sub="Verify each number. One parent or guardian recommends your outings.">
            <Contacts m={m} onChange={() => me.mutate()} />
          </Card>

          <Card icon={KeyRound} title="Password" sub={`Username ${m.student_id}`}>
            <ChangePasswordForm />
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Photo({ m, onSaved }: { m: Me; onSaved: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { await api('/me/photo', { method: 'PUT', json: { photo: await squarePhoto(f) } }); toast('Photo updated'); onSaved(); }
    catch (e) { toast((e as Error).message, 'critical'); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  return (
    <div className="sp-photo">
      {m.photo ? <img src={m.photo} alt={titleCase(m.full_name)} /> : <span className="sp-initials" aria-hidden="true">{initials(m.full_name)}</span>}
      <button type="button" className="sp-cam" onClick={() => input.current?.click()} disabled={busy} aria-label={m.photo ? 'Change photo' : 'Add a photo'}>
        <Camera size={16} /><span>{busy ? 'Saving…' : m.photo ? 'Change' : 'Add photo'}</span></button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

function Card({ icon: I, title, sub, action, children }: { icon: LucideIcon; title: string; sub?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="sp-card">
      <header><span className="sp-ico"><I size={18} /></span><span className="sp-card-t"><h2>{title}</h2>{sub && <small>{sub}</small>}</span>{action}</header>
      {children}
    </section>
  );
}
const Go = ({ onClick }: { onClick: () => void }) => <button type="button" className="sp-go" onClick={onClick} aria-label="Open"><ChevronRight size={18} /></button>;
const Empty = ({ text }: { text: string }) => <p className="sp-empty">{text}</p>;
const Item = ({ label, value }: { label: string; value: string }) => <div><dt>{label}</dt><dd>{value}</dd></div>;

function Tile({ icon: I, kind, title, meta, verified, accent }: { icon: LucideIcon; kind: string; title: string; meta: string; verified?: boolean; accent: 'gold' | 'teal' | 'blue' }) {
  return (
    <div className={`sp-tile sp-a-${accent}`}>
      <span className="sp-tile-ico"><I size={18} /></span>
      <span className="sp-tile-tx"><small>{kind}{verified ? ' · verified' : ''}</small><b>{title}</b><em>{meta}</em></span>
    </div>
  );
}

function AttBar({ v }: { v: number | null }) {
  if (v == null) return <span className="sp-muted">—</span>;
  return (
    <span className={`sp-att ${v < ATT_MIN ? 'sp-att-low' : ''}`} title={`Minimum ${ATT_MIN}%`}>
      <i><i style={{ width: `${Math.min(100, v)}%` }} /><s style={{ left: `${ATT_MIN}%` }} /></i><b>{v}%</b>
    </span>
  );
}

/** SGPA as bars and CGPA as a line, on one 0-10 scale. */
function GpaChart({ terms }: { terms: Term[] }) {
  const W = 360, H = 130, L = 26, B = 22, T = 10, step = (W - L) / Math.max(terms.length, 1), bw = Math.min(34, step * 0.5);
  const y = (v: number) => T + (1 - v / 10) * (H - T - B);
  const pts = terms.map((t, i) => ({ x: L + step * i + step / 2, sg: t.sgpa, cg: t.cgpa }));
  return (
    <figure className="sp-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`SGPA and CGPA by term: ${terms.map((t) => `Sem ${t.semester_no} ${t.sgpa ?? '—'}`).join(', ')}`}>
        {[0, 5, 10].map((v) => <g key={v}><line x1={L} x2={W} y1={y(v)} y2={y(v)} className="sp-grid" /><text x={L - 6} y={y(v) + 3} textAnchor="end" className="sp-axis">{v}</text></g>)}
        {pts.map((p, i) => p.sg != null && <rect key={i} x={p.x - bw / 2} y={y(p.sg)} width={bw} height={y(0) - y(p.sg)} rx={4} className="sp-bar"><title>{`Sem ${terms[i].semester_no}: SGPA ${p.sg}`}</title></rect>)}
        <polyline points={pts.filter((p) => p.cg != null).map((p) => `${p.x},${y(p.cg!)}`).join(' ')} className="sp-line" />
        {pts.map((p, i) => p.cg != null && <circle key={i} cx={p.x} cy={y(p.cg)} r={4} className="sp-dot"><title>{`Sem ${terms[i].semester_no}: CGPA ${p.cg}`}</title></circle>)}
        {pts.map((p, i) => <text key={i} x={p.x} y={H - 6} textAnchor="middle" className="sp-axis">Sem {terms[i].semester_no}</text>)}
      </svg>
      <figcaption><span><i className="sp-k-bar" />SGPA</span><span><i className="sp-k-line" />CGPA</span></figcaption>
    </figure>
  );
}

function Crt({ crt }: { crt: P360['crt'] }) {
  const cats = [...new Set(crt.tests.map((t) => t.category))];
  const avg = cats.map((c) => { const ts = crt.tests.filter((t) => t.category === c); return { c, pct: Math.round(ts.reduce((a, t) => a + (100 * t.score) / t.max_score, 0) / ts.length), n: ts.length }; })
    .sort((a, b) => b.pct - a.pct);
  const held = crt.attendance.reduce((a, x) => a + x.held, 0), went = crt.attendance.reduce((a, x) => a + x.attended, 0);
  const sessions = held ? Math.round((100 * went) / held) : null;
  return (
    <div className="sp-crt">
      <ul className="sp-bars">{avg.map((x) => (
        <li key={x.c}><span>{words(x.c)}<small>{x.n} test{x.n > 1 ? 's' : ''}</small></span><i><i style={{ width: `${x.pct}%` }} /></i><b>{x.pct}%</b></li>))}</ul>
      <div className={`sp-mini ${sessions != null && sessions < 60 ? 'sp-t-warn' : ''}`}><b>{sessions != null ? `${sessions}%` : '—'}</b><small>training sessions attended<br />{went} of {held}</small></div>
    </div>
  );
}

function Fees({ d, onPay }: { d: Dues; onPay: () => void }) {
  const due = d.totals.reduce((a, t) => a + Number(t.amount_due), 0), paid = d.totals.reduce((a, t) => a + Number(t.amount_paid), 0);
  const bal = d.totals.reduce((a, t) => a + Number(t.balance), 0);
  const open = d.demands.filter((x) => ['Pending', 'Part_Paid', 'Overdue'].includes(x.status)).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const r = 30, c = 2 * Math.PI * r, f = due ? paid / due : 0;
  return (
    <>
      <div className="sp-fee">
        <svg viewBox="0 0 76 76" className="sp-ring" role="img" aria-label={`${Math.round(f * 100)}% of fees paid`}>
          <circle cx="38" cy="38" r={r} className="sp-ring-bg" /><circle cx="38" cy="38" r={r} className="sp-ring-fg" strokeDasharray={`${f * c} ${c}`} transform="rotate(-90 38 38)" />
          <text x="38" y="42" textAnchor="middle">{Math.round(f * 100)}%</text></svg>
        <div><span><small>Paid</small><b>{inr(paid)}</b></span><span><small>Still due</small><b className={bal ? 'sp-red' : ''}>{inr(bal)}</b></span></div>
      </div>
      {open.length > 0 ? (
        <ul className="sp-due">{open.slice(0, 4).map((x) => (
          <li key={x.demand_id}><span><b>{words(x.fee_head)}</b><small>due {formatDate(x.due_date)}</small></span><b>{inr(Number(x.amount_due) - Number(x.amount_paid))}</b></li>))}</ul>
      ) : <p className="sp-ok"><CheckCircle2 size={15} />Everything is paid.</p>}
      {bal > 0 && <Button variant="primary" icon="wallet" onClick={onPay}>Pay {inr(bal)}</Button>}
      {d.receipts.length > 0 && <p className="sp-muted sp-small">Last receipt {d.receipts[0].receipt_no}, {inr(Number(d.receipts[0].amount))} on {formatDate(d.receipts[0].paid_on)}</p>}
    </>
  );
}

function Contacts({ m, onChange }: { m: Me; onChange: () => void }) {
  const { run, busy } = useAction();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ relation: 'Father', contact_name: '', mobile_no: '' });
  return (
    <>
      <ul className="sp-contacts">{m.contacts.map((c) => (
        <li key={c.contact_id}>
          <span className="sp-c-av">{c.relation === 'Self' ? <UserRound size={16} /> : initials(c.contact_name)}</span>
          <span className="sp-c-tx"><b>{titleCase(c.contact_name)}</b><small>{c.relation} · <Phone size={11} /> {mobile(c.mobile_no)}</small></span>
          <span className="sp-c-acts">
            {c.is_verified ? <span className="sp-pill sp-t-good"><ShieldCheck size={11} />Verified</span>
              : <Button size="sm" variant="soft" loading={busy} onClick={() => run(() => api(`/contacts/${c.contact_id}/verify`, { method: 'POST', json: { otp: '000000' } }).then(onChange), 'Number verified')}>Verify</Button>}
            {c.is_outpass_approver ? <span className="sp-pill sp-t-blue"><KeyRound size={11} />Outing approver</span>
              : c.relation !== 'Self' && c.is_verified && <Button size="sm" variant="ghost" loading={busy} onClick={() => run(() => api(`/contacts/${c.contact_id}/outpass-approver`, { method: 'POST' }).then(onChange), 'Outing approver chosen')}>Make approver</Button>}
          </span>
        </li>))}</ul>
      {m.contacts.length === 0 && <Empty text="No contacts yet. Add a parent or guardian." />}
      {!open ? <button type="button" className="sp-add" onClick={() => setOpen(true)}>+ Add a contact</button> : (
        <form className="sp-add-form" onSubmit={(e) => { e.preventDefault(); run(() => api(`/students/${m.student_id}/contacts`, { method: 'POST', json: f }).then(() => { setOpen(false); onChange(); }), 'Contact added'); }}>
          <Field label="Relation"><Select value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })} options={['Father', 'Mother', 'Guardian']} /></Field>
          <Field label="Name"><Input value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} required /></Field>
          <Field label="Mobile"><Input value={f.mobile_no} onChange={(e) => setF({ ...f, mobile_no: e.target.value })} required pattern="[6-9][0-9]{9}" placeholder="10 digits" /></Field>
          <div className="sp-add-acts"><Button type="submit" variant="primary" loading={busy}>Add</Button><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button></div>
        </form>)}
    </>
  );
}
