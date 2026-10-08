import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, DoorOpen, Lock } from 'lucide-react';
import { Button, Field, Input, Textarea, formatDateTime } from '@/lib/klh';
import { api } from '@/lib/api';
import { titleCase, useAction, words } from '@/lib/ui';
import { Done, Sheet } from './Sheet';

export type Step = { level: number; role: string; decision: string; by?: string; on?: string; remarks?: string };
export type Pass = { outpass_id: number; outpass_no: string; student_id: string; full_name: string; reason: string; destination: string; leave_from: string; return_by: string; status: string; steps: Step[] };
export const LIVE_PASS = ['Approved', 'Out', 'Overdue'];
export const PENDING_PASS = ['Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved'];

/* ---------------------------------------------------------------- outing */

/**
 * Outing: Ask permission always opens the request form. One outing is allowed at a time, so when a pass or a request is
 * already open the form says which one, offers to cancel or withdraw it, and stays locked until then.
 */
export function OutingSheet({ ask, live, pending, room, onClose, onDone, onShow }: { ask: boolean; live?: Pass; pending?: Pass; room?: string; onClose: () => void; onDone: () => void; onShow: () => void }) {
  const [f, setF] = useState({ destination: '', reason: '', leave_from: '', return_by: '', contact_during_leave: '' });
  const [qr, setQr] = useState('');
  const [sent, setSent] = useState(false);
  const { run, busy } = useAction();
  useEffect(() => { if (live) api<{ png_data_url: string }>(`/outpasses/${live.outpass_id}/qr`).then((r) => setQr(r.png_data_url)).catch(() => setQr('')); }, [live]);
  const bad = !!(f.leave_from && f.return_by && new Date(f.return_by) <= new Date(f.leave_from));
  const sameDay = f.leave_from && f.return_by && new Date(f.leave_from).toDateString() === new Date(f.return_by).toDateString();
  const missing = f.reason.trim().length < 3 ? 'Write the reason.' : !f.destination ? 'Where are you going?' : !f.leave_from || !f.return_by ? 'Set both times.' : bad ? 'Return must be after leaving.' : !f.contact_during_leave ? 'Give a phone number.' : undefined;
  const apply = () => run(() => api('/outpasses', { method: 'POST', json: { ...f, leave_from: new Date(f.leave_from).toISOString(), return_by: new Date(f.return_by).toISOString() } }).then(() => { setSent(true); onDone(); }), '');
  const cancel = (o: Pass) => run(() => api(`/outpasses/${o.outpass_id}/cancel`, { method: 'POST' }).then(() => { onDone(); onClose(); }), 'Outing cancelled');
  const existing = live ?? pending;
  const outNow = !!live && live.status !== 'Approved';
  const clear = (o: Pass) => run(() => api(`/outpasses/${o.outpass_id}/cancel`, { method: 'POST' }).then(onDone), o === live ? 'Pass cancelled. You can ask again now.' : 'Request withdrawn. You can ask again now.');

  if (!ask && live) return (
    <Sheet mod="violet" icon={DoorOpen} title="Your gate pass" sub={`${live.outpass_no} · ${words(live.status)}`} onClose={onClose}
      footer={live.status === 'Approved' ? <Button variant="secondary" loading={busy} onClick={() => cancel(live)}>Cancel this pass</Button> : undefined}>
      <div className="st-stack st-center">
        {qr ? <img src={qr} alt={`QR code of ${live.outpass_no}`} className="st-qr" /> : <div className="st-qr st-skel" />}
        <p className="st-note">Show this code at the campus gate going out and coming back.</p>
        {/* the kit's PassCard draws a placeholder QR from the pass number, which a guard could scan by mistake: plain details only */}
        <div className="st-facts st-pass">
          <span><small>Student</small><b>{titleCase(live.full_name)}</b><small>{live.student_id}{room ? ` · ${room}` : ''}</small></span>
          <span><small>Going to</small><b>{live.destination}</b><small>{live.reason}</small></span>
          <span><small>Leave · back by</small><b>{formatDateTime(live.leave_from)}</b><small>{formatDateTime(live.return_by)}</small></span>
        </div>
        <p className="st-note"><CalendarClock size={14} />{live.status === 'Approved'
          ? 'You can have one outing at a time. To ask for a different one, cancel this pass first; once you are back, Ask permission appears again.'
          : 'You can ask for your next outing once you are back and scanned in at the gate.'}</p>
      </div>
    </Sheet>);
  if (!ask && pending) {
    const parent = pending.steps.find((x) => x.level === 0);
    const warden = pending.steps.find((x) => x.role === 'Chief_Warden');
    const dean = pending.steps.find((x) => x.role === 'Dean_Students_Affairs' && x.decision !== 'Skipped');
    const flow: { label: string; state: 'done' | 'now' | 'next' | 'lock'; who?: string }[] = [
      { label: 'Request sent', state: 'done' },
      { label: 'Parent recommends', state: parent && parent.decision !== 'Pending' ? 'done' : 'now', who: parent?.by },
      { label: 'Warden approves', state: warden && warden.decision === 'Approved' ? 'done' : parent && parent.decision !== 'Pending' ? 'now' : 'next', who: warden?.by },
      ...(dean ? [{ label: 'Dean approves', state: (dean.decision === 'Approved' ? 'done' : warden?.decision === 'Approved' ? 'now' : 'next') as 'done' | 'now' | 'next' }] : []),
      { label: 'QR gate pass', state: 'lock' },
    ];
    return (
      <Sheet mod="violet" icon={DoorOpen} title="Permission requested" sub={`${pending.outpass_no} · waiting for approval`} onClose={onClose}
        footer={<Button variant="secondary" loading={busy} onClick={() => cancel(pending)}>Withdraw request</Button>}>
        <div className="st-stack">
          <ol className="st-flow">{flow.map((x, i) => (
            <li key={x.label} className={`st-flow-${x.state}`}><span>{x.state === 'done' ? <CheckCircle2 size={15} /> : x.state === 'lock' ? <Lock size={13} /> : i + 1}</span><b>{x.label}</b>{x.who && <small>{x.who}</small>}</li>))}</ol>
          <div className="st-lock"><Lock size={22} /><b>No gate pass yet</b><small>Your QR gate pass is made only when the warden approves. It will appear here and on the Outing card.</small></div>
          <div className="st-facts st-pass">
            <span><small>Reason</small><b>{pending.reason}</b></span>
            <span><small>Going to</small><b>{pending.destination}</b></span>
            <span><small>Leave · back by</small><b>{formatDateTime(pending.leave_from)}</b><small>{formatDateTime(pending.return_by)}</small></span>
          </div>
        </div>
      </Sheet>);
  }
  return (
    <Sheet mod="violet" icon={DoorOpen} title="Ask for outing permission" sub="Write why you need to go. The QR gate pass is made only after the warden approves." onClose={onClose}
      footer={sent ? undefined : <Button variant="primary" loading={busy} blockedReason={existing ? `Finish with ${existing.outpass_no} first.` : missing} onClick={apply}>Submit request</Button>}>
      {sent ? <Done title="Request submitted" body="There is no gate pass yet. Your parent gets a link to recommend it, then the warden decides. Your QR gate pass appears on the Outing card once it is approved." onClose={onClose} /> : (
        <div className="st-stack">
          {existing && (
            <div className="st-open">
              <span className="st-open-tx">
                <b>{outNow ? `You are out on ${existing.outpass_no}` : live ? `${existing.outpass_no} is approved` : `${existing.outpass_no} is waiting for approval`}</b>
                <small>{existing.destination} · {formatDateTime(existing.leave_from)} to {formatDateTime(existing.return_by)}. {outNow
                  ? 'Scan in at the gate when you are back, then you can ask for the next outing.'
                  : 'You can have one outing at a time. Cancel it to ask for a different one.'}</small>
              </span>
              <span className="st-open-acts">
                <Button size="sm" variant="secondary" onClick={onShow}>{live ? 'Show pass' : 'See status'}</Button>
                {!outNow && <Button size="sm" variant="secondary" loading={busy} onClick={() => clear(existing)}>{live ? 'Cancel pass' : 'Withdraw'}</Button>}
              </span>
            </div>)}
          <ol className="st-flow st-flow-mini">{['Your request', 'Parent recommends', 'Warden approves', 'QR gate pass'].map((l, i) => <li key={l} className={i === 0 ? 'st-flow-now' : i === 3 ? 'st-flow-lock' : 'st-flow-next'}><span>{i === 3 ? <Lock size={13} /> : i + 1}</span><b>{l}</b></li>)}</ol>
          <Field label="Why do you need to go out?" required><Textarea rows={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="For example: sister's wedding, bank work, hospital visit" /></Field>
          <Field label="Going to" required><Input value={f.destination} onChange={(e) => setF({ ...f, destination: e.target.value })} placeholder="Vijayawada" /></Field>
          <div className="st-grid2">
            <Field label="Leaving" required><Input type="datetime-local" value={f.leave_from} onChange={(e) => setF({ ...f, leave_from: e.target.value })} /></Field>
            <Field label="Back by" required error={bad ? 'Must be after leaving.' : undefined}><Input type="datetime-local" value={f.return_by} onChange={(e) => setF({ ...f, return_by: e.target.value })} /></Field>
          </div>
          <Field label="Phone while away" required><Input value={f.contact_during_leave} onChange={(e) => setF({ ...f, contact_during_leave: e.target.value })} placeholder="98480 12345" inputMode="tel" /></Field>
          {f.leave_from && f.return_by && !bad && <p className="st-note"><CalendarClock size={14} />{sameDay ? 'Same-day outing: your parent recommends, the warden approves.' : 'A day or more: your parent recommends, the warden approves, then the Dean, Students Affairs.'}</p>}
        </div>)}
    </Sheet>
  );
}
