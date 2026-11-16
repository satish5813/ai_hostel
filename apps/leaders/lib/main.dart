import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// KL Dashboard: the residency executive dashboard for the university leadership.
/// The person signs in once on the phone; the username and password stay in the phone's secure storage
/// (Android Keystore / iOS Keychain) and every launch signs in again quietly, so the dashboard opens straight away.
const String base = String.fromEnvironment('API_BASE', defaultValue: 'https://residency.klfacultyhiring.com');

/// The roles the executive dashboard is for (apps/api/src/exec/exec.controller.ts EXECUTIVES).
const Set<String> executives = {
  'President', 'Vice_President', 'Pro_VC', 'Pro_VC_Finance', 'Pro_VC_Academics', 'Vice_Chancellor', 'Dean_Students_Affairs',
  'Senior_Management', 'Ladies_Hostels_Head', 'Boys_Hostels_Head', 'authority', 'admin',
};

const navy = Color(0xFF0E2A47), teal = Color(0xFF0B7A71), page = Color(0xFFF4F6FA), red = Color(0xFFC8102E);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(statusBarColor: Colors.transparent, statusBarIconBrightness: Brightness.dark));
  runApp(const DashboardApp());
}

class DashboardApp extends StatelessWidget {
  const DashboardApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'KL Dashboard',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: navy, primary: navy, secondary: teal), scaffoldBackgroundColor: page, useMaterial3: true),
        home: const Root(),
      );
}

/* ------------------------------------------------------------------ sign-in and the saved details */

class Session {
  Session(this.json, this.at);
  final String json; // what the website keeps in localStorage 'klu.session'
  final DateTime at;
}

class SignInError implements Exception {
  SignInError(this.message, {this.wrongPassword = false, this.offline = false});
  final String message;
  final bool wrongPassword, offline;
}

const _store = FlutterSecureStorage(aOptions: AndroidOptions(encryptedSharedPreferences: true));

Future<Session> signIn(String username, String password) async {
  http.Response r;
  try {
    r = await http
        .post(Uri.parse('$base/api/auth/login'), headers: {'Content-Type': 'application/json'}, body: jsonEncode({'username': username, 'password': password}))
        .timeout(const Duration(seconds: 20));
  } on Exception {
    throw SignInError('No connection to KL Residencies. Check the internet and try again.', offline: true);
  }
  final body = r.body.isEmpty ? <String, dynamic>{} : jsonDecode(r.body) as Map<String, dynamic>;
  if (r.statusCode == 401 || r.statusCode == 403) {
    throw SignInError((body['message'] as String?) ?? 'The username or password is not right', wrongPassword: r.statusCode == 401);
  }
  if (r.statusCode >= 400) throw SignInError('KL Residencies did not answer (${r.statusCode}). Try again in a minute.', offline: true);
  final roles = ((body['roles'] as List?) ?? [body['role']]).map((e) => '$e').toSet();
  if (roles.intersection(executives).isEmpty) {
    throw SignInError('This app is for the leadership dashboard. Your login opens on the website instead: $base');
  }
  return Session(jsonEncode({'id': body['id'], 'role': body['role'], 'name': body['name'], 'token': body['token']}), DateTime.now());
}

class Root extends StatefulWidget {
  const Root({super.key});
  @override
  State<Root> createState() => _RootState();
}

class _RootState extends State<Root> {
  Session? session;
  String? note; // shown on the sign-in screen
  bool starting = true, offline = false;

  @override
  void initState() {
    super.initState();
    _quiet();
  }

  /// Signs in with the saved details, if there are any.
  Future<void> _quiet() async {
    setState(() { starting = true; offline = false; });
    final u = await _store.read(key: 'username'), p = await _store.read(key: 'password');
    if (u == null || p == null) { setState(() => starting = false); return; }
    try {
      final s = await signIn(u, p);
      setState(() { session = s; starting = false; });
    } on SignInError catch (e) {
      if (!e.offline) await _store.deleteAll();
      setState(() { starting = false; offline = e.offline; note = e.offline ? null : '${e.message}. Please sign in again.'; });
    }
  }

