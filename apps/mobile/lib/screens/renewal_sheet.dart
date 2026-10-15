import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

const _open = ['Pending', 'Part_Paid', 'Overdue'];
const renewSteps = ['Choose', 'Registration fee', 'Room for next year', 'Hostel fees', 'Office checks', 'Moved in'];

/// Where the renewal is, as six steps (the web's renewalStep).
int renewalStep(Map rn) {
  final r = rn['renewal'] as Map?;
  if (r == null) return 0;
  final s = r['status'];
  if (s == 'Applied') return 1;
  if (['Fee_Paid', 'Waitlisted', 'Allotted'].contains(s)) return 2;
  if (s == 'Accepted') return 3;
  if (s == 'Confirmed') return ((rn['demands'] as List?) ?? []).any((d) => _open.contains(d['status'])) ? 3 : 4;
  return 5;
}

num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
num _balance(Map d) => _n(d['amount_due']) - _n(d['amount_paid']);
String _head(Map d) => '${words(d['fee_head'])}${d['instalment_no'] != null && d['fee_head'] == 'Hostel' ? ', part ${d['instalment_no']}' : ''}';

/// Yearly renewal, as the web's RenewalSheet (pages/student/StudentHome.tsx): the hostel student keeps the bed, asks for another
/// room or says they are leaving; then pays, confirms the room and the fee plan, and follows the office checks.
/// Every step is saved through the same API as the web portal. [onChanged] reloads the page underneath.
void showRenewalSheet(BuildContext context, Map first, VoidCallback onChanged) {
  var rn = first;
  var choice = 'Keep', plan = 'Single', cuisine = 'South_Indian';
  String? fac = (first['current'] as Map)['facility_id'] as String?;
  int? type;
  List<Map>? cat;
  var busy = false, left = false, asked = false;
  final y = first['next'] as Map;

  Future<void> run(BuildContext ctx, StateSetter set, Future<dynamic> Function() f, String done) async {
    set(() => busy = true);
    try {
      await f();
      rn = await api.get('/me/renewal') as Map;
      onChanged();
      if (ctx.mounted && done.isNotEmpty) toast(ctx, done);
    } catch (e) {
      if (ctx.mounted) toast(ctx, e.toString(), error: true);
    } finally {
      if (ctx.mounted) set(() => busy = false);
    }
  }
  Future<void> payAll(List<Map> list) async {
    for (final d in list) {
      final order = await api.post('/payments/orders', {'demand_id': d['demand_id']});
      if (order?['mode'] != 'dev') continue; // live gateway: the receipt arrives when the bank confirms
      await api.post('/payments/dev-confirm', {'demand_id': d['demand_id'], 'amount': _balance(d)});
    }
  }

  showKSheet(context, mod: Mod.teal, icon: LucideIcons.calendarClock, title: 'Renewal for ${y['academic_year']}',
      sub: first['renewal'] != null ? '${(first['renewal'] as Map)['registration_no']}' : 'You live in ${(first['current'] as Map)['bed_label']} this year',
      body: (ctx, set) {
        final cur = rn['current'] as Map, r = rn['renewal'] as Map?, fee = rn['same_fee'] as Map?;
        final demands = ((rn['demands'] as List?) ?? []).cast<Map>();
        final open = demands.where((d) => _open.contains(d['status'])).toList();
        final step = renewalStep(rn);
        if (left) {
          return DoneView(title: 'Noted', onClose: () => Navigator.pop(ctx),
              body: 'The office knows you are not staying in ${y['academic_year']}. Your room is yours until the end of ${cur['academic_year']}; vacate and hand over the key before you leave.');
        }
        if (r == null) {
          final windowOpen = y['renewal_open'] == true || y['registration_open'] == true;
          if (choice == 'Change' && cat == null && !asked) {
            asked = true;
            api.get('/allotment/catalogue?year=${y['academic_year']}').then((c) { if (ctx.mounted) set(() => cat = (c as List).cast<Map>()); }, onError: (_) { if (ctx.mounted) set(() => cat = []); });
          }
          final hostel = cat?.where((h) => h['facility_id'] == fac).firstOrNull;
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (cur['next_year_intent'] == 'Leave') ...[const Note('You said you are leaving. Choose again below if your plans changed.', icon: LucideIcons.calendarClock), const SizedBox(height: 12)],
            if (!windowOpen) ...[Note('Renewal for ${y['academic_year']} ${y['renewal_opens'] != null ? 'opens on ${day(y['renewal_opens'])}' : 'is not open yet'}. You can choose then.', icon: LucideIcons.calendarClock), const SizedBox(height: 12)],
            _Choice(LucideIcons.keyRound, 'Keep ${cur['bed_label']}',
                fee != null ? 'Same bed and key. ${inr(fee['hostel_fee'])} residency${fee['mess_fee'] != null ? ' + ${inr(fee['mess_fee'])} mess' : ''} + ${inr(fee['meter_charge'])} meter charge for the year. No registration fee or deposits on renewal.'
                    : 'Same bed. The ${y['academic_year']} fee for this room is not set yet.',
                choice == 'Keep', () => set(() => choice = 'Keep')),
            _Choice(LucideIcons.bedDouble, 'Move to another room', 'Choose a hostel and room type. The office offers a bed from those free next year.', choice == 'Change', () => set(() => choice = 'Change')),
            _Choice(LucideIcons.doorOpen, 'I am not staying', 'Your bed is released for ${y['academic_year']}. Nothing to pay.', choice == 'Leave', () => set(() => choice = 'Leave')),
            if (choice == 'Change') ...[
              const SizedBox(height: 6), const KLabel('Hostel'),
              if (cat == null) const Padding(padding: EdgeInsets.all(12), child: Center(child: CircularProgressIndicator())),
              for (final h in cat ?? const <Map>[]) _Choice(LucideIcons.building2, '${h['hostel_code']} · ${h['facility_name']}', '${(h['types'] as List).length} room types', fac == h['facility_id'], () => set(() { fac = h['facility_id'] as String?; type = null; })),
              if (hostel != null) ...[
                const SizedBox(height: 6), const KLabel('Room type'),
                for (final t in (hostel['types'] as List).cast<Map>()) _Choice(LucideIcons.bedDouble, '${t['type_name']}', '${inr(t['hostel_fee'])} a year · ${t['open_beds']} beds open',
                    type == (t['room_type_id'] as num).toInt(), () => set(() => type = (t['room_type_id'] as num).toInt())),
              ],
            ],
          ]);
        }
        final keeps = r['retain_subspace_id'] != null;
        final regFee = demands.where((d) => d['fee_head'] == 'Registration' && _open.contains(d['status'])).firstOrNull;
        Widget action;
        if (step == 1 && regFee != null) {
          action = Note('Pay the ${inr(_balance(regFee))} registration fee to hold your place for ${y['academic_year']}.', icon: LucideIcons.wallet);
        } else if (step == 2 && keeps) {
          action = Note('Confirm ${r['bed_label'] ?? cur['bed_label']} as your bed for ${y['academic_year']}. The same bed and key carry on.', icon: LucideIcons.keyRound);
        } else if (step == 2 && r['status'] == 'Allotted' && r['student_decision'] == 'Pending') {
          action = Note('The office offers ${r['bed_label']} for ${y['academic_year']}. It is held until ${dayTime(r['hold_until'])}.', icon: LucideIcons.bedDouble);
        } else if (step == 2) {
          action = Note('You asked for another room. The office offers a bed when one is free for ${y['academic_year']}; it appears here.', icon: LucideIcons.bedDouble);
        } else if (step == 3 && r['fee_plan_id'] == null) {
          action = Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const KLabel('How will you pay the residency fee?'),
            _Presets(const [('Single', 'In one payment'), ('Two_Instalments', 'In two instalments')], plan, (v) => set(() => plan = v)),
            const SizedBox(height: 14), const KLabel('Mess for next year'),
            _Presets(const [('South_Indian', 'South Indian'), ('North_Indian', 'North Indian'), ('Special_Diet', 'Special diet')], cuisine, (v) => set(() => cuisine = v)),
          ]);
        } else if (step == 3) {
          action = Lines([for (final d in open) LineItem(_head(d), sub: 'Due ${day(d['due_date'])}', trailing: Text(inr(_balance(d)), style: const TextStyle(fontWeight: FontWeight.w800)))]);
        } else if (step == 4) {
          action = Facts([
            ('Fee check', r['fee_check_status'] == 'Verified' ? 'Verified' : 'With Room Allotment', LucideIcons.receipt),
            ('Chief Manager', r['cw_status'] == 'Approved' ? 'Approved' : words(r['cw_status']), LucideIcons.shieldCheck),
            ('Moving in', 'From ${day(y['start_date'])} · no break in your stay', LucideIcons.calendarClock),
          ]);
        } else {
          action = DoneView(title: 'You are in for ${y['academic_year']}', body: '${r['bed_label'] ?? cur['bed_label']} is yours for ${y['academic_year']}.', onClose: () => Navigator.pop(ctx));
        }
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Wrap(spacing: 6, runSpacing: 6, children: [for (final (i, l) in renewSteps.indexed) _Step(i, l, i < step ? 'done' : i == step ? 'now' : 'next')]),
          const SizedBox(height: 14),
          Facts([
            ('Renewal', '${r['registration_no']} · ${words(r['status'])}', null),
            ('Next year', '${r['bed_label'] ?? (keeps ? cur['bed_label'] : 'Bed to be offered')} · ${r['hostel_code']}${r['type_name'] != null ? ' · ${r['type_name']}' : ''}', null),
            ('This year', '${cur['bed_label']} · until ${cur['academic_year']} ends', null),
          ]),
          const SizedBox(height: 6),
          action,
        ]);
      },
      footer: (ctx, set) {
        final cur = rn['current'] as Map, r = rn['renewal'] as Map?, fee = rn['same_fee'] as Map?;
        final demands = ((rn['demands'] as List?) ?? []).cast<Map>();
        final open = demands.where((d) => _open.contains(d['status'])).toList();
        final step = renewalStep(rn);
        if (left) return const SizedBox.shrink();
        if (r == null) {
          final windowOpen = y['renewal_open'] == true || y['registration_open'] == true;
          final blocked = !windowOpen ? 'Renewal is not open.' : choice == 'Keep' && fee == null ? 'The fee for next year is not set yet.' : choice == 'Change' && type == null ? 'Choose the room type.' : null;
          return _Foot(KButton(choice == 'Leave' ? 'Confirm I am leaving' : choice == 'Keep' ? 'Renew ${cur['bed_label']}' : 'Ask for this room', block: true, busy: busy,
              onPressed: blocked != null ? null : () => run(ctx, set, () async {
                await api.post('/me/renewal', choice == 'Change' ? {'choice': choice, 'facility_id': fac, 'room_type_id': type} : {'choice': choice});
                if (choice == 'Leave') left = true;
              }, choice == 'Leave' ? '' : 'Renewal started.')), blocked);
        }
        final keeps = r['retain_subspace_id'] != null;
        final regFee = demands.where((d) => d['fee_head'] == 'Registration' && _open.contains(d['status'])).firstOrNull;
        if (step == 1 && regFee != null) {
          return _Foot(KButton('Pay ${inr(_balance(regFee))}', block: true, busy: busy, onPressed: () => run(ctx, set, () => payAll([regFee]), 'Paid. Your receipt is saved under Receipts.')), null);
        }
        if (step == 2 && keeps) {
          return _Foot(KButton('Confirm my room', block: true, busy: busy, onPressed: () => run(ctx, set, () => api.post('/registrations/${r['registration_id']}/keep-room'), 'Room confirmed for next year')), null);
        }
        if (step == 2 && r['status'] == 'Allotted' && r['student_decision'] == 'Pending') {
          return _Foot(KButton('Accept ${r['bed_label']}', block: true, busy: busy, onPressed: () => run(ctx, set, () => api.post('/offers/${r['offer_id']}/decision', {'decision': 'Accepted'}), 'Room accepted')), null);
        }
        if (step == 3 && r['fee_plan_id'] == null) {
          return _Foot(KButton('Confirm fee plan', block: true, busy: busy,
              onPressed: () => run(ctx, set, () => api.post('/registrations/${r['registration_id']}/fee-plan', {'plan_type': plan, 'cuisine': cuisine}), 'Your fees are ready to pay')), null);
        }
        if (step == 3 && open.isNotEmpty) {
          final total = open.fold<num>(0, (a, d) => a + _balance(d));
          return _Foot(KButton('Pay ${inr(total)}', block: true, busy: busy, onPressed: () => run(ctx, set, () => payAll(open), 'Paid. Your receipt is saved under Receipts.')), null);
        }
        return const SizedBox.shrink();
      });
}

