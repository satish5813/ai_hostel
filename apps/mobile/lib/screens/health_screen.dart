import 'dart:convert';
import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/widgets.dart';

const _low = Color(0xFF175CD3);
const _lowBg = Color(0xFFEFF8FF);

const _flag = {
  'L': ('Low', 'L', false, false), 'LL': ('Very low', 'LL', false, true), 'H': ('High', 'H', true, false),
  'HH': ('Very high', 'HH', true, true), 'A': ('Abnormal', '*', true, false),
};

num? _numOrNull(dynamic v) => v == null ? null : num.tryParse('$v');
String _fmt(dynamic v, int d) { final n = _numOrNull(v); return n == null ? '' : n.toStringAsFixed(d); }
String _interval(Map r) {
  final d = (r['decimals'] as num?)?.toInt() ?? 0;
  if (r['normal_text'] != null) return '${r['normal_text']}';
  if (r['low'] != null && r['high'] != null) return '${_fmt(r['low'], d)} – ${_fmt(r['high'], d)}';
  if (r['high'] != null) return '< ${_fmt(r['high'], d)}';
  if (r['low'] != null) return '> ${_fmt(r['low'], d)}';
  return '—';
}

/// A photo given as a data: URL (or a web address).
Widget? _photoOf(dynamic src, double size) {
  final s = '${src ?? ''}';
  if (s.isEmpty) return null;
  try {
    final img = s.startsWith('data:') ? Image.memory(base64Decode(s.substring(s.indexOf(',') + 1)), width: size, height: size, fit: BoxFit.cover)
        : Image.network(s, width: size, height: size, fit: BoxFit.cover);
    return ClipRRect(borderRadius: BorderRadius.circular(12), child: img);
  } catch (_) {
    return null;
  }
}

/// My health: health reports from the gym's equipment and the laboratory, latest first, each laid out like a lab report
/// with suggestions for food, activity and when to see a doctor.
class HealthScreen extends StatefulWidget {
  const HealthScreen({super.key});
  @override
  State<HealthScreen> createState() => _HealthScreenState();
}

class _HealthScreenState extends State<HealthScreen> {
  int? sel;

  static const _intro = KCard(title: 'My health', icon: Icons.monitor_heart_rounded,
      child: Text('From the gym\'s health equipment and the laboratory. Your Floor Warden, Warden, the Gym Manager and the Dean can see it.', style: TextStyle(color: K.ink3, fontSize: 13)));

