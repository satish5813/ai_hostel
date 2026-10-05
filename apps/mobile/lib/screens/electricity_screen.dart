import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

/// ELE-01 My electricity, as pages/student/Electricity.tsx: tariff and low-balance notices, this month (ring and usage meter),
/// the recharge form (slider, presets, amount, Pay), recharges, use by month (bar chart) and my share of the room's bill.
class ElectricityScreen extends StatefulWidget {
  const ElectricityScreen({super.key});
  @override
  State<ElectricityScreen> createState() => _ElectricityScreenState();
}

const _muted = K.ink2; // --ink-muted
const _uiLine = Color(0xCCE3E7F0); // --ui-line
const _grid = Color(0xFFE8ECF3); // --chart-grid
num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
/// A number as JavaScript prints it: 60, 43.53.
String _js(num v) => v == v.roundToDouble() ? v.toInt().toString() : v.toString();
/// formatINR(n): whole rupees.
String _inr(num v) => inr(v.round());
String _roomLabel(dynamic id) => '${id ?? ''}'.replaceFirst(RegExp(r'^H-'), '');

class _ElectricityScreenState extends State<ElectricityScreen> {
  Map? d;
  Map? bills;
  bool failed = false;
  int amount = 200;
  bool busy = false;
  final _amountCtl = TextEditingController(text: '200');

  @override
  void initState() { super.initState(); load(); }
  @override
  void dispose() { _amountCtl.dispose(); super.dispose(); }

  Future<void> load() async {
    api.get('/me/electricity-bills').then((b) { if (mounted) setState(() => bills = b as Map?); }, onError: (_) {});
    try {
      final m = await api.get('/meters/mine');
      if (mounted) setState(() { d = m as Map; failed = false; });
    } catch (_) {
      if (mounted) setState(() => failed = true);
    }
  }

  void _set(int v, {bool fromField = false}) {
    setState(() => amount = v);
    if (!fromField) _amountCtl.text = '$v';
  }

