import 'package:flutter/material.dart';
import 'package:intl/intl.dart' show DateFormat;
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import 'mess_menu_screen.dart';

// health.css tokens
const _ink2 = Color(0xFF475467), _ink3 = Color(0xFF667085), _line = Color(0xFFE4E8EF), _tint = Color(0xFFE6F4F1);
const _bad = Color(0xFFB42318), _badBg = Color(0xFFFEF3F2), _badLine = Color(0xFFFECDCA);
const _low = Color(0xFF1D4ED8), _lowBg = Color(0xFFEFF4FF), _lowLine = Color(0xFFC7D7FE);
const _flag = {
  'L': ('Low', 'L', false, false), 'LL': ('Very low', 'LL', false, true), 'H': ('High', 'H', true, false),
  'HH': ('Very high', 'HH', true, true), 'A': ('Abnormal', '*', true, false),
};
String _mon(DateTime d) => d.month == 9 ? 'Sept' : DateFormat('MMM').format(d);
/// en-IN date and time: "20 Sept 2026, 07:30 am".
String _dt(dynamic s) { final d = parseDate(s); return d == null ? '—' : '${DateFormat('dd').format(d)} ${_mon(d)} ${d.year}, ${DateFormat('hh:mm a').format(d).toLowerCase()}'; }
num? _num(dynamic v) => v == null ? null : num.tryParse('$v');
String _fmt(dynamic v, int dec) { final n = _num(v); return n == null ? '' : n.toStringAsFixed(dec); }
String _interval(Map r) {
  final dec = (_num(r['decimals']) ?? 0).toInt();
  if (r['normal_text'] != null) return '${r['normal_text']}';
  if (r['low'] != null && r['high'] != null) return '${_fmt(r['low'], dec)} – ${_fmt(r['high'], dec)}';
  if (r['high'] != null) return '< ${_fmt(r['high'], dec)}';
  if (r['low'] != null) return '> ${_fmt(r['low'], dec)}';
  return '—';
}

/// HLT-03 My health (pages/health/MyHealth.tsx): the student's health reports, latest first, each in the
/// laboratory-report layout with suggestions.
class HealthScreen extends StatefulWidget {
  const HealthScreen({super.key});
  @override
  State<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends State<HealthScreen> {
  int? sel;

  @override
  Widget build(BuildContext context) => ApiView(path: '/me/health', builder: (context, data, reload) {
        final list = ((data as List?) ?? []).cast<Map>();
        final id = sel ?? list.firstOrNull?['report_id'] as int?;
        return MnPage(children: [
          const MnHead(icon: LucideIcons.heartPulse, title: 'My health',
              sub: "From the gym's health equipment and the laboratory. Your Floor Manager, Warden, the Gym Manager and the Dean can see it."),
          if (list.isEmpty) const MnPanel(children: [MnEmpty('No health report yet. Your first check-up at the gym appears here.')]),
          if (list.length > 1) Wrap(spacing: 8, runSpacing: 8, children: [
            for (final x in list) Builder(builder: (_) {
              final d = parseDate(x['collected_at'])!;
              final out = (_num(x['out_of_range']) ?? 0).toInt();
              return MnPreset('${d.day} ${_mon(d)} ${d.year}', x['report_id'] == id, () => setState(() => sel = x['report_id'] as int), sub: out > 0 ? '$out to watch' : 'All in range');
            }),
          ]),
          if (id != null) _Report(key: ValueKey(id), id: id),
        ]);
      });
}

/// HLT-02 health report (pages/health/HealthReport.tsx), the phone layout: unit and previous columns hidden.
class _Report extends StatefulWidget {
  final int id;
  const _Report({super.key, required this.id});
  @override
  State<_Report> createState() => _ReportState();
}

class _ReportState extends State<_Report> {
  Map? data;
  Object? error;

  @override
  void initState() {
    super.initState();
    Api.instance.get('/health/reports/${widget.id}').then((d) { if (mounted) setState(() => data = d as Map); }, onError: (e) { if (mounted) setState(() => error = e); });
  }

