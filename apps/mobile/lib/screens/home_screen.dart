import 'pay_all_sheet.dart';
import 'renewal_sheet.dart';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

/// Student home, as pages/student/StudentHome.tsx: the teal banner with the room card, five task cards,
/// today's menu, quick actions, recent activity and the hostel journey. Tasks open in a sheet over the page.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

const _open = ['Pending', 'Part_Paid', 'Overdue'];
num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
num _balance(Map d) => _n(d['amount_due']) - _n(d['amount_paid']);
String _headOf(Map d) => '${words(d['fee_head'])}${d['fee_head'] == 'Hostel' ? ', instalment ${d['instalment_no']}' : ''}';
String _greeting() { final h = DateTime.now().hour; return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
const _slots = [('Breakfast', 'Breakfast', LucideIcons.coffee), ('Lunch', 'Lunch', LucideIcons.utensilsCrossed), ('Evening_Snacks', 'Evening snacks', LucideIcons.cookie), ('Dinner', 'Dinner', LucideIcons.soup)];
String? _foodName(String? region, String? country) => region == 'International' ? '$country food' : const {'South': 'South Indian', 'North': 'North Indian', 'International': 'My country'}[region];
const _goals = [
  ('Placement_Product', 'Placement, product company', 'Software roles at product firms'),
  ('Placement_Services', 'Placement, IT services', 'Service and consulting firms'),
  ('Higher_Studies', 'Higher studies', 'MS abroad, M.Tech through GATE, MBA'),
  ('Govt_Exams', 'Government exams', 'Civil services, PSUs, banking'),
  ('Entrepreneurship', 'My own start-up', 'Build a product or business'),
  ('Core_Other', 'Core or another field', 'Outside software'),
  ('Undecided', 'Not decided yet', 'A counsellor can help you choose'),
];

class _HomeScreenState extends State<HomeScreen> with AutoRefresh {
  Map<String, dynamic> d = {};
  bool loading = true;

  @override
  void initState() { super.initState(); load(); autoRefresh(load); }

  Future<dynamic> _try(String path) async { try { return await Api.instance.get(path); } catch (_) { return null; } }

  Future<void> load() async {
    const keys = ['regs', 'dues', 'me', 'meter', 'passes', 'sick', 'room', 'renewal', 'menu', 'meals', 'tickets', 'goal', 'wallet', 'proofs'];
    final r = await Future.wait([_try('/registrations/mine'), _try('/students/$me/demands'), _try('/students/$me'), _try('/meters/mine'), _try('/outpasses/mine'),
      _try('/sick-leaves/mine'), _try('/me/room'), _try('/me/renewal'), _try('/me/menu'), _try('/me/meal-choices'), _try('/me/tickets'), _try('/me/career-goal'), _try('/me/wallet'), _try('/me/payment-proofs')]);
    if (!mounted) return;
    setState(() { d = {for (var i = 0; i < keys.length; i++) keys[i]: r[i]}; loading = false; });
  }

  List<Map> _list(String k) => ((d[k] as List?) ?? []).cast<Map>();

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    final regs = _list('regs');
    final dues = (d['dues'] as Map?) ?? {};
    final demands = ((dues['demands'] as List?) ?? []).cast<Map>();
    final receipts = ((dues['receipts'] as List?) ?? []).cast<Map>();
    final student = d['me'] as Map?;
    final meter = d['meter'] as Map?;
    final passes = _list('passes');
    final sick = _list('sick');
    final room = d['room'] as Map?;
    final menu = d['menu'] as Map?;
    final tickets = (((d['tickets'] as Map?)?['tickets'] as List?) ?? []).cast<Map>();

    final reg = regs.where((r) => r['status'] == 'Checked_In').firstOrNull ?? regs.where((r) => !['Cancelled', 'Vacated'].contains(r['status'])).firstOrNull;
    final stage = _stage(reg);
    final living = student?['stay'] != null || room != null;
    final rn = d['renewal'] as Map?;
    final next0 = rn?['next'] as Map?;
    final showRenewal = rn?['current'] != null && next0 != null && (next0['renewal_open'] == true || next0['registration_open'] == true || rn?['renewal'] != null || (rn?['current'] as Map)['next_year_intent'] != null);
    final open = demands.where((x) => _open.contains(x['status'])).toList();
    final due = open.fold<num>(0, (a, x) => a + _balance(x));
    final next = (open.toList()..sort((a, b) => '${a['due_date']}'.compareTo('${b['due_date']}'))).firstOrNull;
    final overdue = open.any((x) => x['status'] == 'Overdue');
    final left = _n(meter?['units_left']), included = _n(meter?['included_units_per_month']), used = _n(meter?['units_this_month']);
    final livePass = passes.where((o) => ['Approved', 'Out', 'Overdue'].contains(o['status'])).firstOrNull;
    final pending = passes.where((o) => ['Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved'].contains(o['status'])).firstOrNull;
    final curSick = sick.where((l) => ['Applied', 'Recommended', 'Approved'].contains(l['status'])).firstOrNull;
    final first = student == null ? '' : titleCase('${student['full_name']}'.split(' ').first);
    final openTickets = tickets.where((t) => t['status'] != 'Closed').length;
    final toConfirm = tickets.where((t) => t['status'] == 'Resolved').length;

    // choose-my-meals: what is left to pick in the open week
    final weeks = (((d['meals'] as Map?)?['weeks'] as List?) ?? []).cast<Map>();
    final openWeek = weeks.where((w) => w['is_open'] == true).firstOrNull;
    var mealsLeft = 0;
    if (openWeek != null) {
      String key(Map o) => '${o['day_no']}|${o['meal']}|${o['course_code']}';
      final slots = {for (final o in ((openWeek['options'] as List?) ?? []).cast<Map>()) key(o)};
      mealsLeft = slots.length - ((openWeek['choices'] as List?) ?? []).cast<Map>().where((c) => slots.contains(key(c))).length;
    }
    final menuItems = ((menu?['items'] as List?) ?? []).cast<Map>();
    final menuMe = menu?['me'] as Map?;
    String? dishes(String meal) => menuItems.where((i) => i['day_no'] == menu?['today'] && i['meal'] == meal).firstOrNull?['dishes'];
    final todayLunch = dishes('Lunch')?.split(', ').take(3).join(', ');
    final goal = d['goal'] as Map?;

    final cards = <_Task>[
      _Task(Mod.orange, LucideIcons.wallet, 'Fees', due > 0 ? inr(due) : 'All paid', next != null ? '${_headOf(next)} · due ${day(next['due_date'])}' : '${receipts.length} receipts',
          due > 0 ? 'Pay now' : 'Receipts', () => due > 0 ? _fees(open, receipts) : _receipts(receipts), alert: overdue),
      _Task(Mod.amber, LucideIcons.zap, 'Electricity', meter != null ? '${(left < 0 ? 0 : left).toStringAsFixed(0)} units left' : '—',
          meter != null ? '${used.toStringAsFixed(0)} of ${included.toStringAsFixed(0)} used this month' : 'Linked at check-in', 'Recharge', () => _power(meter!),
          alert: meter != null && left < 10, off: meter == null ? 'After check-in' : null),
      _Task(Mod.violet, LucideIcons.doorOpen, 'Outing', livePass != null ? words(livePass['status']) : pending != null ? 'In approval' : 'At hostel',
          livePass != null ? '${livePass['destination']} · back by ${dayTime(livePass['return_by'])}' : pending != null ? '${pending['destination']} · ${words(pending['status']).toLowerCase()}' : '${passes.length} outings this year',
          'Ask permission', () => openPlace(context, 'outings'), off: living ? null : 'After check-in',
          alt: livePass != null ? 'Show pass' : pending != null ? 'See status' : null),
      _Task(Mod.orange, LucideIcons.wrench, 'Repairs', openTickets > 0 ? '$openTickets open' : 'Nothing open', toConfirm > 0 ? '$toConfirm repaired: please confirm' : 'Room, mess or common facility',
          toConfirm > 0 ? 'Confirm repair' : 'Report a problem', () => openPlace(context, 'repairs'), alert: toConfirm > 0, off: room != null ? null : 'After check-in'),
      _Task(Mod.rose, LucideIcons.heartPulse, 'Sick leave', curSick != null ? words(curSick['status']) : 'Feeling well', curSick != null ? '${day(curSick['from_date'])} to ${day(curSick['to_date'])}' : 'Report if you are unwell',
          curSick != null ? 'View' : 'Report', () => _sick(curSick), off: living ? null : 'After check-in'),
    ];
    final needRoom = living ? null : 'After check-in'; // mess, meals and repairs open once the student has a room
    final tiles = <(String, String, IconData, Mod, VoidCallback, String?)>[
      ('My room', room != null ? '${room['bed_label']}' : 'Not yet', LucideIcons.bedDouble, Mod.teal, () => room != null ? _room(room) : openPlace(context, 'room'), null),
      ('Mess menu', todayLunch != null ? 'Lunch: $todayLunch' : menuMe != null ? 'This week' : 'After check-in', LucideIcons.utensilsCrossed, Mod.em, () => openPlace(context, 'mess_menu'), needRoom),
      ('Choose my meals', openWeek != null ? (mealsLeft > 0 ? '$mealsLeft to choose by ${_dueLabel(openWeek['choices_close_at'])}' : 'Next week chosen') : 'When the mess publishes next week',
          LucideIcons.chefHat, Mod.orange, () => openPlace(context, 'meal_choice'), needRoom),
      ('Repairs', 'Room, mess or common facility', LucideIcons.wrench, Mod.orange, () => openPlace(context, 'repairs'), needRoom),
      ('Rate my meals', 'Tell the mess what you liked', LucideIcons.star, Mod.amber, () => openPlace(context, 'rate_meals'), needRoom),
      ('Receipts', '${receipts.length} on record', LucideIcons.receipt, Mod.orange, () => _receipts(receipts), null),
      ('Hostel journey', reg != null ? '${reg['registration_no']}' : 'Apply for a room', LucideIcons.sparkles, Mod.indigo, () => openPlace(context, 'room'), null),
      ('Academic record', 'Attendance, marks', LucideIcons.graduationCap, Mod.sky, () => openPlace(context, 'academics'), null),
      ('My career goal', goal != null ? _goals.where((g) => g.$1 == goal['goal']).firstOrNull?.$2 ?? 'Set' : 'Tell us what you aim for', LucideIcons.sparkles, Mod.indigo, () => _goal(goal), null),
      ('Parents and profile', '${((student?['contacts'] as List?) ?? []).where((c) => c['is_verified'] == true).length} verified contacts', LucideIcons.idCard, Mod.em, () => openPlace(context, 'profile'), null),
      ('Notifications', 'Messages and alerts', LucideIcons.bell, Mod.violet, () => openPlace(context, 'notifications'), null),
    ];
    final activity = <(String, IconData, Mod, String, String)>[
      for (final r in receipts) ('${r['paid_on']}', LucideIcons.receipt, Mod.orange, 'Paid ${inr(r['amount'])}', '${_headOf(r)} · ${r['receipt_no']}'),
      for (final o in passes) ('${o['leave_from']}', LucideIcons.doorOpen, Mod.violet, 'Outing to ${o['destination']}', '${o['outpass_no']} · ${words(o['status'])}'),
      for (final l in sick) ('${l['applied_on']}', LucideIcons.heartPulse, Mod.rose, 'Sick leave', '${day(l['from_date'])} to ${day(l['to_date'])} · ${words(l['status'])}'),
    ]..sort((a, b) => b.$1.compareTo(a.$1));
    const steps = ['Applied', 'Registration fee paid', 'Room allotted', 'Room accepted', 'Fees paid', 'Checked in'];

    // a receipt that the wardens are still checking: the dues are not asked for again
    final checking = _list('proofs').where((p) => ['Uploaded', 'Checked'].contains(p['status'])).firstOrNull;
    final heroLine = checking != null ? 'Receipt ${checking['proof_no']} is ${checking['status'] == 'Checked' ? 'with the Chief Warden' : 'with the Floor Warden'}. This page moves on by itself.'
        : reg == null ? 'You have not applied for a hostel room yet.'
        : stage == 3 && reg['student_decision'] == 'Pending' ? 'A bed is held for you until ${dayTime(reg['hold_until'])}. Accept it to continue.'
        : living ? (due > 0 ? '${inr(due)} is due${next != null ? ' by ${day(next['due_date'])}' : ''}.' : 'Everything is paid. Have a good day.')
        : stage == 2 ? 'Registration fee paid. Choose your bed: the rooms are open for you.' : stage < 3 ? 'Pay the registration fee to be allotted a bed.' : 'Pay the hostel and mess fees to check in.';

    return RefreshIndicator(onRefresh: load, child: ListView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 16, 16, 24), children: [
      // banner
      _Hero(
        date: '${DateFormat('EEEE, dd MMM yyyy').format(DateTime.now())}${reg != null ? ' · ${reg['hostel_code']}' : ''}',
        title: first.isNotEmpty ? '${_greeting()}, $first' : 'Welcome',
        line: heroLine,
        chips: [
          if (reg != null) (LucideIcons.circleCheck, words(reg['status'])),
          if (livePass != null) (LucideIcons.doorOpen, 'Pass ${livePass['outpass_no']}'),
          if (curSick != null) (LucideIcons.heartPulse, 'Sick leave ${words(curSick['status']).toLowerCase()}'),
        ],
        actions: [
          checking != null ? _Cta(LucideIcons.clock, 'Receipt under check', () => openPlace(context, 'room'))
              : due > 0 ? _Cta(LucideIcons.wallet, 'Pay ${inr(due)}', () => _fees(open, receipts))
              : reg == null ? _Cta(LucideIcons.bedDouble, 'Apply for a room', () => openPlace(context, 'room'))
              : stage < 6 ? _Cta(LucideIcons.sparkles, 'Continue registration', () => openPlace(context, 'room'))
              : _Cta(LucideIcons.doorOpen, livePass != null ? 'Show my pass' : pending != null ? 'Outing request status' : 'Ask for outing permission', () => openPlace(context, 'outings')),
          if (living && (due > 0 || stage < 6)) _Cta(LucideIcons.doorOpen, 'Ask for outing', () => openPlace(context, 'outings'), ghost: true),
          if (living) _Cta(LucideIcons.wrench, 'Report a problem', () => openPlace(context, 'repairs'), ghost: true),
        ],
        room: _RoomCard(room: room, regStatus: reg?['status'], onTap: () => room != null ? _room(room) : openPlace(context, 'room')),
      ),
      if (showRenewal) ...[const SizedBox(height: 18), _RenewalBanner(rn: rn!, onOpen: () => showRenewalSheet(context, rn, load))],
      const SizedBox(height: 18),
      _TaskGrid(cards),
      if (menuMe != null) ...[
        const SizedBox(height: 18),
        Panel(title: "Today's menu",
            sub: '${menuMe['hostel_gender']} · ${menuMe['is_foreign'] == true ? 'Foreign' : 'Local'} · ${_foodName(menuMe['region'], menuMe['country']) ?? ''} · ${menuMe['diet'] == 'Veg' ? 'Veg' : 'Non-veg'}',
            link: Align(alignment: Alignment.centerRight, widthFactor: 1, child: KLink('Week and change food', () => openPlace(context, 'mess_menu'))),
            child: menuItems.isEmpty ? const _Empty('No approved menu for your food choice yet.') : Column(children: [
              for (final (id, label, icon) in _slots) Container(
                width: double.infinity, margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.all(11),
                decoration: BoxDecoration(color: const Color(0xFFF7FBF9), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE3EFEA))),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Container(width: 32, height: 32, decoration: BoxDecoration(color: const Color(0xFFE7F8EF), borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 15, color: const Color(0xFF12805C))),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    Text(dishes(id) ?? 'Not set', style: const TextStyle(fontSize: 12.5, height: 1.45, color: K.ink4)),
                  ])),
                ])),
            ])),
      ],
      const SizedBox(height: 18),
      Panel(title: 'Quick actions', child: Column(children: [
        for (final (label, sub, icon, mod, go, off) in tiles) Padding(padding: const EdgeInsets.only(bottom: 8), child: Grey(off: off != null, child: Material(color: Colors.white, borderRadius: BorderRadius.circular(14), child: InkWell(
          onTap: off == null ? go : () => toast(context, '$label opens after check-in.'), borderRadius: BorderRadius.circular(14),
          child: Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10), decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: K.line)),
            child: Row(children: [
              Container(width: 38, height: 38, decoration: BoxDecoration(color: mod.bg, borderRadius: BorderRadius.circular(11)), child: Icon(icon, size: 19, color: mod.fg)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                Text(off ?? sub, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: K.ink3)),
              ])),
              Icon(off == null ? LucideIcons.chevronRight : LucideIcons.lock, size: 16, color: K.ink3),
            ])))))),
      ])),
      const SizedBox(height: 18),
      Panel(title: 'Recent activity', child: activity.isEmpty ? const _Empty('Payments, outings and sick leave appear here.') : Column(children: [
        for (var i = 0; i < activity.length && i < 5; i++) Container(
          padding: const EdgeInsets.symmetric(vertical: 9), decoration: BoxDecoration(border: i == 0 ? null : const Border(top: BorderSide(color: K.line2))),
          child: Row(children: [
            Container(width: 30, height: 30, decoration: BoxDecoration(color: activity[i].$3.bg, borderRadius: BorderRadius.circular(9)), child: Icon(activity[i].$2, size: 15, color: activity[i].$3.fg)),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(activity[i].$4, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
              Text(activity[i].$5, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11.5, color: K.ink3)),
            ])),
            const SizedBox(width: 10),
            Text(day(activity[i].$1), style: const TextStyle(fontSize: 11.5, color: K.ink3)),
          ])),
      ])),
      if (reg != null) ...[
        const SizedBox(height: 18),
        Panel(title: 'Your hostel journey', sub: '${reg['registration_no']}', link: Align(alignment: Alignment.centerRight, widthFactor: 1, child: KLink('Open', () => openPlace(context, 'room'))),
            child: Column(children: [
              for (var i = 0; i < steps.length; i++) _Step(steps[i], stage >= 6 || i < stage - 1 ? 'done' : i == stage - 1 ? 'current' : 'upcoming', last: i == steps.length - 1),
            ])),
      ],
      const SizedBox(height: 60),
    ]));
  }

  static int _stage(Map? r) {
    final s = r?['status'];
    if (r == null) return 0;
    if (s == 'Applied') return 1;
    if (['Fee_Paid', 'Waitlisted'].contains(s)) return 2;
    if (s == 'Allotted') return 3;
    if (s == 'Accepted') return 4;
    if (s == 'Confirmed') return 5;
    return 6;
  }

  static String _dueLabel(dynamic closeAt) {
    final t = DateTime.tryParse('$closeAt');
    if (t == null) return '';
    final ist = t.toUtc().add(const Duration(hours: 5, minutes: 30)).subtract(const Duration(minutes: 1));
    return '${DateFormat('EEE, dd MMM').format(ist)}, ${DateFormat('h:mm a').format(ist).toLowerCase()}';
  }

  /* ------------------------------------------------------------ sheets */



  /// Pay all: the same sheet as the Fees page (a receipt from the university portal, the wallet, or online).
  void _fees(List<Map> open, List<Map> receipts) {
    showPayAllSheet(context, demands: open, walletBalance: num.tryParse('${(d['wallet'] as Map?)?['balance'] ?? 0}') ?? 0, onDone: load);
  }


  void _receipts(List<Map> receipts) => showKSheet(context, mod: Mod.orange, icon: LucideIcons.receipt, title: 'Receipts', sub: '${receipts.length} on record',
      body: (ctx, set) => receipts.isEmpty ? const _Empty('No receipts yet.') : Lines([
            for (final r in receipts) LineItem(_headOf(r), sub: '${r['receipt_no']} · ${dayTime(r['paid_on'])} · ${r['payment_mode']}',
                trailing: Text(inr(r['amount']), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15))),
          ]),
      footer: (ctx, set) => KButton('Print a receipt', block: true, kind: BtnKind.secondary, onPressed: () { Navigator.pop(ctx); openPlace(context, 'fees'); }));

  void _power(Map m) {
    final rate = _n(m['rate_per_unit']), left = _n(m['units_left']), included = _n(m['included_units_per_month']), used = _n(m['units_this_month']), recharged = _n(m['recharged_this_month']);
    final pct = (used / ((included + recharged) < 1 ? 1 : included + recharged)).clamp(0, 1).toDouble();
    var amount = 200;
    double? done;
    var busy = false;
    final ctrl = TextEditingController(text: '200');
    final recharges = ((m['recharges'] as List?) ?? []).cast<Map>();
    showKSheet(context, mod: Mod.amber, icon: LucideIcons.zap, title: 'Electricity', sub: 'Meter ${m['meter_no']} · ${included.toStringAsFixed(0)} units a month included',
        body: (ctx, set) => done != null ? DoneView(title: '${done!.toStringAsFixed(1)} units added', body: 'The units are credited to your room meter.', onClose: () => Navigator.pop(ctx)) : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFFFFF8E6), borderRadius: BorderRadius.circular(14)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
              Text((left < 0 ? 0 : left).toStringAsFixed(0), style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFFA35A00))), const SizedBox(width: 6),
              const Text('units left', style: TextStyle(fontSize: 12.5, color: Color(0xFF6B5320))),
            ]),
            const SizedBox(height: 8),
            ClipRRect(borderRadius: BorderRadius.circular(999), child: Container(height: 8, color: const Color(0xFFFDE8B5), child: FractionallySizedBox(alignment: Alignment.centerLeft, widthFactor: pct,
                child: Container(decoration: BoxDecoration(gradient: left < 10 ? null : K.actionGradient, color: left < 10 ? K.alert : null, borderRadius: BorderRadius.circular(999)))))),
            const SizedBox(height: 8),
            Text('${used.toStringAsFixed(0)} used of ${(included + recharged).toStringAsFixed(0)} this month · ${inr(rate)} per extra unit', style: const TextStyle(fontSize: 12.5, color: Color(0xFF6B5320))),
          ])),
          const SizedBox(height: 14),
          const KLabel('Recharge amount'),
          Wrap(spacing: 8, runSpacing: 8, children: [for (final v in [100, 200, 500, 1000]) _Preset(inr(v), amount == v, () => set(() { amount = v; ctrl.text = '$v'; }))]),
          const SizedBox(height: 14),
          TextField(controller: ctrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Or type an amount'), onChanged: (v) => set(() => amount = int.tryParse(v) ?? 0)),
          if (recharges.isNotEmpty) ...[const SizedBox(height: 14), const KLabel('Recent recharges'), Lines([
            for (final r in recharges.take(3)) LineItem('${_n(r['units_credited']).toStringAsFixed(1)} units', sub: dayTime(r['created_at']), trailing: Pill.status(r['status'])),
          ])],
        ]),
        footer: (ctx, set) => done != null ? const SizedBox.shrink() : Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
          KButton('Pay ${inr(amount)}${rate > 0 ? ' for ${(amount / rate).toStringAsFixed(1)} units' : ''}', block: true, busy: busy,
              onPressed: rate == 0 || amount < 50 ? null : () async {
                set(() => busy = true);
                try {
                  final r = await api.post('/meters/${m['meter_id']}/recharge', {'amount': amount});
                  if (r['order']?['mode'] == 'dev') await api.post('/payments/dev-confirm', {'demand_id': r['demand']['demand_id'], 'amount': amount});
                  set(() => done = amount / rate); load();
                } catch (e) { if (mounted) toast(context, '$e', error: true); }
                finally { set(() => busy = false); }
              }),
          if (rate == 0 || amount < 50) Padding(padding: const EdgeInsets.only(top: 6), child: Text(rate == 0 ? 'The tariff for your room is not approved yet.' : 'At least ₹50.', style: const TextStyle(fontSize: 12, color: K.ink2))),
        ]));
  }

  void _sick(Map? current) {
    if (current != null) {
      var busy = false;
      showKSheet(context, mod: Mod.rose, icon: LucideIcons.heartPulse, title: 'Sick leave', sub: '${day(current['from_date'])} to ${day(current['to_date'])}',
          body: (ctx, set) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Pill.status(current['status']), const SizedBox(height: 14),
            Text('${current['illness_details']}'), const SizedBox(height: 14),
            Note(current['visited_by'] != null ? 'Visited: ${current['visit_remarks']}' : 'Stay in your room; your Floor Warden will come and see you.', icon: LucideIcons.shieldCheck),
            if (current['status'] == 'Approved') ...[const SizedBox(height: 14), const Note('Your meals come to your room until the leave ends.', icon: LucideIcons.utensilsCrossed)],
          ]),
          footer: (ctx, set) => KButton('I am well now', block: true, kind: BtnKind.secondary, busy: busy, onPressed: () async {
            set(() => busy = true);
            if (await act(context, () => api.post('/sick-leaves/${current['sick_leave_id']}/close', {}), 'Glad you are better. Leave closed.')) { load(); if (ctx.mounted) Navigator.pop(ctx); }
            set(() => busy = false);
          }));
      return;
    }
    final today = isoDay(DateTime.now());
    final what = TextEditingController();
    var from = today, until = today, sent = false, busy = false;
    Future<void> pick(BuildContext ctx, StateSetter set, bool isFrom) async {
      final d = await showDatePicker(context: ctx, initialDate: DateTime.parse(isFrom ? from : until), firstDate: DateTime.now().subtract(const Duration(days: 7)), lastDate: DateTime.now().add(const Duration(days: 60)));
      if (d != null) set(() { if (isFrom) { from = isoDay(d); if (until.compareTo(from) < 0) until = from; } else { until = isoDay(d); } });
    }
    showKSheet(context, mod: Mod.rose, icon: LucideIcons.heartPulse, title: 'Report that you are unwell', sub: 'Your Floor Warden visits; the building in-charge approves',
        body: (ctx, set) => sent ? DoneView(title: 'Reported', body: 'Your Floor Warden will come and see you. Rest in your room.', onClose: () => Navigator.pop(ctx)) : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          TextField(controller: what, minLines: 3, maxLines: 3, onChanged: (_) => set(() {}), decoration: const InputDecoration(labelText: 'What is wrong *', hintText: 'Fever since last night', alignLabelWithHint: true)),
          const SizedBox(height: 14),
          _DateField('From *', from, () => pick(ctx, set, true)),
          const SizedBox(height: 12),
          _DateField('Until *', until, () => pick(ctx, set, false)),
        ]),
        footer: (ctx, set) => sent ? const SizedBox.shrink() : Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          KButton('Report sick leave', block: true, busy: busy, onPressed: what.text.trim().length < 3 ? null : () async {
            set(() => busy = true);
            try { await api.post('/sick-leaves', {'illness_details': what.text.trim(), 'from_date': from, 'to_date': until}); set(() => sent = true); load(); }
            catch (e) { if (mounted) toast(context, '$e', error: true); }
            finally { set(() => busy = false); }
          }),
          if (what.text.trim().length < 3) const Padding(padding: EdgeInsets.only(top: 6), child: Text('Say what is wrong.', style: TextStyle(fontSize: 12, color: K.ink2))),
        ]));
  }

  void _room(Map r) {
    const role = {'Floor_Warden': 'Floor Warden', 'Chief_Warden': 'Chief Warden', 'Sweeper': 'Sweeper', 'Scavenger': 'Scavenger'};
    final mess = r['mess'] as Map?;
    showKSheet(context, mod: Mod.teal, icon: LucideIcons.bedDouble, title: '${r['bed_label']}',
        sub: '${r['hostel_name']} · ${r['floor_name']} · ${r['type_name'] ?? 'Room'}${r['is_ac'] == true ? ' · AC' : ''}',
        body: (ctx, set) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Facts([
            ('Key', '${r['key_no'] ?? '—'}', LucideIcons.keyRound),
            ('Since', day(r['allocation_date']), LucideIcons.calendarClock),
            ('Mess', mess != null ? '${mess['mess_name']}${mess['cuisine'] != null ? ' · ${words(mess['cuisine'])}' : ''}' : '—', LucideIcons.utensilsCrossed),
          ]),
          const SizedBox(height: 6),
          const KLabel('In this room'),
          Lines([
            for (final m in ((r['mates'] as List?) ?? []).cast<Map>()) LineItem(m['full_name'] ?? m['staff_name'] ?? 'Vacant',
                sub: m['student_id'] != null ? '${m['student_id']}${m['programme'] != null ? ' · ${m['programme']}' : ''}' : m['staff_id'] != null ? 'Faculty' : 'Free bed',
                leading: Container(width: 28, height: 28, alignment: Alignment.center, decoration: BoxDecoration(color: const Color(0xFFE3F4F2), borderRadius: BorderRadius.circular(8)),
                    child: Text('${m['bed_code']}'.split('-').last, style: K.mono(size: 12, weight: FontWeight.w800, color: K.brand)))),
          ]),
          const SizedBox(height: 14),
          const KLabel('Who to call'),
          Lines([
            for (final p in ((r['people'] as List?) ?? []).cast<Map>()) LineItem('${p['full_name']}', sub: role[p['hostel_role']] ?? words(p['hostel_role']),
                trailing: p['mobile_no'] == null ? null : Container(height: 30, padding: const EdgeInsets.symmetric(horizontal: 10), decoration: BoxDecoration(color: const Color(0xFFE3F4F2), borderRadius: BorderRadius.circular(999)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [const Icon(LucideIcons.phone, size: 14, color: K.brand), const SizedBox(width: 5),
                      SelectableText('${p['mobile_no']}', style: const TextStyle(color: K.brand, fontSize: 12.5, fontWeight: FontWeight.w700))]))),
          ]),
          const SizedBox(height: 14),
          const Note('Report a damaged item to your Floor Warden; it is checked against your room list when you vacate.', icon: LucideIcons.bookOpen),
        ]));
  }

  void _goal(Map? goal) {
    String v = goal?['goal'] ?? '';
    final notes = TextEditingController(text: goal?['notes'] ?? '');
    var busy = false;
    showKSheet(context, mod: Mod.indigo, icon: LucideIcons.graduationCap, title: 'My career goal', sub: 'What are you working towards after your degree?',
        body: (ctx, set) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (final (value, label, sub) in _goals) Padding(padding: const EdgeInsets.only(bottom: 8), child: _Choice(label, sub, v == value, () => set(() => v = value))),
          const SizedBox(height: 6),
          TextField(controller: notes, maxLength: 300, decoration: const InputDecoration(labelText: 'Anything to add', helperText: 'For example: the company, the exam, the country')),
          const SizedBox(height: 8),
          const Note("The Dean's office uses this to offer the right guidance: placement training, a faculty mentor or counselling. You can change it any time.", icon: LucideIcons.graduationCap),
        ]),
        footer: (ctx, set) => KButton('Save my goal', block: true, busy: busy, onPressed: v.isEmpty ? null : () async {
          set(() => busy = true);
          if (await act(context, () => api.post('/me/career-goal', {'goal': v, 'notes': notes.text.trim().isEmpty ? null : notes.text.trim()}), 'Career goal saved')) { load(); if (ctx.mounted) Navigator.pop(ctx); }
          set(() => busy = false);
        }));
  }
}

