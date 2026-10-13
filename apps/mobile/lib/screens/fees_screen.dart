import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import 'pay_all_sheet.dart';
import '../shell.dart';

/// REG-02 Fees and receipts, as pages/student/Fees.tsx: three stat tiles, the fee demands with Pay, the receipts table
/// (stacked rows at phone width, search and pages as the web DataTable), the online-payment notice, and the printable receipt.
class FeesScreen extends StatefulWidget {
  const FeesScreen({super.key});
  @override
  State<FeesScreen> createState() => _FeesScreenState();
}

const _openSt = ['Pending', 'Part_Paid', 'Overdue'];
const _muted = K.ink2; // --ink-muted
const _uiLine = Color(0xCCE3E7F0); // --ui-line
num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
final _paise = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2);
/// formatINR(n, true): with paise.
String _inrP(dynamic v) => _paise.format(_n(v));
/// formatINR(n): whole rupees, rounded like Intl.
String _inr(dynamic v) => inr(_n(v).round());

/// What a demand is for; the hostel-fee difference and the electricity share settled on a room change are named as such.
String _forWhat(Map d) => d['reference_type'] == 'room_change'
    ? (d['fee_head'] == 'Hostel' ? 'Hostel fee difference (room change)' : '${words(d['fee_head'])} up to the room change')
    : '${words(d['fee_head'])}${d['fee_head'] == 'Hostel' ? ', instalment ${d['instalment_no']}' : ''}';

class _FeesScreenState extends State<FeesScreen> with AutoRefresh {
  Map? dues;
  String? name;
  Object? error;
  Map? receipt;
  int? paying;

  @override
  void initState() { super.initState(); load(); autoRefresh(load); }

  Future<void> load() async {
    try {
      final r = await Future.wait([api.get('/students/$me/demands'), api.get('/me/profile').catchError((_) => null), api.get('/me/wallet').catchError((_) => null), api.get('/me/payment-proofs').catchError((_) => null)]);
      if (!mounted) return;
      final p = r[1] as Map?;
      setState(() { dues = r[0] as Map; name = p?['student_name'] ?? p?['full_name']; wallet = r[2] as Map?; proofs = ((r[3] as List?) ?? []).cast<Map>(); error = null; });
    } catch (e) {
      if (mounted) setState(() => error = e);
    }
  }

  Map? wallet;
  List<Map> proofs = [];

