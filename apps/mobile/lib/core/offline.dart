import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'api.dart';
import 'session.dart';

/// The demo backend inside the app: with OFFLINE=true the app needs no server. It answers every call the student
/// screens make from data recorded off the real API (assets/offline/fixtures.json, written by
/// scripts/record-offline-fixtures.mjs) and changes that data the way the server would when the student acts.
/// Staff are played by the clock: a warden, the mess or the office "acts" a few seconds after the student.
/// Everything lives in memory: closing the app starts the demo again from the recorded state.
class Offline {
  static final Offline instance = Offline._();
  Offline._();

  /// Seconds between one staff step and the next.
  static var staffSeconds = 8;

  Map<String, dynamic>? _f;
  final _worlds = <String, Map<String, dynamic>>{};
  final _later = <_Later>[];
  final _flow = <String, Map<String, dynamic>>{}; // per student: where a registration or renewal stands
  final _recharges = <int, num>{}; // demand id -> amount
  var _seq = 9000;

  String? _as; // the student a delayed staff step belongs to
  String get _me => _as ?? SessionStore.instance.current?.id ?? '';
  Map<String, dynamic> get _w => _worlds.putIfAbsent(_me, () => _copy((_f!['students'] as Map)[_me] ?? {}) as Map<String, dynamic>);
  Map<String, dynamic> get _tpl => _f!['tpl'] as Map<String, dynamic>;
  Map<String, dynamic> get _my => _flow.putIfAbsent(_me, () => {});

  static dynamic _copy(dynamic v) => v == null ? null : jsonDecode(jsonEncode(v));
  static num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
  static String _money(num v) => v.toStringAsFixed(2);
  String _now([int plusSeconds = 0]) {
    final d = DateTime.now().add(Duration(seconds: plusSeconds));
    String p(int v, [int w = 2]) => v.toString().padLeft(w, '0');
    return '${p(d.year, 4)}-${p(d.month)}-${p(d.day)} ${p(d.hour)}:${p(d.minute)}:${p(d.second)}+05:30';
  }
  String get _today => _now().substring(0, 10);
  Never _fail(int status, String message) => throw ApiError(status, message);

  Future<void> _load() async {
    if (_f != null) return;
    _f = jsonDecode(await rootBundle.loadString('assets/offline/fixtures.json')) as Map<String, dynamic>;
    for (final s in (_f!['students'] as Map).values) { _openMeals(s as Map, thin: true); }
  }

  /// Starts the signed-in student's demo again from the recorded state.
  void reset() { _worlds.remove(_me); _flow.remove(_me); _later.removeWhere((l) => l.student == _me); }
  /// Lets every waiting staff step happen now.
  void hurry() { for (var i = 0; i < _later.length; i++) { _later[i] = _Later(_later[i].student, DateTime.now(), _later[i].run); } }

  /// One call from the app. [method] is GET, POST, PUT or DELETE; [path] is the API path with its query.
  Future<dynamic> handle(String method, String path, Object? body) async {
    await _load();
    await Future<void>.delayed(const Duration(milliseconds: 220)); // feels like a network, and lets spinners show
    _tick();
    final b = (body is Map ? body : const {});
    if (path == '/auth/demo-accounts') return _copy(_f!['accounts']);
    if (path == '/auth/demo-login') {
      final u = (_f!['logins'] as Map)['${b['username']}'.trim()];
      if (u == null || b['password'] != (_f!['accounts'] as Map)['password_hint']) _fail(401, 'The username or password is not right');
      return _copy(u);
    }
    if (_me.isEmpty) _fail(401, 'Sign in first');
    if (method == 'GET') return _get(path);
    return _copy(_write(method, path, b));
  }

  dynamic _get(String path) {
    final w = _w;
    if (w.containsKey(path)) return _copy(w[path]);
    var m = RegExp(r'^/outpasses/(\d+)(/qr)?$').firstMatch(path);
    if (m != null) {
      final o = _find('/outpasses/mine', 'outpass_id', m[1]!);
      if (m[2] == null) return _copy(o);
      return {..._copy((_tpl['outing'] as Map)['qr']) as Map, 'outpass_no': o['outpass_no'], 'status': o['status'], 'leave_from': o['leave_from'], 'return_by': o['return_by']};
    }
    m = RegExp(r'^/sick-leaves/(\d+)$').firstMatch(path);
    if (m != null) return _copy(_find('/sick-leaves/mine', 'sick_leave_id', m[1]!));
    if (path.startsWith('/allotment/catalogue')) return _copy(w['/allotment/catalogue'] ?? []);
    if (path == '/me/wallet') return _copy(w['/me/wallet'] ?? {'balance': 0, 'txns': []});
    if (path == '/me/payment-proofs') return _copy(w['/me/payment-proofs'] ?? []);
    if (path.startsWith('/me/room-change/beds')) return [];
    _fail(404, 'Not available yet');
  }

  Map _find(String listPath, String key, String id, [String? inside]) {
    final src = _w[listPath];
    final list = (inside == null ? src : (src as Map?)?[inside]) as List? ?? const [];
    for (final x in list) { if ('${(x as Map)[key]}' == id) return x; }
    _fail(404, 'Not found');
  }

