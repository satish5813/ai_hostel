// Takes a screenshot of every student screen, signed in as a demo student, for the student guide.
// iOS:     SHOT_DIR=../../docs/mobile-screens/ios     flutter drive --driver=test_driver/integration_test.dart --target=integration_test/screenshots_test.dart -d <simulator>
// Android: SHOT_DIR=../../docs/mobile-screens/android flutter drive ... -d <emulator>   (needs the API on port 4100)
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:klu_hostels/core/api.dart';
import 'package:klu_hostels/core/session.dart';
import 'package:klu_hostels/main.dart';
import 'package:klu_hostels/shell.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('student screens', (tester) async {
    Future<void> wait(int s) async { for (var i = 0; i < s * 4; i++) { await tester.pump(const Duration(milliseconds: 250)); } }
    await SessionStore.instance.signOut();
    await SessionStore.instance.load();
    KluHostelsApp.splash = Duration.zero;
    runApp(const KluHostelsApp());
    if (Platform.isAndroid) await binding.convertFlutterSurfaceToImage();
    await wait(4);
    await binding.takeScreenshot('00-sign-in');

    final r = await Api.instance.post('/auth/demo-login', {'username': '2600040012', 'password': 'Demo@2026'});
    await SessionStore.instance.signIn(Session(id: r['id'], role: r['role'], name: r['name'] ?? ''));
    await wait(4);
    final shell = tester.state<ShellState>(find.byType(Shell));
    var n = 1;
    for (final p in places) {
      shell.open(p.key);
      await wait(4);
      await binding.takeScreenshot('${(n++).toString().padLeft(2, '0')}-${p.key}');
    }
    // the side menu, opened from the bottom bar
    shell.open('home');
    await wait(2);
    await tester.tap(find.text('Menu').last);
    await wait(2);
    await binding.takeScreenshot('${n.toString().padLeft(2, '0')}-menu');
  });
}
