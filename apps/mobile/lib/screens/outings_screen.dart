import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

/// A pass that is approved or in use: it has a QR gate pass.
const _livePass = ['Approved', 'Out', 'Overdue'];

/// A request still going through approval.
const _pendingPass = ['Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved'];

Tone _toneOf(String? s) => _livePass.contains(s) ? (s == 'Overdue' ? Tone.bad : Tone.good) : _pendingPass.contains(s) ? Tone.warn : Pill.toneOf(s);
List<Map> _steps(Map o) => ((o['steps'] as List?) ?? []).cast<Map>();

/// My outings (OUT-01): ask for permission, follow the approvals (parent, Floor Warden, Chief Warden, and the Dean for a
/// day or more), withdraw or cancel, and show the QR gate pass once approved. One outing at a time.
class OutingsScreen extends StatelessWidget {
  const OutingsScreen({super.key});

  @override
  Widget build(BuildContext context) => ApiView(
        path: '/outpasses/mine',
        builder: (context, data, reload) {
          final list = ((data as List?) ?? []).cast<Map>();
          final live = list.where((o) => _livePass.contains(o['status'])).firstOrNull;
          final pending = list.where((o) => _pendingPass.contains(o['status'])).firstOrNull;
          final open = list.where((o) => _livePass.contains(o['status']) || _pendingPass.contains(o['status'])).toList();
          final past = list.where((o) => ['Returned', 'Rejected', 'Cancelled'].contains(o['status'])).toList();

          void ask() => _openSheet(context, (c) => _AskSheet(live: live, pending: pending, reload: reload, onShow: () => _show(context, live, pending, reload)));

          return PageList(children: [
            const Text('Write why you need to go. Your parent recommends, the Chief Warden approves (and the Dean for a day or more). Your QR gate pass appears only after approval.',
                style: TextStyle(color: K.ink2, fontSize: 13.5)),
            KCard(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                ActionButton(label: 'Ask for outing permission', icon: Icons.door_front_door_rounded, onPressed: ask),
                const SizedBox(height: 10),
                Text(
                    live != null
                        ? 'You have ${live['outpass_no']} (${words(live['status']).toLowerCase()}). One outing at a time.'
                        : pending != null
                            ? '${pending['outpass_no']} is waiting for approval.'
                            : 'No outing open. You can ask now.',
                    style: const TextStyle(color: K.ink3, fontSize: 13)),
              ]),
            ),
            for (final o in open)
              KCard(
                icon: _livePass.contains(o['status']) ? Icons.qr_code_2_rounded : Icons.door_front_door_rounded,
                title: '${o['destination']}',
                subtitle: '${o['outpass_no']} · ${dayTime(o['leave_from'])} to ${dayTime(o['return_by'])}',
                trailing: Pill(words(o['status']), tone: _toneOf(o['status'])),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${o['reason'] ?? ''}', style: const TextStyle(color: K.ink2)),
                  const SizedBox(height: 12),
                  _Trail(_steps(o)),
                  const SizedBox(height: 12),
                  _livePass.contains(o['status'])
                      ? ActionButton(label: 'Show pass', icon: Icons.qr_code_2_rounded, onPressed: () => _show(context, live, pending, reload))
                      : OutlinedButton(onPressed: () => _show(context, live, pending, reload), child: const Text('See status')),
                ]),
              ),
            KCard(
              icon: Icons.schedule_rounded,
              title: 'Past outings',
              child: past.isEmpty
                  ? const EmptyView(icon: Icons.door_front_door_rounded, title: 'No past outings', body: 'Returned, rejected and cancelled passes appear here.')
                  : Column(children: [
                      for (final (i, o) in past.indexed) ...[
                        if (i > 0) const Divider(height: 20),
                        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('${o['destination']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text('${o['outpass_no']}', style: const TextStyle(color: K.ink3, fontSize: 12)),
                            const SizedBox(height: 2),
                            Text('Left ${dayTime(o['leave_from'])} · back by ${dayTime(o['return_by'])}', style: const TextStyle(color: K.ink2, fontSize: 12.5)),
                          ])),
                          const SizedBox(width: 8),
                          Pill(words(o['status']), tone: _toneOf(o['status'])),
                        ]),
                      ],
                    ]),
            ),
          ]);
        },
      );

  void _show(BuildContext context, Map? live, Map? pending, Future<void> Function() reload) {
    if (live != null) {
      _openSheet(context, (c) => _PassSheet(pass: live, reload: reload));
    } else if (pending != null) {
      _openSheet(context, (c) => _StatusSheet(pass: pending, reload: reload));
    }
  }
}