/* ------------------------------------------------------------ the banner */

class _Hero extends StatelessWidget {
  final String date, title, line;
  final List<(IconData, String)> chips;
  final List<Widget> actions;
  final Widget room;
  const _Hero({required this.date, required this.title, required this.line, required this.chips, required this.actions, required this.room});
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), boxShadow: const [BoxShadow(color: Color(0xB30B7A71), blurRadius: 36, spreadRadius: -20, offset: Offset(0, 18))]),
        child: ClipRRect(borderRadius: BorderRadius.circular(20), child: Container(
          decoration: const BoxDecoration(gradient: K.heroGradient),
          child: Stack(children: [
            const Positioned.fill(child: CustomPaint(painter: _RoomPattern())),
            Positioned(left: 0, right: 0, top: -160, child: LayoutBuilder(builder: (c, b) => Padding(padding: EdgeInsets.only(left: b.maxWidth * .48), child: Align(alignment: Alignment.topLeft,
                child: Opacity(opacity: .85, child: Container(width: 240, height: 240, decoration: const BoxDecoration(shape: BoxShape.circle,
                    gradient: RadialGradient(center: Alignment(-.4, -.4), radius: .7, colors: [K.sun, K.ember], stops: [0, 1])))))))),
            Positioned(left: -70, bottom: -110, child: Container(width: 180, height: 180, decoration: BoxDecoration(shape: BoxShape.circle, color: K.violet.withValues(alpha: .45)))),
            Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Opacity(opacity: .9, child: Text(date, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600))),
              const SizedBox(height: 8),
              Text(title, style: const TextStyle(color: Colors.white, fontSize: 24, height: 1.12, fontWeight: FontWeight.w800, letterSpacing: -.72)),
              const SizedBox(height: 8),
              Opacity(opacity: .92, child: Text(line, style: const TextStyle(color: Colors.white, fontSize: 15))),
              if (chips.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 12), child: Wrap(spacing: 6, runSpacing: 6, children: [
                for (final (icon, label) in chips) Container(height: 26, padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(color: Colors.white.withValues(alpha: .16), borderRadius: BorderRadius.circular(999), border: Border.all(color: Colors.white.withValues(alpha: .28))),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 13, color: Colors.white), const SizedBox(width: 5),
                      Text(label, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700))])),
              ])),
              const SizedBox(height: 16),
              Wrap(spacing: 8, runSpacing: 8, children: actions),
              const SizedBox(height: 16),
              room,
            ])),
          ]),
        )),
      );
}

