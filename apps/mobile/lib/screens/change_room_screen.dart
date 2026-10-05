import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

/// RCH-02 Change room, as pages/rooms/ChangeRoom.tsx (styles/roomchange.css): the head with the current bed and fee, then
/// either the open request (path, statement, cancel) or the new request (kind, room type, bed, why, statement, send),
/// and the earlier requests, each opening to its path and final statement.
class ChangeRoomScreen extends StatefulWidget {
  const ChangeRoomScreen({super.key});
  @override
  State<ChangeRoomScreen> createState() => _ChangeRoomScreenState();
}

// roomchange.css tokens
const _ink2 = Color(0xFF475467), _ink3 = Color(0xFF667085), _line = Color(0xFFE4E8EF), _tint = Color(0xFFE6F4F1);
const _up = Color(0xFFB54708), _upBg = Color(0xFFFFFAEB), _down = Color(0xFF067647), _downBg = Color(0xFFECFDF3);
num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
final _fmt = NumberFormat('#,##,##0.##', 'en_IN');
String _inr(dynamic v) => '₹${_fmt.format(_n(v))}';
String _num(dynamic v) => v == null ? '—' : _fmt.format(_n(v));
String _day(dynamic s) { final d = parseDate(s); return d == null ? '—' : DateFormat('d MMM yyyy').format(d); }

const _rcStatus = {
  'Pending_FW': ('With the Floor Warden', 'warn'), 'Pending_CW': ('With the Chief Warden', 'warn'), 'Approved': ('Approved: to move', 'good'),
  'Moved': ('Moved', 'good'), 'Rejected': ('Not approved', 'bad'), 'Cancelled': ('Cancelled', 'muted'),
};
const _small = TextStyle(fontSize: 12, color: _ink3);

class _ChangeRoomScreenState extends State<ChangeRoomScreen> {
  Map? d;
  Map? openStatement;
  final expanded = <dynamic>{};
  bool busy = false;
  // new request
  String? kind; // Room_Type | Same_Type
  int? type;
  String? bed;
  List<Map>? beds;
  Map? preview;
  String? previewError;
  final _reason = TextEditingController();

  @override
  void initState() { super.initState(); load(); }
  @override
  void dispose() { _reason.dispose(); super.dispose(); }

  Map? get _open => ((d?['requests'] as List?) ?? []).cast<Map>().where((x) => ['Pending_FW', 'Pending_CW', 'Approved'].contains(x['status'])).firstOrNull;

  Future<void> load() async {
    try {
      final r = await api.get('/me/room-change');
      if (!mounted) return;
      setState(() => d = r as Map);
      final o = _open;
      if (o != null) {
        final det = await api.get('/room-changes/${o['change_id']}');
        if (mounted) setState(() => openStatement = (det as Map?)?['statement'] as Map?);
      }
    } catch (e) {
      if (mounted) toast(context, e.toString(), error: true);
    }
  }

  int? get _typeId {
    final stay = d?['stay'] as Map?;
    if (kind == 'Same_Type') return stay?['room_type_id'] as int?;
    return type;
  }

  void _loadType() {
    final t = _typeId;
    setState(() { beds = null; preview = null; previewError = null; });
    if (t == null) return;
    api.get('/me/room-change/beds?type=$t').then((b) { if (mounted && _typeId == t) setState(() => beds = (b as List).cast<Map>()); }, onError: (_) {});
    api.get('/me/room-change/preview?type=$t').then((p) { if (mounted && _typeId == t) setState(() => preview = p as Map); },
        onError: (e) { if (mounted && _typeId == t) setState(() => previewError = e.toString()); });
  }

  void _pick(String k) { setState(() { kind = k; type = null; bed = null; }); _loadType(); }

