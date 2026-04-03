import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../core/widgets.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  List<dynamic> _debtors = [];
  List<dynamic> _occupancy = [];
  List<dynamic> _payments = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) setState(() {});
    });
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        Api.get('/reports/debtors/'),
        Api.get('/reports/occupancy/'),
        Api.get('/reports/payments/'),
      ]);
      if (!mounted) return;
      setState(() {
        _debtors = results[0].statusCode == 200 ? (jsonDecode(results[0].body) is List ? jsonDecode(results[0].body) : jsonDecode(results[0].body)['results'] ?? []) : [];
        _occupancy = results[1].statusCode == 200 ? (jsonDecode(results[1].body) is List ? jsonDecode(results[1].body) : jsonDecode(results[1].body)['results'] ?? []) : [];
        _payments = results[2].statusCode == 200 ? (jsonDecode(results[2].body) is List ? jsonDecode(results[2].body) : jsonDecode(results[2].body)['results'] ?? []) : [];
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
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
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Text('Отчёты', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  color: AppColors.accent,
                  borderRadius: BorderRadius.circular(20),
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                dividerColor: Colors.transparent,
                labelColor: Colors.white,
                unselectedLabelColor: AppColors.textSecondary,
                labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                unselectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                tabs: const [
                  Tab(text: 'Должники'),
                  Tab(text: 'Занятость'),
                  Tab(text: 'Оплаты'),
                ],
              ),
            ),
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
                          Text('Ошибка загрузки', style: const TextStyle(color: AppColors.textSecondary)),
                          const SizedBox(height: 8),
                          TextButton(onPressed: _load, child: const Text('Повторить')),
                        ]),
                      )
                    : TabBarView(
                        controller: _tabController,
                        children: [
                          _buildDebtorsTab(),
                          _buildOccupancyTab(),
                          _buildPaymentsTab(),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildDebtorsTab() {
    final totalDebt = _debtors.fold<double>(0, (sum, d) => sum + (double.tryParse(d['debt'].toString()) ?? 0));
    final avgDebt = _debtors.isNotEmpty ? totalDebt / _debtors.length : 0;
    final maxOverdue = _debtors.fold<int>(0, (max, d) {
      final m = d['months_overdue'] as int? ?? 0;
      return m > max ? m : max;
    });

    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          Row(children: [
            _statCard('Должников', '${_debtors.length}', AppColors.danger),
            const SizedBox(width: 8),
            _statCard('Общий долг', '${_formatMoney(totalDebt)} UZS', AppColors.accent),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            _statCard('Средний долг', '${_formatMoney(avgDebt)} UZS', AppColors.warning),
            const SizedBox(width: 8),
            _statCard('Макс просрочка', '$maxOverdue мес.', AppColors.danger),
          ]),
          const SizedBox(height: 16),
          if (_debtors.isEmpty)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Text('Нет должников', style: TextStyle(color: AppColors.textMuted), textAlign: TextAlign.center),
            ),
          ..._debtors.map((d) => _debtorCard(d)),
        ],
      ),
    );
  }

  Widget _statCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold)),
        ]),
      ),
    );
  }

  Widget _debtorCard(dynamic d) {
    final monthsOverdue = d['months_overdue'] as int? ?? 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Row(children: [
        ResidentAvatar(photoUrl: d['photo']?.toString(), name: d['full_name'] ?? '?', radius: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(d['full_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 2),
            Text(
              '${d['faculty'] ?? ''} · ${d['room_number'] ?? ''}',
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
            ),
          ]),
        ),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(
            '${_formatMoney(d['debt'])} UZS',
            style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 14),
          ),
          if (monthsOverdue > 0) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.danger.withAlpha(20),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '$monthsOverdue мес.',
                style: const TextStyle(color: AppColors.danger, fontSize: 11, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ]),
      ]),
    );
  }

  Widget _buildOccupancyTab() {
    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          if (_occupancy.isEmpty)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Text('Нет данных', style: TextStyle(color: AppColors.textMuted), textAlign: TextAlign.center),
            ),
          ..._occupancy.map((b) => _buildingCard(b)),
        ],
      ),
    );
  }

  Widget _buildingCard(dynamic b) {
    final pct = (b['percentage'] as num?)?.toDouble() ?? 0;
    final occupied = b['occupied'] ?? 0;
    final capacity = b['capacity'] ?? 0;
    final color = pct > 90 ? AppColors.danger : pct > 70 ? AppColors.warning : AppColors.success;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Text(
              b['building_name'] ?? '',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
            ),
          ),
          Text(
            '${pct.toInt()}%',
            style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16),
          ),
        ]),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct / 100,
            minHeight: 8,
            backgroundColor: AppColors.border,
            valueColor: AlwaysStoppedAnimation(color),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '$occupied / $capacity мест занято',
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
        ),
      ]),
    );
  }

  Widget _buildPaymentsTab() {
    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          if (_payments.isEmpty)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Text('Нет оплат', style: TextStyle(color: AppColors.textMuted), textAlign: TextAlign.center),
            ),
          ..._payments.map((p) => _paymentCard(p)),
        ],
      ),
    );
  }

  Widget _paymentCard(dynamic p) {
    final method = p['payment_method'] ?? '';
    final methodLabel = method == 'cash' ? 'Наличные' : method == 'bank_transfer' ? 'Перевод' : method;
    final rawDate = p['payment_date']?.toString() ?? '';
    String date = rawDate;
    if (rawDate.length >= 10) {
      final parts = rawDate.substring(0, 10).split('-');
      if (parts.length == 3) date = '${parts[2]}.${parts[1]}.${parts[0]}';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Row(children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.success.withAlpha(20),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.payments_outlined, color: AppColors.success, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(p['resident_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 2),
            Text('$date · $methodLabel', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          ]),
        ),
        Text(
          '+${_formatMoney(p['amount'])} UZS',
          style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 14),
        ),
      ]),
    );
  }
}