/// The banner's background: rounded room outlines with a small filled window, 56 px apart, white at 8 %.
class _RoomPattern extends CustomPainter {
  const _RoomPattern();
  @override
  void paint(Canvas canvas, Size size) {
    final stroke = Paint()..style = PaintingStyle.stroke..strokeWidth = 1.5..color = Colors.white.withValues(alpha: .08);
    final fill = Paint()..color = Colors.white.withValues(alpha: .08);
    for (double y = 0; y < size.height; y += 56) {
      for (double x = 0; x < size.width; x += 56) {
        canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(x + 8, y + 14, 40, 28), const Radius.circular(7)), stroke);
        canvas.drawRRect(RRect.fromRectAndRadius(Rect.fromLTWH(x + 13, y + 19, 12, 8), const Radius.circular(3)), fill);
      }
    }
  }
  @override
  bool shouldRepaint(_) => false;
}

class _Cta extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool ghost;
  const _Cta(this.icon, this.label, this.onTap, {this.ghost = false});
  @override
  Widget build(BuildContext context) {
    final fg = ghost ? Colors.white : K.brandDark;
    return Container(height: 44,
        decoration: BoxDecoration(color: ghost ? Colors.white.withValues(alpha: .14) : Colors.white, borderRadius: BorderRadius.circular(12),
            border: ghost ? Border.all(color: Colors.white.withValues(alpha: .55), width: 1.5) : null,
            boxShadow: ghost ? null : const [BoxShadow(color: Color(0x66000000), blurRadius: 24, spreadRadius: -12, offset: Offset(0, 12))]),
        child: Material(type: MaterialType.transparency, child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(12), child: Padding(padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(icon, size: 17, color: fg), const SizedBox(width: 8),
              Text(label, style: TextStyle(color: fg, fontWeight: FontWeight.w800, fontSize: 14.5)),
            ])))));
  }
}

