import 'package:flutter/material.dart';

/// The KL Residencies look, value for value the student web portal (KLH tokens, styles/student*.css):
/// campus teal, the yellow-to-coral call to action, Plus Jakarta Sans, white 18-20 px cards on a cool grey ground.
class K {
  static const brand = Color(0xFF0B7A71);       // --primary
  static const brandDark = Color(0xFF0A5F6E);   // --primary-2
  static const brandTint = Color(0xFFE6F4F1);   // --sn-tint
  static const brandInk = Color(0xFF08665E);    // --primary-ink
  static const ink = Color(0xFF101828);
  static const ink2 = Color(0xFF4B5565);
  static const ink3 = Color(0xFF667085);
  static const ink4 = Color(0xFF344054);
  static const line = Color(0xFFE3E7F0);        // --border
  static const line2 = Color(0xFFEDF0F6);       // rules inside cards
  static const control = Color(0xFF7B8496);     // --border-control
  static const ground = Color(0xFFF4F6FA);      // the student frame
  static const sub = Color(0xFFF7F8FC);         // notes, facts
  static const hover = Color(0xFFF2F4F7);
  static const sun = Color(0xFFFFD166);
  static const ember = Color(0xFFFF7A45);
  static const onAccent = Color(0xFF2B1405);
  static const violet = Color(0xFF7048E8);
  static const red = Color(0xFFD92D20);         // badges, the unread dot
  static const alert = Color(0xFFE5484D);
  static const alertLine = Color(0xFFF5B5B7);

  // status families: success, warning, critical, info, neutral, progress
  static const good = Color(0xFF14683C);
  static const goodBg = Color(0xFFE3F5EA);
  static const warn = Color(0xFF874600);
  static const warnBg = Color(0xFFFDF0DC);
  static const bad = Color(0xFFA8211B);
  static const badBg = Color(0xFFFCE8E6);
  static const info = Color(0xFF0B58A6);
  static const infoBg = Color(0xFFE3EFFB);
  static const muted = Color(0xFF4A5262);
  static const mutedBg = Color(0xFFECEEF3);
  static const progress = brandInk;
  static const progressBg = Color(0xFFE0F5F1);

  static const heroGradient = LinearGradient(colors: [brand, brandDark], begin: Alignment(-0.77, -1), end: Alignment(0.77, 1)); // 140deg
  static const primaryGradient = LinearGradient(colors: [brand, brandDark], begin: Alignment.topLeft, end: Alignment.bottomRight);
  static const actionGradient = LinearGradient(colors: [sun, ember], begin: Alignment.topLeft, end: Alignment.bottomRight);

  static const cardShadow = [BoxShadow(color: Color(0x0A101828), blurRadius: 2, offset: Offset(0, 1)), BoxShadow(color: Color(0x0F101828), blurRadius: 16, offset: Offset(0, 6))];
  static const panelShadow = [BoxShadow(color: Color(0x0A101828), blurRadius: 2, offset: Offset(0, 1)), BoxShadow(color: Color(0x1F101828), blurRadius: 24, spreadRadius: -16, offset: Offset(0, 8))];
  static const primaryShadow = [BoxShadow(color: Color(0x520B7A71), blurRadius: 16, offset: Offset(0, 6))];
  static const accentShadow = [BoxShadow(color: Color(0x61FF7A45), blurRadius: 16, offset: Offset(0, 6))];

  static TextStyle mono({double size = 13, FontWeight weight = FontWeight.w500, Color? color}) => TextStyle(fontFamily: 'JetBrainsMono', fontSize: size, fontWeight: weight, color: color);
  static TextStyle sans({double? fontSize, FontWeight? fontWeight, Color? color}) => TextStyle(fontFamily: 'PlusJakartaSans', fontSize: fontSize, fontWeight: fontWeight, color: color);

