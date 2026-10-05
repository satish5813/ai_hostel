import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

/// TKT-01 My tickets, as pages/student/MyTickets.tsx: report something wrong in the room, the mess or a common
/// facility, follow it through the check and the repair, and confirm when it is fixed (or reopen it).
class RepairsScreen extends StatefulWidget {
  const RepairsScreen({super.key});
  @override
  State<RepairsScreen> createState() => _RepairsScreenState();
}

const _areas = [
  ('Room', 'My room', LucideIcons.bedDouble, 'Furniture, fan, lights, tap, toilet'),
  ('Mess', 'Mess', LucideIcons.utensils, 'Food, hygiene, water, dining hall'),
  ('Common', 'Common facility', LucideIcons.building2, 'Lift, corridor lights, reading room, activity room'),
];
const _action = {'Raised': 'Reported', 'Verified': 'Checked: genuine', 'Rejected': 'Checked: not genuine', 'Escalated': 'Sent for repair', 'Started': 'Repair started',
  'Closure_Report': 'Repair done', 'Confirmed': 'Confirmed by student', 'Auto_Closed': 'Closed automatically', 'Assigned': 'Assigned'};
const _status = {'Open': ('Waiting to be checked', 'warn'), 'Assigned': ('Sent for repair', 'warn'), 'In_Progress': ('Being repaired', 'warn'),
  'Resolved': ('Repaired: please confirm', 'info'), 'Closed': ('Closed', 'good'), 'Reopened': ('Reopened', 'bad')};
String _when(dynamic s) { final d = parseDate(s); return d == null ? '' : '${DateFormat('d MMM').format(d)}, ${DateFormat('h:mm a').format(d).toLowerCase()}'; }

const _tx2 = Color(0xFF344054), _tx5 = Color(0xFF475467), _green = Color(0xFF0CA30C);

class _RepairsScreenState extends State<RepairsScreen> {
  Map? d;
  Object? error;
  String? area;
  Map? item;
  final text = TextEditingController(), where = TextEditingController();
  var busy = false;

  @override
  void initState() { super.initState(); load(); }

  Future<void> load() async {
    try { final r = await api.get('/me/tickets'); if (mounted) setState(() { d = r as Map?; error = null; }); }
    catch (e) { if (mounted) setState(() => error = e); }
  }

  void reset() => setState(() { area = null; item = null; text.clear(); where.clear(); });

  Future<void> submit() async {
    setState(() => busy = true);
    try {
      final t = await api.post('/me/tickets', {'item_code': item!['item_code'], 'description': text.text, 'location_note': where.text.isEmpty ? null : where.text});
      if (mounted) toast(context, 'Ticket ${t['ticket_id']} raised; the ${item!['area'] == 'Mess' ? 'mess in-charge' : 'floor warden'} will check it');
      reset(); load();
    } catch (e) { if (mounted) toast(context, '$e', error: true); }
    finally { if (mounted) setState(() => busy = false); }
  }

