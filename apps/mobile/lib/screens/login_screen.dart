import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/api.dart';
import '../core/session.dart';
import '../core/theme.dart';
import '../core/widgets.dart';

const _g900 = Color(0xFF04271F), _lit = Color(0xFFFFD166), _field = Color(0xFFF3F6F6), _mute = Color(0xFF66777A);

/// Photographs of the KL University hostels (portrait crops); it opens on the hostel block, the splash's photograph.
const _photos = [
  ('assets/brand/hostel-1p.jpg', 'The hostel block', 'A tall white hostel block with teal balconies, seen from the entrance road'),
  ('assets/brand/hostel-4p.jpg', 'Entrance at night', 'The lit hostel entrance with planters and steps at night'),
  ('assets/brand/hostel-3p.jpg', 'Campus lawns', 'Students sitting under palm trees on the lawn beside the hostel'),
  ('assets/brand/hostel-2p.jpg', 'Courtyard in the evening', 'Residents sitting on stone benches in the hostel courtyard at dusk'),
  ('assets/brand/hostel-5p.jpg', 'From above', 'Aerial view of the hostel building and the fields around it'),
];

/// Sign in: the hostel photographs across the top under the brand green, with the logo and the headline; below, a white
/// sheet with the university ID and password, and the demo accounts when the server offers them.
/// Only students may sign in to the app.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _user = TextEditingController();
  final _pass = TextEditingController();
  bool _show = false;
  String? _busy; // the username being signed in
  String? _error;
  Map? _demo;
  int _photo = 0;
  Timer? _turn;
  bool _under = false; // the white sheet has scrolled up under the status bar

  @override
  void initState() {
    super.initState();
    Api.instance.get('/auth/demo-accounts').then((d) { if (mounted && d is Map) setState(() => _demo = d); }, onError: (_) {});
    _turn = Timer.periodic(const Duration(milliseconds: 5200), (_) { if (mounted) setState(() => _photo = (_photo + 1) % _photos.length); });
  }

  @override
  void dispose() { _turn?.cancel(); _user.dispose(); _pass.dispose(); super.dispose(); }

  Future<void> _signIn(String username, String password) async {
    if (username.isEmpty || password.isEmpty) return setState(() => _error = 'Enter your university ID and password.');
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() { _busy = username; _error = null; });
    try {
      // the login made by the hostel office first; the demo accounts answer when the demo is switched on
      dynamic r;
      try { r = await Api.instance.post('/auth/login', {'username': username, 'password': password}); }
      catch (e) { if (_demo?['enabled'] != true) rethrow; r = await Api.instance.post('/auth/demo-login', {'username': username, 'password': password}); }
      if (r['role'] != 'Student') throw ApiError(403, 'This app is for students. Staff use the web portal.');
      await SessionStore.instance.signIn(Session(id: r['id'], role: r['role'], name: r['name'] ?? '', token: r['token']));
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);
    final students = ((_demo?['accounts'] as List?) ?? []).cast<Map>().where((a) => a['role_code'] == 'Student').toList();
    final hint = _demo?['password_hint'] as String?;
    final hero = (mq.size.height * .42).clamp(300.0, 420.0);
    final typed = _busy != null && _busy == _user.text.trim();
    return AnnotatedRegion<SystemUiOverlayStyle>(value: SystemUiOverlayStyle.light, child: Scaffold(
      backgroundColor: _g900,
      body: Stack(children: [
        // the photographs, one fading into the next, held behind the sheet as it scrolls
        Positioned(left: 0, right: 0, top: 0, height: hero + 60, child: Stack(fit: StackFit.expand, children: [
          AnimatedSwitcher(duration: const Duration(milliseconds: 900), child: Image.asset(_photos[_photo].$1, key: ValueKey(_photo), fit: BoxFit.cover, width: double.infinity, height: double.infinity,
              alignment: const Alignment(0, -.3), semanticLabel: _photos[_photo].$3)),
          const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter,
              colors: [Color(0xB304271F), Color(0x1A04271F), Color(0xB304271F), Color(0xF204271F)], stops: [0, .32, .72, 1]))),
        ])),
        NotificationListener<ScrollNotification>(onNotification: (n) {
          final u = n.metrics.pixels > hero - mq.padding.top - 24;
          if (u != _under) setState(() => _under = u);
          return false;
        }, child: SingleChildScrollView(child: ConstrainedBox(constraints: BoxConstraints(minHeight: mq.size.height), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          SizedBox(height: hero, child: Padding(padding: EdgeInsets.fromLTRB(24, mq.padding.top + 14, 24, 26), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), boxShadow: const [BoxShadow(color: Color(0x59000000), blurRadius: 18, offset: Offset(0, 8))]),
                  child: const KlLogo(height: 30, full: true)),
              const Spacer(),
              Semantics(label: _photos[_photo].$2, child: Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(color: const Color(0x4D000000), borderRadius: BorderRadius.circular(999), border: Border.all(color: const Color(0x40FFFFFF))),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(LucideIcons.mapPin, size: 12, color: Colors.white), const SizedBox(width: 5),
                    Text(_photos[_photo].$2, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Colors.white)),
                  ]))),
            ]),
            const Spacer(),
            const Text('KL STUDENT', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 2, color: _lit)),
            const SizedBox(height: 8),
            const Text.rich(TextSpan(children: [TextSpan(text: 'Your hostel,\n'), TextSpan(text: 'in your pocket.', style: TextStyle(fontWeight: FontWeight.w800))]),
                style: TextStyle(fontSize: 34, height: 1.08, fontWeight: FontWeight.w300, letterSpacing: -1, color: Colors.white)),
            const SizedBox(height: 12),
            Row(children: [for (var i = 0; i < _photos.length; i++) AnimatedContainer(duration: const Duration(milliseconds: 300), margin: const EdgeInsets.only(right: 5), height: 4, width: i == _photo ? 22 : 6,
                decoration: BoxDecoration(color: i == _photo ? _lit : const Color(0x66FFFFFF), borderRadius: BorderRadius.circular(2)))]),
          ]))),
          // the sheet
          Container(
            constraints: BoxConstraints(minHeight: mq.size.height - hero),
            padding: EdgeInsets.fromLTRB(24, 26, 24, 24 + mq.padding.bottom),
            decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.vertical(top: Radius.circular(30)), boxShadow: [BoxShadow(color: Color(0x40000000), blurRadius: 30, offset: Offset(0, -10))]),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Text('Welcome back', style: TextStyle(fontSize: 26, height: 1.15, fontWeight: FontWeight.w800, letterSpacing: -.6, color: K.ink)),
              const SizedBox(height: 4),
              const Text('Sign in with your university ID to continue.', style: TextStyle(fontSize: 14, height: 1.4, color: _mute)),
              const SizedBox(height: 22),
              _label('University ID'),
              _Field(icon: LucideIcons.idCard, child: _input(_user, 'For example 2600040012', action: TextInputAction.next, keyboard: TextInputType.number)),
              const SizedBox(height: 14),
              _label('Password'),
              _Field(icon: LucideIcons.lockKeyhole, trailing: Semantics(button: true, toggled: _show, label: _show ? 'Hide password' : 'Show password',
                  child: IconButton(onPressed: () => setState(() => _show = !_show), icon: Icon(_show ? LucideIcons.eyeOff : LucideIcons.eye, size: 18, color: _mute))),
                  child: _input(_pass, 'Your password', obscure: !_show, onSubmit: () => _signIn(_user.text.trim(), _pass.text))),
              if (_error != null) Container(margin: const EdgeInsets.only(top: 12), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(color: const Color(0xFFFDECEA), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFF5C2BD))),
                  child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Padding(padding: EdgeInsets.only(top: 1), child: Icon(LucideIcons.circleAlert, size: 15, color: Color(0xFFB42318))), const SizedBox(width: 8),
                    Expanded(child: Semantics(liveRegion: true, child: Text(_error!, style: const TextStyle(fontSize: 13, height: 1.35, color: Color(0xFF8A1C12))))),
                  ])),
              const SizedBox(height: 20),
              _Submit(label: typed ? 'Signing in…' : 'Sign in', busy: typed, onTap: _busy != null ? null : () => _signIn(_user.text.trim(), _pass.text)),
              const SizedBox(height: 12),
              const Text('First time, or forgot your password? Use the link in the e-mail from the hostel office.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12.5, color: _mute)),
              if (_demo?['enabled'] == true && students.isNotEmpty) ...[
                const SizedBox(height: 22),
                Row(children: [
                  const Expanded(child: Divider(color: K.line, height: 1)),
                  Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: Text('or try a demo account', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: _mute.withValues(alpha: .9)))),
                  const Expanded(child: Divider(color: K.line, height: 1)),
                ]),
                const SizedBox(height: 14),
                for (final a in students) Padding(padding: const EdgeInsets.only(bottom: 10), child: _Account(a: a, busy: _busy, onTap: _busy != null ? null : () {
                  setState(() => _user.text = '${a['username']}');
                  if (hint != null) { _pass.text = hint; _signIn('${a['username']}', hint); }
                })),
                if (hint != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text('Demo password for all: $hint', textAlign: TextAlign.center, style: K.mono(size: 11.5, color: _mute))),
              ],
              const SizedBox(height: 20),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                const Icon(LucideIcons.shieldCheck, size: 13, color: _mute), const SizedBox(width: 6),
                Flexible(child: Text('KL University Hostels · your data stays with the university', textAlign: TextAlign.center, style: TextStyle(fontSize: 11.5, color: _mute.withValues(alpha: .9)))),
              ]),
            ]),
          ),
        ])))),
        // the status bar keeps its green when the sheet scrolls up under it
        Positioned(left: 0, right: 0, top: 0, height: mq.padding.top, child: IgnorePointer(child: AnimatedOpacity(opacity: _under ? 1 : 0, duration: const Duration(milliseconds: 180), child: const ColoredBox(color: _g900)))),
      ]),
    ));
  }

  Widget _label(String t) => Padding(padding: const EdgeInsets.only(left: 2, bottom: 6), child: Text(t, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: K.ink2)));

  Widget _input(TextEditingController c, String placeholder, {bool obscure = false, TextInputAction? action, TextInputType? keyboard, VoidCallback? onSubmit}) => TextField(
        controller: c, obscureText: obscure, textInputAction: action ?? TextInputAction.done, keyboardType: keyboard, autocorrect: false, enableSuggestions: false,
        onChanged: (_) { if (_error != null) setState(() => _error = null); }, onSubmitted: (_) => onSubmit?.call(),
        style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600, color: K.ink),
        decoration: InputDecoration(hintText: placeholder, hintStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w400, color: Color(0xFF9AA8AA)),
            filled: false, isDense: true, border: InputBorder.none, enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, contentPadding: const EdgeInsets.symmetric(vertical: 15)),
      );
}

