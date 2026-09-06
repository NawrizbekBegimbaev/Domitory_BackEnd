import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../core/widgets.dart';

/// Income list opened from the dashboard "Собрано" widget.
/// Filter: month / quarter / year (server-side via /reports/payments/?period=).
class IncomeScreen extends StatefulWidget {
  final String initialPeriod;
  const IncomeScreen({super.key, this.initialPeriod = 'quarter'});

  @override
  State<IncomeScreen> createState() => _IncomeScreenState();
}

class _IncomeScreenState extends State<IncomeScreen> {
  late String _period;
  Map<String, dynamic>? _report;
  bool _loading = true;
  String? _error;

  static const _periods = [
    ('month', 'Месяц'),
    ('quarter', 'Квартал'),
    ('year', 'Год'),
  ];

  @override
  void initState() {
    super.initState();
    _period = widget.initialPeriod;
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final resp = await Api.get('/reports/payments/', params: {'period': _period});
      if (resp.statusCode == 200) {
        _report = jsonDecode(resp.body);
      } else {
        _error = 'Ошибка загрузки доходов';
      }
    } catch (e) {
      _error = 'Ошибка сети: $e';
    }
    if (mounted) setState(() => _loading = false);
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

  String _formatDate(dynamic date) {
    if (date == null) return '-';
    final s = date.toString();
    if (s.length >= 10) {
      final parts = s.substring(0, 10).split('-');
      if (parts.length == 3) return '${parts[2]}.${parts[1]}.${parts[0]}';
    }
    return s;
  }

  String _methodLabel(dynamic method) {
    switch (method) {
      case 'cash': return 'Наличные';
      case 'bank_transfer': return 'Перевод';
      case 'card': return 'Карта';
      default: return method?.toString() ?? '-';
    }
  }

  @override
  Widget build(BuildContext context) {
    final payments = (_report?['payments'] as List<dynamic>?) ?? [];
    final byMethod = (_report?['by_method'] as List<dynamic>?) ?? [];
    return Scaffold(
      appBar: const BrandAppBar(),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Row(children: [
            const Text('Доходы', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const Spacer(),
            if (_report?['date_from'] != null)
              Text('${_formatDate(_report!['date_from'])} — ${_formatDate(_report!['date_to'])}',
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          ]),
        ),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            decoration: BoxDecoration(color: AppColors.card2, borderRadius: BorderRadius.circular(10)),
            padding: const EdgeInsets.all(4),
            child: Row(children: _periods.map((p) {
              final selected = p.$1 == _period;
              return Expanded(
                child: GestureDetector(
                  onTap: () { if (!selected) { setState(() => _period = p.$1); _load(); } },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.accent : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(p.$2, textAlign: TextAlign.center,
                        style: TextStyle(color: selected ? Colors.white : AppColors.textSecondary, fontWeight: FontWeight.w600, fontSize: 13)),
                  ),
                ),
              );
            }).toList()),
          ),
        ),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [AppColors.success.withAlpha(30), AppColors.success.withAlpha(10)]),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.success.withAlpha(50)),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Всего собрано', style: TextStyle(color: AppColors.success, fontSize: 13, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text('${_formatMoney(_report?['total'] ?? 0)} UZS',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.success)),
              const SizedBox(height: 6),
              Wrap(spacing: 12, children: [
                Text('Платежей: ${_report?['count'] ?? 0}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                ...byMethod.map((m) => Text('${_methodLabel(m['payment_method'])}: ${_formatMoney(m['total'])}',
                    style: const TextStyle(color: AppColors.textSecondary, fontSize: 12))),
              ]),
            ]),
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
              : _error != null
                  ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextButton(onPressed: _load, child: const Text('Повторить')),
                    ]))
                  : payments.isEmpty
                      ? const Center(child: Text('Нет платежей за период', style: TextStyle(color: AppColors.textMuted)))
                      : RefreshIndicator(
                          color: AppColors.accent,
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            itemCount: payments.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (_, i) => _paymentCard(payments[i]),
                          ),
                        ),
        ),
      ]),
    );
  }

  Widget _paymentCard(dynamic p) {
    final amount = double.tryParse(p['amount'].toString()) ?? 0;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: cardDecoration(),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: AppColors.success.withAlpha(20), borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.payments_outlined, color: AppColors.success, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(p['resident_name'] ?? 'Жилец', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 2),
          Text('${_formatDate(p['payment_date'])} · ${_methodLabel(p['payment_method'])}',
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
        ])),
        Text('${amount < 0 ? '' : '+'}${_formatMoney(amount)}',
            style: TextStyle(color: amount < 0 ? AppColors.danger : AppColors.success, fontWeight: FontWeight.bold, fontSize: 15)),
      ]),
    );
  }
}
