import 'package:flutter/material.dart';
import 'core/session.dart';
import 'core/theme.dart';
import 'screens/login_screen.dart';
import 'shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SessionStore.instance.load();
  runApp(const KluHostelsApp());
}

/// KL University Hostels: the student app. The same features and look as the student web portal.
class KluHostelsApp extends StatelessWidget {
  const KluHostelsApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'KL Hostels',
        debugShowCheckedModeBanner: false,
        theme: K.theme(),
        home: ListenableBuilder(
          listenable: SessionStore.instance,
          builder: (context, _) {
            final s = SessionStore.instance;
            if (!s.loaded) return const Scaffold(body: Center(child: CircularProgressIndicator()));
            return s.current == null ? const LoginScreen() : const Shell();
          },
        ),
      );
}
