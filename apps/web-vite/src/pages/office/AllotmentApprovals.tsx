import { useEffect, useState } from 'react';
import { BadgeCheck, BedDouble, Check, CircleCheck, ClipboardCheck, Clock, Info, KeyRound, Lock, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { toast, useAction, useApi, useSession, words } from '@/lib/ui';
import { Chip, HostelPills, RaHead, avc, ini, proper, rs, useHostel } from './ra-kit';

type Fee = { head: string; inst: number; due: number; paid: number; due_date: string; status: string; receipt: string | null; paid_on: string | null };
type Card = { registration_id: number; registration_no: string; student_id: string; full_name: string; programme: string; type_name: string; hostel_code: string; hostel_name: string;
  subspace_id: string | null; room_code: string | null; floor_no: number | null; hold_until: string | null; status: string; fee_check_status: string; fee_check_remarks: string | null; fee_checked_on: string | null; fee_checked_by: string | null;
  cw_status: string; cw_on: string | null; cw_by: string | null; applied_on: string; stage: 'fee' | 'verify' | 'approve' | 'allotted'; last_paid: string | null; fees: Fee[] };
const COLS: { k: Card['stage']; title: string; sub: string; icon: LucideIcon; grad: string; glow: string }[] = [
  { k: 'fee', title: 'Awaiting payment', sub: 'Student pays hostel and rasoi fees', icon: Wallet, grad: 'linear-gradient(135deg,#C2410C,#9A3412)', glow: 'rgba(194,65,12,.7)' },
  { k: 'verify', title: 'Room Allotment verifies fees', sub: 'L1 · Room Allotment', icon: ClipboardCheck, grad: 'linear-gradient(135deg,#7048E8,#5932D1)', glow: 'rgba(112,72,232,.7)' },
  { k: 'approve', title: 'Chief Manager approves', sub: 'L2 · Chief Manager', icon: ShieldCheck, grad: 'linear-gradient(135deg,#0B7A71,#0A5F6E)', glow: 'rgba(11,122,113,.7)' },
  { k: 'allotted', title: 'Allotted', sub: 'Ready for the key', icon: KeyRound, grad: 'linear-gradient(135deg,#4263EB,#364FC7)', glow: 'rgba(66,99,235,.7)' },
];
type Proof = { proof_id: number; proof_no: string; amount: number; paid_on: string; reference: string | null; status: string; photo: string; mime: string; ocr_status: string;
  ocr_checks: { check: string; ok: boolean | null }[] | null; demands: { fee_head: string }[]; steps: { step_id: number; level: number; approver_role: string; decision: string | null; decided_on: string | null; acted_by_name: string | null }[] };
type Tone = 'ok' | 'warn' | 'crit' | 'info' | 'neu';
const PROOF_ST: Record<string, { label: string; tone: Tone }> = { Uploaded: { label: 'With the Floor Manager', tone: 'warn' }, Checked: { label: 'With the Chief Manager', tone: 'info' }, Approved: { label: 'Approved', tone: 'ok' }, Rejected: { label: 'Not accepted', tone: 'crit' } };
const OCR_ST: Record<string, { label: string; tone: Tone }> = { Pending: { label: 'Being read', tone: 'neu' }, Matched: { label: 'Receipt matches', tone: 'ok' }, Mismatch: { label: 'Check by eye', tone: 'warn' }, Unreadable: { label: 'Could not read', tone: 'neu' } };
const L1 = ['Room_Allotment', 'Office_Staff', 'Warden', 'Assistant_Warden', 'Hostel_Incharge', 'Chief_Warden', 'Director_Hostels'];
const L2 = ['Chief_Warden', 'Director_Hostels'];
const when = (d?: string | null) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Not yet');
const dueOf = (c: Card) => c.fees.reduce((a, f) => a + Math.max(0, f.due - f.paid), 0);
const headLabel = (f: Fee) => (f.head === 'Hostel' ? `Residency fee · instalment ${f.inst}` : `${f.head} fee`);

/**
 * Allotment approvals (design "Room Allotment", steps 5 and 6). The student pays first; Room Allotment checks every receipt
 * against Accounts (L1); the Chief Manager confirms the bed (L2). Either level can return it to the student with remarks.
 */
export default function AllotmentApprovals() {
  const s = useSession()!;
  const H = useHostel();
  const list = useApi<Card[]>(`/allotment/approvals${H.id ? `?facility_id=${H.id}` : ''}`);
  const [sel, setSel] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [returning, setReturning] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [view, setView] = useState<Proof | null>(null); // the receipt opened full size for verification
  const { run: act, busy } = useAction();
  const run = (fn: () => Promise<unknown>) => act(fn, '');
  const cards = list.data ?? [];
  const c = cards.find((x) => x.registration_id === sel) ?? cards.find((x) => x.stage === 'verify') ?? cards[0];
  const proofs = useApi<Proof[]>(c ? `/students/${c.student_id}/payment-proofs` : null);
  useEffect(() => { setChecked(false); setReturning(false); setRemarks(''); }, [c?.registration_id]);
  const refresh = () => Promise.all([list.mutate(), H.reload()]);
  const canL1 = L1.includes(s.role), canL2 = L2.includes(s.role);

  // a receipt waiting at the signed-in warden's level: approve or return it from here (same step as the Approvals page)
  const decideProof = (p: Proof, decision: 'Approved' | 'Rejected') => run(async () => {
    const step = p.steps.find((x) => !x.decision || x.decision === 'Pending'); if (!step) return;
    const why = decision === 'Rejected' ? window.prompt('Why is the receipt not accepted? The student sees this.') : undefined; if (decision === 'Rejected' && !why?.trim()) return;
    await api(`/approvals/${step.step_id}/decide`, { method: 'POST', json: { decision, remarks: why?.trim() } }); await Promise.all([proofs.mutate(), refresh()]);
    toast(`Receipt ${p.proof_no} ${decision === 'Approved' ? 'approved' : 'returned'}${decision === 'Approved' && step.level === 2 ? '. Receipts issued; the fees show as paid.' : ''}`); });
  const canDecide = (p: Proof) => { const step = p.steps.find((x) => !x.decision || x.decision === 'Pending'); return !!step && (s.role === step.approver_role || (step.level === 2 && L2.includes(s.role))); }; // the database holds L1 to a Floor Manager of the hostel
  const verify = () => run(async () => { await api(`/registrations/${c!.registration_id}/fee-check`, { method: 'POST', json: { decision: 'Verified' } }); await refresh(); toast(`Fees verified for ${proper(c!.full_name)}. Sent to the Chief Manager.`); });
  const approve = () => run(async () => { await api(`/registrations/${c!.registration_id}/cw-decision`, { method: 'POST', json: { decision: 'Approved' } }); await refresh(); toast(`Bed ${c!.room_code ?? ''} approved for ${proper(c!.full_name)}. The office can check the student in.`); });
  const doReturn = () => run(async () => {
    if (c!.stage === 'approve') await api(`/registrations/${c!.registration_id}/cw-decision`, { method: 'POST', json: { decision: 'Returned', remarks } });
    else await api(`/registrations/${c!.registration_id}/fee-check`, { method: 'POST', json: { decision: 'Query', remarks } });
    setReturning(false); await refresh(); toast(`Returned to ${proper(c!.full_name)} with your remarks.`);
  });
  const paidAll = c ? c.fees.every((f) => f.paid >= f.due) : false;

  return (
    <div className="ra-split ra-split-narrow">
      <main className="ra-main">
        <RaHead eyebrow="Room Allotment and Chief Manager · Steps 5 and 6" tone="#5F3DC4" title="Allotment approvals" sub="The student pays first. Room Allotment checks the receipts, then the Chief Manager confirms the bed."
          right={<HostelPills list={H.list} value={H.id} onPick={H.pick} />} />
        <div className="ra-board-wrap"><div className="ra-board">
          {COLS.map((col) => { const items = cards.filter((x) => x.stage === col.k); const I = col.icon;
            return (
              <div key={col.k} className="ra-col">
                <div className="ra-col-head"><span style={{ background: col.grad, boxShadow: `0 8px 16px -8px ${col.glow}` }}><I size={17} /></span><div><b>{col.title}</b><small>{col.sub}</small></div><em>{items.length}</em></div>
                {items.map((x) => { const a = avc(x.full_name); const on = c?.registration_id === x.registration_id; const ret = x.fee_check_status === 'Query';
                  return (
                    <button key={x.registration_id} type="button" aria-pressed={on} className={`ra-card${on ? ' ra-card-on' : ''}`} onClick={() => setSel(x.registration_id)}>
                      <span className="ra-card-who"><span className="ra-av ra-av-lg" style={{ background: a[0], color: a[1] }}>{ini(x.full_name)}</span><span><b>{proper(x.full_name)}</b><small className="ra-mono">{x.student_id}</small></span></span>
                      <span className="ra-card-bed"><span className="ra-mono ra-bedtag">{x.room_code ? `${x.hostel_code}-${x.room_code}` : 'No bed yet'}</span><small>{x.type_name}</small></span>
                      <span className="ra-card-amt"><b>{rs(x.fees.reduce((t, f) => t + f.due, 0))}</b>{ret ? <Chip tone="crit">Returned</Chip> : x.stage === 'fee' ? <Chip tone="warn">Due</Chip> : <Chip tone="ok">Paid</Chip>}</span>
                      <small className="ra-card-time">{x.stage === 'allotted' ? `Approved ${when(x.cw_on)}` : x.stage === 'approve' ? `Verified ${when(x.fee_checked_on)}` : x.last_paid && x.stage === 'verify' ? `Paid ${when(x.last_paid)}` : `Applied ${when(x.applied_on)}`}</small>
                    </button>); })}
                {!items.length && <div className="ra-col-empty">Nothing here</div>}
              </div>); })}
        </div></div>
      </main>

      <aside className="ra-aside">
        {view && <div role="dialog" aria-label="Receipt" onClick={() => setView(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(16,24,40,.78)', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 16, maxWidth: 'min(960px, 96vw)', maxHeight: '94vh', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><b style={{ flex: 1 }}>{rs(view.amount)} · {view.proof_no} · {proper(c?.full_name ?? '')}{view.reference ? ` · ${view.reference}` : ''}</b>
              <a href={view.photo} target="_blank" rel="noreferrer" className="ra-outline" style={{ textDecoration: 'none' }}>Open in a new tab</a><button type="button" className="ra-outline" onClick={() => setView(null)}>Close</button></div>
            {view.mime === 'application/pdf' ? <iframe title="Receipt PDF" src={view.photo} style={{ width: 'min(900px, 92vw)', height: '78vh', border: '1px solid var(--ax-bd2)', borderRadius: 12 }} />
              : <img src={view.photo} alt="Receipt" style={{ maxWidth: '92vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 12, border: '1px solid var(--ax-bd2)' }} />}
            {view.ocr_checks && <small>System check: {view.ocr_checks.map((k) => `${k.ok === true ? '✓' : k.ok === false ? '✗' : '·'} ${k.check}`).join('   ')}</small>}
          </div></div>}
        {!c ? <div className="q-empty">{list.data ? 'No applications in progress.' : 'Loading…'}</div> : (<>
          <div className="ra-person"><span className="ra-av ra-av-xl" style={{ background: avc(c.full_name)[0], color: avc(c.full_name)[1] }}>{ini(c.full_name)}</span>
            <div><b>{proper(c.full_name)}</b><span className="ra-mono">{c.student_id} · {c.registration_no}</span></div>
            <Chip tone={c.stage === 'allotted' ? 'ok' : c.fee_check_status === 'Query' ? 'crit' : 'info'}>{c.stage === 'allotted' ? 'Allotted' : c.fee_check_status === 'Query' ? 'Returned' : paidAll ? 'Fee Paid' : 'Fees due'}</Chip></div>
          <div className="ra-bedbox"><BedDouble size={22} /><div><b className="ra-mono">{c.room_code ? `${c.hostel_code}-${c.room_code}` : 'No bed yet'}</b><span>{c.type_name} · Floor {c.floor_no ?? '—'} · {c.hostel_name}</span></div>
            <small>{c.stage === 'allotted' ? `Approved ${when(c.cw_on)}` : c.hold_until ? `Held until ${when(c.hold_until)}` : ''}</small></div>
          <div className="ra-list"><span className="ra-cap">Fees</span>
            {c.fees.map((f, i) => (
              <div key={i} className="ra-fee"><div><b>{headLabel(f)}</b><small>{f.paid >= f.due ? `Paid ${f.paid_on ? new Date(f.paid_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}` : `Due ${new Date(f.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}</small>{f.receipt && <small className="ra-mono">{f.receipt}</small>}</div>
                <div className="ra-fee-r"><b>{rs(f.due)}</b><Chip tone={f.paid >= f.due ? 'ok' : 'warn'}>{f.paid >= f.due ? 'Paid' : 'Due'}</Chip></div></div>))}
            <span className={`ra-match ${paidAll ? 'ra-ok-t' : 'ra-warn-t'}`}>{paidAll ? <CircleCheck size={14} /> : <Clock size={14} />}{paidAll ? `All ${c.fees.filter((f) => f.receipt).length} receipts on record` : `${rs(dueOf(c))} still due`}</span>
          </div>
          {/* receipts the student uploaded from the university payment portal (Pay all on the phone); approved on the Approvals page */}
          {(proofs.data ?? []).length > 0 && <div className="ra-list"><span className="ra-cap">Receipts uploaded by the student</span>
            {proofs.data!.map((p) => { const st = PROOF_ST[p.status] ?? { label: p.status, tone: 'neu' as const }; const ocr = OCR_ST[p.ocr_status] ?? { label: '', tone: 'neu' as const };
              return <div key={p.proof_id} className="ra-fee" style={{ alignItems: 'flex-start' }}>
                <a href={p.photo} target="_blank" rel="noreferrer" title="Open the receipt" style={{ flexShrink: 0 }} onClick={(e) => { e.preventDefault(); setView(p); }}>{p.mime === 'application/pdf'
                  ? <span style={{ display: 'grid', placeItems: 'center', width: 72, height: 72, borderRadius: 10, border: '1px solid var(--ax-bd2)', fontSize: 12, fontWeight: 700 }}>PDF</span>
                  : <img src={p.photo} alt="Receipt" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--ax-bd2)' }} />}</a>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}><b>{rs(p.amount)} · {p.proof_no}</b>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '2px 0' }}><Chip tone={st.tone}>{st.label}</Chip>{ocr.label && <Chip tone={ocr.tone}>{ocr.label}</Chip>}</span><small>Paid {new Date(p.paid_on).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}{p.reference ? ` · ${p.reference}` : ''} · for {p.demands.map((d) => d.fee_head.replace(/_/g, ' ')).join(', ')}</small>
                  {ocr.label && <small>System check: {ocr.label}{p.ocr_checks ? ` (${p.ocr_checks.filter((k) => k.ok === false).map((k) => k.check).join(', ') || 'amount, date, student'})` : ''}</small>}
                  {p.steps.map((s) => <small key={s.level}>L{s.level} {words(s.approver_role)}: {s.decision === 'Pending' ? 'waiting' : s.decision ?? 'waiting'}{s.acted_by_name ? ` · ${proper(s.acted_by_name)}` : ''}{s.decided_on ? ` · ${when(s.decided_on)}` : ''}</small>)}
                  {!canDecide(p) && p.status === 'Uploaded' && <small style={{ color: 'var(--ax-warn, #8A4B00)' }}>Waiting for the Floor Manager of {c.hostel_code} to check it; then it comes to the Chief Manager.</small>}
                  {canDecide(p) && <span style={{ display: 'flex', gap: 8, marginTop: 6 }}><button type="button" className="ra-primary" disabled={busy} onClick={() => decideProof(p, 'Approved')}>Approve receipt</button><button type="button" className="ra-outline" disabled={busy} onClick={() => decideProof(p, 'Rejected')}>Return</button></span>}</div>
                </div>; })}
          </div>}
          <div className="ra-list"><span className="ra-cap">Approval trail</span>
            {[{ n: 1, role: 'Room Allotment · verify fees', who: c.fee_checked_by, at: c.fee_checked_on, st: c.fee_check_status === 'Verified' ? 'Approved' : c.fee_check_status === 'Query' ? 'Returned' : c.stage === 'verify' ? 'Pending' : 'Waiting' },
              { n: 2, role: 'Chief Manager · approve bed', who: c.cw_by, at: c.cw_on, st: c.cw_status === 'Approved' ? 'Approved' : c.stage === 'approve' ? 'Pending' : 'Waiting' }].map((t) => { const tone = t.st === 'Approved' ? 'ok' : t.st === 'Pending' ? 'warn' : t.st === 'Returned' ? 'crit' : 'neu';
              return <div key={t.n} className="ra-row"><span className={`ra-lv ra-${tone}`}>L{t.n}</span><span className="ra-row-text"><b>{t.role}</b><small>{t.who ? `${proper(t.who)} · ${when(t.at)}` : 'Not yet'}</small></span><Chip tone={tone as 'ok'}>{t.st}</Chip></div>; })}
            {c.fee_check_status === 'Query' && c.fee_check_remarks && <div className="ra-note ra-crit-n"><Info size={14} />{c.fee_check_remarks}</div>}
          </div>
          <div className="ra-actions">
            {c.stage === 'fee' && <div className="ra-note ra-warn-n"><Lock size={15} />Verification opens after the student pays. {rs(dueOf(c))} due.</div>}
            {c.stage === 'allotted' && <div className="ra-note ra-ok-n"><CircleCheck size={15} />Bed approved at both levels. The office issues the key at Check-in.</div>}
            {c.stage === 'verify' && canL1 && !returning && <button type="button" role="checkbox" aria-checked={checked} className="ra-check" onClick={() => setChecked(!checked)}><i>{checked && <Check size={13} />}</i>I checked every receipt against Accounts</button>}
            {returning && (<div className="ra-return"><label>Remarks for the student <em>*</em></label><textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Rasoi fee receipt does not match Accounts" />
              <div><button type="button" className="ra-outline" onClick={() => setReturning(false)}>Cancel</button><button type="button" className="ra-danger" disabled={!remarks.trim() || busy} onClick={doReturn}>Return to student</button></div></div>)}
            {!returning && ((c.stage === 'verify' && canL1) || (c.stage === 'approve' && canL2)) && (<>
              {c.stage === 'verify' && !checked && <span className="ra-hint"><Info size={13} />Tick the receipt check to enable Verify.</span>}
              <div className="ra-btnrow">
                <button type="button" className="ra-ret" onClick={() => { setReturning(true); setRemarks(''); }}>Return</button>
                {c.stage === 'verify'
                  ? <button type="button" className="ra-primary" disabled={!checked || busy} onClick={verify}><BadgeCheck size={16} />Verify fees</button>
                  : <button type="button" className="ra-primary" disabled={busy} onClick={approve}><KeyRound size={16} />Approve allotment</button>}
              </div></>)}
            {c.stage === 'approve' && !canL2 && <div className="ra-note ra-info"><Info size={14} />Waiting for the Chief Manager.</div>}
            {c.stage === 'verify' && !canL1 && <div className="ra-note ra-info"><Info size={14} />Waiting for Room Allotment's fee check.</div>}
          </div>
        </>)}
      </aside>
    </div>
  );
}
