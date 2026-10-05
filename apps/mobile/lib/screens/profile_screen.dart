import 'dart:convert';
import 'dart:math' as math;
import 'dart:ui' show PointMode;
import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

// profile.css tokens
const _ink2 = Color(0xFF475467), _ink3 = Color(0xFF667085), _line = Color(0xFFE8ECF2), _tint = Color(0xFFE6F4F1), _seq = Color(0xFF2A78D6);
const _good = Color(0xFF0CA30C), _bad = Color(0xFFD03B3B), _rowLine = Color(0xFFF2F4F7), _grid = Color(0xFFEEF1F6);
const _goal = {
  'Placement_Product': 'Placement, product companies', 'Placement_Services': 'Placement, IT services', 'Higher_Studies': 'Higher studies',
  'Govt_Exams': 'Government exams', 'Entrepreneurship': 'Start-up', 'Core_Other': 'Core or other field', 'Undecided': 'Not decided yet',
};
const _attMin = 75;
num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
num? _nn(dynamic v) => v == null ? null : num.tryParse('$v');
/// A number as JavaScript prints it.
String _js(num v) => v == v.roundToDouble() ? '${v.round()}' : '$v';
String _initials(String n) => n.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).take(2).map((w) => w[0]).join().toUpperCase();
String _mobile(dynamic m) => '${m ?? ''}'.replaceFirstMapped(RegExp(r'(\d{5})(\d{5})'), (x) => '${x[1]} ${x[2]}');
String _inr(num n) => inr(n.round());
List<Map> _list(dynamic v) => ((v as List?) ?? []).cast<Map>();

