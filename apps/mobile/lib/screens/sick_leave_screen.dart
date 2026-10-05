import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

/// The food a student on sick leave gets in the room (the Floor Warden chooses it).
const _diet = {
  'Light': ('Light food', 'Khichdi, idli, curd rice, plain dal, vegetable soup, banana'),
  'Liquid': ('Liquid only', 'Soups, dal water, fruit juice, buttermilk, ORS'),
  'Normal': ('Normal meal', 'The regular mess meal, sent to the room'),
};

/// Who a sick-leave step belongs to, as people say it.
const _stepRole = {'Floor_Warden': 'Floor Warden', 'Warden': 'Building in-charge', 'Hostel_Incharge': 'Building in-charge', 'Chief_Warden': 'Chief Warden'};

const _openStatus = ['Applied', 'Recommended', 'Approved'];

/// The day after a date: an extension starts the day after the leave ends, so no meal is sent twice.
String _dayAfter(dynamic d) {
  final p = DateTime.parse('$d'.substring(0, 10));
  return isoDay(DateTime(p.year, p.month, p.day + 1));
}

/// My sick leave (SCK-01): report sick, follow the Floor Warden's visit and the building in-charge's approval, see the
/// food being sent and the meals delivered, say "I am well now", or ask for an extension.
class SickLeaveScreen extends StatelessWidget {
  const SickLeaveScreen({super.key});

  @override
  Widget build(BuildContext context) => ApiView(
        path: '/sick-leaves/mine',
        builder: (context, data, reload) {
          final list = ((data as List?) ?? []).cast<Map>();
          final current = list.where((l) => _openStatus.contains(l['status'])).firstOrNull;
          final history = list.where((l) => l != current).toList();
          return PageList(children: [
            const Text('Your Floor Warden visits you first, then the building in-charge approves. Meals then come to your room, light food if you need it.',
                style: TextStyle(color: K.ink2, fontSize: 13.5)),
            current != null ? _Current(leave: current, reload: reload) : _ReportForm(reload: reload),
            KCard(
              icon: Icons.schedule_rounded,
              title: 'History',
              child: history.isEmpty
                  ? const EmptyView(icon: Icons.healing_rounded, title: 'No sick leave on record')
                  : Column(children: [
                      for (final (i, l) in history.indexed) ...[
                        if (i > 0) const Divider(height: 20),
                        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('${day(l['from_date'])} – ${day(l['to_date'])}', style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text('${l['illness_details'] ?? ''}', style: const TextStyle(color: K.ink2, fontSize: 13)),
                            Text('Room meals: ${l['room_meals_required'] == true ? 'Yes' : '—'}', style: const TextStyle(color: K.ink3, fontSize: 12)),
                          ])),
                          const SizedBox(width: 8),
                          Pill(words(l['status']), tone: Pill.toneOf(l['status'])),
                        ]),
                      ],
                    ]),
            ),
          ]);
        },
      );
}

/* ---------------------------------------------------------------- the open leave */

class _Current extends StatefulWidget {
  final Map leave;
  final Future<void> Function() reload;
  const _Current({required this.leave, required this.reload});
  @override
  State<_Current> createState() => _CurrentState();
}

class _CurrentState extends State<_Current> {
  Map? detail;
  DateTime? extendTo;
  bool busy = false;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void didUpdateWidget(_Current old) { super.didUpdateWidget(old); if (old.leave != widget.leave) _load(); }

  Future<void> _load() async {
    try {
      final d = await api.get('/sick-leaves/${widget.leave['sick_leave_id']}');
      if (mounted) setState(() => detail = d as Map?);
    } catch (_) {/* the list already carries the steps and food; only meal deliveries are missing */}
  }