class _RoomCard extends StatelessWidget {
  final Map? room;
  final String? regStatus;
  final VoidCallback onTap;
  const _RoomCard({required this.room, required this.regStatus, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final r = room;
    final fw = ((r?['people'] as List?) ?? []).cast<Map>().where((p) => p['hostel_role'] == 'Floor_Warden').firstOrNull;
    final taken = ((r?['mates'] as List?) ?? []).cast<Map>().where((m) => m['student_id'] != null || m['staff_id'] != null).length;
    Widget row(IconData i, String t) => Padding(padding: const EdgeInsets.only(top: 4), child: Row(children: [Icon(i, size: 13, color: Colors.white), const SizedBox(width: 6),
      Expanded(child: Text(t, style: const TextStyle(color: Colors.white, fontSize: 13)))]));
    return ClipRRect(borderRadius: BorderRadius.circular(18), child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10), child: Material(
      color: Colors.white.withValues(alpha: .14),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: BorderSide(color: Colors.white.withValues(alpha: .28))),
      child: InkWell(onTap: onTap, child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Opacity(opacity: .9, child: Row(children: [const Icon(LucideIcons.keyRound, size: 15, color: Colors.white), const SizedBox(width: 6),
          Text(r != null ? 'Your room' : 'No room yet', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700))])),
        const SizedBox(height: 8),
        Text(r != null ? '${r['bed_label']}' : regStatus != null ? words(regStatus) : 'Apply', style: K.mono(size: 26, weight: FontWeight.w800, color: Colors.white).copyWith(letterSpacing: -.52)),
        const SizedBox(height: 4),
        Opacity(opacity: .95, child: r == null ? const Text('Your bed appears here after check-in.', style: TextStyle(color: Colors.white, fontSize: 13)) : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          row(LucideIcons.bedDouble, '${r['floor_name']} · ${r['type_name'] ?? 'Room'}'),
          row(LucideIcons.users, '$taken of ${r['sharing_count']} beds taken'),
          if (fw != null) row(LucideIcons.shieldCheck, '${fw['full_name']}'),
        ])),
        const SizedBox(height: 8),
        const Row(children: [Text('Details', style: TextStyle(color: K.sun, fontSize: 12.5, fontWeight: FontWeight.w800)), SizedBox(width: 2), Icon(LucideIcons.chevronRight, size: 14, color: K.sun)]),
      ]))),
    )));
  }
}

