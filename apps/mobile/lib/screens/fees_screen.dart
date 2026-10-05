import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

const _open = ['Pending', 'Part_Paid', 'Overdue'];
num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;

/// What a demand is for; the hostel-fee difference and the electricity share settled on a room change, and the deposits, are named as such.
String _forWhat(Map d) {
  final head = '${d['fee_head'] ?? ''}';
  if (d['reference_type'] == 'room_change') return head == 'Hostel' ? 'Hostel fee difference (room change)' : '${words(head)} up to the room change';
  if (head == 'Caution_Deposit') return 'Caution deposit';
  if (head == 'Electricity_Deposit') return 'Electricity caution deposit';
  return '${words(head)}${head == 'Hostel' ? ', instalment ${d['instalment_no']}' : ''}';
}

/// REG-02 Fees and receipts: what is due, paying it, and every receipt.
class FeesScreen extends StatefulWidget {
  const FeesScreen({super.key});
  @override
  State<FeesScreen> createState() => _FeesScreenState();
}

class _FeesScreenState extends State<FeesScreen> {
  int? paying;

  Future<void> _pay(Map d, Future<void> Function() reload) async {
    final balance = _n(d['amount_due']) - _n(d['amount_paid']);
    final ok = await showDialog<bool>(context: context, builder: (c) => AlertDialog(
          title: Text('Pay ${inr(balance)}?'),
          content: Text('${_forWhat(d)}, due ${day(d['due_date'])}. A receipt is issued as soon as the payment goes through.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(c, true), child: Text('Pay ${inr(balance)}')),
          ]));
    if (ok != true || !mounted) return;
    setState(() => paying = d['demand_id']);
    try {
      final order = await Api.instance.post('/payments/orders', {'demand_id': d['demand_id']});
      if (order is Map && order['mode'] == 'dev') {
        await Api.instance.post('/payments/dev-confirm', {'demand_id': d['demand_id'], 'amount': balance});
        if (mounted) toast(context, 'Paid ${inr(balance)}. Receipt issued!');
      } else {
        if (mounted) toast(context, 'Online payment opens in the app in the next update. Please pay on the web portal for now.');
      }
      await reload();
    } catch (e) {
      if (mounted) toast(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => paying = null);
    }
  }

  @override
  Widget build(BuildContext context) => ApiView(path: '/students/$me/demands', builder: (context, data, reload) {
        final demands = ((data?['demands'] as List?) ?? []).cast<Map>();
        final receipts = ((data?['receipts'] as List?) ?? []).cast<Map>();
        final open = demands.where((d) => _open.contains(d['status'])).toList();
        final openTotal = open.fold<num>(0, (a, d) => a + _n(d['amount_due']) - _n(d['amount_paid']));
        final next = (open.toList()..sort((a, b) => '${a['due_date']}'.compareTo('${b['due_date']}'))).firstOrNull;
        final paid = receipts.fold<num>(0, (a, r) => a + _n(r['amount']));
        final overdue = open.any((d) => d['status'] == 'Overdue');
        final shown = demands.where((d) => !(d['status'] == 'Waived' && _n(d['amount_due']) == 0)).toList();
        return PageList(children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(gradient: K.heroGradient, borderRadius: BorderRadius.circular(22)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Outstanding', style: TextStyle(color: Colors.white70)),
              Text(inr(openTotal), style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
              Text(next == null ? 'Nothing due' : 'Next due ${day(next['due_date'])}: ${_forWhat(next)}${overdue ? ' · some overdue' : ''}',
                  style: TextStyle(color: overdue ? K.sun : Colors.white70)),
              const SizedBox(height: 14),
              Row(children: [
                Expanded(child: _Stat(inr(paid), 'Paid so far')),
                Expanded(child: _Stat('${receipts.length}', receipts.length == 1 ? 'Receipt' : 'Receipts')),
              ]),
            ]),
          ),
          KCard(
            title: 'Fee demands', subtitle: open.isNotEmpty ? '${open.length} to pay' : 'All paid', icon: Icons.account_balance_wallet_rounded,
            child: demands.isEmpty
                ? const Text('Fees appear once you apply for a room.', style: TextStyle(color: K.ink3))
                : Column(children: [
                    for (final d in shown) _DemandRow(d: d, busy: paying == d['demand_id'], onPay: paying == null ? () => _pay(d, reload) : null),
                  ]),
          ),
          KCard(
            title: 'Receipts', subtitle: 'Receipts are never edited; a refund is a new entry', icon: Icons.receipt_long_rounded,
            child: receipts.isEmpty
                ? const EmptyView(icon: Icons.receipt_long_rounded, title: 'No receipts yet')
                : Column(children: [for (final r in receipts) _ReceiptRow(r)]),
          ),
          const KCard(title: 'Online payment', icon: Icons.info_outline_rounded,
              child: Text('Payments go through the university gateway (Razorpay). In development the Pay button confirms at once and issues the receipt.',
                  style: TextStyle(color: K.ink2, fontSize: 13.5))),
        ]);
      });
}