  Future<void> _pay(Map d) async {
    final balance = _n(d['amount_due']) - _n(d['amount_paid']);
    setState(() => paying = d['demand_id']);
    try {
      final order = await api.post('/payments/orders', {'demand_id': d['demand_id']});
      if (order is Map && order['mode'] == 'dev') {
        await api.post('/payments/dev-confirm', {'demand_id': d['demand_id'], 'amount': balance});
      } else if (mounted) {
        await showDialog<void>(context: context, builder: (c) => AlertDialog(
              content: Text('Razorpay order ${order?['order_id']} for ₹${order?['amount']} (key ${order?['key_id']}). The receipt is recorded by the webhook.'),
              actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK'))]));
      }
      await load();
      if (mounted) toast(context, 'Paid ${_inr(balance)}. Receipt issued!');
    } catch (e) {
      if (mounted) toast(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => paying = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (receipt != null) return _ReceiptPrint(r: receipt!, name: name, onBack: () => setState(() => receipt = null));
    if (dues == null && error != null) return ErrorView(message: error.toString(), onRetry: load);
    final demands = ((dues?['demands'] as List?) ?? []).cast<Map>();
    final receipts = ((dues?['receipts'] as List?) ?? []).cast<Map>();
    final open = demands.where((d) => _openSt.contains(d['status'])).toList();
    final openTotal = open.fold<num>(0, (a, d) => a + _n(d['amount_due']) - _n(d['amount_paid']));
    final next = (open.toList()..sort((a, b) => '${a['due_date']}'.compareTo('${b['due_date']}'))).firstOrNull;
    final paid = receipts.fold<num>(0, (a, r) => a + _n(r['amount']));
    final shown = demands.where((d) => !(d['status'] == 'Waived' && _n(d['amount_due']) == 0)).toList();

    final stats = [
      _Stat(icon: LucideIcons.wallet, color: 'orange', label: 'Outstanding', value: Text(_inr(openTotal), style: open.any((x) => x['status'] == 'Overdue') ? const TextStyle(color: Color(0xFFA8211B)) : null), sub: next != null ? 'next due ${day(next['due_date'])}' : 'nothing due'),
      _Stat(icon: LucideIcons.receipt, color: 'brand', label: 'Paid so far', value: Text(_inr(paid)), sub: '${dues == null ? 0 : receipts.length} receipts'),
      _Stat(icon: LucideIcons.clock, color: 'indigo', label: 'Next due', value: next != null ? _Countdown(until: '${next['due_date']}', fontSize: 22) : const Text('—'), sub: next != null ? _forWhat(next) : 'all settled'),
    ];
    return RefreshIndicator(onRefresh: load, child: ListView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 16, 16, 90), children: [
      const PageHead('REG-02'),
      const SizedBox(height: 16),
      _grid2(stats),
      if (open.isNotEmpty) ...[
        const SizedBox(height: 14),
        KButton('Pay all ${_inr(openTotal)}', icon: LucideIcons.wallet, kind: BtnKind.accent, pill: true, large: true, block: true,
            onPressed: () => showPayAllSheet(context, demands: open, walletBalance: _n(wallet?['balance']), onDone: load)),
        const SizedBox(height: 6),
        const Text('All open fees in one payment: a receipt from the university portal, the wallet, or online.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: _muted)),
      ],
      const SizedBox(height: 24),
      WalletCard(wallet: wallet, onAddMoney: () => showPayAllSheet(context, demands: const [], walletBalance: _n(wallet?['balance']), onDone: load)),
      const SizedBox(height: 24),
      _Card(icon: LucideIcons.wallet, color: 'orange', title: 'Fee demands', subtitle: open.isNotEmpty ? '${open.length} to pay' : 'All paid',
          child: dues == null ? null : demands.isEmpty
              ? const Text('Fees appear once you apply for a room.', style: TextStyle(color: _muted))
              : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  for (var i = 0; i < shown.length; i++) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 12), child: _demandRow(shown[i])),
                ])),
      if (proofs.isNotEmpty) ...[
        const SizedBox(height: 24),
        _Card(icon: LucideIcons.fileCheck, color: 'brand', title: 'Uploaded receipts', subtitle: 'Checked by the Floor Warden, approved by the Chief Warden', child: ProofsList(proofs: proofs)),
      ],
      const SizedBox(height: 24),
      _Card(icon: LucideIcons.receipt, color: 'orange', title: 'Receipts', subtitle: 'Receipts are never edited; a refund is a new entry', flush: true,
          child: _ReceiptsTable(rows: receipts, loading: dues == null, onRow: (r) => setState(() => receipt = r))),
      const SizedBox(height: 24),
      const _Notice(tone: 'info', title: 'Online payment', body: 'Payments go through the university gateway (Razorpay). In development the Pay button confirms at once and issues the receipt.'),
    ]));
  }

  Widget _demandRow(Map d) {
    final due = _openSt.contains(d['status']);
    final amount = d['status'] == 'Paid' ? _n(d['amount_due']) : _n(d['amount_due']) - _n(d['amount_paid']);
    return Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, runSpacing: 8, children: [
      Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Text(_forWhat(d), style: const TextStyle(fontWeight: FontWeight.w600)),
        // Money: amount, then "Due <date>" and the status chip
        Text(_inrP(amount), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, letterSpacing: -.16, fontFeatures: [FontFeature.tabularFigures()])),
        const SizedBox(height: 4),
        Row(mainAxisSize: MainAxisSize.min, children: [
          Text('Due ${day(d['due_date'])}', style: const TextStyle(fontSize: 12, height: 16 / 12, color: _muted)),
          const SizedBox(width: 8), Pill.status(d['status']),
        ]),
      ]),
      due
          ? KButton('Pay ${_inr(_n(d['amount_due']) - _n(d['amount_paid']))}', icon: LucideIcons.wallet, kind: BtnKind.accent, pill: true, small: true,
              busy: paying == d['demand_id'], onPressed: () => _pay(d))
          : Pill.status(d['status']),
    ]);
  }
}

/// Two tiles a row on phones (klh-grid-3 of ui-stat at <= 640 px), equal heights per row.
Widget _grid2(List<Widget> items) => Column(children: [
      for (var i = 0; i < items.length; i += 2) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 10), child: IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Expanded(child: items[i]), const SizedBox(width: 10), Expanded(child: i + 1 < items.length ? items[i + 1] : const SizedBox()),
      ]))),
    ]);