  @override
  Widget build(BuildContext context) {
    final data = d;
    if (data == null && error != null) return ErrorView(message: '$error', onRetry: load);
    Widget page(List<Widget> c) => RefreshIndicator(onRefresh: load, child: ListView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 16, 16, 90), children: [
          for (final (i, w) in c.indexed) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 12), child: w),
        ]));
    if (data == null) return page([const _StEmpty('Loading…')]);
    final stay = data['stay'] as Map?;
    if (stay == null) return page([const Panel(title: 'My tickets', child: _StEmpty('You can raise repair tickets once you live in a hostel.'))]);
    final items = ((data['items'] as List?) ?? []).cast<Map>();
    final tickets = ((data['tickets'] as List?) ?? []).cast<Map>();
    final open = tickets.where((t) => t['status'] != 'Closed').length;
    final it = item;
    final sla = (it?['sla_hours'] as num?)?.toInt() ?? 0;
    final blocked = text.text.trim().length < 5 ? 'Describe the problem.' : area == 'Common' && where.text.trim().isEmpty ? 'Say where it is.' : null;
    return page([
      // mn-head
      Panel(child: Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 12, runSpacing: 12, children: [
        Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 40, height: 40, decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF12B886), K.brand], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(12)), child: const Icon(LucideIcons.wrench, size: 20, color: Colors.white)),
          const SizedBox(width: 12),
          Flexible(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('My tickets', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: K.ink)),
            Text('${stay['bed_label']}${stay['mess_name'] != null ? ' · ${stay['mess_name']}' : ''}', style: const TextStyle(fontSize: 12.5, color: K.ink3)),
          ])),
        ]),
        Wrap(spacing: 6, runSpacing: 6, children: [_Chip('$open open'), _Chip('${tickets.length - open} closed')]),
      ])),
      // tk-new
      Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Padding(padding: EdgeInsets.only(bottom: 10), child: Text('Report a problem', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: K.ink))),
        for (final (k, label, icon, sub) in _areas) Padding(padding: const EdgeInsets.only(bottom: 8), child: _Choice(area == k, () => setState(() { area = k; item = null; }),
            padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [Icon(icon, size: 20, color: K.brand), const SizedBox(width: 10), Expanded(child: Text(label, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Color(0xFF1D2939))))]),
              const SizedBox(height: 3),
              Text(sub, style: const TextStyle(fontSize: 11.5, height: 1.35, color: K.ink3)),
            ]))),
        const SizedBox(height: 4), // margin-bottom 12 after the last 8 px gap
        if (area != null) ...[
          const KLabel('What is wrong?'),
          LayoutBuilder(builder: (c, b) {
            final cols = ((b.maxWidth + 8) / 148).floor().clamp(1, 8);
            final list = items.where((i) => i['area'] == area).toList();
            return Column(children: [
              for (var r = 0; r < list.length; r += cols) Padding(padding: EdgeInsets.only(top: r == 0 ? 0 : 8), child: IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                for (var j = 0; j < cols; j++) ...[
                  if (j > 0) const SizedBox(width: 8),
                  Expanded(child: r + j < list.length ? Builder(builder: (_) {
                    final i = list[r + j];
                    return _Choice(item?['item_code'] == i['item_code'], () => setState(() => item = i), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('${i['label']}', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: Color(0xFF1D2939))),
                          if (i['hint'] != null) ...[const SizedBox(height: 3), Text('${i['hint']}', style: const TextStyle(fontSize: 11.5, height: 1.35, color: K.ink3))],
                        ]));
                  }) : const SizedBox.shrink()),
                ],
              ]))),
              const SizedBox(height: 12),
            ]);
          }),
        ],
        if (it != null) ...[
          if (area == 'Common') ...[_TkField('Where is it?', _box(where, '2nd floor corridor, east wing', 120, (_) => setState(() {}))), const SizedBox(height: 10)],
          _TkField('Describe the problem', _box(text, 'What happens, since when', 600, (_) => setState(() {}), lines: 3)),
          const SizedBox(height: 10),
          Note('${it['category_name']}: usually fixed within ${sla < 24 ? '$sla hours' : '${(sla / 24).round()} day${sla >= 48 ? 's' : ''}'} once checked.', icon: LucideIcons.clock),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _Blocked(KButton('Raise ticket', busy: busy, onPressed: blocked != null ? null : submit), blocked),
            KButton('Cancel', kind: BtnKind.ghost, onPressed: reset),
          ]),
        ],
      ])),
      for (final t in tickets) _TicketCard(key: ValueKey(t['ticket_id']), t: t, onChange: load),
      if (tickets.isEmpty) const _StEmpty('You have not raised any tickets.'),
    ]);
  }
}

/// A ticket (tk-card): what and where, the status pill, the description, the timeline, and the confirmation.
class _TicketCard extends StatefulWidget {
  final Map t;
  final VoidCallback onChange;
  const _TicketCard({super.key, required this.t, required this.onChange});
  @override
  State<_TicketCard> createState() => _TicketCardState();
}

class _TicketCardState extends State<_TicketCard> {
  final note = TextEditingController();
  var busy = false;

  Future<void> confirm(bool fixed) async {
    setState(() => busy = true);
    try {
      await api.post('/me/tickets/${widget.t['ticket_id']}/confirm', {'fixed': fixed, 'note': note.text.isEmpty ? null : note.text});
      if (mounted) toast(context, fixed ? 'Thank you; ticket closed' : 'Reopened; the repairers have been told');
      widget.onChange();
    } catch (e) { if (mounted) toast(context, '$e', error: true); }
    finally { if (mounted) setState(() => busy = false); }
  }