  @override
  Widget build(BuildContext context) => ApiView(path: '/me/health', builder: (context, data, reload) {
        final list = ((data as List?) ?? []).cast<Map>();
        if (list.isEmpty) {
          return const PageList(children: [_intro, EmptyView(icon: Icons.monitor_heart_outlined, title: 'No health report yet', body: 'Your first check-up at the gym appears here.')]);
        }
        final id = list.any((x) => x['report_id'] == sel) ? sel! : list.first['report_id'];
        return ApiView(path: '/health/reports/$id', builder: (context, rep, _) => PageList(children: [
              _intro,
              if (list.length > 1)
                SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [
                  for (final x in list) Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(
                    showCheckmark: false, selected: x['report_id'] == id, onSelected: (_) => setState(() => sel = x['report_id'] as int),
                    label: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(day(x['collected_at']), style: TextStyle(fontWeight: FontWeight.w700, color: x['report_id'] == id ? Colors.white : K.ink)),
                      Text((x['out_of_range'] ?? 0) > 0 ? '${x['out_of_range']} to watch' : 'All in range', style: TextStyle(fontSize: 11, color: x['report_id'] == id ? Colors.white70 : K.ink3)),
                    ]),
                  )),
                ])),
              ..._report(rep as Map),
            ]));
      });

  List<Widget> _report(Map d) {
    final h = (d['report'] as Map?) ?? {};
    final results = ((d['results'] as List?) ?? []).cast<Map>();
    final advice = ((d['advice'] as List?) ?? []).cast<Map>();
    final views = ((d['views'] as List?) ?? []).cast<Map>();
    final panels = <String>[];
    for (final r in results) { if (!panels.contains(r['panel_code'])) panels.add('${r['panel_code']}'); }
    final flagged = results.where((x) => _flag.containsKey(x['flag'])).toList();
    final doctor = advice.where((a) => a['area'] == 'Doctor').toList(), food = advice.where((a) => a['area'] == 'Food').toList(), act = advice.where((a) => a['area'] == 'Activity').toList();
    final dob = parseDate(h['date_of_birth']);
    final age = dob == null ? null : (DateTime.now().difference(dob).inDays / 365.25).floor();
    final name = '${h['name'] ?? ''}';

    return [
      // header and the student
      Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 40, height: 40, decoration: BoxDecoration(gradient: K.heroGradient, borderRadius: BorderRadius.circular(11)), child: const Icon(Icons.local_hospital_rounded, color: Colors.white)),
          const SizedBox(width: 10),
          const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('KL University Hostels', style: TextStyle(fontWeight: FontWeight.w800)),
            Text('Student Health and Fitness Centre', style: TextStyle(color: K.ink3, fontSize: 12)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            const Text('Health report', style: TextStyle(fontWeight: FontWeight.w800, color: K.brand)),
            Text('${h['report_no'] ?? ''}', style: const TextStyle(color: K.ink3, fontSize: 12, fontFamily: 'monospace')),
          ]),
        ]),
        const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Divider()),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _photoOf(h['photo'], 64) ?? Container(width: 64, height: 64, alignment: Alignment.center, decoration: BoxDecoration(color: K.brandTint, borderRadius: BorderRadius.circular(12)),
              child: Text(name.split(' ').where((w) => w.isNotEmpty).map((w) => w[0]).take(2).join(), style: const TextStyle(color: K.brand, fontWeight: FontWeight.w800, fontSize: 20))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            Text('${h['student_id'] ?? ''}', style: const TextStyle(color: K.ink3, fontFamily: 'monospace', fontSize: 12.5)),
          ])),
        ]),
        const SizedBox(height: 8),
        InfoRow('Age / Gender', '${age ?? '—'} years / ${h['gender'] ?? '—'}'),
        InfoRow('Blood group', '${h['blood_group'] ?? '—'}'),
        InfoRow('Programme', '${h['programme'] ?? '—'}'),
        InfoRow('Hostel / Room', '${h['hostel_name'] ?? '—'}${h['bed_label'] != null ? ' · ${h['bed_label']}' : ''}'),
        InfoRow('Collected', dayTime(h['collected_at'])),
        InfoRow('Reported', dayTime(h['reported_at'])),
        InfoRow('Source', '${h['source'] == 'Device' ? 'Gym equipment' : h['source'] ?? '—'}${h['device_ref'] != null ? ' · ${h['device_ref']}' : ''}${h['lab_name'] != null ? ' · ${h['lab_name']}' : ''}'),
      ]))),

      // summary
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: flagged.isEmpty ? K.goodBg : K.warnBg, borderRadius: BorderRadius.circular(16), border: Border.all(color: flagged.isEmpty ? K.good.withValues(alpha: .3) : K.warn.withValues(alpha: .3))),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(flagged.isEmpty ? Icons.monitor_heart_rounded : Icons.warning_amber_rounded, color: flagged.isEmpty ? K.good : K.warn),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(flagged.isEmpty ? 'All results within the reference range' : '${flagged.length} result${flagged.length == 1 ? '' : 's'} outside the reference range',
                style: TextStyle(fontWeight: FontWeight.w800, color: flagged.isEmpty ? K.good : K.warn)),
            const SizedBox(height: 2),
            Text(flagged.isEmpty ? 'Keep up the balanced diet and regular activity.' : flagged.map((x) => '${x['test_name']} (${_flag[x['flag']]!.$1.toLowerCase()})').join(' · '),
                style: const TextStyle(color: K.ink2, fontSize: 12.5)),
          ])),
        ]),
      ),

      // panels
      for (final p in panels) _Panel(rows: results.where((x) => x['panel_code'] == p).toList()),

      // suggestions
      KCard(title: 'Suggestions', icon: Icons.tips_and_updates_rounded,
          subtitle: "Based on this report, as general guidance for wellness. They are not a diagnosis: a doctor's advice comes first.",
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (doctor.isNotEmpty) _AdviceBox(Icons.medical_services_rounded, 'See a doctor', K.bad, K.badBg, doctor, null),
            _AdviceBox(Icons.restaurant_rounded, 'Food', K.good, K.goodBg, food,
                'A balanced plate at every meal: half vegetables and salad, a quarter dal, paneer, egg or other protein, a quarter rice, roti or millet; curd daily; water through the day.'),
            _AdviceBox(Icons.fitness_center_rounded, 'Physical activity', K.brand, K.brandTint, act,
                'At least 150 minutes a week of brisk walking, sport, cycling or swimming, and strength training twice a week; 7-8 hours of sleep.'),
          ])),

      if (h['device_notes'] != null)
        KCard(title: "Equipment's own summary", icon: Icons.memory_rounded, child: Text('${h['device_notes']}', style: const TextStyle(color: K.ink2))),

      Padding(padding: const EdgeInsets.symmetric(horizontal: 4), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text("Entered by ${h['entered_by_name'] ?? 'the gym equipment'} · Reference intervals are for young adults and may differ from the laboratory's own.", style: const TextStyle(color: K.ink3, fontSize: 12)),
        if (views.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: Row(children: [
          const Icon(Icons.visibility_outlined, size: 14, color: K.ink3), const SizedBox(width: 6),
          Expanded(child: Text('Seen by ${views.map((v) => '${words(v['role_code'])} (${v['n']})').join(', ')}', style: const TextStyle(color: K.ink3, fontSize: 12))),
        ])),
        const Padding(padding: EdgeInsets.only(top: 8), child: Center(child: Text('End of report', style: TextStyle(color: K.ink3, fontSize: 12, fontWeight: FontWeight.w600)))),
      ])),
    ];
  }
}