  // ------------------------------------------------------------------ the clock plays the staff
  void _after(int steps, void Function() run) => _later.add(_Later(_me, DateTime.now().add(Duration(seconds: steps * staffSeconds)), run));
  void _tick() {
    final now = DateTime.now();
    final due = _later.where((l) => !l.at.isAfter(now)).toList()..sort((a, b) => a.at.compareTo(b.at));
    _later.removeWhere((l) => !l.at.isAfter(now));
    for (final l in due) {
      _as = l.student; // a step belongs to the student who started it, whoever is signed in now
      try { l.run(); } catch (_) {/* the record it acted on is gone */}
      _as = null;
    }
  }
  void _notify(String subject, String text, [String type = 'General']) {
    final list = _w.putIfAbsent('/notifications', () => <dynamic>[]) as List;
    list.insert(0, {'notification_id': ++_seq, 'channel': 'In_App', 'template_code': 'DEMO', 'subject': subject, 'body': text, 'related_type': type, 'related_id': null,
      'queued_at': _now(), 'sent_at': _now(), 'delivery_status': 'Sent'});
  }

  // ------------------------------------------------------------------ writes
  dynamic _write(String method, String path, Map b) {
    RegExpMatch? m;
    if (path == '/payments/orders') return {'mode': 'dev', 'demand_id': b['demand_id'], 'amount': _balanceOf(b['demand_id']), 'currency': 'INR'};
    if (path == '/payments/dev-confirm') return _pay((b['demand_id'] as num).toInt());
    if ((m = RegExp(r'^/meters/(\d+)/recharge$').firstMatch(path)) != null) return _recharge(_n(b['amount']));

    if (path == '/me/payment-proofs') return _proof(b);
    if (path == '/me/wallet/pay') {
      final ids = ((b['demand_ids'] as List?) ?? []).map((x) => (x as num).toInt()).toList();
      final total = ids.fold<num>(0, (a, id) => a + _balanceOf(id));
      final wallet = _w.putIfAbsent('/me/wallet', () => {'balance': 0, 'txns': <dynamic>[]}) as Map;
      if (_n(wallet['balance']) < total) _fail(422, 'The wallet holds ₹${_n(wallet['balance']).toStringAsFixed(0)} but ₹${total.toStringAsFixed(0)} is needed');
      wallet['balance'] = _n(wallet['balance']) - total;
      (wallet['txns'] as List).insert(0, {'txn_id': ++_seq, 'kind': 'Debit', 'amount': total, 'reason': 'Fees paid from the wallet', 'created_at': _now()});
      for (final id in ids) { _pay(id); }
      return _copy(wallet);
    }
    if (path == '/outpasses') return _outing(b);
    if ((m = RegExp(r'^/outpasses/(\d+)/cancel$').firstMatch(path)) != null) {
      final o = _find('/outpasses/mine', 'outpass_id', m![1]!);
      o['status'] = 'Cancelled'; o['qr_token'] = null;
      return o;
    }
    if (path == '/sick-leaves') return _sick(b);
    if ((m = RegExp(r'^/sick-leaves/(\d+)/close$').firstMatch(path)) != null) {
      final l = _find('/sick-leaves/mine', 'sick_leave_id', m![1]!);
      l['status'] = 'Closed'; l['closed_on'] = _today;
      return l;
    }
    if (path == '/me/tickets') return _ticket(b);
    if ((m = RegExp(r'^/me/tickets/(\d+)/confirm$').firstMatch(path)) != null) {
      final t = _find('/me/tickets', 'ticket_id', m![1]!, 'tickets');
      final fixed = b['fixed'] == true;
      if (t['status'] != 'Resolved') _fail(422, 'You can confirm once the repair is reported done');
      t['status'] = fixed ? 'Closed' : 'Reopened'; t['student_confirmed'] = fixed; t['verified_at'] = _now();
      (t['events'] as List).add({'ticket_id': t['ticket_id'], 'action': 'Confirmed', 'event_at': _now(), 'note': fixed ? (b['note'] ?? 'Fixed') : 'Not fixed${b['note'] != null ? ': ${b['note']}' : ''}', 'by': 'Student'});
      if (!fixed) {
        final id = '${t['ticket_id']}';
        _after(2, () { final x = _find('/me/tickets', 'ticket_id', id, 'tickets'); x['status'] = 'Resolved'; x['resolved_date'] = _now();
          (x['events'] as List).add({'ticket_id': x['ticket_id'], 'action': 'Closure_Report', 'event_at': _now(), 'note': 'Checked again and repaired.', 'by': 'Maint Supervisor'});
          _notify('Repair done again', 'Your ticket #$id was repaired again. Please confirm.', 'Ticket'); });
      }
      return {'ticket_id': t['ticket_id'], 'status': t['status']};
    }
    if (path == '/me/mess-grievances') return _messGrievance(b);
    if (path == '/me/grievances') {
      final g = {..._copy((_tpl['grievance'] as Map)['open']) as Map, 'grievance_id': ++_seq, 'category': b['category'], 'description': b['description'], 'is_confidential': b['is_confidential'] == true, 'raised_at': _now(), 'status': 'Open'};
      (_w.putIfAbsent('/me/grievances', () => <dynamic>[]) as List).insert(0, g);
      final id = '${g['grievance_id']}';
      _after(2, () { final x = _find('/me/grievances', 'grievance_id', id); x['status'] = 'In_Review'; x['assigned_name'] = 'Floor Manager'; _notify('Your complaint is being looked into', 'The Floor Manager has taken up your complaint.', 'Grievance'); });
      return {'grievance_id': g['grievance_id']};
    }
    if (path == '/me/meal-ratings') return _rate(b);
    if ((m = RegExp(r'^/me/meal-choices/(\d+)(/fill)?$').firstMatch(path)) != null) return _mealChoice(m![1]!, m[2] != null, b);
    if (path == '/me/food') return _food(method == 'DELETE' ? null : b);
    if (path == '/me/career-goal') { _w['/me/career-goal'] = {'goal': b['goal'], 'notes': b['notes'], 'stated_on': _now()}; return _w['/me/career-goal']; }
    if (path == '/me/certifications' || path == '/me/achievements') {
      final key = path.endsWith('certifications') ? 'certs' : 'achievements';
      final row = {...b, 'id': ++_seq, 'verified': false};
      ((_w['/students/$_me/360'] as Map?)?[key] as List?)?.insert(0, row);
      return row;
    }
    if ((m = RegExp(r'^/students/[^/]+/contacts$').firstMatch(path)) != null) {
      final c = {'contact_id': ++_seq, 'student_id': _me, 'relation': b['relation'], 'contact_name': b['contact_name'], 'mobile_no': b['mobile_no'], 'is_verified': false, 'verified_on': null, 'is_outpass_approver': false, 'status': 'Active', 'created_at': _now()};
      final s = _w['/students/$_me'] as Map; s['contacts'] = [...(s['contacts'] as List? ?? []), c];
      return c;
    }
    if ((m = RegExp(r'^/contacts/(\d+)/(verify|outpass-approver)$').firstMatch(path)) != null) {
      final list = ((_w['/students/$_me'] as Map)['contacts'] as List? ?? []).cast<Map>();
      final c = list.firstWhere((x) => '${x['contact_id']}' == m![1], orElse: () => _fail(404, 'Contact not found'));
      if (m![2] == 'verify') { c['is_verified'] = true; c['verified_on'] = _now(); }
      else { if (c['is_verified'] != true) _fail(422, 'Verify the number first'); for (final x in list) { x['is_outpass_approver'] = identical(x, c); } }
      return c;
    }
    if (path == '/me/room-change') return _roomChange(b);
    if ((m = RegExp(r'^/me/room-change/(\d+)/cancel$').firstMatch(path)) != null) {
      final id = m![1]!;
      final q = _find('/me/room-change', 'change_id', id, 'requests');
      q['status'] = 'Cancelled'; q['waiting_for'] = null;
      (_w['/room-changes/$id'] as Map?)?['status'] = 'Cancelled';
      return q;
    }

    // ---- registration and renewal: the recorded stages of the real flow ----
    if (path == '/me/renewal') return _renewChoose(b);
    if (path == '/registrations') return _apply(b);
    if ((m = RegExp(r'^/registrations/(\d+)/(keep-room|fee-plan|choose)$').firstMatch(path)) != null) {
      switch (m![2]) {
        case 'keep-room': _stage('renewal', 'kept'); return {'offer_id': 1};
        case 'choose': return _chooseBed('${b['subspace_id']}');
        default:
          _my['plan'] = b['plan_type'];
          _stage(_my['kind'] as String? ?? 'registration', 'planned');
          return {'plan': {'plan_type': b['plan_type']}, 'demands': (_w['/students/$_me/demands'] as Map)['demands']};
      }
    }
    if (RegExp(r'^/offers/\d+/decision$').hasMatch(path)) return {'decision': b['decision']};
    return {}; // anything else is accepted as done
  }