/* ------------------------------------------------------------ the task cards */

class _Task {
  final Mod mod;
  final IconData icon;
  final String title, value, sub, cta;
  final VoidCallback go;
  final bool alert;
  final String? off, alt;
  const _Task(this.mod, this.icon, this.title, this.value, this.sub, this.cta, this.go, {this.alert = false, this.off, this.alt});
}

/// Two cards a row, as the web on a phone; each row as tall as its tallest card.
class _TaskGrid extends StatelessWidget {
  final List<_Task> cards;
  const _TaskGrid(this.cards);
  @override
  Widget build(BuildContext context) => Column(children: [
        for (var i = 0; i < cards.length; i += 2) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 10), child: IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Expanded(child: _TaskCard(cards[i])), const SizedBox(width: 10),
          Expanded(child: i + 1 < cards.length ? _TaskCard(cards[i + 1]) : const SizedBox.shrink()),
        ]))),
      ]);
}

class _TaskCard extends StatelessWidget {
  final _Task c;
  const _TaskCard(this.c);
  @override
  Widget build(BuildContext context) {
    final off = c.off != null;
    return Grey(off: off, child: Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: c.alert ? K.alertLine : K.line), boxShadow: K.cardShadow),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          ModIcon(c.icon, c.mod), const SizedBox(width: 10),
          Expanded(child: Text(c.title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: K.ink2))),
          if (c.alert) Container(width: 9, height: 9, margin: const EdgeInsets.only(right: 3), decoration: const BoxDecoration(color: K.alert, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Color(0xFFFDECEC), spreadRadius: 3)])),
        ]),
        const SizedBox(height: 10),
        Text(c.value, style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -.34, color: off ? K.ink3 : K.ink)),
        const SizedBox(height: 6),
        Text(c.off ?? c.sub, style: const TextStyle(fontSize: 12.5, color: K.ink3)),
        const Spacer(),
        if (c.alt != null && !off) Padding(padding: const EdgeInsets.only(top: 6), child: InkWell(onTap: c.go, child: Row(mainAxisSize: MainAxisSize.min, children: [
          Text(c.alt!, style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: c.mod.fg)), Icon(LucideIcons.chevronRight, size: 14, color: c.mod.fg)]))),
        const SizedBox(height: 6),
        Opacity(opacity: off ? .55 : 1, child: Material(color: c.mod.bg, borderRadius: BorderRadius.circular(10), child: InkWell(onTap: off ? null : c.go, borderRadius: BorderRadius.circular(10),
            child: Container(height: 36, padding: const EdgeInsets.symmetric(horizontal: 10), child: Row(children: [
              Expanded(child: Text(c.cta, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: c.mod.fg))),
              Icon(LucideIcons.arrowRight, size: 15, color: c.mod.fg),
            ]))))),
      ]),
    ));
  }
}

