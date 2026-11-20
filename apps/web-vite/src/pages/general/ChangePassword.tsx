import { useState } from 'react';
import { Button, Field, Input } from '@/lib/klh';
import { api, ApiError, getSession, setSession } from '@/lib/api';
import { toast } from '@/lib/ui';

/**
 * Change my password (POST /auth/change-password), shown on My profile for everyone who signs in with a password:
 * staff, managers and students. The server checks the current password; saving signs the person out everywhere,
 * so they sign in again with the new one.
 */
export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!getSession()?.token) return <p className="klh-muted" style={{ margin: 0 }}>This sign-in has no password to change.</p>;
  const rules: [string, boolean][] = [
    ['8 characters or more', pw.length >= 8],
    ['A letter and a digit', /[A-Za-z]/.test(pw) && /[0-9]/.test(pw)],
    ['Different from the current one', pw.length > 0 && pw !== cur],
    ['Both new boxes the same', pw.length > 0 && pw === again],
  ];
  const ok = cur.length > 0 && rules.every(([, v]) => v);
  const reset = () => { setOpen(false); setCur(''); setPw(''); setAgain(''); setErr(''); setShow(false); };
  const save = async () => {
    setBusy(true); setErr('');
    try {
      await api('/auth/change-password', { method: 'POST', json: { current: cur, next: pw } });
      toast('Password changed. Sign in again with your new password.');
      setTimeout(() => { setSession(null); location.href = '/'; }, 1800);
    } catch (e) {
      setErr(e instanceof ApiError ? (e.body as { issues?: { message: string }[] } | undefined)?.issues?.[0]?.message ?? e.message : String(e));
    } finally { setBusy(false); }
  };
  if (!open) return (
    <div className="klh-row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <span className="klh-muted">Choose a new password for your sign-in. Keep it private.</span>
      <Button variant="primary" size="sm" icon="lock" onClick={() => setOpen(true)}>Change password</Button>
    </div>);
  return (
    <form className="klh-stack" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); if (ok && !busy) save(); }}>
      {err && <p role="alert" style={{ margin: 0, color: '#B42318', fontSize: 14 }}>{err}</p>}
      <Field label="Current password"><Input type={show ? 'text' : 'password'} value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" autoFocus required /></Field>
      <Field label="New password"><Input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required /></Field>
      <Field label="Type the new password again"><Input type={show ? 'text' : 'password'} value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" required /></Field>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />Show passwords</label>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
        {rules.map(([t, v]) => <li key={t} style={{ fontSize: 13, color: v ? '#067647' : 'var(--ink-3, #667085)' }}>{v ? '✓' : '•'} {t}</li>)}
      </ul>
      <div className="klh-row" style={{ gap: 8 }}>
        <Button type="submit" variant="primary" loading={busy} disabled={!ok}>Save new password</Button>
        <Button variant="ghost" onClick={reset}>Cancel</Button>
      </div>
      <small className="klh-muted">After saving you are signed out on every device and sign in again with the new password.</small>
    </form>
  );
}
