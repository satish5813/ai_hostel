import 'dart:math' as math;
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart' show DateFormat;
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

const _tabs = ['Overview', 'Academics', 'CRT', 'Skills', 'Activities', 'Hostel'];
// a first-year student has no semester results or CRT yet: the page shows the qualifications they came with instead
const _fresherTabs = ['Overview', 'Before KL', 'Skills', 'Activities', 'Hostel'];
const _levels = {'SSC': '10th class', 'Intermediate': 'Intermediate (12th)', 'Diploma': 'Diploma', 'Degree': 'Degree', 'PG': 'Post-graduate degree'};
String _marks(Map p) => p['cgpa'] != null ? 'CGPA ${_n(p['cgpa'])}' : p['marks_pct'] != null ? '${_n(p['marks_pct'])}%' : 'marks not given';
const _line = Color(0xCCE3E7F0);   // --ui-line
const _muted = Color(0xFF4B5565);  // --ink-muted
const _surface2 = Color(0xFFEEF1F7);
const _grid = Color(0xFFE8ECF3);   // --chart-grid
const _violet = Color(0xFF7048E8), _sky = Color(0xFF1971C2), _coral = Color(0xFFFF7A45), _green = Color(0xFF1A7F4B);
num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
String _num(dynamic n) => n == null ? '—' : '${_n(n).round()}';
String _pct(dynamic n) => n == null ? '—' : '${_n(n).round()}%';
/// A number as JavaScript prints it (8.7, 9, 9.45).
String _js(num v) => v == v.roundToDouble() ? '${v.round()}' : '$v';
String _initials(String? name) => (name ?? '').split(RegExp(r'\s+')).where((w) => w.isNotEmpty).take(2).map((w) => w[0].toUpperCase()).join();
List<Map> _list(dynamic v) => ((v as List?) ?? []).cast<Map>();

