import 'dart:async';
import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import 'pay_all_sheet.dart';
import '../shell.dart';

/// REG-01 Hostel registration, as pages/student/Registration.tsx (styles/allot.css): the head with the status, the six steps,
/// then apply (hostel, room type, rules) or the journey (notices, choose a bed, the offer, the fee plan, my bed) beside the dues.
class RoomScreen extends StatefulWidget {
  const RoomScreen({super.key});
  @override
  State<RoomScreen> createState() => _RoomScreenState();
}

const _muted = K.ink2; // --ink-muted
const _uiLine = Color(0xCCE3E7F0); // --ui-line
const _surface2 = Color(0xFFEEF1F7);
const _openSt = ['Pending', 'Part_Paid', 'Overdue'];
const _steps = ['Apply', 'Registration fee', 'Choose room', 'Hostel fees', 'Warden check', 'Check in'];
num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
String _inr(dynamic v) => inr(_n(v).round());
int _stepOf(Map? r) {
  if (r == null) return 0;
  final s = r['status'];
  if (s == 'Applied') return 1;
  if (['Fee_Paid', 'Waitlisted', 'Allotted'].contains(s)) return 2;
  if (s == 'Accepted') return 3;
  if (s == 'Confirmed') return r['fee_check_status'] == 'Verified' ? 5 : 4;
  return s == 'Checked_In' ? 6 : 0;
}
String _roomLabel(String? spaceId) => (spaceId ?? '').replaceFirst(RegExp(r'^H-'), '');
String _roomOf(dynamic id) => '${id ?? ''}'.replaceFirst(RegExp(r'-B\d+$'), '');
/// BH1-301-B2 -> 2
String _bedOf(dynamic id) => RegExp(r'-B(\d+)$').firstMatch('${id ?? ''}')?.group(1) ?? '';
/// BH1-301-B2 -> BH1-301-B
String _bedLabel(dynamic id) => '${id ?? ''}'.replaceAllMapped(RegExp(r'-B(\d+)$'), (m) => '-${String.fromCharCode(64 + int.parse(m.group(1)!))}');
String _bedLetter(String? code) {
  if (code == null || code.isEmpty) return '?';
  if (RegExp(r'^[A-H]$').hasMatch(code)) return code;
  final n = int.tryParse(code.replaceAll(RegExp(r'\D'), '')) ?? 0;
  return n >= 1 && n <= 8 ? 'ABCDEFGH'[n - 1] : code;
}
num _joining(Map t) => _n(t['registration_fee']) + _n(t['caution_deposit']) + _n(t['elec_caution_deposit']) + _n(t['hostel_fee']) + _n(t['meter_charge']) + _n(t['mess_fee']);

class _RoomScreenState extends State<RoomScreen> {
  List<Map>? regs;
  Map? dues;
  List<Map>? catalogue;
  List<Map>? rooms; // choices
  bool busy = false;
  // apply
  Map? hostel, type;
  bool ok = false;
  // choose room
  String floor = '';
  (String id, String room, String no)? bed;
  // fee plan
  String plan = 'Two_Instalments', region = 'South', diet = 'Veg'; // food style and diet, chosen separately

  List<Map> proofs = []; // receipts sent from Pay all
  Timer? _poll;
  String _stage = '';
  // what the student is told when the page moves on by itself
  static const _said = {
    'Applied/Uploaded': 'Receipt sent. The Floor Warden is checking it.', 'Applied/Checked': 'Checked by the Floor Warden. Now with the Chief Warden.',
    'Fee_Paid/': 'Registration fee approved by the Chief Warden. Choose your room.', 'Waitlisted/': 'Registration fee approved. You are on the waiting list.',
    'Confirmed/Verified': 'Fees verified and approved. Collect your key at the hostel office.', 'Checked_In/': 'Checked in. Your room is on the Home page.',
  };

  @override
  void initState() {
    super.initState();
    load();
    // the wardens and the office act on their side; the page follows without a pull to refresh
    _poll = Timer.periodic(const Duration(seconds: 4), (_) { if (reg != null && reg!['status'] != 'Checked_In' && !busy) load(quiet: true); });
  }

  @override
  void dispose() { _poll?.cancel(); super.dispose(); }

  Map? get reg => regs?.where((r) => !['Cancelled', 'Vacated'].contains(r['status'])).firstOrNull;
  Map? get proof => proofs.where((p) => p['status'] != 'Rejected').firstOrNull;