  // ------------------------------------------------------------------ money
  num _balanceOf(dynamic demandId) {
    for (final d in ((_w['/students/$_me/demands'] as Map?)?['demands'] as List? ?? [])) { if ('${(d as Map)['demand_id']}' == '$demandId') return _n(d['amount_due']) - _n(d['amount_paid']); }
    return 0;
  }
  /// Marks a demand paid wherever it appears, writes the receipt, and moves on whatever was waiting for the money.
  dynamic _pay(int demandId) {
    final fees = _w['/students/$_me/demands'] as Map?;
    Map? demand;
    void walk(dynamic v) {
      if (v is Map) {
        if ('${v['demand_id']}' == '$demandId' && v.containsKey('amount_due')) { v['amount_paid'] = v['amount_due']; v['status'] = 'Paid'; demand ??= v; }
        v.values.forEach(walk);
      } else if (v is List) { v.forEach(walk); }
    }
    walk(_w);
    if (demand == null) _fail(404, 'Demand not found');
    final amount = _n(demand!['amount_due']);
    final receipt = {'receipt_id': ++_seq, 'receipt_no': 'RC-2026-0${_seq.toString().padLeft(4, '0')}', 'demand_id': demandId, 'fee_head': demand!['fee_head'], 'instalment_no': demand!['instalment_no'],
      'reference_type': demand!['reference_type'], 'amount': _money(amount), 'paid_on': _now(), 'payment_mode': 'UPI', 'gateway_ref': 'demo_${demandId}_$_seq', 'gateway_status': 'Success', 'collected_by': null};
    if (fees != null) {
      (fees.putIfAbsent('receipts', () => <dynamic>[]) as List).insert(0, receipt);
      _totals(fees);
    }
    // an electricity bill paid by its demand
    final bills = _w['/me/electricity-bills'] as Map?;
    if (bills != null) {
      for (final x in (bills['bills'] as List? ?? [])) { if ('${(x as Map)['demand_id']}' == '$demandId') { x['paid'] = x['amount']; x['status'] = 'Paid'; x['overdue'] = false; } }
      final list = (bills['bills'] as List? ?? []).cast<Map>();
      final billed = list.fold<num>(0, (a, x) => a + _n(x['amount'])), paid = list.fold<num>(0, (a, x) => a + _n(x['paid']));
      bills['totals'] = {'billed': billed, 'paid': paid, 'due': billed - paid};
    }
    Map? recharge;
    if (_recharges.containsKey(demandId)) {
      final meter = _w['/meters/mine'] as Map;
      final units = _recharges.remove(demandId)! / (_n(meter['rate_per_unit']) == 0 ? 8.5 : _n(meter['rate_per_unit']));
      recharge = {..._copy(((_tpl['recharge'] as Map)['paid'] as Map)['recharge']) as Map, 'recharge_id': ++_seq, 'receipt_id': receipt['receipt_id'], 'units_credited': _money(units), 'created_at': _now(), 'status': 'Paid'};
      meter['recharged_this_month'] = _money(_n(meter['recharged_this_month']) + units);
      meter['units_left'] = _money(_n(meter['units_left']) + units);
      (meter['recharges'] as List).insert(0, recharge);
    }
    _notify('Payment received', '₹${amount.toStringAsFixed(0)} received for ${'${demand!['fee_head']}'.replaceAll('_', ' ')}. Receipt ${receipt['receipt_no']}.', 'Receipt');
    _moneyMoved();
    return {'receipt': receipt, 'recharge': ?recharge};
  }
  void _totals(Map fees) {
    final by = <String, Map<String, dynamic>>{};
    for (final d in (fees['demands'] as List? ?? []).cast<Map>()) {
      if (d['status'] == 'Waived' || d['status'] == 'Cancelled') continue;
      final t = by.putIfAbsent('${d['fee_head']}', () => {'student_id': _me, 'fee_head': d['fee_head'], 'demands': 0, 'amount_due': 0, 'amount_paid': 0, 'balance': 0, 'earliest_due': null});
      t['demands'] = (t['demands'] as int) + 1;
      t['amount_due'] = _n(t['amount_due']) + _n(d['amount_due']); t['amount_paid'] = _n(t['amount_paid']) + _n(d['amount_paid']);
      t['balance'] = _n(t['amount_due']) - _n(t['amount_paid']);
      if (d['status'] != 'Paid' && (t['earliest_due'] == null || '${d['due_date']}'.compareTo('${t['earliest_due']}') < 0)) t['earliest_due'] = d['due_date'];
    }
    fees['totals'] = [for (final t in by.values) {...t, 'amount_due': _money(_n(t['amount_due'])), 'amount_paid': _money(_n(t['amount_paid'])), 'balance': _money(_n(t['balance']))}];
  }
  dynamic _recharge(num amount) {
    if (amount < 50) _fail(422, 'The least you can recharge is ₹50');
    final d = {..._copy(((_tpl['recharge'] as Map)['created'] as Map)['demand']) as Map, 'demand_id': ++_seq, 'student_id': _me, 'amount_due': _money(amount), 'amount_paid': '0.00', 'status': 'Pending', 'due_date': _today, 'created_at': _now()};
    final fees = _w['/students/$_me/demands'] as Map;
    (fees['demands'] as List).add(d);
    _recharges[d['demand_id'] as int] = amount;
    return {'demand': d, 'order': {'mode': 'dev', 'demand_id': d['demand_id'], 'amount': amount, 'currency': 'INR'}};
  }
  /// Whether everything the registration or renewal asked for is paid (other dues of a hostel student do not hold it up).
  bool get _allPaid {
    final Map? box = (_my['kind'] == 'renewal' ? _w['/me/renewal'] : _w['/students/$_me/demands']) as Map?;
    final list = box?['demands'];
    return (list as List? ?? []).every((d) => !['Pending', 'Part_Paid', 'Overdue'].contains((d as Map)['status']) || d['reference_type'] == 'meter_recharge');
  }