/// ACA-01 Student academic page as the student sees it (pages/general/Student360.tsx): results, CRT, certifications,
/// activities, achievements and the hostel record; the student adds certificates and achievements for verification.
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
        final st = d['student'] as Map;
        final h = d['hostel'] as Map;
        final terms = _list(d['terms']);
        final crt = d['crt'] as Map;
        final att = _list(crt['attendance']), tests = _list(crt['tests']);
        final certs = _list(d['certs']), activities = _list(d['activities']), achievements = _list(d['achievements']);
        final prior = _list(d['prior']);
        final fresher = d['fresher'] == true;
        final tabs = fresher ? _fresherTabs : _tabs;
        // UG freshers show 10th and Intermediate; PG ones add the degree
        final wanted = '${st['level']}' == 'UG' ? ['SSC', 'Intermediate'] : ['SSC', 'Intermediate', 'Degree'];
        final last = terms.lastOrNull;
        final held = att.fold<num>(0, (a, m) => a + _n(m['held'])), got = att.fold<num>(0, (a, m) => a + _n(m['attended']));
        final crtPct = held > 0 ? 100 * got / held : null;
        final crtAvg = tests.isEmpty ? null : tests.fold<num>(0, (a, t) => a + 100 * _n(t['score']) / _n(t['max_score'])) / tests.length;

        Widget body() => switch (tab) {
              'Overview' => Column(children: [
                  for (final (i, t) in <Widget>[
                    if (fresher) _Tile('Before KL', () => setState(() => tab = 'Before KL'), prior.isEmpty ? [const _TileLine('Add your 10th and Intermediate marks')] : [
                      _Big(_marks(prior.last), small: ' ${_levels[prior.last['level']] ?? prior.last['level']}'),
                      for (final p in prior.reversed.skip(1).take(2)) _TileLine('${_levels[p['level']] ?? p['level']}: ${_marks(p)} · ${p['year_passed'] ?? ''}'),
                      _TileLine('First year at KL: semester results appear here after the first semester'),
                    ]) else _Tile('Latest semester', () => setState(() => tab = 'Academics'), last == null ? [const _TileLine('No results yet')] : [
                      _Big(_n(last['sgpa']).toStringAsFixed(2)),
                      _TileLine('SGPA, semester ${last['semester_no']} · ${_n(last['backlogs']) > 0 ? '${last['backlogs']} backlog' : 'no backlogs'}'),
                      _Spark([for (final t in terms) _n(t['sgpa']).toDouble()], _violet, const Color(0xFFF1ECFF)),
                    ]),
                    if (!fresher) _Tile('CRT', () => setState(() => tab = 'CRT'), tests.isEmpty ? [const _TileLine('No CRT records')] : [
                      _Big('${crtAvg!.round()}', small: '/100'),
                      _TileLine('average over ${tests.length} tests · ${_pct(crtPct)} sessions attended'),
                      _Spark([for (final t in tests) (100 * _n(t['score']) / _n(t['max_score'])).toDouble()], _coral, const Color(0xFFFFF0E8)),
                    ]),
                    _Tile('Certifications', () => setState(() => tab = 'Skills'), [_Big('${certs.length}'), for (final c in certs.take(3)) _TileLine('${c['title']} · ${c['provider']}')]),
                    _Tile('Achievements', () => setState(() => tab = 'Activities'), [_Big('${achievements.length}'),
                      for (final a in achievements.take(3)) _TileLine('${a['award'] != null ? '${a['award']}, ' : ''}${a['title']}')]),
                    _Tile('Activities', () => setState(() => tab = 'Activities'), [_Big('${activities.length}'),
                      _TileLine('${_js(activities.fold<num>(0, (a, x) => a + _n(x['hours'])))} hours in clubs, sports, service and internships')]),
                    _Tile('Hostel', () => setState(() => tab = 'Hostel'), [_Big(_pct(h['night_pct'])),
                      _TileLine('night roll call, last 30 days · ${h['outings']} outings · ${h['late_returns']} late')]),
                  ].indexed) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 10), child: t),
                ]),
              'Before KL' => _Box(head: [const _H2('Before KL'), const Spacer(), KButton(prior.isEmpty ? 'Add' : 'Add or update', small: true, icon: LucideIcons.plus, onPressed: () => _addPrior(reload, wanted, prior))], children: [
                  if (prior.isEmpty) const Padding(padding: EdgeInsets.fromLTRB(14, 12, 14, 12), child: Text('Add the marks and a photo of each certificate. The residency office checks them against your admission file.', style: TextStyle(fontSize: 14, color: _muted))),
                  for (final p in prior) Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10), decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _line))),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      if ('${p['certificate'] ?? ''}'.startsWith('data:image')) ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.memory(base64Decode('${p['certificate']}'.split(',').last), width: 56, height: 56, fit: BoxFit.cover))
                      else Container(width: 56, height: 56, alignment: Alignment.center, decoration: BoxDecoration(color: _surface2, borderRadius: BorderRadius.circular(8)), child: Icon('${p['certificate'] ?? ''}'.isEmpty ? LucideIcons.fileQuestion : LucideIcons.fileText, size: 22, color: _muted)),
                      const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [Expanded(child: Text(_levels[p['level']] ?? '${p['level']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700))), _Tag(p['verified'] == true ? 'Verified' : 'To verify', tone: p['verified'] == true ? 'ok' : 'warn')]),
                        Text('${_marks(p)}${p['group_name'] != null ? ' · ${p['group_name']}' : ''}${p['year_passed'] != null ? ' · ${p['year_passed']}' : ''}', style: const TextStyle(fontSize: 13, color: K.ink)),
                        if (p['institution'] != null) Text('${p['institution']}', style: const TextStyle(fontSize: 12.5, color: _muted)),
                        if (p['board'] != null) Text('${p['board']}${p['roll_no'] != null ? ' · Roll no ${p['roll_no']}' : ''}', style: const TextStyle(fontSize: 12.5, color: _muted)),
                        if ('${p['certificate'] ?? ''}'.isEmpty) const Text('Certificate photo not added yet', style: TextStyle(fontSize: 12, color: Color(0xFFB7791F))),
                      ])),
                    ])),
                  for (final lv in wanted.where((l) => !prior.any((p) => p['level'] == l))) Padding(padding: const EdgeInsets.fromLTRB(14, 8, 14, 8), child: Row(children: [
                    const Icon(LucideIcons.circleAlert, size: 14, color: Color(0xFFB7791F)), const SizedBox(width: 6), Text('${_levels[lv]} is missing', style: const TextStyle(fontSize: 12.5, color: _muted))])),
                ]),
              'Academics' => _Box(head: [const _H2('Semester results')], children: [
                  Padding(padding: const EdgeInsets.fromLTRB(14, 12, 14, 12), child: terms.isEmpty
                      ? const Text('No results loaded yet.', style: TextStyle(fontSize: 14, color: _muted))
                      : _BarChart([for (final t in terms) (label: 'S${t['semester_no']}', value: _n(t['sgpa']), hi: t == last)], height: 160)),
                  for (final t in terms) Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8), decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _line))),
                    child: Column(children: [
                      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Expanded(child: _Cell('Semester', Text('${t['semester_no']} · ${t['term_label']}'))),
                        Expanded(child: _Cell('SGPA', Text(_n(t['sgpa']).toStringAsFixed(2), style: const TextStyle(fontWeight: FontWeight.w700)))),
                      ]),
                      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Expanded(child: _Cell('CGPA', Text(_n(t['cgpa']).toStringAsFixed(2)))),
                        Expanded(child: _Cell('Credits', Text('${t['credits']}'))),
                      ]),
                      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Expanded(child: _Cell('Attendance', Align(alignment: Alignment.centerLeft, child: _Tag(_pct(t['attendance_pct']), tone: _n(t['attendance_pct']) < 75 ? 'bad' : 'ok')))),
                        Expanded(child: _Cell('Backlogs', Text(_n(t['backlogs']) > 0 ? '${t['backlogs']}' : '—'))),
                      ]),
                    ])),
                ]),
              'CRT' => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  _Box(head: [const _H2('Training sessions'), const Spacer(), _Tag('${_js(got)} of ${_js(held)}')], children: [
                    Padding(padding: const EdgeInsets.fromLTRB(14, 12, 14, 12), child: att.isEmpty
                        ? const Text('No sessions recorded.', style: TextStyle(fontSize: 14, color: _muted))
                        : _BarChart([for (final m in att) (label: _month('${m['month']}'), value: (100 * _n(m['attended']) / math.max(1, _n(m['held']))).round(), hi: false)], height: 150)),
                  ]),
                  const SizedBox(height: 12),
                  _Box(head: [const _H2('Tests')], children: [
                    for (final (i, t) in tests.reversed.indexed) _BedRow(last: i == tests.length - 1, children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${t['test_name']}', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                        Text('${words(t['category'])} · ${day(t['test_date'])} · better than ${t['percentile']}% of the batch', style: const TextStyle(fontSize: 12, color: _muted)),
                        Container(height: 5, margin: const EdgeInsets.only(top: 6), decoration: BoxDecoration(color: _surface2, borderRadius: BorderRadius.circular(999)),
                            child: FractionallySizedBox(alignment: Alignment.centerLeft, widthFactor: (_n(t['score']) / _n(t['max_score'])).clamp(0, 1).toDouble(),
                                child: Container(decoration: BoxDecoration(color: _coral, borderRadius: BorderRadius.circular(999))))),
                      ])),
                      Text.rich(TextSpan(children: [
                        TextSpan(text: '${t['score']}'),
                        TextSpan(text: '/${t['max_score']}', style: const TextStyle(fontSize: 12, color: _muted)),
                      ]), style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
                    ]),
                  ]),
                ]),
              'Skills' => _Box(head: [const _H2('Certifications'), const Spacer(), KButton('Add a certificate', small: true, icon: LucideIcons.plus, onPressed: () => _add('cert', reload))], children: [
                  Padding(padding: const EdgeInsets.fromLTRB(14, 12, 14, 14), child: certs.isEmpty
                      ? const Padding(padding: EdgeInsets.all(14), child: Text('No certifications yet.', style: TextStyle(fontSize: 14, color: _muted)))
                      : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                          for (final (i, c) in certs.indexed) Container(
                            margin: EdgeInsets.only(top: i == 0 ? 0 : 8), padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: _line)),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              _Tag(words(c['category'])), const SizedBox(height: 5),
                              Text('${c['title']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)), const SizedBox(height: 5),
                              Text('${c['provider']} · ${day(c['issued_on'])}', style: const TextStyle(fontSize: 12.5, color: _muted)),
                              if (c['credential_ref'] != null) ...[const SizedBox(height: 5), Text('${c['credential_ref']}', style: K.mono(size: 13).copyWith(letterSpacing: -.13))],
                              const SizedBox(height: 5),
                              c['verified'] == true ? const _Tag('Verified', tone: 'ok', icon: LucideIcons.check) : const _Tag('Waiting to be verified', tone: 'warn'),
                            ])),
                        ])),
                ]),
              'Activities' => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  _Box(head: [const _H2('Achievements'), const Spacer(), KButton('Add', small: true, icon: LucideIcons.plus, onPressed: () => _add('ach', reload))], children: [
                    for (final (i, a) in achievements.indexed) _BedRow(last: i == achievements.length - 1, children: [
                      SizedBox(width: 92, child: _Tag('${a['level']}', tone: const {'International': 'ok', 'National': 'ok', 'State': 'warn'}[a['level']], center: true)),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${a['title']}', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                        Text('${a['award'] ?? ''}${a['award'] != null ? ' · ' : ''}${day(a['achieved_on'])}', style: const TextStyle(fontSize: 12, color: _muted)),
                      ])),
                      if (a['verified'] != true) const _Tag('To verify', tone: 'warn'),
                    ]),
                    if (achievements.isEmpty) const _BedRow(last: true, children: [Text('No achievements yet.', style: TextStyle(fontSize: 12, color: _muted))]),
                  ]),
                  const SizedBox(height: 12),
                  _Box(head: [const _H2('Activities')], children: [
                    for (final (i, a) in activities.indexed) _BedRow(last: i == activities.length - 1, children: [
                      SizedBox(width: 92, child: _Tag(words(a['type']).replaceAll('NSS NCC', 'NSS / NCC'), center: true)),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${a['title']}', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                        Text('${a['role'] ?? ''}${a['role'] != null ? ' · ' : ''}${day(a['from_date'])}${a['to_date'] != null ? ' to ${day(a['to_date'])}' : ', ongoing'}${_n(a['hours']) > 0 ? ' · ${a['hours']} h' : ''}',
                            style: const TextStyle(fontSize: 12, color: _muted)),
                      ])),
                    ]),
                    if (activities.isEmpty) const _BedRow(last: true, children: [Text('No activities yet.', style: TextStyle(fontSize: 12, color: _muted))]),
                  ]),
                ]),
              _ => _Box(children: [
                  Padding(padding: const EdgeInsets.fromLTRB(14, 12, 14, 12), child: _Facts([
                    ('Room', st['room_code'] != null ? '${st['hostel_code']} ${st['room_code']}' : '—'), ('Floor Manager', st['floor_warden'] != null ? titleCase(st['floor_warden']) : '—'),
                    ('Night roll call', _pct(h['night_pct'])), ('All sessions', _pct(h['session_pct'])), ('Nights missed', '${h['nights_missed']}'),
                    ('Outings', '${h['outings']}'), ('Late returns', '${h['late_returns']}'), ('Sick days', '${h['sick_days']}'), ('Alerts', '${h['alerts']}'),
                    ('Dues', inr(h['dues'])),
                  ])),
                ]),
            };

        return CustomScrollView(physics: const AlwaysScrollableScrollPhysics(), slivers: [
          SliverPadding(padding: const EdgeInsets.fromLTRB(16, 16, 16, 14), sliver: SliverToBoxAdapter(child: _Hero(st: st, last: last, crtPct: crtPct, nightPct: h['night_pct']))),
          SliverPersistentHeader(pinned: true, delegate: _TabsBar(tabs.contains(tab) ? tab : tabs.first, tabs, (t) => setState(() => tab = t))),
          SliverPadding(padding: const EdgeInsets.fromLTRB(16, 14, 16, 90), sliver: SliverToBoxAdapter(child: body())),
        ]);
      });

  static String _month(String m) { final d = DateTime.parse('$m-01'); return d.month == 9 ? 'Sept' : DateFormat('MMM').format(d); }

  void _add(String kind, Future<void> Function() reload) {
    final cert = kind == 'cert';
    final f = <String, String>{if (cert) 'category': 'Technical' else 'level': 'University'};
    var busy = false;
    showKSheet(context, mod: Mod.sky, icon: LucideIcons.graduationCap, title: cert ? 'Add a certificate' : 'Add an achievement', sub: 'A Warden verifies it before it counts on your record',
        body: (ctx, set) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          _Field('Title', required: true, child: _input(f, 'title', set, hint: cert ? 'AWS Cloud Practitioner' : 'Smart India Hackathon')),
          if (cert) ...[
            _Field('Given by', required: true, child: _input(f, 'provider', set, hint: 'Coursera, NPTEL, AWS…')),
            _Field('Kind', child: _select(f, 'category', set, const ['Technical', 'Cloud', 'Programming', 'Language', 'Soft_Skill', 'Sports', 'Other'])),
            _Field('Issued on', required: true, child: _date(ctx, f, 'issued_on', set)),
            _Field('Credential ID or link', child: _input(f, 'credential_ref', set)),
          ] else ...[
            _Field('Level', child: _select(f, 'level', set, const ['Hostel', 'University', 'State', 'National', 'International'])),
            _Field('Award', child: _input(f, 'award', set, hint: 'First prize, Finalist…')),
            _Field('Date', required: true, child: _date(ctx, f, 'achieved_on', set)),
          ],
        ]),
        footer: (ctx, set) {
          final missing = (cert ? ['title', 'provider', 'issued_on'] : ['title', 'achieved_on']).where((k) => (f[k] ?? '').isEmpty).isNotEmpty;
          return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            KButton('Add', block: true, busy: busy, onPressed: missing ? null : () async {
              set(() => busy = true);
              final body = {for (final e in f.entries) if (e.value.isNotEmpty) e.key: e.value};
              if (await act(context, () => Api.instance.post(cert ? '/me/certifications' : '/me/achievements', body), 'Added; waiting to be verified')) {
                if (ctx.mounted) Navigator.pop(ctx);
                reload();
              }
              if (ctx.mounted) set(() => busy = false);
            }),
            if (missing) const Padding(padding: EdgeInsets.only(top: 6), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Padding(padding: EdgeInsets.only(top: 1), child: Icon(LucideIcons.lock, size: 14, color: _muted)), SizedBox(width: 4),
              Expanded(child: Text('Fill the starred fields.', style: TextStyle(fontSize: 12, height: 16 / 12, color: _muted))),
            ])),
          ]);
        });
  }

  /// One qualification from before KL: the level, where, when, the marks and a photo of the certificate.
  void _addPrior(Future<void> Function() reload, List<String> wanted, List<Map> prior) {
    final first = wanted.firstWhere((l) => !prior.any((p) => p['level'] == l), orElse: () => wanted.first);
    final f = <String, String>{'level': first};
    String? photo; var busy = false;
    Map? existing() => prior.where((p) => p['level'] == f['level']).firstOrNull;
    Future<void> pick(StateSetter set, ImageSource src) async {
      try {
        final x = await ImagePicker().pickImage(source: src, maxWidth: 1100, maxHeight: 1600, imageQuality: 62);
        if (x == null) return;
        final url = 'data:image/jpeg;base64,${base64Encode(await x.readAsBytes())}';
        if (url.length > 1400000) { if (mounted) toast(context, 'That photo is too large. Take it again a little further away.', error: true); return; }
        set(() => photo = url);
      } catch (e) { if (mounted) toast(context, 'Could not open the picture: $e', error: true); }
    }
    showKSheet(context, mod: Mod.sky, icon: LucideIcons.graduationCap, title: 'Before KL', sub: 'Your marks and a photo of the certificate; the office checks them against your admission file',
        body: (ctx, set) {
          final e = existing();
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            _Field('Qualification', child: _select(f, 'level', set, wanted)),
            if (e != null) Padding(padding: const EdgeInsets.only(bottom: 10), child: Text('On record: ${_marks(e)}${e['institution'] != null ? ', ${e['institution']}' : ''}. Saving replaces it.', style: const TextStyle(fontSize: 12.5, color: _muted))),
            _Field('Board or university', child: _input(f, 'board', set, hint: f['level'] == 'SSC' ? 'Board of Secondary Education, AP' : f['level'] == 'Intermediate' ? 'Board of Intermediate Education' : 'University')),
            _Field('School or college', child: _input(f, 'institution', set)),
            if (f['level'] != 'SSC') _Field('Group or branch', child: _input(f, 'group_name', set, hint: 'MPC, BiPC, B.Tech CSE…')),
            _Field('Year passed', required: true, child: _input(f, 'year_passed', set, hint: '2026')),
            _Field('Marks %', child: _input(f, 'marks_pct', set, hint: '96.3')),
            _Field('or CGPA', child: _input(f, 'cgpa', set, hint: '9.5')),
            _Field('Roll or hall-ticket number', child: _input(f, 'roll_no', set)),
            const KLabel('Certificate photo'),
            if (photo != null) ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.memory(base64Decode(photo!.split(',').last), height: 160, fit: BoxFit.cover)),
            Row(children: [
              Expanded(child: KButton(photo == null ? 'Take a photo' : 'Take again', icon: LucideIcons.camera, kind: BtnKind.secondary, onPressed: () => pick(set, ImageSource.camera))),
              const SizedBox(width: 8),
              Expanded(child: KButton('From gallery', icon: LucideIcons.image, kind: BtnKind.secondary, onPressed: () => pick(set, ImageSource.gallery))),
            ]),
          ]);
        },
        footer: (ctx, set) {
          final missing = (f['year_passed'] ?? '').isEmpty || ((f['marks_pct'] ?? '').isEmpty && (f['cgpa'] ?? '').isEmpty);
          return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            KButton('Save', block: true, busy: busy, onPressed: missing ? null : () async {
              set(() => busy = true);
              final body = <String, dynamic>{for (final x in f.entries) if (x.value.trim().isNotEmpty) x.key: x.value.trim(), if (photo != null) 'certificate': photo};
              if (await act(context, () => Api.instance.post('/me/prior-education', body), 'Saved; the office verifies it against your admission file')) {
                if (ctx.mounted) Navigator.pop(ctx);
                reload();
              }
              if (ctx.mounted) set(() => busy = false);
            }),
            if (missing) const Padding(padding: EdgeInsets.only(top: 6), child: Text('Year passed and the marks (% or CGPA) are needed.', style: TextStyle(fontSize: 12, color: _muted))),
          ]);
        });
  }

  static Widget _input(Map<String, String> f, String k, StateSetter set, {String? hint}) => TextFormField(
      initialValue: f[k], onChanged: (v) => set(() => f[k] = v), style: const TextStyle(fontSize: 16),
      decoration: InputDecoration(hintText: hint, hintStyle: const TextStyle(fontSize: 16, color: Color(0xFF626B7C)), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12)));

  static Widget _select(Map<String, String> f, String k, StateSetter set, List<String> options) => DropdownButtonFormField<String>(
      initialValue: f[k], isExpanded: true, onChanged: (v) => set(() => f[k] = v ?? f[k]!),
      items: [for (final o in options) DropdownMenuItem(value: o, child: Text(words(o), style: const TextStyle(fontSize: 16)))],
      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)));

  static Widget _date(BuildContext ctx, Map<String, String> f, String k, StateSetter set) => InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: () async {
        final now = DateTime.now();
        final d = await showDatePicker(context: ctx, firstDate: DateTime(now.year - 10), lastDate: DateTime(now.year + 1), initialDate: now);
        if (d != null) set(() => f[k] = isoDay(d));
      },
      child: InputDecorator(decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12), suffixIcon: Icon(LucideIcons.calendar, size: 18, color: K.ink2)),
          child: Text(f[k] == null ? 'dd-mm-yyyy' : DateFormat('dd-MM-yyyy').format(DateTime.parse(f[k]!)), style: TextStyle(fontSize: 16, color: f[k] == null ? const Color(0xFF626B7C) : K.ink))));
}

