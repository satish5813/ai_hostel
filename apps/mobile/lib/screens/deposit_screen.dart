import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

/// CDP-02 Caution deposit, as pages/deposit/MyDeposit.tsx (styles/deposit.css): the teal hero with the balance and three
/// figures, the deposit still to pay, a proposed deduction, the account ledger and the note on how deductions work.
class DepositScreen extends StatefulWidget {
  const DepositScreen({super.key});
  @override
  State<DepositScreen> createState() => _DepositScreenState();
}

// deposit.css tokens
const _ink2 = Color(0xFF475467), _ink3 = Color(0xFF667085), _line = Color(0xFFE4E8EF);
const _in = Color(0xFF067647), _out = Color(0xFFB42318), _ref = Color(0xFF1D4ED8), _waitInk = Color(0xFFB54708);
num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
final _num = NumberFormat('#,##,##0.##', 'en_IN');
/// ₹ with Indian grouping and up to two decimals (shared.tsx inr).
String _inr(dynamic v) => '₹${_num.format(_n(v))}';
/// 5 Oct 2026 (shared.tsx day).
String _day(dynamic s) { final d = parseDate(s); return d == null ? '—' : DateFormat('d MMM yyyy').format(d); }

const _kindLabel = {'Hostel': 'Caution deposit', 'Electricity': 'Electricity caution deposit'};
const _category = {'Damage': 'Damage', 'Missing_Item': 'Missing item', 'Key_Lost': 'Key lost', 'Cleaning': 'Cleaning or painting', 'Fine': 'Fine', 'Unpaid_Dues': 'Unpaid dues', 'Other': 'Other'};
/// entry type: label, icon, sign, colour family (in, out, ref)
const _kind = {
  'Opening': ('Deposit held', LucideIcons.landmark, '+', 'in'),
  'Collected': ('Deposit paid', LucideIcons.arrowDownLeft, '+', 'in'),
  'Deduction': ('Deduction', LucideIcons.arrowUpRight, '−', 'out'),
  'Refund': ('Refunded', LucideIcons.banknote, '−', 'ref'),
};

class _DepositScreenState extends State<DepositScreen> with AutoRefresh {
  Map? a;

  @override
  void initState() { super.initState(); load(); autoRefresh(load); }

  Future<void> load() async {
    try {
      final r = await api.get('/me/caution');
      if (mounted) setState(() => a = r as Map);
    } catch (e) {
      if (mounted) toast(context, e.toString(), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (a == null) return const Padding(padding: EdgeInsets.fromLTRB(16, 20, 16, 0), child: Text('Loading…', style: TextStyle(fontSize: 13, color: _ink3)));
    final d = a!;
    final entries = ((d['entries'] as List?) ?? []).cast<Map>();
    final children = <Widget>[
      _hero(d),
      if (_n(d['to_pay']) > 0) _payPanel(d),
      if (_n(d['proposed']) > 0) _Note('A deduction of ${_inr(d['proposed'])} has been proposed and is waiting for the Chief Warden. It is taken only if approved.', warn: true),
      Panel(title: 'Account', child: entries.isEmpty
          ? const Text('No deposit recorded yet.', style: TextStyle(color: _ink3))
          : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [for (var i = 0; i < entries.length; i++) _LedgerLine(entries[i], last: i == entries.length - 1)])),
      const _Note("The deposit stays in the university's account. A deduction needs a written reason and the Chief Warden's approval, and you are told when one is made. When you vacate, Accounts sends the balance to your bank account and the reference appears here."),
    ];
    return RefreshIndicator(onRefresh: load, child: ListView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
        children: [for (var i = 0; i < children.length; i++) ...[if (i > 0) const SizedBox(height: 18), children[i]]]));
  }

  /// cd-hero at phone width: icon and the balance on one row, the three figures across the full width below.
  Widget _hero(Map d) {
    final small = TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: .85));
    Widget stat(dynamic v, String label) => Expanded(child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(color: Colors.white.withValues(alpha: .1), borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.white.withValues(alpha: .18))),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            FittedBox(fit: BoxFit.scaleDown, child: Text(_inr(v), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white, fontFeatures: [FontFeature.tabularFigures()]))),
            Text(label, style: small),
          ]),
        ));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(colors: [Color(0xFF0B7A71), Color(0xFF0A4F5C)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        boxShadow: const [BoxShadow(color: Color(0xB30A4F5C), blurRadius: 40, spreadRadius: -22, offset: Offset(0, 18))],
      ),
      child: Stack(clipBehavior: Clip.none, children: [
        // radial-gradient(120% 140% at 100% 0%, #13968A, transparent 55%)
        Positioned.fill(left: -24, right: -24, top: -22, bottom: -22, child: DecoratedBox(decoration: BoxDecoration(borderRadius: BorderRadius.circular(22),
            gradient: const RadialGradient(center: Alignment.topRight, radius: 1.3, colors: [Color(0xFF13968A), Color(0x0013968A)], stops: [0, .55])))),
        Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Container(width: 56, height: 56, decoration: BoxDecoration(color: Colors.white.withValues(alpha: .15), borderRadius: BorderRadius.circular(18)),
                child: const Icon(LucideIcons.shieldCheck, size: 26, color: Colors.white)),
            const SizedBox(width: 18),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Caution deposit held for you', style: small),
              Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Text(_inr(d['balance']),
                  style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w800, letterSpacing: -.34, color: Colors.white, fontFeatures: [FontFeature.tabularFigures()]))),
              Text('Caution ${_inr(d['hostel_balance'])} · Electricity ${_inr(d['elec_balance'])} · refundable when you leave, less approved deductions', style: small),
            ])),
          ]),
          const SizedBox(height: 18),
          Row(children: [stat(d['paid_in'], 'Paid in'), const SizedBox(width: 10), stat(d['deducted'], 'Deducted'), const SizedBox(width: 10), stat(d['refunded'], 'Refunded')]),
        ]),
      ]),
    );
  }

  /// cd-pay: the deposit still to pay, on amber, with "Pay in Fees".
  Widget _payPanel(Map d) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: const Color(0xFFFFFAEB), borderRadius: BorderRadius.circular(18), border: Border.all(color: const Color(0xFFFEC84B), width: 1.5), boxShadow: K.cardShadow),
        child: Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 12, runSpacing: 12, children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text('${_inr(d['to_pay'])} caution deposit to pay', style: const TextStyle(fontWeight: FontWeight.w700)),
            Text('Due ${_day(d['due_date'])} · caution and electricity deposits, paid once on joining; returned when you leave', style: const TextStyle(fontSize: 12, color: _ink3)),
          ]),
          KButton('Pay in Fees', onPressed: () => openPlace(context, 'fees')),
        ]),
      );
}