  Future<void> load({bool quiet = false}) async {
    try {
      final r = await api.get('/registrations/mine');
      final p = await api.get('/me/payment-proofs');
      if (!mounted) return;
      setState(() { regs = (r as List).cast<Map>(); proofs = (p as List).cast<Map>(); });
    } catch (e) {
      if (mounted && !quiet) toast(context, e.toString(), error: true);
      return;
    }
    final g = reg;
    final st = g?['status'];
    final sub = st == 'Applied' ? (proof?['status'] ?? '') : st == 'Confirmed' ? (g?['fee_check_status'] ?? '') : '';
    final stage = g == null ? '' : '$st/$sub';
    if (_stage.isNotEmpty && stage != _stage && _said[stage] != null && mounted) toast(context, _said[stage]!);
    _stage = stage;
    if (g == null) {
      api.get('/allotment/catalogue').then((c) { if (mounted) setState(() => catalogue = (c as List).cast<Map>()); }, onError: (_) {});
      return;
    }
    api.get('/students/$me/demands').then((d) { if (mounted) setState(() => dues = d as Map); }, onError: (_) {});
    if (['Fee_Paid', 'Waitlisted'].contains(g['status'])) {
      api.get('/registrations/${g['registration_id']}/choices').then((c) { if (mounted) setState(() => rooms = ((c as Map)['rooms'] as List).cast<Map>()); }, onError: (_) {});
    }
  }