/* ------------------------------------------------------------ the head */

class _Hero extends StatelessWidget {
  final Map st;
  final Map? last;
  final num? crtPct;
  final dynamic nightPct;
  const _Hero({required this.st, required this.last, required this.crtPct, required this.nightPct});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: _line)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Container(width: 56, height: 56, alignment: Alignment.center, decoration: BoxDecoration(color: K.brand, borderRadius: BorderRadius.circular(18)),
                child: Text(_initials(st['full_name']), style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: Colors.white))),
            const SizedBox(width: 16),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(titleCase(st['full_name']), style: const TextStyle(fontSize: 19, height: 28 / 19, fontWeight: FontWeight.w600, letterSpacing: -.19)),
              Padding(padding: const EdgeInsets.only(top: 2, bottom: 8), child: Text('${st['student_id']} · ${st['programme']} · ${st['dept_name'] ?? st['dept_code'] ?? st['level']}',
                  style: const TextStyle(fontSize: 13, color: _muted))),
              Wrap(spacing: 6, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
                st['room_code'] != null ? _Tag('${st['hostel_code']} ${st['room_code']}, ${st['floor_name']}', icon: LucideIcons.bedDouble, iconSize: 12) : const _Tag('Day scholar'),
                if (st['current_status'] != null) Pill.status(st['current_status']),
              ]),
            ])),
          ]),
          const SizedBox(height: 16),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            _Ring(_n(last?['cgpa']).toDouble(), 10, last != null ? _n(last!['cgpa']).toStringAsFixed(2) : '—', 'CGPA', _violet),
            _Ring(_n(last?['attendance_pct']).toDouble(), 100, _num(last?['attendance_pct']), 'Class %', _sky),
            _Ring((crtPct ?? 0).toDouble(), 100, _num(crtPct), 'CRT %', _coral),
            _Ring(_n(nightPct).toDouble(), 100, _num(nightPct), 'Residency %', _green),
          ]),
        ]),
      );
}