  Future<void> _signedIn(String u, String p, Session s) async {
    await _store.write(key: 'username', value: u);
    await _store.write(key: 'password', value: p);
    setState(() { session = s; note = null; });
  }

  Future<void> _signOut() async {
    await _store.deleteAll();
    setState(() { session = null; note = 'Signed out. The saved password was removed from this phone.'; });
  }

  @override
  Widget build(BuildContext context) {
    if (starting) return const Splash();
    if (offline) return Offline(onRetry: _quiet);
    final s = session;
    if (s == null) return SignInScreen(note: note, onDone: _signedIn);
    return DashboardScreen(session: s, onSignOut: _signOut, refresh: () async {
      final u = await _store.read(key: 'username'), p = await _store.read(key: 'password');
      if (u == null || p == null) return null;
      try { return await signIn(u, p); } on SignInError { return null; }
    });
  }
}

/* ------------------------------------------------------------------ screens */

class Mark extends StatelessWidget {
  const Mark({super.key, this.size = 64});
  final double size;
  @override
  Widget build(BuildContext context) => Container(
        width: size, height: size,
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(size * .28), gradient: const LinearGradient(colors: [navy, teal], begin: Alignment.topLeft, end: Alignment.bottomRight),
            boxShadow: [BoxShadow(color: teal.withValues(alpha: .35), blurRadius: 24, offset: const Offset(0, 10))]),
        alignment: Alignment.center,
        child: Text('KL', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: size * .38, letterSpacing: -.5)),
      );
}

class Splash extends StatelessWidget {
  const Splash({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(
        body: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          Mark(size: 76), SizedBox(height: 18),
          Text('KL Dashboard', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: navy)),
          SizedBox(height: 4), Text('Residencies at a glance', style: TextStyle(color: Color(0xFF667085))),
          SizedBox(height: 26), SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2.6, color: teal)),
        ])),
      );
}

class Offline extends StatelessWidget {
  const Offline({super.key, required this.onRetry});
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(child: Center(child: Padding(padding: const EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.wifi_off_rounded, size: 52, color: Color(0xFF98A2B3)), const SizedBox(height: 14),
          const Text('No connection', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: navy)), const SizedBox(height: 6),
          const Text('The dashboard needs the internet. Your login is saved: it opens as soon as you are back online.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF475467), height: 1.4)),
          const SizedBox(height: 22),
          FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh_rounded), label: const Text('Try again'),
              style: FilledButton.styleFrom(backgroundColor: navy, minimumSize: const Size(180, 50), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)))),
        ])))),
      );
}

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key, this.note, required this.onDone});
  final String? note;
  final Future<void> Function(String username, String password, Session s) onDone;
  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final user = TextEditingController(), pass = TextEditingController();
  bool busy = false, hide = true;
  String? error;

  Future<void> _go() async {
    final u = user.text.trim(), p = pass.text;
    if (u.isEmpty || p.isEmpty) { setState(() => error = 'Type your username and password.'); return; }
    setState(() { busy = true; error = null; });
    try {
      final s = await signIn(u, p);
      await widget.onDone(u, p, s);
    } on SignInError catch (e) {
      if (mounted) setState(() { busy = false; error = e.message; });
    }
  }

  InputDecoration _box(String label, IconData icon, {Widget? suffix}) => InputDecoration(
        labelText: label, prefixIcon: Icon(icon), suffixIcon: suffix, filled: true, fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFD0D5DD))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFD0D5DD))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: teal, width: 2)),
      );

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(child: Center(child: SingleChildScrollView(padding: const EdgeInsets.fromLTRB(24, 24, 24, 32), child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: AutofillGroup(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Center(child: Mark()), const SizedBox(height: 18),
            const Text('KL Dashboard', textAlign: TextAlign.center, style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: navy, letterSpacing: -.3)),
            const SizedBox(height: 6),
            const Text('Sign in once on this phone. Next time the dashboard opens straight away.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF475467), height: 1.4)),
            const SizedBox(height: 26),
            if (widget.note != null) Container(margin: const EdgeInsets.only(bottom: 14), padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFFEEF4FF), borderRadius: BorderRadius.circular(12)),
                child: Text(widget.note!, style: const TextStyle(color: navy, height: 1.35))),
            TextField(controller: user, enabled: !busy, autofillHints: const [AutofillHints.username], textInputAction: TextInputAction.next, autocorrect: false,
                decoration: _box('Username', Icons.person_outline_rounded)),
            const SizedBox(height: 14),
            TextField(controller: pass, enabled: !busy, obscureText: hide, autofillHints: const [AutofillHints.password], textInputAction: TextInputAction.go, onSubmitted: (_) => _go(),
                decoration: _box('Password', Icons.lock_outline_rounded, suffix: IconButton(onPressed: () => setState(() => hide = !hide), tooltip: hide ? 'Show password' : 'Hide password',
                    icon: Icon(hide ? Icons.visibility_outlined : Icons.visibility_off_outlined)))),
            if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!, style: const TextStyle(color: red, fontWeight: FontWeight.w600, height: 1.35))),
            const SizedBox(height: 22),
            FilledButton(onPressed: busy ? null : _go,
                style: FilledButton.styleFrom(backgroundColor: navy, minimumSize: const Size.fromHeight(54), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                child: busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white))
                    : const Text('Sign in', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700))),
            const SizedBox(height: 18),
            const Text('Your password is kept only on this phone, in its secure storage. Signing out removes it.', textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Color(0xFF667085), height: 1.4)),
          ])),
        )))),
      );
}

