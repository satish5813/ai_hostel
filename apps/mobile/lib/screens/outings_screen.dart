import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

/// OUT-01 My outings, as pages/student/Outings.tsx with OutingSheet.tsx: ask permission (one outing at a time), the
/// approval steps, the locked pass until approval, the QR gate pass, cancel or withdraw.
class OutingsScreen extends StatefulWidget {
  const OutingsScreen({super.key});
  @override
  State<OutingsScreen> createState() => _OutingsScreenState();
}

const _livePass = ['Approved', 'Out', 'Overdue'];
const _pendingPass = ['Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved'];
List<Map> _steps(Map o) => ((o['steps'] as List?) ?? []).cast<Map>();

class _OutingsScreenState extends State<OutingsScreen> {
  List<Map>? list;
  Object? error;

  @override
  void initState() { super.initState(); load(); }

  Future<void> load() async {
    try {
      final d = await api.get('/outpasses/mine');
      if (mounted) setState(() { list = ((d as List?) ?? []).cast<Map>(); error = null; });
    } catch (e) {
      if (mounted) setState(() => error = e);
    }
  }

  Map? get _live => list?.where((o) => _livePass.contains(o['status'])).firstOrNull;
  Map? get _pending => list?.where((o) => _pendingPass.contains(o['status'])).firstOrNull;

  /// useAction().run: busy, the API call, a toast with okText (none when empty), the error in a toast.
  Future<bool> _run(Future<dynamic> Function() fn, String ok) async {
    try { await fn(); if (mounted && ok.isNotEmpty) toast(context, ok); return true; }
    catch (e) { if (mounted) toast(context, '$e', error: true); return false; }
  }