void _openSheet(BuildContext context, Widget Function(BuildContext) builder) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (c) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(c).bottom),
        child: SingleChildScrollView(padding: const EdgeInsets.fromLTRB(20, 0, 20, 28), child: builder(c)),
      ),
    );

Future<bool> _confirm(BuildContext context, String title, String body, String yes) async =>
    await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Keep it')),
          FilledButton(style: FilledButton.styleFrom(backgroundColor: K.bad), onPressed: () => Navigator.pop(c, true), child: Text(yes)),
        ],
      ),
    ) ??
    false;

/// Cancels a pass or withdraws a request after asking; closes the sheet and reloads when it worked.
Future<void> _cancel(BuildContext context, Map o, Future<void> Function() reload) async {
  final live = _livePass.contains(o['status']);
  final ok = await _confirm(context, live ? 'Cancel this pass?' : 'Withdraw this request?',
      '${o['outpass_no']} to ${o['destination']} will be ${live ? 'cancelled' : 'withdrawn'}. You can ask again afterwards.', live ? 'Cancel pass' : 'Withdraw');
  if (!ok || !context.mounted) return;
  final done = await act(context, () => api.post('/outpasses/${o['outpass_id']}/cancel'), live ? 'Pass cancelled. You can ask again now.' : 'Request withdrawn. You can ask again now.');
  if (!done) return;
  if (context.mounted) Navigator.of(context).pop();
  await reload();
}

class _SheetHead extends StatelessWidget {
  final String title;
  final String sub;
  const _SheetHead(this.title, this.sub);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Row(children: [
          Container(width: 40, height: 40, decoration: BoxDecoration(color: K.violet.withValues(alpha: .12), borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.door_front_door_rounded, color: K.violet)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            Text(sub, style: const TextStyle(color: K.ink3, fontSize: 13)),
          ])),
        ]),
      );
}

class _Note extends StatelessWidget {
  final String text;
  const _Note(this.text);
  @override
  Widget build(BuildContext context) => Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Icon(Icons.event_rounded, size: 16, color: K.ink3),
        const SizedBox(width: 6),
        Expanded(child: Text(text, style: const TextStyle(color: K.ink2, fontSize: 13))),
      ]);
}

/* ---------------------------------------------------------------- the gate pass */

class _PassSheet extends StatelessWidget {
  final Map pass;
  final Future<void> Function() reload;
  const _PassSheet({required this.pass, required this.reload});

  @override
  Widget build(BuildContext context) {
    final approved = pass['status'] == 'Approved';
    final token = '${pass['qr_token'] ?? ''}';
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      _SheetHead('Your gate pass', '${pass['outpass_no']} · ${words(pass['status'])}'),
      Center(
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: K.line)),
          child: token.isEmpty
              ? const SizedBox(width: 260, height: 260, child: Center(child: Text('No QR code on this pass.', style: TextStyle(color: K.ink3))))
              : QrImageView(data: token, size: 260, backgroundColor: Colors.white),
        ),
      ),
      const SizedBox(height: 10),
      const Text('Show this code at the campus gate going out and coming back.', textAlign: TextAlign.center, style: TextStyle(color: K.ink2, fontSize: 13)),
      const SizedBox(height: 16),
      InfoRow('Student', '${titleCase(pass['full_name'])} · ${pass['student_id'] ?? ''}'),
      InfoRow('Going to', '${pass['destination']}'),
      InfoRow('Reason', '${pass['reason'] ?? ''}'),
      InfoRow('Leave', dayTime(pass['leave_from'])),
      InfoRow('Back by', dayTime(pass['return_by'])),
      const SizedBox(height: 12),
      _Note(approved
          ? 'You can have one outing at a time. To ask for a different one, cancel this pass first; once you are back, Ask permission appears again.'
          : 'You can ask for your next outing once you are back and scanned in at the gate.'),
      if (approved) ...[
        const SizedBox(height: 16),
        OutlinedButton(onPressed: () => _cancel(context, pass, reload), child: const Text('Cancel this pass')),
      ],
    ]);
  }
}

