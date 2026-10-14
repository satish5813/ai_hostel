import type { ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight, Banknote, Clock, Landmark, XCircle, type LucideIcon } from 'lucide-react';

export type Kind = 'Hostel' | 'Electricity';
export const KIND_LABEL: Record<Kind, string> = { Hostel: 'Caution deposit', Electricity: 'Electricity caution deposit' };
export type Entry = { entry_id: number; entry_no: string; entry_type: 'Opening' | 'Collected' | 'Deduction' | 'Refund'; deposit_kind: Kind; category: string | null; amount: number; reason: string; status: string;
  refund_mode: string | null; refund_ref: string | null; refund_account: string | null; created_at: string; decided_at: string | null; decision_remarks: string | null;
  handover_id: number | null; demand_id: number | null; proposed_by_name: string | null; decided_by_name: string | null; proposed_by: string | null };
export type Account = { paid_in: number; deducted: number; refunded: number; proposed: number; balance: number; hostel_balance: number; elec_balance: number; to_pay: number; demand_id: number | null; due_date: string | null; entries: Entry[] };

export const inr = (n: number | null | undefined) => `₹${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const day = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const CATEGORY: Record<string, string> = { Damage: 'Damage', Missing_Item: 'Missing item', Key_Lost: 'Key lost', Cleaning: 'Cleaning or painting', Fine: 'Fine', Unpaid_Dues: 'Unpaid dues', Other: 'Other' };

const KIND: Record<string, { label: string; icon: LucideIcon; sign: '+' | '−' | ''; cls: string }> = {
  Opening: { label: 'Deposit held', icon: Landmark, sign: '+', cls: 'cd-in' },
  Collected: { label: 'Deposit paid', icon: ArrowDownLeft, sign: '+', cls: 'cd-in' },
  Deduction: { label: 'Deduction', icon: ArrowUpRight, sign: '−', cls: 'cd-out' },
  Refund: { label: 'Refunded', icon: Banknote, sign: '−', cls: 'cd-ref' },
};

/** The deposit account line by line: what came in, what was taken and why, what was refunded and how. */
export function Ledger({ entries, actions }: { entries: Entry[]; actions?: (e: Entry) => ReactNode }) {
  if (!entries.length) return <p className="cd-empty">No deposit recorded yet.</p>;
  return (
    <ol className="cd-ledger">{entries.map((e) => {
      const k = KIND[e.entry_type];
      const waiting = e.status === 'Proposed', refused = e.status === 'Rejected';
      const Icon = waiting ? Clock : refused ? XCircle : k.icon;
      return (
        <li key={e.entry_id} className={`${k.cls}${waiting ? ' cd-wait' : ''}${refused ? ' cd-refused' : ''}`}>
          <span className="cd-ico"><Icon size={17} /></span>
          <span className="cd-what">
            <b>{e.entry_type === 'Deduction' ? CATEGORY[e.category ?? 'Other'] : k.label}{waiting && <em>Waiting for the Chief Manager</em>}{refused && <em>Not approved</em>}</b>
            <span>{e.reason}</span>
            <small>{KIND_LABEL[e.deposit_kind] ?? 'Caution deposit'} · {e.entry_no} · {day(e.created_at)}{e.proposed_by_name ? ` · ${e.entry_type === 'Deduction' ? 'proposed by' : 'by'} ${e.proposed_by_name}` : ''}
              {e.decided_by_name && e.entry_type === 'Deduction' && e.category !== 'Unpaid_Dues' ? ` · ${refused ? 'refused' : 'approved'} by ${e.decided_by_name}` : ''}
              {e.refund_mode ? ` · ${e.refund_mode} ${e.refund_ref}${e.refund_account ? ` to ${e.refund_account}` : ''}` : ''}</small>
            {e.decision_remarks && <small className="cd-remark">“{e.decision_remarks}”</small>}
            {actions?.(e)}
          </span>
          <span className="cd-amt">{refused ? '' : k.sign}{inr(e.amount)}</span>
        </li>);
    })}</ol>
  );
}