class _Foot extends StatelessWidget {
  final Widget button;
  final String? blocked;
  const _Foot(this.button, this.blocked);
  @override
  Widget build(BuildContext context) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        button,
        if (blocked != null) Padding(padding: const EdgeInsets.only(top: 6), child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Icon(LucideIcons.lock, size: 13, color: K.ink3), const SizedBox(width: 5), Text(blocked!, style: const TextStyle(fontSize: 12, color: K.ink3))])),
      ]);
}

/// One of the choices (st-choice): icon, title, what it means, and a radio dot.
class _Choice extends StatelessWidget {
  final IconData icon;
  final String title, sub;
  final bool on;
  final VoidCallback onTap;
  const _Choice(this.icon, this.title, this.sub, this.on, this.onTap);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 10), child: Semantics(inMutuallyExclusiveGroup: true, checked: on, button: true,
      child: Material(color: on ? const Color(0xFFE6F6F3) : Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: on ? K.brand : K.line, width: 1.5)),
          child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(14), child: Padding(padding: const EdgeInsets.all(12), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(width: 36, height: 36, decoration: BoxDecoration(color: on ? Colors.white : const Color(0xFFE6F6F3), borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 18, color: K.brand)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(sub, style: const TextStyle(fontSize: 12.5, height: 1.4, color: K.ink2)),
            ])),
            const SizedBox(width: 8),
            Container(width: 20, height: 20, alignment: Alignment.center, decoration: BoxDecoration(shape: BoxShape.circle, color: on ? K.brand : Colors.white, border: Border.all(color: on ? K.brand : K.line, width: 1.5)),
                child: on ? Container(width: 8, height: 8, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)) : null),
          ]))))));
}

