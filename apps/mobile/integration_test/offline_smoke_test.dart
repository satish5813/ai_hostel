// The demo build (OFFLINE=true) on a device: sign in from the list, open every place, and walk an outing to its QR pass.
//   SHOT_DIR=<out> flutter drive --driver=test_driver/integration_test.dart --target=integration_test/offline_smoke_test.dart --dart-define=OFFLINE=true -d <device>
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:klu_hostels/core/offline.dart';
import 'package:klu_hostels/core/session.dart';
import 'package:klu_hostels/core/widgets.dart' show ErrorView;
import 'package:klu_hostels/main.dart';
import 'package:klu_hostels/shell.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('offline demo', (tester) async {
    Future<void> wait([double s = 2]) async { for (var i = 0; i < s * 4; i++) { await tester.pump(const Duration(milliseconds: 250)); } }
    Offline.staffSeconds = 2;
    await SessionStore.instance.signOut();
    await SessionStore.instance.load();
    KluHostelsApp.splash = Duration.zero;
    runApp(const KluHostelsApp());
    if (Platform.isAndroid) await binding.convertFlutterSurfaceToImage();
    await wait(3);
    final arjun = find.textContaining('Arjun Reddy');
    await tester.ensureVisible(arjun.first); await wait(1);
    await binding.takeScreenshot('off-00-sign-in');
    await tester.tap(arjun.first); await wait(4);
    final shell = tester.state<ShellState>(find.byType(Shell));
    final broken = <String>[];
    for (final p in places) {
      shell.open(p.key); await wait(2.5);
      if (find.byType(ErrorView).evaluate().isNotEmpty || find.text('Try again').evaluate().isNotEmpty) broken.add(p.key);
    }
    expect(broken, isEmpty, reason: 'pages that did not load offline');
    // an outing, start to QR
    shell.open('outings'); await wait(2);
    await tester.tap(find.text('Ask for outing permission')); await wait(2);
    final f = find.byType(TextField).hitTestable();
    await tester.enterText(f.at(0), 'Sister\'s wedding'); await tester.enterText(f.at(1), 'Vijayawada'); await wait(1);
    FocusManager.instance.primaryFocus?.unfocus(); await wait(1);
    await tester.tap(find.text('dd/mm/yyyy, --:--').first); await wait(1); await tester.tap(find.text('OK')); await wait(1); await tester.tap(find.text('OK')); await wait(1);
    await tester.tap(find.text('dd/mm/yyyy, --:--').first); await wait(1);
    await tester.tap(find.descendant(of: find.byType(DatePickerDialog), matching: find.text('${DateTime.now().add(const Duration(days: 1)).day}')).first); await wait(1);
    await tester.tap(find.text('OK')); await wait(1); await tester.tap(find.text('OK')); await wait(1);
    await tester.enterText(find.byType(TextField).hitTestable().at(2), '9848012345'); await wait(1);
    FocusManager.instance.primaryFocus?.unfocus(); await wait(1);
    await tester.tap(find.text('Submit request')); await wait(3);
    await binding.takeScreenshot('off-01-submitted');
    await tester.tap(find.text('Done')); await wait(6);
    final size = tester.view.physicalSize / tester.view.devicePixelRatio;
    await tester.dragFrom(Offset(size.width / 2, size.height * .3), Offset(0, size.height * .4)); await wait(3);
    await binding.takeScreenshot('off-02-approved');
    expect(find.text('Show pass'), findsWidgets);
    await tester.tap(find.text('Show pass').first); await wait(3);
    await binding.takeScreenshot('off-03-qr');
  });
}
