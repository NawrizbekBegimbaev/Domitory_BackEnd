import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';

class UsersScreen extends StatefulWidget {
  const UsersScreen({super.key});

  @override
  State<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends State<UsersScreen> {
  List<dynamic> _users = [];
  bool _loading = true;
  String? _error;

  static const _roleLabels = {
    'platform_admin': 'Платформа',
    'university_admin': 'Админ',
    'dorm_manager': 'Комендант',
    'accountant': 'Бухгалтер',
    'security_staff': 'Охрана',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final resp = await Api.get('/users/', params: {'page_size': '50'});
      if (!mounted) return;
      if (resp.statusCode == 200) {
        final body = jsonDecode(resp.body);
        setState(() {
          _users = body is List ? body : body['results'] ?? [];
          _loading = false;
        });
      } else {
        setState(() { _error = 'Ошибка ${resp.statusCode}'; _loading = false; });
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('DORMITORY'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(children: [
              const Text('Пользователи', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const Spacer(),
              Text('${_users.length}', style: const TextStyle(color: AppColors.textMuted)),
            ]),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
                : _error != null
                    ? Center(
                        child: Column(mainAxisSize: MainAxisSize.min, children: [
                          const Icon(Icons.error_outline, color: AppColors.danger, size: 48),
                          const SizedBox(height: 12),
                          Text(_error!, style: const TextStyle(color: AppColors.textSecondary)),
                          const SizedBox(height: 8),
                          TextButton(onPressed: _load, child: const Text('Повторить')),
                        ]),
                      )
                    : RefreshIndicator(
                        color: AppColors.accent,
                        onRefresh: _load,
                        child: _users.isEmpty
                            ? ListView(children: const [
                                SizedBox(height: 80),
                                Center(child: Text('Нет пользователей', style: TextStyle(color: AppColors.textMuted))),
                              ])
                            : ListView.separated(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                itemCount: _users.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 8),
                                itemBuilder: (_, i) => _userCard(_users[i]),
                              ),
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.accent,
        onPressed: () {
          // Navigate to add user screen
        },
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  void _showUserDetails(dynamic u) {
    final name = u['full_name'] ?? '';
    final email = u['email'] ?? '';
    final phone = u['phone'] ?? '-';
    final roleName = u['role'] is Map ? u['role']['name'] ?? '' : u['role']?.toString() ?? '';
    final roleLabel = _roleLabels[roleName] ?? roleName;
    final isActive = u['is_active'] ?? true;
    final photo = u['photo'];
    final orgName = u['organization'] is Map ? u['organization']['name'] ?? '-' : '-';

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 20),
          CircleAvatar(
            radius: 36,
            backgroundColor: AppColors.accent.withAlpha(25),
            backgroundImage: photo != null && photo.toString().isNotEmpty ? NetworkImage(photo.toString()) : null,
            child: photo == null || photo.toString().isEmpty
                ? Text(name.isNotEmpty ? name[0].toUpperCase() : '?', style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 24))
                : null,
          ),
          const SizedBox(height: 14),
          Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: AppColors.accent.withAlpha(20), borderRadius: BorderRadius.circular(12)),
            child: Text(roleLabel, style: const TextStyle(color: AppColors.accent, fontSize: 12, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(height: 20),
          _detailRow(Icons.email_outlined, 'Email', email),
          _detailRow(Icons.phone_outlined, 'Телефон', phone),
          _detailRow(Icons.business_outlined, 'Организация', orgName),
          _detailRow(
            Icons.circle,
            'Статус',
            isActive ? 'Активен' : 'Заблокирован',
            valueColor: isActive ? AppColors.success : AppColors.danger,
          ),
          const SizedBox(height: 16),
        ]),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(children: [
        Icon(icon, size: 18, color: AppColors.textMuted),
        const SizedBox(width: 12),
        SizedBox(width: 90, child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 12))),
        Expanded(child: Text(value, style: TextStyle(color: valueColor ?? AppColors.textPrimary, fontWeight: FontWeight.w500, fontSize: 13))),
      ]),
    );
  }

  Widget _userCard(dynamic u) {
    final name = u['full_name'] ?? '';
    final email = u['email'] ?? '';
    final roleName = u['role'] is Map ? u['role']['name'] ?? '' : u['role']?.toString() ?? '';
    final roleLabel = _roleLabels[roleName] ?? roleName;
    final isActive = u['is_active'] ?? true;
    final photo = u['photo'];

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
      ),
      child: InkWell(
        onTap: () => _showUserDetails(u),
        child: Row(children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: AppColors.accent.withAlpha(25),
            backgroundImage: photo != null && photo.toString().isNotEmpty ? NetworkImage(photo.toString()) : null,
            child: photo == null || photo.toString().isEmpty
                ? Text(
                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 16),
                  )
                : null,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(height: 2),
              Text(email, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
            ]),
          ),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.accent.withAlpha(20),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(roleLabel, style: const TextStyle(color: AppColors.accent, fontSize: 9, fontWeight: FontWeight.w700)),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: (isActive ? AppColors.success : AppColors.danger).withAlpha(20),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                isActive ? 'Активен' : 'Заблокирован',
                style: TextStyle(color: isActive ? AppColors.success : AppColors.danger, fontSize: 9, fontWeight: FontWeight.w700),
              ),
            ),
          ]),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right, color: AppColors.textMuted, size: 20),
        ]),
      ),
    );
  }
}
