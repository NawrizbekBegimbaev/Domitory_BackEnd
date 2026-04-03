import 'package:flutter/material.dart';

class AppColors {
  static const bg = Color(0xFFF2F4F7);          // Warm gray background
  static const card = Color(0xFFFFFFFF);         // White cards
  static const card2 = Color(0xFFEEF0F4);       // Slightly darker card
  static const border = Color(0xFFCDD5DF);       // Visible border
  static const hover = Color(0xFFE5E9F0);       // Hover state
  static const accent = Color(0xFF003153);       // Ajou Blue (Prussian Blue)
  static const accentHover = Color(0xFF002240);  // Ajou Blue darker
  static const accentLight = Color(0xFF2B7CB8);  // Bright Ajou Blue for badges/links
  static const success = Color(0xFF15803D);      // Darker green
  static const danger = Color(0xFFB91C1C);       // Darker red
  static const warning = Color(0xFFB45309);      // Darker amber
  static const textPrimary = Color(0xFF111827);  // Near-black text
  static const textSecondary = Color(0xFF4B5563);// Dark gray text
  static const textMuted = Color(0xFF6B7280);    // Medium gray text (was too light)
}

final darkTheme = ThemeData(
  brightness: Brightness.light,
  scaffoldBackgroundColor: AppColors.bg,
  primaryColor: AppColors.accent,
  colorScheme: const ColorScheme.light(
    primary: AppColors.accent,
    secondary: AppColors.accentLight,
    surface: AppColors.card,
    error: AppColors.danger,
  ),
  fontFamily: 'Inter',
  appBarTheme: const AppBarTheme(
    backgroundColor: AppColors.card,
    elevation: 0,
    centerTitle: false,
    scrolledUnderElevation: 1,
    surfaceTintColor: Colors.transparent,
    titleTextStyle: TextStyle(
      color: AppColors.accent,
      fontWeight: FontWeight.bold,
      fontSize: 18,
      letterSpacing: 2,
    ),
    iconTheme: IconThemeData(color: AppColors.textPrimary),
  ),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor: AppColors.card,
    selectedItemColor: AppColors.accent,
    unselectedItemColor: AppColors.textMuted,
    type: BottomNavigationBarType.fixed,
    elevation: 8,
    selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
    unselectedLabelStyle: TextStyle(fontSize: 11),
  ),
  cardTheme: CardThemeData(
    color: AppColors.card,
    elevation: 2,
    shadowColor: Colors.black12,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
      side: const BorderSide(color: AppColors.border, width: 0.5),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: AppColors.card,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: AppColors.border),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: AppColors.border),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(10),
      borderSide: const BorderSide(color: AppColors.accent, width: 2),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 15),
    labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 14, fontWeight: FontWeight.w600),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: AppColors.accent,
      foregroundColor: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      elevation: 2,
      shadowColor: AppColors.accent.withAlpha(80),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      foregroundColor: AppColors.textSecondary,
      side: const BorderSide(color: AppColors.border, width: 1.5),
      padding: const EdgeInsets.symmetric(vertical: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(
      foregroundColor: AppColors.accentLight,
      textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
    ),
  ),
  dividerTheme: const DividerThemeData(color: AppColors.border, thickness: 1),
  chipTheme: ChipThemeData(
    backgroundColor: AppColors.card,
    selectedColor: AppColors.accent.withAlpha(25),
    side: const BorderSide(color: AppColors.border),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
  ),
);
