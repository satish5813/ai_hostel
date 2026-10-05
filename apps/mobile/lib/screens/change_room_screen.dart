import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';

const _rcStatus = {
  'Pending_FW': ('With the Floor Warden', Tone.warn), 'Pending_CW': ('With the Chief Warden', Tone.warn), 'Approved': ('Approved: to move', Tone.good),
  'Moved': ('Moved', Tone.good), 'Rejected': ('Not approved', Tone.bad), 'Cancelled': ('Cancelled', Tone.muted),
};

num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
String _num(dynamic v) {
  if (v == null) return '—';
  final n = _n(v);
  return n == n.roundToDouble() ? '${n.round()}' : n.toStringAsFixed(2).replaceFirst(RegExp(r'0$'), '');
}

/// Change room: ask for another room type or another room of the same type in your hostel, pick a free bed (or leave
/// it to the Chief Warden), and see what it does to the hostel fee and electricity before sending.
class ChangeRoomScreen extends StatelessWidget {
  const ChangeRoomScreen({super.key});
  @override
  Widget build(BuildContext context) => ApiView(path: '/me/room-change', builder: (context, data, reload) {
        final d = data as Map;
        final stay = d['stay'] as Map?;
        if (stay == null) {
          return const PageList(children: [EmptyView(icon: Icons.swap_horiz_rounded, title: 'Change room', body: 'You can ask for another room once you live in a hostel.')]);
        }
        final requests = ((d['requests'] as List?) ?? []).cast<Map>();
        final open = requests.where((x) => ['Pending_FW', 'Pending_CW', 'Approved'].contains(x['status'])).firstOrNull;
        final past = requests.where((x) => x != open).toList();
        return PageList(children: [
          KCard(
            title: 'Change room', icon: Icons.swap_horiz_rounded,
            subtitle: 'Now in ${stay['bed_label']} · ${stay['type_name']} · ${stay['floor_name']}, ${stay['hostel_name']}',
            child: stay['hostel_fee'] != null ? Align(alignment: Alignment.centerLeft, child: Pill('${inr(stay['hostel_fee'])} a year', tone: Tone.muted)) : const SizedBox.shrink(),
          ),
          if (open != null) _OpenRequest(c: open, onChange: reload) else _NewRequest(d: d, onDone: reload),
          if (past.isNotEmpty)
            KCard(title: 'Earlier requests', icon: Icons.history_rounded, child: Column(children: [
              for (final c in past)
                Theme(data: Theme.of(context).copyWith(dividerColor: Colors.transparent), child: ExpansionTile(
                  tilePadding: EdgeInsets.zero, childrenPadding: const EdgeInsets.only(bottom: 12),
                  title: Text('${c['change_no']} · ${c['from_bed']} → ${c['to_bed'] ?? c['to_type']}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  subtitle: Text('${day(c['requested_at'])} · ${c['reason']}', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: K.ink3, fontSize: 12.5)),
                  trailing: Pill(_rcStatus[c['status']]?.$1 ?? words(c['status']), tone: _rcStatus[c['status']]?.$2 ?? Tone.info),
                  children: [
                    _Timeline(c: c),
                    if (c['statement'] != null) _Statement(s: c['statement'] as Map, settled: true),
                  ],
                )),
            ])),
        ]);
      });
}

/// The path of a request: Floor Warden, Chief Warden, the move.
class _Timeline extends StatelessWidget {
  final Map c;
  const _Timeline({required this.c});
  @override
  Widget build(BuildContext context) {
    final moved = c['status'] == 'Moved';
    final steps = ((c['steps'] as List?) ?? []).cast<Map>();
    final items = <(String, bool, bool, String)>[
      (c['arranged'] == true ? 'Arranged by the Chief Warden' : 'Asked', true, false, day(c['requested_at'])),
      for (final s in steps)
        (s['approver_role'] == 'Floor_Warden' ? 'Floor Warden' : 'Chief Warden', s['decision'] == 'Approved', s['decision'] == 'Rejected',
            s['decision'] == 'Pending' ? 'Waiting' : s['decision'] == 'Skipped' ? 'Not needed'
                : '${s['decision'] == 'Rejected' ? 'Not approved' : 'Approved'}${s['acted_by_name'] != null ? ' · ${s['acted_by_name']}' : ''} · ${day(s['decided_on'])}${s['remarks'] != null ? ' · “${s['remarks']}”' : ''}'),
      ('Moved and settled', moved, false, moved ? '${day(c['move_date'])}${c['moved_by_name'] != null ? ' · ${c['moved_by_name']}' : ''}' : c['status'] == 'Approved' ? 'On the day of the move' : ''),
    ];
    final next = items.indexWhere((x) => !x.$2 && !x.$3);
    return Column(children: [
      for (var i = 0; i < items.length; i++)
        Padding(padding: const EdgeInsets.symmetric(vertical: 5), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(items[i].$3 ? Icons.cancel_rounded : items[i].$2 ? Icons.check_circle_rounded : i == next ? Icons.schedule_rounded : Icons.circle_outlined, size: 20,
              color: items[i].$3 ? K.bad : items[i].$2 ? K.good : i == next ? K.warn : K.ink3),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(items[i].$1, style: const TextStyle(fontWeight: FontWeight.w700)),
            if (items[i].$4.isNotEmpty) Text(items[i].$4, style: const TextStyle(color: K.ink3, fontSize: 12.5)),
          ])),
        ])),
    ]);
  }
}

