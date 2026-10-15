import { useEffect, useState } from 'react';
import { Icon } from '@/lib/klh';
import { api, ApiError, setSession } from '@/lib/api';
import { Logo } from '@/ui/kit';
import '@/styles/login.css';

/** The page behind the one-time link in the invitation e-mail: the person chooses their own password. */
export default function SetPassword() {
  const token = new URLSearchParams(location.search).get('token') ?? '';
  const [who, setWho] = useState<{ username: string; kind: string; full_name: string | null } | null>(null);
  const [bad, setBad] = useState('');
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => { setSession(null); api<typeof who>(`/auth/invite/${encodeURIComponent(token)}`).then(setWho).catch((e) => setBad(e instanceof ApiError ? e.message : 'This link does not work.')); }, [token]);
  const rules: [string, boolean][] = [['8 characters or more', pw.length >= 8], ['A letter and a digit', /[A-Za-z]/.test(pw) && /[0-9]/.test(pw)], ['Both boxes the same', pw.length > 0 && pw === again]];
  const ok = rules.every(([, v]) => v);
  const save = async () => {
    setBusy(true); setErr('');
    try { await api('/auth/set-password', { method: 'POST', json: { token, password: pw } }); setDone(true); }
    catch (e) { setErr(e instanceof ApiError ? (e.body as { issues?: { message: string }[] }).issues?.[0]?.message ?? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <div className="login" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <section className="login-side" style={{ minHeight: '100vh' }}>
        <div className="login-card">
          <div style={{ marginBottom: 18 }}><Logo cut="full" height={44} /></div>
          {bad ? (<>
            <div className="login-head"><span className="login-hello">KL Residencies</span><h2>This link cannot be used</h2><p>{bad}</p></div>
            <a className="login-submit" href="/" style={{ textDecoration: 'none' }}>Go to sign in<Icon name="arrow-right" size={17} /></a>
          </>) : done ? (<>
            <div className="login-head"><span className="login-hello">All set</span><h2>Your password is saved</h2>
              <p>{who?.kind === 'student' ? `Open the KL Residencies app on your phone and sign in with ${who.username} and your new password. You can also use this portal.` : `Sign in with ${who?.username} and your new password.`}</p></div>
            <a className="login-submit" href="/" style={{ textDecoration: 'none' }}>Sign in<Icon name="arrow-right" size={17} /></a>
          </>) : !who ? <p className="login-hint">Checking your link…</p> : (
          <form onSubmit={(e) => { e.preventDefault(); if (ok) save(); }}>
            <div className="login-head"><span className="login-hello">Welcome{who.full_name ? `, ${who.full_name.split(' ')[0]}` : ''}</span><h2>Choose your password</h2><p>Your username is <b>{who.username}</b>. Nobody from the hostel office will ask for your password.</p></div>
            {err && <p className="login-error" role="alert">{err}</p>}
            <div className="login-field">
              <label className="login-label" htmlFor="sp-pw">New password</label>
              <div className="login-control"><Icon name="lock" size={17} />
                <input id="sp-pw" className="login-input login-input-pw" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus required />
                <button type="button" className="login-eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}><Icon name="eye" size={16} /></button></div>
            </div>
            <div className="login-field">
              <label className="login-label" htmlFor="sp-again">Type it again</label>
              <div className="login-control"><Icon name="lock" size={17} />
                <input id="sp-again" className="login-input" type={show ? 'text' : 'password'} value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" required /></div>
            </div>
            <ul style={{ listStyle: 'none', margin: '0 0 14px', padding: 0, display: 'grid', gap: 4 }}>
              {rules.map(([t, v]) => <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: v ? '#067647' : 'var(--ink-3)' }}><Icon name={v ? 'check' : 'clock'} size={14} />{t}</li>)}
            </ul>
            <button type="submit" className="login-submit" disabled={!ok || busy}>{busy ? 'Saving…' : 'Save my password'}<Icon name="arrow-right" size={17} /></button>
          </form>)}
          <p className="login-foot"><Icon name="lock" size={13} />This link works once. If it has expired, ask the residency office to send a new one.</p>
        </div>
      </section>
    </div>
  );
}