/// KLH ProgressRing, 68 px with a 7 px stroke, the figure inside and the name under it.
class _Ring extends StatelessWidget {
  final double v, max;
  final String label, sub;
  final Color color;
  const _Ring(this.v, this.max, this.label, this.sub, this.color);
  @override
  Widget build(BuildContext context) => Semantics(label: '$sub $label', child: Column(mainAxisSize: MainAxisSize.min, children: [
        SizedBox(width: 68, height: 68, child: CustomPaint(painter: _RingPaint((v / max).clamp(0, 1).toDouble(), color),
            child: Center(child: Text(label, style: const TextStyle(fontSize: 22, height: 26 / 22, fontWeight: FontWeight.w800, color: K.ink))))),
        const SizedBox(height: 4),
        Text(sub, style: const TextStyle(fontSize: 11.5, color: _muted)),
      ]));
}

class _RingPaint extends CustomPainter {
  final double pct;
  final Color color;
  const _RingPaint(this.pct, this.color);
  @override
  void paint(Canvas canvas, Size size) {
    const sw = 7.0;
    final r = (size.width - sw) / 2;
    final c = size.center(Offset.zero);
    canvas.drawCircle(c, r, Paint()..style = PaintingStyle.stroke..strokeWidth = sw..color = _grid);
    if (pct > 0) canvas.drawArc(Rect.fromCircle(center: c, radius: r), -math.pi / 2, 2 * math.pi * pct, false, Paint()..style = PaintingStyle.stroke..strokeWidth = sw..strokeCap = StrokeCap.round..color = color);
  }
  @override
  bool shouldRepaint(_RingPaint o) => o.pct != pct || o.color != color;
}

