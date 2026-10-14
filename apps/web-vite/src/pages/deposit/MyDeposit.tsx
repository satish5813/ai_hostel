import { useNavigate } from 'react-router';
import { Info, ShieldCheck } from 'lucide-react';
import { Button } from '@/lib/klh';
import { useApi } from '@/lib/ui';
import { Ledger, day, inr, type Account } from './shared';

/**
 * CDP-02 Caution deposit (student). How much of the refundable deposit the hostel holds, every deduction with its
 * reason and who approved it, and the refund when the student leaves.
 */
export default function MyDeposit() {
  const r = useApi<Account>('/me/caution');
  const navigate = useNavigate();
  const a = r.data;
  if (!a) return <div className="st"><p className="st-empty">Loading…</p></div>;
  return (
    <div className="st cd">
      <section className="cd-hero">
        <span className="cd-hero-ico"><ShieldCheck size={26} /></span>
        <span className="cd-hero-main"><small>Caution deposit held for you</small><b>{inr(a.balance)}</b>
          <small>Caution {inr(a.hostel_balance)} · Electricity {inr(a.elec_balance)} · refundable when you leave, less approved deductions</small></span>
        <ul className="cd-hero-stats">
          <li><b>{inr(a.paid_in)}</b><small>Paid in</small></li>
          <li><b>{inr(a.deducted)}</b><small>Deducted</small></li>
          <li><b>{inr(a.refunded)}</b><small>Refunded</small></li>
        </ul>
      </section>
      {a.to_pay > 0 && (
        <section className="st-panel cd-pay">
          <span><b>{inr(a.to_pay)} caution deposit to pay</b><small>Due {day(a.due_date)} · caution and electricity deposits, paid once on joining; returned when you leave</small></span>
          <Button variant="primary" onClick={() => navigate('/fees')}>Pay in Fees</Button>
        </section>)}
      {a.proposed > 0 && <p className="cd-note cd-note-warn"><Info size={16} />A deduction of {inr(a.proposed)} has been proposed and is waiting for the Chief Manager. It is taken only if approved.</p>}
      <section className="st-panel">
        <h2>Account</h2>
        <Ledger entries={a.entries} />
      </section>
      <p className="cd-note"><Info size={16} />The deposit stays in the university's account. A deduction needs a written reason and the Chief Manager's approval, and you are told when one is made. When you vacate, Accounts sends the balance to your bank account and the reference appears here.</p>
    </div>
  );
}
