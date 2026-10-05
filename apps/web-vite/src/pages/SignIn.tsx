import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { Icon } from '@/lib/klh';
import { setSession } from '@/lib/api';
import { useApi, useSession } from '@/lib/ui';
import { api } from '@/lib/api';
import { ROLES } from '@/app/screens';
import { Logo } from '@/ui/kit';
import { PerspectiveCarousel, type PerspectiveCarouselItem } from '@/components/ui/perspective-carousel';
import '@/styles/login.css';

/** The five logins of this release. Parents act through one-time links; the Dean, Students Affairs has a login for the reports. */
const LOGINS: { code: string; label: string }[] = [
  { code: 'ADM', label: 'Administrator' }, { code: 'CW', label: 'Chief Warden' }, { code: 'OFF', label: 'Room Allotment' }, { code: 'DSA', label: 'Dean, Students Affairs' }, { code: 'STU', label: 'Student' },
];
/** Where each login lands after signing in. */
const EXEC = ['President', 'Vice_President', 'Pro_VC', 'Pro_VC_Finance', 'Pro_VC_Academics', 'Vice_Chancellor'];
const landing = (role: string) => (role === 'Chief_Warden' ? '/overview' : role === 'Dean_Students_Affairs' ? '/dean' : EXEC.includes(role) ? '/exec' : '/home');
/** Photographs of the KL University hostels, supplied by the university (portrait crops). */
const PHOTOS: PerspectiveCarouselItem[] = [
  { src: '/brand/hostel-2p.jpg', title: 'Courtyard in the evening', alt: 'Residents sitting on stone benches in the hostel courtyard at dusk' },
  { src: '/brand/hostel-3p.jpg', title: 'Campus lawns', alt: 'Students sitting under palm trees on the lawn beside the hostel' },
  { src: '/brand/hostel-1p.jpg', title: 'The hostel block', alt: 'A tall white hostel block with teal balconies, seen from the entrance road' },
  { src: '/brand/hostel-4p.jpg', title: 'Entrance at night', alt: 'The lit hostel entrance with planters and steps at night' },
  { src: '/brand/hostel-5p.jpg', title: 'From above', alt: 'Aerial view of the hostel building and the fields around it' },
];
function useMedia(query: string) {
  const [on, setOn] = useState(() => window.matchMedia(query).matches);
  useEffect(() => { const m = window.matchMedia(query); const f = () => setOn(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, [query]);
  return on;
}

type Account = { username: string; role_code: string; display_name: string; description: string | null; group_name: string };
type Demo = { enabled: boolean; password_hint?: string | null; accounts: Account[] };

/**
 * Demo sign-in (training): username and password, checked by the API against the demo accounts. Each demo account is
 * listed under the form; a click fills it in and signs in.
 */
function DemoSignIn({ data }: { data: Demo }) {
  const [u, setU] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const signIn = async (username: string, password: string) => {
    setErr(''); setBusy(username);
    try {
      const r = await api<{ id: string; role: string }>('/auth/demo-login', { method: 'POST', json: { username, password } });
      setSession({ id: r.id, role: r.role }); location.href = landing(r.role);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not sign in'); setBusy(null); }
  };
  const groups = [...new Set(data.accounts.map((a) => a.group_name))];
  return (
    <div className="login-card login-card-demo">
      <div className="login-logo"><Logo cut="full" height={58} /></div>
      <div className="login-head"><h2>Welcome back</h2><p>Sign in to the hostel system.</p></div>
      <form onSubmit={(e) => { e.preventDefault(); signIn(u.trim(), pw); }}>
        <div className="login-field">
          <label className="login-label" htmlFor="login-user">Username</label>
          <div className="login-control"><Icon name="users" size={17} />
            <input id="login-user" className="login-input" value={u} onChange={(e) => setU(e.target.value)} placeholder="Employee or university ID" autoComplete="username" required /></div>
        </div>
        <div className="login-field">
          <label className="login-label" htmlFor="login-pw">Password</label>
          <div className="login-control"><Icon name="lock" size={17} />
            <input id="login-pw" className="login-input login-input-pw" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
            <button type="button" className="login-eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}><Icon name="eye" size={16} /></button></div>
        </div>
        {err && <p className="login-error" role="alert">{err}</p>}
        <button type="submit" className="login-submit" disabled={!!busy}>{busy && busy === u.trim() ? 'Signing in…' : 'Sign in'}<Icon name="arrow-right" size={17} /></button>
      </form>
      <div className="login-demo">
        <div className="login-demo-head"><span>Demo accounts</span>{data.password_hint && <small>Password for all: <code>{data.password_hint}</code></small>}</div>
        <p className="login-demo-sub">Click an account to sign in as that person.</p>
        <div className="login-demo-list">
        {groups.map((g) => (
          <div key={g} className="login-demo-group">
            <span className="login-demo-g">{g}</span>
            {data.accounts.filter((a) => a.group_name === g).map((a) => (
              <button key={a.username} type="button" className="login-acct" disabled={!!busy} title={a.description ?? undefined}
                onClick={() => { setU(a.username); if (data.password_hint) { setPw(data.password_hint); signIn(a.username, data.password_hint); } }}>
                <span className="login-acct-tx"><b>{a.display_name}</b><small>{a.description}</small></span>
                <code>{busy === a.username ? '…' : a.username}</code>
              </button>))}
          </div>))}
        </div>
      </div>
      <p className="login-foot"><Icon name="lock" size={13} />Demo accounts are for training. The live system signs you in with your KL University account.</p>
    </div>
  );
}

/** Development sign-in without demo accounts: one of the five logins and an ID from the fixtures. Production uses KL University single sign-on. */
export default function SignIn() {
  const s = useSession();
  const [code, setCode] = useState('ADM');
  const def = ROLES.find((r) => r.code === code)!;
  const [id, setId] = useState(def.sample);
  const [photo, setPhoto] = useState(2);   // open on the hostel block, with photos either side
  const [paused, setPaused] = useState(false);
  const small = useMedia('(max-width: 900px)');
  const still = useMedia('(prefers-reduced-motion: reduce)');
  const demo = useApi<Demo>('/auth/demo-accounts');
  // the photos turn by themselves, and wait while someone is looking at or using them
  useEffect(() => {
    if (paused || still) return;
    const t = window.setInterval(() => setPhoto((p) => (p + 1) % PHOTOS.length), 4200);
    return () => window.clearInterval(t);
  }, [paused, still]);
  if (s) return <Navigate to={landing(s.role)} replace />;
  const pick = (c: string) => { setCode(c); setId(ROLES.find((r) => r.code === c)!.sample); };
  const idLabel = code === 'STU' ? 'University ID' : 'Employee ID';

  return (
    <div className="login">
      <span className="login-orb login-orb-c" aria-hidden="true" />
      <span className="login-orb login-orb-a" aria-hidden="true" />
      <span className="login-orb login-orb-b" aria-hidden="true" />

      <section className="login-left">
        <div className="login-copy">
          <p className="login-kicker">Hostel Management System</p>
          <h1>Every room, every resident, <b>one place to look.</b></h1>
        </div>
        <div className="login-carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
          <PerspectiveCarousel items={PHOTOS} loop activeIndex={photo} onActiveIndexChange={setPhoto} aria-label="Photographs of the KL University hostels"
            slideWidth={small ? 150 : 236} rotationStep={small ? 34 : 40} inactiveScale={0.84} showControls={!small}
            labelClassName="login-photo-label" imageClassName="login-photo" controlsClassName="login-photo-controls" />
        </div>
      </section>

      {demo.data?.enabled ? <DemoSignIn data={demo.data} /> : (
      <form className="login-card" onSubmit={(e) => { e.preventDefault(); const role = def.roles[0]; setSession({ id: id.trim(), role }); location.href = landing(role); }}>
        <div className="login-logo"><Logo cut="full" height={58} /></div>
        <div className="login-head">
          <h2>Welcome back</h2>
          <p>Sign in to the hostel system.</p>
        </div>

        <div className="login-field">
          <label className="login-label" htmlFor="login-role">I am</label>
          <div className="login-control">
            <span className="login-badge" aria-hidden="true">{def.code}</span>
            <select id="login-role" className="login-input login-input-role" value={code} onChange={(e) => pick(e.target.value)}>
              {LOGINS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>

        <div className="login-field">
          <label className="login-label" htmlFor="login-id">{idLabel}</label>
          <div className="login-control">
            <Icon name="key" size={17} />
            <input id="login-id" className="login-input" value={id} onChange={(e) => setId(e.target.value)} placeholder={idLabel} autoComplete="username" required />
          </div>
        </div>

        <p className="login-scope" title={def.scope}><Icon name="eye" size={14} /><span>Sees {def.scope.charAt(0).toLowerCase() + def.scope.slice(1)}</span></p>

        <button type="submit" className="login-submit">Continue<Icon name="arrow-right" size={17} /></button>

        <p className="login-foot"><Icon name="lock" size={13} />The live system signs you in with your KL University account.</p>
      </form>)}
    </div>
  );
}