/// GEN-01 for a student (pages/general/StudentProfile.tsx): the photo and record, academic standing, placement training,
/// activities, achievements and certifications; the hostel stay, fees, hostel life, electricity and career goal; family
/// contacts, which the student verifies and from which they choose who recommends their outings.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic> d = {};
  Object? error;
  bool loading = true;

  @override
  void initState() { super.initState(); load(); }

  Future<dynamic> _try(String path) async { try { return await Api.instance.get(path); } catch (_) { return null; } }

  Future<void> load() async {
    try {
      final r = await Future.wait([Api.instance.get('/students/$me'), _try('/students/$me/360'), _try('/me/room'), _try('/students/$me/demands'), _try('/me/career-goal'), _try('/meters/mine')]);
      if (!mounted) return;
      setState(() { d = {'me': r[0], 'p': r[1], 'room': r[2], 'dues': r[3], 'goal': r[4], 'meter': r[5]}; error = null; loading = false; });
    } catch (e) {
      if (mounted) setState(() { error = e; loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Padding(padding: EdgeInsets.symmetric(vertical: 56), child: Text('Loading your profile…', textAlign: TextAlign.center, style: TextStyle(color: _ink3)));
    if (error != null) return ErrorView(message: '$error', onRetry: () { setState(() => loading = true); load(); });
    final m = d['me'] as Map;
    final p = d['p'] as Map?;
    final room = d['room'] as Map?;
    final dues = d['dues'] as Map?;
    final goal = d['goal'] as Map?;
    final meter = d['meter'] as Map?;
    final terms = _list(p?['terms']);
    final last = terms.lastOrNull;
    final backlogs = _n(last?['backlogs']);
    final att = _nn(last?['attendance_pct']);
    final cgpa = _nn(last?['cgpa']);
    final due = _list(dues?['totals']).fold<num>(0, (a, t) => a + _n(t['balance']));
    final hostel = p?['hostel'] as Map?;
    final night = _nn(hostel?['night_pct']);
    final name = titleCase(m['full_name']);
    final acts = _list(p?['activities']), achs = _list(p?['achievements']), certs = _list(p?['certs']);

    final stats = <(IconData, String, String, String)>[
      (LucideIcons.graduationCap, 'CGPA', cgpa != null ? cgpa.toStringAsFixed(2) : '—', cgpa == null ? 'none' : cgpa >= 7 ? 'good' : cgpa >= 6 ? 'warn' : 'bad'),
      (LucideIcons.bookOpen, 'Attendance', att != null ? '${_js(att)}%' : '—', att == null ? 'none' : att >= _attMin ? 'good' : 'bad'),
      (LucideIcons.triangleAlert, 'Backlogs', _js(backlogs), backlogs > 0 ? 'bad' : 'good'),
      (LucideIcons.wallet, 'Fees due', _inr(due), due > 0 ? 'warn' : 'good'),
      (LucideIcons.moon, 'Roll call', night != null ? '${_js(night)}%' : '—', night == null ? 'none' : night >= 90 ? 'good' : 'warn'),
      (LucideIcons.trophy, 'Activities & awards', '${acts.length + achs.length + certs.length}', 'none'),
    ];

    return RefreshIndicator(onRefresh: load, child: ListView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 16, 16, 90), children: [
      _Hero(m: m, name: name, room: room, goal: goal, stats: stats),
      const SizedBox(height: 18),

      // ---------------- main column
      _Card(icon: LucideIcons.graduationCap, title: 'Academic performance',
          sub: last != null ? '${last['term_label']} · ${terms.length} term${terms.length == 1 ? '' : 's'} on record' : 'Results appear after the first term',
          children: terms.isEmpty ? [const _Empty('No term results yet.')] : [
            _Big(terms),
            _GpaChart(terms),
            _TermTable(terms),
            if (backlogs > 0 || (att != null && att < _attMin)) Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10), decoration: BoxDecoration(color: const Color(0xFFFFF6E5), borderRadius: BorderRadius.circular(12)),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Padding(padding: EdgeInsets.only(top: 1), child: Icon(LucideIcons.triangleAlert, size: 15, color: Color(0xFFB07800))), const SizedBox(width: 8),
                Expanded(child: Text('${[if (backlogs > 0) '${_js(backlogs)} backlog${backlogs > 1 ? 's' : ''} to clear', if (att != null && att < _attMin) 'attendance ${_js(att)}% is below $_attMin%'].join(' and ')}. '
                    'Your counsellor${m['counsellor_name'] != null ? ', ${titleCase(m['counsellor_name'])},' : ''} can help.', style: const TextStyle(fontSize: 13, color: Color(0xFF7A4B00)))),
              ])),
          ]),
      const SizedBox(height: 18),
      _Card(icon: LucideIcons.briefcase, title: 'Placement training', sub: 'Practice tests and training sessions',
          children: [p != null && _list((p['crt'] as Map?)?['tests']).isNotEmpty ? _Crt(p['crt'] as Map) : const _Empty('No placement-training tests yet.')]),
      const SizedBox(height: 18),
      _Card(icon: LucideIcons.sparkles, title: 'Activities, achievements and certifications', children: [
        if (acts.isEmpty && achs.isEmpty && certs.isEmpty) const _Empty('Clubs, sports, internships, certifications and awards you add with your counsellor appear here.')
        else Column(children: [
          for (final (i, t) in <Widget>[
            for (final a in achs) _Tile(LucideIcons.trophy, 'Achievement', '${a['title']}', '${a['level']} level${a['award'] != null ? ' · ${a['award']}' : ''} · ${day(a['achieved_on'])}', a['verified'] == true, 'gold'),
            for (final a in acts) _Tile(LucideIcons.award, words(a['type']), '${a['title']}',
                '${a['role'] ?? 'Member'} · ${day(a['from_date'])}${a['to_date'] != null ? ' to ${day(a['to_date'])}' : ', ongoing'}${_n(a['hours']) > 0 ? ' · ${a['hours']} h' : ''}', false, 'teal'),
            for (final c in certs) _Tile(LucideIcons.badgeCheck, '${c['category']} certification', '${c['title']}', '${c['provider']} · ${day(c['issued_on'])}', c['verified'] == true, 'blue'),
          ].indexed) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 10), child: t),
        ]),
      ]),
      const SizedBox(height: 18),
      _Card(icon: LucideIcons.idCard, title: 'Personal record', sub: 'From the university ERP. Changes are made there.', children: [
        _Dl([
          ('Gender', '${m['gender']}'),
          ('Date of birth', '${day(m['date_of_birth'])} · ${_age(m['date_of_birth'])} years'),
          ('Nationality', '${m['nationality']}'),
          ('Email', '${m['personal_email']}'),
          ('Father', m['father_name'] != null ? titleCase(m['father_name']) : '—'),
          ('Mother', m['mother_name'] != null ? titleCase(m['mother_name']) : '—'),
          ('Admission', '${words(m['admission_type'])}${m['admission_date'] != null ? ' · ${day(m['admission_date'])}' : ''}'),
          ('Regulation', '${m['regulation'] ?? '—'}'),
          ('Counsellor', m['counsellor_name'] != null ? '${titleCase(m['counsellor_name'])}${m['counsellor_mobile'] != null ? ' · ${_mobile(m['counsellor_mobile'])}' : ''}' : 'Not assigned'),
          if (m['disability'] != null) ('Disability', '${m['disability']}'),
        ]),
        for (final a in _list(m['addresses'])) Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Padding(padding: EdgeInsets.only(top: 2), child: Icon(LucideIcons.mapPin, size: 14, color: K.brand)), const SizedBox(width: 8),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${a['type']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: K.ink)),
            Text([a['hno'], a['street'], a['landmark'], a['city'], a['district'], a['state'], a['pincode']].where((x) => x != null && '$x'.isNotEmpty).join(', '),
                style: const TextStyle(fontSize: 13, color: _ink2)),
          ])),
        ]),
      ]),
      const SizedBox(height: 18),

      // ---------------- side column
      _Card(icon: LucideIcons.bedDouble, title: 'Hostel stay', go: () => openPlace(context, 'room'), children: room == null ? [const _Empty('Your room appears here after check-in.')] : [
        Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), gradient: K.primaryGradient),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${room['bed_label']}', style: K.mono(size: 24, weight: FontWeight.w700, color: Colors.white).copyWith(letterSpacing: .48)),
              Opacity(opacity: .85, child: Text('${room['hostel_name']}', style: const TextStyle(fontSize: 11.7, color: Colors.white))),
            ])),
        _Dl([('Floor', '${room['floor_name']}'), ('Room type', '${room['type_name']}'), ('Key', '${room['key_no'] ?? '—'}'), ('Since', day(room['allocation_date']))]),
      ]),
      const SizedBox(height: 18),
      _Card(icon: LucideIcons.indianRupee, title: 'Fees', go: () => openPlace(context, 'fees'),
          children: dues == null ? [const _Empty('Loading…')] : _fees(dues)),
      const SizedBox(height: 18),
      _Card(icon: LucideIcons.doorOpen, title: 'Hostel life', sub: 'This term', children: [
        if (hostel == null) const _Empty('Loading…') else Column(children: [
          for (final (i, (icon, label, value, red)) in <(IconData, String, String, bool)>[
            (LucideIcons.moon, 'Night roll call', night != null ? '${_js(night)}%' : '—', false),
            (LucideIcons.doorOpen, 'Outings', '${hostel['outings']}', false),
            (LucideIcons.triangleAlert, 'Late returns', '${hostel['late_returns']}', _n(hostel['late_returns']) > 0),
            (LucideIcons.heartPulse, 'Sick days', '${hostel['sick_days']}', false),
            (LucideIcons.zap, 'Electricity units left', meter?['units_left'] != null ? _n(meter!['units_left']).toStringAsFixed(0) : '—', false),
          ].indexed) Container(
            padding: const EdgeInsets.symmetric(vertical: 9), decoration: BoxDecoration(border: i == 4 ? null : const Border(bottom: BorderSide(color: _rowLine))),
            child: Row(children: [
              SizedBox(width: 22, child: Icon(icon, size: 15, color: K.brand)), const SizedBox(width: 8),
              Expanded(child: Text(label, style: const TextStyle(fontSize: 13.5, color: _ink2))), const SizedBox(width: 8),
              Text(value, style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: red ? _bad : K.ink)),
            ])),
        ]),
      ]),
      const SizedBox(height: 18),
      _Card(icon: LucideIcons.compass, title: 'Career goal', go: () => openPlace(context, 'home'), children: [
        Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12), decoration: BoxDecoration(color: const Color(0xFFF7F8FA), borderRadius: BorderRadius.circular(14)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text(goal != null ? _goal[goal['goal']] ?? words(goal['goal']) : 'Not chosen yet', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: K.ink)),
              const SizedBox(height: 4),
              Text(goal?['goal'] != null && goal!['goal'] != 'Undecided' ? 'Your counsellor uses this to guide you. Change it from My career goal on Home.' : 'Tell us what you aim for, from My career goal on Home.',
                  style: const TextStyle(fontSize: 12.5, color: _ink3)),
            ])),
      ]),
      const SizedBox(height: 18),
      _Card(icon: LucideIcons.users, title: 'Family contacts', sub: 'Verify each number. One parent or guardian recommends your outings.',
          children: [_Contacts(m: m, onChange: load)]),
    ]));
  }

  static String _age(dynamic dob) { final d = parseDate(dob); return d == null ? '—' : '${(DateTime.now().difference(d).inMilliseconds / (365.25 * 864e5)).floor()}'; }

  List<Widget> _fees(Map d) {
    final totals = _list(d['totals']);
    final due = totals.fold<num>(0, (a, t) => a + _n(t['amount_due'])), paid = totals.fold<num>(0, (a, t) => a + _n(t['amount_paid']));
    final bal = totals.fold<num>(0, (a, t) => a + _n(t['balance']));
    final open = _list(d['demands']).where((x) => ['Pending', 'Part_Paid', 'Overdue'].contains(x['status'])).toList()..sort((a, b) => '${a['due_date']}'.compareTo('${b['due_date']}'));
    final receipts = _list(d['receipts']);
    final f = due > 0 ? (paid / due).toDouble() : 0.0;
    return [
      Row(children: [
        Semantics(label: '${(f * 100).round()}% of fees paid', child: SizedBox(width: 84, height: 84, child: CustomPaint(painter: _FeeRing(f), child: Align(alignment: const Alignment(0, .1),
            child: Text('${(f * 100).round()}%', style: const TextStyle(fontSize: 15 * 84 / 76, fontWeight: FontWeight.w800, color: K.ink)))))),
        const SizedBox(width: 16),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Paid', style: TextStyle(fontSize: 12, color: _ink3)),
          Text(_inr(paid), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: K.ink)),
          const SizedBox(height: 6),
          const Text('Still due', style: TextStyle(fontSize: 12, color: _ink3)),
          Text(_inr(bal), style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: bal > 0 ? _bad : K.ink)),
        ]),
      ]),
      if (open.isNotEmpty) Column(children: [
        for (final x in open.take(4)) Container(padding: const EdgeInsets.symmetric(vertical: 8), decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _rowLine))),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(words(x['fee_head']), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: K.ink)),
                Text('due ${day(x['due_date'])}', style: const TextStyle(fontSize: 11.5, color: _ink3)),
              ])),
              Text(_inr(_n(x['amount_due']) - _n(x['amount_paid'])), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: K.ink)),
            ])),
      ]) else const Row(children: [
        Icon(LucideIcons.circleCheck, size: 15, color: Color(0xFF067647)), SizedBox(width: 6),
        Text('Everything is paid.', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF067647))),
      ]),
      if (bal > 0) KButton('Pay ${_inr(bal)}', icon: LucideIcons.wallet, block: true, onPressed: () => openPlace(context, 'fees')),
      if (receipts.isNotEmpty) Text('Last receipt ${receipts.first['receipt_no']}, ${_inr(_n(receipts.first['amount']))} on ${day(receipts.first['paid_on'])}', style: const TextStyle(fontSize: 12, color: _ink3)),
    ];
  }
}