  /// useAction: runs, then the success toast or the API's own words.
  Future<void> _run(Future<dynamic> Function() fn, String done) async {
    setState(() => busy = true);
    try {
      await fn();
      if (mounted) toast(context, done);
    } catch (e) {
      if (mounted) toast(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final g = reg;
    final at = _stepOf(g);
    final children = <Widget>[
      Wrap(alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, spacing: 12, runSpacing: 10, children: [
        Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text(g != null ? '${g['hostel_name'] ?? g['hostel_code']}, ${g['type_name']}' : 'Apply for a hostel room', style: const TextStyle(fontSize: 22, height: 28 / 22, fontWeight: FontWeight.w600, letterSpacing: -.22)),
          Text(g != null ? 'Registration ${g['registration_no']} · applied ${day(g['applied_on'])}' : 'Hostels for you, with the fee and the beds still open in each room type.',
              style: const TextStyle(fontSize: 12.5, color: _muted)),
        ]),
        if (g != null) Pill.status(g['status']),
      ]),
      SingleChildScrollView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(vertical: 2), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        for (var i = 0; i < _steps.length; i++) SizedBox(width: 104, child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(height: 4, margin: const EdgeInsets.only(right: 4), decoration: BoxDecoration(borderRadius: BorderRadius.circular(999),
              color: i < at ? K.brand : i == at ? null : _surface2,
              gradient: i == at ? const LinearGradient(colors: [K.brand, K.brand, _surface2, _surface2], stops: [0, .5, .5, 1]) : null)),
          const SizedBox(height: 6),
          Text(_steps[i], style: TextStyle(fontSize: 12, color: i == at ? K.ink : _muted, fontWeight: i == at ? FontWeight.w600 : null)),
        ])),
      ])),
      if (regs != null && g == null) () { final a = _apply(); return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [for (var i = 0; i < a.length; i++) ...[if (i > 0) const SizedBox(height: 16), a[i]]]); }(),
      if (g != null) ...[
        ..._journey(g),
        _duesPanel(),
      ],
    ];
    return RefreshIndicator(onRefresh: load, child: ListView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 16, 16, 90),
        children: [for (var i = 0; i < children.length; i++) ...[if (i > 0) const SizedBox(height: 14), children[i]]]));
  }

  /* ---------- apply ---------- */
  List<Widget> _apply() {
    final h = hostel, t = type;
    return [
      _Box(title: '1. Hostel', children: [
        for (final (i, x) in (catalogue ?? []).indexed) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 8), child: _Opt(on: h?['facility_id'] == x['facility_id'],
            onTap: () => setState(() { hostel = x; type = null; }), children: [
          _optRow(Text('${x['facility_name']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: _muted)), _tag('${x['hostel_code']}')),
          _optRow(Text('${(x['types'] as List).length} room type${(x['types'] as List).length == 1 ? '' : 's'}', style: const TextStyle(fontSize: 12.5, color: _muted)),
              _tag(_n(x['open_beds']) > 0 ? '${x['open_beds']} beds open' : 'Waiting list only', tone: _n(x['open_beds']) > 0 ? 'ok' : 'warn')),
        ])),
        if (catalogue != null && catalogue!.isEmpty) const Text('No hostel has fees set for this year yet.', style: TextStyle(color: _muted)),
      ]),
      if (h != null) _Box(title: '2. Room type in ${h['hostel_code']}', children: [
        for (final (i, x) in (h['types'] as List).cast<Map>().indexed) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 8), child: _Opt(on: t?['room_type_id'] == x['room_type_id'],
            onTap: () => setState(() => type = x), children: [
          _optRow(Text('${x['type_name']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: _muted)),
              _tag(_n(x['open_beds']) > 0 ? '${x['open_beds']} open' : 'Full', tone: _n(x['open_beds']) > 0 ? 'ok' : 'warn')),
          Text.rich(TextSpan(children: [
            TextSpan(text: _inr(x['hostel_fee']), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: K.ink, fontFeatures: [FontFeature.tabularFigures()])),
            const TextSpan(text: ' a year', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, color: _muted)),
          ])),
          Text('${x['sharing_count']} per room${x['is_ac'] == true ? ' · AC' : ''}${x['attached_bath'] == true ? ' · attached bath' : ''}', style: const TextStyle(fontSize: 12.5, color: _muted)),
          Text.rich(TextSpan(style: const TextStyle(fontSize: 12.5, height: 1.45, color: _muted), children: [
            TextSpan(text: 'On joining ${_inr(_joining(x))}\n', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: K.ink)),
            TextSpan(text: 'registration ${_inr(x['registration_fee'])} · caution deposit ${_inr(x['caution_deposit'])} · electricity deposit ${_inr(x['elec_caution_deposit'])} · hostel ${_inr(x['hostel_fee'])}${x['mess_fee'] != null ? ' · mess ${_inr(x['mess_fee'])}' : ''} · meter ${_inr(x['meter_charge'])}'),
          ])),
        ])),
      ]),
      if (h != null && t != null) _Box(children: [
        if (_n(t['open_beds']) == 0) ...[const _Notice(tone: 'warning', title: 'No bed open in this room type', body: 'You can still apply; you join the waiting list in order of application.'), const SizedBox(height: 12)],
        InkWell(onTap: () => setState(() => ok = !ok), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(padding: const EdgeInsets.only(top: 2), child: SizedBox(width: 16, height: 16, child: Checkbox(value: ok, onChanged: (v) => setState(() => ok = v ?? false),
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap, visualDensity: VisualDensity.compact, activeColor: const Color(0xFF0075FF)))),
          const SizedBox(width: 10),
          Expanded(child: Text('I accept the hostel rules, including that the registration fee of ${_inr(t['registration_fee'])} is not refundable. The caution deposit (${_inr(t['caution_deposit'])}) and electricity caution deposit (${_inr(t['elec_caution_deposit'])}) are returned when I leave, less approved deductions. On renewal only the hostel fee, mess fee and meter charge are paid.',
              style: const TextStyle(fontSize: 14))),
        ])),
        const SizedBox(height: 12),
        Align(alignment: Alignment.centerLeft, child: _Blocked(reason: ok ? null : 'Accept the hostel rules to apply.', child: _AccentButton('Apply for ${t['type_name']}', iconRight: LucideIcons.arrowRight, large: true, busy: busy,
            onPressed: ok ? () => _run(() => api.post('/registrations', {'facility_id': h['facility_id'], 'room_type_id': t['room_type_id'], 'rules_accepted': true}).then((_) => load()), 'Applied. Pay the registration fee next.') : null))),
      ]),
    ];
  }

  Widget _optRow(Widget a, Widget b) => Row(children: [Expanded(child: a), const SizedBox(width: 6), b]);

  /// .tag inside .opt: the web's ".opt span" rule wins, so tags read 12.5 px in the muted ink on their tint.
  Widget _tag(String text, {String? tone}) => Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: tone == 'ok' ? K.goodBg : tone == 'warn' ? K.warnBg : _surface2, borderRadius: BorderRadius.circular(999)),
      child: Text(text, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500, color: _muted)));

  /* ---------- the journey ---------- */
  List<Widget> _journey(Map g) {
    final st = g['status'];
    final items = <Widget>[
      if (st == 'Applied' && proof != null) _Notice(tone: 'progress', title: proof!['status'] == 'Checked' ? 'Receipt checked by the Floor Warden · with the Chief Warden' : 'Receipt sent · with the Floor Warden',
          body: 'Receipt ${proof!['proof_no']} for ${_inr(proof!['amount'])}${proof!['ocr_status'] == 'Matched' ? ' matches what you typed' : proof!['ocr_status'] == 'Mismatch' ? ' is being checked by eye' : ''}. This page moves on by itself when it is approved.')
      else if (st == 'Applied') _Notice(tone: 'info', title: 'Pay the registration fee', body: '${_inr(g['registration_fee'] ?? 0)}, not refundable. The rooms open for you to choose as soon as it is paid. Pay it from the dues on the right.'),
      if (['Fee_Paid', 'Waitlisted'].contains(st)) _chooseRoom(g),
      if (st == 'Allotted') _offer(g),
      if (st == 'Accepted' && g['fee_plan_id'] == null) _feePlan(g),
      if (st == 'Accepted' && g['fee_plan_id'] != null) _Notice(tone: 'info', title: 'Pay the hostel and mess fees',
          body: 'Room ${_roomLabel(_roomOf(g['subspace_id']))}, bed ${_bedOf(g['subspace_id'])} is kept for you. Pay the demands on the right; a Warden then checks them.'),
      if (st == 'Confirmed' && g['fee_check_status'] == 'Pending') const _Notice(tone: 'progress', title: 'Fees paid; the Warden is checking them', body: 'This page changes as soon as the fees are verified. Then collect your key at the hostel office.'),
      if (st == 'Confirmed' && g['fee_check_status'] == 'Query') _Notice(tone: 'critical', title: 'The Warden has a query on your fees', body: '${g['fee_check_remarks']} Visit the hostel accounts desk with your receipts.'),
      if (st == 'Confirmed' && g['fee_check_status'] == 'Verified') _Notice(tone: 'success', title: 'All set. Collect your key', body: 'Visit the hostel office with your ID card. Your bed: ${_bedLabel(g['subspace_id'])}.'),
      if (g['subspace_id'] != null || st == 'Checked_In') _myBed(g),
    ];
    // sj: the steps column (gap 12), then the dues beside it (gap 14)
    return [if (items.isNotEmpty) Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [for (var i = 0; i < items.length; i++) ...[if (i > 0) const SizedBox(height: 12), items[i]]])];
  }

  Widget _chooseRoom(Map g) {
    final list = rooms ?? [];
    final floorNo = <String, num>{};
    for (final r in list) { floorNo['${r['floor_name']}'] = _n(r['floor_no']); }
    final floors = floorNo.keys.toList()..sort((a, b) => floorNo[a]!.compareTo(floorNo[b]!));
    final f = floor.isNotEmpty ? floor : floors.firstOrNull;
    final shown = list.where((r) => r['floor_name'] == f).toList();
    final b = bed;
    return _Box(
      head: Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, runSpacing: 6, alignment: WrapAlignment.spaceBetween, children: [
        const Text('Choose your room', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
        Row(mainAxisSize: MainAxisSize.min, children: [
          const _Bd(open: true), const SizedBox(width: 5), const Text('Open', style: TextStyle(fontSize: 12, color: _muted)), const SizedBox(width: 12),
          const _Bd(open: false), const SizedBox(width: 5), const Text('Taken', style: TextStyle(fontSize: 12, color: _muted)),
        ]),
      ]),
      flush: true,
      children: [
        if (g['waitlist_no'] != null) Padding(padding: const EdgeInsets.fromLTRB(14, 12, 14, 0), child: _Notice(tone: 'progress', title: 'Waiting list number ${g['waitlist_no']}', body: 'You can still pick any bed that opens below.')),
        if (rooms != null && rooms!.isEmpty) Padding(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 28),
            child: Text('No bed of ${g['type_name']} is open right now. You stay on the waiting list; the office offers a bed when one opens.', textAlign: TextAlign.center, style: const TextStyle(fontSize: 13, color: _muted))),
        if (floors.isNotEmpty) Container(decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _uiLine))),
            child: SingleChildScrollView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 10), child: Row(children: [
              for (final x in floors) Padding(padding: const EdgeInsets.only(right: 4), child: InkWell(onTap: () => setState(() => floor = x), child: Container(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 9),
                decoration: BoxDecoration(border: Border(bottom: BorderSide(color: x == f ? K.brand : Colors.transparent, width: 2))),
                child: Text(x, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: x == f ? K.brandInk : _muted)),
              ))),
            ]))),
        Padding(padding: const EdgeInsets.all(10), child: LayoutBuilder(builder: (context, c) {
          final cols = ((c.maxWidth + 8) / 158).floor().clamp(1, 8);
          final w = (c.maxWidth - (cols - 1) * 8) / cols;
          return Wrap(spacing: 8, runSpacing: 8, children: [
            for (final r in shown) SizedBox(width: w, child: Container(
              constraints: const BoxConstraints(minHeight: 84),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: b?.$2 == r['room_code'] ? K.brand : _uiLine),
                  boxShadow: b?.$2 == r['room_code'] ? const [BoxShadow(color: K.progressBg, spreadRadius: 3)] : null),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
                  Expanded(child: Text('${r['room_code']}', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, letterSpacing: -.17))),
                  Text(_n(r['mates']) > 0 ? '${r['mates']} already in' : 'Empty room', style: const TextStyle(fontSize: 11, color: _muted)),
                ]),
                const SizedBox(height: 6),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  for (final x in ((r['beds'] as List?) ?? []).cast<Map>()) _BedButton(
                    letter: _bedLetter('${x['bed_code']}'), open: x['bed_status'] == 'Vacant', on: b?.$1 == x['subspace_id'],
                    onTap: () => setState(() => bed = ('${x['subspace_id']}', '${r['room_code']}', _bedLetter('${x['bed_code']}'))),
                  ),
                ]),
                if (r['is_accessible'] == true) const Padding(padding: EdgeInsets.only(top: 6), child: Text('Accessible', style: TextStyle(fontSize: 11, color: _muted))),
              ]),
            )),
          ]);
        })),
        Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12), decoration: const BoxDecoration(border: Border(top: BorderSide(color: _uiLine))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(b != null ? 'Room ${b.$2}, bed ${b.$3} selected.' : 'Pick an open bed. You can also wait for the office to allot one.', style: const TextStyle(fontSize: 13, color: _muted)),
              const SizedBox(height: 10),
              _Blocked(reason: b == null ? 'Pick an open bed first.' : null, child: KButton('Take this bed', icon: LucideIcons.bedDouble, kind: BtnKind.accent, pill: true, busy: busy,
                  onPressed: b == null ? null : () async {
                    final yes = await _confirm(context, title: 'Take room ${b.$2}, bed ${b.$3}?', body: 'The bed is kept for you while you choose your fee plan and pay the hostel and mess fees. To change it later, ask the hostel office.', confirmLabel: 'Take bed');
                    if (yes != null) _run(() => api.post('/registrations/${g['registration_id']}/choose', {'subspace_id': b.$1}).then((_) => load()), 'Bed is yours. Choose the fee plan next.');
                  })),
            ])),
      ],
    );
  }

  Widget _offer(Map g) => _Box(
        head: Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 8, runSpacing: 6, alignment: WrapAlignment.spaceBetween, children: [
          Text('Room offered: ${_roomLabel(_roomOf(g['subspace_id']))}, bed ${_bedOf(g['subspace_id'])}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
          if (g['hold_until'] != null) _Countdown(until: '${g['hold_until']}', label: 'Hold ends in'),
        ]),
        children: [
          Text('The hostel office offered you this bed. Accept before ${dayTime(g['hold_until'])} or it is released.', style: const TextStyle(color: _muted)),
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: [
            KButton('Accept room', icon: LucideIcons.check, kind: BtnKind.accent, pill: true, busy: busy,
                onPressed: () => _run(() => api.post('/offers/${g['offer_id']}/decision', {'decision': 'Accepted'}).then((_) => load()), 'Room accepted. Choose your fee plan next.')),
            KButton('Decline', kind: BtnKind.secondary, onPressed: () async {
              final r = await _confirm(context, title: 'Decline this room?', body: 'The bed is released and you can choose another open bed.', confirmLabel: 'Decline room', danger: true, remarksLabel: 'Why are you declining?');
              if (r != null) _run(() => api.post('/offers/${g['offer_id']}/decision', {'decision': 'Declined', 'decline_reason': r}).then((_) => load()), 'Room declined');
            }),
          ]),
        ],
      );

  Widget _feePlan(Map g) => _Box(title: 'Fee plan and mess', children: [
        _RadioCards(value: plan, onChanged: (v) => setState(() => plan = v), options: const [('Single', 'Single payment', 'Due within 7 days'), ('Two_Instalments', 'Two instalments', 'First part now, second on the due date')]),
        const SizedBox(height: 14),
        const Padding(padding: EdgeInsets.only(top: 6, bottom: 4), child: Text('Mess food', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: K.ink2))),
        // one spinner: food style and diet together (non-veg is chicken and egg only)
        DropdownButtonFormField<String>(
          initialValue: '$region/$diet', isExpanded: true,
          items: const [
            DropdownMenuItem(value: 'South/Veg', child: Text('South Indian · Veg')),
            DropdownMenuItem(value: 'South/Non_Veg', child: Text('South Indian · Non-veg (chicken, egg)')),
            DropdownMenuItem(value: 'North/Veg', child: Text('North Indian · Veg')),
            DropdownMenuItem(value: 'North/Non_Veg', child: Text('North Indian · Non-veg (chicken, egg)')),
            DropdownMenuItem(value: 'International/Veg', child: Text('Continental · Veg')),
            DropdownMenuItem(value: 'International/Non_Veg', child: Text('Continental · Non-veg (chicken, egg)')),
          ],
          onChanged: (v) { if (v != null) setState(() { region = v.split('/')[0]; diet = v.split('/')[1]; }); },
          decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12)),
        ),
        const Padding(padding: EdgeInsets.only(top: 6), child: Text('Continental is for students from abroad or on a prescribed diet. You can change food style later from Mess menu.', style: TextStyle(fontSize: 12, color: K.ink3))),
        const SizedBox(height: 14),
        Align(alignment: Alignment.centerLeft, child: KButton('Confirm plan', kind: BtnKind.accent, pill: true, busy: busy,
            onPressed: () => _run(() => api.post('/registrations/${g['registration_id']}/fee-plan', {'plan_type': plan, 'region': region, 'diet': diet}).then((_) => load()), 'Fees are ready to pay'))),
      ]);

  Widget _myBed(Map g) {
    final facts = [
      ('Room', _roomLabel(_roomOf(g['subspace_id']))), ('Bed', _bedOf(g['subspace_id'])), ('Room type', '${g['type_name']}'),
      (g['status'] == 'Checked_In' ? 'Key' : 'Fee check', g['status'] == 'Checked_In' ? '${g['key_no'] ?? ''}' : words(g['fee_check_status'])),
    ];
    Widget fact((String, String) x) => Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: _uiLine)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(x.$1, style: const TextStyle(fontSize: 11.5, color: _muted)),
          const SizedBox(height: 2),
          Text(x.$2, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
        ]));
    return _Box(children: [
      LayoutBuilder(builder: (context, c) {
        final cols = ((c.maxWidth + 8) / 118).floor().clamp(1, 4);
        return Column(children: [
          for (var i = 0; i < facts.length; i += cols) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 8), child: IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            for (var j = 0; j < cols; j++) ...[if (j > 0) const SizedBox(width: 8), Expanded(child: i + j < facts.length ? fact(facts[i + j]) : const SizedBox())],
          ]))),
        ]);
      }),
    ]);
  }

  /// DuesPanel: what is to pay now, paid so far, and each demand with Pay.
  Widget _duesPanel() {
    final demands = ((dues?['demands'] as List?) ?? []).cast<Map>();
    final receipts = ((dues?['receipts'] as List?) ?? []).cast<Map>();
    final total = demands.where((d) => _openSt.contains(d['status'])).fold<num>(0, (a, d) => a + _n(d['amount_due']) - _n(d['amount_paid']));
    final paid = receipts.fold<num>(0, (a, r) => a + _n(r['amount']));
    const small = TextStyle(fontSize: 12, color: _muted);
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: _uiLine)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(padding: const EdgeInsets.all(14), decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _uiLine))), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('To pay now', style: small),
          const SizedBox(height: 2),
          Text(_inr(total), style: const TextStyle(fontSize: 26, height: 30 / 26, fontWeight: FontWeight.w600, fontFeatures: [FontFeature.tabularFigures()])),
          const SizedBox(height: 2),
          Text('${_inr(paid)} paid so far', style: small),
          if (total > 0 && proof != null && ['Uploaded', 'Checked'].contains(proof!['status'])) ...[
            const SizedBox(height: 10),
            Row(children: [const Icon(LucideIcons.clock, size: 14, color: K.warn), const SizedBox(width: 6), Expanded(child: Text('Receipt ${proof!['proof_no']} under check; pay again only if it is returned.', style: const TextStyle(fontSize: 12.5, color: K.warn)))]),
          ] else if (total > 0) ...[
            const SizedBox(height: 10),
            KButton('Pay all ${_inr(total)}', icon: LucideIcons.wallet, kind: BtnKind.accent, pill: true,
                onPressed: () => showPayAllSheet(context, demands: demands.where((d) => _openSt.contains(d['status'])).toList().cast<Map>(), onDone: load)),
          ],
        ])),
        for (var i = 0; i < demands.length; i++) () {
          final d = demands[i];
          final due = _openSt.contains(d['status']);
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(border: i == demands.length - 1 ? null : const Border(bottom: BorderSide(color: _uiLine))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(children: [
                Expanded(child: Text('${words(d['fee_head'])}${d['fee_head'] == 'Hostel' ? ', part ${d['instalment_no']}' : ''}', style: const TextStyle(fontSize: 13))),
                const SizedBox(width: 10),
                due
                    ? KButton('Pay ${_inr(_n(d['amount_due']) - _n(d['amount_paid']))}', kind: BtnKind.accent, small: true, pill: true, busy: busy, onPressed: () => _pay(d))
                    : Text(_inr(d['amount_due']), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, fontFeatures: [FontFeature.tabularFigures()])),
              ]),
              const SizedBox(height: 4),
              Text(due ? 'due ${day(d['due_date'])}' : words(d['status']).toLowerCase(), style: const TextStyle(fontSize: 11.5, color: _muted)),
            ]),
          );
        }(),
        if (dues != null && demands.isEmpty) const Padding(padding: EdgeInsets.symmetric(horizontal: 16, vertical: 28), child: Text('No fees yet.', textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: _muted))),
      ]),
    );
  }

  Future<void> _pay(Map d) => _run(() async {
        final bal = _n(d['amount_due']) - _n(d['amount_paid']);
        final order = await api.post('/payments/orders', {'demand_id': d['demand_id']});
        if (order is Map && order['mode'] == 'dev') {
          await api.post('/payments/dev-confirm', {'demand_id': d['demand_id'], 'amount': bal});
        } else if (mounted) {
          await showDialog<void>(context: context, builder: (c) => AlertDialog(
                content: Text('Razorpay order ${order?['order_id']} for ₹${order?['amount']} (key ${order?['key_id']}). The receipt is recorded by the webhook.'),
                actions: [TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK'))]));
        }
        await load();
      }, 'Paid. Receipt issued.');
}

/// The KLH ConfirmDialog: icon tile, title, body, optional required remarks, Cancel and the confirm button.
/// Returns the remarks ('' when none are asked) on confirm, null on cancel.
Future<String?> _confirm(BuildContext context, {required String title, required String body, required String confirmLabel, bool danger = false, String? remarksLabel}) {
  final ctl = TextEditingController();
  return showDialog<String>(context: context, barrierColor: const Color(0x800A141E), builder: (ctx) => StatefulBuilder(builder: (ctx, set) {
    final needs = remarksLabel != null && ctl.text.trim().isEmpty;
    return Dialog(
      backgroundColor: Colors.white, surfaceTintColor: Colors.transparent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)), insetPadding: const EdgeInsets.all(16),
      child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: 48, height: 48, decoration: BoxDecoration(color: danger ? K.badBg : K.progressBg, borderRadius: BorderRadius.circular(14)),
            child: Icon(danger ? LucideIcons.triangleAlert : LucideIcons.info, size: 24, color: danger ? K.bad : K.brandInk)),
        const SizedBox(height: 16),
        Text(title, style: const TextStyle(fontSize: 18, height: 26 / 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        Text(body, style: const TextStyle(color: _muted)),
        if (remarksLabel != null) ...[
          const SizedBox(height: 16),
          Text.rich(TextSpan(style: const TextStyle(fontSize: 13, height: 18 / 13, fontWeight: FontWeight.w600), children: [TextSpan(text: remarksLabel), const TextSpan(text: ' *', style: TextStyle(color: K.bad))])),
          const SizedBox(height: 6),
          TextField(controller: ctl, minLines: 3, maxLines: null, onChanged: (_) => set(() {}), style: const TextStyle(fontSize: 14)),
        ],
        const SizedBox(height: 16),
        Row(mainAxisAlignment: MainAxisAlignment.end, children: [
          KButton('Cancel', kind: BtnKind.secondary, onPressed: () => Navigator.pop(ctx)),
          const SizedBox(width: 8),
          Flexible(child: KButton(confirmLabel, kind: danger ? BtnKind.danger : BtnKind.primary, onPressed: needs ? null : () => Navigator.pop(ctx, ctl.text))),
        ]),
      ])),
    );
  }));
}