  Future<void> _well() async {
    final yes = await showDialog<bool>(
          context: context,
          builder: (c) => AlertDialog(
            title: const Text('Are you well now?'),
            content: const Text('Your sick leave will be closed and meals will stop coming to your room.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Not yet')),
              FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('I am well now')),
            ],
          ),
        ) ??
        false;
    if (!yes || !mounted) return;
    setState(() => busy = true);
    await act(context, () => api.post('/sick-leaves/${widget.leave['sick_leave_id']}/close', {}), 'Glad you are better. Leave closed.');
    if (mounted) setState(() => busy = false);
    await widget.reload();
  }

  Future<void> _extend() async {
    final l = widget.leave;
    setState(() => busy = true);
    final ok = await act(
        context,
        () => api.post('/sick-leaves', {
              'illness_details': 'Extension: ${l['illness_details']}',
              'from_date': _dayAfter(l['to_date']),
              'to_date': isoDay(extendTo!),
              'extended_from_id': int.parse('${l['sick_leave_id']}'),
            }),
        'Extension requested. Your Floor Warden will visit again.');
    if (!mounted) return;
    setState(() { busy = false; if (ok) extendTo = null; });
    if (ok) await widget.reload();
  }

  Future<void> _pickExtend() async {
    final first = DateTime.parse(_dayAfter(widget.leave['to_date']));
    final d = await showDatePicker(context: context, initialDate: extendTo ?? first, firstDate: first, lastDate: first.add(const Duration(days: 60)));
    if (d != null) setState(() => extendTo = d);
  }

  @override
  Widget build(BuildContext context) {
    final l = widget.leave;
    final approved = l['status'] == 'Approved';
    final visited = l['visited_by'] != null;
    final dietKey = detail?['diet'] ?? l['diet'];
    final diet = _diet[dietKey];
    final dietNote = detail?['diet_note'] ?? l['diet_note'];
    final steps = (((detail?['steps'] ?? l['steps']) as List?) ?? []).cast<Map>();
    final deliveries = ((detail?['deliveries'] as List?) ?? []).cast<Map>();

    return KCard(
      icon: Icons.favorite_rounded,
      title: approved ? 'Approved sick leave' : 'Sick leave in progress',
      subtitle: '${day(l['from_date'])} to ${day(l['to_date'])}',
      trailing: Pill(words(l['status']), tone: Pill.toneOf(l['status'])),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${l['illness_details'] ?? ''}'),
        if (l['status'] == 'Applied' && !visited)
          const _Notice("Waiting for the Floor Warden's visit", 'Stay in your room; the Floor Warden comes to see you and decides what food to send.'),
        if (visited && diet != null)
          _Notice('Food to your room: ${diet.$1}', '${diet.$2}${dietNote != null && '$dietNote'.isNotEmpty ? '. $dietNote' : ''}', icon: Icons.restaurant_rounded),
        if (visited) _Notice('Visited by ${l['visited_by']}', l['visit_remarks'] == null ? null : '${l['visit_remarks']}', tone: Tone.warn, icon: Icons.directions_walk_rounded),
        const SizedBox(height: 14),
        const Text('APPROVALS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: K.ink3, letterSpacing: 1)),
        const SizedBox(height: 4),
        if (steps.isEmpty) const Text('No approvals recorded yet.', style: TextStyle(color: K.ink3, fontSize: 13)),
        for (final s in steps) _Step(s),
        if (approved) ...[
          const SizedBox(height: 14),
          const Text('MEALS TO YOUR ROOM', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: K.ink3, letterSpacing: 1)),
          const SizedBox(height: 6),
          if (detail == null)
            const Text('Loading meals…', style: TextStyle(color: K.ink3, fontSize: 13))
          else if (deliveries.isEmpty)
            const Text('No meals listed yet.', style: TextStyle(color: K.ink3, fontSize: 13))
          else
            Wrap(spacing: 6, runSpacing: 6, children: [
              for (final d in deliveries) Pill('${day(d['meal_date'])} ${words(d['slot'])}: ${words(d['status'])}', tone: Pill.toneOf(d['status'])),
            ]),
        ],
        const SizedBox(height: 16),
        OutlinedButton.icon(onPressed: busy ? null : _well, icon: const Icon(Icons.check_rounded), label: const Text('I am well now')),
        if (approved) ...[
          const SizedBox(height: 16),
          InkWell(
            onTap: _pickExtend,
            borderRadius: BorderRadius.circular(12),
            child: InputDecorator(
              decoration: const InputDecoration(labelText: 'Ask for an extension until', suffixIcon: Icon(Icons.event_rounded)),
              child: Text(extendTo == null ? 'Pick the new end date' : day(extendTo), style: TextStyle(color: extendTo == null ? K.ink3 : K.ink)),
            ),
          ),
          const SizedBox(height: 4),
          Text('The extension starts on ${day(_dayAfter(l['to_date']))}, the day after this leave ends.', style: const TextStyle(color: K.ink3, fontSize: 12)),
          const SizedBox(height: 10),
          OutlinedButton(onPressed: extendTo == null || busy ? null : _extend, child: const Text('Request extension')),
          if (extendTo == null) const Padding(padding: EdgeInsets.only(top: 4), child: Text('Pick the new end date.', style: TextStyle(color: K.ink3, fontSize: 12))),
        ],
      ]),
    );
  }
}

