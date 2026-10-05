import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
String _units(num v) => v.toStringAsFixed(v == v.roundToDouble() ? 0 : 1);
/// "H-BH1-101" or "BH1-101" -> "BH1-101"
String _room(dynamic id) => '${id ?? ''}'.replaceFirst(RegExp(r'^H-'), '');

/// ELE-01 My electricity: units used, balance, online recharge (own room only), and the room's monthly bill shares.
class ElectricityScreen extends StatefulWidget {
  const ElectricityScreen({super.key});
  @override
  State<ElectricityScreen> createState() => _ElectricityScreenState();
}

class _ElectricityScreenState extends State<ElectricityScreen> {
  Map? meter;
  Map? bills;
  Object? error;
  bool loading = true;
  bool busy = false;
  double amount = 200;

  @override
  void initState() { super.initState(); load(); }

  Future<void> load() async {
    Map? m; Object? err; Map? b;
    try { m = await Api.instance.get('/meters/mine') as Map?; } catch (e) { err = e; }
    try { b = await Api.instance.get('/me/electricity-bills') as Map?; } catch (_) {}
    if (!mounted) return;
    setState(() { meter = m; error = err; bills = b; loading = false; });
  }

  Future<void> _recharge(num rate) async {
    final a = amount.round();
    final ok = await showDialog<bool>(context: context, builder: (c) => AlertDialog(
          title: Text('Pay ${inr(a)}?'),
          content: Text('${_units(a / rate)} units are credited to your room meter as soon as the payment goes through.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(c, true), child: Text('Pay ${inr(a)}')),
          ]));
    if (ok != true || !mounted) return;
    setState(() => busy = true);
    try {
      final r = await Api.instance.post('/meters/${meter!['meter_id']}/recharge', {'amount': a});
      if (r is Map && r['order']?['mode'] == 'dev') {
        await Api.instance.post('/payments/dev-confirm', {'demand_id': r['demand']['demand_id'], 'amount': a});
        if (mounted) toast(context, 'Recharged ${(a / rate).toStringAsFixed(1)} units');
      } else {
        if (mounted) toast(context, 'Online payment opens in the app in the next update. Please pay on the web portal for now.');
      }
      await load();
    } catch (e) {
      if (mounted) toast(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()));
    if (meter == null) {
      final noMeter = error is ApiError && [403, 404].contains((error as ApiError).status);
      if (!noMeter && error != null) return ErrorView(message: error.toString(), onRetry: load);
      return RefreshIndicator(onRefresh: load, child: const PageList(children: [
        KCard(child: EmptyView(icon: Icons.bolt_rounded, title: 'No meter is linked to you yet', body: 'Your room meter is linked when you check in.')),
      ]));
    }
    final d = meter!;
    final used = _n(d['units_this_month']);
    final included = _n(d['included_units_per_month']);
    final recharged = _n(d['recharged_this_month']);
    final left = _n(d['units_left']);
    final rate = _n(d['rate_per_unit']);
    final recharges = ((d['recharges'] as List?) ?? []).cast<Map>();
    final monthly = ((d['monthly'] as List?) ?? []).cast<Map>();
    final allowance = included + recharged;

    return RefreshIndicator(onRefresh: load, child: PageList(children: [
      Text('Room ${_room(d['space_id'])} · meter ${d['meter_no']} · ${_units(included)} units a month are included in your fee.',
          style: const TextStyle(color: K.ink2, fontSize: 13.5)),
      if (rate == 0) const _Note(tone: Tone.warn, title: 'No approved tariff',
          body: 'The electricity tariff for your room type has not been approved yet, so balance and recharge are not available.'),
      if (rate > 0 && left < 10) _Note(tone: Tone.bad, title: 'Low balance', body: 'Only ${left.toStringAsFixed(0)} units left this month. Recharge to avoid a cut-off.'),
      KCard(
        title: 'This month', subtitle: 'Last reading ${d['last_reading']} kWh, ${dayTime(d['last_reading_at'])}', icon: Icons.bolt_rounded,
        child: Row(children: [
          SizedBox(width: 92, height: 92, child: Stack(alignment: Alignment.center, children: [
            SizedBox(width: 92, height: 92, child: CircularProgressIndicator(
                value: allowance <= 0 ? 0 : (left.clamp(0, allowance) / allowance).toDouble(), strokeWidth: 9,
                backgroundColor: K.line, color: left < 10 ? K.bad : K.good)),
            Column(mainAxisSize: MainAxisSize.min, children: [
              Text(left.toStringAsFixed(0), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
              const Text('units left', style: TextStyle(fontSize: 11, color: K.ink3)),
            ]),
          ])),
          const SizedBox(width: 18),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${_units(used)} of ${_units(included)} kWh used', style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            ClipRRect(borderRadius: BorderRadius.circular(99), child: LinearProgressIndicator(
                value: included <= 0 ? 0 : (used / included).clamp(0, 1).toDouble(), minHeight: 8, backgroundColor: K.line,
                color: used > included ? K.bad : K.brand)),
            const SizedBox(height: 8),
            Text('${recharged.toStringAsFixed(0)} units recharged · ${inr(rate)} per extra unit', style: const TextStyle(color: K.ink3, fontSize: 12.5)),
          ])),
        ]),
      ),
      KCard(
        title: 'Recharge', subtitle: 'Paid online; credited to the meter immediately', icon: Icons.account_balance_wallet_rounded,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(inr(amount), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
            const SizedBox(width: 8),
            if (rate > 0) Text('${(amount / rate).toStringAsFixed(1)} units', style: const TextStyle(color: K.ink3)),
          ]),
          Slider(min: 50, max: 1000, divisions: 19, value: amount, label: inr(amount), onChanged: busy ? null : (v) => setState(() => amount = v)),
          Wrap(spacing: 8, children: [
            for (final p in const [100, 200, 500])
              ChoiceChip(label: Text(inr(p)), selected: amount == p, onSelected: busy ? null : (_) => setState(() => amount = p.toDouble())),
          ]),
          const SizedBox(height: 14),
          ActionButton(
              label: 'Pay ${inr(amount)}${rate > 0 ? ' for ${(amount / rate).toStringAsFixed(1)} units' : ''}',
              icon: Icons.account_balance_wallet_rounded, busy: busy, onPressed: rate > 0 ? () => _recharge(rate) : null),
          if (rate == 0) const Padding(padding: EdgeInsets.only(top: 6), child: Text('No approved tariff yet.', style: TextStyle(color: K.ink3, fontSize: 12.5))),
        ]),
      ),
      KCard(
        title: 'Recharges', icon: Icons.schedule_rounded,
        child: recharges.isEmpty
            ? const EmptyView(icon: Icons.bolt_rounded, title: 'No recharges yet')
            : Column(children: [
                for (final r in recharges) Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Row(children: [
                      Expanded(child: Text(dayTime(r['created_at']))),
                      Text('${_n(r['units_credited']).toStringAsFixed(1)} units', style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(width: 10),
                      Pill(words(r['status']), tone: Pill.toneOf(r['status'])),
                    ])),
              ]),
      ),
      KCard(
        title: 'Use by month', subtitle: 'Against the ${_units(included)}-unit allowance', icon: Icons.speed_rounded,
        child: monthly.isEmpty
            ? const Text('The first monthly summary arrives on the 1st.', style: TextStyle(color: K.ink3))
            : _MonthBars(rows: monthly.reversed.toList(), limit: included),
      ),
      if (bills != null && ((bills!['bills'] as List?) ?? []).isNotEmpty) _RoomBills(bills!),
    ]));
  }
}