/// The tab strip (s360-tabs), pinned under the top bar as the web keeps it sticky.
class _TabsBar extends SliverPersistentHeaderDelegate {
  final String tab;
  final List<String> tabs;
  final ValueChanged<String> onTab;
  _TabsBar(this.tab, this.tabs, this.onTab);
  @override
  double get minExtent => 42;
  @override
  double get maxExtent => 42;
  @override
  bool shouldRebuild(_TabsBar o) => o.tab != tab || o.tabs != tabs;
  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) => Container(
        color: K.ground, margin: const EdgeInsets.symmetric(horizontal: 16),
        child: Stack(children: [
          const Positioned(left: 0, right: 0, bottom: 0, child: Divider(height: 1, thickness: 1, color: _line)),
          SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [
            for (final (i, t) in tabs.indexed) Padding(padding: EdgeInsets.only(left: i == 0 ? 0 : 4), child: Semantics(selected: tab == t, button: true, child: InkWell(onTap: () => onTab(t), child: Container(
              height: 42, padding: const EdgeInsets.fromLTRB(12, 10, 12, 9), alignment: Alignment.center,
              decoration: BoxDecoration(border: Border(bottom: BorderSide(color: tab == t ? K.brand : Colors.transparent, width: 2))),
              child: Text(t, style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w500, color: tab == t ? K.brandInk : _muted)))))),
          ])),
        ]),
      );
}

