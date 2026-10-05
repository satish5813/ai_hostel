import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;

const _kindLabel = {'Hostel': 'Caution deposit', 'Electricity': 'Electricity caution deposit'};
const _category = {
  'Damage': 'Damage', 'Missing_Item': 'Missing item', 'Key_Lost': 'Key lost', 'Cleaning': 'Cleaning or painting',
  'Fine': 'Fine', 'Unpaid_Dues': 'Unpaid dues', 'Other': 'Other',
};
/// entry type -> (label, icon, sign, colour)
const _entry = {
  'Opening': ('Deposit held', Icons.account_balance_rounded, '+', K.good),
  'Collected': ('Deposit paid', Icons.south_west_rounded, '+', K.good),
  'Deduction': ('Deduction', Icons.north_east_rounded, '−', K.bad),
  'Refund': ('Refunded', Icons.payments_rounded, '−', K.brand),
};

/// CDP-02 Caution deposit: how much of the refundable deposit the hostel holds, every deduction with its reason and
/// who approved it, and the refund when the student leaves.
class DepositScreen extends StatelessWidget {
  const DepositScreen({super.key});
  @override
  Widget build(BuildContext context) => ApiView(path: '/me/caution', builder: (context, data, reload) {
        final a = (data as Map?) ?? {};
        final entries = ((a['entries'] as List?) ?? []).cast<Map>();
        final toPay = _n(a['to_pay']);
        final proposed = _n(a['proposed']);
        return PageList(children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(gradient: K.heroGradient, borderRadius: BorderRadius.circular(22)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Row(children: [
                Icon(Icons.verified_user_rounded, color: Colors.white, size: 22), SizedBox(width: 8),
                Text('Caution deposit held for you', style: TextStyle(color: Colors.white70)),
              ]),
              const SizedBox(height: 4),
              Text(inr(a['balance']), style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
              Text('Caution ${inr(a['hostel_balance'])} · Electricity ${inr(a['elec_balance'])} · refundable when you leave, less approved deductions',
                  style: const TextStyle(color: Colors.white70, fontSize: 12.5)),
              const SizedBox(height: 14),
              Row(children: [
                Expanded(child: _Stat(inr(a['paid_in']), 'Paid in')),
                Expanded(child: _Stat(inr(a['deducted']), 'Deducted')),
                Expanded(child: _Stat(inr(a['refunded']), 'Refunded')),
              ]),
            ]),
          ),
          if (toPay > 0)
            KCard(
              title: '${inr(toPay)} caution deposit to pay', icon: Icons.account_balance_wallet_rounded,
              subtitle: 'Due ${day(a['due_date'])} · caution and electricity deposits, paid once on joining; returned when you leave',
              child: ActionButton(label: 'Pay in Fees', icon: Icons.arrow_forward_rounded, onPressed: () => openPlace(context, 'fees')),
            ),
          if (proposed > 0)
            _Note(icon: Icons.info_outline_rounded, warn: true,
                text: 'A deduction of ${inr(proposed)} has been proposed and is waiting for the Chief Warden. It is taken only if approved.'),
          KCard(
            title: 'Account', icon: Icons.receipt_long_rounded,
            child: entries.isEmpty
                ? const EmptyView(icon: Icons.account_balance_rounded, title: 'No deposit recorded yet.')
                : Column(children: [for (final e in entries) _Line(e)]),
          ),
          const _Note(icon: Icons.info_outline_rounded,
              text: "The deposit stays in the university's account. A deduction needs a written reason and the Chief Warden's approval, and you are told when one is made. "
                  'When you vacate, Accounts sends the balance to your bank account and the reference appears here.'),
        ]);
      });
}

class _Stat extends StatelessWidget {
  final String value;
  final String label;
  const _Stat(this.value, this.label);
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12.5)),
      ]);
}

class _Note extends StatelessWidget {
  final IconData icon;
  final String text;
  final bool warn;
  const _Note({required this.icon, required this.text, this.warn = false});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: warn ? K.warnBg : K.brandTint, borderRadius: BorderRadius.circular(14)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 18, color: warn ? K.warn : K.brand), const SizedBox(width: 10),
          Expanded(child: Text(text, style: const TextStyle(color: K.ink2, fontSize: 13))),
        ]),
      );
}

/// One line of the deposit account: what came in, what was taken and why, what was refunded and how.
class _Line extends StatelessWidget {
  final Map e;
  const _Line(this.e);
  @override
  Widget build(BuildContext context) {
    final type = '${e['entry_type']}';
    final (label, icon, sign, colour) = _entry[type] ?? (words(type), Icons.circle_outlined, '', K.ink2);
    final waiting = e['status'] == 'Proposed';
    final refused = e['status'] == 'Rejected';
    final title = type == 'Deduction' ? (_category[e['category'] ?? 'Other'] ?? words(e['category'])) : label;
    final meta = StringBuffer('${_kindLabel[e['deposit_kind']] ?? 'Caution deposit'} · ${e['entry_no']} · ${day(e['created_at'])}');
    if (e['proposed_by_name'] != null) meta.write(' · ${type == 'Deduction' ? 'proposed by' : 'by'} ${e['proposed_by_name']}');
    if (e['decided_by_name'] != null && type == 'Deduction' && e['category'] != 'Unpaid_Dues') meta.write(' · ${refused ? 'refused' : 'approved'} by ${e['decided_by_name']}');
    if (e['refund_mode'] != null) meta.write(' · ${e['refund_mode']} ${e['refund_ref'] ?? ''}${e['refund_account'] != null ? ' to ${e['refund_account']}' : ''}');
    final c = refused || waiting ? K.ink3 : colour;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: K.line))),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: 34, height: 34, decoration: BoxDecoration(color: c.withValues(alpha: .1), borderRadius: BorderRadius.circular(10)),
            child: Icon(waiting ? Icons.schedule_rounded : refused ? Icons.cancel_outlined : icon, size: 17, color: c)),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(spacing: 6, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
            if (waiting) const Pill('Waiting for the Chief Warden', tone: Tone.warn),
            if (refused) const Pill('Not approved', tone: Tone.bad),
          ]),
          if ('${e['reason'] ?? ''}'.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 2), child: Text('${e['reason']}', style: const TextStyle(color: K.ink2, fontSize: 13.5))),
          const SizedBox(height: 2),
          Text(meta.toString(), style: const TextStyle(color: K.ink3, fontSize: 12)),
          if (e['decision_remarks'] != null)
            Padding(padding: const EdgeInsets.only(top: 2), child: Text('“${e['decision_remarks']}”', style: const TextStyle(color: K.ink3, fontSize: 12, fontStyle: FontStyle.italic))),
        ])),
        const SizedBox(width: 8),
        Text('${refused ? '' : sign}${inr(e['amount'])}',
            style: TextStyle(fontWeight: FontWeight.w800, color: c, decoration: refused ? TextDecoration.lineThrough : null)),
      ]),
    );
  }
}
