import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BarChart, Button, Drawer, Field, Icon, Input, ProgressRing, Select, Sparkline, StatusChip, formatDate, formatINR } from '@/lib/klh';
import { api } from '@/lib/api';
import { titleCase, useAction, useApi, useSession, words } from '@/lib/ui';
import { initials } from '@/ui/kit';
import { can } from '@/app/screens';

type P360 = {
  student: { student_id: string; full_name: string; gender: string; programme: string; level: string; dept_name: string | null; dept_code: string | null; is_hosteller: boolean; hostel_name: string | null; hostel_code: string | null; floor_name: string | null; room_code: string | null; bed_code: string | null; type_name: string | null; allocation_date: string | null; floor_warden: string | null; current_status: string | null; career_goal: string | null; career_notes: string | null };
  hostel: { session_pct: number | null; night_pct: number | null; nights_missed: number; outings: number; late_returns: number; alerts: number; sick_days: number; dues: number };
  terms: { semester_no: number; term_label: string; sgpa: number; cgpa: number; credits: number; attendance_pct: number; backlogs: number }[];
  backlog_courses?: { course_code: string; grade: string }[];
  crt: { attendance: { month: string; held: number; attended: number }[]; tests: { id: number; test_name: string; test_date: string; category: string; score: number; max_score: number; percentile: number }[] };
  certs: { id: number; title: string; provider: string; category: string; issued_on: string; credential_ref: string | null; verified: boolean }[];
  activities: { id: number; type: string; title: string; role: string | null; from_date: string; to_date: string | null; hours: number | null }[];
  achievements: { id: number; title: string; level: string; category: string | null; achieved_on: string; award: string | null; verified: boolean }[];
};
const TABS = ['Overview', 'Academics', 'CRT', 'Skills', 'Activities', 'Hostel'] as const;
const num = (n?: number | null) => (n === null || n === undefined ? '—' : String(Math.round(n)));
const pct = (n?: number | null) => (n === null || n === undefined ? '—' : `${Math.round(n)}%`);
const LEVEL_TONE: Record<string, string> = { International: 'tag-ok', National: 'tag-ok', State: 'tag-warn', University: '', Hostel: '' };
const month = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' });

/**
 * ACA-01 Student academic page, as the whole student: results, CRT, certifications, activities, achievements and the
 * hostel record. A student opens their own (and adds certificates and achievements for verification); wardens and
 * senior staff open any hosteller from the performance board.
 */
