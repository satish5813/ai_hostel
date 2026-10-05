import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';

const _areas = [
  ('Room', 'My room', Icons.bed_rounded, 'Furniture, fan, lights, tap, toilet'),
  ('Mess', 'Mess', Icons.restaurant_rounded, 'Food, hygiene, water, dining hall'),
  ('Common', 'Common facility', Icons.apartment_rounded, 'Lift, corridor lights, reading room, activity room'),
];

const _action = {
  'Raised': 'Reported', 'Verified': 'Checked: genuine', 'Rejected': 'Checked: not genuine', 'Escalated': 'Sent for repair', 'Started': 'Repair started',
  'Closure_Report': 'Repair done', 'Confirmed': 'Confirmed by student', 'Auto_Closed': 'Closed automatically', 'Assigned': 'Assigned',
};

const _status = {
  'Open': ('Waiting to be checked', Tone.warn), 'Assigned': ('Sent for repair', Tone.warn), 'In_Progress': ('Being repaired', Tone.warn),
  'Resolved': ('Repaired: please confirm', Tone.info), 'Closed': ('Closed', Tone.good), 'Reopened': ('Reopened', Tone.bad),
};

/// My tickets: report something wrong in your room, the mess or a common facility, follow it through the warden's
/// check and the repair, and confirm when it is fixed (or reopen it).
class RepairsScreen extends StatelessWidget {
  const RepairsScreen({super.key});
  @override
  Widget build(BuildContext context) => ApiView(path: '/me/tickets', builder: (context, data, reload) {
        final d = data as Map;
        final stay = d['stay'] as Map?;
        if (stay == null) {
          return const PageList(children: [EmptyView(icon: Icons.build_rounded, title: 'My tickets', body: 'You can raise repair tickets once you live in a hostel.')]);
        }
        final tickets = ((d['tickets'] as List?) ?? []).cast<Map>();
        final items = ((d['items'] as List?) ?? []).cast<Map>();
        final open = tickets.where((t) => t['status'] != 'Closed').length;
        return PageList(children: [
          KCard(
            title: 'My tickets', icon: Icons.build_rounded,
            subtitle: '${stay['bed_label']}${stay['mess_name'] != null ? ' · ${stay['mess_name']}' : ''}',
            child: Wrap(spacing: 8, children: [Pill('$open open', tone: Tone.warn), Pill('${tickets.length - open} closed', tone: Tone.muted)]),
          ),
          _NewTicket(items: items, onDone: reload),
          for (final t in tickets) _TicketCard(t: t, onChange: reload),
          if (tickets.isEmpty) const EmptyView(icon: Icons.inbox_rounded, title: 'You have not raised any tickets.'),
        ]);
      });
}

class _NewTicket extends StatefulWidget {
  final List<Map> items;
  final Future<void> Function() onDone;
  const _NewTicket({required this.items, required this.onDone});
  @override
  State<_NewTicket> createState() => _NewTicketState();
}

class _NewTicketState extends State<_NewTicket> {
  String? area;
  Map? item;
  final text = TextEditingController();
  final where = TextEditingController();
  bool busy = false;

  @override
  void dispose() { text.dispose(); where.dispose(); super.dispose(); }

  void reset() => setState(() { area = null; item = null; text.clear(); where.clear(); });

  String? get blocked => text.text.trim().length < 5 ? 'Describe the problem.' : area == 'Common' && where.text.trim().isEmpty ? 'Say where it is.' : null;

  String sla(num h) => h < 24 ? '${h.round()} hours' : '${(h / 24).round()} day${h >= 48 ? 's' : ''}';

