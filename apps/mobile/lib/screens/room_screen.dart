import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
const _open = ['Pending', 'Part_Paid', 'Overdue'];
const _steps = ['Apply', 'Registration fee', 'Choose room', 'Hostel fees', 'Warden check', 'Check in'];

int _stepOf(Map? r) {
  if (r == null) return 0;
  final s = r['status'];
  if (s == 'Applied') return 1;
  if (['Fee_Paid', 'Waitlisted', 'Allotted'].contains(s)) return 2;
  if (s == 'Accepted') return 3;
  if (s == 'Confirmed') return r['fee_check_status'] == 'Verified' ? 5 : 4;
  if (s == 'Checked_In') return 6;
  return 0;
}

/// "BH1-301-B2" -> "2"
String _bedOf(dynamic id) => RegExp(r'-B(\d+)$').firstMatch('${id ?? ''}')?.group(1) ?? '';
/// "BH1-301-B2" -> "BH1-301"
String _roomOf(dynamic id) => '${id ?? ''}'.replaceFirst(RegExp(r'-B\d+$'), '').replaceFirst(RegExp(r'^H-'), '');
/// "BH1-301-B2" -> "BH1-301-B"
String _bedLabel(dynamic id) => '${id ?? ''}'.replaceAllMapped(RegExp(r'-B(\d+)$'), (m) => '-${String.fromCharCode(64 + int.parse(m.group(1)!))}');

/// REG-01 / REG-03 / REG-04 Room and registration: the room you live in, your roommates and the people responsible for
/// your hostel, and where your registration stands, with its dues.
class RoomScreen extends StatefulWidget {
  const RoomScreen({super.key});
  @override
  State<RoomScreen> createState() => _RoomScreenState();
}

class _RoomScreenState extends State<RoomScreen> {
  Map? room;
  List<Map> regs = [];
  Map? dues;
  Object? error;
  bool loading = true;

  @override
  void initState() { super.initState(); load(); }

  Future<void> load() async {
    try {
      final r = await Future.wait([Api.instance.get('/me/room'), Api.instance.get('/registrations/mine')]);
      final rs = ((r[1] as List?) ?? []).cast<Map>();
      final active = rs.where((x) => !['Cancelled', 'Vacated'].contains(x['status'])).isNotEmpty;
      Map? d;
      if (active || r[0] != null) { try { d = await Api.instance.get('/students/$me/demands') as Map?; } catch (_) {} }
      if (!mounted) return;
      setState(() { room = r[0] is Map ? r[0] as Map : null; regs = rs; dues = d; error = null; loading = false; });
    } catch (e) {
      if (mounted) setState(() { error = e; loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()));
    if (error != null) return ErrorView(message: error.toString(), onRetry: load);
    final reg = regs.where((r) => !['Cancelled', 'Vacated'].contains(r['status'])).firstOrNull;
    final others = regs.where((r) => r != reg).toList();
    return RefreshIndicator(onRefresh: load, child: PageList(children: [
      if (room != null) ..._roomCards(room!),
      if (reg == null) ...[
        if (room == null) const KCard(child: EmptyView(icon: Icons.bed_rounded, title: 'No room yet', body: 'Register for a hostel room on the web portal for now. Applying from the app comes in the next update.')),
        if (room != null) const _Note(tone: Tone.info, title: 'No open registration', body: 'Registration for the next year opens on the web portal. Applying from the app comes in the next update.'),
      ] else ...[
        _RegCard(reg),
        if (dues != null) _Dues(dues!),
      ],
      if (others.isNotEmpty)
        KCard(title: 'Earlier registrations', icon: Icons.history_rounded, child: Column(children: [
          for (final r in others) Container(
            padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: K.line))),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${r['hostel_name'] ?? r['hostel_code']}, ${r['type_name']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                Text('${r['registration_no']}${r['academic_year'] != null ? ' · ${r['academic_year']}' : ''} · applied ${day(r['applied_on'])}'
                    '${r['subspace_id'] != null ? ' · bed ${_bedLabel(r['subspace_id'])}' : ''}${r['key_no'] != null ? ' · key ${r['key_no']}' : ''}',
                    style: const TextStyle(color: K.ink3, fontSize: 12.5)),
              ])),
              Pill(words(r['status']), tone: r['status'] == 'Checked_In' ? Tone.good : Pill.toneOf(r['status'])),
            ]),
          ),
        ])),
    ]));
  }

  List<Widget> _roomCards(Map r) {
    final mates = ((r['mates'] as List?) ?? []).cast<Map>();
    final people = ((r['people'] as List?) ?? []).cast<Map>();
    final mess = r['mess'] as Map?;
    return [
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(gradient: K.heroGradient, borderRadius: BorderRadius.circular(22)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Your bed', style: TextStyle(color: Colors.white70)),
          Text('${r['bed_label'] ?? ''}', style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800)),
          Text('${r['hostel_name']} · ${r['floor_name'] ?? ''} · room ${r['room_code']}', style: const TextStyle(color: Colors.white70)),
        ]),
      ),
      KCard(title: 'My room', icon: Icons.bed_rounded, child: Column(children: [
        InfoRow('Hostel', '${r['hostel_name']} (${r['hostel_code']})'),
        InfoRow('Room', '${r['room_code']}, ${r['floor_name'] ?? ''}'),
        InfoRow('Bed', '${r['bed_code']}'),
        InfoRow('Room type', '${r['type_name']}${r['is_ac'] == true ? ' · AC' : ''}${r['sharing_count'] != null ? ' · ${r['sharing_count']} per room' : ''}'),
        InfoRow('Key', '${r['key_no'] ?? '—'}'),
        InfoRow('In this room since', day(r['allocation_date'])),
        if (mess != null) InfoRow('Mess', '${mess['mess_name']}${mess['cuisine'] != null ? ' · ${words(mess['cuisine'])}' : ''}'),
      ])),
      KCard(title: 'Roommates', icon: Icons.group_rounded, child: mates.isEmpty
          ? const Text('No one else in your room.', style: TextStyle(color: K.ink3))
          : Column(children: [
              for (final m in mates) Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Row(children: [
                    CircleAvatar(radius: 16, backgroundColor: K.brandTint, child: Text('${m['bed_code']}', style: const TextStyle(color: K.brand, fontWeight: FontWeight.w800, fontSize: 13))),
                    const SizedBox(width: 10),
                    Expanded(child: m['student_id'] == null && m['staff_id'] == null
                        ? const Text('Empty bed', style: TextStyle(color: K.ink3))
                        : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('${titleCase(m['full_name'] ?? m['staff_name'])}${m['student_id'] == me ? ' (you)' : ''}', style: const TextStyle(fontWeight: FontWeight.w700)),
                            Text([m['student_id'] ?? m['staff_id'], m['programme']].where((x) => x != null).join(' · '), style: const TextStyle(color: K.ink3, fontSize: 12.5)),
                          ])),
                  ])),
            ])),
      if (people.isNotEmpty)
        KCard(title: 'People for your hostel', icon: Icons.support_agent_rounded, child: Column(children: [
          for (final p in people) Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(titleCase(p['full_name']), style: const TextStyle(fontWeight: FontWeight.w700)),
                  Text(words(p['hostel_role']), style: const TextStyle(color: K.ink3, fontSize: 12.5)),
                ])),
                if (p['mobile_no'] != null) SelectableText('${p['mobile_no']}'.replaceAllMapped(RegExp(r'^(\d{5})(\d{5})$'), (m) => '${m[1]} ${m[2]}'),
                    style: const TextStyle(fontWeight: FontWeight.w600, color: K.brand)),
              ])),
        ])),
    ];
  }
}