export default function Student360({ id: own }: { id?: string }) {
  const { id: param } = useParams();
  const s = useSession()!;
  const navigate = useNavigate();
  const id = own ?? param ?? s.id;
  const d = useApi<P360>(`/students/${id}/360`);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [add, setAdd] = useState<'cert' | 'ach' | null>(null);
  const { run, busy } = useAction();
  const verifier = can(s.role, 'ACA-01', 'V') && ['Floor_Warden', 'Warden', 'Assistant_Warden', 'Chief_Warden', 'Hostel_Incharge', 'Director_Hostels'].includes(s.role);
  if (!d.data) return <div className="q-empty">{d.error ? 'This profile is not open to you.' : 'Loading…'}</div>;
  const { student: st, hostel: h, terms, crt, certs, activities, achievements } = d.data;
  const last = terms[terms.length - 1];
  const crtHeld = crt.attendance.reduce((a, m) => a + m.held, 0), crtGot = crt.attendance.reduce((a, m) => a + m.attended, 0);
  const crtPct = crtHeld ? (100 * crtGot) / crtHeld : null;
  const crtAvg = crt.tests.length ? crt.tests.reduce((a, t) => a + (100 * t.score) / t.max_score, 0) / crt.tests.length : null;
  const verify = (kind: 'certifications' | 'achievements', vid: number) => run(() => api(`/acad/${kind}/${vid}/verify`, { method: 'POST', json: {} }).then(() => d.mutate()), 'Verified');
  const mine = s.kind === 'student' && s.id === id;

  return (
    <div className="pg s360">
      {!own && s.kind === 'staff' && <button type="button" className="dm-clear" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 4 }} onClick={() => navigate('/academics')}><Icon name="chevron-left" size={13} /> All hostellers</button>}
      <section className="s360-hero">
        <span className="s360-av" aria-hidden>{initials(st.full_name)}</span>
        <div className="s360-who">
          <h1>{titleCase(st.full_name)}</h1>
          <p>{st.student_id} · {st.programme} · {st.dept_name ?? st.dept_code ?? st.level}</p>
          <div className="s360-chips">
            {st.room_code ? <span className="tag"><Icon name="bed" size={12} />{st.hostel_code} {st.room_code}, {st.floor_name}</span> : <span className="tag">{st.is_hosteller ? 'Hosteller' : 'Day scholar'}</span>}
            {st.current_status && <StatusChip status={st.current_status} label={words(st.current_status)} />}
            {st.career_goal && st.career_goal !== 'Undecided' && <span className="tag" title="Stated in the career-choice survey">Career: {st.career_notes?.replace(/^Career choice \([^)]*\):\s*/, '') ?? words(st.career_goal)}</span>}
          </div>
        </div>
        <div className="s360-rings">
          <Ring v={last?.cgpa ?? 0} max={10} label={last ? last.cgpa.toFixed(2) : '—'} sub="CGPA" color="violet" />
          <Ring v={last?.attendance_pct ?? 0} max={100} label={num(last?.attendance_pct)} sub="Class %" color="sky" />
          <Ring v={crtPct ?? 0} max={100} label={num(crtPct)} sub="CRT %" color="coral" />
          <Ring v={h.night_pct ?? 0} max={100} label={num(h.night_pct)} sub="Residency %" color="green" />
        </div>
      </section>

      <div className="s360-tabs" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}</div>

      {tab === 'Overview' && (
        <div className="s360-grid">
          <Tile title="Latest semester" go={() => setTab('Academics')}>{last ? <><b className="big">{last.sgpa.toFixed(2)}</b><span>SGPA, semester {last.semester_no} · {last.backlogs ? `${last.backlogs} backlog` : 'no backlogs'}</span><Sparkline data={terms.map((t) => t.sgpa)} color="violet" width={160} height={34} /></> : <span>No results yet</span>}</Tile>
          <Tile title="CRT" go={() => setTab('CRT')}>{crt.tests.length ? <><b className="big">{Math.round(crtAvg!)}<small>/100</small></b><span>average over {crt.tests.length} tests · {pct(crtPct)} sessions attended</span><Sparkline data={crt.tests.map((t) => (100 * t.score) / t.max_score)} color="coral" width={160} height={34} /></> : <span>No CRT records</span>}</Tile>
          <Tile title="Certifications" go={() => setTab('Skills')}><b className="big">{certs.length}</b>{certs.slice(0, 3).map((c) => <span key={c.id}>{c.title} · {c.provider}</span>)}</Tile>
          <Tile title="Achievements" go={() => setTab('Activities')}><b className="big">{achievements.length}</b>{achievements.slice(0, 3).map((a) => <span key={a.id}>{a.award ? `${a.award}, ` : ''}{a.title}</span>)}</Tile>
          <Tile title="Activities" go={() => setTab('Activities')}><b className="big">{activities.length}</b><span>{activities.reduce((a, x) => a + (x.hours ?? 0), 0)} hours in clubs, sports, service and internships</span></Tile>
          <Tile title="Hostel" go={() => setTab('Hostel')}><b className="big">{pct(h.night_pct)}</b><span>night roll call, last 30 days · {h.outings} outings · {h.late_returns} late</span></Tile>
        </div>)}

      {tab === 'Academics' && (
        <section className="box"><div className="box-head"><h2>Semester results</h2></div>
          <div className="box-body">{terms.length ? <BarChart data={terms.map((t) => ({ label: `S${t.semester_no}`, value: t.sgpa, highlight: t === last }))} unit="" showValues height={160} label="SGPA by semester" /> : <p className="klh-muted">No results loaded yet.</p>}</div>
          <table className="s360-table"><thead><tr><th>Semester</th><th>SGPA</th><th>CGPA</th><th>Credits</th><th>Attendance</th><th>Backlogs</th></tr></thead>
            <tbody>{terms.map((t) => <tr key={t.semester_no}><td data-label="Semester">{t.semester_no} · {t.term_label}</td><td data-label="SGPA"><b>{t.sgpa.toFixed(2)}</b></td><td data-label="CGPA">{t.cgpa.toFixed(2)}</td><td data-label="Credits">{t.credits}</td>
              <td data-label="Attendance"><span className={t.attendance_pct < 75 ? 'tag tag-bad' : 'tag tag-ok'}>{pct(t.attendance_pct)}</span></td><td data-label="Backlogs">{t.backlogs || '—'}</td></tr>)}</tbody></table>
          {(d.data.backlog_courses?.length ?? 0) > 0 && <div className="box-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span className="klh-muted" style={{ marginRight: 4 }}>Backlog courses:</span>
            {d.data.backlog_courses!.map((c) => <span key={c.course_code} className="tag tag-bad" title={c.grade === 'DT' ? 'Detained' : `Grade ${c.grade}`}>{c.course_code} · {c.grade}</span>)}
          </div>}
        </section>)}

      {tab === 'CRT' && (
        <div className="s360-two">
          <section className="box"><div className="box-head"><h2>Training sessions</h2><span className="grow" /><span className="tag">{crtGot} of {crtHeld}</span></div>
            <div className="box-body">{crt.attendance.length ? <BarChart data={crt.attendance.map((m) => ({ label: month(m.month), value: Math.round((100 * m.attended) / Math.max(1, m.held)) }))} unit="%" showValues height={150} label="CRT attendance by month" /> : <p className="klh-muted">No sessions recorded.</p>}</div></section>
          <section className="box"><div className="box-head"><h2>Tests</h2></div>
            <div className="bedlist" style={{ border: 0 }}>{crt.tests.slice().reverse().map((t) => (
              <div key={t.id}><span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><b style={{ fontWeight: 600 }}>{t.test_name}</b><small>{words(t.category)} · {formatDate(t.test_date)} · better than {t.percentile}% of the batch</small>
                <span className="meter"><i style={{ width: `${(100 * t.score) / t.max_score}%` }} /></span></span><b style={{ fontVariantNumeric: 'tabular-nums' }}>{t.score}<small>/{t.max_score}</small></b></div>))}</div></section>
        </div>)}

      {tab === 'Skills' && (
        <section className="box"><div className="box-head"><h2>Certifications</h2><span className="grow" />{mine && <Button size="sm" variant="primary" icon="plus" onClick={() => setAdd('cert')}>Add a certificate</Button>}</div>
          <div className="s360-cards">{certs.map((c) => (
            <div key={c.id} className="s360-card"><span className="tag">{words(c.category)}</span><b>{c.title}</b><span>{c.provider} · {formatDate(c.issued_on)}</span>{c.credential_ref && <small className="klh-code">{c.credential_ref}</small>}
              {c.verified ? <span className="tag tag-ok"><Icon name="check" size={11} />Verified</span> : verifier ? <Button size="sm" variant="secondary" loading={busy} onClick={() => verify('certifications', c.id)}>Verify</Button> : <span className="tag tag-warn">Waiting to be verified</span>}</div>))}
            {!certs.length && <p className="klh-muted" style={{ padding: 14 }}>No certifications yet.</p>}</div></section>)}

      {tab === 'Activities' && (
        <div className="s360-two">
          <section className="box"><div className="box-head"><h2>Achievements</h2><span className="grow" />{mine && <Button size="sm" variant="primary" icon="plus" onClick={() => setAdd('ach')}>Add</Button>}</div>
            <div className="bedlist" style={{ border: 0 }}>{achievements.map((a) => (
              <div key={a.id}><span className={`tag ${LEVEL_TONE[a.level] ?? ''}`} style={{ width: 92, justifyContent: 'center' }}>{a.level}</span><span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><b style={{ fontWeight: 600 }}>{a.title}</b><small>{a.award ?? ''}{a.award ? ' · ' : ''}{formatDate(a.achieved_on)}</small></span>
                {!a.verified && (verifier ? <Button size="sm" variant="secondary" loading={busy} onClick={() => verify('achievements', a.id)}>Verify</Button> : <span className="tag tag-warn">To verify</span>)}</div>))}
              {!achievements.length && <div><small>No achievements yet.</small></div>}</div></section>
          <section className="box"><div className="box-head"><h2>Activities</h2></div>
            <div className="bedlist" style={{ border: 0 }}>{activities.map((a) => (
              <div key={a.id}><span className="tag" style={{ width: 92, justifyContent: 'center' }}>{words(a.type).replace('NSS NCC', 'NSS / NCC')}</span><span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}><b style={{ fontWeight: 600 }}>{a.title}</b><small>{a.role ?? ''}{a.role ? ' · ' : ''}{formatDate(a.from_date)}{a.to_date ? ` to ${formatDate(a.to_date)}` : ', ongoing'}{a.hours ? ` · ${a.hours} h` : ''}</small></span></div>))}
              {!activities.length && <div><small>No activities yet.</small></div>}</div></section>
        </div>)}

      {tab === 'Hostel' && (<>
        <HostelRecord id={id} canEdit={['Chief_Warden', 'Director_Hostels', 'admin'].includes(s.role)} />
        <section className="box"><div className="box-body">
          <div className="facts">
            <div><span>Room</span><b>{st.room_code ? `${st.hostel_code} ${st.room_code}` : '—'}</b></div><div><span>Floor Manager</span><b>{st.floor_warden ? titleCase(st.floor_warden) : '—'}</b></div>
            <div><span>Night roll call</span><b>{pct(h.night_pct)}</b></div><div><span>All sessions</span><b>{pct(h.session_pct)}</b></div><div><span>Nights missed</span><b>{h.nights_missed}</b></div>
            <div><span>Outings</span><b>{h.outings}</b></div><div><span>Late returns</span><b>{h.late_returns}</b></div><div><span>Sick days</span><b>{h.sick_days}</b></div><div><span>Alerts</span><b>{h.alerts}</b></div>
            <div><span>Dues</span><b>{formatINR(h.dues)}</b></div>
          </div>
        </div></section></>)}

      {add && <AddPanel kind={add} onClose={() => setAdd(null)} onDone={() => { setAdd(null); d.mutate(); }} />}
    </div>
  );
}