  static ThemeData theme() {
    final base = ThemeData(useMaterial3: true, fontFamily: 'PlusJakartaSans', colorScheme: ColorScheme.fromSeed(seedColor: brand, primary: brand, surface: Colors.white), scaffoldBackgroundColor: ground);
    final text = base.textTheme.apply(bodyColor: ink, displayColor: ink, fontFamily: 'PlusJakartaSans');
    OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: c, width: w));
    return base.copyWith(
      textTheme: text,
      appBarTheme: AppBarTheme(backgroundColor: const Color(0xEEFFFFFF), foregroundColor: ink, elevation: 0, scrolledUnderElevation: 0, centerTitle: false,
          shape: const Border(bottom: BorderSide(color: Color(0xFFE8ECF2))),
          titleTextStyle: sans(fontSize: 15, fontWeight: FontWeight.w800, color: const Color(0xFF1D2939))),
      cardTheme: CardThemeData(color: Colors.white, elevation: 0, margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: line))),
      filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(backgroundColor: brand, minimumSize: const Size(40, 40),
          textStyle: sans(fontWeight: FontWeight.w600, fontSize: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)))),
      outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(foregroundColor: ink, minimumSize: const Size(40, 40), side: const BorderSide(color: control),
          textStyle: sans(fontWeight: FontWeight.w600, fontSize: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)))),
      textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: brand, textStyle: sans(fontWeight: FontWeight.w800, fontSize: 13))),
      inputDecorationTheme: InputDecorationTheme(filled: true, fillColor: Colors.white, isDense: true,
          border: border(control), enabledBorder: border(control), focusedBorder: border(brand, 2), errorBorder: border(const Color(0xFFC4302B)),
          labelStyle: sans(fontSize: 14, color: ink2), floatingLabelStyle: sans(fontSize: 13, fontWeight: FontWeight.w600, color: brand),
          hintStyle: sans(fontSize: 14, color: const Color(0xFF626B7C)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12)),
      chipTheme: base.chipTheme.copyWith(selectedColor: brand, labelStyle: sans(fontWeight: FontWeight.w700, fontSize: 13), side: const BorderSide(color: line),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999))),
      bottomSheetTheme: const BottomSheetThemeData(backgroundColor: Colors.white, surfaceTintColor: Colors.transparent, showDragHandle: false,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22)))),
      dialogTheme: DialogThemeData(backgroundColor: Colors.white, surfaceTintColor: Colors.transparent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22))),
      snackBarTheme: SnackBarThemeData(behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
      dividerTheme: const DividerThemeData(color: line2, space: 1),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: brand),
    );
  }
}

/// Module colours (web app/apps.ts MODC): soft tint, ink on the tint, gradient pair, glow, ink on the gradient.
class Mod {
  final Color bg, fg, from, to, glow, on;
  const Mod(this.bg, this.fg, this.from, this.to, this.glow, [this.on = Colors.white]);
  LinearGradient get grad => LinearGradient(colors: [from, to], begin: Alignment.topLeft, end: Alignment.bottomRight);

  static const indigo = Mod(Color(0xFFEBEFFF), Color(0xFF364FC7), Color(0xFF4263EB), Color(0xFF364FC7), Color(0xB34263EB));
  static const teal = Mod(Color(0xFFE3F4F2), Color(0xFF0B7A71), Color(0xFF0B7A71), Color(0xFF0A5F6E), Color(0xB30B7A71));
  static const violet = Mod(Color(0xFFF1ECFF), Color(0xFF5F3DC4), Color(0xFF7048E8), Color(0xFF5932D1), Color(0xB37048E8));
  static const sky = Mod(Color(0xFFE6F1FB), Color(0xFF1971C2), Color(0xFF1971C2), Color(0xFF1557A0), Color(0xB31971C2));
  static const amber = Mod(Color(0xFFFFF5D6), Color(0xFFA35A00), Color(0xFFFFD166), Color(0xFFFF7A45), Color(0xB3FF7A45), Color(0xFF2B1405));
  static const em = Mod(Color(0xFFE5F4E8), Color(0xFF237A37), Color(0xFF237A37), Color(0xFF1B5E2B), Color(0xB3237A37));
  static const orange = Mod(Color(0xFFFFF0E6), Color(0xFFC2410C), Color(0xFFC2410C), Color(0xFF9A3412), Color(0xB3C2410C));
  static const rose = Mod(Color(0xFFFFE8EF), Color(0xFFC2255C), Color(0xFFC2255C), Color(0xFFA61E4D), Color(0xB3C2255C));
}