/// The registration journey: progress steps, what to do now, and the bed once there is one.
class _RegCard extends StatelessWidget {
  final Map reg;
  const _RegCard(this.reg);
  @override
  Widget build(BuildContext context) {
    final at = _stepOf(reg);
    final s = reg['status'];
    final fc = reg['fee_check_status'];
    final room = _roomOf(reg['subspace_id']);
    Widget? note;
    if (s == 'Applied') {
      note = _Note(tone: Tone.info, title: 'Pay the registration fee', body: '${inr(reg['registration_fee'])}, not refundable. The rooms open for you to choose as soon as it is paid. Pay it from your dues below.');
    } else if (['Fee_Paid', 'Waitlisted'].contains(s)) {
      note = _Note(tone: Tone.info, title: reg['waitlist_no'] != null ? 'Waiting list number ${reg['waitlist_no']}' : 'Choose your room',
          body: 'Registration fee paid. Pick an open bed of ${reg['type_name']} on the web portal for now; choosing a room from the app comes in the next update. You can also wait for the office to allot one.');
    } else if (s == 'Allotted') {
      note = _Note(tone: Tone.warn, title: 'Room offered: $room, bed ${_bedOf(reg['subspace_id'])}',
          body: 'The hostel office offered you this bed. Accept it on the web portal before ${dayTime(reg['hold_until'])} or it is released.');
    } else if (s == 'Accepted' && reg['fee_plan_id'] == null) {
      note = const _Note(tone: Tone.info, title: 'Choose your fee plan and mess', body: 'Choose the fee plan and mess cuisine on the web portal for now. Then the fees are ready to pay.');
    } else if (s == 'Accepted') {
      note = _Note(tone: Tone.info, title: 'Pay the hostel and mess fees', body: 'Room $room, bed ${_bedOf(reg['subspace_id'])} is kept for you. Pay the dues below; a Warden then checks them.');
    } else if (s == 'Confirmed' && fc == 'Pending') {
      note = const _Note(tone: Tone.info, title: 'Fees paid; the Warden is checking them', body: 'This page changes as soon as the fees are verified. Then collect your key at the hostel office.');
    } else if (s == 'Confirmed' && fc == 'Query') {
      note = _Note(tone: Tone.bad, title: 'The Warden has a query on your fees', body: '${reg['fee_check_remarks'] ?? ''} Visit the hostel accounts desk with your receipts.'.trim());
    } else if (s == 'Confirmed' && fc == 'Verified') {
      note = _Note(tone: Tone.good, title: 'All set. Collect your key', body: 'Visit the hostel office with your ID card. Your bed: ${_bedLabel(reg['subspace_id'])}.');
    }
    final hasBed = reg['subspace_id'] != null || s == 'Checked_In';
    return KCard(
      title: '${reg['hostel_name'] ?? reg['hostel_code']}, ${reg['type_name']}',
      subtitle: 'Registration ${reg['registration_no']}${reg['academic_year'] != null ? ' · ${reg['academic_year']}' : ''} · applied ${day(reg['applied_on'])}',
      icon: Icons.assignment_rounded,
      trailing: Pill(words(s), tone: s == 'Checked_In' || s == 'Fee_Paid' ? Tone.good : Pill.toneOf(s)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        for (var i = 0; i < _steps.length; i++) Padding(padding: const EdgeInsets.symmetric(vertical: 3), child: Row(children: [
              Icon(i < at ? Icons.check_circle_rounded : i == at ? Icons.radio_button_checked_rounded : Icons.radio_button_unchecked_rounded,
                  size: 18, color: i < at ? K.good : i == at ? K.ember : K.ink3),
              const SizedBox(width: 8),
              Text(_steps[i], style: TextStyle(fontWeight: i == at ? FontWeight.w800 : FontWeight.w500, color: i <= at ? K.ink : K.ink3)),
            ])),
        if (note != null) ...[const SizedBox(height: 12), note],
        if (hasBed) ...[
          const SizedBox(height: 12),
          InfoRow('Room', room.isEmpty ? '—' : room),
          InfoRow('Bed', _bedOf(reg['subspace_id']).isEmpty ? '—' : _bedOf(reg['subspace_id'])),
          InfoRow('Room type', '${reg['type_name']}'),
          s == 'Checked_In' ? InfoRow('Key', '${reg['key_no'] ?? '—'}') : InfoRow('Fee check', words(fc)),
        ],
      ]),
    );
  }
}