class _OpenRequest extends StatefulWidget {
  final Map c;
  final Future<void> Function() onChange;
  const _OpenRequest({required this.c, required this.onChange});
  @override
  State<_OpenRequest> createState() => _OpenRequestState();
}

class _OpenRequestState extends State<_OpenRequest> {
  bool busy = false;
  Map? statement;

  @override
  void initState() {
    super.initState();
    statement = widget.c['statement'] as Map?;
    Api.instance.get('/room-changes/${widget.c['change_id']}').then((d) {
      if (mounted && d is Map && d['statement'] is Map) setState(() => statement = d['statement'] as Map);
    }).catchError((_) {});
  }

  Future<void> cancel() async {
    final yes = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
          title: const Text('Cancel request?'), content: const Text('Cancel this room change request?'),
          actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep it')), FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Cancel request'))],
        ));
    if (yes != true || !mounted) return;
    setState(() => busy = true);
    final ok = await act(context, () => Api.instance.post('/me/room-change/${widget.c['change_id']}/cancel'), 'Request cancelled');
    if (mounted) setState(() => busy = false);
    if (ok) await widget.onChange();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.c;
    final st = _rcStatus[c['status']] ?? (words(c['status']), Tone.warn);
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      KCard(
        title: '${c['from_bed']} → ${c['to_bed'] ?? 'a ${c['to_type']} bed'}',
        subtitle: '${c['change_no']} · ${c['from_type']} → ${c['to_type']}${c['to_floor'] != null ? ' · ${c['to_floor']}' : ''}',
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Pill(st.$1, tone: st.$2),
          const SizedBox(height: 10),
          Text('“${c['reason']}”', style: const TextStyle(color: K.ink2, fontStyle: FontStyle.italic)),
          const SizedBox(height: 10),
          _Timeline(c: c),
          if (c['status'] == 'Approved')
            _Hint(Icons.check_circle_outline_rounded, "Approved. Your bed ${c['to_bed']} is kept for you. Your Floor Warden will read the room's meter, take your old key and give you the new one on the day you move."),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: busy ? null : cancel, child: busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Cancel request')),
        ]),
      ),
      if (statement != null) ...[
        const SizedBox(height: 14),
        KCard(title: 'Fee and electricity', icon: Icons.receipt_long_rounded, child: _Statement(s: statement!)),
      ],
    ]);
  }
}

class _NewRequest extends StatefulWidget {
  final Map d;
  final Future<void> Function() onDone;
  const _NewRequest({required this.d, required this.onDone});
  @override
  State<_NewRequest> createState() => _NewRequestState();
}

class _NewRequestState extends State<_NewRequest> {
  String? kind;
  int? type;
  String? bed;
  final reason = TextEditingController();
  bool busy = false;
  List<Map>? beds;
  Map? preview;
  String? previewError;

  Map get stay => widget.d['stay'] as Map;
  List<Map> get types => ((widget.d['types'] as List?) ?? []).cast<Map>();
  int? get typeId => kind == 'Same_Type' ? stay['room_type_id'] as int? : type;

  @override
  void dispose() { reason.dispose(); super.dispose(); }

  void pick(String k) { setState(() { kind = k; type = null; bed = null; beds = null; preview = null; previewError = null; }); if (k == 'Same_Type') load(); }

  void pickType(int t) { setState(() { type = t; bed = null; beds = null; preview = null; previewError = null; }); load(); }