/// A field on the sheet: soft grey ground, the icon, the input, and a teal ring while it has focus.
class _Field extends StatefulWidget {
  final IconData icon;
  final Widget child;
  final Widget? trailing;
  const _Field({required this.icon, required this.child, this.trailing});
  @override
  State<_Field> createState() => _FieldState();
}

class _FieldState extends State<_Field> {
  bool on = false;
  @override
  Widget build(BuildContext context) => Focus(onFocusChange: (v) => setState(() => on = v), child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.only(left: 14, right: 4),
      decoration: BoxDecoration(color: on ? Colors.white : _field, borderRadius: BorderRadius.circular(14), border: Border.all(color: on ? K.brand : const Color(0xFFE3EAEA), width: on ? 1.6 : 1),
          boxShadow: on ? const [BoxShadow(color: Color(0x260B7A71), blurRadius: 0, spreadRadius: 3)] : null),
      child: Row(children: [
        Icon(widget.icon, size: 18, color: on ? K.brand : _mute), const SizedBox(width: 10),
        Expanded(child: widget.child),
        widget.trailing ?? const SizedBox(width: 10),
      ])));
}

/// The sign-in button: brand teal, full width, with the arrow or a spinner.
class _Submit extends StatelessWidget {
  final String label;
  final bool busy;
  final VoidCallback? onTap;
  const _Submit({required this.label, this.busy = false, this.onTap});
  @override
  Widget build(BuildContext context) => Opacity(opacity: onTap == null && !busy ? .6 : 1, child: Container(
      height: 54,
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), gradient: const LinearGradient(colors: [Color(0xFF0E8F84), Color(0xFF0A5F6E)], begin: Alignment.topLeft, end: Alignment.bottomRight),
          boxShadow: const [BoxShadow(color: Color(0x590B7A71), blurRadius: 22, spreadRadius: -6, offset: Offset(0, 12))]),
      child: Material(type: MaterialType.transparency, child: InkWell(borderRadius: BorderRadius.circular(16), onTap: onTap, child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)), const SizedBox(width: 10),
        busy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(LucideIcons.arrowRight, size: 18, color: Colors.white),
      ])))));
}