/* ------------------------------------------------------------ pieces */

/// A tag (.tag): small grey pill, or the success / warning / critical tints.
class _Tag extends StatelessWidget {
  final String text;
  final String? tone;
  final IconData? icon;
  final double iconSize;
  final bool center;
  const _Tag(this.text, {this.tone, this.icon, this.iconSize = 11, this.center = false});
  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) { 'ok' => (K.goodBg, K.good), 'warn' => (K.warnBg, K.warn), 'bad' => (K.badBg, K.bad), _ => (_surface2, _muted) };
    return Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
        child: Row(mainAxisSize: center ? MainAxisSize.max : MainAxisSize.min, mainAxisAlignment: MainAxisAlignment.center, children: [
          if (icon != null) ...[Icon(icon, size: iconSize, color: fg), const SizedBox(width: 4)],
          Flexible(child: Text(text, maxLines: 1, softWrap: false, overflow: TextOverflow.visible, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w500, color: fg))),
        ]));
  }
}

/// A box (.box) with its head (.box-head) and body.
class _Box extends StatelessWidget {
  final List<Widget>? head;
  final List<Widget> children;
  const _Box({this.head, required this.children});
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: _line)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (head != null) Container(constraints: const BoxConstraints(minHeight: 42), padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _line))), child: Row(children: [
                for (final (i, w) in head!.indexed) ...[if (i > 0) const SizedBox(width: 8), w],
              ])),
          ...children,
        ]));
}

