import { ArrowRight, BedDouble, Info, Receipt, Zap } from 'lucide-react';

export type Statement = {
  move_date: string; academic_year: string; year_start: string; year_end: string; year_days: number; days_old: number; days_new: number; other_dues: number; total_to_pay: number; refund_due: number;
  hostel: { old_type: string; old_fee: number; new_type: string; new_fee: number; old_part: number; new_part: number; year_total: number; adjustment: number; billed: number; paid: number;
    unpaid: number; credit_to_instalments: number; refund_due: number; to_pay_after: number };
  electricity: { meter_no: string | null; month: string; opening: number | null; opening_at: string | null; reading: number | null; reading_at: string | null; reading_source: string | null;
    units: number | null; included: number; recharged: number; billable: number | null; rate: number | null; room_amount: number | null; my_days: number | null; all_days: number | null;
    my_share: number; dues: number; dues_list: { demand_id: number; due_date: string; amount: number; status: string }[] };
};
export const inr = (n: number | string | null | undefined) => `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const day = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const num = (n: number | null | undefined, d = 2) => (n == null ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: d }));

/** The money side of a room change: hostel fee for the year at both rates, the electricity share up to the move, dues carried over. */
export function RoomChangeStatement({ s, final }: { s: Statement; final?: boolean }) {
  const h = s.hostel, e = s.electricity;
  const adj = Number(h.adjustment);
  return (
    <div className="rc-st">
      <p className="rc-st-note"><Info size={15} />{final ? `Settled on ${day(s.move_date)}, the day of the move.`
        : `Worked out as if the move were today (${day(s.move_date)}). The final figures use the day of the move and the meter reading taken then.`}</p>

      <section className="rc-st-box">
        <h4><BedDouble size={17} />Hostel fee {s.academic_year}</h4>
        <table className="rc-st-t">
          <tbody>
            <tr><td>{h.old_type}<small>{inr(h.old_fee)} a year · {s.days_old} days in the old room</small></td><td className="r">{inr(h.old_part)}</td></tr>
            <tr><td>{h.new_type}<small>{inr(h.new_fee)} a year · {s.days_new} days in the new room</small></td><td className="r">{inr(h.new_part)}</td></tr>
            <tr className="rc-st-sum"><td>Hostel fee for the year after the change</td><td className="r">{inr(h.year_total)}</td></tr>
            <tr><td>Billed before the change<small>Paid {inr(h.paid)}{Number(h.unpaid) > 0 ? ` · unpaid ${inr(h.unpaid)}` : ''}</small></td><td className="r">{inr(h.billed)}</td></tr>
            <tr className={`rc-st-adj ${adj > 0 ? 'rc-up' : adj < 0 ? 'rc-down' : ''}`}>
              <td>{adj > 0 ? 'Difference to pay (added to your fees)' : adj < 0 ? 'Difference in your favour' : 'No difference: same room type'}
                {adj < 0 && <small>{Number(h.credit_to_instalments) > 0 ? `${inr(h.credit_to_instalments)} off your unpaid instalments` : 'Nothing unpaid to reduce'}{Number(h.refund_due) > 0 ? ` · ${inr(h.refund_due)} refund due from Accounts` : ''}</small>}</td>
              <td className="r">{adj > 0 ? '+' : adj < 0 ? '−' : ''}{inr(Math.abs(adj))}</td></tr>
          </tbody>
        </table>
        <p className="rc-st-small">What you have paid stays with you and moves to the new room; only the difference for the rest of the year is added or credited.</p>
      </section>

      <section className="rc-st-box">
        <h4><Zap size={17} />Electricity</h4>
        {e.meter_no ? (
          <table className="rc-st-t">
            <tbody>
              <tr><td>Old room meter {e.meter_no}<small>{num(e.opening)} kWh on {day(e.opening_at)} <ArrowRight size={11} /> {num(e.reading)} kWh on {day(e.reading_at)} · {e.reading_source}</small></td><td className="r">{num(e.units)} units</td></tr>
              <tr><td>Units to pay for this month so far<small>{num(e.included)} included in the fee{Number(e.recharged) > 0 ? ` · ${num(e.recharged)} recharged` : ''} · at {inr(e.rate)} a unit</small></td><td className="r">{num(e.billable)} units · {inr(e.room_amount)}</td></tr>
              <tr className="rc-st-sum"><td>Your share up to the move<small>{e.my_days} of {e.all_days} student-days in the room this month</small></td><td className="r">{inr(e.my_share)}</td></tr>
              <tr><td>Earlier bills not yet paid<small>{e.dues_list.length ? e.dues_list.map((d) => `${inr(d.amount)} due ${day(d.due_date)}`).join(' · ') : 'None'} · they stay with you</small></td><td className="r">{inr(e.dues)}</td></tr>
            </tbody>
          </table>)
          : <p className="rc-st-small">The old room has no meter: nothing to settle now. Earlier bills not yet paid: {inr(e.dues)}.</p>}
        <p className="rc-st-small">From the move, the new room's bill is shared with your new roommates; the old room's bill for this month counts your share above as paid.</p>
      </section>

      <section className="rc-st-total">
        <Receipt size={20} />
        <span><b>{inr(s.total_to_pay)}</b><small>to pay after the move{Number(s.other_dues) > 0 ? ` (includes ${inr(s.other_dues)} of other dues)` : ''}</small></span>
        {Number(s.refund_due) > 0 && <span className="rc-st-refund"><b>{inr(s.refund_due)}</b><small>refund due to you</small></span>}
      </section>
    </div>
  );
}