  Future<void> _send() async {
    setState(() => busy = true);
    try {
      final x = await api.post('/me/room-change', {'kind': kind, 'to_room_type_id': _typeId, 'to_subspace_id': bed, 'reason': _reason.text});
      if (mounted) toast(context, 'Request ${(x as Map)['change_no']} sent to your Floor Warden');
      setState(() { kind = null; type = null; bed = null; _reason.clear(); });
      await load();
    } catch (e) {
      if (mounted) toast(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _cancel(Map c) async {
    final ok = await showDialog<bool>(context: context, builder: (ctx) => AlertDialog(
          content: const Text('Cancel this room change request?'),
          actions: [TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')), TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('OK'))]));
    if (ok != true) return;
    setState(() => busy = true);
    try {
      await api.post('/me/room-change/${c['change_id']}/cancel');
      if (mounted) toast(context, 'Request cancelled');
      openStatement = null;
      await load();
    } catch (e) {
      if (mounted) toast(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (d == null) return const Padding(padding: EdgeInsets.fromLTRB(16, 20, 16, 0), child: Text('Loading…', style: TextStyle(fontSize: 13, color: _ink3)));
    final stay = d!['stay'] as Map?;
    final List<Widget> children;
    if (stay == null) {
      children = [_Panel(title: 'Change room', children: [const Text('You can ask for another room once you live in a hostel.', style: TextStyle(fontSize: 13, color: _ink3))])];
    } else {
      final open = _open;
      final past = ((d!['requests'] as List?) ?? []).cast<Map>().where((x) => x != open).toList();
      children = [
        _head(stay),
        if (open != null) ..._openRequest(open) else ..._newRequest(stay),
        if (past.isNotEmpty) _Panel(title: 'Earlier requests', children: [
          for (var i = 0; i < past.length; i++) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 8), child: _pastItem(past[i])),
        ]),
      ];
    }
    return RefreshIndicator(onRefresh: load, child: ListView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 16, 16, 162),
        children: [for (var i = 0; i < children.length; i++) ...[if (i > 0) const SizedBox(height: 18), children[i]]]));
  }

  /// mn-head: the arrows tile, "Change room", where the student lives now, and the year's fee chip.
  Widget _head(Map stay) => _Panel(children: [
        Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 12, runSpacing: 12, children: [
          Row(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 40, height: 40, decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), gradient: const LinearGradient(colors: [Color(0xFF12B886), K.brand], begin: Alignment.topLeft, end: Alignment.bottomRight)),
                child: const Icon(LucideIcons.arrowLeftRight, size: 20, color: Colors.white)),
            const SizedBox(width: 12),
            Flexible(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Change room', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              Text('Now in ${stay['bed_label']} · ${stay['type_name']} · ${stay['floor_name']}, ${stay['hostel_name']}', style: _small),
            ])),
          ]),
          if (stay['hostel_fee'] != null) Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5), decoration: BoxDecoration(color: const Color(0xFFF2FBF9), borderRadius: BorderRadius.circular(999)),
              child: Text('${_inr(stay['hostel_fee'])} a year', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFF0A5F6E)))),
        ]),
      ]);

  List<Widget> _openRequest(Map c) {
    final st = _rcStatus[c['status']]!;
    return [
      _Panel(children: [
        // rc-open-h stacks at phone width
        Text('${c['change_no']}', style: _small),
        Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, children: [
          Text('${c['from_bed']}', style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
          const Icon(LucideIcons.arrowRight, size: 15),
          Text('${c['to_bed'] ?? 'a ${c['to_type']} bed'}', style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w700)),
        ])),
        Text.rich(TextSpan(style: _small, children: [
          TextSpan(text: '${c['from_type']} '), const WidgetSpan(alignment: PlaceholderAlignment.middle, child: Icon(LucideIcons.arrowRight, size: 11, color: _ink3)),
          TextSpan(text: ' ${c['to_type']}${c['to_floor'] != null ? ' · ${c['to_floor']}' : ''}'),
        ])),
        const SizedBox(height: 12),
        Align(alignment: Alignment.centerLeft, child: _XdPill(st.$1, st.$2)),
        Container(margin: const EdgeInsets.symmetric(vertical: 12), padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: const BoxDecoration(color: Color(0xFFF8FAFC), border: Border(left: BorderSide(color: K.brand, width: 3)), borderRadius: BorderRadius.horizontal(right: Radius.circular(10))),
            child: Text('“${c['reason']}”', style: const TextStyle(color: _ink2, fontStyle: FontStyle.italic))),
        _Timeline(c),
        if (c['status'] == 'Approved') _Hint(LucideIcons.circleCheck, 'Approved. Your bed ${c['to_bed']} is kept for you. Your Floor Warden will read the room\'s meter, take your old key and give you the new one on the day you move.'),
        const SizedBox(height: 14),
        Align(alignment: Alignment.centerRight, child: KButton('Cancel request', kind: BtnKind.secondary, busy: busy, onPressed: () => _cancel(c))),
      ]),
      if (openStatement != null) _Panel(title: 'Fee and electricity', children: [_Statement(openStatement!)]),
    ];
  }

  List<Widget> _newRequest(Map stay) {
    final types = ((d!['types'] as List?) ?? []).cast<Map>();
    final others = types.where((t) => t['room_type_id'] != stay['room_type_id']).toList();
    final same = types.where((t) => t['room_type_id'] == stay['room_type_id']).firstOrNull;
    final typeId = _typeId;
    final step = kind == 'Room_Type' ? 1 : 0;
    // floors, then rooms, in the order the beds came
    final floors = <String, Map<String, List<Map>>>{};
    for (final b in beds ?? <Map>[]) { (floors.putIfAbsent('${b['floor_name']}', () => {})).putIfAbsent('${b['room_code']}', () => []).add(b); }
    final blocked = typeId == null ? 'Choose the room type.' : _reason.text.trim().length < 10 ? 'Say why in a sentence.' : null;
    return [
      _Panel(title: '1. What would you like?', children: [
        _Choice(on: kind == 'Room_Type', enabled: others.isNotEmpty, onTap: () => _pick('Room_Type'), children: [
          const Padding(padding: EdgeInsets.only(bottom: 4), child: Icon(LucideIcons.arrowLeftRight, size: 22, color: K.brand)),
          const Text('Another room type', style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700, color: K.ink)),
          Text(others.isNotEmpty ? others.map((t) => t['type_name']).join(', ') : 'No other room type in this hostel', style: _small),
        ]),
        const SizedBox(height: 12),
        _Choice(on: kind == 'Same_Type', onTap: () => _pick('Same_Type'), children: [
          const Padding(padding: EdgeInsets.only(bottom: 4), child: Icon(LucideIcons.bedDouble, size: 22, color: K.brand)),
          const Text('Another room, same type', style: TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700, color: K.ink)),
          Text('${stay['type_name']}${same != null ? ' · ${same['free_beds']} free beds' : ''}', style: _small),
        ]),
      ]),
      if (kind == 'Room_Type') _Panel(title: '2. Room type', children: [
        for (var i = 0; i < others.length; i++) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 12), child: _typeCard(others[i], stay)),
      ]),
      if (typeId != null) _Panel(title: '${2 + step}. Choose a bed ', titleExtra: 'or leave it to the Chief Warden', children: [
        if (beds == null) const Text('Loading free beds…', style: TextStyle(fontSize: 13, color: _ink3)),
        if (beds != null && beds!.isEmpty) const Text('No free bed of this type now. You can still ask; the Chief Warden will give one when it is free.', style: TextStyle(fontSize: 13, color: _ink3)),
        if (floors.isNotEmpty) ConstrainedBox(constraints: const BoxConstraints(maxHeight: 420), child: SingleChildScrollView(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (final (i, f) in floors.entries.indexed) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 14), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Padding(padding: const EdgeInsets.only(bottom: 6), child: Text(f.key.toUpperCase(), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: .78, color: _ink3))),
            for (final (j, r) in f.value.entries.indexed) Padding(padding: EdgeInsets.only(top: j == 0 ? 0 : 8), child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(color: const Color(0xFFFBFCFD), borderRadius: BorderRadius.circular(12), border: Border.all(color: _line)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Room ${r.key}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                Text('${r.value.first['occupied']} of ${r.value.first['sharing_count']} taken', style: _small),
                const SizedBox(height: 8),
                Wrap(spacing: 6, runSpacing: 6, children: [for (final b in r.value) _BedChip('Bed ${b['bed_code']}', bed == b['subspace_id'],
                    () => setState(() => bed = bed == b['subspace_id'] ? null : '${b['subspace_id']}'))]),
              ]),
            )),
          ])),
        ]))),
        if (bed != null) _Hint(LucideIcons.bedDouble, 'You asked for ${beds?.where((b) => b['subspace_id'] == bed).firstOrNull?['bed_label']}. The Chief Warden may give another bed of the same type.'),
      ]),
      if (typeId != null) _Panel(title: '${3 + step}. Why?', children: [
        TextField(
          controller: _reason, minLines: 3, maxLines: null, maxLength: 600, onChanged: (_) => setState(() {}),
          style: const TextStyle(fontSize: 15),
          decoration: InputDecoration(
            counterText: '', contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            hintText: 'For example: my roommates study late and I cannot sleep; I would like a 2-sharing room to prepare for exams.', hintMaxLines: 4,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFD0D5DD))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFD0D5DD))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: K.brand, width: 2)),
          ),
        ),
        if (preview != null) ...[
          const Padding(padding: EdgeInsets.only(top: 18, bottom: 10), child: Text('What it means for your fees', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: K.ink))),
          _Statement(preview!),
        ],
        if (previewError != null) Text(previewError!, style: const TextStyle(fontSize: 13, color: _ink3)),
        const SizedBox(height: 14),
        Align(alignment: Alignment.centerRight, child: _Blocked(reason: blocked,
            child: KButton('Send to my Floor Warden', busy: busy, onPressed: blocked == null ? _send : null))),
        const SizedBox(height: 8),
        const Text('The Floor Warden of your floor approves first, then the Chief Warden. You can cancel until you move.', style: TextStyle(fontSize: 12.5, color: _ink3)),
      ]),
    ];
  }

  Widget _typeCard(Map t, Map stay) {
    final diff = _n(t['hostel_fee']) - _n(stay['hostel_fee'] ?? t['hostel_fee']);
    final meta = TextStyle(fontSize: 13, color: _ink2);
    return _Choice(on: type == t['room_type_id'], enabled: _n(t['free_beds']) > 0, onTap: () { setState(() { type = t['room_type_id']; bed = null; }); _loadType(); }, children: [
      Text('${t['type_name']}', style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700, color: K.ink)),
      Wrap(spacing: 12, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
        Row(mainAxisSize: MainAxisSize.min, children: [const Icon(LucideIcons.users, size: 14, color: K.brand), const SizedBox(width: 5), Text('${t['sharing_count']} in a room', style: meta)]),
        if (t['is_ac'] == true) Row(mainAxisSize: MainAxisSize.min, children: [const Icon(LucideIcons.snowflake, size: 14, color: K.brand), const SizedBox(width: 5), Text('AC', style: meta)]),
        if (t['attached_bath'] == true) Text('Attached bath', style: meta),
      ]),
      Padding(padding: const EdgeInsets.only(top: 4), child: Text.rich(TextSpan(children: [
        TextSpan(text: _inr(t['hostel_fee']), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: K.ink, fontFeatures: [FontFeature.tabularFigures()])),
        const TextSpan(text: ' a year', style: TextStyle(fontSize: 13, color: _ink3)),
      ]))),
      Text('${diff > 0 ? '${_inr(diff)} more a year' : diff < 0 ? '${_inr(-diff)} less a year' : 'Same fee'} · ${t['free_beds']} free beds',
          style: _small.copyWith(color: diff > 0 ? _up : diff < 0 ? _down : _ink3)),
    ]);
  }

  /// One earlier request (details/summary): closed shows the summary line and its status; open adds the path and the final statement.
  Widget _pastItem(Map c) {
    final st = _rcStatus[c['status']];
    final open = expanded.contains(c['change_id']);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: _line)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        InkWell(onTap: () => setState(() => open ? expanded.remove(c['change_id']) : expanded.add(c['change_id'])), child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text.rich(TextSpan(children: [
              TextSpan(text: '${c['change_no']}', style: const TextStyle(fontWeight: FontWeight.w700)),
              TextSpan(text: ' · ${c['from_bed']} '),
              const WidgetSpan(alignment: PlaceholderAlignment.middle, child: Icon(LucideIcons.arrowRight, size: 12)),
              TextSpan(text: ' ${c['to_bed'] ?? c['to_type']}'),
            ])),
            Text('${_day(c['requested_at'])} · ${c['reason']}', style: _small),
          ])),
          const SizedBox(width: 10),
          _XdPill(st?.$1 ?? '${c['status']}', st?.$2 ?? 'muted'),
        ])),
        if (open) ...[
          const SizedBox(height: 12),
          _Timeline(c),
          if (c['statement'] != null) ...[const SizedBox(height: 12), _Statement(c['statement'] as Map, settled: true)],
        ],
      ]),
    );
  }
}