class _H2 extends StatelessWidget {
  final String text;
  const _H2(this.text);
  @override
  Widget build(BuildContext context) => Text(text, style: const TextStyle(fontSize: 15, height: 22 / 15, fontWeight: FontWeight.w600));
}

/// A row of a .bedlist: 9 x 12 padding, a hairline under all but the last.
class _BedRow extends StatelessWidget {
  final List<Widget> children;
  final bool last;
  const _BedRow({required this.children, this.last = false});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(border: last ? null : const Border(bottom: BorderSide(color: _line))),
        child: DefaultTextStyle.merge(style: const TextStyle(fontSize: 13.5), child: Row(children: [
          for (final (i, w) in children.indexed) ...[if (i > 0) const SizedBox(width: 10), w],
        ])));
}

/// A table cell on a phone: its column name small above the value.
class _Cell extends StatelessWidget {
  final String label;
  final Widget child;
  const _Cell(this.label, this.child);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 11, color: _muted)),
        DefaultTextStyle.merge(style: const TextStyle(fontSize: 13.5, color: K.ink), child: child),
      ]));
}

/// An overview tile (s360-tile): the head with a chevron, then its lines; opens a tab.
class _Tile extends StatelessWidget {
  final String title;
  final VoidCallback go;
  final List<Widget> children;
  const _Tile(this.title, this.go, this.children);
  @override
  Widget build(BuildContext context) => Material(color: Colors.white, borderRadius: BorderRadius.circular(16), child: InkWell(onTap: go, borderRadius: BorderRadius.circular(16), child: Container(
        width: double.infinity, constraints: const BoxConstraints(minHeight: 130), padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: _line)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(title, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: _muted))),
            const Icon(LucideIcons.chevronRight, size: 13, color: _muted),
          ]),
          for (final c in children) Padding(padding: const EdgeInsets.only(top: 4), child: c),
        ]))));
}

class _Big extends StatelessWidget {
  final String text;
  final String? small;
  const _Big(this.text, {this.small});
  @override
  Widget build(BuildContext context) => Text.rich(TextSpan(children: [
        TextSpan(text: text),
        if (small != null) TextSpan(text: small, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: _muted)),
      ]), style: const TextStyle(fontSize: 28, height: 34 / 28, fontWeight: FontWeight.w600, color: K.ink));
}

class _TileLine extends StatelessWidget {
  final String text;
  const _TileLine(this.text);
  @override
  Widget build(BuildContext context) => Text(text, maxLines: 1, overflow: TextOverflow.ellipsis, softWrap: false, style: const TextStyle(fontSize: 12.5, color: _muted));
}

/// KLH Sparkline, 160 x 34: the line, a soft area under it and an open dot on the last point.
class _Spark extends StatelessWidget {
  final List<double> data;
  final Color line, area;
  const _Spark(this.data, this.line, this.area);
  @override
  Widget build(BuildContext context) => data.length < 2 ? const SizedBox.shrink() : SizedBox(width: 160, height: 34, child: CustomPaint(painter: _SparkPaint(data, line, area)));
}

