import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
String _pct(dynamic v) => v == null ? '—' : '${_n(v).round()}%';
String _round(dynamic v) => v == null ? '—' : '${_n(v).round()}';
String _two(dynamic v) => v == null ? '—' : _n(v).toStringAsFixed(2);

const _tabs = ['Overview', 'Academics', 'CRT', 'Skills', 'Activities', 'Hostel'];
const _violet = K.violet;
const _coral = K.ember;

/// My academic page, as the whole student: results, CRT, certifications, activities, achievements and the hostel
/// record. Certificates and achievements I add are verified by a Warden before they count.
class AcademicsScreen extends StatefulWidget {
  const AcademicsScreen({super.key});
  @override
  State<AcademicsScreen> createState() => _AcademicsScreenState();
}

class _AcademicsScreenState extends State<AcademicsScreen> {
  String tab = 'Overview';

  @override
  Widget build(BuildContext context) => ApiView(path: '/students/$me/360', builder: (context, data, reload) {
        final d = data as Map;
        final st = (d['student'] as Map?) ?? {};
        final h = (d['hostel'] as Map?) ?? {};
        final terms = ((d['terms'] as List?) ?? []).cast<Map>();
        final crt = (d['crt'] as Map?) ?? {};
        final att = ((crt['attendance'] as List?) ?? []).cast<Map>();
        final tests = ((crt['tests'] as List?) ?? []).cast<Map>();
        final certs = ((d['certs'] as List?) ?? []).cast<Map>();
        final activities = ((d['activities'] as List?) ?? []).cast<Map>();
        final achievements = ((d['achievements'] as List?) ?? []).cast<Map>();
        final last = terms.isEmpty ? null : terms.last;
        final held = att.fold<num>(0, (a, m) => a + _n(m['held'])), got = att.fold<num>(0, (a, m) => a + _n(m['attended']));
        final crtPct = held > 0 ? 100 * got / held : null;
        final crtAvg = tests.isEmpty ? null : tests.fold<num>(0, (a, t) => a + 100 * _n(t['score']) / (_n(t['max_score']) == 0 ? 100 : _n(t['max_score']))) / tests.length;

        Widget body;
        switch (tab) {
          case 'Academics':
            body = KCard(title: 'Semester results', icon: Icons.school_rounded, child: terms.isEmpty
                ? const Text('No results loaded yet.', style: TextStyle(color: K.ink3))
                : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    _Bars(values: [for (final t in terms) (label: 'S${t['semester_no']}', value: _n(t['sgpa']), text: _two(t['sgpa']), hi: t == last)], max: 10, color: _violet),
                    const SizedBox(height: 12),
                    for (final t in terms) Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: const BoxDecoration(border: Border(top: BorderSide(color: K.line))),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Expanded(child: Text('Semester ${t['semester_no']} · ${t['term_label']}', style: const TextStyle(fontWeight: FontWeight.w700))),
                          Pill(_pct(t['attendance_pct']), tone: _n(t['attendance_pct']) < 75 ? Tone.bad : Tone.good),
                        ]),
                        const SizedBox(height: 4),
                        Text('SGPA ${_two(t['sgpa'])} · CGPA ${_two(t['cgpa'])} · ${t['credits']} credits · ${_n(t['backlogs']) > 0 ? '${t['backlogs']} backlogs' : 'no backlogs'}',
                            style: const TextStyle(color: K.ink2, fontSize: 13)),
                      ]),
                    ),
                  ]));
          case 'CRT':
            body = Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              KCard(title: 'Training sessions', icon: Icons.event_available_rounded, trailing: Pill('${got.round()} of ${held.round()}', tone: Tone.muted), child: att.isEmpty
                  ? const Text('No sessions recorded.', style: TextStyle(color: K.ink3))
                  : _Bars(values: [for (final m in att) (label: _month('${m['month']}'), value: 100 * _n(m['attended']) / (_n(m['held']) == 0 ? 1 : _n(m['held'])),
                        text: '${(100 * _n(m['attended']) / (_n(m['held']) == 0 ? 1 : _n(m['held']))).round()}%', hi: false)], max: 100, color: _coral)),
              const SizedBox(height: 14),
              KCard(title: 'Tests', icon: Icons.quiz_rounded, child: tests.isEmpty ? const Text('No CRT records', style: TextStyle(color: K.ink3)) : Column(children: [
                for (final t in tests.reversed) Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${t['test_name']}', style: const TextStyle(fontWeight: FontWeight.w600)),
                    Text('${words(t['category'])} · ${day(t['test_date'])} · better than ${t['percentile']}% of the batch', style: const TextStyle(color: K.ink3, fontSize: 12)),
                    const SizedBox(height: 6),
                    ClipRRect(borderRadius: BorderRadius.circular(99), child: LinearProgressIndicator(minHeight: 6, color: _coral, backgroundColor: K.line,
                        value: (_n(t['score']) / (_n(t['max_score']) == 0 ? 100 : _n(t['max_score']))).clamp(0, 1).toDouble())),
                  ])),
                  const SizedBox(width: 12),
                  Text.rich(TextSpan(children: [
                    TextSpan(text: '${t['score']}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    TextSpan(text: '/${t['max_score']}', style: const TextStyle(color: K.ink3, fontSize: 12)),
                  ])),
                ])),
              ])),
            ]);
          case 'Skills':
            body = KCard(title: 'Certifications', icon: Icons.workspace_premium_rounded,
                trailing: TextButton.icon(onPressed: () => _add(context, 'cert', reload), icon: const Icon(Icons.add), label: const Text('Add a certificate')),
                child: certs.isEmpty ? const Text('No certifications yet.', style: TextStyle(color: K.ink3)) : Column(children: [
                  for (final c in certs) Container(
                    width: double.infinity, margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(border: Border.all(color: K.line), borderRadius: BorderRadius.circular(14)),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Pill(words(c['category']), tone: Tone.muted), const SizedBox(height: 6),
                      Text('${c['title']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                      Text('${c['provider']} · ${day(c['issued_on'])}', style: const TextStyle(color: K.ink2, fontSize: 13)),
                      if (c['credential_ref'] != null) Text('${c['credential_ref']}', style: const TextStyle(color: K.ink3, fontSize: 12, fontFamily: 'monospace')),
                      const SizedBox(height: 6),
                      c['verified'] == true ? const Pill('Verified', tone: Tone.good) : const Pill('Waiting to be verified', tone: Tone.warn),
                    ]),
                  ),
                ]));
          case 'Activities':
            body = Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              KCard(title: 'Achievements', icon: Icons.emoji_events_rounded,
                  trailing: TextButton.icon(onPressed: () => _add(context, 'ach', reload), icon: const Icon(Icons.add), label: const Text('Add')),
                  child: achievements.isEmpty ? const Text('No achievements yet.', style: TextStyle(color: K.ink3)) : Column(children: [
                    for (final a in achievements) _Line(
                      tag: Pill('${a['level']}', tone: ['International', 'National'].contains(a['level']) ? Tone.good : a['level'] == 'State' ? Tone.warn : Tone.muted),
                      title: '${a['title']}', sub: '${a['award'] != null ? '${a['award']} · ' : ''}${day(a['achieved_on'])}',
                      trailing: a['verified'] == true ? null : const Pill('To verify', tone: Tone.warn),
                    ),
                  ])),
              const SizedBox(height: 14),
              KCard(title: 'Activities', icon: Icons.groups_rounded, child: activities.isEmpty ? const Text('No activities yet.', style: TextStyle(color: K.ink3)) : Column(children: [
                for (final a in activities) _Line(
                  tag: Pill(words(a['type']).replaceAll('NSS NCC', 'NSS / NCC'), tone: Tone.muted),
                  title: '${a['title']}',
                  sub: '${a['role'] != null ? '${a['role']} · ' : ''}${day(a['from_date'])}${a['to_date'] != null ? ' to ${day(a['to_date'])}' : ', ongoing'}${_n(a['hours']) > 0 ? ' · ${a['hours']} h' : ''}',
                ),
              ])),
            ]);
          case 'Hostel':
            body = KCard(title: 'Hostel record', icon: Icons.apartment_rounded, child: Column(children: [
              InfoRow('Room', st['room_code'] != null ? '${st['hostel_code']} ${st['room_code']}' : '—'),
              InfoRow('Floor Warden', st['floor_warden'] != null ? titleCase('${st['floor_warden']}') : '—'),
              InfoRow('Night roll call', _pct(h['night_pct'])),
              InfoRow('All sessions', _pct(h['session_pct'])),
              InfoRow('Nights missed', '${h['nights_missed'] ?? 0}'),
              InfoRow('Outings', '${h['outings'] ?? 0}'),
              InfoRow('Late returns', '${h['late_returns'] ?? 0}'),
              InfoRow('Sick days', '${h['sick_days'] ?? 0}'),
              InfoRow('Alerts', '${h['alerts'] ?? 0}'),
              InfoRow('Dues', inr(h['dues'])),
            ]));
          default:
            final hours = activities.fold<num>(0, (a, x) => a + _n(x['hours']));
            body = Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              _Tile('Latest semester', () => setState(() => tab = 'Academics'), last == null ? [const Text('No results yet', style: TextStyle(color: K.ink3))] : [
                _big(_two(last['sgpa'])),
                _sub('SGPA, semester ${last['semester_no']} · ${_n(last['backlogs']) > 0 ? '${last['backlogs']} backlog' : 'no backlogs'}'),
              ]),
              _Tile('CRT', () => setState(() => tab = 'CRT'), tests.isEmpty ? [const Text('No CRT records', style: TextStyle(color: K.ink3))] : [
                _big('${crtAvg!.round()}', small: '/100'),
                _sub('average over ${tests.length} tests · ${_pct(crtPct)} sessions attended'),
              ]),
              _Tile('Certifications', () => setState(() => tab = 'Skills'), [_big('${certs.length}'), for (final c in certs.take(3)) _sub('${c['title']} · ${c['provider']}')]),
              _Tile('Achievements', () => setState(() => tab = 'Activities'), [_big('${achievements.length}'), for (final a in achievements.take(3)) _sub('${a['award'] != null ? '${a['award']}, ' : ''}${a['title']}')]),
              _Tile('Activities', () => setState(() => tab = 'Activities'), [_big('${activities.length}'), _sub('${hours.round()} hours in clubs, sports, service and internships')]),
              _Tile('Hostel', () => setState(() => tab = 'Hostel'), [_big(_pct(h['night_pct'])), _sub('night roll call, last 30 days · ${h['outings'] ?? 0} outings · ${h['late_returns'] ?? 0} late')]),
            ]);
        }

        return PageList(children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(gradient: K.heroGradient, borderRadius: BorderRadius.circular(22)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                CircleAvatar(radius: 26, backgroundColor: Colors.white24, child: Text(_initials('${st['full_name'] ?? ''}'), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18))),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(titleCase('${st['full_name'] ?? ''}'), style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
                  Text('${st['student_id']} · ${st['programme']} · ${st['dept_name'] ?? st['dept_code'] ?? st['level'] ?? ''}', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                ])),
              ]),
              const SizedBox(height: 10),
              Wrap(spacing: 8, runSpacing: 6, children: [
                _HeroTag(st['room_code'] != null ? '${st['hostel_code']} ${st['room_code']}, ${st['floor_name']}' : 'Day scholar', Icons.bed_rounded),
                if (st['current_status'] != null) _HeroTag(words(st['current_status']), Icons.circle),
              ]),
              const SizedBox(height: 16),
              Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
                _Ring(v: _n(last?['cgpa']), max: 10, label: _two(last?['cgpa']), sub: 'CGPA', color: const Color(0xFFB9A6FF)),
                _Ring(v: _n(last?['attendance_pct']), max: 100, label: _round(last?['attendance_pct']), sub: 'Class %', color: const Color(0xFF7CD4FD)),
                _Ring(v: crtPct ?? 0, max: 100, label: _round(crtPct), sub: 'CRT %', color: const Color(0xFFFFB38A)),
                _Ring(v: _n(h['night_pct']), max: 100, label: _round(h['night_pct']), sub: 'Hostel %', color: const Color(0xFF75E0A7)),
              ]),
            ]),
          ),
          SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [
            for (final t in _tabs) Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(
              label: Text(t), selected: tab == t, showCheckmark: false,
              labelStyle: TextStyle(color: tab == t ? Colors.white : K.ink, fontWeight: FontWeight.w700),
              onSelected: (_) => setState(() => tab = t),
            )),
          ])),
          body,
        ]);
      });

  Widget _big(String v, {String? small}) => Text.rich(TextSpan(children: [
        TextSpan(text: v, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: K.ink)),
        if (small != null) TextSpan(text: small, style: const TextStyle(fontSize: 13, color: K.ink3)),
      ]));
  Widget _sub(String s) => Padding(padding: const EdgeInsets.only(top: 2), child: Text(s, style: const TextStyle(color: K.ink2, fontSize: 13)));

  Future<void> _add(BuildContext context, String kind, Future<void> Function() reload) async {
    final done = await showModalBottomSheet<bool>(context: context, isScrollControlled: true, showDragHandle: true, builder: (_) => _AddSheet(kind: kind));
    if (done == true) await reload();
  }
}