  Future<void> load() async {
    final t = typeId;
    if (t == null) return;
    Api.instance.get('/me/room-change/beds?type=$t').then((v) { if (mounted && typeId == t) setState(() => beds = (v as List).cast<Map>()); })
        .catchError((_) { if (mounted && typeId == t) setState(() => beds = []); });
    Api.instance.get('/me/room-change/preview?type=$t').then((v) { if (mounted && typeId == t) setState(() => preview = v as Map); })
        .catchError((e) { if (mounted && typeId == t) setState(() => previewError = e.toString()); });
  }

  String? get blocked => typeId == null ? 'Choose the room type.' : reason.text.trim().length < 10 ? 'Say why in a sentence.' : null;

  Future<void> send() async {
    setState(() => busy = true);
    try {
      final x = await Api.instance.post('/me/room-change', {'kind': kind, 'to_room_type_id': typeId, 'to_subspace_id': bed, 'reason': reason.text.trim()});
      if (mounted) toast(context, 'Request ${x['change_no']} sent to your Floor Warden');
      await widget.onDone();
    } catch (e) {
      if (mounted) toast(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final others = types.where((t) => t['room_type_id'] != stay['room_type_id']).toList();
    final same = types.where((t) => t['room_type_id'] == stay['room_type_id']).firstOrNull;
    final n = kind == 'Room_Type' ? 3 : 2;
    // floors -> rooms -> beds
    final floors = <String, Map<String, List<Map>>>{};
    for (final b in beds ?? <Map>[]) {
      (floors.putIfAbsent('${b['floor_name']}', () => {}).putIfAbsent('${b['room_code']}', () => [])).add(b);
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      KCard(title: '1. What would you like?', child: Column(children: [
        _Option(selected: kind == 'Room_Type', icon: Icons.swap_horiz_rounded, title: 'Another room type',
            sub: others.isNotEmpty ? others.map((t) => t['type_name']).join(', ') : 'No other room type in this hostel', onTap: others.isEmpty ? null : () => pick('Room_Type')),
        const SizedBox(height: 8),
        _Option(selected: kind == 'Same_Type', icon: Icons.bed_rounded, title: 'Another room, same type',
            sub: '${stay['type_name']}${same != null ? ' · ${same['free_beds']} free beds' : ''}', onTap: () => pick('Same_Type')),
      ])),
      if (kind == 'Room_Type') ...[
        const SizedBox(height: 14),
        KCard(title: '2. Room type', child: Column(children: [
          for (final t in others) ...[
            Builder(builder: (_) {
              final diff = _n(t['hostel_fee']) - _n(stay['hostel_fee'] ?? t['hostel_fee']);
              final free = _n(t['free_beds']);
              return _Option(
                selected: type == t['room_type_id'], icon: Icons.meeting_room_rounded, title: '${t['type_name']} · ${inr(t['hostel_fee'])} a year',
                sub: '${t['sharing_count']} in a room${t['is_ac'] == true ? ' · AC' : ''}${t['attached_bath'] == true ? ' · Attached bath' : ''}\n'
                    '${diff > 0 ? '${inr(diff)} more a year' : diff < 0 ? '${inr(-diff)} less a year' : 'Same fee'} · $free free beds',
                subColor: diff > 0 ? K.bad : diff < 0 ? K.good : null,
                onTap: free > 0 ? () => pickType(t['room_type_id'] as int) : null,
              );
            }),
            const SizedBox(height: 8),
          ],
        ])),
      ],
      if (typeId != null) ...[
        const SizedBox(height: 14),
        KCard(title: '$n. Choose a bed', subtitle: 'or leave it to the Chief Warden', child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (beds == null) const Text('Loading free beds…', style: TextStyle(color: K.ink3)),
          if (beds != null && beds!.isEmpty) const Text('No free bed of this type now. You can still ask; the Chief Warden will give one when it is free.', style: TextStyle(color: K.ink3)),
          for (final f in floors.entries) ...[
            Padding(padding: const EdgeInsets.only(top: 6, bottom: 6), child: Text(f.key, style: const TextStyle(fontWeight: FontWeight.w800, color: K.ink2))),
            for (final r in f.value.entries)
              Padding(padding: const EdgeInsets.only(bottom: 8), child: Row(children: [
                SizedBox(width: 110, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Room ${r.key}', style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text('${r.value.first['occupied']} of ${r.value.first['sharing_count']} taken', style: const TextStyle(color: K.ink3, fontSize: 12)),
                ])),
                Expanded(child: Wrap(spacing: 6, runSpacing: 6, children: [
                  for (final b in r.value)
                    ChoiceChip(
                      label: Text('Bed ${b['bed_code']}'), selected: bed == b['subspace_id'],
                      labelStyle: TextStyle(color: bed == b['subspace_id'] ? Colors.white : K.ink, fontWeight: FontWeight.w600),
                      onSelected: (_) => setState(() => bed = bed == b['subspace_id'] ? null : b['subspace_id'] as String),
                    ),
                ])),
              ])),
          ],
          if (bed != null) _Hint(Icons.bed_rounded, 'You asked for ${beds?.where((b) => b['subspace_id'] == bed).firstOrNull?['bed_label'] ?? bed}. The Chief Warden may give another bed of the same type.'),
        ])),
        const SizedBox(height: 14),
        KCard(title: '${n + 1}. Why?', child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          TextField(controller: reason, maxLength: 600, minLines: 3, maxLines: 6, onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(hintText: 'For example: my roommates study late and I cannot sleep; I would like a 2-sharing room to prepare for exams.')),
          if (preview != null) ...[
            const Padding(padding: EdgeInsets.only(top: 4, bottom: 10), child: Text('What it means for your fees', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15))),
            _Statement(s: preview!),
          ],
          if (previewError != null) Text(previewError!, style: const TextStyle(color: K.ink3)),
          if (blocked != null) Padding(padding: const EdgeInsets.only(top: 10), child: Text(blocked!, style: const TextStyle(color: K.warn, fontSize: 12.5))),
          const SizedBox(height: 12),
          Align(alignment: Alignment.centerLeft, child: ActionButton(label: 'Send to my Floor Warden', icon: Icons.send_rounded, busy: busy, onPressed: blocked == null ? send : null)),
          const SizedBox(height: 10),
          const Text('The Floor Warden of your floor approves first, then the Chief Warden. You can cancel until you move.', style: TextStyle(color: K.ink3, fontSize: 12.5)),
        ])),
      ],
    ]);
  }
}