/// klh-tile colours (background, ink).
const _tiles = {
  'orange': (Color(0xFFFFF1E7), Color(0xFFB4410F)), 'brand': (Color(0xFFE0F5F1), Color(0xFF08665E)), 'indigo': (Color(0xFFECF0FF), Color(0xFF3B5BDB)),
};

/// The compact stat tile (ui-stat, phone size).
class _Stat extends StatelessWidget {
  final IconData icon;
  final String color, label;
  final Widget value;
  final String? sub;
  const _Stat({required this.icon, required this.color, required this.label, required this.value, this.sub});
  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _tiles[color]!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: _uiLine), boxShadow: K.panelShadow),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 12.5, color: _muted))),
          const SizedBox(width: 8),
          Container(width: 26, height: 26, decoration: BoxDecoration(color: bg, shape: BoxShape.circle), child: Icon(icon, size: 15, color: fg)),
        ]),
        const SizedBox(height: 4),
        DefaultTextStyle.merge(style: const TextStyle(fontSize: 22, height: 28 / 22, fontWeight: FontWeight.w400, letterSpacing: -.44, color: K.ink, fontFeatures: [FontFeature.tabularFigures()]),
            child: Align(alignment: Alignment.centerLeft, child: FittedBox(fit: BoxFit.scaleDown, child: value))),
        if (sub != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text(sub!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, color: _muted))),
      ]),
    );
  }
}

/// klh-card with its head (40 px tile, 15 px title, 12 px subtitle). [flush] is the web's padding={0}: the head sits on the edge too.
class _Card extends StatelessWidget {
  final IconData? icon;
  final String color;
  final String? title, subtitle;
  final Widget? child;
  final bool flush;
  const _Card({this.icon, this.color = 'brand', this.title, this.subtitle, this.child, this.flush = false});
  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _tiles[color]!;
    return Container(
      clipBehavior: Clip.antiAlias,
      padding: flush ? EdgeInsets.zero : const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: _uiLine), boxShadow: K.panelShadow),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (title != null) Padding(padding: EdgeInsets.only(bottom: child == null ? 0 : 12), child: Row(children: [
          if (icon != null) ...[Container(width: 40, height: 40, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 20, color: fg)), const SizedBox(width: 12)],
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title!, style: const TextStyle(fontSize: 15, height: 22 / 15, fontWeight: FontWeight.w600)),
            if (subtitle != null) Text(subtitle!, style: const TextStyle(fontSize: 12, height: 16 / 12, color: _muted)),
          ])),
        ])),
        ?child,
      ]),
    );
  }
}

/// klh-notice: tinted box, icon, bold title, body, all in the tone's ink.
class _Notice extends StatelessWidget {
  final String tone, title, body;
  const _Notice({required this.tone, required this.title, required this.body});
  @override
  Widget build(BuildContext context) {
    final (bg, fg, icon) = switch (tone) {
      'warning' => (K.warnBg, K.warn, LucideIcons.triangleAlert), 'critical' => (K.badBg, K.bad, LucideIcons.triangleAlert),
      'success' => (K.goodBg, K.good, LucideIcons.check), 'progress' => (K.progressBg, K.progress, LucideIcons.info), _ => (K.infoBg, K.info, LucideIcons.info) };
    return Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(padding: const EdgeInsets.only(top: 2), child: Icon(icon, size: 18, color: fg)), const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 20 / 14, color: fg)),
            Text(body, style: TextStyle(fontSize: 14, height: 20 / 14, color: fg)),
          ])),
        ]));
  }
}

/// The time left until a date (klh-countdown): a pill in the tone of what is left, ticking every second; "Expired" once past.
class _Countdown extends StatefulWidget {
  final String until;
  final double fontSize;
  const _Countdown({required this.until, this.fontSize = 14});
  @override
  State<_Countdown> createState() => _CountdownState();
}

