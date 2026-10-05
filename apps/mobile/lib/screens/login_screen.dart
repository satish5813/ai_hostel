import 'dart:async';
import 'dart:math' as math;
import 'dart:ui';
import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/session.dart';
import '../core/theme.dart';
import '../core/widgets.dart';

// login.css
const _g900 = Color(0xFF04271F), _g800 = Color(0xFF063A2D), _g700 = Color(0xFF0A5340), _lit = Color(0xFFFFD166);
Color _w(double a) => Colors.white.withValues(alpha: a);

/// Photographs of the KL University hostels (portrait crops), in the web's order; it opens on the hostel block.
const _photos = [
  ('assets/brand/hostel-2p.jpg', 'Courtyard in the evening', 'Residents sitting on stone benches in the hostel courtyard at dusk'),
  ('assets/brand/hostel-3p.jpg', 'Campus lawns', 'Students sitting under palm trees on the lawn beside the hostel'),
  ('assets/brand/hostel-1p.jpg', 'The hostel block', 'A tall white hostel block with teal balconies, seen from the entrance road'),
  ('assets/brand/hostel-4p.jpg', 'Entrance at night', 'The lit hostel entrance with planters and steps at night'),
  ('assets/brand/hostel-5p.jpg', 'From above', 'Aerial view of the hostel building and the fields around it'),
];

