import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'core/session.dart';
import 'core/theme.dart';
import 'screens/login_screen.dart';
import 'screens/splash_screen.dart';
import 'shell.dart';

void main() {
  // Nothing crashes the app: a widget that fails to draw shows a short note, and an error nobody caught is logged.
  ErrorWidget.builder = (details) => Material(color: Colors.transparent, child: Container(padding: const EdgeInsets.all(16), alignment: Alignment.center,
      child: const Text('This part could not be shown. Pull down to refresh.', textAlign: TextAlign.center, style: TextStyle(fontSize: 13, color: Color(0xFF6F7F7E)))));
  FlutterError.onError = (details) { FlutterError.presentError(details); };
  PlatformDispatcher.instance.onError = (error, stack) { debugPrint('Uncaught: $error\n$stack'); return true; };
  runZonedGuarded(() {
    WidgetsFlutterBinding.ensureInitialized();
    SessionStore.instance.load();
    runApp(const KluHostelsApp());
  }, (error, stack) => debugPrint('Uncaught: $error\n$stack'));
}

/// KL Residencies: the student app. The same features and look as the student web portal.
/// It opens on the splash for a moment, then on the sign-in page or, when already signed in, on the app.
class KluHostelsApp extends StatefulWidget {
  const KluHostelsApp({super.key});
  /// How long the splash stays; tests set it to zero.
  static Duration splash = SplashScreen.total;
  @override
  State<KluHostelsApp> createState() => _KluHostelsAppState();
}

class _KluHostelsAppState extends State<KluHostelsApp> {
  bool _shown = KluHostelsApp.splash == Duration.zero;
  @override
  void initState() {
    super.initState();
    if (!_shown) Future.delayed(KluHostelsApp.splash, () { if (mounted) setState(() => _shown = true); });
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'KL Residencies',
        debugShowCheckedModeBanner: false,
        theme: K.theme(),
        home: ListenableBuilder(
          listenable: SessionStore.instance,
          builder: (context, _) {
            final s = SessionStore.instance;
            final Widget page = !_shown || !s.loaded ? const SplashScreen() : s.current == null ? const LoginScreen() : const Shell();
            return AnimatedSwitcher(duration: const Duration(milliseconds: 550), switchInCurve: Curves.easeOut, child: KeyedSubtree(key: ValueKey(page.runtimeType), child: page));
          },
        ),
      );
}