/// One demo account: initials, the name, what signing in as it shows, and an arrow.
class _Account extends StatelessWidget {
  final Map a;
  final String? busy;
  final VoidCallback? onTap;
  const _Account({required this.a, required this.busy, this.onTap});
  /// "Renewal: Nabin Shrestha, BH2" -> NS; "New registration: new student" -> NR
  static String _initials(String name) {
    final who = name.contains(': ') && RegExp(r': [A-Z]').hasMatch(name) ? name.split(': ').last : name;
    final w = who.split(RegExp(r'[ ,:]+')).where((x) => x.isNotEmpty).toList();
    return (w.length > 1 ? '${w[0][0]}${w[1][0]}' : w.isEmpty ? '?' : w[0][0]).toUpperCase();
  }
  @override
  Widget build(BuildContext context) => Opacity(opacity: onTap == null && busy != a['username'] ? .55 : 1, child: Material(color: Colors.white, borderRadius: BorderRadius.circular(16), child: InkWell(
      onTap: onTap, borderRadius: BorderRadius.circular(16),
      child: Container(padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE3EAEA))),
          child: Row(children: [
            Container(width: 42, height: 42, alignment: Alignment.center,
                decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF0E8F84), Color(0xFF0A5F6E)], begin: Alignment.topLeft, end: Alignment.bottomRight), borderRadius: BorderRadius.circular(13)),
                child: busy == a['username']
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_initials('${a['display_name']}'), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white))),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${a['display_name']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700, color: K.ink)),
              const SizedBox(height: 2),
              Text('${a['description'] ?? ''}', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, height: 1.3, color: _mute)),
            ])),
            const SizedBox(width: 8),
            const Icon(LucideIcons.chevronRight, size: 18, color: _mute),
          ])))));
}
