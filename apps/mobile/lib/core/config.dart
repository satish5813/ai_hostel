import 'package:flutter/foundation.dart' show TargetPlatform, defaultTargetPlatform, kIsWeb;

/// Where the app finds the hostel API. Set it at build time:
///   flutter build apk --dart-define=API_BASE=https://hostels.kluniversity.in
/// Without it, a development build talks to the API on this computer (the Android emulator reaches it as 10.0.2.2).
class Config {
  static const _fromBuild = String.fromEnvironment('API_BASE');
  static String get apiBase {
    if (_fromBuild.isNotEmpty) return _fromBuild;
    return !kIsWeb && defaultTargetPlatform == TargetPlatform.android ? 'http://10.0.2.2:4100' : 'http://localhost:4100';
  }

  /// The demo build: no server at all, the app answers itself from recorded data (core/offline.dart).
  ///   flutter build apk --dart-define=OFFLINE=true
  static const offline = bool.fromEnvironment('OFFLINE');

  /// Demo sign-in (training and testing only); the live app signs in with the university account.
  static const demoLogin = bool.fromEnvironment('DEMO_LOGIN', defaultValue: true);
}