class _Option extends StatelessWidget {
  final bool selected;
  final IconData icon;
  final String title, sub;
  final Color? subColor;
  final VoidCallback? onTap;
  const _Option({required this.selected, required this.icon, required this.title, required this.sub, this.subColor, this.onTap});
  @override
  Widget build(BuildContext context) => Opacity(opacity: onTap == null ? .5 : 1, child: Material(
        color: selected ? K.brandTint : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: selected ? K.brand : K.line, width: selected ? 2 : 1)),
        child: InkWell(borderRadius: BorderRadius.circular(14), onTap: onTap, child: Padding(padding: const EdgeInsets.all(12), child: Row(children: [
          Icon(icon, color: selected ? K.brand : K.ink2), const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
            Text(sub, style: TextStyle(color: subColor ?? K.ink3, fontSize: 12.5)),
          ])),
          if (selected) const Icon(Icons.check_circle_rounded, color: K.brand, size: 20),
        ])))));
}

class _Hint extends StatelessWidget {
  final IconData icon;
  final String text;
  const _Hint(this.icon, this.text);
  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(top: 10), padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: K.brandTint, borderRadius: BorderRadius.circular(12)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 17, color: K.brand), const SizedBox(width: 8),
          Expanded(child: Text(text, style: const TextStyle(color: K.brandDark, fontSize: 13))),
        ]));
}

/// The money side of a room change: hostel fee for the year at both rates, the electricity share up to the move, dues carried over.
class _Statement extends StatelessWidget {
  final Map s;
  final bool settled;
  const _Statement({required this.s, this.settled = false});