class _SparkPaint extends CustomPainter {
  final List<double> d;
  final Color line, area;
  const _SparkPaint(this.d, this.line, this.area);
  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width, ht = size.height;
    final mn = d.reduce(math.min), mx = d.reduce(math.max), rg = mx - mn == 0 ? 1 : mx - mn;
    final pts = [for (var i = 0; i < d.length; i++) Offset(i / (d.length - 1) * w, ht - 3 - (d[i] - mn) / rg * (ht - 6))];
    final path = Path()..moveTo(pts[0].dx, pts[0].dy);
    for (final p in pts.skip(1)) { path.lineTo(p.dx, p.dy); }
    final fill = Path.from(path)..lineTo(w, ht)..lineTo(0, ht)..close();
    canvas.drawPath(fill, Paint()..color = area.withValues(alpha: .7));
    final stroke = Paint()..style = PaintingStyle.stroke..strokeWidth = 2..strokeCap = StrokeCap.round..strokeJoin = StrokeJoin.round..color = line;
    canvas.drawPath(path, stroke);
    canvas.drawCircle(pts.last, 3, Paint()..color = Colors.white);
    canvas.drawCircle(pts.last, 3, stroke);
  }
  @override
  bool shouldRepaint(_) => true;
}

/// KLH BarChart: a 560-wide drawing scaled to the box, four grid lines with figures, gradient bars, values on top.
class _BarChart extends StatelessWidget {
  final List<({String label, num value, bool hi})> data;
  final double height;
  const _BarChart(this.data, {required this.height});
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, box) => SizedBox(width: box.maxWidth, height: height * box.maxWidth / 560,
      child: CustomPaint(painter: _BarPaint(data, height))));
}

class _BarPaint extends CustomPainter {
  final List<({String label, num value, bool hi})> data;
  final double hgt;
  const _BarPaint(this.data, this.hgt);
  void _text(Canvas c, String s, double x, double y, TextAlign align, {bool bold = false}) {
    final tp = TextPainter(text: TextSpan(text: s, style: TextStyle(fontFamily: 'PlusJakartaSans', fontSize: 11, fontWeight: bold ? FontWeight.w700 : FontWeight.w500, color: bold ? K.ink : _muted)),
        textDirection: TextDirection.ltr)..layout();
    final dx = align == TextAlign.end ? x - tp.width : align == TextAlign.center ? x - tp.width / 2 : x;
    tp.paint(c, Offset(dx, y - tp.height * .78)); // y is the text baseline, as in SVG
  }
  @override
  void paint(Canvas canvas, Size size) {
    const w = 560.0, pl = 36.0, pb = 26.0, pt = 18.0;
    final h = hgt;
    canvas.save();
    canvas.scale(size.width / w);
    final mx = (data.map((d) => d.value).fold<num>(0, math.max) * 1.15).toDouble();
    final top = mx == 0 ? 1.0 : mx;
    final step = (w - pl) / data.length, bw = math.min(36.0, step * .56);
    for (var t = 0; t <= 4; t++) {
      final y = pt + (h - pt - pb) * (1 - t / 4);
      canvas.drawLine(Offset(pl, y), Offset(w, y), Paint()..color = _grid..strokeWidth = 1);
      _text(canvas, '${(top * t / 4).round()}', pl - 8, y + 4, TextAlign.end);
    }
    for (var i = 0; i < data.length; i++) {
      final d = data[i];
      final bh = (h - pt - pb) * d.value / top, x = pl + i * step + (step - bw) / 2, y = h - pb - bh;
      final rect = Rect.fromLTWH(x, y, bw, math.max(bh.toDouble(), 1));
      final grad = d.hi ? const LinearGradient(colors: [K.sun, K.ember], begin: Alignment.topCenter, end: Alignment.bottomCenter)
          : const LinearGradient(colors: [_sky, K.brand], begin: Alignment.topCenter, end: Alignment.bottomCenter);
      canvas.drawRRect(RRect.fromRectAndRadius(rect, Radius.circular(math.min(8, bw / 3))), Paint()..shader = grad.createShader(rect));
      _text(canvas, _js(d.value), x + bw / 2, y - 6, TextAlign.center, bold: true);
      _text(canvas, d.label, x + bw / 2, h - 8, TextAlign.center);
    }
    canvas.restore();
  }
  @override
  bool shouldRepaint(_) => true;
}

/// The hostel facts (.facts): two a row on a phone, hairline boxes, label over a 15 px value.
class _Facts extends StatelessWidget {
  final List<(String, String)> items;
  const _Facts(this.items);
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, box) {
        final cols = ((box.maxWidth + 8) / 118).floor().clamp(1, 10);
        final cw = (box.maxWidth - 8 * (cols - 1)) / cols;
        return Wrap(spacing: 8, runSpacing: 8, children: [
          for (final (l, v) in items) Container(width: cw, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: _line)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(l, style: const TextStyle(fontSize: 11.5, color: _muted)), const SizedBox(height: 2),
                Text(v, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              ])),
        ]);
      });
}

/// A KLH field: the 13 px label (a red star when required) over the control, 14 px under it.
class _Field extends StatelessWidget {
  final String label;
  final bool required;
  final Widget child;
  const _Field(this.label, {this.required = false, required this.child});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 14), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text.rich(TextSpan(children: [TextSpan(text: label), if (required) const TextSpan(text: ' *', style: TextStyle(color: K.bad))]),
            style: const TextStyle(fontSize: 13, height: 18 / 13, fontWeight: FontWeight.w600, color: K.ink)),
        const SizedBox(height: 6),
        child,
      ]));
}
