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

  Map<String, dynamic>? _summary;
  List<dynamic> _debtors = [];
  List<dynamic> _occupancy = [];
  List<dynamic> _payments = [];
  int _paymentsCount = 0;
  String _paymentsTotal = '0';
  List<dynamic> _residents = [];
  bool _loading = true;
  String? _error;

  // Filters
  String _paymentMethodFilter = '';
  String _residentStatusFilter = '';
  String _residentGenderFilter = '';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
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
      final paymentParams = <String, String>{};
      if (_paymentMethodFilter.isNotEmpty) paymentParams['method'] = _paymentMethodFilter;

      final residentParams = <String, String>{};
      if (_residentStatusFilter.isNotEmpty) residentParams['status'] = _residentStatusFilter;
      if (_residentGenderFilter.isNotEmpty) residentParams['gender'] = _residentGenderFilter;

      final results = await Future.wait([
        Api.get('/reports/summary/'),
        Api.get('/reports/debtors/'),
        Api.get('/reports/occupancy/'),
        Api.get('/reports/payments/', params: paymentParams.isNotEmpty ? paymentParams : null),
        Api.get('/reports/residents/', params: residentParams.isNotEmpty ? residentParams : null),
      ]);
      if (!mounted) return;
      setState(() {
        if (results[0].statusCode == 200) _summary = jsonDecode(results[0].body);
        _debtors = _parseList(results[1]);
        _occupancy = _parseList(results[2]);
        if (results[3].statusCode == 200) {
          final body = jsonDecode(results[3].body);
          if (body is List) {
            _payments = body;
            _paymentsCount = body.length;
            _paymentsTotal = '0';
          } else {
            _payments = body['payments'] ?? body['results'] ?? [];
            _paymentsCount = body['count'] ?? _payments.length;
            _paymentsTotal = body['total']?.toString() ?? '0';
          }
        }
        _residents = _parseList(results[4]);
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  List<dynamic> _parseList(dynamic resp) {
    if (resp.statusCode != 200) return [];
    final body = jsonDecode(resp.body);
    return body is List ? body : body['results'] ?? [];
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
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Text('Отчёты', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          ),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: List.generate(5, (i) {
                final labels = ['Сводка', 'Должники', 'Занятость', 'Оплаты', 'Жильцы'];
                final selected = _tabController.index == i;
                return Padding(
                  padding: EdgeInsets.only(right: i < 4 ? 6 : 0),
                  child: GestureDetector(
                    onTap: () => setState(() => _tabController.animateTo(i)),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: selected ? AppColors.accent : AppColors.card,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: selected ? AppColors.accent : AppColors.border),
                      ),
                      alignment: Alignment.center,
                      child: Text(labels[i], style: TextStyle(color: selected ? Colors.white : AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
                    ),
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
                : _error != null
                    ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.error_outline, color: AppColors.danger, size: 48),
                        const SizedBox(height: 12),
                        const Text('Ошибка загрузки', style: TextStyle(color: AppColors.textSecondary)),
                        const SizedBox(height: 8),
                        TextButton(onPressed: _load, child: const Text('Повторить')),
                      ]))
                    : TabBarView(
                        controller: _tabController,
                        children: [
                          _buildSummaryTab(),
                          _buildDebtorsTab(),
                          _buildOccupancyTab(),
                          _buildPaymentsTab(),
                          _buildResidentsTab(),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  // --- SUMMARY TAB ---
  Widget _buildSummaryTab() {
    if (_summary == null) return const Center(child: Text('Нет данных', style: TextStyle(color: AppColors.textMuted)));
    final totalResidents = _summary!['total_residents'] ?? 0;
    final totalDebt = double.tryParse(_summary!['total_debt']?.toString() ?? '0') ?? 0;
    final freeBeds = _summary!['free_beds'] ?? 0;
    final collected = double.tryParse(_summary!['collected_this_month']?.toString() ?? '0') ?? 0;
    final totalCharged = double.tryParse(_summary!['total_charged']?.toString() ?? '0') ?? 0;
    final collectionPct = totalCharged > 0 ? ((collected / totalCharged) * 100).round() : 0;

    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.symmetric(horizontal: 16), children: [
        // KPI cards
        Row(children: [
          _kpiCard('Жильцов', '$totalResidents', AppColors.accent, Icons.people),
          const SizedBox(width: 8),
          _kpiCard('Свободных мест', '$freeBeds', AppColors.success, Icons.bed),
        ]),
        const SizedBox(height: 8),
        Row(children: [
          _kpiCard('Задолженность', '${_formatMoney(totalDebt)} UZS', AppColors.danger, Icons.warning_amber),
          const SizedBox(width: 8),
          _kpiCard('Собрано', '${_formatMoney(collected)} UZS', AppColors.success, Icons.payments),
        ]),
        const SizedBox(height: 8),
        // Collection percentage
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Text('Процент сбора', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              const Spacer(),
              Text('$collectionPct%', style: TextStyle(color: collectionPct > 70 ? AppColors.success : AppColors.warning, fontWeight: FontWeight.bold, fontSize: 18)),
            ]),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: collectionPct / 100,
                minHeight: 8,
                backgroundColor: AppColors.border,
                valueColor: AlwaysStoppedAnimation(collectionPct > 70 ? AppColors.success : AppColors.warning),
              ),
            ),
            const SizedBox(height: 6),
            Text('Начислено: ${_formatMoney(totalCharged)} UZS  |  Оплачено: ${_formatMoney(collected)} UZS',
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          ]),
        ),

        // Payments by method
        if (_payments.isNotEmpty) ...[
          const SizedBox(height: 20),
          const Text('Оплаты по методу', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
          const SizedBox(height: 8),
          _buildMethodBreakdown(),
        ],
      ]),
    );
  }

  Widget _kpiCard(String label, String value, Color color, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
        child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            const SizedBox(height: 4),
            Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16)),
          ])),
          Icon(icon, color: color.withAlpha(80), size: 24),
        ]),
      ),
    );
  }

  Widget _buildMethodBreakdown() {
    double cashTotal = 0, bankTotal = 0;
    for (final p in _payments) {
      final amount = double.tryParse(p['amount']?.toString() ?? '0') ?? 0;
      if (p['payment_method'] == 'cash') {
        cashTotal += amount;
      } else {
        bankTotal += amount;
      }
    }
    final total = cashTotal + bankTotal;
    final cashPct = total > 0 ? ((cashTotal / total) * 100).round() : 0;
    final bankPct = total > 0 ? 100 - cashPct : 0;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Column(children: [
        _methodRow('Наличные', cashTotal, cashPct, AppColors.success),
        const SizedBox(height: 10),
        _methodRow('Перевод', bankTotal, bankPct, Colors.blue),
      ]),
    );
  }

  Widget _methodRow(String label, double amount, int pct, Color color) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
        const Spacer(),
        Text('${_formatMoney(amount)} UZS', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        const SizedBox(width: 8),
        Text('$pct%', style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13)),
      ]),
      const SizedBox(height: 4),
      ClipRRect(
        borderRadius: BorderRadius.circular(2),
        child: LinearProgressIndicator(value: pct / 100, minHeight: 4, backgroundColor: AppColors.border, valueColor: AlwaysStoppedAnimation(color)),
      ),
    ]);
  }

  // --- DEBTORS TAB ---
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
      child: ListView(padding: const EdgeInsets.symmetric(horizontal: 16), children: [
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
          const Padding(padding: EdgeInsets.all(32), child: Text('Нет должников', style: TextStyle(color: AppColors.textMuted), textAlign: TextAlign.center)),
        ..._debtors.map((d) => _debtorCard(d)),
      ]),
    );
  }

  Widget _statCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
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
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border), boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2))]),
      child: Row(children: [
        ResidentAvatar(photoUrl: d['photo']?.toString(), name: d['full_name'] ?? '?', radius: 20),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(d['full_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 2),
          Text('${d['faculty'] ?? ''} · ${d['room_number'] ?? ''}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
        ])),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('${_formatMoney(d['debt'])} UZS', style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 14)),
          if (monthsOverdue > 0) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: AppColors.danger.withAlpha(20), borderRadius: BorderRadius.circular(8)),
              child: Text('$monthsOverdue мес.', style: const TextStyle(color: AppColors.danger, fontSize: 11, fontWeight: FontWeight.w700)),
            ),
          ],
        ]),
      ]),
    );
  }

  // --- OCCUPANCY TAB ---
  Widget _buildOccupancyTab() {
    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.symmetric(horizontal: 16), children: [
        if (_occupancy.isEmpty)
          const Padding(padding: EdgeInsets.all(32), child: Text('Нет данных', style: TextStyle(color: AppColors.textMuted), textAlign: TextAlign.center)),
        ..._occupancy.map((b) => _buildingCard(b)),
      ]),
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
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border), boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2))]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(b['building_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15))),
          Text('${pct.toInt()}%', style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16)),
        ]),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(value: pct / 100, minHeight: 8, backgroundColor: AppColors.border, valueColor: AlwaysStoppedAnimation(color)),
        ),
        const SizedBox(height: 6),
        Text('$occupied / $capacity мест занято', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
      ]),
    );
  }

  // --- PAYMENTS TAB ---
  Widget _buildPaymentsTab() {
    final methods = ['', 'cash', 'bank_transfer'];
    final methodLabels = ['Все', 'Наличные', 'Перевод'];

    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.symmetric(horizontal: 16), children: [
        // Method filter
        SizedBox(
          height: 32,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: methods.length,
            separatorBuilder: (_, __) => const SizedBox(width: 6),
            itemBuilder: (_, i) {
              final active = _paymentMethodFilter == methods[i];
              return GestureDetector(
                onTap: () { _paymentMethodFilter = methods[i]; _load(); },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(color: active ? AppColors.accent : AppColors.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: active ? AppColors.accent : AppColors.border)),
                  alignment: Alignment.center,
                  child: Text(methodLabels[i], style: TextStyle(color: active ? Colors.white : AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        // Stats
        Row(children: [
          _statCard('Кол-во', '$_paymentsCount', AppColors.accent),
          const SizedBox(width: 8),
          _statCard('Сумма', '${_formatMoney(_paymentsTotal)} UZS', AppColors.success),
        ]),
        const SizedBox(height: 12),
        if (_payments.isEmpty)
          const Padding(padding: EdgeInsets.all(32), child: Text('Нет оплат', style: TextStyle(color: AppColors.textMuted), textAlign: TextAlign.center)),
        ..._payments.map((p) => _paymentCard(p)),
      ]),
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
    final recordedBy = p['recorded_by_name'] ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border), boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2))]),
      child: Row(children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: AppColors.success.withAlpha(20), borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.payments_outlined, color: AppColors.success, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(p['resident_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 2),
          Text('$date · $methodLabel${recordedBy.isNotEmpty ? ' · $recordedBy' : ''}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
        ])),
        Text('+${_formatMoney(p['amount'])} UZS', style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 14)),
      ]),
    );
  }

  // --- RESIDENTS TAB ---
  Widget _buildResidentsTab() {
    final statuses = ['', 'active', 'evicted', 'graduated'];
    final statusLabels = ['Все', 'Активные', 'Выселенные', 'Выпустились'];
    final genders = ['', 'male', 'female'];
    final genderLabels = ['Все', 'Мужской', 'Женский'];

    final activeCount = _residents.where((r) => r['status'] == 'active').length;
    final evictedCount = _residents.where((r) => r['status'] == 'evicted').length;
    final graduatedCount = _residents.where((r) => r['status'] == 'graduated').length;

    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _load,
      child: ListView(padding: const EdgeInsets.symmetric(horizontal: 16), children: [
        // Status filter
        SizedBox(
          height: 32,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: statuses.length,
            separatorBuilder: (_, __) => const SizedBox(width: 6),
            itemBuilder: (_, i) {
              final active = _residentStatusFilter == statuses[i];
              return GestureDetector(
                onTap: () { _residentStatusFilter = statuses[i]; _load(); },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(color: active ? AppColors.accent : AppColors.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: active ? AppColors.accent : AppColors.border)),
                  alignment: Alignment.center,
                  child: Text(statusLabels[i], style: TextStyle(color: active ? Colors.white : AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
        // Gender filter
        SizedBox(
          height: 32,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: genders.length,
            separatorBuilder: (_, __) => const SizedBox(width: 6),
            itemBuilder: (_, i) {
              final active = _residentGenderFilter == genders[i];
              return GestureDetector(
                onTap: () { _residentGenderFilter = genders[i]; _load(); },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: active ? (genders[i] == 'male' ? Colors.blue : genders[i] == 'female' ? Colors.pink : AppColors.accent) : AppColors.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: active ? Colors.transparent : AppColors.border),
                  ),
                  alignment: Alignment.center,
                  child: Text(genderLabels[i], style: TextStyle(color: active ? Colors.white : AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        // Stats
        Row(children: [
          _statCard('Всего', '${_residents.length}', AppColors.textPrimary),
          const SizedBox(width: 6),
          _statCard('Активных', '$activeCount', AppColors.success),
          const SizedBox(width: 6),
          _statCard('Выселено', '$evictedCount', AppColors.danger),
          const SizedBox(width: 6),
          _statCard('Выпуст.', '$graduatedCount', Colors.blue),
        ]),
        const SizedBox(height: 12),
        if (_residents.isEmpty)
          const Padding(padding: EdgeInsets.all(32), child: Text('Нет данных', style: TextStyle(color: AppColors.textMuted), textAlign: TextAlign.center)),
        ..._residents.map((r) => _residentCard(r)),
      ]),
    );
  }

  Widget _residentCard(dynamic r) {
    final status = r['status'] ?? '';
    final statusColor = status == 'active' ? AppColors.success : status == 'evicted' ? AppColors.danger : status == 'graduated' ? Colors.blue : AppColors.textMuted;
    const statusLabels = {'active': 'Активный', 'pending': 'Ожидающий', 'evicted': 'Выселен', 'graduated': 'Выпустился'};

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Row(children: [
        ResidentAvatar(photoUrl: r['photo']?.toString(), name: r['full_name'] ?? '?', radius: 18),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(r['full_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 2),
          Text('#${r['student_id'] ?? ''} · ${r['faculty'] ?? ''} · ${r['course'] ?? '-'} курс', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(color: statusColor.withAlpha(20), borderRadius: BorderRadius.circular(8)),
          child: Text(statusLabels[status] ?? status, style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w700)),
        ),
      ]),
    );
  }
}
