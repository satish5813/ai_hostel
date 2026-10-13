import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

/// The food a student on sick leave gets in the room (pages/warden/sickDiet.ts DIET).
const _diet = {
  'Light': ('Light food', 'Khichdi, idli, curd rice, plain dal, vegetable soup, banana'),
  'Liquid': ('Liquid only', 'Soups, dal water, fruit juice, buttermilk, ORS'),
  'Normal': ('Normal meal', 'The regular mess meal, sent to the room'),
};

/// Who a sick-leave step belongs to, as people say it (STEP_ROLE).
const _stepRole = {'Floor_Warden': 'Floor Warden', 'Warden': 'Building in-charge', 'Hostel_Incharge': 'Building in-charge', 'Chief_Warden': 'Chief Warden'};

/// The day after a date: an extension starts the day after the leave ends, so no meal is sent twice.
String _dayAfter(dynamic d) {
  final p = DateTime.parse('$d'.substring(0, 10));
  return isoDay(DateTime(p.year, p.month, p.day + 1));
}

/// SCK-01 My sick leave, as pages/student/SickLeave.tsx: the leave in progress (visit, food, approvals, meals to the
/// room, I am well now, extension) or the form to report; then the history.
class SickLeaveScreen extends StatefulWidget {
  const SickLeaveScreen({super.key});
  @override
  State<SickLeaveScreen> createState() => _SickLeaveScreenState();
}

class _SickLeaveScreenState extends State<SickLeaveScreen> with AutoRefresh {
  List<Map>? list;
  Map? detail;
  Object? error;
  var busy = false;
  final what = TextEditingController();
  String? from, until, extend;

  @override
  void initState() { super.initState(); load(); autoRefresh(load); }

  Map? get _current => list?.where((l) => ['Applied', 'Recommended', 'Approved'].contains(l['status'])).firstOrNull;

  Future<void> load() async {
    try {
      final l = ((await api.get('/sick-leaves/mine') as List?) ?? []).cast<Map>();
      final cur = l.where((x) => ['Applied', 'Recommended', 'Approved'].contains(x['status'])).firstOrNull;
      final d = cur == null ? null : await api.get('/sick-leaves/${cur['sick_leave_id']}') as Map?;
      if (mounted) setState(() { list = l; detail = d; error = null; });
    } catch (e) {
      if (mounted) setState(() => error = e);
    }
  }

  Future<void> _run(Future<dynamic> Function() fn, String ok, [VoidCallback? then]) async {
    setState(() => busy = true);
    try { await fn(); then?.call(); if (mounted) toast(context, ok); await load(); }
    catch (e) { if (mounted) toast(context, '$e', error: true); }
    finally { if (mounted) setState(() => busy = false); }
  }

  Future<String?> _pick(String? value, {String? min}) async {
    final first = min != null ? DateTime.parse(min) : DateTime(DateTime.now().year - 1);
    final init = value != null ? DateTime.parse(value) : DateTime.now();
    final d = await showDatePicker(context: context, initialDate: init.isBefore(first) ? first : init, firstDate: first, lastDate: DateTime(DateTime.now().year + 2));
    return d == null ? value : isoDay(d);
  }