  Future<void> _recharge(num rate) async {
    setState(() => busy = true);
    try {
      final r = await api.post('/meters/${d!['meter_id']}/recharge', {'amount': amount});
      if (r is Map && (r['order'] as Map?)?['mode'] == 'dev') {
        await api.post('/payments/dev-confirm', {'demand_id': (r['demand'] as Map)['demand_id'], 'amount': amount});
      }
      await load();
      if (mounted) toast(context, 'Recharged ${(amount / rate).toStringAsFixed(1)} units');
    } catch (e) {
      if (mounted) toast(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Widget _page(List<Widget> children) => RefreshIndicator(onRefresh: load, child: ListView(physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 90), children: [for (var i = 0; i < children.length; i++) ...[if (i > 0) SizedBox(height: i == 1 ? 16 : 24), children[i]]]));

  @override
  Widget build(BuildContext context) {
    if (failed) {
      return _page(const [PageHead('ELE-01'), _Card(flush: true, child: _EmptyState(icon: LucideIcons.zap, title: 'No meter is linked to you yet', body: 'Your room meter is linked when you check in.'))]);
    }
    if (d == null) return const SizedBox.shrink();
    final m = d!;
    final used = _n(m['units_this_month']), included = _n(m['included_units_per_month']), recharged = _n(m['recharged_this_month']), left = _n(m['units_left']), rate = _n(m['rate_per_unit']);
    final recharges = ((m['recharges'] as List?) ?? []).cast<Map>();
    final monthly = ((m['monthly'] as List?) ?? []).cast<Map>();
    final perUnit = rate > 0 ? ' for ${(amount / rate).toStringAsFixed(1)} units' : '';
    return _page([
      PageHead('ELE-01', subtitle: 'Room ${_roomLabel(m['space_id'])} · meter ${m['meter_no']} · ${_js(included)} units a month are included in your fee.'),
      if (rate == 0) const _Notice(tone: 'warning', title: 'No approved tariff', body: 'The electricity tariff for your room type has not been approved yet, so balance and recharge are not available.'),
      if (rate > 0 && left < 10) _Notice(tone: 'critical', title: 'Low balance', body: 'Only ${left.toStringAsFixed(0)} units left this month. Recharge to avoid a cut-off.'),
      _Card(icon: LucideIcons.zap, title: 'This month', subtitle: 'Last reading ${m['last_reading']} kWh, ${dayTime(m['last_reading_at'])}',
          child: Row(children: [
            _Ring(value: math.max(left, 0), max: math.max(included + recharged, 1), color: left < 10 ? const Color(0xFFC4302B) : const Color(0xFF1A7F4B), label: left.toStringAsFixed(0), sublabel: 'units left'),
            const SizedBox(width: 24),
            Expanded(child: _UsageMeter(used: used, included: included, footnote: '${recharged.toStringAsFixed(0)} units recharged · ${_inr(rate)} per extra unit')),
          ])),
      _Card(icon: LucideIcons.wallet, title: 'Recharge', subtitle: 'Paid online; credited to the meter immediately', child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _AmountSlider(value: amount, rate: rate, onChanged: _set),
        const SizedBox(height: 20),
        const Text('Or type an amount', style: TextStyle(fontSize: 13, height: 18 / 13, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        SizedBox(height: 40, child: TextField(
          controller: _amountCtl, keyboardType: TextInputType.number, style: const TextStyle(fontSize: 14),
          onChanged: (v) => _set(int.tryParse(v.trim()) ?? 0, fromField: true),
          decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
        )),
        const SizedBox(height: 20),
        Align(alignment: Alignment.centerLeft, child: _Blocked(reason: rate == 0 ? 'No approved tariff yet.' : null,
            child: KButton('Pay ${_inr(amount)}$perUnit', icon: LucideIcons.wallet, kind: BtnKind.accent, pill: true, large: true, busy: busy,
                onPressed: rate == 0 ? null : () => _recharge(rate)))),
      ])),
      _Card(icon: LucideIcons.clock, title: 'Recharges', flush: true, child: recharges.isEmpty
          ? const Center(child: _EmptyState(icon: LucideIcons.zap, title: 'No recharges yet'))
          : _Rows([for (final r in recharges) [Text(dayTime(r['created_at'])), Text(_n(r['units_credited']).toStringAsFixed(1)), Pill.status(r['status'])]], const ['When', 'Units', 'Status'])),
      _Card(icon: LucideIcons.gauge, title: 'Use by month', subtitle: 'Against the ${_js(included)}-unit allowance', child: monthly.isEmpty
          ? const Text('The first monthly summary arrives on the 1st.', style: TextStyle(color: _muted))
          : _BarChart(
              data: [for (final r in monthly.reversed) (_monthShort(r['usage_month']), _n(r['units_used']), _n(r['excess_units']) > 0)],
              limit: included, limitLabel: 'Included')),
      if (bills != null && ((bills!['bills'] as List?) ?? []).isNotEmpty) _roomBills(bills!),
    ]);
  }

  /// MyRoomBills: the room's monthly bill and this student's equal share of it.
  Widget _roomBills(Map b) {
    final list = (b['bills'] as List).cast<Map>();
    final totals = b['totals'] as Map;
    final due = _n(totals['due']);
    return _Card(icon: LucideIcons.receipt, title: "My share of the room's bill", flush: true,
        subtitle: 'Units your room used beyond the included ${_js(_n(list[0]['included']))} and any recharges, shared equally with your roommates. All electricity so far: ${_inr(_n(totals['billed']))} billed, ${_inr(_n(totals['paid']))} paid.',
        action: due > 0 ? KButton('Pay ${_inr(due)}', icon: LucideIcons.wallet, kind: BtnKind.accent, pill: true, onPressed: () => openPlace(context, 'fees')) : null,
        child: _Rows([
          for (final x in list) () {
            final paid = _n(x['paid']) >= _n(x['amount']);
            final share = _n(x['share_pct']), days = _n(x['days']);
            final st = paid ? 'Paid' : x['overdue'] == true ? 'Overdue' : 'Pending';
            return <Widget>[
              Text(_monthLong(x['month'])),
              Text(_js(_n(x['room_units']))),
              Text('${_js(_n(x['billable']))} × ${_inr(_n(x['rate']))}'),
              Text(_inr(_n(x['room_amount']))),
              Text('${x['roommates'] ?? 'No one: you alone'}${share < 100 ? ' · your share ${_js(share)}%' : ''}${days < 28 ? ' (${_js(days)} days)' : ''}'),
              Text(_inr(_n(x['amount'])), style: const TextStyle(fontWeight: FontWeight.w700)),
              Pill(paid ? 'Paid' : x['overdue'] == true ? 'Overdue' : 'To pay', tone: Pill.toneOf(st)),
            ];
          }(),
        ], const ['Month', 'Room units', 'Billed units × rate', 'Room bill', 'Shared with', 'My share', 'Status']));
  }
}

const _months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/// en-IN short month, as the browser prints it ("Sept" for September).
String _monthShort(dynamic iso) {
  final m = DateTime.tryParse('$iso')?.month ?? 1;
  return m == 9 ? 'Sept' : _months[m - 1].substring(0, 3);
}
String _monthLong(dynamic ym) {
  final p = '$ym'.split('-');
  return p.length < 2 ? '$ym' : '${_months[(int.tryParse(p[1]) ?? 1) - 1]} ${p[0]}';
}

const _amber = (Color(0xFFFFF6D6), Color(0xFF8F5C00)); // klh-tile-amber

/// klh-card with its head (40 px amber tile, 15 px title, 12 px subtitle, an action on the right). [flush] = padding={0}.
class _Card extends StatelessWidget {
  final IconData? icon;
  final String? title, subtitle;
  final Widget? action;
  final Widget child;
  final bool flush;
  const _Card({this.icon, this.title, this.subtitle, this.action, required this.child, this.flush = false});
  @override
  Widget build(BuildContext context) => Container(
        clipBehavior: Clip.antiAlias,
        padding: flush ? EdgeInsets.zero : const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: _uiLine), boxShadow: K.panelShadow),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (title != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Row(children: [
            if (icon != null) ...[Container(width: 40, height: 40, decoration: BoxDecoration(color: _amber.$1, borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 20, color: _amber.$2)), const SizedBox(width: 12)],
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title!, style: const TextStyle(fontSize: 15, height: 22 / 15, fontWeight: FontWeight.w600)),
              if (subtitle != null) Text(subtitle!, style: const TextStyle(fontSize: 12, height: 16 / 12, color: _muted)),
            ])),
            if (action != null) ...[const SizedBox(width: 12), action!],
          ])),
          child,
        ]),
      );
}