  @override
  Widget build(BuildContext context) {
    if (list == null && error != null) return ErrorView(message: '$error', onRetry: load);
    final l = list;
    final live = _live, pending = _pending;
    final open = l?.where((x) => _livePass.contains(x['status']) || _pendingPass.contains(x['status'])).toList() ?? [];
    final past = l?.where((x) => ['Returned', 'Rejected', 'Cancelled'].contains(x['status'])).toList() ?? [];
    return RefreshIndicator(onRefresh: load, child: ListView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 16, 16, 90), children: [
      const PageHead('OUT-01', subtitle: 'Write why you need to go. Your Floor Warden approves, then the Chief Warden. Your QR gate pass appears only after approval.'),
      const SizedBox(height: 20),
      // st-ask-strip
      Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(color: const Color(0xFFF4F0FF), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFDED3FF))),
          child: Wrap(spacing: 14, runSpacing: 10, crossAxisAlignment: WrapCrossAlignment.center, children: [
            Container(height: 44,
                decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF7048E8), Color(0xFF5932D1)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                    borderRadius: BorderRadius.circular(12), boxShadow: const [BoxShadow(color: Color(0x66000000), blurRadius: 24, spreadRadius: -12, offset: Offset(0, 12))]),
                child: Material(type: MaterialType.transparency, child: InkWell(onTap: _ask, borderRadius: BorderRadius.circular(12), child: const Padding(padding: EdgeInsets.symmetric(horizontal: 18),
                    child: Center(widthFactor: 1, child: Text('Ask for outing permission', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14.5))))))),
            Text(live != null ? 'You have ${live['outpass_no']} (${words(live['status']).toLowerCase()}). One outing at a time.'
                : pending != null ? '${pending['outpass_no']} is waiting for approval.' : 'No outing open. You can ask now.',
                style: const TextStyle(fontSize: 13, color: K.ink2)),
          ])),
      for (final x in open) ...[
        const SizedBox(height: 20),
        KCard(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          _CardHead(_livePass.contains(x['status']) ? LucideIcons.qrCode : LucideIcons.doorClosed, _violet, '${x['destination']}',
              sub: '${x['outpass_no']} · ${dayTime(x['leave_from'])} to ${dayTime(x['return_by'])} · ${x['reason']}',
              action: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                Pill.status(x['status']), const SizedBox(height: 8),
                KButton(_livePass.contains(x['status']) ? 'Show pass' : 'See status', small: true, kind: BtnKind.secondary, onPressed: _show),
              ])),
          _Trail([for (final st in _steps(x)) (st['level'] == 0 ? 'P' : 'L${st['level']}', words(st['role']), st['by'], '${st['decision']}', st['on'], st['remarks'])]),
        ])),
      ],
      const SizedBox(height: 20),
      KCard(padding: EdgeInsets.zero, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const _CardHead(LucideIcons.clock, _violet, 'Past outings'),
        if (l != null) past.isEmpty
            ? const _Empty(LucideIcons.doorClosed, 'No past outings', 'Returned, rejected and cancelled passes appear here.')
            : _Rows([for (final x in past) [
                Text('${x['outpass_no']}', style: K.mono(size: 13.5, weight: FontWeight.w600, color: K.ink)),
                _cell('${x['destination']}'), _cell(dayTime(x['leave_from'])), _cell(dayTime(x['return_by'])), Pill.status(x['status']),
              ]], const ['Pass', 'Destination', 'Left', 'Back by', 'Status']),
      ])),
    ]));
  }

  /* ------------------------------------------------------------ sheets (OutingSheet.tsx) */

  /// Show pass / See status: the gate pass when one is live, else the request in approval, else the form.
  void _show() {
    final live = _live, pending = _pending;
    if (live != null) { _passSheet(live); } else if (pending != null) { _statusSheet(pending); } else { _ask(); }
  }

  Future<void> _cancel(BuildContext ctx, Map o) async {
    if (await _run(() => api.post('/outpasses/${o['outpass_id']}/cancel'), 'Outing cancelled')) {
      load();
      if (ctx.mounted) Navigator.pop(ctx);
    }
  }

  void _passSheet(Map live) {
    var busy = false;
    final qr = api.get('/outpasses/${live['outpass_id']}/qr').then<Uint8List?>((r) => base64Decode('${r['png_data_url']}'.split(',').last)).catchError((_) => null);
    showKSheet(context, mod: Mod.violet, icon: LucideIcons.doorOpen, title: 'Your gate pass', sub: '${live['outpass_no']} · ${words(live['status'])}',
        body: (ctx, set) => Column(children: [
          FutureBuilder<Uint8List?>(future: qr, builder: (c, s) => Container(width: 220, height: 220, clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(color: s.data == null ? K.hover : null, borderRadius: BorderRadius.circular(14), border: Border.all(color: K.line)),
              child: s.data == null ? null : Image.memory(s.data!, fit: BoxFit.fill, semanticLabel: 'QR code of ${live['outpass_no']}', filterQuality: FilterQuality.none))),
          const SizedBox(height: 14),
          const _Note('Show this code at the campus gate going out and coming back.', icon: null),
          const SizedBox(height: 14),
          _Facts([
            ('Student', titleCase(live['full_name']), '${live['student_id']}'),
            ('Going to', '${live['destination']}', '${live['reason']}'),
            ('Leave · back by', dayTime(live['leave_from']), dayTime(live['return_by'])),
          ]),
          const SizedBox(height: 14),
          _Note(live['status'] == 'Approved'
              ? 'You can have one outing at a time. To ask for a different one, cancel this pass first; once you are back, Ask permission appears again.'
              : 'You can ask for your next outing once you are back and scanned in at the gate.'),
        ]),
        footer: live['status'] != 'Approved' ? null : (ctx, set) => KButton('Cancel this pass', block: true, kind: BtnKind.secondary, busy: busy,
            onPressed: () async { set(() => busy = true); await _cancel(ctx, live); if (ctx.mounted) set(() => busy = false); }));
  }

  void _statusSheet(Map pending) {
    var busy = false;
    final steps = _steps(pending);
    Map? find(bool Function(Map) t) => steps.where(t).firstOrNull;
    final floor = find((x) => x['role'] == 'Floor_Warden' && x['decision'] != 'Skipped');
    final warden = find((x) => x['role'] == 'Chief_Warden');
    final flow = <(String, String, String?)>[
      ('Request sent', 'done', null),
      // level 1 Floor Warden, level 2 Chief Warden (no parent or Dean step)
      if (floor != null) ('Floor Warden approves', floor['decision'] == 'Approved' ? 'done' : 'now', floor['by']),
      ('Chief Warden approves', warden != null && warden['decision'] == 'Approved' ? 'done' : floor == null || floor['decision'] == 'Approved' ? 'now' : 'next', warden?['by']),
      ('QR gate pass', 'lock', null),
    ];
    showKSheet(context, mod: Mod.violet, icon: LucideIcons.doorOpen, title: 'Permission requested', sub: '${pending['outpass_no']} · waiting for approval',
        body: (ctx, set) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (var i = 0; i < flow.length; i++) _FlowStep(i, flow[i].$1, flow[i].$2, who: flow[i].$3, last: i == flow.length - 1),
          const SizedBox(height: 14),
          CustomPaint(painter: const _Dashed(Color(0xFFC9BCF5), 14), child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 18),
            decoration: BoxDecoration(color: const Color(0xFFFAF8FF), borderRadius: BorderRadius.circular(14)),
            child: Column(children: [
              const Icon(LucideIcons.lock, size: 22, color: Color(0xFF5F3DC4)), const SizedBox(height: 4),
              const Text('No gate pass yet', textAlign: TextAlign.center, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: K.ink)), const SizedBox(height: 4),
              ConstrainedBox(constraints: const BoxConstraints(maxWidth: 270), child: Text(
                  'Your QR gate pass is made when the Chief Warden approves. It will appear here and on the Outing card.',
                  textAlign: TextAlign.center, style: const TextStyle(fontSize: 12.5, color: K.ink2))),
            ]))),
          const SizedBox(height: 14),
          _Facts([
            ('Reason', '${pending['reason']}', null),
            ('Going to', '${pending['destination']}', null),
            ('Leave · back by', dayTime(pending['leave_from']), dayTime(pending['return_by'])),
          ]),
        ]),
        footer: (ctx, set) => KButton('Withdraw request', block: true, kind: BtnKind.secondary, busy: busy,
            onPressed: () async { set(() => busy = true); await _cancel(ctx, pending); if (ctx.mounted) set(() => busy = false); }));
  }

  void _ask() {
    final reason = TextEditingController(), dest = TextEditingController(), phone = TextEditingController();
    DateTime? from, until;
    var sent = false, busy = false;
    Future<void> pick(BuildContext ctx, StateSetter set, bool isFrom) async {
      final now = DateTime.now();
      final cur = (isFrom ? from : until) ?? now;
      final d = await showDatePicker(context: ctx, initialDate: cur, firstDate: DateTime(now.year - 1), lastDate: DateTime(now.year + 2));
      if (d == null || !ctx.mounted) return;
      final t = await showTimePicker(context: ctx, initialTime: TimeOfDay.fromDateTime(cur));
      if (t == null) return;
      final v = DateTime(d.year, d.month, d.day, t.hour, t.minute);
      set(() => isFrom ? from = v : until = v);
    }
    showKSheet(context, mod: Mod.violet, icon: LucideIcons.doorOpen, title: 'Ask for outing permission', sub: 'Write why you need to go. The QR gate pass is made only after the Chief Warden approves.',
        body: (ctx, set) {
          if (sent) {
            return DoneView(title: 'Request submitted', onClose: () => Navigator.pop(ctx),
                body: 'There is no gate pass yet. Your Floor Warden approves it, then the Chief Warden. Your QR gate pass appears on the Outing card once it is approved.');
          }
          final live = _live, existing = _live ?? _pending;
          final outNow = live != null && live['status'] != 'Approved';
          final bad = from != null && until != null && !until!.isAfter(from!);
          final sameDay = from != null && until != null && DateUtils.isSameDay(from, until);
          Widget gap([double h = 14]) => SizedBox(height: h);
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (existing != null) ...[
              Container(padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFFFFF8EB), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFF5D7A1))),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(outNow ? 'You are out on ${existing['outpass_no']}' : live != null ? '${existing['outpass_no']} is approved' : '${existing['outpass_no']} is waiting for approval',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: K.ink)),
                    const SizedBox(height: 3),
                    Text('${existing['destination']} · ${dayTime(existing['leave_from'])} to ${dayTime(existing['return_by'])}. ${outNow
                        ? 'Scan in at the gate when you are back, then you can ask for the next outing.'
                        : 'You can have one outing at a time. Cancel it to ask for a different one.'}', style: const TextStyle(fontSize: 12.5, color: K.ink2)),
                    const SizedBox(height: 10),
                    Wrap(spacing: 8, runSpacing: 8, children: [
                      KButton(live != null ? 'Show pass' : 'See status', small: true, kind: BtnKind.secondary, onPressed: () { Navigator.pop(ctx); _show(); }),
                      if (!outNow) KButton(live != null ? 'Cancel pass' : 'Withdraw', small: true, kind: BtnKind.secondary, busy: busy, onPressed: () async {
                        set(() => busy = true);
                        final ok = await _run(() => api.post('/outpasses/${existing['outpass_id']}/cancel'), live != null ? 'Pass cancelled. You can ask again now.' : 'Request withdrawn. You can ask again now.');
                        if (ok) await load();
                        if (ctx.mounted) set(() => busy = false);
                      }),
                    ]),
                  ])),
              gap(),
            ],
            Wrap(spacing: 6, runSpacing: 6, children: [
              for (final (i, l) in ['Your request', 'Floor Warden', 'Chief Warden', 'QR gate pass'].indexed) _MiniStep(i, l, i == 0 ? 'now' : i == 3 ? 'lock' : 'next'),
            ]),
            gap(),
            _Field('Why do you need to go out?', required: true, child: _area(reason, "For example: sister's wedding, bank work, hospital visit", (_) => set(() {}))),
            gap(),
            _Field('Going to', required: true, child: _input(dest, 'Vijayawada', (_) => set(() {}))),
            gap(),
            _Field('Leaving', required: true, child: _DateBox(from == null ? null : _dtFmt(from!), 'dd/mm/yyyy, --:--', () => pick(ctx, set, true))),
            gap(12),
            _Field('Back by', required: true, error: bad ? 'Must be after leaving.' : null, child: _DateBox(until == null ? null : _dtFmt(until!), 'dd/mm/yyyy, --:--', () => pick(ctx, set, false), error: bad)),
            gap(),
            _Field('Phone while away', required: true, child: _input(phone, '98480 12345', (_) => set(() {}), keyboard: TextInputType.phone)),
            if (from != null && until != null && !bad) ...[gap(), _Note('${sameDay ? 'Same-day outing: ' : 'A day or more: '}your Floor Warden approves, then the Chief Warden.')],
          ]);
        },
        footer: (ctx, set) {
          if (sent) return const SizedBox.shrink();
          final existing = _live ?? _pending;
          final bad = from != null && until != null && !until!.isAfter(from!);
          final missing = reason.text.trim().length < 3 ? 'Write the reason.' : dest.text.isEmpty ? 'Where are you going?' : from == null || until == null ? 'Set both times.'
              : bad ? 'Return must be after leaving.' : phone.text.isEmpty ? 'Give a phone number.' : null;
          return _FootButton(KButton('Submit request', busy: busy, block: true, onPressed: () async {
            set(() => busy = true);
            final ok = await _run(() => api.post('/outpasses', {'destination': dest.text, 'reason': reason.text, 'leave_from': from!.toUtc().toIso8601String(),
              'return_by': until!.toUtc().toIso8601String(), 'contact_during_leave': phone.text}), '');
            if (ok) { sent = true; load(); }
            if (ctx.mounted) set(() => busy = false);
          }), existing != null ? 'Finish with ${existing['outpass_no']} first.' : missing);
        });
  }
}

