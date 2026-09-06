import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../core/widgets.dart';

/// Home screen for the read-only `ministry` role: statistics of every university.
class MinistryOverview extends StatefulWidget {
  const MinistryOverview({super.key});

  @override
  State<MinistryOverview> createState() => _MinistryOverviewState();
}

class _MinistryOverviewState extends State<MinistryOverview> {
  Map<String, dynamic>? _data;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final resp = await Api.get('/reports/universities/');
      if (resp.statusCode == 200) _data = jsonDecode(resp.body);
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  String _money(dynamic v) {
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
    final totals = _data?['totals'] as Map<String, dynamic>?;
    final unis = (_data?['universities'] as List<dynamic>?) ?? [];
    return Scaffold(
      appBar: const BrandAppBar(),
      body: RefreshIndicator(
        color: AppColors.accent,
        onRefresh: _load,
        child: _loading && _data == null
            ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text('Университеты', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('${totals?['universities'] ?? 0} университетов · ${totals?['total_residents'] ?? 0} жильцов · загрузка ${totals?['occupancy_percentage'] ?? 0}%',
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                  const SizedBox(height: 16),
                  Row(children: [
                    _tile('Задолженность', '${_money(totals?['total_debt'] ?? 0)} UZS', AppColors.danger),
                    const SizedBox(width: 12),
                    _tile('За квартал', '${_money(totals?['collected_this_quarter'] ?? 0)} UZS', AppColors.success),
                  ]),
                  const SizedBox(height: 20),
                  ...unis.map(_universityCard),
                  if (unis.isEmpty && !_loading)
                    const Padding(padding: EdgeInsets.all(24), child: Text('Нет университетов', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted))),
                ],
              ),
      ),
    );
  }

  Widget _tile(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [color.withAlpha(30), color.withAlpha(10)]),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withAlpha(50)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        ]),
      ),
    );
  }

  Widget _universityCard(dynamic u) {
    final pct = (u['occupancy_percentage'] as num?)?.toDouble() ?? 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: cardDecoration(),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(u['university_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15))),
          Text('${pct.toStringAsFixed(0)}%', style: TextStyle(color: pct > 80 ? AppColors.danger : AppColors.accent, fontWeight: FontWeight.bold)),
        ]),
        if ((u['city'] ?? '').toString().isNotEmpty)
          Text(u['city'], style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct / 100, minHeight: 6,
            backgroundColor: AppColors.border,
            valueColor: AlwaysStoppedAnimation(pct > 80 ? AppColors.danger : AppColors.accent),
          ),
        ),
        const SizedBox(height: 10),
        Wrap(spacing: 14, runSpacing: 4, children: [
          _kv('Корпусов', '${u['buildings'] ?? 0}'),
          _kv('Жильцов', '${u['total_residents'] ?? 0}'),
          _kv('Мест', '${u['total_occupancy'] ?? 0}/${u['total_capacity'] ?? 0}'),
          _kv('Долг', _money(u['total_debt'] ?? 0), color: AppColors.danger),
          _kv('Квартал', _money(u['collected_this_quarter'] ?? 0), color: AppColors.success),
        ]),
      ]),
    );
  }

  Widget _kv(String k, String v, {Color? color}) {
    return RichText(text: TextSpan(children: [
      TextSpan(text: '$k: ', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
      TextSpan(text: v, style: TextStyle(color: color ?? AppColors.textPrimary, fontSize: 12, fontWeight: FontWeight.w600)),
    ]));
  }
}