/* ------------------------------------------------------------ header */

class _Hero extends StatelessWidget {
  final Map m;
  final String name;
  final Map? room, goal;
  final List<(IconData, String, String, String)> stats;
  const _Hero({required this.m, required this.name, required this.room, required this.goal, required this.stats});
  @override
  Widget build(BuildContext context) {
    Widget chip(IconData i, String t, {bool on = false}) => Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: on ? Colors.white.withValues(alpha: .92) : Colors.white.withValues(alpha: .14), borderRadius: BorderRadius.circular(999),
            border: Border.all(color: on ? Colors.transparent : Colors.white.withValues(alpha: .22))),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(i, size: 13, color: on ? K.brand : Colors.white), const SizedBox(width: 5),
          Text(t, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: on ? K.brand : Colors.white)),
        ]));
    final g = goal?['goal'];
    return Container(
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(24), boxShadow: const [BoxShadow(color: Color(0xB30A4F5C), blurRadius: 40, spreadRadius: -22, offset: Offset(0, 18))]),
      child: ClipRRect(borderRadius: BorderRadius.circular(24), child: Container(
        decoration: const BoxDecoration(gradient: LinearGradient(colors: [K.brand, Color(0xFF0A4F5C)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
        child: Stack(children: [
          Positioned.fill(child: Container(decoration: const BoxDecoration(gradient: RadialGradient(center: Alignment.topRight, radius: 1.3, colors: [Color(0xFF13968A), Color(0x0013968A)], stops: [0, .55])))),
          Positioned(right: -60, top: -80, child: Container(width: 240, height: 240, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: .07)))),
          Padding(padding: const EdgeInsets.fromLTRB(16, 22, 16, 22), child: Column(children: [
            _Photo(m: m),
            const SizedBox(height: 22),
            Opacity(opacity: .8, child: Text('${m['dept_name'] ?? m['dept_code'] ?? 'Student'}'.toUpperCase(), textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: .96, color: Colors.white))),
            Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Text(name, textAlign: TextAlign.center, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: -.24, color: Colors.white))),
            Opacity(opacity: .9, child: Text.rich(TextSpan(children: [
              TextSpan(text: '${m['student_id']}', style: K.mono(size: 14, weight: FontWeight.w700, color: Colors.white)),
              TextSpan(text: ' · ${m['programme']}${m['year_semester'] != null ? ' · ${m['year_semester']}' : ''}'),
            ]), textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: Colors.white))),
            const SizedBox(height: 12),
            Wrap(spacing: 6, runSpacing: 6, alignment: WrapAlignment.center, children: [
              chip(LucideIcons.circleCheck, words(m['status']), on: true),
              chip(LucideIcons.bedDouble, room != null ? '${room!['bed_label']}' : m['is_hosteller'] == true ? 'Hosteller' : 'Day scholar'),
              if (g != null && g != 'Undecided') chip(LucideIcons.compass, _goal[g] ?? '$g'),
              if (m['blood_group'] != null) chip(LucideIcons.heartPulse, '${m['blood_group']}'),
            ]),
            const SizedBox(height: 22 + 4),
            LayoutBuilder(builder: (context, box) {
              final w = (box.maxWidth - 10) / 2;
              return Wrap(spacing: 10, runSpacing: 10, children: [
                for (final (icon, label, value, t) in stats) Container(
                  width: w, padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: .1), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withValues(alpha: .16))),
                  foregroundDecoration: t == 'none' ? null : BoxDecoration(borderRadius: BorderRadius.circular(16),
                      border: Border(bottom: BorderSide(width: 3, color: t == 'good' ? const Color(0xFF6EE7A1) : t == 'warn' ? const Color(0xFFFBC75A) : const Color(0xFFFF8A8A)))),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Opacity(opacity: .8, child: Icon(icon, size: 16, color: Colors.white)),
                    const SizedBox(height: 2),
                    Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white)),
                    const SizedBox(height: 2),
                    Opacity(opacity: .85, child: Text(label, style: const TextStyle(fontSize: 12, color: Colors.white))),
                  ])),
              ]);
            }),
          ])),
        ]),
      )),
    );
  }
}

