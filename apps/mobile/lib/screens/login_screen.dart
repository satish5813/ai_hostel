import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/config.dart';
import '../core/session.dart';
import '../core/theme.dart';
import '../core/widgets.dart';

/// Sign in. The live app uses the university account (single sign-on); training and testing use the demo
/// accounts, the same as the web portal.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _user = TextEditingController();
  final _pass = TextEditingController();
  bool _busy = false;
  String? _error;

  Future<void> _signIn() async {
    setState(() { _busy = true; _error = null; });
    try {
      final r = await Api.instance.post('/auth/demo-login', {'username': _user.text.trim(), 'password': _pass.text});
      if (r['role'] != 'Student') throw ApiError(403, 'This app is for students. Staff use the web portal.');
      await SessionStore.instance.signIn(Session(id: r['id'], role: r['role'], name: r['name'] ?? ''));
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Container(
          decoration: const BoxDecoration(gradient: K.heroGradient),
          child: SafeArea(child: Center(child: SingleChildScrollView(padding: const EdgeInsets.all(20), child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Icon(Icons.apartment_rounded, size: 56, color: Colors.white),
              const SizedBox(height: 12),
              const Text('KL Hostels', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
              const Text('Your room, meals, outings and fees in one place', textAlign: TextAlign.center, style: TextStyle(color: Colors.white70, fontSize: 14)),
              const SizedBox(height: 28),
              Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Text('Sign in', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text(Config.demoLogin ? 'Use your university ID and the password you were given.' : 'Sign in with your university account.', style: const TextStyle(color: K.ink3)),
                const SizedBox(height: 18),
                TextField(controller: _user, decoration: const InputDecoration(labelText: 'University ID'), keyboardType: TextInputType.number, textInputAction: TextInputAction.next),
                const SizedBox(height: 12),
                TextField(controller: _pass, decoration: const InputDecoration(labelText: 'Password'), obscureText: true, onSubmitted: (_) => _signIn()),
                if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: K.bad, fontWeight: FontWeight.w600))),
                const SizedBox(height: 20),
                Center(child: ActionButton(label: 'Sign in', icon: Icons.login_rounded, busy: _busy, onPressed: _signIn)),
              ]))),
            ]),
          )))),
        ),
      );
}
