import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { Icon } from '@/lib/klh';
import type { IconName } from '@/vendor/klh-types';
import { setSession } from '@/lib/api';
import { useApi, useSession } from '@/lib/ui';
import { api } from '@/lib/api';
import { Logo } from '@/ui/kit';
import '@/styles/login.css';

/** Where each login lands after signing in. */
const EXEC = ['President', 'Vice_President', 'Pro_VC', 'Pro_VC_Finance', 'Pro_VC_Academics', 'Vice_Chancellor'];
const landing = (role: string) => (role === 'Chief_Warden' ? '/overview' : role === 'Dean_Students_Affairs' ? '/dean' : EXEC.includes(role) ? '/exec' : '/home');
/** Photographs of the KL University hostels, supplied by the university (landscape crops for the hero). */
const PHOTOS: { src: string; title: string }[] = [
  { src: '/brand/hostel-1.jpg', title: 'The hostel block' },
  { src: '/brand/hostel-2.jpg', title: 'Courtyard in the evening' },
  { src: '/brand/hostel-3.jpg', title: 'Campus lawns' },
  { src: '/brand/hostel-4.jpg', title: 'Entrance at night' },
  { src: '/brand/hostel-5.jpg', title: 'From above' },
];
/** What the system covers, shown as chips on the hero. */
const COVERS: [IconName, string][] = [['bed', 'Rooms and allotment'], ['wallet', 'Fees and receipts'], ['door', 'Outings and gate'], ['utensils', 'Mess and menus'], ['settings', 'Repairs'], ['trend-up', 'Reports']];
const initials = (name: string) => name.split(/[\s,]+/).filter((w) => /^[A-Za-z]/.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
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
function SignInCard({ data }: { data: Demo }) {
  const demo = data.enabled;
  const [u, setU] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const signIn = async (username: string, password: string) => {
    setErr(''); setBusy(username);
    try {
      // a login made by the administrator first; the demo accounts answer when the demo is switched on
      type In = { id: string; role: string; name?: string; token?: string };
      let r: In;
      try { r = await api<In>('/auth/login', { method: 'POST', json: { username, password } }); }
      catch (e) { if (!demo) throw e; r = await api<In>('/auth/demo-login', { method: 'POST', json: { username, password } }); }
      setSession({ id: r.id, role: r.role, name: r.name, token: r.token }); location.href = landing(r.role);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not sign in'); setBusy(null); }
  };
  const groups = [...new Set(data.accounts.map((a) => a.group_name))];
  const [tab, setTab] = useState<'form' | 'demo'>('form');
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const shown = data.accounts.filter((a) => (!group || a.group_name === group) && (!q.trim() || `${a.display_name} ${a.username} ${a.description ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <div className="login-card">
      <div className="login-head"><span className="login-hello">Welcome back</span><h2>Sign in to KL Hostels</h2><p>Use your employee or university ID.</p></div>
      {demo && <div className="login-tabs" role="tablist" aria-label="How to sign in">
        <button type="button" role="tab" aria-selected={tab === 'form'} className="login-tab" onClick={() => setTab('form')}><Icon name="lock" size={15} />Sign in</button>
        <button type="button" role="tab" aria-selected={tab === 'demo'} className="login-tab" onClick={() => setTab('demo')}><Icon name="users" size={15} />Demo accounts<span className="login-count">{data.accounts.length}</span></button>
      </div>}
      {err && <p className="login-error" role="alert">{err}</p>}
      {tab === 'form' ? (
      <form onSubmit={(e) => { e.preventDefault(); signIn(u.trim(), pw); }}>
        <div className="login-field">
          <label className="login-label" htmlFor="login-user">Username</label>
          <div className="login-control"><Icon name="users" size={17} />
            <input id="login-user" className="login-input" value={u} onChange={(e) => setU(e.target.value)} placeholder="Employee or university ID" autoComplete="username" required /></div>
        </div>
        <div className="login-field">
          <label className="login-label" htmlFor="login-pw">Password</label>
          <div className="login-control"><Icon name="lock" size={17} />
            <input id="login-pw" className="login-input login-input-pw" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Your password" autoComplete="current-password" required />
            <button type="button" className="login-eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}><Icon name="eye" size={16} /></button></div>
        </div>
        <button type="submit" className="login-submit" disabled={!!busy}>{busy && busy === u.trim() ? 'Signing in…' : 'Sign in'}<Icon name="arrow-right" size={17} /></button>
        {demo ? <button type="button" className="login-link" onClick={() => setTab('demo')}>Trying the system? Pick a demo account<Icon name="arrow-right" size={14} /></button>
          : <p className="login-hint" style={{ marginTop: 14 }}>First time, or forgot your password? Use the link in the e-mail from the hostel office, or ask them to send a new one.</p>}
      </form>) : (
      <div className="login-demo">
        <div className="login-control"><Icon name="search" size={16} />
          <input className="login-input login-input-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a name, role or ID" aria-label="Search the demo accounts" /></div>
        <div className="login-chips" role="group" aria-label="Role group">
          <button type="button" className="login-chip" aria-pressed={!group} onClick={() => setGroup('')}>All</button>
          {groups.map((g) => <button key={g} type="button" className="login-chip" aria-pressed={group === g} onClick={() => setGroup(group === g ? '' : g)}>{g}</button>)}
        </div>
        <div className="login-demo-list">
          {shown.map((a) => (
            <button key={a.username} type="button" className="login-acct" data-hue={groups.indexOf(a.group_name) % 6} disabled={!!busy} title={a.description ?? undefined}
              onClick={() => { setU(a.username); if (data.password_hint) { setPw(data.password_hint); signIn(a.username, data.password_hint); } else setTab('form'); }}>
              <span className="login-av" aria-hidden="true">{busy === a.username ? '…' : initials(a.display_name)}</span>
              <span className="login-acct-tx"><b>{a.display_name}</b><small>{a.description ?? a.group_name}</small></span>
              <code>{a.username}</code>
            </button>))}
          {shown.length === 0 && <p className="login-empty">No demo account matches.</p>}
        </div>
        {data.password_hint && <p className="login-hint">One click signs you in. Password for all: <code>{data.password_hint}</code></p>}
      </div>)}
      <p className="login-foot"><Icon name="lock" size={13} />{demo ? 'Demo accounts are for training. Your own login comes by e-mail from the hostel office.' : 'Nobody from the hostel office will ask for your password.'}</p>
    </div>
  );
}

/** Sign-in: username and password. With the demo switched on, the demo accounts are one click away in a second tab. */
export default function SignIn() {
  const s = useSession();
  const [photo, setPhoto] = useState(0);
  const still = useMedia('(prefers-reduced-motion: reduce)');
  const demo = useApi<Demo>('/auth/demo-accounts');
  // the photographs change by themselves
  useEffect(() => {
    if (still) return;
    const t = window.setInterval(() => setPhoto((p) => (p + 1) % PHOTOS.length), 5200);
    return () => window.clearInterval(t);
  }, [still]);
  if (s) return <Navigate to={landing(s.role)} replace />;

  return (
    <div className="login">
      <section className="login-hero" aria-label="KL University hostels">
        {PHOTOS.map((p, n) => <img key={p.src} src={p.src} alt="" className="login-photo" data-on={n === photo} />)}
        <span className="login-shade" aria-hidden="true" />
        <div className="login-hero-top">
          <span className="login-logo"><Logo cut="full" height={44} /></span>
          <span className="login-place"><Icon name="pin" size={13} />{PHOTOS[photo].title}</span>
        </div>
        <div className="login-copy">
          <p className="login-kicker">Hostel Management System</p>
          <h1>Every room, every hostel student, <b>one place to look.</b></h1>
          <ul className="login-covers">{COVERS.map(([icon, label]) => <li key={label}><Icon name={icon} size={14} />{label}</li>)}</ul>
          <div className="login-dots" role="group" aria-label="Photographs">
            {PHOTOS.map((p, n) => <button key={p.src} type="button" aria-label={p.title} aria-pressed={n === photo} onClick={() => setPhoto(n)} />)}
          </div>
        </div>
      </section>

      <section className="login-side">
        <SignInCard data={demo.data ?? { enabled: false, accounts: [] }} />
      </section>
    </div>
  );
}