/// klh-table at phone width: each row a block, cells one per line (no labels: the web table has none), the first cell bold.
class _Rows extends StatelessWidget {
  final List<List<Widget>> rows;
  final List<String> labels;
  const _Rows(this.rows, this.labels);
  @override
  Widget build(BuildContext context) => PhoneTable(labels: labels, rows: rows);
}

/// klh-notice.
class _Notice extends StatelessWidget {
  final String tone, title, body;
  const _Notice({required this.tone, required this.title, required this.body});
  @override
  Widget build(BuildContext context) {
    final (bg, fg) = tone == 'critical' ? (K.badBg, K.bad) : (K.warnBg, K.warn);
    return Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(padding: const EdgeInsets.only(top: 2), child: Icon(LucideIcons.triangleAlert, size: 18, color: fg)), const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 20 / 14, color: fg)),
            Text(body, style: TextStyle(fontSize: 14, height: 20 / 14, color: fg)),
          ])),
        ]));
  }
}

/// klh-empty.
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

/// "Explain every no": a disabled button with its reason in a small grey line under it (klh-btn-reason).
class _Blocked extends StatelessWidget {
  final String? reason;
  final Widget child;
  const _Blocked({required this.reason, required this.child});
  @override
  Widget build(BuildContext context) => reason == null ? child : ConstrainedBox(constraints: const BoxConstraints(maxWidth: 340), child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        child,
        const SizedBox(height: 6),
        Row(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          const Padding(padding: EdgeInsets.only(top: 1), child: Icon(LucideIcons.lock, size: 14, color: _muted)), const SizedBox(width: 4),
          Flexible(child: Text(reason!, style: const TextStyle(fontSize: 12, height: 16 / 12, color: _muted))),
        ]),
      ]));
}

/// ProgressRing: 104 px, 10 px stroke, the value arc from the top, the number and its label in the middle.
class _Ring extends StatelessWidget {
  final num value, max;
  final Color color;
  final String label, sublabel;
  const _Ring({required this.value, required this.max, required this.color, required this.label, required this.sublabel});
  @override
  Widget build(BuildContext context) => Semantics(label: '$label units left', child: SizedBox(width: 104, height: 104, child: CustomPaint(
      painter: _RingPainter((value / max).clamp(0, 1).toDouble(), color),
      child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(label, style: const TextStyle(fontSize: 22, height: 26 / 22, fontWeight: FontWeight.w800, fontFeatures: [FontFeature.tabularFigures()])),
        Text(sublabel, style: const TextStyle(fontSize: 11, height: 14 / 11, fontWeight: FontWeight.w600, color: _muted)),
      ])))));
}

class _RingPainter extends CustomPainter {
  final double pct;
  final Color color;
  _RingPainter(this.pct, this.color);
  @override
  void paint(Canvas c, Size s) {
    final rect = Rect.fromLTWH(5, 5, s.width - 10, s.height - 10);
    c.drawArc(rect, 0, math.pi * 2, false, Paint()..color = _grid..style = PaintingStyle.stroke..strokeWidth = 10);
    if (pct > 0) c.drawArc(rect, -math.pi / 2, math.pi * 2 * pct, false, Paint()..color = color..style = PaintingStyle.stroke..strokeWidth = 10..strokeCap = StrokeCap.round);
  }
  @override
  bool shouldRepaint(_RingPainter o) => o.pct != pct || o.color != color;
}

