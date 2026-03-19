import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/auth_provider.dart';
import '../reports/reports_screen.dart';
import '../audit/audit_screen.dart';
import '../users/users_screen.dart';

class MenuScreen extends StatelessWidget {
  const MenuScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final roleData = user?['role'];
    final roleName = roleData is Map ? (roleData['name'] ?? '') : '';

    final roleLabels = {
      'platform_admin': 'Администратор платформы',
      'university_admin': 'Администратор университета',
      'dorm_manager': 'Комендант',
      'accountant': 'Бухгалтер',
      'security_staff': 'Охрана',
    };

    return Scaffold(
      appBar: AppBar(title: const Text('DORMITORY')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Меню', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),

          _menuItem(Icons.description_outlined, 'Договоры', () {
            // Navigate to contracts screen
          }),
          _menuItem(Icons.apartment_outlined, 'Корпуса', () {
            // Navigate to buildings screen
          }),
          _menuItem(Icons.bar_chart_outlined, 'Отчёты', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportsScreen()));
          }),
          _menuItem(Icons.security_outlined, 'Аудит', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const AuditScreen()));
          }),
          _menuItem(Icons.people_outline, 'Пользователи', () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const UsersScreen()));
          }),

          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),

          // Profile
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: AppColors.accent.withAlpha(30),
                backgroundImage: user?['photo'] != null && user!['photo'].toString().isNotEmpty
                    ? NetworkImage(user['photo'].toString())
                    : null,
                child: user?['photo'] == null || user!['photo'].toString().isEmpty
                    ? Text(
                        (user?['full_name'] ?? '?')[0].toUpperCase(),
                        style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 18),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(
                    user?['full_name'] ?? '',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    roleLabels[roleName] ?? roleName,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  ),
                ]),
              ),
            ]),
          ),

          const SizedBox(height: 16),

          // Logout
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => auth.logout(),
              icon: const Icon(Icons.logout, color: AppColors.danger),
              label: const Text(
                'ВЫЙТИ',
                style: TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600),
              ),
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