  @override
  Widget build(BuildContext context) {
    if (error != null || data == null) {
      return Padding(padding: const EdgeInsets.symmetric(vertical: 40), child: Text(error?.toString() ?? 'Loading the report…', textAlign: TextAlign.center, style: const TextStyle(color: _ink3)));
    }
    final h = data!['report'] as Map;
    final results = ((data!['results'] as List?) ?? []).cast<Map>();
    final advice = ((data!['advice'] as List?) ?? []).cast<Map>();
    final views = ((data!['views'] as List?) ?? []).cast<Map>();
    final panels = <String>{for (final x in results) '${x['panel_code']}'}.toList();
    final flagged = results.where((x) => _flag.containsKey(x['flag'])).toList();
    List<Map> area(String a) => advice.where((x) => x['area'] == a).toList();
    final doctor = area('Doctor'), food = area('Food'), act = area('Activity');
    final dob = parseDate(h['date_of_birth']);
    final age = dob == null ? '—' : '${(DateTime.now().difference(dob).inMilliseconds / (365.25 * 864e5)).floor()}';
    final name = '${h['name']}';
    final source = '${h['source'] == 'Device' ? 'Gym equipment' : h['source']}${h['device_ref'] != null ? ' · ${h['device_ref']}' : ''}${h['lab_name'] != null ? ' · ${h['lab_name']}' : ''}';

    return Semantics(label: 'Health report ${h['report_no']}', child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 18),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: _line),
          boxShadow: const [BoxShadow(color: Color(0x0A101828), blurRadius: 2, offset: Offset(0, 1)), BoxShadow(color: Color(0x40101828), blurRadius: 30, spreadRadius: -22, offset: Offset(0, 10))]),
      child: DefaultTextStyle.merge(style: const TextStyle(fontSize: 14, color: K.ink), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        // head
        Container(padding: const EdgeInsets.only(bottom: 14), decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: K.brand, width: 3))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const KlLogo(height: 40), const SizedBox(width: 12),
                const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('KL Residencies', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700, color: K.brand)),
                  Text('Student Health and Fitness Centre', style: TextStyle(fontSize: 12, color: _ink3)),
                ])),
              ]),
              const SizedBox(height: 16),
              const Text('HEALTH REPORT', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: .4)),
              Text('${h['report_no']}', style: K.mono(size: 13, weight: FontWeight.w500, color: _ink3)),
            ])),
        const SizedBox(height: 18),
        // patient
        Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(14), border: Border.all(color: _line)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              ClipRRect(borderRadius: BorderRadius.circular(16), child: h['photo'] != null
                  ? Image.network('${h['photo']}', width: 96, height: 96, fit: BoxFit.cover)
                  : Container(width: 96, height: 96, alignment: Alignment.center, color: _tint,
                      child: Text(name.split(' ').where((w) => w.isNotEmpty).map((w) => w[0]).take(2).join(), style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: K.brand)))),
              const SizedBox(height: 20),
              LayoutBuilder(builder: (context, box) {
                final cw = (box.maxWidth - 18) / 2;
                Widget item(String dt, Widget dd) => SizedBox(width: cw, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(dt.toUpperCase(), style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, letterSpacing: .575, color: _ink3)),
                  const SizedBox(height: 2), dd,
                ]));
                return Wrap(spacing: 18, runSpacing: 10, children: [
                  item('Name', Text(name, style: const TextStyle(fontWeight: FontWeight.w700))),
                  item('Student ID', Text('${h['student_id']}', style: K.mono(size: 14, weight: FontWeight.w700, color: K.ink))),
                  item('Age / Gender', Text('$age years / ${h['gender']}')),
                  item('Blood group', Text('${h['blood_group'] ?? '—'}')),
                  item('Programme', Text('${h['programme']}')),
                  item('Residency / Room', Text('${h['hostel_name'] ?? '—'}${h['bed_label'] != null ? ' · ${h['bed_label']}' : ''}')),
                  item('Collected', Text(_dt(h['collected_at']))),
                  item('Reported', Text(_dt(h['reported_at']))),
                  item('Source', Text(source)),
                ]);
              }),
            ])),
        const SizedBox(height: 18),
        // summary
        Builder(builder: (_) {
          final ok = flagged.isEmpty;
          final fg = ok ? const Color(0xFF067647) : _bad;
          return Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(color: ok ? const Color(0xFFECFDF3) : _badBg, borderRadius: BorderRadius.circular(12), border: Border.all(color: ok ? const Color(0xFFABEFC6) : _badLine)),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Padding(padding: const EdgeInsets.only(top: 2), child: Icon(ok ? LucideIcons.activity : LucideIcons.triangleAlert, size: 18, color: fg)),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(ok ? 'All results within the reference range' : '${flagged.length} result${flagged.length == 1 ? '' : 's'} outside the reference range', style: const TextStyle(fontWeight: FontWeight.w700, color: K.ink)),
                  Text(ok ? 'Keep up the balanced diet and regular activity.' : flagged.map((x) => '${x['test_name']} (${_flag[x['flag']]!.$1.toLowerCase()})').join(' · '),
                      style: const TextStyle(fontSize: 12, color: _ink3)),
                ])),
              ]));
        }),
        // panels
        for (final p in panels) ...[const SizedBox(height: 18), _Panel(rows: results.where((x) => '${x['panel_code']}' == p).toList())],
        const SizedBox(height: 18),
        // suggestions
        const _Dashed(),
        const SizedBox(height: 6),
        const Text('SUGGESTIONS', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, letterSpacing: .84, color: K.brand)),
        const SizedBox(height: 8 + 12 - 6),
        const Text("Based on this report, as general guidance for wellness. They are not a diagnosis: a doctor's advice comes first.", style: TextStyle(fontSize: 12.5, color: _ink3)),
        if (doctor.isNotEmpty) ...[const SizedBox(height: 12), _AdviceBox(icon: LucideIcons.stethoscope, title: 'See a doctor', color: _bad, doc: true, items: doctor)],
        const SizedBox(height: 12),
        _AdviceBox(icon: LucideIcons.utensils, title: 'Food', color: const Color(0xFFB54708), items: food, tips: true,
            empty: 'A balanced plate at every meal: half vegetables and salad, a quarter dal, paneer, egg or other protein, a quarter rice, roti or millet; curd daily; water through the day.'),
        const SizedBox(height: 12),
        _AdviceBox(icon: LucideIcons.dumbbell, title: 'Physical activity', color: K.brand, items: act,
            empty: 'At least 150 minutes a week of brisk walking, sport, cycling or swimming, and strength training twice a week; 7-8 hours of sleep.'),
        if (h['device_notes'] != null) ...[
          const SizedBox(height: 18),
          Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12), border: Border.all(color: _line)),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(LucideIcons.cpu, size: 16, color: _ink2), const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text("Equipment's own summary", style: TextStyle(fontWeight: FontWeight.w700, color: K.ink)),
                  Text('${h['device_notes']}', style: const TextStyle(fontSize: 12, color: _ink3)),
                ])),
              ])),
        ],
        const SizedBox(height: 18),
        // foot
        Container(padding: const EdgeInsets.only(top: 12), decoration: const BoxDecoration(border: Border(top: BorderSide(color: _line))),
            child: DefaultTextStyle.merge(style: const TextStyle(fontSize: 12, color: _ink3), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Entered by ${h['entered_by_name'] ?? 'the gym equipment'} · Reference intervals are for young adults and may differ from the laboratory\'s own.'),
              if (views.isNotEmpty) ...[const SizedBox(height: 6), Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Padding(padding: EdgeInsets.only(top: 1), child: Icon(LucideIcons.eye, size: 13, color: _ink3)), const SizedBox(width: 5),
                Expanded(child: Text('Seen by ${views.map((v) => '${'${v['role_code']}'.replaceAll('Chief_Warden', 'Chief Manager').replaceAll('Floor_Warden', 'Floor Manager').replaceAll('_', ' ')} (${v['n']})').join(', ')}')),
              ])],
              const SizedBox(height: 6),
              const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(LucideIcons.arrowRightLeft, size: 12, color: _ink3), SizedBox(width: 6),
                Text('END OF REPORT', style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 1.44)),
              ]),
            ]))),
      ])),
    ));
  }
}