/* ------------------------------------------------------------ smaller pieces */

class _RenewalBanner extends StatelessWidget {
  final Map rn;
  final VoidCallback onOpen;
  const _RenewalBanner({required this.rn, required this.onOpen});
  static const _steps = ['Choose', 'Registration fee', 'Room for next year', 'Hostel fees', 'Office checks', 'Moved in'];
  int _step() {
    final r = rn['renewal'] as Map?;
    if (r == null) return 0;
    final s = r['status'];
    if (s == 'Applied') return 1;
    if (['Fee_Paid', 'Waitlisted', 'Allotted'].contains(s)) return 2;
    if (s == 'Accepted') return 3;
    if (s == 'Confirmed') return ((rn['demands'] as List?) ?? []).any((d) => _open.contains(d['status'])) ? 3 : 4;
    return 5;
  }
  @override
  Widget build(BuildContext context) {
    final r = rn['renewal'] as Map?, y = rn['next'] as Map, cur = rn['current'] as Map;
    final leaving = r == null && cur['next_year_intent'] == 'Leave';
    final step = _step();
    final closes = y['renewal_open'] == true ? y['renewal_closes'] : y['registration_closes'];
    final line = leaving ? 'You told the office you are not staying in ${y['academic_year']}. You can still change your mind while renewal is open.'
        : r == null ? 'Renewal for ${y['academic_year']} is open${closes != null ? ' until ${day(closes)}' : ''}. Keep ${cur['bed_label']}, ask for another room, or tell us you are leaving.'
        : step == 4 ? 'All paid. Room Allotment moves you into ${y['academic_year']} once the fee check and the Chief Warden are done.'
        : '${r['registration_no']} · next step: ${_steps[step].toLowerCase()}.';
    // a rounded card with a 4 px teal left edge: Flutter cannot round a border whose sides differ, so the edge is painted inside
    return Container(
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: K.line), boxShadow: K.cardShadow),
      child: ClipRRect(borderRadius: BorderRadius.circular(17), child: Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: const BoxDecoration(border: Border(left: BorderSide(color: K.brand, width: 4))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(width: 40, height: 40, decoration: BoxDecoration(color: const Color(0xFFE6F6F3), borderRadius: BorderRadius.circular(12)), child: const Icon(LucideIcons.calendarClock, size: 20, color: K.brand)),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(leaving ? 'Leaving after ${cur['academic_year']}' : r != null ? 'Your ${y['academic_year']} renewal' : 'Stay with us in ${y['academic_year']}?', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
            const SizedBox(height: 3),
            Text(line, style: const TextStyle(fontSize: 12.5, color: K.ink2)),
            if (r != null) Padding(padding: const EdgeInsets.only(top: 6), child: Row(children: [
              for (var i = 0; i < _steps.length; i++) Expanded(child: Container(height: 5, margin: EdgeInsets.only(right: i < _steps.length - 1 ? 4 : 0),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(3), color: i < step ? K.brand : i == step ? const Color(0xFF7FD1C4) : K.line))),
            ])),
          ])),
        ]),
        const SizedBox(height: 14),
        Material(color: const Color(0xFFE6F6F3), borderRadius: BorderRadius.circular(10), child: InkWell(onTap: onOpen, borderRadius: BorderRadius.circular(10), child: Container(height: 36, padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(children: [Expanded(child: Text(leaving ? 'Change my mind' : r != null ? 'Open' : 'Renew my room', style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800, color: K.brandDark))),
              const Icon(LucideIcons.arrowRight, size: 15, color: K.brandDark)])))),
      ]),
    )));
  }
}