/// Sign in, as the web's SignIn page on a phone (pages/SignIn.tsx, styles/login.css): deep green ground, the hostel
/// photographs turning in perspective, and the frosted card with the KL logo, the form and the student demo accounts.
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
  int _photo = 2;
  Timer? _turn;

  @override
  void initState() {
    super.initState();
    Api.instance.get('/auth/demo-accounts').then((d) { if (mounted && d is Map) setState(() => _demo = d); }, onError: (_) {});
    _turn = Timer.periodic(const Duration(milliseconds: 4200), (_) { if (mounted) setState(() => _photo = (_photo + 1) % _photos.length); });
  }

  @override
  void dispose() { _turn?.cancel(); _user.dispose(); _pass.dispose(); super.dispose(); }

  Future<void> _signIn(String username, String password) async {
    if (username.isEmpty || password.isEmpty) return setState(() => _error = 'Enter your university ID and password.');
    setState(() { _busy = username; _error = null; });
    try {
      final r = await Api.instance.post('/auth/demo-login', {'username': username, 'password': password});
      if (r['role'] != 'Student') throw ApiError(403, 'This app is for students. Staff use the web portal.');
      await SessionStore.instance.signIn(Session(id: r['id'], role: r['role'], name: r['name'] ?? ''));
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
    return Scaffold(
      backgroundColor: _g900,
      body: SingleChildScrollView(child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: mq.size.height),
        child: Stack(children: [
          const Positioned.fill(child: _Ground()),
          Padding(padding: EdgeInsets.fromLTRB(20, 28 + mq.padding.top, 20, 32 + mq.padding.bottom), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            // headline
            const Text('Hostel Management System', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, letterSpacing: .26, color: _lit)),
            const SizedBox(height: 12),
            const Text.rich(TextSpan(children: [TextSpan(text: 'Every room, every resident, '), TextSpan(text: 'one place to look.', style: TextStyle(fontWeight: FontWeight.w600))]),
                style: TextStyle(fontSize: 28, height: 1.1, fontWeight: FontWeight.w300, letterSpacing: -.84, color: Colors.white)),
            const SizedBox(height: 4),
            // the photographs, edge to edge
            SizedBox(height: 290, child: OverflowBox(maxWidth: mq.size.width, minWidth: mq.size.width,
                child: _Carousel(index: _photo, onPick: (i) => setState(() => _photo = i)))),
            const SizedBox(height: 16),
            // the glass card
            _Glass(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Container(padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12), alignment: Alignment.center,
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: const [BoxShadow(color: Color(0x8C000000), blurRadius: 28, spreadRadius: -14, offset: Offset(0, 12))]),
                  child: const KlLogo(height: 58, full: true)),
              const SizedBox(height: 18),
              const Text('Welcome back', style: TextStyle(fontSize: 22, height: 28 / 22, fontWeight: FontWeight.w600, letterSpacing: -.44, color: Colors.white)),
              const SizedBox(height: 2),
              Text('Sign in to the hostel system.', style: TextStyle(fontSize: 13.5, height: 20 / 13.5, color: _w(.72))),
              const SizedBox(height: 16),
              _label('Username'),
              _Control(icon: LucideIcons.users, child: _input(_user, 'Employee or university ID', action: TextInputAction.next)),
              const SizedBox(height: 12),
              _label('Password'),
              _Control(icon: LucideIcons.lock, trailing: Semantics(button: true, toggled: _show, label: _show ? 'Hide password' : 'Show password', child: Material(
                  color: _show ? _w(.12) : Colors.transparent, borderRadius: BorderRadius.circular(9),
                  child: InkWell(borderRadius: BorderRadius.circular(9), onTap: () => setState(() => _show = !_show),
                      child: SizedBox(width: 34, height: 34, child: Icon(LucideIcons.eye, size: 16, color: _w(.75)))))),
                  child: _input(_pass, null, obscure: !_show, pw: true, onSubmit: () => _signIn(_user.text.trim(), _pass.text))),
              const SizedBox(height: 12),
              if (_error != null) Container(margin: const EdgeInsets.only(bottom: 10), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: const Color(0x2EFF5C5C), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0x80FF8C8C))),
                  child: Semantics(liveRegion: true, child: Text(_error!, style: const TextStyle(fontSize: 13, color: Colors.white)))),
              _Submit(label: _busy != null && _busy == _user.text.trim() ? 'Signing in…' : 'Sign in', onTap: _busy != null ? null : () => _signIn(_user.text.trim(), _pass.text)),
              if (_demo?['enabled'] == true && students.isNotEmpty) Container(
                margin: const EdgeInsets.only(top: 18), padding: const EdgeInsets.only(top: 14),
                decoration: BoxDecoration(border: Border(top: BorderSide(color: _w(.18)))),
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Wrap(spacing: 10, runSpacing: 4, alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.end, children: [
                    const Text('Demo accounts', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
                    if (hint != null) Row(mainAxisSize: MainAxisSize.min, children: [
                      Text('Password for all: ', style: TextStyle(fontSize: 12, color: _w(.78))),
                      _code(hint),
                    ]),
                  ]),
                  const SizedBox(height: 8 - 4),
                  Text('Click an account to sign in as that person.', style: TextStyle(fontSize: 12, color: _w(.66))),
                  const SizedBox(height: 2 + 8),
                  const Padding(padding: EdgeInsets.only(left: 2, top: 4), child: Text('Student', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: _lit))),
                  for (final a in students) Padding(padding: const EdgeInsets.only(top: 5), child: _Account(a: a, busy: _busy, onTap: _busy != null ? null : () {
                    setState(() => _user.text = '${a['username']}');
                    if (hint != null) { _pass.text = hint; _signIn('${a['username']}', hint); }
                  })),
                ]),
              ),
              const SizedBox(height: 14),
              Row(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Padding(padding: const EdgeInsets.only(top: 1), child: Icon(LucideIcons.lock, size: 13, color: _w(.56))), const SizedBox(width: 6),
                Flexible(child: Text(_demo?['enabled'] == true ? 'Demo accounts are for training. The live system signs you in with your KL University account.' : 'The live system signs you in with your KL University account.',
                    textAlign: TextAlign.center, style: TextStyle(fontSize: 11.5, color: _w(.56)))),
              ]),
            ])),
          ])),
        ]),
      )),
    );
  }

  Widget _label(String t) => Padding(padding: const EdgeInsets.only(left: 2, bottom: 5), child: Text(t, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _w(.8))));

  Widget _input(TextEditingController c, String? placeholder, {bool obscure = false, bool pw = false, TextInputAction? action, VoidCallback? onSubmit}) => TextField(
        controller: c, obscureText: obscure, autocorrect: false, enableSuggestions: false, textInputAction: action ?? TextInputAction.done,
        onSubmitted: onSubmit == null ? null : (_) => onSubmit(), cursorColor: Colors.white,
        autofillHints: [pw ? AutofillHints.password : AutofillHints.username],
        style: const TextStyle(fontSize: 14.5, color: Colors.white),
        decoration: InputDecoration(
          hintText: placeholder, hintStyle: TextStyle(fontSize: 14.5, color: _w(.5)), filled: true, fillColor: _w(.12), isDense: true,
          contentPadding: EdgeInsets.fromLTRB(42, 14, pw ? 44 : 14, 14),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: BorderSide(color: _w(.24))),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(13), borderSide: const BorderSide(color: Colors.white)),
        ),
      );

  static Widget _code(String t) => Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2), decoration: BoxDecoration(color: _w(.16), borderRadius: BorderRadius.circular(7)),
      child: Text(t, style: K.mono(size: 12, color: Colors.white)));
}