  Widget _row(String label, String value, {String? sub, bool sum = false, Color? color}) => Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(border: Border(top: BorderSide(color: sum ? K.ink3 : K.line))),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: TextStyle(fontWeight: sum ? FontWeight.w800 : FontWeight.w600, color: color ?? K.ink, fontSize: 13.5)),
            if (sub != null) Text(sub, style: const TextStyle(color: K.ink3, fontSize: 12)),
          ])),
          const SizedBox(width: 10),
          Text(value, style: TextStyle(fontWeight: sum ? FontWeight.w800 : FontWeight.w700, color: color ?? K.ink, fontSize: 13.5)),
        ]));

  Widget _box(IconData icon, String title, List<Widget> children) => Container(
        margin: const EdgeInsets.only(top: 10), padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(border: Border.all(color: K.line), borderRadius: BorderRadius.circular(14)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [Icon(icon, size: 17, color: K.brand), const SizedBox(width: 6), Text(title, style: const TextStyle(fontWeight: FontWeight.w800))]),
          const SizedBox(height: 6),
          ...children,
        ]));

  static const _small = TextStyle(color: K.ink3, fontSize: 12);

  @override
  Widget build(BuildContext context) {
    final h = (s['hostel'] as Map?) ?? {};
    final e = (s['electricity'] as Map?) ?? {};
    final adj = _n(h['adjustment']);
    final duesList = ((e['dues_list'] as List?) ?? []).cast<Map>();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Icon(Icons.info_outline_rounded, size: 16, color: K.ink3), const SizedBox(width: 6),
        Expanded(child: Text(settled ? 'Settled on ${day(s['move_date'])}, the day of the move.'
            : 'Worked out as if the move were today (${day(s['move_date'])}). The final figures use the day of the move and the meter reading taken then.', style: _small)),
      ]),
      _box(Icons.bed_rounded, 'Hostel fee ${s['academic_year'] ?? ''}', [
        _row('${h['old_type']}', inr(h['old_part']), sub: '${inr(h['old_fee'])} a year · ${s['days_old']} days in the old room'),
        _row('${h['new_type']}', inr(h['new_part']), sub: '${inr(h['new_fee'])} a year · ${s['days_new']} days in the new room'),
        _row('Hostel fee for the year after the change', inr(h['year_total']), sum: true),
        _row('Billed before the change', inr(h['billed']), sub: 'Paid ${inr(h['paid'])}${_n(h['unpaid']) > 0 ? ' · unpaid ${inr(h['unpaid'])}' : ''}'),
        _row(adj > 0 ? 'Difference to pay (added to your fees)' : adj < 0 ? 'Difference in your favour' : 'No difference: same room type',
            '${adj > 0 ? '+' : adj < 0 ? '−' : ''}${inr(adj.abs())}',
            color: adj > 0 ? K.bad : adj < 0 ? K.good : null,
            sub: adj < 0 ? '${_n(h['credit_to_instalments']) > 0 ? '${inr(h['credit_to_instalments'])} off your unpaid instalments' : 'Nothing unpaid to reduce'}'
                '${_n(h['refund_due']) > 0 ? ' · ${inr(h['refund_due'])} refund due from Accounts' : ''}' : null),
        const SizedBox(height: 4),
        const Text('What you have paid stays with you and moves to the new room; only the difference for the rest of the year is added or credited.', style: _small),
      ]),
      _box(Icons.bolt_rounded, 'Electricity', [
        if (e['meter_no'] != null) ...[
          _row('Old room meter ${e['meter_no']}', '${_num(e['units'])} units',
              sub: '${_num(e['opening'])} kWh on ${day(e['opening_at'])} → ${_num(e['reading'])} kWh on ${day(e['reading_at'])} · ${e['reading_source'] ?? ''}'),
          _row('Units to pay for this month so far', '${_num(e['billable'])} units · ${inr(e['room_amount'])}',
              sub: '${_num(e['included'])} included in the fee${_n(e['recharged']) > 0 ? ' · ${_num(e['recharged'])} recharged' : ''} · at ₹${_num(e['rate'])} a unit'),
          _row('Your share up to the move', inr(e['my_share']), sum: true, sub: '${e['my_days'] ?? '—'} of ${e['all_days'] ?? '—'} student-days in the room this month'),
          _row('Earlier bills not yet paid', inr(e['dues']),
              sub: '${duesList.isEmpty ? 'None' : duesList.map((d) => '${inr(d['amount'])} due ${day(d['due_date'])}').join(' · ')} · they stay with you'),
        ] else
          Text('The old room has no meter: nothing to settle now. Earlier bills not yet paid: ${inr(e['dues'])}.', style: _small),
        const SizedBox(height: 4),
        const Text("From the move, the new room's bill is shared with your new roommates; the old room's bill for this month counts your share above as paid.", style: _small),
      ]),
      Container(
        margin: const EdgeInsets.only(top: 10), padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(gradient: K.heroGradient, borderRadius: BorderRadius.circular(14)),
        child: Row(children: [
          const Icon(Icons.receipt_long_rounded, color: Colors.white), const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(inr(s['total_to_pay']), style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w800)),
            Text('to pay after the move${_n(s['other_dues']) > 0 ? ' (includes ${inr(s['other_dues'])} of other dues)' : ''}', style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ])),
          if (_n(s['refund_due']) > 0) Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(inr(s['refund_due']), style: const TextStyle(color: K.sun, fontSize: 18, fontWeight: FontWeight.w800)),
            const Text('refund due to you', style: TextStyle(color: Colors.white70, fontSize: 12)),
          ]),
        ]),
      ),
    ]);
  }
}