  // ------------------------------------------------------------------ registration and renewal
  Map<String, dynamic> get _flowData {
    final kind = _my['kind'];
    if (kind == 'renewal') return (_f!['renewal'] as Map)['${_my['choice']}${_my['choice'] == 'Keep' ? '|${_my['plan'] ?? 'Two_Instalments'}' : ''}'] as Map<String, dynamic>;
    return (_f!['registration'] as Map)['${_my['variant']}|${_my['plan'] ?? 'Two_Instalments'}'] as Map<String, dynamic>;
  }
  /// Puts the recorded answers of [stage] in place; a new student's own bed replaces the recorded one.
  void _stage(String kind, String stage) {
    _my['kind'] = kind; _my['stage'] = stage;
    final data = _flowData;
    var snap = data[stage];
    if (snap == null) return;
    if (_my['swap'] != null) {
      var text = jsonEncode(snap);
      for (final e in (_my['swap'] as Map<String, String>).entries) { text = text.replaceAll(e.key, e.value); }
      snap = jsonDecode(text);
    }
    if (stage == 'checkedIn') {
      final keep = _w['/notifications'];
      _worlds[_me] = _copy(snap) as Map<String, dynamic>;
      if (keep != null) _w['/notifications'] = keep;
      _openMeals(_w);
    } else {
      (_copy(snap) as Map<String, dynamic>).forEach((k, v) => _w[k] = v);
    }
  }
  /// Next week's meals are open to choose, as on a normal Monday to Thursday; [thin] leaves some still to pick.
  void _openMeals(Map w, {bool thin = false}) {
    final weeks = (w['/me/meal-choices'] as Map?)?['weeks'] as List?;
    if (weeks == null || weeks.isEmpty) return;
    final x = weeks.last as Map;
    x['is_open'] = true; x['status'] = 'Published'; x['closed_at'] = null; x['choices_close_at'] = _now(3 * 86400);
    if (!thin) return;
    final all = (x['choices'] as List? ?? []);
    x['choices'] = [for (var i = 0; i < all.length; i++) if (i % 3 != 0) all[i]];
  }
  /// After any payment: a registration fee paid opens the room choice; the whole plan paid sends it to the office.
  void _moneyMoved() {
    final kind = _my['kind'], stage = _my['stage'];
    if (kind == null) return;
    if (kind == 'registration' && stage == 'applied') {
      final reg = ((_w['/students/$_me/demands'] as Map)['demands'] as List).cast<Map>().where((d) => d['fee_head'] == 'Registration');
      if (reg.every((d) => d['status'] == 'Paid' || d['status'] == 'Waived')) _stage('registration', 'feePaid');
      return;
    }
    if (stage != 'planned' || !_allPaid) return;
    final receipts = _copy((_w['/students/$_me/demands'] as Map)['receipts']);
    _stage(kind as String, 'paid');
    (_w['/students/$_me/demands'] as Map)['receipts'] = receipts;
    final k = kind;
    _after(1, () {
      final r = _copy((_w['/students/$_me/demands'] as Map)['receipts']);
      _stage(k, 'checked'); (_w['/students/$_me/demands'] as Map)['receipts'] = r;
      _notify('Fees verified', k == 'renewal' ? 'Room Allotment verified your fees and the Chief Manager approved your renewal.' : 'Room Allotment verified your fees and the Chief Manager approved your room. Come to the hostel office to check in.', 'Registration');
    });
    if (k == 'registration') {
      _after(3, () { _stage(k, 'checkedIn'); _notify('Welcome to the hostel', 'You are checked in. Your room, key, mess and electricity meter are ready in the app.', 'Registration'); });
    }
  }
  dynamic _renewChoose(Map b) {
    final choice = '${b['choice']}';
    _my..['kind'] = 'renewal'..['choice'] = choice..remove('plan');
    _stage('renewal', 'chosen');
    if (choice != 'Leave') _notify('Renewal started', choice == 'Keep' ? 'Confirm your room for next year, then choose the fee plan.' : 'You asked for another room next year. The office offers a bed when one is free.', 'Registration');
    return {'choice': choice};
  }
  dynamic _apply(Map b) {
    final variant = '${b['facility_id']}|${b['room_type_id']}';
    if (!(_f!['registration'] as Map).containsKey('$variant|Two_Instalments')) _fail(422, 'This room type is not open for registration in the demo');
    _my..['kind'] = 'registration'..['variant'] = variant..remove('plan')..remove('swap');
    _stage('registration', 'applied');
    final reg = (_w['/registrations/mine'] as List).first as Map;
    _notify('Application received', '${reg['registration_no']}: pay the registration fee to choose your room.', 'Registration');
    return _copy(reg);
  }
  dynamic _chooseBed(String subspace) {
    final data = _flowData;
    final recorded = '${data['bed']}';
    // the recorded flow took one bed; show the bed this student tapped instead
    Map? bed, room;
    final choices = _w.entries.where((e) => e.key.endsWith('/choices')).map((e) => e.value).whereType<Map>().firstOrNull;
    for (final r in (choices?['rooms'] as List? ?? []).cast<Map>()) { for (final x in (r['beds'] as List).cast<Map>()) { if (x['subspace_id'] == subspace) { bed = x; room = r; } } }
    if (bed == null) _fail(422, 'That bed is not open');
    if (bed['bed_status'] != 'Vacant') _fail(422, 'Bed is ${bed['bed_status']} and cannot be chosen');
    Map? rBed, rRoom;
    for (final r in (choices?['rooms'] as List? ?? []).cast<Map>()) { for (final x in (r['beds'] as List).cast<Map>()) { if (x['subspace_id'] == recorded) { rBed = x; rRoom = r; } } }
    if (rBed != null && subspace != recorded) {
      _my['swap'] = <String, String>{
        recorded: subspace,
        '${rRoom!['space_id']}-${rBed['bed_code']}': '${room!['space_id']}-${bed['bed_code']}',
        '"${rRoom['space_id']}"': '"${room['space_id']}"',
        '"room_code":"${rRoom['room_code']}"': '"room_code":"${room['room_code']}"',
        '"bed_code":"${rBed['bed_code']}"': '"bed_code":"${bed['bed_code']}"',
      };
    }
    _stage('registration', 'chosen');
    return {'subspace_id': subspace};
  }