class _Stat extends StatelessWidget {
  final String value;
  final String label;
  const _Stat(this.value, this.label);
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800)),
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12.5)),
      ]);
}

class _DemandRow extends StatelessWidget {
  final Map d;
  final bool busy;
  final VoidCallback? onPay;
  const _DemandRow({required this.d, required this.busy, this.onPay});
  @override
  Widget build(BuildContext context) {
    final status = '${d['status']}';
    final isOpen = _open.contains(status);
    final amount = status == 'Paid' ? _n(d['amount_due']) : _n(d['amount_due']) - _n(d['amount_paid']);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: K.line))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_forWhat(d), style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Text('${inr(amount)} · ${status == 'Paid' ? 'paid' : 'due ${day(d['due_date'])}'}${status == 'Part_Paid' ? ' (${inr(d['amount_paid'])} paid)' : ''}',
                style: TextStyle(color: status == 'Overdue' ? K.bad : K.ink3, fontSize: 13)),
          ])),
          const SizedBox(width: 8),
          Pill(words(status), tone: Pill.toneOf(status)),
        ]),
        if (isOpen) Padding(padding: const EdgeInsets.only(top: 10),
            child: ActionButton(label: 'Pay ${inr(amount)}', icon: Icons.account_balance_wallet_rounded, busy: busy, onPressed: onPay)),
      ]),
    );
  }
}

class _ReceiptRow extends StatelessWidget {
  final Map r;
  const _ReceiptRow(this.r);
  @override
  Widget build(BuildContext context) {
    final gs = '${r['gateway_status'] ?? ''}';
    return InkWell(
      onTap: () => showModalBottomSheet(context: context, showDragHandle: true, builder: (_) => SafeArea(child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Fee receipt', style: TextStyle(color: K.ink3, fontSize: 12.5, fontWeight: FontWeight.w700)),
              Text('${r['receipt_no']}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 12),
              InfoRow('Received from', me),
              InfoRow('Towards', _forWhat(r)),
              InfoRow('Amount', inr(r['amount'])),
              InfoRow('Paid on', dayTime(r['paid_on'])),
              InfoRow('Mode', '${r['payment_mode']}${r['gateway_ref'] != null ? ' · ref ${r['gateway_ref']}' : ''}${r['collected_by'] != null ? ' · collected by ${r['collected_by']}' : ''}'),
              InfoRow('Status', words(gs)),
              const SizedBox(height: 12),
              const Text('Computer-generated receipt of KL University Hostels. The registration fee is not refundable. Hostel and mess fees are refundable only as per the vacating rules.',
                  style: TextStyle(color: K.ink3, fontSize: 12)),
            ])))),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: K.line))),
        child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_forWhat(r), style: const TextStyle(fontWeight: FontWeight.w600)),
            Text('${r['receipt_no']} · ${dayTime(r['paid_on'])} · ${r['payment_mode']}', style: const TextStyle(color: K.ink3, fontSize: 12.5)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(inr(r['amount']), style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Pill(words(gs), tone: gs == 'Success' ? Tone.good : Pill.toneOf(gs)),
          ]),
        ]),
      ),
    );
  }
}