String _dtFmt(DateTime d) => '${DateFormat('dd/MM/yyyy').format(d)}, ${DateFormat('hh:mm a').format(d).toLowerCase()}';
Widget _cell(String t) => Text(t, textAlign: TextAlign.right, style: const TextStyle(fontSize: 13.5, color: K.ink));

/* ------------------------------------------------------------ KLH pieces */

const _violet = (Color(0xFFF1ECFF), Color(0xFF5F3DC4)); // klh-tile-violet

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

/// KLH EmptyState.
class _Empty extends StatelessWidget {
  final IconData icon;
  final String title, body;
  const _Empty(this.icon, this.title, this.body);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48), child: Column(children: [
        Container(width: 64, height: 64, margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(color: K.progressBg, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: K.progressBg.withValues(alpha: .45), spreadRadius: 8)]),
            child: Icon(icon, size: 28, color: K.progress)),
        const SizedBox(height: 8),
        Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 17, height: 24 / 17, fontWeight: FontWeight.w700, color: K.ink)),
        const SizedBox(height: 8),
        Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(body, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16, height: 1.5, color: K.ink2))),
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

/// st-note, with or without its icon.
class _Note extends StatelessWidget {
  final String text;
  final IconData? icon;
  const _Note(this.text, {this.icon = LucideIcons.calendarClock});
  @override
  Widget build(BuildContext context) => Container(width: double.infinity, padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
      decoration: BoxDecoration(color: K.sub, borderRadius: BorderRadius.circular(10)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (icon != null) ...[Padding(padding: const EdgeInsets.only(top: 1), child: Icon(icon, size: 14, color: K.brand)), const SizedBox(width: 8)],
        Expanded(child: Text(text, style: const TextStyle(fontSize: 12.5, color: K.ink2))),
      ]));
}