/// .box: white, hairline, 16 px corners; a head row with a bottom rule and a padded body ([flush] leaves the body unpadded).
class _Box extends StatelessWidget {
  final String? title;
  final Widget? head;
  final bool flush;
  final List<Widget> children;
  const _Box({this.title, this.head, this.flush = false, required this.children});
  @override
  Widget build(BuildContext context) => Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: _uiLine)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (title != null || head != null) Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10), decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _uiLine))),
              child: head ?? Text(title!, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600))),
          flush ? Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children)
              : Padding(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children)),
        ]),
      );
}

/// .opt: a choice card; pressed has the teal border and a soft ring.
class _Opt extends StatelessWidget {
  final bool on;
  final VoidCallback onTap;
  final List<Widget> children;
  const _Opt({required this.on, required this.onTap, required this.children});
  @override
  Widget build(BuildContext context) => Semantics(button: true, selected: on, child: Container(
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), boxShadow: on ? const [BoxShadow(color: K.progressBg, spreadRadius: 3)] : null),
        child: Material(color: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: on ? K.brand : _uiLine)),
            child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(14), child: Padding(padding: const EdgeInsets.all(12),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [for (var i = 0; i < children.length; i++) ...[if (i > 0) const SizedBox(height: 4), children[i]]])))),
      ));
}

