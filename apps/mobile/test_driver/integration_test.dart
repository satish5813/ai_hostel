import 'dart:io';
import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() => integrationDriver(onScreenshot: (name, bytes, [args]) async {
      final dir = Platform.environment['SHOT_DIR'] ?? 'screenshots';
      await File('$dir/$name.png').create(recursive: true).then((f) => f.writeAsBytes(bytes));
      return true;
    });
