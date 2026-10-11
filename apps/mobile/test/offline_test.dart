// The demo backend inside the app (OFFLINE=true): every student flow, start to end, with no server.
import 'package:flutter_test/flutter_test.dart';
import 'package:klu_hostels/core/offline.dart';
import 'package:klu_hostels/core/session.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final o = Offline.instance;
  Offline.staffSeconds = 0; // staff act at once
  Future<dynamic> get(String p) => o.handle('GET', p, null);
  Future<dynamic> post(String p, [Map? b]) => o.handle('POST', p, b ?? {});
  void signIn(String id) => SessionStore.instance.current = Session(id: id, role: 'Student', name: '');
  const open = ['Pending', 'Part_Paid', 'Overdue'];

  test('sign in', () async {
    final acc = await get('/auth/demo-accounts');
    expect((acc['accounts'] as List).length, 3);
    expect((await post('/auth/demo-login', {'username': '2600040012', 'password': acc['password_hint']}))['role'], 'Student');
    await expectLater(post('/auth/demo-login', {'username': '2600040012', 'password': 'x'}), throwsA(anything));
  });

  test('a resident: every page loads and every action works', () async {
    const me = '2600040012';
    signIn(me);
    for (final p in ['/students/$me', '/students/$me/demands', '/students/$me/360', '/me/room', '/me/renewal', '/registrations/mine', '/meters/mine', '/me/electricity-bills', '/outpasses/mine',
      '/sick-leaves/mine', '/me/tickets', '/me/grievances', '/me/mess-grievances', '/me/caution', '/me/health', '/me/menu', '/me/meal-choices', '/me/meal-ratings', '/notifications', '/me/room-change', '/allotment/catalogue']) {
      expect(await get(p), isNotNull, reason: p);
    }
    // pay a fee
    var fees = await get('/students/$me/demands');
    final due = (fees['demands'] as List).firstWhere((d) => open.contains(d['status']));
    final receipts = (fees['receipts'] as List).length;
    expect((await post('/payments/orders', {'demand_id': due['demand_id']}))['mode'], 'dev');
    await post('/payments/dev-confirm', {'demand_id': due['demand_id'], 'amount': 1});
    fees = await get('/students/$me/demands');
    expect((fees['demands'] as List).firstWhere((d) => d['demand_id'] == due['demand_id'])['status'], 'Paid');
    expect((fees['receipts'] as List).length, receipts + 1);
    // recharge
    final meter = await get('/meters/mine');
    final rc = await post('/meters/${meter['meter_id']}/recharge', {'amount': 500});
    await post('/payments/dev-confirm', {'demand_id': rc['demand']['demand_id'], 'amount': 500});
    expect(double.parse((await get('/meters/mine'))['units_left']), greaterThan(double.parse(meter['units_left'])));
    // outing: ask, Floor Warden, Chief Warden, QR, then a second one is refused
    final out = await post('/outpasses', {'reason': 'Wedding', 'destination': 'Vijayawada', 'leave_from': '2026-10-11T09:00:00', 'return_by': '2026-10-12T18:00:00', 'contact_during_leave': '9848012345'});
    expect(out['status'], 'Applied');
    final live = ((await get('/outpasses/mine')) as List).first;
    expect(live['status'], 'Approved');
    expect(live['destination'], 'Vijayawada');
    expect((await get('/outpasses/${live['outpass_id']}/qr'))['png_data_url'], startsWith('data:image/png'));
    await expectLater(post('/outpasses', {'reason': 'x', 'destination': 'y'}), throwsA(anything));
    await post('/outpasses/${live['outpass_id']}/cancel');
    expect(((await get('/outpasses/mine')) as List).first['status'], 'Cancelled');
    // sick leave
    final sick = await post('/sick-leaves', {'illness_details': 'Fever', 'from_date': '2026-10-10', 'to_date': '2026-10-11'});
    var leave = await get('/sick-leaves/${sick['sick_leave_id']}');
    expect(leave['status'], 'Approved');
    expect(leave['diet'], 'Liquid');
    await post('/sick-leaves/${sick['sick_leave_id']}/close');
    expect((await get('/sick-leaves/${sick['sick_leave_id']}'))['status'], 'Closed');
    // repair
    final t = await post('/me/tickets', {'item_code': 'R-FAN', 'description': 'Noisy fan', 'location_note': null});
    Future<Map> ticket() async => ((await get('/me/tickets'))['tickets'] as List).firstWhere((x) => x['ticket_id'] == t['ticket_id']);
    expect((await ticket())['status'], 'Resolved');
    await post('/me/tickets/${t['ticket_id']}/confirm', {'fixed': true, 'note': null});
    expect((await ticket())['status'], 'Closed');
    // complaints
    await post('/me/mess-grievances', {'meal_date': '2026-10-10', 'slot': 'Lunch', 'aspect': 'Quality', 'details': 'Sambar was watery today', 'rating': 2});
    final g = ((await get('/me/mess-grievances'))['grievances'] as List).first;
    expect(g['action_taken'], isNotNull);
    await post('/me/grievances', {'category': 'Room_Mate', 'description': 'Loud music at night', 'is_confidential': false});
    expect(((await get('/me/grievances')) as List).first['description'], 'Loud music at night');
    // meals
    final dish = ((await get('/me/meal-ratings'))['days'] as List).first['meals'][0]['dishes'][0];
    await o.handle('PUT', '/me/meal-ratings', {'meal_date': dish['date'], 'meal': dish['meal'], 'dish': dish['dish'], 'rating': 5, 'comment': null});
    expect(((await get('/me/meal-ratings'))['days'] as List).first['meals'][0]['dishes'][0]['rating'], 5);
    final week = ((await get('/me/meal-choices'))['weeks'] as List).last;
    expect(week['is_open'], true);
    final opt = (week['options'] as List).first;
    await o.handle('PUT', '/me/meal-choices/${week['week_id']}', {'day_no': opt['day_no'], 'meal': opt['meal'], 'course_code': opt['course_code'], 'option_id': opt['option_id']});
    await post('/me/meal-choices/${week['week_id']}/fill', {});
    await post('/me/food', {'region': 'North', 'diet': 'Veg', 'country': null});
    expect((await get('/me/menu'))['me']['pending_change_id'], isNotNull);
    // room change
    final rcg = await get('/me/room-change');
    final type = (rcg['types'] as List).firstWhere((x) => x['room_type_id'] != rcg['stay']['room_type_id']);
    final beds = await get('/me/room-change/beds?type=${type['room_type_id']}') as List;
    final c = await post('/me/room-change', {'kind': 'Room_Type', 'to_room_type_id': type['room_type_id'], 'to_subspace_id': beds.isEmpty ? null : beds.first['subspace_id'], 'reason': 'Roommates study late'});
    expect((await get('/room-changes/${c['change_id']}'))['status'], 'Approved');
    // contacts
    final nc = await post('/students/$me/contacts', {'relation': 'Guardian', 'contact_name': 'Ravi', 'mobile_no': '9000000001'});
    await post('/contacts/${nc['contact_id']}/verify', {'otp': '000000'});
    expect(((await get('/students/$me'))['contacts'] as List).last['is_verified'], true);
    // a receipt from the portal, then the wallet
    final due2 = (await get('/students/$me/demands'))['demands'] as List;
    final want = due2.where((d) => open.contains(d['status'])).map((d) => d['demand_id']).toList();
    final pr = await post('/me/payment-proofs', {'demand_ids': want, 'amount': 99999, 'paid_on': '2026-10-11', 'reference': 'TXN1', 'photo': 'data:image/png;base64,AAAA'});
    expect(pr['status'], 'Uploaded');
    // (with staff acting at once the first receipt is already approved, so a second upload is allowed)
    final proofs = await get('/me/payment-proofs') as List;
    expect(proofs.first['status'], 'Approved');
    expect(((await get('/students/$me/demands'))['demands'] as List).where((d) => open.contains(d['status']) && d['reference_type'] != 'meter_recharge'), isEmpty);
    expect((await get('/me/wallet'))['balance'], greaterThan(0));
    final rc2 = await post('/meters/${meter['meter_id']}/recharge', {'amount': 100});
    await post('/me/wallet/pay', {'demand_ids': [rc2['demand']['demand_id']]});
    expect(((await get('/me/wallet'))['txns'] as List).first['kind'], 'Debit');
    expect(((await get('/notifications')) as List).first['template_code'], 'DEMO');
  });

  for (final plan in ['Two_Instalments', 'Single']) {
    test('renewal, keep my room, $plan', () async {
      const me = '2600042205';
      signIn(me);
      o.reset();
      expect((await get('/me/renewal'))['renewal'], isNull);
      await post('/me/renewal', {'choice': 'Keep'});
      var rn = await get('/me/renewal');
      expect(rn['renewal']['status'], 'Fee_Paid');
      await post('/registrations/${rn['renewal']['registration_id']}/keep-room');
      rn = await get('/me/renewal');
      expect(rn['renewal']['status'], 'Accepted');
      await post('/registrations/${rn['renewal']['registration_id']}/fee-plan', {'plan_type': plan, 'cuisine': 'South_Indian'});
      rn = await get('/me/renewal');
      final dues = (rn['demands'] as List).where((d) => open.contains(d['status'])).toList();
      expect(dues.length, plan == 'Single' ? 3 : 4);
      for (final d in dues) { await post('/payments/dev-confirm', {'demand_id': d['demand_id'], 'amount': 1}); }
      rn = await get('/me/renewal');
      expect(rn['renewal']['status'], 'Confirmed');
      expect(rn['renewal']['fee_check_status'], 'Verified');
      expect(rn['renewal']['cw_status'], 'Approved');
    });
  }

  test('renewal: another room, and leaving', () async {
    signIn('2600042205');
    o.reset();
    await post('/me/renewal', {'choice': 'Change', 'facility_id': 'H-BH2', 'room_type_id': 1});
    expect((await get('/me/renewal'))['renewal']['retain_subspace_id'], isNull);
    o.reset();
    await post('/me/renewal', {'choice': 'Leave'});
    expect((await get('/me/renewal'))['current']['next_year_intent'], 'Leave');
  });

  test('a new student registers, pays, picks a bed and is checked in', () async {
    const me = '2600040011';
    signIn(me);
    o.reset();
    expect(await get('/registrations/mine'), isEmpty);
    final cat = await get('/allotment/catalogue') as List;
    for (final h in cat) {
      for (final t in h['types'] as List) {
        o.reset();
        final reg = await post('/registrations', {'facility_id': h['facility_id'], 'room_type_id': t['room_type_id'], 'rules_accepted': true});
        expect(reg['status'], 'Applied');
        Future<void> payAll() async { for (final d in ((await get('/students/$me/demands'))['demands'] as List).where((d) => open.contains(d['status']))) { await post('/payments/dev-confirm', {'demand_id': d['demand_id'], 'amount': 1}); } }
        Offline.staffSeconds = 3600; // keep the office away until we look
        await payAll();
        final id = reg['registration_id'];
        expect((await get('/registrations/$id'))['status'], 'Fee_Paid');
        final beds = [for (final r in (await get('/registrations/$id/choices'))['rooms'] as List) for (final b in r['beds'] as List) if (b['bed_status'] == 'Vacant') (r, b)];
        final (room, bed) = beds.last; // not the bed the recording took
        await post('/registrations/$id/choose', {'subspace_id': bed['subspace_id']});
        expect((await get('/registrations/$id'))['subspace_id'], bed['subspace_id']);
        await post('/registrations/$id/fee-plan', {'plan_type': 'Two_Instalments', 'cuisine': 'South_Indian'});
        await payAll();
        expect((await get('/registrations/$id'))['status'], 'Confirmed');
        Offline.staffSeconds = 0;
        o.hurry();
        final mine = await get('/me/room');
        expect(mine['bed_label'], '${room['space_id']}-${bed['bed_code']}', reason: '${h['facility_id']} ${t['type_name']}');
        expect((await get('/registrations/$id'))['status'], 'Checked_In');
        expect(await get('/me/tickets'), isNotNull);
      }
    }
  });
}