/// .bd legend square: open is a green outline, taken is solid teal.
class _Bd extends StatelessWidget {
  final bool open;
  const _Bd({required this.open});
  @override
  Widget build(BuildContext context) => Container(width: 14, height: 14, decoration: BoxDecoration(borderRadius: BorderRadius.circular(4),
      color: open ? null : K.brand, border: open ? Border.all(color: const Color(0xFF1A7F4B), width: 2) : null));
}

/// .bed: the square and the bed letter; pressed is solid teal, taken is greyed and cannot be picked.
class _BedButton extends StatelessWidget {
  final String letter;
  final bool open, on;
  final VoidCallback onTap;
  const _BedButton({required this.letter, required this.open, required this.on, required this.onTap});
  @override
  Widget build(BuildContext context) => Semantics(button: true, selected: on, enabled: open, child: Material(
      color: on ? K.brand : open ? Colors.white : _surface2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10), side: BorderSide(color: on ? K.brand : _uiLine)),
      child: InkWell(onTap: open ? onTap : null, borderRadius: BorderRadius.circular(10), child: Padding(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), child: Row(mainAxisSize: MainAxisSize.min, children: [
        _Bd(open: open), const SizedBox(width: 6),
        Text(letter, style: TextStyle(fontSize: 13, color: on ? Colors.white : open ? K.ink : _muted)),
      ])))));
}