/// The 132 px photo with the white Change / Add photo button over its foot.
class _Photo extends StatelessWidget {
  final Map m;
  const _Photo({required this.m});
  @override
  Widget build(BuildContext context) {
    final src = '${m['photo'] ?? ''}';
    Widget? img;
    if (src.isNotEmpty) {
      try {
        img = src.startsWith('data:') ? Image.memory(base64Decode(src.substring(src.indexOf(',') + 1)), fit: BoxFit.cover) : Image.network(src, fit: BoxFit.cover);
      } catch (_) {}
    }
    return SizedBox(width: 132, height: 132 + 12, child: Stack(clipBehavior: Clip.none, alignment: Alignment.topCenter, children: [
      Container(width: 132, height: 132,
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(28), color: Colors.white.withValues(alpha: .16),
              boxShadow: [BoxShadow(color: Colors.white.withValues(alpha: .35), spreadRadius: 4), const BoxShadow(color: Color(0x73000000), blurRadius: 24, spreadRadius: -10, offset: Offset(0, 12))]),
          child: ClipRRect(borderRadius: BorderRadius.circular(28), child: img ?? Container(alignment: Alignment.center,
              child: Text(_initials('${m['full_name']}'), style: const TextStyle(fontSize: 44, fontWeight: FontWeight.w800, letterSpacing: .88, color: Colors.white))))),
      Positioned(bottom: 0, child: Semantics(button: true, label: src.isNotEmpty ? 'Change photo' : 'Add a photo', child: Material(color: Colors.white, borderRadius: BorderRadius.circular(999), elevation: 0,
          child: InkWell(borderRadius: BorderRadius.circular(999),
              // ponytail: the app has no image picker package; the photo is set from the web portal until one is added.
              onTap: () => toast(context, 'Add or change your photo from the web portal.'),
              child: Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(999), boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 14, offset: Offset(0, 6))]),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(LucideIcons.camera, size: 16, color: K.brand), const SizedBox(width: 6),
                    Text(src.isNotEmpty ? 'Change' : 'Add photo', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: K.brand)),
                  ])))))),
    ]));
  }
}