/// One stage of the hostel journey (KLH Stepper, upright on a phone).
class _Step extends StatelessWidget {
  final String label, state;
  final bool last;
  const _Step(this.label, this.state, {this.last = false});
  @override
  Widget build(BuildContext context) {
    final done = state == 'done', now = state == 'current';
    return Padding(padding: EdgeInsets.only(bottom: last ? 0 : 18), child: Row(children: [
      Container(width: 32, height: 32, alignment: Alignment.center,
          decoration: BoxDecoration(shape: BoxShape.circle, color: done ? const Color(0xFF2F6F68) : now ? null : Colors.white, gradient: now ? K.actionGradient : null,
              border: done || now ? null : Border.all(color: K.line, width: 2)),
          child: done ? const Icon(LucideIcons.check, size: 16, color: Colors.white) : Text('', style: TextStyle(color: now ? K.onAccent : K.ink3))),
      const SizedBox(width: 18),
      Expanded(child: Text(label, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: done || now ? K.ink : K.ink3))),
    ]));
  }
}

class _Empty extends StatelessWidget {
  final String text;
  const _Empty(this.text);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Text(text, style: const TextStyle(fontSize: 13, color: K.ink3)));
}

class _Preset extends StatelessWidget {
  final String label;
  final bool on;
  final VoidCallback onTap;
  const _Preset(this.label, this.on, this.onTap);
  @override
  Widget build(BuildContext context) => Material(borderRadius: BorderRadius.circular(999), color: Colors.transparent, child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(999), child: Container(
        height: 38, padding: const EdgeInsets.symmetric(horizontal: 16), alignment: Alignment.center,
        decoration: BoxDecoration(gradient: on ? K.actionGradient : null, borderRadius: BorderRadius.circular(999), border: on ? null : Border.all(color: K.line)),
        child: Text(label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: on ? K.onAccent : K.ink)))));
}

