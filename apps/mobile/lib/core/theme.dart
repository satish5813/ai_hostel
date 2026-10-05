import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// The KL Hostels look, the same as the student web portal: brand teal, the warm orange call to action,
/// Plus Jakarta Sans, white cards on a cool grey ground.
class K {
  static const brand = Color(0xFF0B7A71);
  static const brandDark = Color(0xFF0A4F5C);
  static const brandTint = Color(0xFFE6F4F1);
  static const ink = Color(0xFF101828);
  static const ink2 = Color(0xFF475467);
  static const ink3 = Color(0xFF667085);
  static const line = Color(0xFFE4E8EF);
  static const ground = Color(0xFFF7F8FC);
  static const sun = Color(0xFFFFD166);
  static const ember = Color(0xFFFF7A45);
  static const violet = Color(0xFF7048E8);
  static const good = Color(0xFF067647);
  static const goodBg = Color(0xFFECFDF3);
  static const warn = Color(0xFFB54708);
  static const warnBg = Color(0xFFFFFAEB);
  static const bad = Color(0xFFB42318);
  static const badBg = Color(0xFFFEF3F2);

  static const heroGradient = LinearGradient(colors: [Color(0xFF0B7A71), Color(0xFF0A4F5C)], begin: Alignment.topLeft, end: Alignment.bottomRight);
  static const actionGradient = LinearGradient(colors: [sun, ember], begin: Alignment.topLeft, end: Alignment.bottomRight);

  static ThemeData theme() {
    final base = ThemeData(useMaterial3: true, colorScheme: ColorScheme.fromSeed(seedColor: brand, primary: brand, surface: Colors.white), scaffoldBackgroundColor: ground);
    final text = GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(bodyColor: ink, displayColor: ink);
    return base.copyWith(
      textTheme: text,
      appBarTheme: AppBarTheme(backgroundColor: Colors.white, foregroundColor: ink, elevation: 0, scrolledUnderElevation: 1,
          titleTextStyle: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w800, color: ink)),
      cardTheme: CardThemeData(color: Colors.white, elevation: 0, margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: line))),
      filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(backgroundColor: brand, minimumSize: const Size(48, 48),
          textStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, fontSize: 15), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)))),
      outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(foregroundColor: ink, minimumSize: const Size(48, 48), side: const BorderSide(color: line),
          textStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, fontSize: 15), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)))),
      inputDecorationTheme: InputDecorationTheme(filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: line)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: line)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: brand, width: 2)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14)),
      chipTheme: base.chipTheme.copyWith(selectedColor: brand, labelStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w600), side: const BorderSide(color: line),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999))),
      navigationBarTheme: NavigationBarThemeData(backgroundColor: Colors.white, indicatorColor: brandTint, elevation: 1,
          labelTextStyle: WidgetStatePropertyAll(GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600))),
      snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
      dividerTheme: const DividerThemeData(color: line, space: 1),
    );
  }
}