  Future<void> submit() async {
    setState(() => busy = true);
    final it = item!;
    try {
      final t = await Api.instance.post('/me/tickets', {'item_code': it['item_code'], 'description': text.text.trim(), 'location_note': where.text.trim().isEmpty ? null : where.text.trim()});
      if (mounted) toast(context, 'Ticket ${t['ticket_id']} raised; the ${it['area'] == 'Mess' ? 'mess in-charge' : 'floor warden'} will check it');
      reset();
      await widget.onDone();
    } catch (e) {
      if (mounted) toast(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => KCard(
        title: 'Report a problem', icon: Icons.report_problem_rounded,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (final a in _areas)
            Padding(padding: const EdgeInsets.only(bottom: 8), child: _Choice(
              selected: area == a.$1, icon: a.$3, title: a.$2, sub: a.$4,
              onTap: () => setState(() { area = a.$1; item = null; }),
            )),
          if (area != null) ...[
            const Padding(padding: EdgeInsets.only(top: 6, bottom: 8), child: Text('What is wrong?', style: TextStyle(fontWeight: FontWeight.w700, color: K.ink2))),
            Wrap(spacing: 8, runSpacing: 8, children: [
              for (final i in widget.items.where((i) => i['area'] == area))
                ChoiceChip(
                  label: Text('${i['label']}'), selected: item?['item_code'] == i['item_code'],
                  tooltip: i['hint'], labelStyle: TextStyle(color: item?['item_code'] == i['item_code'] ? Colors.white : K.ink, fontWeight: FontWeight.w600),
                  onSelected: (_) => setState(() => item = i),
                ),
            ]),
            if (item?['hint'] != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text('${item!['hint']}', style: const TextStyle(color: K.ink3, fontSize: 12.5))),
          ],
          if (item != null) ...[
            const SizedBox(height: 14),
            if (area == 'Common') ...[
              TextField(controller: where, maxLength: 120, onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(labelText: 'Where is it?', hintText: '2nd floor corridor, east wing')),
              const SizedBox(height: 4),
            ],
            TextField(controller: text, maxLength: 600, minLines: 3, maxLines: 5, onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(labelText: 'Describe the problem', hintText: 'What happens, since when', alignLabelWithHint: true)),
            Row(children: [
              const Icon(Icons.schedule_rounded, size: 15, color: K.ink3), const SizedBox(width: 6),
              Expanded(child: Text('${item!['category_name']}: usually fixed within ${sla(num.tryParse('${item!['sla_hours']}') ?? 24)} once checked.',
                  style: const TextStyle(color: K.ink3, fontSize: 12.5))),
            ]),
            if (blocked != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(blocked!, style: const TextStyle(color: K.warn, fontSize: 12.5))),
            const SizedBox(height: 12),
            Wrap(spacing: 10, runSpacing: 10, crossAxisAlignment: WrapCrossAlignment.center, children: [
              ActionButton(label: 'Raise ticket', icon: Icons.send_rounded, busy: busy, onPressed: blocked == null ? submit : null),
              TextButton(onPressed: busy ? null : reset, child: const Text('Cancel')),
            ]),
          ],
        ]),
      );
}

class _Choice extends StatelessWidget {
  final bool selected;
  final IconData icon;
  final String title, sub;
  final VoidCallback onTap;
  const _Choice({required this.selected, required this.icon, required this.title, required this.sub, required this.onTap});
  @override
  Widget build(BuildContext context) => Material(
        color: selected ? K.brandTint : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: selected ? K.brand : K.line, width: selected ? 2 : 1)),
        child: InkWell(borderRadius: BorderRadius.circular(14), onTap: onTap, child: Padding(padding: const EdgeInsets.all(12), child: Row(children: [
          Icon(icon, color: selected ? K.brand : K.ink2), const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
            Text(sub, style: const TextStyle(color: K.ink3, fontSize: 12.5)),
          ])),
          if (selected) const Icon(Icons.check_circle_rounded, color: K.brand, size: 20),
        ]))),
      );
}

class _TicketCard extends StatefulWidget {
  final Map t;
  final Future<void> Function() onChange;
  const _TicketCard({required this.t, required this.onChange});
  @override
  State<_TicketCard> createState() => _TicketCardState();
}

class _TicketCardState extends State<_TicketCard> {
  final note = TextEditingController();
  bool busy = false;

  @override
  void dispose() { note.dispose(); super.dispose(); }

