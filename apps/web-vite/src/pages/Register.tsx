import { useEffect, useState } from 'react';
import { Icon } from '@/lib/klh';
import { api, ApiError, setSession } from '@/lib/api';
import { Logo } from '@/ui/kit';
import '@/styles/login.css';

const LINK: React.CSSProperties = { background: 'none', border: 0, padding: 0, font: 'inherit', color: 'var(--brand, #0B7A71)', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' };
const msg = (e: unknown) => (e instanceof ApiError ? (e.body as { issues?: { message: string }[] }).issues?.[0]?.message ?? e.message : String(e));

/**
 * A resident creates their own login (or resets a forgotten password): university ID -> 6-digit code e-mailed to
 * <id>@kluniversity.in -> new password -> signed in. Public; the app opens the same page.
 */
export default function Register() {
  const [id, setId] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [wait, setWait] = useState(0);
  useEffect(() => { setSession(null); }, []);
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

  const rules: [string, boolean][] = [['8 characters or more', pw.length >= 8], ['A letter and a digit', /[A-Za-z]/.test(pw) && /[0-9]/.test(pw)], ['Both boxes the same', pw.length > 0 && pw === again]];
  const ok = /^\d{6}$/.test(code) && rules.every(([, v]) => v);

  const send = async () => {
    setBusy(true); setErr('');
    try { const r = await api<{ sent_to: string }>('/auth/register/start', { method: 'POST', json: { id: id.trim() } }); setSentTo(r.sent_to); setWait(60); }
    catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };
  const finish = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api<{ id: string; role: string; name?: string; token: string }>('/auth/register/finish', { method: 'POST', json: { id: id.trim(), code, password: pw } });
      setSession({ id: r.id, role: r.role, name: r.name, token: r.token }); location.href = '/home';
    } catch (e) { setErr(msg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="login" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <section className="login-side" style={{ minHeight: '100vh' }}>
        <div className="login-card">
          <div style={{ marginBottom: 18 }}><Logo cut="full" height={44} /></div>
          {!sentTo ? (
            <form onSubmit={(e) => { e.preventDefault(); if (id.trim()) send(); }}>
              <div className="login-head"><span className="login-hello">Residents</span><h2>Create my login</h2>
                <p>Type your university ID. We e-mail a 6-digit code to your university mail (ID@kluniversity.in). Forgot your password? Do the same.</p></div>
              {err && <p className="login-error" role="alert">{err}</p>}
              <div className="login-field">
                <label className="login-label" htmlFor="rg-id">University ID</label>
                <div className="login-control"><Icon name="user" size={17} />
                  <input id="rg-id" className="login-input" value={id} onChange={(e) => setId(e.target.value.replace(/\s/g, ''))} inputMode="numeric" autoComplete="username" placeholder="e.g. 2600040012" autoFocus required /></div>
              </div>
              <button type="submit" className="login-submit" disabled={!id.trim() || busy}>{busy ? 'Sending…' : 'Send me a code'}<Icon name="arrow-right" size={17} /></button>
            </form>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (ok) finish(); }}>
              <div className="login-head"><span className="login-hello">Check your mail</span><h2>Enter the code</h2>
                <p>If <b>{id}</b> lives in a KL residency, a code has been sent to <b>{sentTo}</b>. It works for 10 minutes. Not there? Look in Junk or Spam.</p></div>
              {err && <p className="login-error" role="alert">{err}</p>}
              <div className="login-field">
                <label className="login-label" htmlFor="rg-code">6-digit code</label>
                <div className="login-control"><Icon name="lock" size={17} />
                  <input id="rg-code" className="login-input" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" autoFocus required /></div>
              </div>
              <div className="login-field">
                <label className="login-label" htmlFor="rg-pw">New password</label>
                <div className="login-control"><Icon name="lock" size={17} />
                  <input id="rg-pw" className="login-input login-input-pw" type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
                  <button type="button" className="login-eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}><Icon name="eye" size={16} /></button></div>
              </div>
              <div className="login-field">
                <label className="login-label" htmlFor="rg-again">Type it again</label>
                <div className="login-control"><Icon name="lock" size={17} />
                  <input id="rg-again" className="login-input" type={show ? 'text' : 'password'} value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" required /></div>
              </div>
              <ul style={{ listStyle: 'none', margin: '0 0 14px', padding: 0, display: 'grid', gap: 4 }}>
                {rules.map(([t, v]) => <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: v ? '#067647' : 'var(--ink-3)' }}><Icon name={v ? 'check' : 'clock'} size={14} />{t}</li>)}
              </ul>
              <button type="submit" className="login-submit" disabled={!ok || busy}>{busy ? 'Saving…' : 'Save password and sign in'}<Icon name="arrow-right" size={17} /></button>
              <p className="login-hint" style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 10px' }}>
                {wait > 0 ? `No code? You can ask again in ${wait} s.` : <button type="button" style={LINK} onClick={send} disabled={busy}>Send a new code</button>}
                <button type="button" style={LINK} onClick={() => { setSentTo(''); setCode(''); setErr(''); }}>Change ID</button>
              </p>
            </form>
          )}
          <p className="login-hint" style={{ marginTop: 14 }}><a href="/">← Back to sign in</a></p>
          <p className="login-foot"><Icon name="lock" size={13} />Nobody from the residency office will ask for your code or password.</p>
        </div>
      </section>
    </div>
  );
}
