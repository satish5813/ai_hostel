import { useEffect, useRef, useState } from 'react';
import { Button, Input, KioskPanel, Select } from '@/lib/klh';
import { api, setSession } from '@/lib/api';
import { titleCase, useAction, useApi } from '@/lib/ui';
import { Logo } from '@/ui/kit';

type Verify = { outpass_id: number; outpass_no: string; student_id: string; status: string; leave_from: string; return_by: string; destination: string; can_exit: boolean; can_enter: boolean; late_by_minutes: number | null; student: { full_name: string; programme: string } };
type Point = { point_id: number; point_name: string; point_type: string };

/** TRK-04 Gate scan: full-screen kiosk, one action per screen. Scan students in and out; manual entry when the scanner fails. */
export default function Gate() {
  const points = useApi<Point[]>('/capture-points');
  const [point, setPoint] = useState(0);
  const [token, setToken] = useState('');
  const [v, setV] = useState<Verify | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [studentId, setStudentId] = useState('');
  const { run, busy } = useAction();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, [v, manual]);
  useEffect(() => { if (points.data?.length && !point) setPoint(points.data.find((p) => p.point_type === 'Campus_Gate')?.point_id ?? points.data[0].point_id); }, [points.data, point]);
  const reset = () => { setV(null); setToken(''); setErr(null); setStudentId(''); setManual(false); };
  const record = (direction: 'In' | 'Out') => run(() => api('/movements', { method: 'POST', json: { point_id: point, direction, source: manual ? 'Manual' : 'Scan', ...(v ? { qr_token: token } : { student_id: studentId }) } }).then(reset), direction === 'Out' ? 'Marked out' : 'Marked in');
  const result: 'idle' | 'valid' | 'invalid' = !v ? 'idle' : v.can_exit || v.can_enter ? 'valid' : 'invalid';
  const now = Date.now();
  const reason = v && result === 'invalid' ? (v.status === 'Approved' && now < new Date(v.leave_from).getTime() - 2 * 3600e3 ? `Pass starts ${new Date(v.leave_from).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : v.status === 'Approved' ? `Pass ended ${new Date(v.return_by).toLocaleTimeString('en-IN', { timeStyle: 'short' })}` : `Pass is ${v.status.replace(/_/g, ' ').toLowerCase()}`) : undefined;

  return (
    <div className="klh" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, var(--hero), var(--hero-2))', padding: 'clamp(12px, 4vw, 24px)', boxSizing: 'border-box', maxWidth: '100vw', overflowX: 'hidden', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 16 }}>
      <div className="klh-row" style={{ justifyContent: 'space-between', color: 'var(--hero-ink)', flexWrap: 'wrap', gap: 12 }}>
        <span className="ui-brand" style={{ color: 'var(--hero-ink)' }}><Logo cut="mark" height={30} plate /><span className="ui-brand-name">Gate scan</span></span>
        <div className="klh-row" style={{ gap: 12, flexWrap: 'wrap', minWidth: 0, maxWidth: '100%' }}>
          <Select value={String(point)} onChange={(e) => setPoint(Number(e.target.value))} options={(points.data ?? []).map((p) => ({ value: String(p.point_id), label: p.point_name }))} />
          <Button variant="secondary" size="sm" icon="logout" onClick={() => { setSession(null); location.href = '/'; }}>Sign out</Button>
        </div>
      </div>
      <div style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 720 }}>
          <KioskPanel result={result} height={520}
            title={result === 'idle' ? (manual ? 'Manual entry' : 'Scan pass') : result === 'valid' ? (v!.can_exit ? 'VALID PASS' : 'WELCOME BACK') : v!.status === 'Approved' ? 'NOT YET VALID' : v!.status.replace(/_/g, ' ').toUpperCase()}
            reason={reason ?? (result === 'idle' ? (err ?? undefined) : undefined)}
            student={v ? { name: titleCase(v.student.full_name), id: v.student_id } : undefined}
            pass={v ? { no: v.outpass_no, from: v.leave_from, to: v.return_by } : undefined}
            lateBy={v?.late_by_minutes ?? undefined}
            actionLabel={result === 'idle' ? (manual ? 'Back to scan' : 'Manual entry') : result === 'valid' ? (v!.can_exit ? 'Mark Out' : 'Mark In') : 'Scan again'}
            onAction={() => { if (result === 'idle') setManual(!manual); else if (result === 'valid') record(v!.can_exit ? 'Out' : 'In'); else reset(); }}
            secondary={result === 'idle' ? (
              manual ? (
                <form className="klh-row" style={{ gap: 8, justifyContent: 'center' }} onSubmit={(e) => e.preventDefault()}>
                  <Input ref={ref} value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="University ID" style={{ width: 220 }} />
                  <Button variant="primary" loading={busy} blockedReason={!studentId ? 'Enter the ID.' : undefined} onClick={() => record('Out')}>Mark Out</Button>
                  <Button loading={busy} disabled={!studentId} onClick={() => record('In')}>Mark In</Button>
                </form>
              ) : (
                <form className="klh-row" style={{ gap: 8, justifyContent: 'center' }} onSubmit={(e) => { e.preventDefault(); setErr(null); api<Verify>(`/gate/verify?token=${encodeURIComponent(token)}`).then(setV).catch((x) => { setV(null); setErr(x.message); }); }}>
                  <Input ref={ref} value={token} onChange={(e) => setToken(e.target.value)} placeholder="Point the scanner at the QR" style={{ width: 320 }} autoFocus />
                  <Button type="submit" variant="primary" icon="qr" disabled={!token}>Check</Button>
                </form>)
            ) : result === 'valid' ? <Button variant="secondary" onClick={reset}>Cancel</Button> : undefined} />
        </div>
      </div>
      <p style={{ color: 'var(--hero-muted)', textAlign: 'center', fontSize: 13, margin: 0 }}>A student cannot be let out on a pass that is not approved. An exit without a valid pass raises a No-Pass-Exit alert to the Floor Manager. Every scan is recorded; the guard does not see why a pass was approved or refused.</p>
    </div>
  );
}