/* ---------------------------------------------------------------- a request in approval */

class _StatusSheet extends StatelessWidget {
  final Map pass;
  final Future<void> Function() reload;
  const _StatusSheet({required this.pass, required this.reload});

  @override
  Widget build(BuildContext context) {
    final steps = _steps(pass);
    final parent = steps.where((x) => x['level'] == 0).firstOrNull;
    final floor = steps.where((x) => x['role'] == 'Floor_Warden' && x['decision'] != 'Skipped').firstOrNull;
    final warden = steps.where((x) => x['role'] == 'Chief_Warden').firstOrNull;
    final dean = steps.where((x) => x['role'] == 'Dean_Students_Affairs' && x['decision'] != 'Skipped').firstOrNull;
    final parentDone = parent != null && parent['decision'] != 'Pending';
    final flow = <(String, String, String?)>[
      ('Request sent', 'done', null),
      ('Parent recommends', parentDone ? 'done' : 'now', parent?['by']),
      if (floor != null) ('Floor Warden approves', floor['decision'] == 'Approved' ? 'done' : parentDone ? 'now' : 'next', floor['by']),
      (
        'Chief Warden approves',
        warden?['decision'] == 'Approved' ? 'done' : (floor != null ? floor['decision'] == 'Approved' : parentDone) ? 'now' : 'next',
        warden?['by'],
      ),
      if (dean != null) ('Dean approves', dean['decision'] == 'Approved' ? 'done' : warden?['decision'] == 'Approved' ? 'now' : 'next', null),
      ('QR gate pass', 'lock', null),
    ];
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      _SheetHead('Permission requested', '${pass['outpass_no']} · waiting for approval'),
      for (final (i, f) in flow.indexed) _FlowStep(i + 1, f.$1, f.$2, f.$3),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: const Color(0xFFF2F4F7), borderRadius: BorderRadius.circular(14)),
        child: Column(children: [
          const Icon(Icons.lock_rounded, color: K.ink3),
          const SizedBox(height: 4),
          const Text('No gate pass yet', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(
              'Your QR gate pass is made when the last approval is given${dean != null ? ' (the Dean, for an outing of a day or more)' : ' (the Chief Warden)'}. It will appear here and on the Outing card.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: K.ink3, fontSize: 12.5)),
        ]),
      ),
      const SizedBox(height: 12),
      InfoRow('Reason', '${pass['reason'] ?? ''}'),
      InfoRow('Going to', '${pass['destination']}'),
      InfoRow('Leave', dayTime(pass['leave_from'])),
      InfoRow('Back by', dayTime(pass['return_by'])),
      InfoRow('Kind', '${pass['outing_category'] == 'Same_Day' ? 'Same-day outing' : 'A day or more'} · ${pass['levels_required'] ?? '—'} approvals'),
      if (steps.isNotEmpty) ...[const SizedBox(height: 12), _Trail(steps)],
      const SizedBox(height: 16),
      OutlinedButton(onPressed: () => _cancel(context, pass, reload), child: const Text('Withdraw request')),
    ]);
  }
}

class _FlowStep extends StatelessWidget {
  final int n;
  final String label;
  final String state;
  final String? who;
  const _FlowStep(this.n, this.label, this.state, this.who);
  @override
  Widget build(BuildContext context) {
    final (fg, bg) = switch (state) {
      'done' => (K.good, K.goodBg),
      'now' => (K.warn, K.warnBg),
      _ => (K.ink3, const Color(0xFFF2F4F7)),
    };
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(children: [
        Container(
          width: 28, height: 28, alignment: Alignment.center,
          decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
          child: state == 'done'
              ? Icon(Icons.check_rounded, size: 16, color: fg)
              : state == 'lock'
                  ? Icon(Icons.lock_rounded, size: 14, color: fg)
                  : Text('$n', style: TextStyle(color: fg, fontWeight: FontWeight.w800, fontSize: 13)),
        ),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: TextStyle(fontWeight: state == 'now' ? FontWeight.w800 : FontWeight.w600, color: state == 'next' || state == 'lock' ? K.ink3 : K.ink))),
        if (who != null) Text(who!, style: const TextStyle(color: K.ink3, fontSize: 12)),
      ]),
    );
  }
}