/// st-facts st-pass: grey boxes, one a line on a phone: small label, bold value, an optional small line.
class _Facts extends StatelessWidget {
  final List<(String, String, String?)> items;
  const _Facts(this.items);
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        for (final (i, (l, v, s)) in items.indexed) Container(margin: EdgeInsets.only(top: i == 0 ? 0 : 8), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(color: K.sub, borderRadius: BorderRadius.circular(12)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(l, style: const TextStyle(fontSize: 11.5, color: K.ink3)), const SizedBox(height: 2),
              Text(v, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: K.ink)),
              if (s != null) ...[const SizedBox(height: 2), Text(s, style: const TextStyle(fontSize: 11.5, color: K.ink3))],
            ])),
      ]);
}

/// One step of st-flow: the round marker (done, now, next, lock), the label, who on the right; a rule down to the next.
class _FlowStep extends StatelessWidget {
  final int i;
  final String label, state;
  final String? who;
  final bool last;
  const _FlowStep(this.i, this.label, this.state, {this.who, this.last = false});
  @override
  Widget build(BuildContext context) => Stack(clipBehavior: Clip.none, children: [
        if (!last) Positioned(left: 13, top: 32, bottom: -6, width: 2, child: ColoredBox(color: state == 'done' ? K.brand : K.line)),
        Padding(padding: const EdgeInsets.symmetric(vertical: 7), child: Row(children: [
          _Marker(i, state, 28),
          const SizedBox(width: 10),
          Expanded(child: Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: state == 'done' ? K.ink : state == 'now' ? const Color(0xFF5F3DC4) : K.ink2))),
          if (who != null) ...[const SizedBox(width: 10), Text(who!, style: const TextStyle(fontSize: 12, color: K.ink3))],
        ])),
      ]);
}

