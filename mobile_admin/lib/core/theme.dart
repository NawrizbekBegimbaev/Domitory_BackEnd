import 'package:flutter/material.dart';

class AppColors {
  static const bg = Color(0xFF0D0D0D);
  static const card = Color(0xFF1A1A1A);
  static const card2 = Color(0xFF222222);
  static const border = Color(0xFF2A2A2A);
  static const hover = Color(0xFF2F2F2F);
  static const accent = Color(0xFFF97316);
  static const accentHover = Color(0xFFEA580C);
  static const success = Color(0xFF22C55E);
  static const danger = Color(0xFFEF4444);
  static const warning = Color(0xFFEAB308);
  static const textPrimary = Color(0xFFFFFFFF);
  static const textSecondary = Color(0xFF9CA3AF);
  static const textMuted = Color(0xFF6B7280);
}

final darkTheme = ThemeData(
  brightness: Brightness.dark,
  scaffoldBackgroundColor: AppColors.bg,
  primaryColor: AppColors.accent,
  colorScheme: const ColorScheme.dark(
    primary: AppColors.accent,
    secondary: AppColors.accent,
    surface: AppColors.card,
    error: AppColors.danger,
  ),
  fontFamily: 'Inter',
  appBarTheme: const AppBarTheme(
    backgroundColor: AppColors.bg,
    elevation: 0,
    centerTitle: false,
    titleTextStyle: TextStyle(
      color: AppColors.accent,
      fontWeight: FontWeight.bold,
      fontSize: 18,
      letterSpacing: 2,
    ),
    iconTheme: IconThemeData(color: AppColors.textSecondary),
  ),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor: AppColors.card,
    selectedItemColor: AppColors.accent,
    unselectedItemColor: AppColors.textMuted,
    type: BottomNavigationBarType.fixed,
    selectedLabelStyle: TextStyle(fontSize: 10, fontWeight: FontWeight.w600),
    unselectedLabelStyle: TextStyle(fontSize: 10),
  ),
  cardTheme: CardThemeData(
    color: AppColors.card,
    elevation: 0,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(12),
      side: const BorderSide(color: AppColors.border),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: AppColors.card,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.border),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.border),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: AppColors.accent),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
    hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 14),
    labelStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 0.5),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: AppColors.accent,
      foregroundColor: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(foregroundColor: AppColors.accent),
  ),
  dividerTheme: const DividerThemeData(color: AppColors.border, thickness: 1),
  chipTheme: ChipThemeData(
    backgroundColor: AppColors.card,
    selectedColor: AppColors.accent.withAlpha(25),
    side: const BorderSide(color: AppColors.border),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
  ),
);