class _CountdownState extends State<_Countdown> {
  late final Timer _t;
  @override
  void initState() { super.initState(); _t = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {})); }
  @override
  void dispose() { _t.cancel(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    final s = widget.until;
    final until = (s.length == 10 ? DateTime.tryParse('${s}T00:00:00Z') : DateTime.tryParse(s)) ?? DateTime.now();
    var ms = until.difference(DateTime.now()).inMilliseconds;
    if (ms < 0) ms = 0;
    final (bg, fg) = ms < 3600e3 ? (K.badBg, K.bad) : ms < 6 * 3600e3 ? (K.warnBg, K.warn) : (K.infoBg, K.info);
    final hh = ms ~/ 3600000, mm = ms % 3600000 ~/ 60000, ss = ms % 60000 ~/ 1000;
    String p(int v) => v.toString().padLeft(2, '0');
    final txt = ms == 0 ? 'Overdue' : hh >= 24 ? '${hh ~/ 24}d ${hh % 24}h ${p(mm)}m' : '${hh}h ${p(mm)}m ${p(ss)}s';
    return Container(height: 32, padding: const EdgeInsets.symmetric(horizontal: 12), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(LucideIcons.clock, size: 16, color: fg), const SizedBox(width: 8),
          Text(txt, style: TextStyle(fontWeight: FontWeight.w700, fontSize: widget.fontSize, height: 1, color: fg, letterSpacing: 0, fontFeatures: const [FontFeature.tabularFigures()])),
        ]));
  }
}

/// The web DataTable at phone width: a search bar, each row stacked (cells one per line, the first bold), and the page foot.
class _ReceiptsTable extends StatefulWidget {
  final List<Map> rows;
  final bool loading;
  final ValueChanged<Map> onRow;
  const _ReceiptsTable({required this.rows, required this.loading, required this.onRow});
  @override
  State<_ReceiptsTable> createState() => _ReceiptsTableState();
}

class _ReceiptsTableState extends State<_ReceiptsTable> {
  String q = '';
  int page = 0;
  static const _size = 10;
  static const _keys = ['receipt_no', 'fee_head', 'amount', 'paid_on', 'payment_mode', 'gateway_status'];

  @override
  Widget build(BuildContext context) {
    final ql = q.toLowerCase();
    final filtered = q.isEmpty ? widget.rows : widget.rows.where((r) => _keys.any((k) => r[k] != null && '${r[k]}'.toLowerCase().contains(ql))).toList();
    final pages = (filtered.length / _size).ceil().clamp(1, 1 << 30);
    final view = filtered.skip(page * _size).take(_size).toList();
    const foot = TextStyle(fontSize: 13, color: _muted);
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: K.line),
          boxShadow: const [BoxShadow(color: Color(0x0A101828), blurRadius: 2, offset: Offset(0, 1)), BoxShadow(color: Color(0x0F101828), blurRadius: 14, offset: Offset(0, 4))]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(padding: const EdgeInsets.fromLTRB(16, 16, 16, 24), decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: K.line))),
            child: SizedBox(height: 40, child: TextField(
              onChanged: (v) => setState(() { q = v; page = 0; }),
              style: const TextStyle(fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Search', filled: true, fillColor: const Color(0xFFEEF1F7), isDense: true, contentPadding: const EdgeInsets.symmetric(vertical: 10),
                prefixIcon: const Icon(LucideIcons.search, size: 16, color: _muted), prefixIconConstraints: const BoxConstraints(minWidth: 36),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: K.brand)),
              ),
            ))),
        if (widget.loading)
          const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
        else if (view.isEmpty)
          Padding(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14), child: Align(alignment: Alignment.centerLeft, child: IntrinsicWidth(child: q.isNotEmpty
              ? _EmptyState(icon: LucideIcons.search, title: 'No matches for “$q”', body: 'Try a different name, ID or room number.')
              : const _EmptyState(icon: LucideIcons.receipt, title: 'No receipts yet'))))
        else
          PhoneTable(labels: const ['Receipt', 'For', 'Amount', 'Paid on', 'Mode', 'Status'], onRow: (i) => widget.onRow(view[i]), rows: [
            for (final r in view) [
              Text('${r['receipt_no']}', style: K.mono(size: 13, color: K.ink).copyWith(letterSpacing: -.13)),
              Text(_forWhat(r)),
              Text(_inrP(r['amount']), style: const TextStyle(fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()])),
              Text(dayTime(r['paid_on'])),
              Text('${r['payment_mode']}${r['gateway_ref'] != null ? ' · ${r['gateway_ref']}' : ''}'),
              Pill.status(r['gateway_status']),
            ],
          ]),
        Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), decoration: const BoxDecoration(border: Border(top: BorderSide(color: K.line))),
            child: Row(children: [
              Expanded(child: Text(widget.loading ? 'Loading…' : filtered.isNotEmpty ? '${page * _size + 1}–${(page * _size + _size).clamp(0, filtered.length)} of ${filtered.length}' : '0 results', style: foot)),
              _iconBtn(LucideIcons.chevronLeft, 'Previous page', page == 0 ? null : () => setState(() => page--)),
              const SizedBox(width: 8),
              Text('Page ${page + 1} of $pages', style: foot),
              const SizedBox(width: 8),
              _iconBtn(LucideIcons.chevronRight, 'Next page', page >= pages - 1 ? null : () => setState(() => page++)),
            ])),
      ]),
    );
  }


  Widget _iconBtn(IconData icon, String label, VoidCallback? onTap) => Semantics(button: true, label: label, child: Opacity(opacity: onTap == null ? .4 : 1,
      child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(10), child: SizedBox(width: 36, height: 36, child: Icon(icon, size: 18, color: _muted)))));
}