function Ring({ v, max, label, sub, color }: { v: number; max: number; label: string; sub: string; color: 'violet' | 'sky' | 'coral' | 'green' }) {
  return <div className="s360-ring"><ProgressRing value={v} max={max} size={68} stroke={7} color={color} label={label} ariaLabel={`${sub} ${label}`} /><span>{sub}</span></div>;
}
function Tile({ title, go, children }: { title: string; go: () => void; children: React.ReactNode }) {
  return <button type="button" className="s360-tile" onClick={go}><span className="s360-tile-head">{title}<Icon name="chevron-right" size={13} /></span>{children}</button>;
}

function AddPanel({ kind, onClose, onDone }: { kind: 'cert' | 'ach'; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState<Record<string, string>>(kind === 'cert' ? { category: 'Technical' } : { level: 'University' });
  const { run, busy } = useAction();
  const need = kind === 'cert' ? ['title', 'provider', 'issued_on'] : ['title', 'achieved_on'];
  const missing = need.filter((k) => !f[k]);
  return (
    <Drawer open onClose={onClose} title={kind === 'cert' ? 'Add a certificate' : 'Add an achievement'} subtitle="A Warden verifies it before it counts on your record"
      footer={<Button variant="primary" loading={busy} blockedReason={missing.length ? 'Fill the starred fields.' : undefined} onClick={() => run(() => api(kind === 'cert' ? '/me/certifications' : '/me/achievements', { method: 'POST', json: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) }).then(onDone), 'Added; waiting to be verified')}>Add</Button>}>
      <div className="klh-stack" style={{ gap: 14 }}>
        <Field label="Title" required><Input value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={kind === 'cert' ? 'AWS Cloud Practitioner' : 'Smart India Hackathon'} /></Field>
        {kind === 'cert' ? <>
          <Field label="Given by" required><Input value={f.provider ?? ''} onChange={(e) => setF({ ...f, provider: e.target.value })} placeholder="Coursera, NPTEL, AWS…" /></Field>
          <Field label="Kind"><Select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} options={['Technical', 'Cloud', 'Programming', 'Language', 'Soft_Skill', 'Sports', 'Other'].map((x) => ({ value: x, label: words(x) }))} /></Field>
          <Field label="Issued on" required><Input type="date" value={f.issued_on ?? ''} onChange={(e) => setF({ ...f, issued_on: e.target.value })} /></Field>
          <Field label="Credential ID or link"><Input value={f.credential_ref ?? ''} onChange={(e) => setF({ ...f, credential_ref: e.target.value })} /></Field>
        </> : <>
          <Field label="Level"><Select value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} options={['Hostel', 'University', 'State', 'National', 'International']} /></Field>
          <Field label="Award"><Input value={f.award ?? ''} onChange={(e) => setF({ ...f, award: e.target.value })} placeholder="First prize, Finalist…" /></Field>
          <Field label="Date" required><Input type="date" value={f.achieved_on ?? ''} onChange={(e) => setF({ ...f, achieved_on: e.target.value })} /></Field>
        </>}
      </div>
    </Drawer>
  );
}