/// RadioGroup variant="cards": a card per option with a round radio, the label and an optional line.
class _RadioCards extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;
  final List<(String, String, String?)> options;
  const _RadioCards({required this.value, required this.onChanged, required this.options});
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        for (final (i, o) in options.indexed) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 12), child: () {
          final on = value == o.$1;
          return Semantics(inMutuallyExclusiveGroup: true, checked: on, child: Container(
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), boxShadow: on ? const [BoxShadow(color: K.progressBg, spreadRadius: 3)] : null),
            child: Material(color: on ? K.progressBg : Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: on ? K.brand : K.line, width: 1.5)),
                child: InkWell(onTap: () => onChanged(o.$1), borderRadius: BorderRadius.circular(16), child: Padding(padding: const EdgeInsets.all(16), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Container(width: 20, height: 20, alignment: Alignment.center, decoration: BoxDecoration(shape: BoxShape.circle, color: on ? K.brand : Colors.white, border: Border.all(color: on ? K.brand : K.control, width: 1.5)),
                      child: on ? Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)) : null),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(o.$2, style: const TextStyle(fontWeight: FontWeight.w600)),
                    if (o.$3 != null) Text(o.$3!, style: const TextStyle(fontSize: 12, height: 16 / 12, color: _muted)),
                  ])),
                ])))),
          ));
        }()),
      ]);
}