/// st-flow-mini: the four steps as small pills.
class _MiniStep extends StatelessWidget {
  final int i;
  final String label, state;
  const _MiniStep(this.i, this.label, this.state);
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.fromLTRB(5, 5, 10, 5), decoration: BoxDecoration(color: K.sub, borderRadius: BorderRadius.circular(999)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        _Marker(i, state, 22), const SizedBox(width: 6),
        Text(label, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: state == 'now' ? const Color(0xFF5F3DC4) : K.ink2)),
      ]));
}

class _Marker extends StatelessWidget {
  final int i;
  final String state;
  final double size;
  const _Marker(this.i, this.state, this.size);
  @override
  Widget build(BuildContext context) {
    final now = state == 'now', done = state == 'done', lock = state == 'lock';
    final fg = now || done ? Colors.white : K.ink3;
    final box = Container(width: size, height: size, alignment: Alignment.center,
        decoration: BoxDecoration(shape: BoxShape.circle, color: done ? K.brand : lock ? Colors.white : now ? null : K.hover,
            gradient: now ? Mod.violet.grad : null, boxShadow: now ? const [BoxShadow(color: Color(0xFFF1ECFF), spreadRadius: 4)] : null),
        child: done ? Icon(LucideIcons.circleCheck, size: 15, color: fg) : lock ? Icon(LucideIcons.lock, size: 13, color: fg)
            : Text('${i + 1}', style: TextStyle(fontSize: size < 28 ? 11 : 12, fontWeight: FontWeight.w800, color: fg)));
    return lock ? CustomPaint(foregroundPainter: _Dashed(const Color(0xFF98A2B3), size / 2), child: box) : box;
  }
}