class _Choice extends StatelessWidget {
  final String title, sub;
  final bool on;
  final VoidCallback onTap;
  const _Choice(this.title, this.sub, this.on, this.onTap);
  @override
  Widget build(BuildContext context) => Semantics(checked: on, inMutuallyExclusiveGroup: true, child: Material(color: on ? const Color(0xFFF2FBF9) : Colors.white, borderRadius: BorderRadius.circular(14), child: InkWell(
      onTap: onTap, borderRadius: BorderRadius.circular(14),
      child: Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: on ? K.brand : K.line, width: 1.5)),
        child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
            Text(sub, style: const TextStyle(fontSize: 12, color: K.ink3)),
          ])),
          Container(width: 18, height: 18, decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: on ? K.brand : const Color(0xFFC5CCD8), width: on ? 5 : 2))),
        ])))));
}

class _DateField extends StatelessWidget {
  final String label, value;
  final VoidCallback onTap;
  const _DateField(this.label, this.value, this.onTap);
  @override
  Widget build(BuildContext context) => InkWell(onTap: onTap, borderRadius: BorderRadius.circular(10), child: InputDecorator(
      decoration: InputDecoration(labelText: label, suffixIcon: const Icon(LucideIcons.calendar, size: 18, color: K.ink2)),
      child: Text(day(value), style: const TextStyle(fontSize: 14))));
}