/// st-panel: white, 18 px corners, a 15.5 px bold heading (with an optional lighter part, rc-opt).
class _Panel extends StatelessWidget {
  final String? title;
  final String? titleExtra;
  final List<Widget> children;
  const _Panel({this.title, this.titleExtra, required this.children});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: K.line), boxShadow: K.cardShadow),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (title != null) Padding(padding: const EdgeInsets.only(bottom: 10), child: Text.rich(TextSpan(children: [
            TextSpan(text: title, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800)),
            if (titleExtra != null) TextSpan(text: titleExtra, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: _ink3)),
          ]))),
          ...children,
        ]),
      );
}

/// rc-kinds / rc-types button: a card with a 1.5 px border; pressed is teal with a soft ring; disabled is faded.
class _Choice extends StatelessWidget {
  final bool on;
  final bool enabled;
  final VoidCallback onTap;
  final List<Widget> children;
  const _Choice({required this.on, this.enabled = true, required this.onTap, required this.children});
  @override
  Widget build(BuildContext context) => Semantics(button: true, selected: on, enabled: enabled, child: Opacity(opacity: enabled ? 1 : .5, child: Container(
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), boxShadow: on ? const [BoxShadow(color: Color(0x260B7A71), spreadRadius: 3)] : null),
        child: Material(color: on ? _tint : Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: on ? K.brand : _line, width: 1.5)),
            child: InkWell(onTap: enabled ? onTap : null, borderRadius: BorderRadius.circular(16), child: Padding(padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [for (var i = 0; i < children.length; i++) ...[if (i > 0) const SizedBox(height: 4), children[i]]])))),
      )));
}