/// The deep green ground with its three soft lights.
class _Ground extends StatelessWidget {
  const _Ground();
  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, box) {
        final w = box.maxWidth, h = box.maxHeight;
        Widget orb(double size, Color c, double opacity, {double? left, double? right, double? top, double? bottom}) => Positioned(left: left, right: right, top: top, bottom: bottom,
            child: ImageFiltered(imageFilter: ImageFilter.blur(sigmaX: 70, sigmaY: 70, tileMode: TileMode.decal), child: Opacity(opacity: opacity,
                child: Container(width: size, height: size, decoration: BoxDecoration(shape: BoxShape.circle, color: c)))));
        return ClipRect(child: Stack(children: [
          Container(decoration: const BoxDecoration(gradient: LinearGradient(colors: [_g900, _g800, _g700], stops: [0, .45, 1], begin: Alignment(-.42, -1), end: Alignment(.42, 1)))),
          Container(decoration: const BoxDecoration(gradient: RadialGradient(center: Alignment(.7, -.8), radius: 1.1, colors: [Color(0xFF128A63), Color(0x00128A63)], stops: [0, .55]))),
          Container(decoration: const BoxDecoration(gradient: RadialGradient(center: Alignment(-1, 1), radius: .9, colors: [Color(0xFF0C5D47), Color(0x000C5D47)], stops: [0, .6]))),
          orb(520, const Color(0xFF1FA37A), .28, left: -.08 * w, top: -.18 * h),
          orb(460, const Color(0xFF3FD39B), .38, right: .06 * w, top: .08 * h),
          orb(380, _lit, .2, right: .26 * w, bottom: -.06 * h),
        ]));
      });
}

/// The frosted glass card (login-card on a phone).
class _Glass extends StatelessWidget {
  final Widget child;
  const _Glass({required this.child});
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(26), boxShadow: const [BoxShadow(color: Color(0x99000000), blurRadius: 90, spreadRadius: -30, offset: Offset(0, 40))]),
        child: ClipRRect(borderRadius: BorderRadius.circular(26), child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 26, sigmaY: 26), child: Container(
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(26), border: Border.all(color: _w(.26)),
              gradient: LinearGradient(colors: [_w(.2), _w(.07)], begin: const Alignment(-.6, -1), end: const Alignment(.6, 1))),
          child: Stack(children: [
            Positioned.fill(child: Container(decoration: BoxDecoration(gradient: RadialGradient(center: Alignment.topLeft, radius: 1.2, colors: [_w(.22), _w(0)], stops: const [0, .6])))),
            Positioned(left: 0, right: 0, top: 0, child: Container(height: 1, color: _w(.35))),
            Padding(padding: const EdgeInsets.fromLTRB(20, 20, 20, 18), child: child),
          ]),
        ))),
      );
}

/// An input with its icon on the left (login-control).
class _Control extends StatelessWidget {
  final IconData icon;
  final Widget child;
  final Widget? trailing;
  const _Control({required this.icon, required this.child, this.trailing});
  @override
  Widget build(BuildContext context) => SizedBox(height: 46, child: Stack(alignment: Alignment.centerLeft, children: [
        Positioned.fill(child: Align(alignment: Alignment.centerLeft, child: child)),
        Positioned(left: 14, child: IgnorePointer(child: Icon(icon, size: 17, color: _w(.7)))),
        if (trailing != null) Positioned(right: 6, child: trailing!),
      ]));
}

class _Submit extends StatelessWidget {
  final String label;
  final VoidCallback? onTap;
  const _Submit({required this.label, this.onTap});
  @override
  Widget build(BuildContext context) => Opacity(opacity: onTap == null ? .7 : 1, child: Container(
        height: 48,
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(13), gradient: const LinearGradient(colors: [Colors.white, Color(0xFFDFF7EC)], begin: Alignment.topCenter, end: Alignment.bottomCenter),
            boxShadow: const [BoxShadow(color: Color(0x8C000000), blurRadius: 30, spreadRadius: -12, offset: Offset(0, 14))]),
        child: Material(type: MaterialType.transparency, child: InkWell(borderRadius: BorderRadius.circular(13), onTap: onTap, child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: _g900)), const SizedBox(width: 8),
          const Icon(LucideIcons.arrowRight, size: 17, color: _g900),
        ]))),
      ));
}