/// klh-empty: the tinted icon square with its halo, a title and a line.
class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? body;
  const _EmptyState({required this.icon, required this.title, this.body});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48), child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 64, height: 64, decoration: BoxDecoration(color: K.progressBg, borderRadius: BorderRadius.circular(20), boxShadow: const [BoxShadow(color: Color(0x73E0F5F1), spreadRadius: 8)]),
            child: Icon(icon, size: 28, color: K.brandInk)),
        const SizedBox(height: 16),
        Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 17, height: 24 / 17, fontWeight: FontWeight.w700)),
        if (body != null) Padding(padding: const EdgeInsets.only(top: 8, bottom: 8), child: Text(body!, textAlign: TextAlign.center, style: const TextStyle(color: _muted))),
      ]));
}

/// The printable receipt (ReceiptPrint): back and download on top, then the receipt card.
class _ReceiptPrint extends StatelessWidget {
  final Map r;
  final String? name;
  final VoidCallback onBack;
  const _ReceiptPrint({required this.r, required this.name, required this.onBack});
  @override
  Widget build(BuildContext context) {
    final rows = <(String, Widget)>[
      ('Received from', Text('${titleCase(name)} ($me)')),
      ('Towards', Text(_forWhat(r))),
      ('Amount', Text(_inrP(r['amount']), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, fontFeatures: [FontFeature.tabularFigures()]))),
      ('Paid on', Text(dayTime(r['paid_on']))),
      ('Mode', Text('${r['payment_mode']}${r['gateway_ref'] != null ? ' · ref ${r['gateway_ref']}' : ''}${r['collected_by'] != null ? ' · collected by ${r['collected_by']}' : ''}')),
      ('Status', Align(alignment: Alignment.centerLeft, child: Pill.status(r['gateway_status']))),
    ];
    return ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 90), children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        KButton('Back to fees', icon: LucideIcons.chevronLeft, kind: BtnKind.ghost, onPressed: onBack),
        // ponytail: no print plugin in the app; the web prints to PDF here. Add the `printing` package to make this a real PDF.
        KButton('Download / print', icon: LucideIcons.download, onPressed: () => toast(context, 'Printing is not available in the app yet. Take a screenshot to keep this receipt.')),
      ]),
      const SizedBox(height: 16),
      _Card(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(padding: const EdgeInsets.only(bottom: 12), decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: K.line))),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Flexible(child: KlLogo(height: 52, full: true)),
              const SizedBox(width: 8),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                const Text('Fee receipt', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _muted)),
                Text('${r['receipt_no']}', style: K.mono(size: 18, weight: FontWeight.w700, color: K.ink)),
              ]),
            ])),
        const SizedBox(height: 16),
        for (var i = 0; i < rows.length; i++) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 10), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 140, child: Text(rows[i].$1, style: const TextStyle(fontSize: 13.5, color: _muted))),
          const SizedBox(width: 16),
          Expanded(child: DefaultTextStyle.merge(style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w500), child: rows[i].$2)),
        ])),
        const SizedBox(height: 24),
        const Text('Computer-generated receipt of KL University Hostels. The registration fee is not refundable. Hostel and mess fees are refundable only as per the vacating rules.',
            style: TextStyle(fontSize: 12, color: _muted)),
      ])),
    ]);
  }
}