/* ---------- the hostel record (migration 126): what the student submitted once; the Chief Manager edits it ---------- */
type Kyc = Record<string, string | null | boolean> & { locked: boolean; can_edit: boolean; submitted_on: string | null };
const KYC_FIELDS: [string, string][] = [['aadhaar_no', 'Aadhaar number'], ['blood_group', 'Blood group'], ['hno', 'House number'], ['street', 'Street'], ['landmark', 'Landmark'], ['city', 'City or village'], ['district', 'District'], ['state', 'State'], ['pincode', 'PIN code'],
  ['father_name', "Father's name"], ['father_mobile', "Father's mobile"], ['mother_name', "Mother's name"], ['mother_mobile', "Mother's mobile"], ['guardian_name', 'Local guardian'], ['guardian_relation', 'Guardian relation'], ['guardian_mobile', "Guardian's mobile"],
  ['emergency_name', 'Emergency contact'], ['emergency_mobile', 'Emergency mobile'], ['medical_notes', 'Allergies or medicines']];
function HostelRecord({ id, canEdit }: { id: string; canEdit: boolean }) {
  const k = useApi<Kyc>(`/students/${id}/kyc`);
  const [edit, setEdit] = useState<Record<string, string> | null>(null);
  const { run, busy } = useAction();
  if (!k.data) return null;
  const d = k.data;
  const text = (key: string) => (typeof d[key] === 'string' ? (d[key] as string) : '');
  const save = () => run(async () => {
    const body: Record<string, string | null> = {};
    for (const [key] of KYC_FIELDS) { const v = (edit![key] ?? '').trim(); if (key === 'aadhaar_no' && (v === '' || v.startsWith('X'))) continue; body[key] = v || null; }
    await api(`/students/${id}/kyc`, { method: 'PUT', json: body }); await k.mutate(); setEdit(null);
  }, 'Residency record updated');
  return (
    <section className="box"><div className="box-head"><h2>Hostel record</h2>
      <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        {d.submitted_on ? <StatusChip status="Submitted" tone="success" label={`Submitted by the student · ${formatDate(d.submitted_on)}`} /> : <StatusChip status="Pending" label="Not submitted yet" />}
        {canEdit && !edit && <Button variant="secondary" onClick={() => setEdit(Object.fromEntries(KYC_FIELDS.map(([key]) => [key, text(key)])))}>Edit</Button>}
      </span></div>
      <div className="box-body">
        {!edit ? (<>
          <div className="facts">{KYC_FIELDS.map(([key, label]) => <div key={key}><span>{label}</span><b>{text(key) || '—'}</b></div>)}</div>
          {text('aadhaar_photo') && <a href={text('aadhaar_photo')} target="_blank" rel="noreferrer"><img src={text('aadhaar_photo')} alt="Aadhaar card" style={{ marginTop: 12, maxHeight: 220, borderRadius: 12, border: '1px solid var(--klh-line, #DCE5E4)' }} /></a>}
          {!canEdit && <p className="muted" style={{ marginTop: 10 }}>Only the Chief Manager changes this record. The Aadhaar number is shown in part.</p>}
        </>) : (<>
          <div className="facts" style={{ gap: 12 }}>{KYC_FIELDS.map(([key, label]) => <Field key={key} label={label}><Input value={edit[key] ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdit({ ...edit, [key]: e.target.value })} /></Field>)}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}><Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save</Button></div>
        </>)}
      </div></section>
  );
}