  @override
  Widget build(BuildContext context) {
    if (list == null && error != null) return ErrorView(message: '$error', onRetry: load);
    final cur = _current;
    final d = detail;
    final history = list?.where((l) => cur == null || l['sick_leave_id'] != cur['sick_leave_id']).toList();
    return RefreshIndicator(onRefresh: load, child: ListView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 16, 16, 90), children: [
      const PageHead('SCK-01', subtitle: 'Your Floor Warden visits you first, then the building in-charge approves. Meals then come to your room, light food if you need it.'),
      const SizedBox(height: 24),
      if (cur != null && d != null) _leave(cur, d) else _report(),
      const SizedBox(height: 24),
      KCard(padding: EdgeInsets.zero, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const _CardHead(LucideIcons.clock, _rose, 'History'),
        if (history != null) history.isEmpty
            ? const _Empty(LucideIcons.heartPulse, 'No sick leave on record')
            : _Rows([for (final l in history) [
                _cell('${day(l['from_date'])} – ${day(l['to_date'])}', bold: true), _cell('${l['illness_details']}'),
                _cell(l['room_meals_required'] == true ? 'Yes' : '—'), Pill.status(l['status']),
              ]], const ['Dates', 'Details', 'Room meals', 'Status']),
      ])),
    ]));
  }

  Widget _leave(Map cur, Map d) {
    final approved = cur['status'] == 'Approved';
    final visited = cur['visited_by'] != null;
    final diet = _diet[d['diet']];
    final deliveries = ((d['deliveries'] as List?) ?? []).cast<Map>();
    return KCard(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      _CardHead(LucideIcons.heartPulse, _rose, approved ? 'Approved sick leave' : 'Sick leave in progress', sub: '${day(cur['from_date'])} to ${day(cur['to_date'])}', action: Pill.status(cur['status'])),
      Padding(padding: const EdgeInsets.only(bottom: 16), child: Text('${cur['illness_details']}', style: const TextStyle(fontSize: 16, height: 1.5, color: K.ink))),
      if (cur['status'] == 'Applied' && !visited)
        const _Notice(Tone.info, "Waiting for the Floor Warden's visit", 'Stay in your room; the Floor Warden comes to see you and decides what food to send.'),
      if (visited && diet != null)
        _Notice(Tone.info, 'Food to your room: ${diet.$1}', '${diet.$2}${d['diet_note'] != null ? '. ${d['diet_note']}' : ''}'),
      if (visited) _Notice(Tone.progress, 'Visited by ${cur['visited_by']}', cur['visit_remarks']),
      const SizedBox(height: 16),
      _Trail([for (final s in ((d['steps'] as List?) ?? []).cast<Map>())
        ('L${s['level']}', _stepRole[s['approver_role']] ?? words(s['approver_role']), s['acted_by_name'] ?? s['acted_by'], '${s['decision']}', s['decided_on'], s['remarks'])]),
      if (approved) ...[
        const SizedBox(height: 16),
        const Text('Meals to your room', style: TextStyle(fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w600, color: K.ink2)),
        const SizedBox(height: 12),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final m in deliveries) Pill('${day(m['meal_date'])} ${words(m['slot'])}: ${words(m['status'])}', tone: Pill.toneOf(m['status'])),
        ]),
      ],
      const SizedBox(height: 16),
      Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.end, children: [
        KButton('I am well now', icon: LucideIcons.check, kind: BtnKind.soft, busy: busy,
            onPressed: () => _run(() => api.post('/sick-leaves/${cur['sick_leave_id']}/close', {}), 'Glad you are better. Leave closed.')),
        if (approved) Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.end, children: [
          SizedBox(width: 200, child: _Field('Ask for an extension until', child: _DateBox(extend, () async {
            final v = await _pick(extend, min: _dayAfter(cur['to_date']));
            setState(() => extend = v);
          }))),
          _Blocked(KButton('Request extension', kind: BtnKind.secondary, busy: busy, onPressed: extend == null ? null : () => _run(() => api.post('/sick-leaves', {
                'illness_details': 'Extension: ${cur['illness_details']}', 'from_date': _dayAfter(cur['to_date']), 'to_date': extend, 'extended_from_id': cur['sick_leave_id'],
              }), 'Extension requested. Your Floor Warden will visit again.', () => extend = null)),
              extend == null ? 'Pick the new end date.' : null),
        ]),
      ]),
    ]));
  }

  Widget _report() => KCard(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const _CardHead(LucideIcons.heartPulse, _rose, 'Report that you are unwell'),
        _Field('What is wrong', required: true, child: TextField(controller: what, minLines: 3, maxLines: null,
            style: const TextStyle(fontSize: 14, height: 20 / 14, color: K.ink), decoration: const InputDecoration(contentPadding: EdgeInsets.fromLTRB(12, 10, 12, 16)))),
        const SizedBox(height: 20),
        _Field('From', required: true, child: _DateBox(from, () async { final v = await _pick(from); setState(() => from = v); })),
        const SizedBox(height: 24),
        _Field('Until', required: true, child: _DateBox(until, () async { final v = await _pick(until); setState(() => until = v); })),
        const SizedBox(height: 20),
        Align(alignment: Alignment.centerLeft, child: KButton('Report sick leave', icon: LucideIcons.heartPulse, kind: BtnKind.accent, pill: true, large: true, busy: busy, onPressed: () {
          // the browser's own check on required fields
          if (what.text.trim().isEmpty || from == null || until == null) { toast(context, 'Please fill out this field.', error: true); return; }
          _run(() => api.post('/sick-leaves', {'illness_details': what.text, 'from_date': from, 'to_date': until}), 'Reported. Your Floor Warden will come and see you.',
              () { what.clear(); from = null; until = null; });
        })),
      ]));
}