  Future<void> confirm(bool fixed) async {
    setState(() => busy = true);
    final ok = await act(context, () => Api.instance.post('/me/tickets/${widget.t['ticket_id']}/confirm', {'fixed': fixed, 'note': note.text.trim().isEmpty ? null : note.text.trim()}),
        fixed ? 'Thank you; ticket closed' : 'Reopened; the repairers have been told');
    if (mounted) setState(() => busy = false);
    if (ok) await widget.onChange();
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.t;
    final st = _status[t['status']] ?? (words(t['status']), Tone.warn);
    final place = t['area'] == 'Room' ? 'Room ${t['space_code'] ?? ''}' : t['area'] == 'Mess' ? 'Mess' : (t['location_note'] ?? 'Common');
    final events = ((t['events'] as List?) ?? []).cast<Map>();
    return KCard(
      title: '${t['item_label'] ?? t['category_name']}',
      subtitle: '#${t['ticket_id']} · $place · ${dayTime(t['raised_date'])}',
      trailing: Pill(st.$1, tone: st.$2),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${t['description']}', style: const TextStyle(color: K.ink2)),
        if (t['late'] == true) const Padding(padding: EdgeInsets.only(top: 8), child: Row(children: [
              Icon(Icons.schedule_rounded, size: 14, color: K.bad), SizedBox(width: 6),
              Text('Past the time allowed to fix it.', style: TextStyle(color: K.bad, fontSize: 12.5, fontWeight: FontWeight.w600)),
            ])),
        const SizedBox(height: 12),
        for (var i = 0; i < events.length; i++) _Step(e: events[i], last: i == events.length - 1),
        if (t['status'] == 'Resolved') ...[
          const SizedBox(height: 8),
          const Text('Is it fixed?', style: TextStyle(fontWeight: FontWeight.w700, color: K.ink2)),
          const SizedBox(height: 8),
          TextField(controller: note, maxLength: 300, decoration: const InputDecoration(hintText: 'Anything to add (optional)')),
          Wrap(spacing: 10, runSpacing: 10, children: [
            ActionButton(label: 'Yes, it is fixed', icon: Icons.check_rounded, busy: busy, onPressed: () => confirm(true)),
            OutlinedButton(onPressed: busy ? null : () => confirm(false), child: const Text('No, still not fixed')),
          ]),
        ],
        if (t['status'] == 'Closed' && t['l1_decision'] == 'Not_Genuine')
          _Note(Icons.cancel_outlined, 'Closed after checking${t['l1_remarks'] != null ? ': ${t['l1_remarks']}' : ''}. Raise it again if the problem comes back.', K.ink2),
        if (t['status'] == 'Closed' && t['student_confirmed'] == true) const _Note(Icons.check_circle_outline_rounded, 'You confirmed the repair.', K.good),
        if (t['status'] == 'Reopened') const _Note(Icons.replay_rounded, 'Reopened; the repairers have 24 hours.', K.ink2),
      ]),
    );
  }
}

class _Step extends StatelessWidget {
  final Map e;
  final bool last;
  const _Step({required this.e, required this.last});
  @override
  Widget build(BuildContext context) {
    final bad = e['action'] == 'Rejected' || (e['action'] == 'Confirmed' && '${e['note'] ?? ''}'.startsWith('Not fixed'));
    final good = !bad && (e['action'] == 'Confirmed' || e['action'] == 'Closure_Report');
    final c = bad ? K.bad : good ? K.good : K.brand;
    return IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Column(children: [
        Container(width: 12, height: 12, margin: const EdgeInsets.only(top: 3), decoration: BoxDecoration(color: c, shape: BoxShape.circle)),
        if (!last) Expanded(child: Container(width: 2, color: K.line)),
      ]),
      const SizedBox(width: 10),
      Expanded(child: Padding(padding: const EdgeInsets.only(bottom: 12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(_action[e['action']] ?? words(e['action']), style: TextStyle(fontWeight: FontWeight.w700, color: bad ? K.bad : K.ink)),
        Text('${dayTime(e['event_at'])}${e['by'] != null ? ' · ${e['by']}' : ''}', style: const TextStyle(color: K.ink3, fontSize: 12)),
        if (e['note'] != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text('${e['note']}', style: const TextStyle(color: K.ink2, fontSize: 13))),
      ]))),
    ]));
  }
}

class _Note extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color color;
  const _Note(this.icon, this.text, this.color);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(top: 6), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 15, color: color), const SizedBox(width: 6),
        Expanded(child: Text(text, style: TextStyle(color: color, fontSize: 13))),
      ]));
}
