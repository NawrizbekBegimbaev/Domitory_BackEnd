import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../core/widgets.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _summary;
  List<dynamic> _occupancy = [];
  List<dynamic> _debtors = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final summaryResp = await Api.get('/reports/summary/');
    final occResp = await Api.get('/reports/occupancy/');
    final debtResp = await Api.get('/reports/debtors/');
    if (mounted) {
      setState(() {
        if (summaryResp.statusCode == 200) _summary = jsonDecode(summaryResp.body);
        if (occResp.statusCode == 200) _occupancy = jsonDecode(occResp.body);
        if (debtResp.statusCode == 200) _debtors = jsonDecode(debtResp.body);
      });
    }
  }

  String _formatMoney(dynamic v) {
    final n = double.tryParse(v.toString()) ?? 0;
    final s = n.toInt().toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(' ');
      buf.write(s[i]);
    }
    return buf.toString();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('DORMITORY'), actions: [
        IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () {}),
      ]),
      body: RefreshIndicator(
        color: AppColors.accent,
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Главная', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(DateTime.now().toString().split(' ')[0], style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 16),

            // Stats
            Row(children: [
              _statCard('Жильцов', '${_summary?['total_residents'] ?? 0}', Icons.people, AppColors.accent),
              const SizedBox(width: 12),
              _statCard('Свободно', '${_summary?['free_beds'] ?? 0}', Icons.bed, AppColors.success),
            ]),
            const SizedBox(height: 12),
            _wideStatCard('Задолженность', '${_formatMoney(_summary?['total_debt'] ?? 0)} UZS', AppColors.accent),
            const SizedBox(height: 12),
            _wideStatCard('Собрано за месяц', '${_formatMoney(_summary?['collected_this_month'] ?? 0)} UZS', AppColors.success),

            const SizedBox(height: 24),
            const Text('Занятость корпусов', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            ..._occupancy.map((b) => _buildingRow(b)),

            const SizedBox(height: 24),
            const Text('Топ должников', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            ..._debtors.take(5).map((d) => _debtorRow(d)),
            if (_debtors.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('Нет должников', style: TextStyle(color: AppColors.textMuted), textAlign: TextAlign.center),
              ),
          ],
        ),
      ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
          boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Row(children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
          ]),
          const Spacer(),
          Icon(icon, color: color.withAlpha(100), size: 28),
        ]),
      ),
    );
  }

  Widget _wideStatCard(String label, String value, Color color) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: [color.withAlpha(30), color.withAlpha(10)]),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withAlpha(50)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
      ]),
    );
  }

  Widget _buildingRow(dynamic b) {
    final pct = (b['percentage'] as num?)?.toInt() ?? 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(6), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Row(children: [
        Expanded(child: Text(b['building_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w500))),
        SizedBox(
          width: 80,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: pct / 100, minHeight: 6,
              backgroundColor: AppColors.border,
              valueColor: AlwaysStoppedAnimation(pct > 80 ? AppColors.danger : AppColors.accent),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text('$pct%', style: TextStyle(color: pct > 80 ? AppColors.danger : AppColors.accent, fontWeight: FontWeight.w600, fontSize: 13)),
      ]),
    );
  }

  Widget _debtorRow(dynamic d) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(children: [
        ResidentAvatar(photoUrl: d['photo']?.toString(), name: d['full_name'] ?? '?', radius: 18),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(d['full_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
          Text('${d['faculty'] ?? ''}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
        ])),
        Text('${_formatMoney(d['debt'])} UZS', style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.bold, fontSize: 14)),
      ]),
    );
  }
}