/// UsageMeter: label and "used / included kWh", a 12 px bar (teal-to-blue, yellow-coral from 80 %, red when over), the footnote.
class _UsageMeter extends StatelessWidget {
  final num used, included;
  final String footnote;
  const _UsageMeter({required this.used, required this.included, required this.footnote});
  @override
  Widget build(BuildContext context) {
    final inc = included == 0 ? 1 : included;
    final pct = math.min(100, used / inc * 100);
    final Gradient fill = used > inc
        ? const LinearGradient(colors: [Color(0xFFC4302B), Color(0xFFC4302B)])
        : pct >= 80 ? const LinearGradient(colors: [K.sun, K.ember]) : const LinearGradient(colors: [K.brand, Color(0xFF1971C2)]);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Wrap(alignment: WrapAlignment.spaceBetween, spacing: 8, children: [
        const Text('Units used this month', style: TextStyle(fontSize: 13, height: 18 / 13, fontWeight: FontWeight.w600, color: _muted)),
        Text('${_js(used)} / ${_js(inc)} kWh', style: const TextStyle(fontWeight: FontWeight.w600, fontFeatures: [FontFeature.tabularFigures()])),
      ]),
      const SizedBox(height: 8),
      Container(height: 12, clipBehavior: Clip.antiAlias, decoration: BoxDecoration(color: _grid, borderRadius: BorderRadius.circular(999)),
          child: FractionallySizedBox(alignment: Alignment.centerLeft, widthFactor: pct / 100,
              child: DecoratedBox(decoration: BoxDecoration(gradient: fill, borderRadius: BorderRadius.circular(999))))),
      const SizedBox(height: 8),
      Text(footnote, style: const TextStyle(fontSize: 12, height: 16 / 12, color: _muted)),
    ]);
  }
}

/// The KLH Slider: label and value, the units caption, an 8 px track with a ringed thumb, the ends, and the preset chips.
class _AmountSlider extends StatelessWidget {
  final int value;
  final num rate;
  final void Function(int) onChanged;
  const _AmountSlider({required this.value, required this.rate, required this.onChanged});
  @override
  Widget build(BuildContext context) {
    const marks = TextStyle(fontSize: 12, color: _muted);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
        const Text('Amount', style: TextStyle(fontSize: 13, height: 18 / 13, fontWeight: FontWeight.w600)),
        Text(_inr(value), style: const TextStyle(fontSize: 22, height: 28 / 22, fontWeight: FontWeight.w800, color: K.brandInk, fontFeatures: [FontFeature.tabularFigures()])),
      ]),
      const SizedBox(height: 8),
      Text(rate > 0 ? '${(value / rate).toStringAsFixed(1)} units' : '', style: const TextStyle(fontSize: 12, height: 16 / 12, color: _muted)),
      const SizedBox(height: 8),
      SliderTheme(
        data: SliderThemeData(
          trackHeight: 8, activeTrackColor: K.brand, inactiveTrackColor: _grid, trackShape: const RoundedRectSliderTrackShape(),
          thumbShape: const _Thumb(), overlayShape: SliderComponentShape.noOverlay, tickMarkShape: SliderTickMarkShape.noTickMark,
          showValueIndicator: ShowValueIndicator.never, padding: const EdgeInsets.symmetric(horizontal: 11),
        ),
        child: SizedBox(height: 22, child: Slider(value: value.clamp(50, 1000).toDouble(), min: 50, max: 1000, divisions: 19, onChanged: (v) => onChanged(v.round()))),
      ),
      const SizedBox(height: 8),
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text(_inr(50), style: marks), Text(_inr(1000), style: marks)]),
      const SizedBox(height: 8),
      Wrap(spacing: 8, runSpacing: 8, children: [for (final p in const [100, 200, 500]) _FilterChip(_inr(p), value == p, () => onChanged(p))]),
    ]);
  }
}

class _Thumb extends SliderComponentShape {
  const _Thumb();
  @override
  Size getPreferredSize(bool isEnabled, bool isDiscrete) => const Size(22, 22);
  @override
  void paint(PaintingContext context, Offset center, {required Animation<double> activationAnimation, required Animation<double> enableAnimation, required bool isDiscrete,
      required TextPainter labelPainter, required RenderBox parentBox, required SliderThemeData sliderTheme, required TextDirection textDirection,
      required double value, required double textScaleFactor, required Size sizeWithOverflow}) {
    final c = context.canvas;
    c.drawCircle(center.translate(0, 6), 11, Paint()..color = const Color(0x520B7A71)..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8));
    c.drawCircle(center, 11, Paint()..color = Colors.white);
    c.drawCircle(center, 9.5, Paint()..color = K.brand..style = PaintingStyle.stroke..strokeWidth = 3);
  }
}

