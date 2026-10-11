// Captures every student screen (with its scrolled pages) and the guided stories for the HTML demo.
// It submits real requests, so run it against a COPY of the database:
//   SHOT_DIR=<out> flutter drive --driver=test_driver/integration_test.dart --target=integration_test/stories_test.dart \
//     --dart-define=API_BASE=http://localhost:4101 -d <device>        (Android emulator: http://10.0.2.2:4101)
// Each screenshot prints a line "SHOT|<file>|<caption>" that the demo builder reads.
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:integration_test/integration_test.dart';
import 'package:klu_hostels/core/api.dart';
import 'package:klu_hostels/core/config.dart';
import 'package:klu_hostels/core/session.dart';
import 'package:klu_hostels/core/widgets.dart' show LucideIcons;
import 'package:klu_hostels/main.dart';
import 'package:klu_hostels/shell.dart';

const student = '2600040012', newStudent = '2600040011', renewStudent = '2600042205';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('screens and stories', (tester) async {
    Future<void> wait([double s = 2]) async { for (var i = 0; i < s * 4; i++) { await tester.pump(const Duration(milliseconds: 250)); } }
    var story = '', n = 0;
    Future<void> shot(String caption) async {
      final name = '$story-${(n++).toString().padLeft(2, '0')}';
      await wait(.5);
      await binding.takeScreenshot(name);
      // ignore: avoid_print
      print('SHOT|$name|$caption');
    }
    void begin(String s) { story = s; n = 0; }

    /// A staff member acting on the web portal, behind the scenes.
    Future<dynamic> staff(String user, String role, String method, String path, [Object? body]) async {
      final h = {'Content-Type': 'application/json', 'x-dev-user': user, 'x-dev-role': role};
      final u = Uri.parse('${Config.apiBase}/api$path');
      final r = method == 'GET' ? await http.get(u, headers: h) : await http.post(u, headers: h, body: jsonEncode(body ?? {}));
      // ignore: avoid_print
      if (r.statusCode >= 300) print('STAFF-FAIL|$user $method $path|${r.statusCode} ${r.body}');
      return r.body.isEmpty ? null : jsonDecode(r.body);
    }
    Future<void> approve(String user, String role, String type, Object id) async {
      final inbox = (await staff(user, role, 'GET', '/approvals/inbox') as List?) ?? [];
      for (final s in inbox.where((s) => '${s['request_id']}' == '$id' && '${s['request_type']}'.contains(type))) {
        await staff(user, role, 'POST', '/approvals/${s['step_id']}/decide', {'decision': 'Approved'});
      }
    }

    Finder vis(Finder f) => f.hitTestable();
    /// The page's own vertical scroll (the one with the most to scroll).
    ScrollPosition? scroller() {
      ScrollPosition? best;
      for (final e in vis(find.byType(Scrollable)).evaluate()) {
        final p = (e as StatefulElement).state as ScrollableState;
        if (p.position.axis != Axis.vertical) continue;
        if (best == null || p.position.maxScrollExtent > best.maxScrollExtent) best = p.position;
      }
      return best;
    }
    Future<bool> tap(Pattern text, {int i = 0, bool last = false, double settle = 1.5, bool seek = true}) async {
      var f = text is String ? find.text(text) : find.textContaining(text);
      if (f.evaluate().isEmpty && text is String) f = find.textContaining(text);
      if (f.evaluate().isEmpty && seek) {
        final p0 = scroller();
        if (p0 != null) {
          p0.jumpTo(0); await wait(.5);
          for (var k = 0; k < 16 && f.evaluate().isEmpty && p0.pixels < p0.maxScrollExtent - 2; k++) {
            p0.jumpTo((p0.pixels + p0.viewportDimension * .45).clamp(0, p0.maxScrollExtent)); await wait(.5);
          }
        }
      }
      if (f.evaluate().isEmpty) {
        // ignore: avoid_print
        print('MISS|$story|$text'); return false;
      }
      final one = last ? f.last : f.at(min(i, f.evaluate().length - 1));
      try { await tester.ensureVisible(one); await wait(.5); } catch (_) {}
      await tester.tap(one, warnIfMissed: false);
      await wait(settle);
      return true;
    }
    Future<void> type(int field, String text) async {
      final f = vis(find.byType(TextField));
      if (f.evaluate().length <= field) {
        // ignore: avoid_print
        print('MISS|$story|field $field'); return;
      }
      await tester.enterText(f.at(field), text);
      await wait(.5);
    }
    Future<void> pickTomorrow() async {
      final d = find.descendant(of: find.byType(DatePickerDialog), matching: find.text('${DateTime.now().add(const Duration(days: 1)).day}'));
      if (d.evaluate().isNotEmpty) { await tester.tap(d.first, warnIfMissed: false); await wait(1); }
    }
    Future<void> hideKeyboard() async { FocusManager.instance.primaryFocus?.unfocus(); await wait(.5); }

    Future<void> scrollBy(double f) async {
      final p = scroller(); if (p == null) return;
      p.jumpTo((p.pixels + p.viewportDimension * f).clamp(0, p.maxScrollExtent)); await wait(1);
    }
    Future<void> toTop() async { scroller()?.jumpTo(0); await wait(.5); }
    Future<void> refresh() async {
      await toTop();
      final size = tester.view.physicalSize / tester.view.devicePixelRatio;
      await tester.dragFrom(Offset(size.width / 2, size.height * .3), Offset(0, size.height * .4));
      await wait(3);
    }
    Future<void> signInAs(String id) async {
      await SessionStore.instance.signOut();
      await wait(1);
      final r = await Api.instance.post('/auth/demo-login', {'username': id, 'password': 'Demo@2026'});
      await SessionStore.instance.signIn(Session(id: r['id'], role: r['role'], name: r['name'] ?? ''));
      await wait(4);
    }
    ShellState shell() => tester.state<ShellState>(find.byType(Shell));
    Future<void> go(String key) async { shell().open(key); await wait(3); }
    Future<void> closeSheet() async { if (find.byTooltip('Close').evaluate().isNotEmpty) { await tester.tap(find.byTooltip('Close').last, warnIfMissed: false); await wait(1); } }
    Future<void> guard(String name, Future<void> Function() body) async {
      begin(name);
      try { await body(); } catch (e) {
        // ignore: avoid_print
        print('STORY-FAIL|$name|${'$e'.split('\n').first}');
      }
      for (var i = 0; i < 3; i++) { await closeSheet(); }
    }

    // ---------- start ----------
    await SessionStore.instance.signOut();
    await SessionStore.instance.load();
    KluHostelsApp.splash = Duration.zero;
    runApp(const KluHostelsApp());
    if (Platform.isAndroid) await binding.convertFlutterSurfaceToImage();
    await wait(4);
    begin('p-sign-in'); await shot('Sign in');
    await signInAs(student);

    // ---------- every place, top to bottom ----------
    for (final p in places) {
      await go(p.key);
      begin('p-${p.key}');
      await toTop();
      await shot(p.label);
      for (var page = 0; page < 5; page++) {
        final s = scroller();
        if (s == null || s.pixels >= s.maxScrollExtent - 4) break;
        await scrollBy(.78);
        await shot('${p.label}, scrolled');
      }
      await toTop();
    }

    // ---------- academic record: the tabs ----------
    await guard('s-academics', () async {
      await go('academics');
      for (final t in ['Academics', 'CRT', 'Skills', 'Activities', 'Hostel']) {
        if (await tap(t)) await shot('$t tab');
      }
    });

    // ---------- mess menu: another day ----------
    await guard('s-menu', () async {
      await go('mess_menu');
      await shot('Today is selected');
      await tap('Sun'); await shot('Tap another day to see its meals');
    });

    // ---------- rate my meals ----------
    await guard('s-rate', () async {
      await go('rate_meals');
      await shot('Open Rate my meals. Dishes you ate are listed');
      final stars = vis(find.byIcon(LucideIcons.star));
      await tester.tap(stars.at(5), warnIfMissed: false); await wait(1.5);
      await shot('Tap the stars: 5 for the first dish');
      await tester.tap(vis(find.byIcon(LucideIcons.star)).at(8), warnIfMissed: false); await wait(1.5);
      await shot('3 stars for the next dish');
      final say = vis(find.byIcon(LucideIcons.messageSquare));
      if (say.evaluate().isNotEmpty) {
        await tester.tap(say.at(1), warnIfMissed: false); await wait(1.5);
        await type(0, 'Idli was cold today');
        await shot('Tap the speech bubble to add a comment');
        await hideKeyboard();
        if (!await tap('Save')) await tester.testTextInput.receiveAction(TextInputAction.done);
        await wait(1); await toTop(); await shot('The rating and comment are saved. Nobody sees your name');
      }
    });

    // ---------- choose my meals ----------
    await guard('s-meals', () async {
      await go('meal_choice');
      await shot('Open Choose my meals');
      await tap('Next week'); await toTop(); await shot('Tap the next week. Choosing closes on Thursday night');
      await scrollBy(.45); await shot('Each meal lists the dishes. A tick marks the one chosen for you');
      await scrollBy(.6); await shot('Lunch, snacks and dinner follow');
    });

    // ---------- outing: ask, approval, QR pass ----------
    await guard('s-outing', () async {
      await go('outings');
      await shot('Open Outings');
      await tap('Ask for outing permission'); await shot('Tap Ask for outing permission. The form opens');
      await type(0, "Sister's wedding at home"); await type(1, 'Vijayawada');
      await hideKeyboard();
      await tap('dd/mm/yyyy, --:--'); await shot('Leaving: pick the date');
      await tap('OK'); await shot('Then the time');
      await tap('OK');
      await tap('dd/mm/yyyy, --:--');
      await pickTomorrow(); await shot('Back by: pick the return date');
      await tap('OK'); await tap('OK');
      await type(2, '9848012345'); await hideKeyboard();
      await shot('Reason, place, times and phone filled in');
      await scrollBy(1); await shot('Scroll down to Submit request');
      await tap('Submit request', settle: 3); await shot('Request submitted');
      await tap('Done'); await refresh(); await shot('The outing waits for approval');
      await tap('See status'); await shot('See status: Floor Warden first, then Chief Warden. No gate pass yet');
      await closeSheet();
      final mine = (await Api.instance.get('/outpasses/mine')) as List;
      final id = mine.firstWhere((o) => !['Returned', 'Rejected', 'Cancelled'].contains(o['status']))['outpass_id'];
      await approve('S-FW', 'Floor_Warden', 'Out', id);
      await refresh(); await tap('See status'); await shot('The Floor Warden has approved. Now the Chief Warden');
      await closeSheet();
      await approve('S-CW', 'Chief_Warden', 'Out', id);
      await refresh(); await shot('Approved. The pass is ready');
      await tap('Show pass', settle: 3); await shot('Your QR gate pass. Show it at the gate going out and coming back');
      await scrollBy(1); await shot('Pass details');
    });

    // ---------- sick leave ----------
    await guard('s-sick', () async {
      await go('sick_leave');
      await shot('Open Sick leave');
      await type(0, 'Fever and headache since last night'); await hideKeyboard();
      await tap('dd/mm/yyyy'); await shot('From: pick the date');
      await tap('OK');
      await tap('dd/mm/yyyy');
      await pickTomorrow(); await tap('OK');
      await shot('What is wrong and the dates filled in');
      await tap('Report sick leave', settle: 3); await shot('Reported. Your Floor Warden will come and see you');
      await toTop(); await shot('The leave waits for the Floor Warden');
      final mine = (await Api.instance.get('/sick-leaves/mine')) as List;
      final id = mine.first['sick_leave_id'];
      await staff('S-FW', 'Floor_Warden', 'POST', '/sick-leaves/$id/visit', {'visit_remarks': 'Fever confirmed, resting', 'diet': 'Liquid', 'diet_note': 'No spice'});
      await approve('S-FW', 'Floor_Warden', 'Sick', id);
      await refresh(); await shot('The Floor Warden visited and chose a light diet');
      await approve('S-WD', 'Warden', 'Sick', id); await approve('S-CW', 'Chief_Warden', 'Sick', id);
      await refresh(); await shot('Approved. Meals now come to your room');
      await scrollBy(.7); await shot('Ask for more days, or tap I am well now');
    });

    // ---------- complaint about a meal ----------
    await guard('s-complaint', () async {
      await go('complaints');
      await shot('Open Complaints');
      await tap('A problem with a meal'); await shot('Tap A problem with a meal');
      await tap('Lunch'); await tap('Taste or quality'); await tap('★★');
      await type(0, 'Sambar was watery and the rice was undercooked'); await hideKeyboard();
      await shot('Pick the day, meal and what was wrong, and describe it');
      await tap('Send to the mess', settle: 3); await shot('Sent. It shows Waiting for reply');
      final g = await Api.instance.get('/me/mess-grievances') as Map;
      final list = (g['grievances'] ?? g['mine'] ?? []) as List;
      final open = list.where((x) => x['status'] == 'Open').toList();
      if (open.isNotEmpty) {
        await staff('S-MS', 'Mess_Incharge', 'POST', '/mess-ops/grievances/${open.first['feedback_id']}/reply',
            {'action_taken': 'Sorry about lunch. The cook has been told; sambar is being checked before serving from today.', 'close': true});
      }
      await refresh(); await scrollBy(.6); await shot('The mess replied. The reply is in green');
    });

    // ---------- repair ticket ----------
    await guard('s-repair', () async {
      await go('repairs');
      await shot('Open Repairs');
      await tap('My room'); await shot('Tap My room and pick what is wrong');
      await tap(RegExp('Fan')); await shot('Pick the item');
      await type(0, 'Fan makes a loud noise and runs slowly since Monday'); await hideKeyboard();
      await shot('Describe the problem');
      await tap('Raise ticket', settle: 3); await shot('Ticket raised');
      await toTop(); await scrollBy(.6); await shot('The ticket is in your list: Reported');
      final mine = await Api.instance.get('/me/tickets');
      final list = (mine is Map ? (mine['tickets'] ?? []) : mine) as List;
      final id = list.map((t) => t['ticket_id'] as int).reduce(max);
      await staff('S-FW', 'Floor_Warden', 'POST', '/repair-desk/$id/verify', {'genuine': true, 'remarks': 'Checked in the room'});
      await staff('S-MT', 'Maintenance_Supervisor', 'POST', '/repair-desk/$id/start');
      await staff('S-MT', 'Maintenance_Supervisor', 'POST', '/repair-desk/$id/resolve', {'report': 'Capacitor replaced; fan tested at all speeds.'});
      await refresh(); await tap('Is it fixed?', settle: .5); await scrollBy(-.45); await shot('Checked by the Floor Warden and repaired by maintenance. Is it fixed?');
      if (await tap('Yes, it is fixed', settle: 3)) { await shot('Tap Yes, it is fixed. The ticket is closed'); }
    });

    // ---------- electricity recharge ----------
    await guard('s-recharge', () async {
      await go('electricity');
      await shot('Open Electricity. The ring shows units left');
      await tap('₹500'); await shot('Choose an amount: ₹500');
      await tap(RegExp(r'^Pay ₹500'), settle: 4); await shot('Paid. Units are credited to the meter');
      await toTop(); await shot('Units left has gone up');
    });

    // ---------- pay a fee, see the receipt ----------
    await guard('s-pay', () async {
      await go('fees');
      await shot('Open Fees. One demand is overdue');
      await tap(RegExp(r'^Pay ₹'), settle: 4); await shot('Tap Pay. The fee is paid online');
      await toTop(); await shot('Outstanding has come down');
      await scrollBy(.9); await shot('Scroll down to Receipts');
      await scrollBy(.9); await shot('Every payment has a receipt');
      if (await tap(RegExp(r'^RC-|^HR/|^R-'))) await shot('Tap a receipt to open it');
    });

    // ---------- change room ----------
    await guard('s-change', () async {
      await go('change_room');
      await shot('Open Change room');
      await tap('Another room type'); await shot('Tap Another room type');
      await tap('4-sharing non-AC', last: true); await shot('Pick the room type. The fee difference is shown');
      await tap(RegExp('^Bed '), settle: 1); await shot('Pick a bed, or leave it to the Chief Warden');
      await type(0, 'My roommate studies late at night; I would like a room with more students to share costs.'); await hideKeyboard();
      await tap('What it means for your fees', settle: .5); await shot('What the move does to your fees and electricity');
      await scrollBy(.7); await shot('The rest of the statement');
      if (await tap('Send to my Floor Warden', settle: 3)) {
        await toTop(); await shot('Request sent. It waits for the Floor Warden');
        final rc = await Api.instance.get('/me/room-change') as Map;
        final cur = ((rc['requests'] as List?) ?? []).cast<Map>().where((x) => '${x['status']}'.startsWith('Pending')).firstOrNull;
        if (cur != null) {
          await approve('S-FW', 'Floor_Warden', 'Room', cur['change_id']);
          await refresh(); await shot('The Floor Warden has approved. Now the Chief Warden');
          await approve('S-CW', 'Chief_Warden', 'Room', cur['change_id']);
          await refresh(); await shot('Approved by the Chief Warden too');
          await scrollBy(.7); await shot('The office moves you on the day; fees are settled then');
        }
      }
    });

    // ---------- renewal already under way (asked for another room) ----------
    await guard('s-renew', () async {
      await go('home');
      await shot('Home shows where your renewal for next year stands');
      await tap('Open'); await shot('Tap Open: the six steps, and what happens next');
    });

    // ---------- profile: photo and contacts ----------
    await guard('s-profile', () async {
      await go('profile');
      await shot('Open Profile');
      await tap('Add photo'); await shot('Tap Add photo');
    });

    // ---------- renewal from the start: keep my room ----------
    await guard('s-renewal', () async {
      await signInAs(renewStudent);
      await go('home'); await shot('A resident signs in. Home asks: stay with us next year?');
      await tap('Renew my room'); await shot('Tap Renew my room. Three choices: keep the bed, move, or leave');
      await tap('Move to another room', settle: 3); await shot('Move to another room: choose a hostel and room type');
      await tap('I am not staying'); await shot('I am not staying: the bed is released, nothing to pay');
      await tap(RegExp('^Keep '), settle: 1); await shot('Keep my bed: same bed and key, no registration fee or deposits');
      await tap(RegExp('^Renew [A-Z]'), settle: 4, seek: false); await shot('Renewal started. Next: confirm the room for next year');
      await tap('Confirm my room', settle: 4, seek: false); await shot('Room confirmed. Next: how to pay, and the mess');
      await tap('In two instalments'); await tap('South Indian'); await shot('Choose one payment or two instalments, and the mess');
      await tap('Confirm fee plan', settle: 4, seek: false); await shot('The fees for next year: hostel, meter charge and mess');
      await tap(RegExp(r'^Pay ₹'), last: true, settle: 8, seek: false); await shot('Paid. The office now checks the fees');
      final rn = await Api.instance.get('/me/renewal') as Map;
      final id = (rn['renewal'] as Map)['registration_id'];
      await staff('E2001', 'Chief_Warden', 'POST', '/registrations/$id/fee-check', {'decision': 'Verified'});
      await staff('E2001', 'Chief_Warden', 'POST', '/registrations/$id/cw-decision', {'decision': 'Approved'});
      await closeSheet(); await refresh(); await shot('Home: all paid; the office moves you into the new year');
      await tap('Open'); await shot('Fee check verified and Chief Warden approved. You stay on from the first day of the new year');
      await closeSheet();
      await go('fees'); await scrollBy(.9); await shot('The receipts are under Fees');
    });

    // ---------- a new student registers ----------
    await guard('s-register', () async {
      await signInAs(newStudent);
      await go('home'); await shot('A new student signs in. Home asks them to apply');
      await go('room'); await shot('Room and registration: choose a hostel');
      await tap('Girls Hostel 1'); await shot('Tap a hostel. Its room types appear with fees and open beds');
      await tap(RegExp(r'^\d+ open$')); await shot('Tap a room type');
      await tap(RegExp('I accept the hostel rules')); await shot('Accept the hostel rules');
      await tap(RegExp('^Apply for '), settle: 4); await toTop(); await shot('Applied. Next: pay the registration fee');
      await tap(RegExp(r'^Pay ₹'), settle: 5); await toTop(); await shot('Registration fee paid. Next: choose your room');
      await scrollBy(.4); await shot('Rooms with open beds');
      final beds = vis(find.text('B'));
      if (beds.evaluate().isNotEmpty) { await tester.tap(beds.first, warnIfMissed: false); await wait(1); }
      await tap('Take this bed', settle: 2); await shot('Tap an open bed, then Take this bed');
      await tap(RegExp('^Take '), last: true, settle: 4, seek: false); await toTop(); await shot('The bed is yours. Next: fee plan and mess');
      await tap('Two instalments'); await tap('South Indian'); await shot('Choose single payment or two instalments, and your food');
      await tap('Confirm plan', settle: 4); await toTop(); await shot('Fees are ready to pay');
      for (var k = 0; k < 6; k++) { if (!await tap(RegExp(r'^Pay ₹'), settle: 4, seek: k == 0)) break; }
      await toTop(); await shot('Fees paid. Go to the hostel office to check in and collect your key');
      await scrollBy(.6); await shot('Everything you paid');
    });

    await signInAs(student);
  });
}