/// klh-notice in its tone.
class _Notice extends StatelessWidget {
  final String tone, title, body;
  const _Notice({required this.tone, required this.title, required this.body});
  @override
  Widget build(BuildContext context) {
    final (bg, fg, icon) = switch (tone) {
      'warning' => (K.warnBg, K.warn, LucideIcons.triangleAlert), 'critical' => (K.badBg, K.bad, LucideIcons.triangleAlert),
      'success' => (K.goodBg, K.good, LucideIcons.check), 'progress' => (K.progressBg, K.progress, LucideIcons.info), _ => (K.infoBg, K.info, LucideIcons.info) };
    return Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(16)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(padding: const EdgeInsets.only(top: 2), child: Icon(icon, size: 18, color: fg)), const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 20 / 14, color: fg)),
            Text(body, style: TextStyle(fontSize: 14, height: 20 / 14, color: fg)),
          ])),
        ]));
  }
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
          const Padding(padding: EdgeInsets.only(top: 1), child: Icon(LucideIcons.lock, size: 14, color: _muted)), const SizedBox(width: 4),
          Flexible(child: Text(reason!, style: const TextStyle(fontSize: 12, height: 16 / 12, color: _muted))),
        ]),
      ]));
}

/// The accent pill button with its icon on the right (klh-btn-accent, iconRight), which KButton does not offer.
class _AccentButton extends StatelessWidget {
  final String label;
  final IconData iconRight;
  final bool large, busy;
  final VoidCallback? onPressed;
  const _AccentButton(this.label, {required this.iconRight, this.large = false, this.busy = false, this.onPressed});
  @override
  Widget build(BuildContext context) {
    final on = onPressed != null && !busy;
    return Opacity(opacity: on || busy ? 1 : .45, child: Container(
      height: large ? 44 : 40,
      decoration: BoxDecoration(gradient: const LinearGradient(colors: [K.sun, K.ember], stops: [0, .55], begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(999), boxShadow: on ? K.accentShadow : null),
      child: Material(type: MaterialType.transparency, child: InkWell(onTap: on ? onPressed : null, borderRadius: BorderRadius.circular(999), child: Padding(
          padding: EdgeInsets.symmetric(horizontal: large ? 20 : 16),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            if (busy) ...[const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: K.onAccent)), const SizedBox(width: 8)],
            Flexible(child: Text(label, overflow: TextOverflow.ellipsis, style: TextStyle(color: K.onAccent, fontWeight: FontWeight.w600, fontSize: large ? 15 : 14))),
            const SizedBox(width: 8), Icon(iconRight, size: 16, color: K.onAccent),
          ])))),
    ));
  }
}