/// What the registration still needs paid, and what is already paid.
class _Dues extends StatelessWidget {
  final Map dues;
  const _Dues(this.dues);
  @override
  Widget build(BuildContext context) {
    final demands = ((dues['demands'] as List?) ?? []).cast<Map>();
    final receipts = ((dues['receipts'] as List?) ?? []).cast<Map>();
    final open = demands.where((d) => _open.contains(d['status'])).toList();
    final total = open.fold<num>(0, (a, d) => a + _n(d['amount_due']) - _n(d['amount_paid']));
    final paid = receipts.fold<num>(0, (a, r) => a + _n(r['amount']));
    return KCard(
      title: 'To pay now: ${inr(total)}', subtitle: '${inr(paid)} paid so far', icon: Icons.account_balance_wallet_rounded,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (demands.isEmpty) const Text('No fees yet.', style: TextStyle(color: K.ink3)),
        for (final d in demands.where((d) => !(d['status'] == 'Waived' && _n(d['amount_due']) == 0)))
          Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${words(d['fee_head'])}${d['fee_head'] == 'Hostel' ? ', part ${d['instalment_no']}' : ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
              Text(_open.contains(d['status']) ? 'due ${day(d['due_date'])}' : words(d['status']).toLowerCase(), style: const TextStyle(color: K.ink3, fontSize: 12.5)),
            ])),
            Text(inr(_open.contains(d['status']) ? _n(d['amount_due']) - _n(d['amount_paid']) : d['amount_due']), style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(width: 8),
            Pill(words(d['status']), tone: Pill.toneOf(d['status'])),
          ])),
        if (total > 0) Padding(padding: const EdgeInsets.only(top: 12),
            child: ActionButton(label: 'Pay in Fees', icon: Icons.arrow_forward_rounded, onPressed: () => openPlace(context, 'fees'))),
      ]),
    );
  }
}

class _Note extends StatelessWidget {
  final Tone tone;
  final String title;
  final String body;
  const _Note({required this.tone, required this.title, required this.body});
  @override
  Widget build(BuildContext context) {
    final (fg, bg) = switch (tone) { Tone.good => (K.good, K.goodBg), Tone.warn => (K.warn, K.warnBg), Tone.bad => (K.bad, K.badBg), _ => (K.brand, K.brandTint) };
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: TextStyle(color: fg, fontWeight: FontWeight.w800)),
        const SizedBox(height: 2),
        Text(body, style: const TextStyle(color: K.ink2, fontSize: 13)),
      ]),
    );
  }
}