/// klh-fchip: a 32 px pill; selected is teal with a tick.
class _FilterChip extends StatelessWidget {
  final String label;
  final bool on;
  final VoidCallback onTap;
  const _FilterChip(this.label, this.on, this.onTap);
  @override
  Widget build(BuildContext context) => Semantics(button: true, selected: on, child: Material(color: on ? K.brand : Colors.white, shape: StadiumBorder(side: BorderSide(color: on ? K.brand : K.control)),
      child: InkWell(onTap: onTap, customBorder: const StadiumBorder(), child: Container(height: 32, padding: const EdgeInsets.symmetric(horizontal: 12), child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (on) ...[const Icon(LucideIcons.check, size: 14, color: Colors.white), const SizedBox(width: 6)],
        Text(label, style: TextStyle(fontSize: 13, height: 1, fontWeight: FontWeight.w600, color: on ? Colors.white : K.ink)),
      ])))));
}

/// The KLH BarChart, drawn in its 560 x 220 viewBox and scaled to the card width like the web SVG.
class _BarChart extends StatelessWidget {
  final List<(String, num, bool)> data;
  final num limit;
  final String limitLabel;
  const _BarChart({required this.data, required this.limit, required this.limitLabel});
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, c) => SizedBox(width: c.maxWidth, height: c.maxWidth * 220 / 560,
      child: Semantics(label: 'Units used by month', child: CustomPaint(painter: _BarPainter(data, limit, limitLabel)))));
}

class _BarPainter extends CustomPainter {
  final List<(String, num, bool)> data;
  final num limit;
  final String limitLabel;
  _BarPainter(this.data, this.limit, this.limitLabel);

  void _text(Canvas c, String s, double x, double y, TextStyle st, {bool end = false}) {
    final tp = TextPainter(text: TextSpan(text: s, style: st), textDirection: TextDirection.ltr)..layout();
    // y is the SVG baseline
    tp.paint(c, Offset(end ? x - tp.width : x - tp.width / 2, y - tp.computeDistanceToActualBaseline(TextBaseline.alphabetic)));
  }

  @override
  void paint(Canvas canvas, Size size) {
    const w = 560.0, h = 220.0, pl = 36.0, pb = 26.0, pt = 18.0;
    canvas.save();
    canvas.scale(size.width / w);
    final values = [for (final d in data) d.$2.toDouble()];
    final mx = ([...values, limit.toDouble()].reduce(math.max) * 1.15).toDouble();
    final top = mx == 0 ? 1.0 : mx;
    final step = (w - pl) / data.length, bw = math.min(36.0, step * .56);
    const axis = TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: _muted);
    for (var t = 0; t <= 4; t++) {
      final y = pt + (h - pt - pb) * (1 - t / 4);
      canvas.drawLine(Offset(pl, y), Offset(w, y), Paint()..color = _grid..strokeWidth = 1);
      _text(canvas, '${(top * t / 4).round()}', pl - 8, y + 4, axis, end: true);
    }
    for (var i = 0; i < data.length; i++) {
      final (label, v, hi) = data[i];
      final bh = (h - pt - pb) * v / top, x = pl + i * step + (step - bw) / 2, y = h - pb - bh;
      final r = Rect.fromLTWH(x, y, bw, math.max(bh, 1));
      final over = limit > 0 && v > limit;
      final paint = Paint();
      if (over) {
        paint.color = const Color(0xFFC4302B);
      } else {
        paint.shader = LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: hi ? const [K.sun, K.ember] : const [Color(0xFF1971C2), K.brand]).createShader(r);
      }
      canvas.drawRRect(RRect.fromRectAndRadius(r, Radius.circular(math.min(8, bw / 3))), paint);
      _text(canvas, _js(v), x + bw / 2, y - 6, const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: K.ink));
      _text(canvas, label, x + bw / 2, h - 8, axis);
    }
    if (limit > 0) {
      final ly = pt + (h - pt - pb) * (1 - limit / top);
      final p = Paint()..color = const Color(0xFFC4302B)..strokeWidth = 1.5;
      for (var x = pl; x < w; x += 8) { canvas.drawLine(Offset(x, ly), Offset(math.min(x + 4, w), ly), p); }
      _text(canvas, limitLabel, w, ly - 6, const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: K.bad), end: true);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(_BarPainter o) => true;
}