  @override
  Widget build(BuildContext context) {
    final t = widget.t;
    final st = _status[t['status']] ?? ('${t['status']}', 'warn');
    final events = ((t['events'] as List?) ?? []).cast<Map>();
    Widget gap = const SizedBox(height: 8);
    return Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${t['item_label'] ?? t['category_name']}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: K.ink)),
          Text('#${t['ticket_id']} · ${t['area'] == 'Room' ? 'Room ${t['space_code'] ?? ''}' : t['area'] == 'Mess' ? 'Mess' : t['location_note'] ?? ''} · ${_when(t['raised_date'])}',
              style: const TextStyle(fontSize: 12, color: K.ink3)),
        ])),
        const SizedBox(width: 8),
        _XdPill(st.$1, st.$2 == 'info' ? 'warn' : st.$2),
      ]),
      gap,
      Text('${t['description']}', style: const TextStyle(fontSize: 13.5, color: _tx2)),
      if (t['late'] == true) ...[gap, const Row(children: [Icon(LucideIcons.clock, size: 13, color: Color(0xFFB42318)), SizedBox(width: 6),
        Text('Past the time allowed to fix it.', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFFB42318)))])],
      gap,
      // tk-time
      Container(padding: const EdgeInsets.only(left: 14), decoration: const BoxDecoration(border: Border(left: BorderSide(color: K.line, width: 2))),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            for (final (i, e) in events.indexed) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 8), child: Stack(clipBehavior: Clip.none, children: [
              Positioned(left: -20, top: 4, child: Container(width: 10, height: 10, decoration: BoxDecoration(shape: BoxShape.circle, boxShadow: const [BoxShadow(color: Colors.white, spreadRadius: 2)],
                  color: e['action'] == 'Rejected' || (e['action'] == 'Confirmed' && '${e['note'] ?? ''}'.startsWith('Not fixed')) ? const Color(0xFFD03B3B)
                      : e['action'] == 'Confirmed' || e['action'] == 'Closure_Report' ? _green : const Color(0xFF98A2B3)))),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(_action[e['action']] ?? '${e['action']}', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: _tx2)),
                Text('${_when(e['event_at'])}${e['by'] != null ? ' · ${e['by']}' : ''}', style: const TextStyle(fontSize: 11.5, color: K.ink3)),
                if (e['note'] != null) Text('${e['note']}', style: const TextStyle(fontSize: 12.5, color: _tx5)),
              ]),
            ])),
          ])),
      if (t['status'] == 'Resolved') ...[gap, Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xFFF2FBF9), borderRadius: BorderRadius.circular(12)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const KLabel('Is it fixed?'),
            const SizedBox(height: 8),
            _box(note, 'Anything to add (optional)', 300, null),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              KButton('Yes, it is fixed', icon: LucideIcons.check, busy: busy, onPressed: () => confirm(true)),
              KButton('No, still not fixed', kind: BtnKind.secondary, busy: busy, onPressed: () => confirm(false)),
            ]),
          ]))],
      if (t['status'] == 'Closed' && t['l1_decision'] == 'Not_Genuine') ...[gap,
        _TkNote(LucideIcons.circleX, 'Closed after checking${t['l1_remarks'] != null ? ': ${t['l1_remarks']}' : ''}. Raise it again if the problem comes back.')],
      if (t['status'] == 'Closed' && t['student_confirmed'] == true) ...[gap, const _TkNote(LucideIcons.circleCheck, 'You confirmed the repair.', iconColor: _green)],
      if (t['status'] == 'Reopened') ...[gap, const _TkNote(LucideIcons.rotateCcw, 'Reopened; the repairers have 24 hours.')],
    ]));
  }
}

/* ------------------------------------------------------------ small pieces */

class _StEmpty extends StatelessWidget {
  final String text;
  const _StEmpty(this.text);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Text(text, style: const TextStyle(fontSize: 13, color: K.ink3)));
}

/// mn-chips
class _Chip extends StatelessWidget {
  final String label;
  const _Chip(this.label);
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5), decoration: BoxDecoration(color: const Color(0xFFF2FBF9), borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: K.brandDark)));
}

/// xd-pill: a plain rounded word on the tone's tint.
class _XdPill extends StatelessWidget {
  final String label, tone;
  const _XdPill(this.label, this.tone);
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: const {'good': Color(0xFFE7F6E7), 'warn': Color(0xFFFFF5DC), 'bad': Color(0xFFFCE9E9)}[tone] ?? K.hover, borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: K.ink)));
}

/// A tk-areas / tk-items button: 1.5 px border, 14 px corners; chosen is teal with a mint fill.
class _Choice extends StatelessWidget {
  final bool on;
  final VoidCallback onTap;
  final EdgeInsets padding;
  final Widget child;
  const _Choice(this.on, this.onTap, {required this.padding, required this.child});
  @override
  Widget build(BuildContext context) => Semantics(selected: on, button: true, child: Material(color: on ? const Color(0xFFECFDF8) : Colors.white, borderRadius: BorderRadius.circular(14), child: InkWell(
      onTap: onTap, borderRadius: BorderRadius.circular(14),
      child: Container(padding: padding, decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: on ? K.brand : K.line, width: 1.5)),
          foregroundDecoration: on ? BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: K.brand, width: 2.5)) : null,
          child: child))));
}

/// tk-field: the label (13/700) over its input.
class _TkField extends StatelessWidget {
  final String label;
  final Widget child;
  const _TkField(this.label, this.child);
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _tx2)), const SizedBox(height: 4), child,
      ]);
}

/// The plain inputs of this page: 14 px, 10/12 padding, a #D0D5DD hairline, 10 px corners.
Widget _box(TextEditingController c, String hint, int max, ValueChanged<String>? onChanged, {int lines = 1}) {
  OutlineInputBorder b(Color c, [double w = 1]) => OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: c, width: w));
  return TextField(controller: c, onChanged: onChanged, maxLength: max, minLines: lines, maxLines: lines == 1 ? 1 : null,
      style: const TextStyle(fontSize: 14, color: K.ink),
      decoration: InputDecoration(hintText: hint, hintStyle: const TextStyle(fontSize: 14, color: Color(0xFF8A919E)), counterText: '',
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10), enabledBorder: b(const Color(0xFFD0D5DD)), border: b(const Color(0xFFD0D5DD))));
}

class _TkNote extends StatelessWidget {
  final IconData icon;
  final String text;
  final Color iconColor;
  const _TkNote(this.icon, this.text, {this.iconColor = _tx5});
  @override
  Widget build(BuildContext context) => Row(children: [
        Icon(icon, size: 14, color: iconColor), const SizedBox(width: 6),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 12.5, color: _tx5))),
      ]);
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