/// klh-countdown with a label ("Hold ends in"): ticks every second, red under an hour, amber under six.
class _Countdown extends StatefulWidget {
  final String until;
  final String? label;
  const _Countdown({required this.until, this.label});
  @override
  State<_Countdown> createState() => _CountdownState();
}

class _CountdownState extends State<_Countdown> {
  late final Timer _t;
  @override
  void initState() { super.initState(); _t = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {})); }
  @override
  void dispose() { _t.cancel(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    final until = DateTime.tryParse(widget.until) ?? DateTime.now();
    var ms = until.difference(DateTime.now()).inMilliseconds;
    if (ms < 0) ms = 0;
    final (bg, fg) = ms < 3600e3 ? (K.badBg, K.bad) : ms < 6 * 3600e3 ? (K.warnBg, K.warn) : (K.infoBg, K.info);
    final hh = ms ~/ 3600000, mm = ms % 3600000 ~/ 60000, ss = ms % 60000 ~/ 1000;
    String p(int v) => v.toString().padLeft(2, '0');
    final txt = ms == 0 ? 'Expired' : hh >= 24 ? '${hh ~/ 24}d ${hh % 24}h ${p(mm)}m' : '${hh}h ${p(mm)}m ${p(ss)}s';
    return Container(height: 32, padding: const EdgeInsets.symmetric(horizontal: 12), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(LucideIcons.clock, size: 16, color: fg), const SizedBox(width: 8),
          if (widget.label != null) ...[Text(widget.label!, style: TextStyle(fontWeight: FontWeight.w500, color: fg)), const SizedBox(width: 8)],
          Text(txt, style: TextStyle(fontWeight: FontWeight.w700, color: fg, fontFeatures: const [FontFeature.tabularFigures()])),
        ]));
  }
}