  // ------------------------------------------------------------------ daily life
  /// A receipt from the university portal: the Floor Manager checks it, then the Chief Manager approves it and the fees are paid.
  dynamic _proof(Map b) {
    final list = _w.putIfAbsent('/me/payment-proofs', () => <dynamic>[]) as List;
    if (list.any((p) => ['Uploaded', 'Checked'].contains((p as Map)['status']))) _fail(422, 'A receipt of yours is still being checked. Wait for it before uploading another.');
    final ids = ((b['demand_ids'] as List?) ?? []).map((x) => (x as num).toInt()).toList();
    final p = {'proof_id': ++_seq, 'proof_no': 'PP-2026-0${_seq.toString().padLeft(4, '0')}', 'amount': _n(b['amount']), 'paid_on': b['paid_on'], 'reference': b['reference'], 'photo': b['photo'],
      'status': 'Uploaded', 'remarks': null, 'created_at': _now(), 'decided_on': null,
      'demands': [for (final id in ids) for (final d in ((_w['/students/$_me/demands'] as Map?)?['demands'] as List? ?? []).cast<Map>()) if (d['demand_id'] == id) {'demand_id': id, 'fee_head': d['fee_head'], 'instalment_no': d['instalment_no'], 'amount_due': _n(d['amount_due']), 'amount_paid': _n(d['amount_paid']), 'status': d['status']}],
      'steps': <dynamic>[]};
    list.insert(0, p);
    final id = '${p['proof_id']}';
    _notify('Receipt received', 'Your receipt for ₹${_n(b['amount']).toStringAsFixed(0)} is with the Floor Manager for checking.', 'Payment_Proof');
    _after(1, () { final x = _find('/me/payment-proofs', 'proof_id', id); x['status'] = 'Checked'; _notify('Receipt checked', 'The Floor Manager checked your receipt ${x['proof_no']}. It now waits for the Chief Manager.', 'Payment_Proof'); });
    _after(2, () {
      final x = _find('/me/payment-proofs', 'proof_id', id);
      num rest = _n(x['amount']), paid = 0;
      for (final did in ids) { final bal = _balanceOf(did); if (bal <= 0 || rest <= 0) continue; _pay(did); rest -= bal; paid += bal; }
      if (rest > 0) {
        final wallet = _w.putIfAbsent('/me/wallet', () => {'balance': 0, 'txns': <dynamic>[]}) as Map;
        wallet['balance'] = _n(wallet['balance']) + rest;
        (wallet['txns'] as List).insert(0, {'txn_id': ++_seq, 'kind': 'Credit', 'amount': rest, 'reason': paid > 0 ? 'Paid beyond the dues on receipt ${x['proof_no']}' : 'Money added with receipt ${x['proof_no']}', 'created_at': _now()});
      }
      x['status'] = 'Approved'; x['decided_on'] = _now();
      _notify('Payment approved', 'Receipt ${x['proof_no']} is approved: ₹${paid.toStringAsFixed(0)} set against your fees${rest > 0 ? ' and ₹${rest.toStringAsFixed(0)} added to your wallet' : ''}.', 'Payment_Proof');
    });
    return {'proof_id': p['proof_id'], 'proof_no': p['proof_no'], 'status': 'Uploaded'};
  }