/// One panel of results (hr-panel): its name and specimen, then Test / Result / Biological ref. interval.
class _Panel extends StatelessWidget {
  final List<Map> rows;
  const _Panel({required this.rows});
  @override
  Widget build(BuildContext context) {
    const th = TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, letterSpacing: .46, color: _ink3);
    Widget cell(Widget c, {bool right = false}) => Padding(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 7), child: Align(alignment: right ? Alignment.topRight : Alignment.topLeft, child: c));
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Padding(padding: const EdgeInsets.only(bottom: 8), child: Wrap(spacing: 10, crossAxisAlignment: WrapCrossAlignment.end, children: [
        Text('${rows.first['panel_name']}'.toUpperCase(), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, letterSpacing: .84, color: K.brand)),
        if (rows.first['specimen'] != null) Text('${rows.first['specimen']}', style: const TextStyle(fontSize: 12, color: _ink3)),
      ])),
      LayoutBuilder(builder: (context, box) => Table(
        columnWidths: {0: FixedColumnWidth(box.maxWidth * .38), 1: const IntrinsicColumnWidth(), 2: const FlexColumnWidth()},
        children: [
          TableRow(decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _ink2, width: 1.5))), children: [
            cell(const Text('TEST', style: th)), cell(const Text('RESULT', style: th), right: true), cell(const Text('BIOLOGICAL REF. INTERVAL', style: th)),
          ]),
          for (final x in rows) _row(x, cell),
        ],
      )),
    ]);
  }

  TableRow _row(Map x, Widget Function(Widget, {bool right}) cell) {
    final f = _flag[x['flag']];
    final high = f?.$3 == true, sev = f?.$4 == true;
    final c = f == null ? K.ink : high ? _bad : _low;
    final dec = (_num(x['decimals']) ?? 0).toInt();
    final v = x['value_type'] == 'Text' ? '${x['value_text'] ?? ''}' : _fmt(x['value_num'], dec);
    const small = TextStyle(fontSize: 12, color: _ink3);
    return TableRow(decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _line))), children: [
      TableCell(verticalAlignment: TableCellVerticalAlignment.intrinsicHeight, child: Container(
        foregroundDecoration: sev ? BoxDecoration(border: Border(left: BorderSide(color: c, width: 3))) : null,
        child: cell(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${x['test_name']}', style: const TextStyle(fontWeight: FontWeight.w700, color: K.ink)),
          if (x['method'] != null) Padding(padding: const EdgeInsets.only(top: 1), child: Text('${x['method']}', style: small)),
        ])),
      )),
      cell(Row(mainAxisSize: MainAxisSize.min, children: [
        Text(v, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, color: c)),
        if (f != null) Container(margin: const EdgeInsets.only(left: 6), padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(color: high ? _badBg : _lowBg, borderRadius: BorderRadius.circular(5), border: Border.all(color: high ? _badLine : _lowLine)),
            child: Text(f.$2, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: c))),
      ]), right: true),
      cell(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(_interval(x)),
        if (x['note'] != null) Padding(padding: const EdgeInsets.only(top: 1), child: Text('${x['note']}', style: small)),
      ])),
    ]);
  }
}