/// rc-beds button: "Bed C" pill; pressed is solid teal.
class _BedChip extends StatelessWidget {
  final String label;
  final bool on;
  final VoidCallback onTap;
  const _BedChip(this.label, this.on, this.onTap);
  @override
  Widget build(BuildContext context) => Semantics(button: true, selected: on, child: Material(color: on ? K.brand : Colors.white, shape: StadiumBorder(side: BorderSide(color: on ? K.brand : const Color(0xFFD0D5DD))),
      child: InkWell(onTap: onTap, customBorder: const StadiumBorder(), child: Padding(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          child: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: on ? Colors.white : K.ink))))));
}

/// xd-pill: the status word on a soft tone.
class _XdPill extends StatelessWidget {
  final String label, tone;
  const _XdPill(this.label, this.tone);
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: tone == 'good' ? const Color(0xFFE7F6E7) : tone == 'bad' ? const Color(0xFFFCE9E9) : const Color(0xFFFFF5DC), borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: K.ink)));
}

/// rc-hint: teal-tinted line with an icon.
class _Hint extends StatelessWidget {
  final IconData icon;
  final String text;
  const _Hint(this.icon, this.text);
  @override
  Widget build(BuildContext context) => Container(margin: const EdgeInsets.only(top: 12), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(color: _tint, borderRadius: BorderRadius.circular(12)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(padding: const EdgeInsets.only(top: 2), child: Icon(icon, size: 16, color: K.brand)), const SizedBox(width: 8),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 14, color: K.ink))),
      ]));
}