/// cd-note: grey (or amber) note with an info icon.
class _Note extends StatelessWidget {
  final String text;
  final bool warn;
  const _Note(this.text, {this.warn = false});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(color: warn ? const Color(0xFFFFFAEB) : const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(padding: const EdgeInsets.only(top: 2), child: Icon(LucideIcons.info, size: 16, color: warn ? _waitInk : K.brand)), const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 13.5, height: 1.45, color: _ink2))),
        ]),
      );
}

/// One ledger line (cd-ledger li): tinted icon, what and why, the small print, the signed amount.
class _LedgerLine extends StatelessWidget {
  final Map e;
  final bool last;
  const _LedgerLine(this.e, {required this.last});
  @override
  Widget build(BuildContext context) {
    final type = '${e['entry_type']}';
    final (label, icon0, sign, fam) = _kind[type] ?? _kind['Opening']!;
    final waiting = e['status'] == 'Proposed', refused = e['status'] == 'Rejected';
    final icon = waiting ? LucideIcons.clock : refused ? LucideIcons.circleX : icon0;
    final (Color ibg, Color ifg) = waiting ? (const Color(0xFFFFFAEB), _waitInk) : refused ? (const Color(0xFFF2F4F7), _ink3)
        : fam == 'in' ? (const Color(0xFFECFDF3), _in) : fam == 'out' ? (const Color(0xFFFEF3F2), _out) : (const Color(0xFFEFF4FF), _ref);
    final amtColor = waiting || refused ? _ink3 : fam == 'in' ? _in : fam == 'out' ? _out : _ref;
    final isDed = type == 'Deduction';
    final meta = StringBuffer('${_kindLabel[e['deposit_kind']] ?? 'Caution deposit'} · ${e['entry_no']} · ${_day(e['created_at'])}');
    if (e['proposed_by_name'] != null) meta.write(' · ${isDed ? 'proposed by' : 'by'} ${e['proposed_by_name']}');
    if (e['decided_by_name'] != null && isDed && e['category'] != 'Unpaid_Dues') meta.write(' · ${refused ? 'refused' : 'approved'} by ${e['decided_by_name']}');
    if (e['refund_mode'] != null) meta.write(' · ${e['refund_mode']} ${e['refund_ref']}${e['refund_account'] != null ? ' to ${e['refund_account']}' : ''}');
    Widget tag(String t) => Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(color: refused ? const Color(0xFFF2F4F7) : const Color(0xFFFFFAEB), borderRadius: BorderRadius.circular(999)),
        child: Text(t, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: refused ? _ink2 : _waitInk)));
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(border: last ? null : const Border(bottom: BorderSide(color: _line))),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: 34, height: 34, decoration: BoxDecoration(color: ibg, borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 17, color: ifg)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(spacing: 8, runSpacing: 2, crossAxisAlignment: WrapCrossAlignment.center, children: [
            Text(isDed ? _category[e['category'] ?? 'Other'] ?? 'Other' : label, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: K.ink)),
            if (waiting) tag('Waiting for the Chief Warden'),
            if (refused) tag('Not approved'),
          ]),
          const SizedBox(height: 2),
          Text('${e['reason'] ?? ''}', style: const TextStyle(fontSize: 14, color: _ink2)),
          const SizedBox(height: 2),
          Text(meta.toString(), style: const TextStyle(fontSize: 12, color: _ink3)),
          if (e['decision_remarks'] != null) Padding(padding: const EdgeInsets.only(top: 2),
              child: Text('“${e['decision_remarks']}”', style: const TextStyle(fontSize: 12, color: _ink3, fontStyle: FontStyle.italic))),
        ])),
        const SizedBox(width: 12),
        Text('${refused ? '' : sign}${_inr(e['amount'])}', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: amtColor,
            decoration: refused ? TextDecoration.lineThrough : null, fontFeatures: const [FontFeature.tabularFigures()])),
      ]),
    );
  }
}