/// A suggestions box (hr-box): heading with its icon, then the findings as a list, or the general advice.
class _AdviceBox extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color color;
  final List<Map> items;
  final String? empty;
  final bool doc, tips;
  const _AdviceBox({required this.icon, required this.title, required this.color, required this.items, this.empty, this.doc = false, this.tips = false});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(color: doc ? _badBg : const Color(0xFFFBFCFD), borderRadius: BorderRadius.circular(14), border: Border.all(color: doc ? _badLine : _line)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Padding(padding: const EdgeInsets.only(bottom: 8), child: Row(children: [
            Icon(icon, size: 17, color: color), const SizedBox(width: 8),
            Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: color)),
          ])),
          if (items.isEmpty && empty != null) Text(empty!, style: const TextStyle(height: 1.45, color: _ink2))
          else for (final (i, a) in items.indexed) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 8), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(width: 18, child: Text('•', textAlign: TextAlign.center, style: TextStyle(height: 1.45))),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text.rich(TextSpan(children: [TextSpan(text: '${a['finding']}.', style: const TextStyle(fontWeight: FontWeight.w700)), TextSpan(text: ' ${a['advice']}')]), style: const TextStyle(height: 1.45)),
              if (tips && a['mess_tip'] != null) Container(margin: const EdgeInsets.only(top: 4), padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(8)),
                  child: Text('In the mess: ${a['mess_tip']}', style: const TextStyle(fontSize: 12.5, color: _ink2))),
            ])),
          ])),
        ]),
      );
}

/// The dashed rule above the suggestions.
class _Dashed extends StatelessWidget {
  const _Dashed();
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, box) => Row(children: [
        for (var i = 0; i < box.maxWidth ~/ 6; i++) Container(width: 3, height: 1, margin: const EdgeInsets.only(right: 3), color: _line),
      ]));
}
