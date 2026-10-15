import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../core/widgets.dart';

/// The opening, in two parts. First the KL logo fades in on white, exactly where the phone's own launch screen shows
/// it, so the app seems to open on its logo. Then the white gives way to the second splash: the hostel block photograph
/// under the brand's deep green, with the logo card, the app's name and a thin progress line.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  static const photo = 'assets/brand/hostel-1p.jpg';
  /// How long the logo stays on white, and how long the whole opening lasts.
  static const logoFor = Duration(milliseconds: 1500), total = Duration(milliseconds: 4700);
  @override
  State<SplashScreen> createState() => _OpeningState();
}

class _OpeningState extends State<SplashScreen> {
  bool second = false;
  @override
  void initState() {
    super.initState();
    Future.delayed(SplashScreen.logoFor, () { if (mounted) setState(() => second = true); });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    precacheImage(const AssetImage(SplashScreen.photo), context); // ready before the white fades
  }

  @override
  Widget build(BuildContext context) => AnimatedSwitcher(duration: const Duration(milliseconds: 750), switchInCurve: Curves.easeInOut, switchOutCurve: Curves.easeInOut,
      child: second ? const _PhotoSplash(key: ValueKey('photo')) : const _LogoSplash(key: ValueKey('logo')));
}

/// Part one: the logo arriving on white, a teal line drawing itself under it.
class _LogoSplash extends StatefulWidget {
  const _LogoSplash({super.key});
  @override
  State<_LogoSplash> createState() => _LogoSplashState();
}

class _LogoSplashState extends State<_LogoSplash> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..forward();
  late final _in = CurvedAnimation(parent: _c, curve: const Interval(0, .7, curve: Curves.easeOutCubic)), _line = CurvedAnimation(parent: _c, curve: const Interval(.35, 1, curve: Curves.easeInOut));
  @override
  void dispose() { _c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) _c.value = 1;
    return AnnotatedRegion<SystemUiOverlayStyle>(value: SystemUiOverlayStyle.dark, child: Scaffold(
      backgroundColor: Colors.white,
      body: AnimatedBuilder(animation: _c, builder: (context, _) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Opacity(opacity: .25 + .75 * _in.value, child: Transform.scale(scale: .94 + .06 * _in.value, child: const KlLogo(height: 92, full: true))),
        const SizedBox(height: 22),
        ClipRRect(borderRadius: BorderRadius.circular(2), child: SizedBox(width: 150, height: 3, child: Align(alignment: Alignment.centerLeft,
            child: FractionallySizedBox(widthFactor: _line.value.clamp(.001, 1), child: const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF0E8F84), Color(0xFF0A5F6E)])), child: SizedBox.expand())))),
        ),
        const SizedBox(height: 14),
        Opacity(opacity: _line.value, child: const Text('HOSTELS', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, letterSpacing: 5, color: Color(0xFF0B7A71)))),
      ]))),
    ));
  }
}

/// Part two: the photograph, the logo card, the name.
class _PhotoSplash extends StatefulWidget {
  const _PhotoSplash({super.key});
  @override
  State<_PhotoSplash> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<_PhotoSplash> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))..forward();
  Animation<double> _part(double from, double to, [Curve curve = Curves.easeOutCubic]) => CurvedAnimation(parent: _c, curve: Interval(from, to, curve: curve));
  late final _logo = _part(.05, .45, Curves.easeOutBack), _name = _part(.25, .6), _tag = _part(.38, .75), _bar = _part(.25, 1, Curves.easeInOut), _zoom = _part(0, 1, Curves.easeOut);

  @override
  void dispose() { _c.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.of(context).disableAnimations) _c.value = 1;
    return AnnotatedRegion<SystemUiOverlayStyle>(value: SystemUiOverlayStyle.light, child: Scaffold(
      backgroundColor: const Color(0xFF04271F),
      body: AnimatedBuilder(animation: _c, builder: (context, _) => Stack(fit: StackFit.expand, children: [
        // the photograph, drawing back from a slight close-up
        Transform.scale(scale: 1.14 - .14 * _zoom.value, child: Image.asset(SplashScreen.photo, fit: BoxFit.cover, alignment: const Alignment(0, -.3), semanticLabel: 'A KL University residency block')),
        // green from the top for the status bar, and rising from the bottom to carry the name
        const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter,
            colors: [Color(0xB304271F), Color(0x2604271F), Color(0x9904271F), Color(0xF204271F), Color(0xFF04271F)], stops: [0, .28, .52, .74, 1]))),
        SafeArea(child: Padding(padding: const EdgeInsets.symmetric(horizontal: 28), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const SizedBox(height: 14),
          Opacity(opacity: _name.value, child: Row(children: [
            Container(width: 7, height: 7, decoration: const BoxDecoration(color: Color(0xFFFFD166), shape: BoxShape.circle)), const SizedBox(width: 8),
            const Text('KL UNIVERSITY · RESIDENCIES', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, letterSpacing: 1.6, color: Color(0xE6FFFFFF))),
          ])),
          const Spacer(),
          Transform.scale(alignment: Alignment.centerLeft, scale: .86 + .14 * _logo.value, child: Opacity(opacity: _logo.value.clamp(0, 1), child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), boxShadow: const [BoxShadow(color: Color(0x80000000), blurRadius: 36, spreadRadius: -10, offset: Offset(0, 18))]),
              child: const KlLogo(height: 54, full: true)))),
          const SizedBox(height: 26),
          Transform.translate(offset: Offset(0, 16 * (1 - _name.value)), child: Opacity(opacity: _name.value, child: const Text.rich(
              TextSpan(children: [TextSpan(text: 'KL '), TextSpan(text: 'Student', style: TextStyle(color: Color(0xFFFFD166)))]),
              style: TextStyle(fontSize: 46, height: 1.02, fontWeight: FontWeight.w800, letterSpacing: -1.6, color: Colors.white)))),
          const SizedBox(height: 10),
          Transform.translate(offset: Offset(0, 16 * (1 - _tag.value)), child: Opacity(opacity: _tag.value, child: const Text('Your residency, in your pocket.\nRoom, fees, mess, outings and more.',
              style: TextStyle(fontSize: 16, height: 1.45, color: Color(0xD9FFFFFF))))),
          const SizedBox(height: 34),
          Semantics(label: 'Opening', child: ClipRRect(borderRadius: BorderRadius.circular(3), child: SizedBox(height: 4, child: Stack(children: [
            const Positioned.fill(child: ColoredBox(color: Color(0x33FFFFFF))),
            FractionallySizedBox(widthFactor: _bar.value.clamp(.02, 1), child: const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(colors: [Color(0xFFFFD166), Color(0xFFFF7A45)])), child: SizedBox.expand())),
          ])))),
          const SizedBox(height: 14),
          Opacity(opacity: _tag.value, child: const Row(children: [
            Icon(LucideIcons.shieldCheck, size: 13, color: Color(0x99FFFFFF)), SizedBox(width: 6),
            Text('Secure sign-in with your university ID', style: TextStyle(fontSize: 12, color: Color(0x99FFFFFF))),
          ])),
          const SizedBox(height: 26),
        ]))),
      ])),
    ));
  }
}