/* ------------------------------------------------------------------ the dashboard */

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.session, required this.onSignOut, required this.refresh});
  final Session session;
  final Future<void> Function() onSignOut;
  final Future<Session?> Function() refresh;
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> with WidgetsBindingObserver {
  late final WebViewController web;
  late Session session = widget.session;
  bool handed = false, loading = true, failed = false;
  final host = Uri.parse(base).host;

  /// Puts the session where the website looks for it, then opens the dashboard.
  String _handOver(String to) => "try{localStorage.setItem('klu.session', ${jsonEncode(session.json)});}catch(e){} location.replace(${jsonEncode(to)});";

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(page)
      ..setNavigationDelegate(NavigationDelegate(
        onNavigationRequest: (req) {
          final u = Uri.parse(req.url);
          if (u.host != host) {
            launchUrl(u, mode: LaunchMode.externalApplication);
            return NavigationDecision.prevent;
          }
          // the website's Sign out goes back to its sign-in page: sign out of the app as well
          if (handed && (u.path == '/' || u.path.isEmpty)) {
            widget.onSignOut();
            return NavigationDecision.prevent;
          }
          return NavigationDecision.navigate;
        },
        onPageStarted: (_) { if (mounted && handed) setState(() => failed = false); },
        onPageFinished: (url) {
          if (!handed) {
            handed = true;
            web.runJavaScript(_handOver('/exec'));
            return;
          }
          if (mounted) setState(() => loading = false);
        },
        onWebResourceError: (e) { if (e.isForMainFrame == true && mounted) setState(() { failed = true; loading = false; }); },
      ))
      // a small page of the residency site first, so the session can be stored for that site
      ..loadRequest(Uri.parse('$base/api/healthz'));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Back from the phone after a while: staff sessions last 12 hours, so take a fresh one quietly.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) async {
    if (state != AppLifecycleState.resumed || DateTime.now().difference(session.at) < const Duration(hours: 8)) return;
    final s = await widget.refresh();
    if (s == null || !mounted) return;
    session = s;
    final path = Uri.tryParse(await web.currentUrl() ?? '')?.path ?? '/exec';
    await web.runJavaScript(_handOver(path.isEmpty || path == '/' ? '/exec' : path));
  }

  Future<void> _back() async {
    if (await web.canGoBack()) { await web.goBack(); } else { await SystemNavigator.pop(); }
  }

  @override
  Widget build(BuildContext context) => PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) { if (!didPop) _back(); },
        child: Scaffold(
          body: SafeArea(bottom: false, child: Stack(children: [
            WebViewWidget(controller: web),
            if (loading) const ColoredBox(color: page, child: Splash()),
            if (failed) ColoredBox(color: page, child: Offline(onRetry: () { setState(() { failed = false; loading = true; }); web.reload(); })),
          ])),
        ),
      );
}