/// Who has approved so far: parent (P), then each level, with the decision, when, and any remarks.
class _Trail extends StatelessWidget {
  final List<Map> steps;
  const _Trail(this.steps);
  @override
  Widget build(BuildContext context) {
    if (steps.isEmpty) return const Text('No approvals recorded yet.', style: TextStyle(color: K.ink3, fontSize: 13));
    return Column(children: [
      for (final s in steps)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 5),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 26, height: 26, alignment: Alignment.center,
              decoration: const BoxDecoration(color: K.brandTint, shape: BoxShape.circle),
              child: Text(s['level'] == 0 ? 'P' : '${s['level']}', style: const TextStyle(color: K.brand, fontWeight: FontWeight.w800, fontSize: 12)),
            ),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(words(s['role']), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
              Text([if (s['by'] != null) '${s['by']}', if (s['on'] != null) dayTime(s['on'])].join(' · '), style: const TextStyle(color: K.ink3, fontSize: 12)),
              if (s['remarks'] != null) Text('"${s['remarks']}"', style: const TextStyle(color: K.ink2, fontSize: 12.5, fontStyle: FontStyle.italic)),
            ])),
            Pill(words(s['decision']), tone: s['decision'] == 'Recommended' ? Tone.good : Pill.toneOf(s['decision'])),
          ]),
        ),
    ]);
  }
}

/* ---------------------------------------------------------------- ask for permission */

class _AskSheet extends StatefulWidget {
  final Map? live;
  final Map? pending;
  final Future<void> Function() reload;
  final VoidCallback onShow;
  const _AskSheet({this.live, this.pending, required this.reload, required this.onShow});
  @override
  State<_AskSheet> createState() => _AskSheetState();
}

class _AskSheetState extends State<_AskSheet> {
  final reason = TextEditingController();
  final destination = TextEditingController();
  final phone = TextEditingController();
  DateTime? leave;
  DateTime? back;
  bool busy = false;
  bool sent = false;

  @override
  void dispose() {
    reason.dispose();
    destination.dispose();
    phone.dispose();
    super.dispose();
  }

  bool get bad => leave != null && back != null && !back!.isAfter(leave!);

  String? get missing {
    if (reason.text.trim().length < 3) return 'Write the reason.';
    if (destination.text.trim().length < 2) return 'Where are you going?';
    if (leave == null || back == null) return 'Set both times.';
    if (bad) return 'Return must be after leaving.';
    if (phone.text.trim().isEmpty) return 'Give a phone number.';
    if (!RegExp(r'^[0-9+ ]{10,15}$').hasMatch(phone.text.trim())) return 'Give a phone number of 10 digits or more.';
    return null;
  }

