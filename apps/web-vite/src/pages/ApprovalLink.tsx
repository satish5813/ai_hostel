import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Button, Notice, formatDateTime } from '@/lib/klh';
import { api, ApiError } from '@/lib/api';
import { words } from '@/lib/ui';

type Step = { level: number; approver_role: string; decision: string; decided_on: string | null; remarks: string | null; acted_by_name: string | null };
type View = {
  as: 'Parent' | 'Dean'; who: { name: string; relation: string } | null; state: 'open' | 'used' | 'decided' | 'expired'; expires_at: string;
  outpass: { outpass_no: string; student_id: string; full_name: string; programme: string | null; reason: string; destination: string; leave_from: string; return_by: string; outing_category: string; contact_during_leave: string; status: string; hostel_name: string | null; room_code: string | null };
  steps: Step[];
};
const ROLE: Record<string, string> = { Parent: 'Parent', Chief_Warden: 'Chief Manager', Dean_Students_Affairs: 'Dean, Students Affairs', Floor_Warden: 'Floor Manager' };
const DONE: Record<string, string> = { Recommended: 'recommended', Approved: 'approved', Rejected: 'refused', Pending: 'waiting' };

/**
 * The page behind a one-time link (decisions D2 and D3). A parent recommends an outing, or the Dean approves an outing
 * of a day or more, without an account. The link works once and only until it expires.
 */
export default function ApprovalLink() {
  const { token = '' } = useParams();
  const [v, setV] = useState<View | null | undefined>(undefined);
  const [problem, setProblem] = useState('');
  const [refuse, setRefuse] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<View>(`/links/${token}`).then(setV).catch(() => setV(null)); }, [token]);

  const act = async (decision: 'Approved' | 'Rejected') => {
    setBusy(true); setProblem('');
    try { setV(await api<View>(`/links/${token}`, { method: 'POST', json: { decision, remarks: remarks.trim() || undefined } })); setRefuse(false); }
    catch (e) { setProblem(e instanceof ApiError ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  if (v === undefined) return null;
  const o = v?.outpass;
  const parent = v?.as === 'Parent';
  const yes = parent ? 'Recommend' : 'Approve';
  const mine = v?.steps.find((s) => s.approver_role === (parent ? 'Parent' : 'Dean_Students_Affairs'));
  return (
    <div className="klh klh-comfortable" style={{ minHeight: '100vh', background: 'var(--surface-0)' }}>
      <div className="klh-hero" style={{ borderRadius: 0, padding: '24px 20px' }}>
        <p className="klh-hero-eyebrow">KL University Hostels · {parent ? 'outing request' : 'outing of a day or more'}</p>
        <h1 style={{ fontSize: 28, lineHeight: '36px', fontWeight: 800, margin: '4px 0 0', color: 'var(--hero-ink)' }}>{o ? `${o.full_name} wants to go out` : 'Link not recognised'}</h1>
        {v?.who && <p className="klh-hero-sub">For {v.who.name}{v.who.relation ? ` (${words(v.who.relation).toLowerCase()})` : ''}</p>}
      </div>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: 20 }} className="klh-stack">
        {!v || !o ? <p className="klh-muted">This link is not valid. Ask the student or the hostel office to send a new one.</p> : (
          <>
            <dl className="klh-dl">
              <dt>Student</dt><dd>{o.full_name} · {o.student_id}{o.programme ? ` · ${o.programme}` : ''}</dd>
              {o.hostel_name && <><dt>Hostel</dt><dd>{o.hostel_name}, room {o.room_code}</dd></>}
              <dt>Going to</dt><dd>{o.destination}</dd>
              <dt>Reason</dt><dd>{o.reason}</dd>
              <dt>Leaves</dt><dd>{formatDateTime(o.leave_from)}</dd>
              <dt>Back by</dt><dd>{formatDateTime(o.return_by)}</dd>
              <dt>Phone while away</dt><dd className="klh-num">{o.contact_during_leave}</dd>
            </dl>
            {v.steps.length > 0 && (
              <div><p className="klh-overline">Decisions so far</p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>{v.steps.map((s) => <li key={s.level}>{ROLE[s.approver_role] ?? words(s.approver_role)}: {DONE[s.decision] ?? words(s.decision).toLowerCase()}{s.acted_by_name ? ` (${s.acted_by_name})` : ''}{s.remarks ? `, “${s.remarks}”` : ''}</li>)}</ul>
              </div>)}
            {problem && <Notice tone="critical" title="Not saved">{problem}</Notice>}
            {v.state === 'open' ? (
              refuse ? (
                <div className="klh-stack" style={{ gap: 10 }}>
                  <label className="klh-overline" htmlFor="why">Why do you refuse?</label>
                  <textarea id="why" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} style={{ font: 'inherit', padding: 10, borderRadius: 10, border: '1px solid var(--ui-line)' }} />
                  <div className="klh-row" style={{ gap: 10 }}>
                    <Button variant="danger" loading={busy} blockedReason={remarks.trim() ? undefined : 'Write the reason first.'} onClick={() => act('Rejected')}>Refuse the outing</Button>
                    <Button variant="ghost" onClick={() => setRefuse(false)}>Back</Button>
                  </div>
                </div>
              ) : (
                <div className="klh-stack" style={{ gap: 10 }}>
                  <p style={{ margin: 0 }}>{parent ? 'Do you agree to this outing? The Chief Manager decides after you.' : 'The Chief Manager has approved. Your approval issues the gate pass.'}</p>
                  <div className="klh-row" style={{ gap: 10, flexWrap: 'wrap' }}>
                    <Button variant="primary" loading={busy} onClick={() => act('Approved')}>{yes} the outing</Button>
                    <Button variant="secondary" onClick={() => setRefuse(true)}>Refuse</Button>
                  </div>
                  <p className="klh-muted" style={{ fontSize: 13, margin: 0 }}>This link works once and expires {formatDateTime(v.expires_at)}.</p>
                </div>)
            ) : (
              <Notice tone={v.state === 'expired' ? 'warning' : 'success'} title={v.state === 'expired' ? 'This link has expired' : mine && mine.decision !== 'Pending' ? `You ${DONE[mine.decision] ?? 'answered'} this outing` : 'Already answered'}>
                {v.state === 'expired' ? 'Ask the hostel office to send a new link.' : `The request is now ${words(o.status).toLowerCase()}. You can close this page.`}
              </Notice>)}
          </>)}
      </div>
    </div>
  );
}