/// Pick-one pills (st-presets).
class _Presets extends StatelessWidget {
  final List<(String, String)> options;
  final String value;
  final ValueChanged<String> onChanged;
  const _Presets(this.options, this.value, this.onChanged);
  @override
  Widget build(BuildContext context) => Wrap(spacing: 8, runSpacing: 8, children: [
        for (final (v, l) in options) Semantics(button: true, selected: value == v, child: Material(color: value == v ? K.brand : Colors.white,
            shape: StadiumBorder(side: BorderSide(color: value == v ? K.brand : K.line, width: 1.5)),
            child: InkWell(onTap: () => onChanged(v), customBorder: const StadiumBorder(), child: Padding(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                child: Text(l, style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: value == v ? Colors.white : K.ink)))))),
      ]);
}

/// One step of the six (st-flow-mini): a numbered or ticked dot and the label.
class _Step extends StatelessWidget {
  final int i;
  final String label, state;
  const _Step(this.i, this.label, this.state);
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.fromLTRB(5, 4, 10, 4),
      decoration: BoxDecoration(color: state == 'now' ? const Color(0xFFE6F6F3) : const Color(0xFFF4F6F8), borderRadius: BorderRadius.circular(999)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 20, height: 20, alignment: Alignment.center, decoration: BoxDecoration(shape: BoxShape.circle, color: state == 'next' ? Colors.white : K.brand, border: Border.all(color: state == 'next' ? K.line : K.brand)),
            child: state == 'done' ? const Icon(LucideIcons.check, size: 12, color: Colors.white) : Text('${i + 1}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: state == 'next' ? K.ink3 : Colors.white))),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: state == 'next' ? K.ink3 : K.brandDark)),
      ]));
}