  Future<DateTime?> _pick(DateTime? current) async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final init = current ?? leave ?? now;
    final d = await showDatePicker(context: context, initialDate: init.isBefore(today) ? today : init, firstDate: today, lastDate: today.add(const Duration(days: 180)));
    if (d == null || !mounted) return null;
    final t = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(init));
    if (t == null) return null;
    return DateTime(d.year, d.month, d.day, t.hour, t.minute);
  }

  Future<void> _submit() async {
    setState(() => busy = true);
    final ok = await act(
        context,
        () => api.post('/outpasses', {
              'reason': reason.text.trim(),
              'destination': destination.text.trim(),
              'leave_from': leave!.toUtc().toIso8601String(),
              'return_by': back!.toUtc().toIso8601String(),
              'contact_during_leave': phone.text.trim(),
            }),
        'Request submitted');
    if (!mounted) return;
    setState(() { busy = false; sent = ok; });
    if (ok) await widget.reload();
  }

  @override
  Widget build(BuildContext context) {
    if (sent) {
      return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Icon(Icons.check_circle_rounded, color: K.good, size: 48),
        const SizedBox(height: 10),
        const Text('Request submitted', textAlign: TextAlign.center, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        const Text(
            'There is no gate pass yet. Your parent gets a link to recommend it, then the Floor Warden and the Chief Warden approve (and the Dean, for an outing of a day or more). Your QR gate pass appears on the Outing card once it is approved.',
            textAlign: TextAlign.center,
            style: TextStyle(color: K.ink2)),
        const SizedBox(height: 18),
        FilledButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Done')),
      ]);
    }
    final live = widget.live;
    final existing = live ?? widget.pending;
    final outNow = live != null && live['status'] != 'Approved';
    final sameDay = leave != null && back != null && DateUtils.isSameDay(leave, back);
    final blocked = existing != null ? 'Finish with ${existing['outpass_no']} first.' : missing;

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      const _SheetHead('Ask for outing permission', 'Write why you need to go. The QR gate pass is made only after the warden approves.'),
      if (existing != null) ...[
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: K.warnBg, borderRadius: BorderRadius.circular(14)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(outNow ? 'You are out on ${existing['outpass_no']}' : live != null ? '${existing['outpass_no']} is approved' : '${existing['outpass_no']} is waiting for approval',
                style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(
                '${existing['destination']} · ${dayTime(existing['leave_from'])} to ${dayTime(existing['return_by'])}. ${outNow ? 'Scan in at the gate when you are back, then you can ask for the next outing.' : 'You can have one outing at a time. Cancel it to ask for a different one.'}',
                style: const TextStyle(color: K.ink2, fontSize: 13)),
            const SizedBox(height: 10),
            Wrap(spacing: 8, runSpacing: 8, children: [
              OutlinedButton(onPressed: () { Navigator.of(context).pop(); widget.onShow(); }, child: Text(live != null ? 'Show pass' : 'See status')),
              if (!outNow) OutlinedButton(onPressed: () => _cancel(context, existing, widget.reload), child: Text(live != null ? 'Cancel pass' : 'Withdraw')),
            ]),
          ]),
        ),
        const SizedBox(height: 14),
      ],
      Wrap(spacing: 6, runSpacing: 6, children: [
        for (final (i, l) in ['Your request', 'Parent recommends', 'Warden approves', 'QR gate pass'].indexed)
          Chip(
            avatar: i == 3 ? const Icon(Icons.lock_rounded, size: 14) : CircleAvatar(radius: 9, child: Text('${i + 1}', style: const TextStyle(fontSize: 11))),
            label: Text(l, style: TextStyle(fontSize: 12, fontWeight: i == 0 ? FontWeight.w800 : FontWeight.w600)),
            visualDensity: VisualDensity.compact,
          ),
      ]),
      const SizedBox(height: 16),
      TextField(
        controller: reason, minLines: 3, maxLines: 5, onChanged: (_) => setState(() {}),
        decoration: const InputDecoration(labelText: 'Why do you need to go out? *', hintText: "For example: sister's wedding, bank work, hospital visit", alignLabelWithHint: true),
      ),
      const SizedBox(height: 12),
      TextField(controller: destination, onChanged: (_) => setState(() {}), decoration: const InputDecoration(labelText: 'Going to *', hintText: 'Vijayawada')),
      const SizedBox(height: 12),
      _TimeField(label: 'Leaving *', value: leave, onTap: () async { final d = await _pick(leave); if (d != null) setState(() => leave = d); }),
      const SizedBox(height: 12),
      _TimeField(label: 'Back by *', value: back, error: bad ? 'Must be after leaving.' : null, onTap: () async { final d = await _pick(back); if (d != null) setState(() => back = d); }),
      const SizedBox(height: 12),
      TextField(controller: phone, keyboardType: TextInputType.phone, onChanged: (_) => setState(() {}), decoration: const InputDecoration(labelText: 'Phone while away *', hintText: '98480 12345')),
      if (leave != null && back != null && !bad) ...[
        const SizedBox(height: 12),
        _Note(sameDay ? 'Same-day outing: your parent recommends, the warden approves.' : 'A day or more: your parent recommends, the warden approves, then the Dean, Students Affairs.'),
      ],
      const SizedBox(height: 18),
      Center(child: ActionButton(label: 'Submit request', icon: Icons.send_rounded, busy: busy, onPressed: blocked == null ? _submit : null)),
      if (blocked != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(blocked, textAlign: TextAlign.center, style: const TextStyle(color: K.ink3, fontSize: 12.5))),
    ]);
  }
}

class _TimeField extends StatelessWidget {
  final String label;
  final DateTime? value;
  final String? error;
  final VoidCallback onTap;
  const _TimeField({required this.label, required this.value, required this.onTap, this.error});
  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: InputDecorator(
          decoration: InputDecoration(labelText: label, errorText: error, suffixIcon: const Icon(Icons.event_rounded)),
          child: Text(value == null ? 'Pick date and time' : dayTime(value), style: TextStyle(color: value == null ? K.ink3 : K.ink)),
        ),
      );
}