String _initials(String name) => name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).map((w) => w[0]).take(2).join().toUpperCase();
const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
String _month(String m) { final i = int.tryParse(m.split('-').elementAtOrNull(1) ?? ''); return i == null || i < 1 || i > 12 ? m : _months[i - 1]; }

class _HeroTag extends StatelessWidget {
  final String label;
  final IconData icon;
  const _HeroTag(this.label, this.icon);
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5), decoration: BoxDecoration(color: Colors.white.withValues(alpha: .16), borderRadius: BorderRadius.circular(999)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: icon == Icons.circle ? 8 : 13, color: Colors.white), const SizedBox(width: 5),
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
        ]));
}

class _Ring extends StatelessWidget {
  final num v, max;
  final String label, sub;
  final Color color;
  const _Ring({required this.v, required this.max, required this.label, required this.sub, required this.color});
  @override
  Widget build(BuildContext context) => Column(children: [
        SizedBox(width: 62, height: 62, child: Stack(alignment: Alignment.center, children: [
          SizedBox.expand(child: CircularProgressIndicator(value: max == 0 ? 0 : (v / max).clamp(0, 1).toDouble(), strokeWidth: 6, color: color, backgroundColor: Colors.white24)),
          Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
        ])),
        const SizedBox(height: 6),
        Text(sub, style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600)),
      ]);
}