/* ------------------------------------------------------------ cards and pieces */

/// sp-card: icon tile, 16 px heading and line, an optional chevron; its children 14 px apart.
class _Card extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? sub;
  final VoidCallback? go;
  final List<Widget> children;
  const _Card({required this.icon, required this.title, this.sub, this.go, required this.children});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: _line),
            boxShadow: const [BoxShadow(color: Color(0x0A101828), blurRadius: 2, offset: Offset(0, 1)), BoxShadow(color: Color(0x2E101828), blurRadius: 24, spreadRadius: -18, offset: Offset(0, 8))]),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Container(width: 38, height: 38, decoration: BoxDecoration(color: _tint, borderRadius: BorderRadius.circular(12)), child: Icon(icon, size: 18, color: K.brand)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: K.ink)),
              if (sub != null) Text(sub!, style: const TextStyle(fontSize: 12.5, color: _ink3)),
            ])),
            if (go != null) ...[const SizedBox(width: 12), Semantics(button: true, label: 'Open', child: InkWell(onTap: go, borderRadius: BorderRadius.circular(10),
                child: const SizedBox(width: 34, height: 34, child: Icon(LucideIcons.chevronRight, size: 18, color: _ink3))))],
          ]),
          for (final c in children) ...[const SizedBox(height: 14), c],
        ]),
      );
}

class _Empty extends StatelessWidget {
  final String text;
  const _Empty(this.text);
  @override
  Widget build(BuildContext context) => Text(text, style: const TextStyle(fontSize: 13.5, color: _ink3));
}

/// sp-dl on a phone: one column, an upper-case label over each value.
class _Dl extends StatelessWidget {
  final List<(String, String)> items;
  const _Dl(this.items);
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        for (final (i, (l, v)) in items.indexed) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(l.toUpperCase(), style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, letterSpacing: .46, color: _ink3)),
          const SizedBox(height: 2),
          Text(v, style: const TextStyle(fontSize: 14, color: K.ink)),
        ])),
      ]);
}

/// The big CGPA box with the change in SGPA on the last term.
class _Big extends StatelessWidget {
  final List<Map> terms;
  const _Big(this.terms);
  @override
  Widget build(BuildContext context) {
    final last = terms.last;
    final prev = terms.length > 1 ? _nn(terms[terms.length - 2]['sgpa']) : null;
    final sg = _nn(last['sgpa']);
    final cg = _nn(last['cgpa']);
    return Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: _tint, borderRadius: BorderRadius.circular(16)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(cg?.toStringAsFixed(2) ?? '—', style: const TextStyle(fontSize: 40, height: 1, fontWeight: FontWeight.w800, color: K.brand)),
          const SizedBox(height: 2),
          const Text('CGPA', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, letterSpacing: .75, color: K.brandDark)),
          if (prev != null && sg != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text('${sg >= prev ? '▲' : '▼'} SGPA ${(sg - prev).abs().toStringAsFixed(2)} on last term',
              style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: sg >= prev ? const Color(0xFF067647) : _bad))),
        ]));
  }
}

/// SGPA as bars and CGPA as a line, on one 0-10 scale (a 360 x 130 drawing scaled to the card).
class _GpaChart extends StatelessWidget {
  final List<Map> terms;
  const _GpaChart(this.terms);
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        LayoutBuilder(builder: (context, box) => SizedBox(width: box.maxWidth, height: box.maxWidth * 130 / 360, child: CustomPaint(painter: _GpaPaint(terms)))),
        const SizedBox(height: 4),
        Row(children: [
          Container(width: 12, height: 12, decoration: BoxDecoration(color: const Color(0xFFB9D3F4), borderRadius: BorderRadius.circular(3))), const SizedBox(width: 6),
          const Text('SGPA', style: TextStyle(fontSize: 12, color: _ink2)), const SizedBox(width: 14),
          Container(width: 14, height: 3, decoration: BoxDecoration(color: _seq, borderRadius: BorderRadius.circular(2))), const SizedBox(width: 6),
          const Text('CGPA', style: TextStyle(fontSize: 12, color: _ink2)),
        ]),
      ]);
}