/// "Explain every no": the disabled button and its reason under it (klh-btn-reason).
class _Blocked extends StatelessWidget {
  final String? reason;
  final Widget child;
  const _Blocked({required this.reason, required this.child});
  @override
  Widget build(BuildContext context) => reason == null ? child : ConstrainedBox(constraints: const BoxConstraints(maxWidth: 340), child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        child,
        const SizedBox(height: 6),
        Row(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          const Padding(padding: EdgeInsets.only(top: 1), child: Icon(LucideIcons.lock, size: 14, color: K.ink2)), const SizedBox(width: 4),
          Flexible(child: Text(reason!, style: const TextStyle(fontSize: 12, height: 16 / 12, color: K.ink2))),
        ]),
      ]));
}

/// RcTimeline: asked, the Floor and Chief Warden steps, moved; a grid of 150 px boxes.
class _Timeline extends StatelessWidget {
  final Map c;
  const _Timeline(this.c);
  @override
  Widget build(BuildContext context) {
    final moved = c['status'] == 'Moved';
    final steps = ((c['steps'] as List?) ?? []).cast<Map>();
    final items = <(String, bool, bool, String)>[ // label, done, bad, sub
      (c['arranged'] == true ? 'Arranged by the Chief Warden' : 'Asked', true, false, _day(c['requested_at'])),
      for (final s in steps) (s['approver_role'] == 'Floor_Warden' ? 'Floor Warden' : 'Chief Warden', s['decision'] == 'Approved', s['decision'] == 'Rejected',
          s['decision'] == 'Pending' ? 'Waiting' : s['decision'] == 'Skipped' ? 'Not needed'
              : '${s['decision'] == 'Rejected' ? 'Not approved' : 'Approved'}${s['acted_by_name'] != null ? ' · ${s['acted_by_name']}' : ''} · ${_day(s['decided_on'])}${s['remarks'] != null ? ' · “${s['remarks']}”' : ''}'),
      ('Moved and settled', moved, false, moved ? '${_day(c['move_date'])}${c['moved_by_name'] != null ? ' · ${c['moved_by_name']}' : ''}' : c['status'] == 'Approved' ? 'On the day of the move' : ''),
    ];
    final now = items.indexWhere((x) => !x.$2 && !x.$3);
    Widget box(int i) {
      final (label, done, bad, sub) = items[i];
      final icon = bad ? LucideIcons.circleX : done ? LucideIcons.circleCheck : i == now ? LucideIcons.clock : LucideIcons.circle;
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), color: bad ? const Color(0xFFFEF3F2) : done ? _downBg : null,
            border: Border.all(color: bad ? const Color(0xFFFECDCA) : done ? const Color(0xFFABEFC6) : _line)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(padding: const EdgeInsets.only(top: 1), child: Icon(icon, size: 18, color: bad ? const Color(0xFFB42318) : done ? _down : _ink3)),
          const SizedBox(width: 8),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: K.ink)),
            if (sub.isNotEmpty) Text(sub, style: _small),
          ])),
        ]),
      );
    }
    return Padding(padding: const EdgeInsets.only(top: 8), child: LayoutBuilder(builder: (context, bc) {
      final cols = ((bc.maxWidth + 10) / 160).floor().clamp(1, items.length);
      return Column(children: [
        for (var i = 0; i < items.length; i += cols) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 10), child: IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (var j = 0; j < cols; j++) ...[if (j > 0) const SizedBox(width: 10), Expanded(child: i + j < items.length ? box(i + j) : const SizedBox())],
        ]))),
      ]);
    }));
  }
}