class _Tile extends StatelessWidget {
  final String title;
  final VoidCallback onTap;
  final List<Widget> children;
  const _Tile(this.title, this.onTap, this.children);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 10), child: KCard(onTap: onTap, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Expanded(child: Text(title, style: const TextStyle(color: K.ink3, fontWeight: FontWeight.w700, fontSize: 13))), const Icon(Icons.chevron_right_rounded, size: 18, color: K.ink3)]),
        const SizedBox(height: 4),
        ...children,
      ])));
}

class _Line extends StatelessWidget {
  final Widget tag;
  final String title, sub;
  final Widget? trailing;
  const _Line({required this.tag, required this.title, required this.sub, this.trailing});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [tag, const Spacer(), ?trailing]),
        const SizedBox(height: 4),
        Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        Text(sub, style: const TextStyle(color: K.ink3, fontSize: 12.5)),
      ]));
}

/// A small bar chart: one bar per value, its figure on top.
class _Bars extends StatelessWidget {
  final List<({String label, num value, String text, bool hi})> values;
  final num max;
  final Color color;
  const _Bars({required this.values, required this.max, required this.color});
  @override
  Widget build(BuildContext context) => SizedBox(height: 160, child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        for (final v in values) Expanded(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 6), child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
          Text(v.text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: K.ink2)),
          const SizedBox(height: 4),
          Container(height: 110 * (max == 0 ? 0 : (v.value / max).clamp(0, 1)).toDouble(), decoration: BoxDecoration(
              color: v.hi ? color : color.withValues(alpha: .45), borderRadius: const BorderRadius.vertical(top: Radius.circular(6)))),
          const SizedBox(height: 6),
          Text(v.label, style: const TextStyle(fontSize: 12, color: K.ink3)),
        ]))),
      ]));
}