class _Panel extends StatelessWidget {
  final List<Map> rows;
  const _Panel({required this.rows});
  @override
  Widget build(BuildContext context) => KCard(
        title: '${rows.first['panel_name']}', subtitle: rows.first['specimen'] as String?, icon: Icons.science_rounded,
        child: Column(children: [
          const Padding(padding: EdgeInsets.only(bottom: 6), child: Row(children: [
            Expanded(flex: 5, child: Text('Test', style: _head)),
            Expanded(flex: 3, child: Text('Result', style: _head, textAlign: TextAlign.right)),
            SizedBox(width: 10),
            Expanded(flex: 4, child: Text('Ref. interval', style: _head)),
          ])),
          for (final x in rows) _row(x),
        ]),
      );

  static const _head = TextStyle(color: K.ink3, fontSize: 11.5, fontWeight: FontWeight.w700);

  Widget _row(Map x) {
    final f = _flag[x['flag']];
    final d = (x['decimals'] as num?)?.toInt() ?? 0;
    final v = x['value_type'] == 'Text' ? '${x['value_text'] ?? ''}' : _fmt(x['value_num'], d);
    final prev = _numOrNull(x['previous']);
    final cur = _numOrNull(x['value_num']);
    final ch = prev != null && cur != null ? cur - prev : null;
    final color = f == null ? K.ink : f.$3 ? K.bad : _low;
    final bg = f == null ? null : f.$4 ? (f.$3 ? K.badBg : _lowBg) : null;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      decoration: BoxDecoration(color: bg, border: const Border(top: BorderSide(color: K.line))),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(flex: 5, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${x['test_name']}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
          if (x['method'] != null) Text('${x['method']}', style: const TextStyle(color: K.ink3, fontSize: 11)),
          if (prev != null) Row(children: [
            Text('Previous ${_fmt(prev, d)}', style: const TextStyle(color: K.ink3, fontSize: 11)),
            if (ch != null && ch.abs() > 0.5 / _pow10(d)) Icon(ch > 0 ? Icons.north_east_rounded : Icons.south_east_rounded, size: 12, color: K.ink3),
          ]),
        ])),
        Expanded(flex: 3, child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Row(mainAxisAlignment: MainAxisAlignment.end, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Flexible(child: Text(v, textAlign: TextAlign.right, style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: color))),
            if (f != null) Padding(padding: const EdgeInsets.only(left: 3), child: Text(f.$2, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w900))),
          ]),
          if (x['unit'] != null) Text('${x['unit']}', style: const TextStyle(color: K.ink3, fontSize: 11)),
        ])),
        const SizedBox(width: 10),
        Expanded(flex: 4, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_interval(x), style: const TextStyle(color: K.ink2, fontSize: 12.5)),
          if (x['note'] != null) Text('${x['note']}', style: const TextStyle(color: K.ink3, fontSize: 11)),
        ])),
      ]),
    );
  }

  static num _pow10(int d) { num p = 1; for (var i = 0; i < d; i++) { p *= 10; } return p; }
}

class _AdviceBox extends StatelessWidget {
  final IconData icon;
  final String title;
  final Color fg, bg;
  final List<Map> items;
  final String? fallback;
  const _AdviceBox(this.icon, this.title, this.fg, this.bg, this.items, this.fallback);
  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Icon(icon, size: 18, color: fg), const SizedBox(width: 6), Text(title, style: TextStyle(fontWeight: FontWeight.w800, color: fg))]),
          const SizedBox(height: 8),
          if (items.isEmpty && fallback != null) Text(fallback!, style: const TextStyle(color: K.ink2, fontSize: 13)),
          for (final a in items) Padding(padding: const EdgeInsets.only(bottom: 8), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text.rich(TextSpan(style: const TextStyle(color: K.ink2, fontSize: 13), children: [
              TextSpan(text: '${a['finding']}. ', style: const TextStyle(fontWeight: FontWeight.w800, color: K.ink)),
              TextSpan(text: '${a['advice']}'),
            ])),
            if (a['mess_tip'] != null) Container(
              margin: const EdgeInsets.only(top: 4), padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: .7), borderRadius: BorderRadius.circular(8)),
              child: Text('In the mess: ${a['mess_tip']}', style: TextStyle(color: fg, fontSize: 12.5, fontWeight: FontWeight.w600)),
            ),
          ])),
        ]),
      );
}