/// RoomChangeStatement: the hostel fee at both rates, the electricity share up to the move, and what is left to pay.
class _Statement extends StatelessWidget {
  final Map s;
  final bool settled;
  const _Statement(this.s, {this.settled = false});
  @override
  Widget build(BuildContext context) {
    final h = (s['hostel'] as Map?) ?? {}, e = (s['electricity'] as Map?) ?? {};
    final adj = _n(h['adjustment']);
    final duesList = ((e['dues_list'] as List?) ?? []).cast<Map>();
    final adjColor = adj > 0 ? _up : adj < 0 ? _down : K.ink;
    Widget box(IconData icon, String title, List<Widget> body) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: _line)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Padding(padding: const EdgeInsets.only(bottom: 6), child: Row(children: [Icon(icon, size: 17, color: K.brand), const SizedBox(width: 8),
              Expanded(child: Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: K.ink)))])),
            ...body,
          ]),
        );
    Widget table(List<Widget> rows) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (var i = 0; i < rows.length; i++) Container(decoration: BoxDecoration(border: i == rows.length - 1 ? null : const Border(bottom: BorderSide(color: _line))), child: rows[i]),
        ]);
    Widget row(String left, String right, {Widget? sub, String? subText, FontWeight? weight}) => Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(left, style: TextStyle(fontSize: 14, color: K.ink, fontWeight: weight)),
            if (sub != null) sub else if (subText != null) Text(subText, style: _small),
          ])),
          const SizedBox(width: 12),
          Text(right, style: TextStyle(fontSize: 14, color: K.ink, fontWeight: weight ?? FontWeight.w600, fontFeatures: const [FontFeature.tabularFigures()])),
        ]));
    const smallNote = TextStyle(fontSize: 12.5, color: _ink3);
    final adjRow = Container(
      margin: const EdgeInsets.only(top: 0),
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
      decoration: BoxDecoration(color: adj > 0 ? _upBg : adj < 0 ? _downBg : null, borderRadius: BorderRadius.circular(8)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(adj > 0 ? 'Difference to pay (added to your fees)' : adj < 0 ? 'Difference in your favour' : 'No difference: same room type',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: adjColor)),
          if (adj < 0) Text('${_n(h['credit_to_instalments']) > 0 ? '${_inr(h['credit_to_instalments'])} off your unpaid instalments' : 'Nothing unpaid to reduce'}${_n(h['refund_due']) > 0 ? ' · ${_inr(h['refund_due'])} refund due from Accounts' : ''}', style: _small),
        ])),
        const SizedBox(width: 12),
        Text('${adj > 0 ? '+' : adj < 0 ? '−' : ''}${_inr(adj.abs())}', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: adjColor, fontFeatures: const [FontFeature.tabularFigures()])),
      ]),
    );
    final white85 = TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: .85));
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Padding(padding: EdgeInsets.only(top: 2), child: Icon(LucideIcons.info, size: 15, color: K.brand)), const SizedBox(width: 8),
        Expanded(child: Text(settled ? 'Settled on ${_day(s['move_date'])}, the day of the move.'
            : 'Worked out as if the move were today (${_day(s['move_date'])}). The final figures use the day of the move and the meter reading taken then.', style: const TextStyle(fontSize: 13, color: _ink2))),
      ]),
      const SizedBox(height: 12),
      box(LucideIcons.bedDouble, 'Hostel fee ${s['academic_year']}', [
        table([
          row('${h['old_type']}', _inr(h['old_part']), subText: '${_inr(h['old_fee'])} a year · ${s['days_old']} days in the old room'),
          row('${h['new_type']}', _inr(h['new_part']), subText: '${_inr(h['new_fee'])} a year · ${s['days_new']} days in the new room'),
          row('Hostel fee for the year after the change', _inr(h['year_total']), weight: FontWeight.w700),
          row('Billed before the change', _inr(h['billed']), subText: 'Paid ${_inr(h['paid'])}${_n(h['unpaid']) > 0 ? ' · unpaid ${_inr(h['unpaid'])}' : ''}'),
          adjRow,
        ]),
        const SizedBox(height: 8),
        const Text('What you have paid stays with you and moves to the new room; only the difference for the rest of the year is added or credited.', style: smallNote),
      ]),
      const SizedBox(height: 12),
      box(LucideIcons.zap, 'Electricity', [
        if (e['meter_no'] != null) table([
          row('Old room meter ${e['meter_no']}', '${_num(e['units'])} units', sub: Text.rich(TextSpan(style: _small, children: [
            TextSpan(text: '${_num(e['opening'])} kWh on ${_day(e['opening_at'])} '),
            const WidgetSpan(alignment: PlaceholderAlignment.middle, child: Icon(LucideIcons.arrowRight, size: 11, color: _ink3)),
            TextSpan(text: ' ${_num(e['reading'])} kWh on ${_day(e['reading_at'])} · ${e['reading_source']}'),
          ]))),
          row('Units to pay for this month so far', '${_num(e['billable'])} units · ${_inr(e['room_amount'])}',
              subText: '${_num(e['included'])} included in the fee${_n(e['recharged']) > 0 ? ' · ${_num(e['recharged'])} recharged' : ''} · at ${_inr(e['rate'])} a unit'),
          row('Your share up to the move', _inr(e['my_share']), weight: FontWeight.w700, subText: '${e['my_days']} of ${e['all_days']} student-days in the room this month'),
          row('Earlier bills not yet paid', _inr(e['dues']),
              subText: '${duesList.isNotEmpty ? duesList.map((x) => '${_inr(x['amount'])} due ${_day(x['due_date'])}').join(' · ') : 'None'} · they stay with you'),
        ])
        else Text('The old room has no meter: nothing to settle now. Earlier bills not yet paid: ${_inr(e['dues'])}.', style: smallNote),
        const SizedBox(height: 8),
        const Text("From the move, the new room's bill is shared with your new roommates; the old room's bill for this month counts your share above as paid.", style: smallNote),
      ]),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), gradient: const LinearGradient(colors: [K.brand, Color(0xFF0A4F5C)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
        child: Wrap(spacing: 28, runSpacing: 12, crossAxisAlignment: WrapCrossAlignment.center, children: [
          const Icon(LucideIcons.receipt, size: 20, color: Colors.white),
          Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(_inr(s['total_to_pay']), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white, fontFeatures: [FontFeature.tabularFigures()])),
            Text('to pay after the move${_n(s['other_dues']) > 0 ? ' (includes ${_inr(s['other_dues'])} of other dues)' : ''}', style: white85),
          ]),
          if (_n(s['refund_due']) > 0) Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
            Text(_inr(s['refund_due']), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white, fontFeatures: [FontFeature.tabularFigures()])),
            Text('refund due to you', style: white85),
          ]),
        ]),
      ),
    ]);
  }
}