class _Note extends StatelessWidget {
  final Tone tone;
  final String title;
  final String body;
  const _Note({required this.tone, required this.title, required this.body});
  @override
  Widget build(BuildContext context) {
    final (fg, bg) = tone == Tone.bad ? (K.bad, K.badBg) : (K.warn, K.warnBg);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14), border: Border.all(color: fg.withValues(alpha: .25))),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(Icons.warning_amber_rounded, color: fg, size: 20), const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: TextStyle(color: fg, fontWeight: FontWeight.w800)),
          Text(body, style: const TextStyle(color: K.ink2, fontSize: 13)),
        ])),
      ]),
    );
  }
}

/// Units used each month as bars, with the included allowance marked; months over the allowance are highlighted.
class _MonthBars extends StatelessWidget {
  final List<Map> rows;
  final num limit;
  const _MonthBars({required this.rows, required this.limit});
  @override
  Widget build(BuildContext context) {
    final top = rows.fold<num>(limit, (a, r) => _n(r['units_used']) > a ? _n(r['units_used']) : a);
    return Column(children: [
      for (final r in rows) Padding(padding: const EdgeInsets.symmetric(vertical: 5), child: Row(children: [
            SizedBox(width: 40, child: Text(DateFormat('MMM').format(parseDate(r['usage_month']) ?? DateTime.now()), style: const TextStyle(color: K.ink3, fontSize: 12.5))),
            Expanded(child: LayoutBuilder(builder: (_, c) => Stack(children: [
                  Container(height: 18, decoration: BoxDecoration(color: K.ground, borderRadius: BorderRadius.circular(6))),
                  Container(height: 18, width: top <= 0 ? 0 : c.maxWidth * (_n(r['units_used']) / top),
                      decoration: BoxDecoration(color: _n(r['excess_units']) > 0 ? K.ember : K.brand, borderRadius: BorderRadius.circular(6))),
                  if (top > 0) Positioned(left: c.maxWidth * (limit / top) - 1, child: Container(width: 2, height: 18, color: K.ink)),
                ]))),
            SizedBox(width: 64, child: Text('${_units(_n(r['units_used']))} kWh', textAlign: TextAlign.right, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12.5))),
          ])),
      const SizedBox(height: 6),
      Row(children: [
        Container(width: 2, height: 12, color: K.ink), const SizedBox(width: 6),
        Text('Included: ${_units(limit)} kWh', style: const TextStyle(color: K.ink3, fontSize: 12)),
      ]),
    ]);
  }
}