  dynamic _outing(Map b) {
    final mine = _w.putIfAbsent('/outpasses/mine', () => <dynamic>[]) as List;
    if (mine.any((o) => ['Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved', 'Approved', 'Out', 'Overdue'].contains((o as Map)['status']))) _fail(422, 'You already have an outing open. One outing at a time.');
    if (!(_w.containsKey('/me/room') && _w['/me/room'] != null)) _fail(422, 'Outings open after you check in to the hostel');
    final t = _tpl['outing'] as Map;
    final from = DateTime.tryParse('${b['leave_from']}'), to = DateTime.tryParse('${b['return_by']}');
    final sameDay = from != null && to != null && from.year == to.year && from.month == to.month && from.day == to.day;
    final o = {..._copy((t['applied'] as Map)['mine']) as Map, 'outpass_id': ++_seq, 'outpass_no': 'OP-2026-0${_seq.toString().padLeft(4, '0')}', 'student_id': _me,
      'full_name': (_w['/students/$_me'] as Map?)?['full_name'], 'reason': b['reason'], 'destination': b['destination'], 'leave_from': b['leave_from'], 'return_by': b['return_by'],
      'contact_during_leave': b['contact_during_leave'], 'outing_category': sameDay ? 'Same_Day' : 'Overnight', 'applied_on': _now(), 'status': 'Applied', 'qr_token': null};
    mine.insert(0, o);
    final id = '${o['outpass_id']}';
    void step(String stage, String subject, String text) {
      final x = _find('/outpasses/mine', 'outpass_id', id);
      if (x['status'] == 'Cancelled') return;
      final s = (t[stage] as Map)['mine'] as Map;
      x['status'] = s['status']; x['qr_token'] = s['qr_token'];
      x['steps'] = [for (final st in (_copy(s['steps']) as List).cast<Map>()) {...st, if (st['on'] != null) 'on': _now()}];
      _notify(subject, text, 'Outpass');
    }
    _after(1, () => step('l1', 'Outing: Floor Manager approved', '${o['outpass_no']} to ${o['destination']} now waits for the Chief Manager.'));
    _after(2, () => step('approved', 'Outing approved', '${o['outpass_no']} is approved. Your QR gate pass is ready under Outings.'));
    return o;
  }
  dynamic _sick(Map b) {
    final mine = _w.putIfAbsent('/sick-leaves/mine', () => <dynamic>[]) as List;
    final t = _tpl['sick'] as Map;
    final l = {..._copy((t['applied'] as Map)['detail']) as Map, 'sick_leave_id': ++_seq, 'student_id': _me, 'illness_details': b['illness_details'], 'from_date': b['from_date'], 'to_date': b['to_date'],
      'applied_on': _now(), 'created_at': _now(), 'extended_from_id': b['extended_from_id'], 'status': 'Applied', 'deliveries': <dynamic>[]};
    mine.insert(0, l);
    final id = '${l['sick_leave_id']}';
    void step(String stage, String subject, String text) {
      final x = _find('/sick-leaves/mine', 'sick_leave_id', id);
      if (x['status'] == 'Closed') return;
      final s = (t[stage] as Map)['detail'] as Map;
      for (final k in ['status', 'visited_by', 'visit_remarks', 'room_meals_required', 'approved_by', 'diet', 'diet_note']) { x[k] = s[k]; }
      x['visited_at'] = _now();
      x['steps'] = [for (final st in (_copy(s['steps']) as List).cast<Map>()) {...st, if (st['decided_on'] != null) 'decided_on': _now()}];
      if (stage == 'approved') x['deliveries'] = [for (final d in (_copy(s['deliveries']) as List? ?? []).cast<Map>()) {...d, 'sick_leave_id': x['sick_leave_id'], 'meal_date': _today}];
      _notify(subject, text, 'Sick_Leave');
    }
    _after(1, () => step('recommended', 'Sick leave: the Floor Manager visited', 'Your Floor Manager saw you and chose liquid food for you.'));
    _after(2, () => step('approved', 'Sick leave approved', 'Meals come to your room until the leave ends.'));
    return l;
  }
  dynamic _ticket(Map b) {
    final box = _w['/me/tickets'] as Map?;
    if (box == null) _fail(422, 'Repairs open after you check in to the hostel');
    final item = (box['items'] as List).cast<Map>().firstWhere((i) => i['item_code'] == b['item_code'], orElse: () => _fail(422, 'Pick what is wrong'));
    final t = _tpl['ticket'] as Map;
    final id = ++_seq;
    Map shape(String stage) {
      final s = _copy(t[stage]) as Map;
      final stay = box['stay'] as Map? ?? {};
      return {...s, 'ticket_id': id, 'area': item['area'], 'item_code': item['item_code'], 'item_label': item['label'], 'category_id': item['category_id'], 'category_name': item['category_name'],
        'description': b['description'], 'location_note': b['location_note'], 'priority': item['priority'], 'facility_id': stay['facility_id'], 'hostel_code': stay['hostel_code'],
        'space_id': item['area'] == 'Room' ? stay['space_id'] : null, 'space_code': item['area'] == 'Room' ? '${stay['bed_label'] ?? ''}'.split('-').skip(1).take(1).join() : null,
        'raised_by': _me, 'late': false, 'work_not_done': false};
    }
    final first = shape('reported');
    final raised = _now();
    first['raised_date'] = raised; first['deadline_at'] = _now(((item['sla_hours'] as num?) ?? 24).toInt() * 3600);
    first['events'] = [{'ticket_id': id, 'action': 'Raised', 'event_at': raised, 'note': item['label'], 'by': 'Student'}];
    (box['tickets'] as List).insert(0, first);
    void step(String stage, String subject, String text) {
      final x = _find('/me/tickets', 'ticket_id', '$id', 'tickets');
      final s = shape(stage);
      final had = (x['events'] as List).length;
      final more = [for (final e in (s['events'] as List).skip(had).cast<Map>()) {...e, 'ticket_id': id, 'event_at': _now(), if (e['action'] == 'Verified' && item['area'] == 'Mess') 'by': 'Mess Incharge'}];
      for (final k in ['status', 'l1_decision', 'l1_remarks', 'l1_by_name', 'assigned_to', 'assigned_name', 'closure_report', 'resolution_notes']) { x[k] = s[k]; }
      if (s['l1_at'] != null) x['l1_at'] ??= _now();
      if (s['resolved_date'] != null) x['resolved_date'] = _now();
      (x['events'] as List).addAll(more);
      _notify(subject, text, 'Ticket');
    }
    _after(1, () => step('verified', 'Ticket checked: genuine', '#$id ${item['label']} was checked and sent for repair.'));
    _after(2, () => step('started', 'Repair started', 'The repair team has started on #$id ${item['label']}.'));
    _after(3, () => step('resolved', 'Repair done', '#$id ${item['label']} is reported repaired. Please confirm under Repairs.'));
    return {'ticket_id': id};
  }
  dynamic _messGrievance(Map b) {
    final box = _w['/me/mess-grievances'] as Map?;
    if (box == null || box['mess'] == null) _fail(422, 'You are not taking meals in a hostel mess');
    final t = _tpl['messGrievance'] as Map;
    final g = {..._copy(t['open']) as Map, 'feedback_id': ++_seq, 'meal_date': b['meal_date'], 'slot': b['slot'], 'aspect': b['aspect'], 'rating': b['rating'], 'details': b['details'], 'submitted_at': _now(), 'status': 'Open'};
    (box['grievances'] as List).insert(0, g);
    final id = '${g['feedback_id']}';
    _after(1, () {
      final x = _find('/me/mess-grievances', 'feedback_id', id, 'grievances'), r = t['replied'] as Map;
      x['status'] = r['status']; x['action_taken'] = 'Sorry about the ${'${x['slot']}'.replaceAll('_', ' ').toLowerCase()}. The cook has been told and the dish is checked before serving from today.';
      x['action_by_name'] = r['action_by_name']; x['closed_at'] = _now();
      _notify('The mess replied to your complaint', '${x['action_taken']}', 'Mess');
    });
    return {'feedback_id': g['feedback_id']};
  }
  dynamic _rate(Map b) {
    final rating = (b['rating'] as num?)?.toInt() ?? 0;
    final comment = b['comment'] as String?;
    final low = RegExp(r'cold|bad|salt|raw|stale|oily|watery|undercook|burnt|not good|worst|hair|smell', caseSensitive: false).hasMatch(comment ?? '');
    final sentiment = rating >= 4 && !low ? 'Positive' : rating <= 2 || low ? 'Negative' : 'Neutral';
    for (final d in ((_w['/me/meal-ratings'] as Map?)?['days'] as List? ?? []).cast<Map>()) {
      for (final m in (d['meals'] as List).cast<Map>()) {
        for (final x in (m['dishes'] as List).cast<Map>()) {
          if (x['date'] == b['meal_date'] && x['meal'] == b['meal'] && x['dish'] == b['dish']) { x['rating'] = rating; x['comment'] = comment; x['sentiment'] = sentiment; }
        }
      }
    }
    return {'rating': rating, 'comment': comment, 'sentiment': sentiment};
  }
  dynamic _mealChoice(String weekId, bool fill, Map b) {
    final data = _w['/me/meal-choices'] as Map?;
    final w = (data?['weeks'] as List? ?? []).cast<Map>().firstWhere((x) => '${x['week_id']}' == weekId, orElse: () => _fail(404, 'Week not found'));
    if (w['is_open'] != true) _fail(422, 'Choices for this week are closed');
    final choices = w['choices'] as List;
    if (!fill) {
      choices.removeWhere((c) => (c as Map)['day_no'] == b['day_no'] && c['meal'] == b['meal'] && c['course_code'] == b['course_code']);
      final c = {'day_no': b['day_no'], 'meal': b['meal'], 'course_code': b['course_code'], 'option_id': b['option_id'], 'source': 'Student'};
      choices.add(c);
      return c;
    }
    // "fill the rest for me": one dish of my food style for every course still empty
    final me = data!['me'] as Map? ?? {};
    final cuisine = b['cuisine'] ?? me['cuisine'], diet = b['diet'] ?? me['diet'];
    final seen = {for (final c in choices.cast<Map>()) '${c['day_no']}|${c['meal']}|${c['course_code']}'};
    var n = 0;
    for (final o in (w['options'] as List).cast<Map>()) {
      final k = '${o['day_no']}|${o['meal']}|${o['course_code']}';
      if (seen.contains(k)) continue;
      if (o['cuisine'] != null && cuisine != null && o['cuisine'] != cuisine && o['cuisine'] != 'Both') continue;
      if (diet == 'Veg' && o['diet'] != 'Veg') continue;
      seen.add(k); n++;
      choices.add({'day_no': o['day_no'], 'meal': o['meal'], 'course_code': o['course_code'], 'option_id': o['option_id'], 'source': 'Student'});
    }
    return {'filled': n};
  }
  dynamic _food(Map? b) {
    final menu = _w['/me/menu'] as Map?;
    final me = menu?['me'] as Map?;
    if (me == null) _fail(422, 'You are not taking meals in a hostel mess');
    if (b == null) {
      me['pending_change_id'] = null; me['change_from'] = null; me['next_region'] = me['region']; me['next_diet'] = me['diet']; me['next_country'] = me['country']; me['next_title'] = me['menu_title'];
      return {};
    }
    final region = '${b['region']}';
    me['pending_change_id'] = ++_seq; me['change_from'] = menu!['next_monday']; me['next_region'] = region; me['next_diet'] = b['diet']; me['next_country'] = b['country'];
    me['next_title'] = '${me['hostel_gender']} · ${region == 'International' ? b['country'] : '$region Indian'} · ${b['diet'] == 'Veg' ? 'Veg' : 'Non-veg'}';
    return {'pending_change_id': me['pending_change_id']};
  }
  dynamic _roomChange(Map b) {
    final box = _w['/me/room-change'] as Map?;
    final t = _tpl['roomChange'] as Map?;
    if (box == null || t == null) _fail(422, 'You can ask for another room once you live in a hostel');
    final requests = box['requests'] as List;
    if (requests.any((q) => ['Pending_FW', 'Pending_CW', 'Approved'].contains((q as Map)['status']))) _fail(422, 'You already have a room change request open');
    final type = (box['types'] as List).cast<Map>().firstWhere((x) => x['room_type_id'] == b['to_room_type_id'], orElse: () => _fail(422, 'Choose the room type'));
    final stay = box['stay'] as Map;
    final beds = (_w['/me/room-change/beds?type=${b['to_room_type_id']}'] as List? ?? []).cast<Map>();
    final bed = beds.where((x) => x['subspace_id'] == b['to_subspace_id']).firstOrNull;
    final id = ++_seq, no = 'RCH-2026-0${_seq.toString().padLeft(4, '0')}';
    final statement = _w['/me/room-change/preview?type=${b['to_room_type_id']}'];
    Map shape(String stage, String part) => {..._copy((t[stage] as Map)[part]) as Map, 'change_id': id, 'change_no': no, 'student_id': _me, 'kind': b['kind'], 'reason': b['reason'], 'requested_at': _now(),
      'from_bed': stay['bed_label'], 'from_floor': stay['floor_name'], 'from_type': stay['type_name'], 'to_bed': bed?['bed_label'], 'to_floor': bed?['floor_name'], 'to_subspace_id': b['to_subspace_id'],
      'to_room_type_id': b['to_room_type_id'], 'to_type': type['type_name'], 'statement': ?statement};
    requests.insert(0, shape('pendingFw', 'request'));
    _w['/room-changes/$id'] = shape('pendingFw', 'detail');
    void step(String stage, String subject, String text) {
      final i = requests.indexWhere((q) => (q as Map)['change_id'] == id);
      if (i < 0 || (requests[i] as Map)['status'] == 'Cancelled') return;
      requests[i] = shape(stage, 'request'); _w['/room-changes/$id'] = shape(stage, 'detail');
      _notify(subject, text, 'Room_Change');
    }
    _after(1, () => step('pendingCw', 'Room change: Floor Manager approved', '$no now waits for the Chief Manager.'));
    _after(2, () => step('approved', 'Room change approved', '$no is approved. The office moves you on the day and settles the fees.'));
    return {'change_id': id, 'change_no': no};
  }
}

class _Later {
  final String student;
  final DateTime at;
  final void Function() run;
  _Later(this.student, this.at, this.run);
}