class _GpaPaint extends CustomPainter {
  final List<Map> terms;
  const _GpaPaint(this.terms);
  void _t(Canvas c, String s, double x, double y, TextAlign a) {
    final tp = TextPainter(text: TextSpan(text: s, style: const TextStyle(fontFamily: 'PlusJakartaSans', fontSize: 10, color: _ink3)), textDirection: TextDirection.ltr)..layout();
    tp.paint(c, Offset(a == TextAlign.end ? x - tp.width : x - tp.width / 2, y - tp.height * .78));
  }
  @override
  void paint(Canvas canvas, Size size) {
    const w = 360.0, h = 130.0, l = 26.0, b = 22.0, t = 10.0;
    canvas.save();
    canvas.scale(size.width / w);
    final step = (w - l) / math.max(terms.length, 1), bw = math.min(34.0, step * .5);
    double y(num v) => t + (1 - v / 10) * (h - t - b);
    for (final v in [0, 5, 10]) {
      canvas.drawLine(Offset(l, y(v)), Offset(w, y(v)), Paint()..color = _grid);
      _t(canvas, '$v', l - 6, y(v) + 3, TextAlign.end);
    }
    final pts = [for (var i = 0; i < terms.length; i++) (x: l + step * i + step / 2, sg: _nn(terms[i]['sgpa']), cg: _nn(terms[i]['cgpa']))];
    for (final p in pts) {
      if (p.sg != null) canvas.drawRRect(RRect.fromLTRBR(p.x - bw / 2, y(p.sg!), p.x + bw / 2, y(0), const Radius.circular(4)), Paint()..color = const Color(0xFFB9D3F4));
    }
    final line = [for (final p in pts) if (p.cg != null) Offset(p.x, y(p.cg!))];
    if (line.length > 1) canvas.drawPoints(PointMode.polygon, line, Paint()..color = _seq..strokeWidth = 2..style = PaintingStyle.stroke);
    for (final o in line) {
      canvas.drawCircle(o, 4, Paint()..color = _seq);
      canvas.drawCircle(o, 4, Paint()..color = Colors.white..style = PaintingStyle.stroke..strokeWidth = 2);
    }
    for (var i = 0; i < terms.length; i++) { _t(canvas, 'Sem ${terms[i]['semester_no']}', pts[i].x, h - 6, TextAlign.center); }
    canvas.restore();
  }
  @override
  bool shouldRepaint(_) => true;
}

/// The terms table (sp-table), scrolled sideways on a phone as the web does.
class _TermTable extends StatelessWidget {
  final List<Map> terms;
  const _TermTable(this.terms);
  @override
  Widget build(BuildContext context) {
    const th = TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, letterSpacing: .46, color: _ink3);
    const td = TextStyle(fontSize: 13, color: K.ink);
    Widget h(String t, {bool n = false}) => Padding(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8), child: Align(alignment: n ? Alignment.centerRight : Alignment.centerLeft, child: Text(t.toUpperCase(), style: th)));
    Widget c(Widget w, {bool n = false}) => Padding(padding: const EdgeInsets.all(10), child: Align(alignment: n ? Alignment.centerRight : Alignment.centerLeft, child: DefaultTextStyle.merge(style: td, child: w)));
    return SingleChildScrollView(scrollDirection: Axis.horizontal, child: Table(
      defaultColumnWidth: const IntrinsicColumnWidth(),
      defaultVerticalAlignment: TableCellVerticalAlignment.middle,
      children: [
        TableRow(decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _line))), children: [
          h('Term'), h('SGPA', n: true), h('CGPA', n: true), h('Credits', n: true), h('Attendance'), h('Backlogs', n: true),
        ]),
        for (final t in terms) TableRow(decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _rowLine))), children: [
          c(Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Sem ${t['semester_no']}', style: const TextStyle(fontWeight: FontWeight.w700)),
            if (t['term_label'] != 'Sem ${t['semester_no']}') Text('${t['term_label']}', style: const TextStyle(fontSize: 11.5, color: _ink3)),
          ])),
          c(Text(_nn(t['sgpa'])?.toStringAsFixed(2) ?? '—'), n: true),
          c(Text(_nn(t['cgpa'])?.toStringAsFixed(2) ?? '—'), n: true),
          c(Text('${t['credits'] ?? '—'}'), n: true),
          c(_AttBar(_nn(t['attendance_pct']))),
          c(_n(t['backlogs']) > 0 ? _Pill('${t['backlogs']}', icon: LucideIcons.triangleAlert, bg: const Color(0xFFFCE9E9), iconColor: _bad) : const _Pill('None', bg: Color(0xFFE7F6E7)), n: true),
        ]),
      ],
    ));
  }
}

class _AttBar extends StatelessWidget {
  final num? v;
  const _AttBar(this.v);
  @override
  Widget build(BuildContext context) {
    if (v == null) return const Text('—', style: TextStyle(color: _ink3));
    final low = v! < _attMin;
    return SizedBox(width: 150, child: Row(children: [
      Expanded(child: LayoutBuilder(builder: (context, box) => SizedBox(height: 14, child: Stack(clipBehavior: Clip.none, alignment: Alignment.centerLeft, children: [
        Container(height: 8, decoration: BoxDecoration(color: _grid, borderRadius: BorderRadius.circular(8))),
        Container(height: 8, width: box.maxWidth * math.min(100, v!) / 100, decoration: BoxDecoration(color: low ? _bad : _good, borderRadius: BorderRadius.circular(8))),
        Positioned(left: box.maxWidth * _attMin / 100, top: 0, bottom: 0, child: Container(width: 2, decoration: BoxDecoration(color: _ink3, borderRadius: BorderRadius.circular(1)))),
      ])))),
      const SizedBox(width: 8),
      ConstrainedBox(constraints: const BoxConstraints(minWidth: 42), child: Text('${_js(v!)}%', textAlign: TextAlign.right, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700))),
    ]));
  }
}

/// sp-pill: a small grey, green, red or blue pill with an optional icon.
class _Pill extends StatelessWidget {
  final String text;
  final IconData? icon;
  final Color bg;
  final Color? iconColor;
  const _Pill(this.text, {this.icon, this.bg = _rowLine, this.iconColor});
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 2), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 11, color: iconColor), const SizedBox(width: 4)],
        Text(text, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: K.ink)),
      ]));
}