Widget _cell(String t, {bool bold = false}) => Text(t, textAlign: TextAlign.right, style: TextStyle(fontSize: 13.5, fontWeight: bold ? FontWeight.w600 : FontWeight.w400, color: K.ink));

/* ------------------------------------------------------------ KLH pieces */

const _rose = (Color(0xFFFFE9F0), Color(0xFFB8215A)); // klh-tile-rose

/// klh-card-head: the 40 px tile, the title (15/22, 600) and its line, the action on the right.
class _CardHead extends StatelessWidget {
  final IconData icon;
  final (Color, Color) tile;
  final String title;
  final String? sub;
  final Widget? action;
  const _CardHead(this.icon, this.tile, this.title, {this.sub, this.action});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 12), child: Row(children: [
        Container(width: 40, height: 40, decoration: BoxDecoration(color: tile.$1, borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 20, color: tile.$2)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 15, height: 22 / 15, fontWeight: FontWeight.w600, color: K.ink)),
          if (sub != null) Text(sub!, style: const TextStyle(fontSize: 12, height: 16 / 12, color: K.ink2)),
        ])),
        if (action != null) ...[const SizedBox(width: 12), action!],
      ]));
}

(Color, Color) _toneColors(Tone t) => switch (t) {
      Tone.good => (K.good, K.goodBg), Tone.warn => (K.warn, K.warnBg), Tone.bad => (K.bad, K.badBg),
      Tone.info => (K.info, K.infoBg), Tone.muted => (K.muted, K.mutedBg), Tone.progress => (K.progress, K.progressBg) };

/// KLH Notice: tone background and ink, the icon, a bold title and the text (16 px in the student frame).
class _Notice extends StatelessWidget {
  final Tone tone;
  final String title;
  final String? body;
  const _Notice(this.tone, this.title, this.body);
  @override
  Widget build(BuildContext context) {
    final (fg, bg) = _toneColors(tone);
    return Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(padding: const EdgeInsets.only(top: 2), child: Icon(LucideIcons.info, size: 18, color: fg)),
          const SizedBox(width: 12),
          Expanded(child: DefaultTextStyle.merge(style: TextStyle(fontSize: 16, height: 1.5, color: fg), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
            if (body != null) Text(body!),
          ]))),
        ]));
  }
}