class _Notice extends StatelessWidget {
  final String title;
  final String? body;
  final Tone tone;
  final IconData icon;
  const _Notice(this.title, this.body, {this.tone = Tone.info, this.icon = Icons.info_outline_rounded});
  @override
  Widget build(BuildContext context) {
    final (fg, bg) = tone == Tone.warn ? (K.warn, K.warnBg) : (K.brand, K.brandTint);
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 18, color: fg),
        const SizedBox(width: 8),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: TextStyle(fontWeight: FontWeight.w800, color: fg)),
          if (body != null && body!.isNotEmpty) Text(body!, style: const TextStyle(color: K.ink2, fontSize: 13)),
        ])),
      ]),
    );
  }
}

class _Step extends StatelessWidget {
  final Map s;
  const _Step(this.s);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 26, height: 26, alignment: Alignment.center,
            decoration: const BoxDecoration(color: K.brandTint, shape: BoxShape.circle),
            child: Text('${s['level']}', style: const TextStyle(color: K.brand, fontWeight: FontWeight.w800, fontSize: 12)),
          ),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(_stepRole[s['approver_role']] ?? words(s['approver_role']), style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
            if (s['acted_by_name'] != null || s['decided_on'] != null)
              Text([if (s['acted_by_name'] != null) '${s['acted_by_name']}', if (s['decided_on'] != null) dayTime(s['decided_on'])].join(' · '), style: const TextStyle(color: K.ink3, fontSize: 12)),
            if (s['remarks'] != null) Text('"${s['remarks']}"', style: const TextStyle(color: K.ink2, fontSize: 12.5, fontStyle: FontStyle.italic)),
          ])),
          Pill(words(s['decision']), tone: Pill.toneOf(s['decision'])),
        ]),
      );
}

/* ---------------------------------------------------------------- report sick */

class _ReportForm extends StatefulWidget {
  final Future<void> Function() reload;
  const _ReportForm({required this.reload});
  @override
  State<_ReportForm> createState() => _ReportFormState();
}

class _ReportFormState extends State<_ReportForm> {
  final details = TextEditingController();
  DateTime? from;
  DateTime? to;
  bool busy = false;
  bool tried = false;

  @override
  void dispose() { details.dispose(); super.dispose(); }

  String? get detailsError => tried && details.text.trim().length < 3 ? 'Say what is wrong.' : null;
  String? get fromError => tried && from == null ? 'Pick the first day.' : null;
  String? get toError => tried && to == null ? 'Pick the last day.' : from != null && to != null && to!.isBefore(from!) ? 'Must be on or after From.' : null;

  Future<void> _pick(bool isFrom) async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final first = isFrom ? today.subtract(const Duration(days: 7)) : (from ?? today);
    final init = (isFrom ? from : to) ?? (isFrom ? today : first);
    final d = await showDatePicker(context: context, initialDate: init.isBefore(first) ? first : init, firstDate: first, lastDate: today.add(const Duration(days: 60)));
    if (d == null) return;
    setState(() { if (isFrom) { from = d; if (to != null && to!.isBefore(d)) to = null; } else { to = d; } });
  }

  Future<void> _submit() async {
    setState(() => tried = true);
    if (detailsError != null || fromError != null || toError != null) return;
    setState(() => busy = true);
    final ok = await act(context, () => api.post('/sick-leaves', {'illness_details': details.text.trim(), 'from_date': isoDay(from!), 'to_date': isoDay(to!)}),
        'Reported. Your Floor Warden will come and see you.');
    if (!mounted) return;
    setState(() => busy = false);
    if (ok) {
      details.clear();
      setState(() { from = null; to = null; tried = false; });
      await widget.reload();
    }
  }

  Widget _date(String label, DateTime? v, String? error, VoidCallback onTap) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: InputDecorator(
          decoration: InputDecoration(labelText: label, errorText: error, suffixIcon: const Icon(Icons.event_rounded)),
          child: Text(v == null ? 'Pick a date' : day(v), style: TextStyle(color: v == null ? K.ink3 : K.ink)),
        ),
      );

  @override
  Widget build(BuildContext context) => KCard(
        icon: Icons.favorite_rounded,
        title: 'Report that you are unwell',
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          TextField(
            controller: details, minLines: 3, maxLines: 5, onChanged: (_) => setState(() {}),
            decoration: InputDecoration(labelText: 'What is wrong *', errorText: detailsError, alignLabelWithHint: true),
          ),
          const SizedBox(height: 12),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: _date('From *', from, fromError, () => _pick(true))),
            const SizedBox(width: 10),
            Expanded(child: _date('Until *', to, toError, () => _pick(false))),
          ]),
          const SizedBox(height: 18),
          Center(child: ActionButton(label: 'Report sick leave', icon: Icons.favorite_rounded, busy: busy, onPressed: _submit)),
        ]),
      );
}