/// Placement training: average per kind of test, and the share of training sessions attended.
class _Crt extends StatelessWidget {
  final Map crt;
  const _Crt(this.crt);
  @override
  Widget build(BuildContext context) {
    final tests = _list(crt['tests']), att = _list(crt['attendance']);
    final cats = <String>{for (final t in tests) '${t['category']}'};
    final avg = [for (final c in cats) () {
      final ts = tests.where((t) => t['category'] == c).toList();
      return (c: c, pct: (ts.fold<num>(0, (a, t) => a + 100 * _n(t['score']) / _n(t['max_score'])) / ts.length).round(), n: ts.length);
    }()]..sort((a, b) => b.pct - a.pct);
    final held = att.fold<num>(0, (a, x) => a + _n(x['held'])), went = att.fold<num>(0, (a, x) => a + _n(x['attended']));
    final sessions = held > 0 ? (100 * went / held).round() : null;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (final (i, x) in avg.indexed) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 10), child: Row(children: [
        SizedBox(width: 110, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(words(x.c), style: const TextStyle(fontSize: 13, color: _ink2)),
          Text('${x.n} test${x.n > 1 ? 's' : ''}', style: const TextStyle(fontSize: 11, color: _ink3)),
        ])),
        const SizedBox(width: 10),
        Expanded(child: ClipRRect(borderRadius: BorderRadius.circular(6), child: Container(height: 12, color: _grid, child: FractionallySizedBox(alignment: Alignment.centerLeft,
            widthFactor: (x.pct / 100).clamp(0, 1).toDouble(), child: Container(decoration: BoxDecoration(color: _seq, borderRadius: BorderRadius.circular(6))))))),
        const SizedBox(width: 10),
        SizedBox(width: 46, child: Text('${x.pct}%', textAlign: TextAlign.right, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: K.ink))),
      ])),
      const SizedBox(height: 16),
      Container(padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: sessions != null && sessions < 60 ? const Color(0xFFFFF6E5) : const Color(0xFFF7F8FA), borderRadius: BorderRadius.circular(16)),
          child: Column(children: [
            Text(sessions != null ? '$sessions%' : '—', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: K.ink)),
            const SizedBox(height: 4),
            Text('training sessions attended\n${_js(went)} of ${_js(held)}', textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: _ink3)),
          ])),
    ]);
  }
}

/// An activity, achievement or certification (sp-tile).
class _Tile extends StatelessWidget {
  final IconData icon;
  final String kind, title, meta, accent;
  final bool verified;
  const _Tile(this.icon, this.kind, this.title, this.meta, this.verified, this.accent);
  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (accent) { 'gold' => (const Color(0xFFFFF4D6), const Color(0xFFA35A00)), 'blue' => (const Color(0xFFE6EFFB), const Color(0xFF1C5CAB)), _ => (_tint, K.brand) };
    return Container(width: double.infinity, padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFFFCFCFD), borderRadius: BorderRadius.circular(16), border: Border.all(color: _line)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(width: 38, height: 38, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)), child: Icon(icon, size: 18, color: fg)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('$kind${verified ? ' · verified' : ''}'.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: .44, color: _ink3)),
            Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: K.ink)),
            Text(meta, style: const TextStyle(fontSize: 12, color: _ink2)),
          ])),
        ]));
  }
}

class _FeeRing extends CustomPainter {
  final double f;
  const _FeeRing(this.f);
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 76;
    final c = size.center(Offset.zero), r = 30 * s;
    canvas.drawCircle(c, r, Paint()..style = PaintingStyle.stroke..strokeWidth = 8 * s..color = _tint);
    if (f > 0) canvas.drawArc(Rect.fromCircle(center: c, radius: r), -math.pi / 2, 2 * math.pi * f, false, Paint()..style = PaintingStyle.stroke..strokeWidth = 8 * s..strokeCap = StrokeCap.round..color = K.brand);
  }
  @override
  bool shouldRepaint(_FeeRing o) => o.f != f;
}

/* ------------------------------------------------------------ family contacts */

class _Contacts extends StatefulWidget {
  final Map m;
  final Future<void> Function() onChange;
  const _Contacts({required this.m, required this.onChange});
  @override
  State<_Contacts> createState() => _ContactsState();
}

class _ContactsState extends State<_Contacts> {
  bool busy = false, open = false;
  String relation = 'Father';
  final name = TextEditingController(), mobile = TextEditingController();

  @override
  void dispose() { name.dispose(); mobile.dispose(); super.dispose(); }

  Future<void> run(Future<dynamic> Function() fn, String done, [VoidCallback? after]) async {
    setState(() => busy = true);
    if (await act(context, fn, done)) { after?.call(); await widget.onChange(); }
    if (mounted) setState(() => busy = false);
  }

  static double _w(String t, double size) => (TextPainter(text: TextSpan(text: t, style: TextStyle(fontFamily: 'PlusJakartaSans', fontSize: size, fontWeight: FontWeight.w700)), textDirection: TextDirection.ltr)..layout()).width;