class _AddSheet extends StatefulWidget {
  final String kind;
  const _AddSheet({required this.kind});
  @override
  State<_AddSheet> createState() => _AddSheetState();
}

class _AddSheetState extends State<_AddSheet> {
  late final Map<String, String> f = widget.kind == 'cert' ? {'category': 'Technical'} : {'level': 'University'};
  bool busy = false;
  bool get cert => widget.kind == 'cert';
  List<String> get missing => (cert ? ['title', 'provider', 'issued_on'] : ['title', 'achieved_on']).where((k) => (f[k] ?? '').trim().isEmpty).toList();

  Widget _field(String key, String label, {String? hint, bool required = false}) => Padding(padding: const EdgeInsets.only(bottom: 12), child: TextField(
        onChanged: (v) => setState(() => f[key] = v), decoration: InputDecoration(labelText: required ? '$label *' : label, hintText: hint)));

  Widget _date(String key, String label) => Padding(padding: const EdgeInsets.only(bottom: 12), child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () async {
          final now = DateTime.now();
          final d = await showDatePicker(context: context, firstDate: DateTime(now.year - 10), lastDate: now, initialDate: now);
          if (d != null) setState(() => f[key] = isoDay(d));
        },
        child: InputDecorator(decoration: InputDecoration(labelText: '$label *', suffixIcon: const Icon(Icons.calendar_today_rounded, size: 18)),
            child: Text(f[key] == null ? 'Choose a date' : day(f[key]), style: TextStyle(color: f[key] == null ? K.ink3 : K.ink))),
      ));

  Widget _select(String key, String label, List<String> options) => Padding(padding: const EdgeInsets.only(bottom: 12), child: DropdownButtonFormField<String>(
        initialValue: f[key], decoration: InputDecoration(labelText: label),
        items: [for (final o in options) DropdownMenuItem(value: o, child: Text(words(o)))],
        onChanged: (v) => setState(() => f[key] = v ?? f[key]!),
      ));

  Future<void> submit() async {
    setState(() => busy = true);
    final body = {for (final e in f.entries) if (e.value.trim().isNotEmpty) e.key: e.value.trim()};
    final ok = await act(context, () => Api.instance.post(cert ? '/me/certifications' : '/me/achievements', body), 'Added; waiting to be verified');
    if (!mounted) return;
    setState(() => busy = false);
    if (ok) Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
        child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(cert ? 'Add a certificate' : 'Add an achievement', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const Text('A Warden verifies it before it counts on your record', style: TextStyle(color: K.ink3, fontSize: 13)),
          const SizedBox(height: 16),
          _field('title', 'Title', hint: cert ? 'AWS Cloud Practitioner' : 'Smart India Hackathon', required: true),
          if (cert) ...[
            _field('provider', 'Given by', hint: 'Coursera, NPTEL, AWS…', required: true),
            _select('category', 'Kind', const ['Technical', 'Cloud', 'Programming', 'Language', 'Soft_Skill', 'Sports', 'Other']),
            _date('issued_on', 'Issued on'),
            _field('credential_ref', 'Credential ID or link'),
          ] else ...[
            _select('level', 'Level', const ['Hostel', 'University', 'State', 'National', 'International']),
            _field('award', 'Award', hint: 'First prize, Finalist…'),
            _date('achieved_on', 'Date'),
          ],
          if (missing.isNotEmpty) const Padding(padding: EdgeInsets.only(bottom: 10), child: Text('Fill the starred fields.', style: TextStyle(color: K.warn, fontSize: 12.5))),
          Align(alignment: Alignment.centerLeft, child: ActionButton(label: 'Add', icon: Icons.add_rounded, busy: busy, onPressed: missing.isEmpty ? submit : null)),
        ])),
      );
}