/// A demo account to click (login-acct).
class _Account extends StatelessWidget {
  final Map a;
  final String? busy;
  final VoidCallback? onTap;
  const _Account({required this.a, required this.busy, this.onTap});
  @override
  Widget build(BuildContext context) => Opacity(opacity: onTap == null ? .6 : 1, child: Material(color: _w(.07), borderRadius: BorderRadius.circular(11), child: InkWell(
      onTap: onTap, borderRadius: BorderRadius.circular(11),
      child: Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(11), border: Border.all(color: _w(.18))),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${a['display_name']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white)),
              Text('${a['description'] ?? ''}', maxLines: 1, overflow: TextOverflow.ellipsis, softWrap: false, style: TextStyle(fontSize: 11.5, color: _w(.7))),
            ])),
            const SizedBox(width: 10),
            _LoginScreenState._code(busy == a['username'] ? '…' : '${a['username']}'),
          ])))));
}

/// The perspective carousel: 150 px portrait photos side by side, the current one facing, the others turned 34° a step
/// and shrunk to 84 %; the current one's title under it. The edges fade out.
class _Carousel extends StatelessWidget {
  final int index;
  final ValueChanged<int> onPick;
  const _Carousel({required this.index, required this.onPick});
  @override
  Widget build(BuildContext context) => Semantics(label: 'Photographs of the KL University hostels', child: ShaderMask(
        blendMode: BlendMode.dstIn,
        shaderCallback: (r) => const LinearGradient(colors: [Colors.transparent, Colors.black, Colors.black, Colors.transparent], stops: [0, .14, .86, 1]).createShader(r),
        child: TweenAnimationBuilder<double>(
          tween: Tween(end: index.toDouble()), duration: const Duration(milliseconds: 900), curve: Curves.easeOutCubic,
          builder: (context, pos, _) => LayoutBuilder(builder: (context, box) {
            const sw = 150.0;
            final order = List.generate(_photos.length, (i) => i)..sort((a, b) => (b - pos).abs().compareTo((a - pos).abs()));
            return Stack(clipBehavior: Clip.hardEdge, children: [
              for (final i in order) Positioned(
                left: box.maxWidth / 2 + (i - pos) * sw - sw / 2, top: 0, bottom: 0, width: sw,
                child: Center(child: Transform(
                  alignment: Alignment.center,
                  transform: Matrix4.identity()..setEntry(3, 2, 1 / 1200)..rotateY((pos - i) * 34 * math.pi / 180)
                    ..scaleByDouble(1 - .16 * (i - pos).abs().clamp(0, 1), 1 - .16 * (i - pos).abs().clamp(0, 1), 1, 1),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    GestureDetector(onTap: () => onPick(i), child: Semantics(button: true, label: 'Show ${_photos[i].$2}', image: true, child: Container(
                      width: sw, height: sw * 4 / 3,
                      decoration: BoxDecoration(borderRadius: BorderRadius.circular(22), border: Border.all(color: _w(.36)),
                          boxShadow: [
                            if (i == index) BoxShadow(color: _w(.14), spreadRadius: 6),
                            const BoxShadow(color: Color(0xCC000000), blurRadius: 60, spreadRadius: -26, offset: Offset(0, 36)),
                          ]),
                      child: ClipRRect(borderRadius: BorderRadius.circular(21), child: Image.asset(_photos[i].$1, fit: BoxFit.cover, semanticLabel: _photos[i].$3)),
                    ))),
                    const SizedBox(height: 12),
                    SizedBox(height: 29, child: OverflowBox(maxWidth: 400, maxHeight: 40, child: Opacity(opacity: (1 - (i - pos).abs()).clamp(0, 1).toDouble(), child: ClipRRect(borderRadius: BorderRadius.circular(999), child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                      decoration: BoxDecoration(color: _w(.14), borderRadius: BorderRadius.circular(999), border: Border.all(color: _w(.24))),
                      child: Text(_photos[i].$2, softWrap: false, overflow: TextOverflow.visible, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.white)),
                    ))))),
                  ]),
                )),
              ),
            ]);
          }),
        ),
      ));
}