  @override
  Widget build(BuildContext context) {
    final contacts = _list(widget.m['contacts']);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      for (final (i, c) in contacts.indexed) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 10), child: _contact(c)),
      if (contacts.isEmpty) const _Empty('No contacts yet. Add a parent or guardian.'),
      const SizedBox(height: 14),
      if (!open) InkWell(onTap: () => setState(() => open = true), borderRadius: BorderRadius.circular(12), child: CustomPaint(painter: const _DashedBox(), child: Container(
          padding: const EdgeInsets.all(10), alignment: Alignment.center,
          child: const Text('+ Add a contact', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: K.brand)))))
      else Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _field('Relation', DropdownButtonFormField<String>(initialValue: relation, isExpanded: true, onChanged: (v) => setState(() => relation = v ?? relation),
            items: [for (final r in const ['Father', 'Mother', 'Guardian']) DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 16)))],
            decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)))),
        const SizedBox(height: 10),
        _field('Name', TextField(controller: name, style: const TextStyle(fontSize: 16), decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12)))),
        const SizedBox(height: 10),
        _field('Mobile', TextField(controller: mobile, keyboardType: TextInputType.phone, style: const TextStyle(fontSize: 16),
            decoration: const InputDecoration(hintText: '10 digits', contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12)))),
        const SizedBox(height: 10),
        Row(children: [
          KButton('Add', busy: busy, onPressed: () {
            if (name.text.trim().isEmpty || mobile.text.trim().isEmpty) { toast(context, 'Please fill out this field.', error: true); return; }
            if (!RegExp(r'^[6-9][0-9]{9}$').hasMatch(mobile.text.trim())) { toast(context, 'Please match the requested format.', error: true); return; }
            run(() => api.post('/students/${widget.m['student_id']}/contacts', {'relation': relation, 'contact_name': name.text, 'mobile_no': mobile.text.trim()}), 'Contact added',
                () => setState(() { open = false; name.clear(); mobile.clear(); }));
          }),
          const SizedBox(width: 8),
          KButton('Cancel', kind: BtnKind.ghost, onPressed: () => setState(() => open = false)),
        ]),
      ]),
    ]);
  }

  Widget _field(String label, Widget child) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(label, style: const TextStyle(fontSize: 13, height: 18 / 13, fontWeight: FontWeight.w600, color: K.ink)), const SizedBox(height: 6), child,
      ]);

  Widget _contact(Map c) {
    final self = c['relation'] == 'Self';
    final verified = c['is_verified'] == true, approver = c['is_outpass_approver'] == true;
    final actions = <(Widget, double)>[
      verified ? (const _Pill('Verified', icon: LucideIcons.shieldCheck, bg: Color(0xFFE7F6E7), iconColor: _good), 18 + 15 + _w('Verified', 11.5))
          : (KButton('Verify', small: true, kind: BtnKind.soft, busy: busy, onPressed: () => run(() => api.post('/contacts/${c['contact_id']}/verify', {'otp': '000000'}), 'Number verified')), 24 + _w('Verify', 13)),
      if (approver) (const _Pill('Outing approver', icon: LucideIcons.keyRound, bg: Color(0xFFE6EFFB), iconColor: _seq), 18 + 15 + _w('Outing approver', 11.5))
      else if (!self && verified) (KButton('Make approver', small: true, kind: BtnKind.ghost, busy: busy, onPressed: () => run(() => api.post('/contacts/${c['contact_id']}/outpass-approver'), 'Outing approver chosen')),
          24 + _w('Make approver', 13)),
    ];
    final avatar = Container(width: 36, height: 36, alignment: Alignment.center, decoration: BoxDecoration(color: _tint, borderRadius: BorderRadius.circular(12)),
        child: self ? const Icon(LucideIcons.userRound, size: 16, color: K.brand) : Text(_initials('${c['contact_name']}'), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: K.brand)));
    final text = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(titleCase(c['contact_name']), style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: K.ink)),
      Row(children: [
        Text('${c['relation']} · ', style: const TextStyle(fontSize: 12, color: _ink3)),
        const Icon(LucideIcons.phone, size: 11, color: _ink3), const SizedBox(width: 3),
        Text(_mobile(c['mobile_no']), style: const TextStyle(fontSize: 12, color: _ink3)),
      ]),
    ]);
    final acts = Wrap(spacing: 6, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [for (final a in actions) a.$1]);
    final actsW = actions.fold<double>(0, (a, x) => a + x.$2) + 6 * (actions.length - 1);
    return Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: _line)),
        child: LayoutBuilder(builder: (context, box) {
          // the row wraps as the web's flex-wrap does: the actions drop under when the name would get narrower than 120 px
          final oneLine = 36 + 10 + 120 + 10 + actsW <= box.maxWidth;
          return oneLine ? Row(children: [avatar, const SizedBox(width: 10), Expanded(child: text), const SizedBox(width: 10), acts])
              : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: [avatar, const SizedBox(width: 10), Expanded(child: text)]), const SizedBox(height: 10), acts]);
        }));
  }
}

/// The dashed outline of "+ Add a contact" (1.5 px, #CBD2DC, 12 px corners).
class _DashedBox extends CustomPainter {
  const _DashedBox();
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..style = PaintingStyle.stroke..strokeWidth = 1.5..color = const Color(0xFFCBD2DC);
    final path = Path()..addRRect(RRect.fromRectAndRadius(Rect.fromLTWH(.75, .75, size.width - 1.5, size.height - 1.5), const Radius.circular(11.25)));
    for (final m in path.computeMetrics()) {
      for (double t = 0; t < m.length; t += 9) { canvas.drawPath(m.extractPath(t, math.min(t + 5, m.length)), p); }
    }
  }
  @override
  bool shouldRepaint(_) => false;
}