/// The room's monthly bill and this student's equal share of it, which is an Electricity fee in Fees.
class _RoomBills extends StatelessWidget {
  final Map data;
  const _RoomBills(this.data);
  @override
  Widget build(BuildContext context) {
    final bills = (data['bills'] as List).cast<Map>();
    final totals = (data['totals'] as Map?) ?? {};
    final due = _n(totals['due']);
    String month(dynamic m) { final d = DateTime.tryParse('$m-01'); return d == null ? '$m' : DateFormat('MMMM yyyy').format(d); }
    return KCard(
      title: "My share of the room's bill", icon: Icons.receipt_long_rounded,
      subtitle: 'Units your room used beyond the included ${bills.first['included']} and any recharges, shared equally with your roommates. '
          'All electricity so far: ${inr(totals['billed'])} billed, ${inr(totals['paid'])} paid.',
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        for (final x in bills) Builder(builder: (_) {
          final paid = _n(x['paid']) >= _n(x['amount']);
          final overdue = x['overdue'] == true;
          final shared = '${x['roommates'] ?? 'No one: you alone'}${_n(x['share_pct']) < 100 ? ' · your share ${x['share_pct']}%' : ''}${_n(x['days']) < 28 ? ' (${x['days']} days)' : ''}';
          return Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: K.line))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Text(month(x['month']), style: const TextStyle(fontWeight: FontWeight.w700))),
                Text(inr(x['amount']), style: const TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(width: 8),
                Pill(paid ? 'Paid' : overdue ? 'Overdue' : 'To pay', tone: paid ? Tone.good : overdue ? Tone.bad : Tone.warn),
              ]),
              const SizedBox(height: 4),
              Text('Room used ${x['room_units']} units · billed ${x['billable']} × ${inr(x['rate'])} = ${inr(x['room_amount'])}', style: const TextStyle(color: K.ink2, fontSize: 13)),
              Text('Shared with: $shared', style: const TextStyle(color: K.ink3, fontSize: 12.5)),
            ]),
          );
        }),
        if (due > 0) Padding(padding: const EdgeInsets.only(top: 14),
            child: ActionButton(label: 'Pay ${inr(due)}', icon: Icons.account_balance_wallet_rounded, onPressed: () => openPlace(context, 'fees'))),
      ]),
    );
  }
}