/// KLH ApprovalTrail: level badge in the decision's tone, role · person, the decision chip, when, remarks.
class _Trail extends StatelessWidget {
  final List<(String, String, String?, String, String?, String?)> rows;
  const _Trail(this.rows);
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        for (final (i, (lvl, role, person, decision, at, remarks)) in rows.indexed) Stack(children: [
          if (i < rows.length - 1) const Positioned(left: 15, top: 34, bottom: 2, width: 2, child: ColoredBox(color: K.line)),
          Padding(padding: const EdgeInsets.only(bottom: 20), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Builder(builder: (_) {
              final (fg, bg) = _toneColors(Pill.toneOf(decision));
              return Container(width: 32, height: 32, alignment: Alignment.center, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
                  child: Text(lvl, style: TextStyle(fontSize: 12, height: 1, fontWeight: FontWeight.w700, color: fg)));
            }),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, runSpacing: 8, children: [
                Text.rich(TextSpan(children: [TextSpan(text: role, style: const TextStyle(fontWeight: FontWeight.w700)), if (person != null) TextSpan(text: ' · $person')]),
                    style: const TextStyle(fontSize: 16, height: 1.5, color: K.ink)),
                Pill.status(decision),
              ]),
              const SizedBox(height: 2),
              Text(at != null ? dayTime(at) : 'Awaiting decision', style: const TextStyle(fontSize: 12, height: 16 / 12, color: K.ink2)),
              if (remarks != null) Container(margin: const EdgeInsets.only(top: 8), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(color: const Color(0xFFEEF1F7), borderRadius: BorderRadius.circular(10)),
                  child: Text(remarks, style: const TextStyle(fontSize: 16, height: 1.5, color: K.ink))),
            ])),
          ])),
        ]),
      ]);
}

/// KLH EmptyState (title only).
class _Empty extends StatelessWidget {
  final IconData icon;
  final String title;
  const _Empty(this.icon, this.title);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48), child: Column(children: [
        Container(width: 64, height: 64, margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(color: K.progressBg, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: K.progressBg.withValues(alpha: .45), spreadRadius: 8)]),
            child: Icon(icon, size: 28, color: K.progress)),
        const SizedBox(height: 8),
        Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 17, height: 24 / 17, fontWeight: FontWeight.w700, color: K.ink)),
      ]));
}

/// klh-table on a phone: each row a block, each cell on its own line.
class _Rows extends StatelessWidget {
  final List<List<Widget>> rows;
  final List<String> labels;
  const _Rows(this.rows, this.labels);
  @override
  Widget build(BuildContext context) => PhoneTable(labels: labels, rows: rows);
}

/// KLH Field: the label (13/18, 600) with its red star, then the control.
class _Field extends StatelessWidget {
  final String label;
  final bool required;
  final Widget child;
  const _Field(this.label, {this.required = false, required this.child});
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
        Row(children: [
          Flexible(child: Text(label, style: const TextStyle(fontSize: 13, height: 18 / 13, fontWeight: FontWeight.w600, color: K.ink))),
          if (required) const Padding(padding: EdgeInsets.only(left: 8), child: Text('*', style: TextStyle(fontSize: 13, height: 18 / 13, fontWeight: FontWeight.w600, color: K.bad))),
        ]),
        const SizedBox(height: 6),
        child,
      ]);
}

/// A date input (44 px, 16 px text): the date as the browser shows it, or dd/mm/yyyy, and the calendar mark.
class _DateBox extends StatelessWidget {
  final String? value;
  final VoidCallback onTap;
  const _DateBox(this.value, this.onTap);
  @override
  Widget build(BuildContext context) => InkWell(onTap: onTap, borderRadius: BorderRadius.circular(10), child: InputDecorator(
      decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12), suffixIcon: Icon(LucideIcons.calendar, size: 18, color: K.ink)),
      child: Text(value == null ? 'dd/mm/yyyy' : DateFormat('dd/MM/yyyy').format(DateTime.parse(value!)), style: const TextStyle(fontSize: 16, color: K.ink))));
}

/// A button with its reason (Explain every no): when blocked, a small grey line with a lock under it.
class _Blocked extends StatelessWidget {
  final KButton button;
  final String? reason;
  const _Blocked(this.button, this.reason);
  @override
  Widget build(BuildContext context) => reason == null ? button : Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        button,
        Padding(padding: const EdgeInsets.only(top: 6), child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 340), child: Row(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Icon(LucideIcons.lock, size: 14, color: K.ink2), const SizedBox(width: 4),
          Flexible(child: Text(reason!, style: const TextStyle(fontSize: 12, height: 16 / 12, color: K.ink2))),
        ]))),
      ]);
}
