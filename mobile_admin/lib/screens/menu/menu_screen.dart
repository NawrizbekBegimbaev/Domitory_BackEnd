import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/auth_provider.dart';

class MenuScreen extends StatelessWidget {
  const MenuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;

    return Scaffold(
      appBar: AppBar(title: const Text('DORMITORY')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Меню', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),
          _menuItem(Icons.description_outlined, 'Договоры', () {}),
          _menuItem(Icons.bar_chart_outlined, 'Отчёты', () {}),
          _menuItem(Icons.security_outlined, 'Аудит', () {}),
          _menuItem(Icons.people_outline, 'Пользователи', () {}),
          const SizedBox(height: 24),
          // Profile
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
            child: Row(children: [
              CircleAvatar(radius: 24, backgroundColor: AppColors.accent.withAlpha(30),
                child: Text((user?['full_name'] ?? '?')[0], style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 18))),
              const SizedBox(width: 12),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(user?['full_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(user?['role']?['name'] ?? '', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ]),
            ]),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => auth.logout(),
              icon: const Icon(Icons.logout, color: AppColors.danger),
              label: const Text('ВЫЙТИ', style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.danger, width: 0.5),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _menuItem(IconData icon, String label, VoidCallback onTap) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: AppColors.textSecondary),
        title: Text(label),
        trailing: const Icon(Icons.chevron_right, color: AppColors.textMuted),
        onTap: onTap,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        tileColor: AppColors.card,
      ),
    );
  }
}