/// A 1.5 px dashed border on a rounded box (the web's border: 1.5px dashed).
class _Dashed extends CustomPainter {
  final Color color;
  final double radius;
  const _Dashed(this.color, this.radius);
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..style = PaintingStyle.stroke..strokeWidth = 1.5..color = color;
    final path = Path()..addRRect(RRect.fromRectAndRadius((Offset.zero & size).deflate(.75), Radius.circular(radius)));
    for (final m in path.computeMetrics()) {
      for (double d = 0; d < m.length; d += 7) { canvas.drawPath(m.extractPath(d, d + 4), p); }
    }
  }
  @override
  bool shouldRepaint(_Dashed old) => old.color != color || old.radius != radius;
}

/* ------------------------------------------------------------ form pieces (KLH Field, Input, Textarea, Button) */

class _Field extends StatelessWidget {
  final String label;
  final bool required;
  final String? error;
  final Widget child;
  const _Field(this.label, {this.required = false, this.error, required this.child});
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Flexible(child: Text(label, style: const TextStyle(fontSize: 13, height: 18 / 13, fontWeight: FontWeight.w600, color: K.ink))),
          if (required) const Padding(padding: EdgeInsets.only(left: 8), child: Text('*', style: TextStyle(fontSize: 13, height: 18 / 13, fontWeight: FontWeight.w600, color: K.bad))),
        ]),
        const SizedBox(height: 6),
        child,
        if (error != null) Padding(padding: const EdgeInsets.only(top: 6), child: Row(children: [
          const Icon(LucideIcons.triangleAlert, size: 14, color: K.bad), const SizedBox(width: 4),
          Expanded(child: Text(error!, style: const TextStyle(fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w500, color: K.bad))),
        ])),
      ]);
}

OutlineInputBorder _border(Color c, [double w = 1]) => OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: c, width: w));

/// klh-input in the comfortable student frame: 44 px, 16 px text.
Widget _input(TextEditingController c, String hint, ValueChanged<String> onChanged, {TextInputType? keyboard}) => TextField(controller: c, onChanged: onChanged, keyboardType: keyboard,
    style: const TextStyle(fontSize: 16, color: K.ink),
    decoration: InputDecoration(hintText: hint, hintStyle: const TextStyle(fontSize: 16, color: Color(0xFF626B7C)), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12)));

/// klh-textarea, three rows: 14/20 text, at least 88 px.
Widget _area(TextEditingController c, String hint, ValueChanged<String> onChanged) => TextField(controller: c, onChanged: onChanged, minLines: 3, maxLines: null,
    style: const TextStyle(fontSize: 14, height: 20 / 14, color: K.ink),
    decoration: InputDecoration(hintText: hint, hintStyle: const TextStyle(fontSize: 14, height: 20 / 14, color: Color(0xFF626B7C)), contentPadding: const EdgeInsets.fromLTRB(12, 10, 12, 16)));

/// A date-and-time input: the value as the browser shows it, or its empty pattern, and the calendar mark.
class _DateBox extends StatelessWidget {
  final String? value;
  final String empty;
  final VoidCallback onTap;
  final bool error;
  const _DateBox(this.value, this.empty, this.onTap, {this.error = false});
  @override
  Widget build(BuildContext context) => InkWell(onTap: onTap, borderRadius: BorderRadius.circular(10), child: InputDecorator(
      decoration: InputDecoration(contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12), suffixIcon: const Icon(LucideIcons.calendar, size: 18, color: K.ink),
          enabledBorder: error ? _border(const Color(0xFFC4302B)) : null),
      child: Text(value ?? empty, style: const TextStyle(fontSize: 16, color: K.ink))));
}

/// A sheet's footer button: full width on a phone; with a reason it is blocked, keeps its own width and says why.
class _FootButton extends StatelessWidget {
  final KButton button;
  final String? reason;
  const _FootButton(this.button, this.reason);
  @override
  Widget build(BuildContext context) {
    if (reason == null) return button;
    return Align(alignment: Alignment.centerRight, child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      ConstrainedBox(constraints: const BoxConstraints(minWidth: 160), child: KButton(button.label, busy: button.busy, kind: button.kind)),
      Padding(padding: const EdgeInsets.only(top: 6), child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 340), child: Row(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Icon(LucideIcons.lock, size: 14, color: K.ink2), const SizedBox(width: 4),
        Flexible(child: Text(reason!, style: const TextStyle(fontSize: 12, height: 16 / 12, color: K.ink2))),
      ]))),
    ]));
  }
}
