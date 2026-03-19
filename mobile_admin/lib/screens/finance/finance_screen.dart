import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import 'new_payment_screen.dart';

class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key});

  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> {
  List<dynamic> _payments = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final resp = await Api.get('/payments/', params: {'page_size': '50'});
      if (resp.statusCode == 200 && mounted) {
        _payments = jsonDecode(resp.body)['results'] ?? [];
      } else {
        _error = 'Ошибка загрузки платежей';
      }
    } catch (e) {
      _error = 'Ошибка сети: $e';
    }
    if (mounted) setState(() => _loading = false);
  }

  String _formatAmount(double amount) {
    final str = amount.toStringAsFixed(0);
    final buffer = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) buffer.write(' ');
      buffer.write(str[i]);
    }
    return buffer.toString();
  }

  String _methodLabel(dynamic method) {
    switch (method) {
      case 'cash': return 'Наличные';
      case 'bank_transfer': return 'Перевод';
      case 'card': return 'Карта';
      default: return method?.toString() ?? '-';
    }
  }

  Color _methodColor(dynamic method) {
    switch (method) {
      case 'cash': return AppColors.success;
      case 'bank_transfer': return Colors.blue;
      case 'card': return AppColors.accent;
      default: return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('DORMITORY')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Row(children: [
            const Text('Финансы', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const Spacer(),
            Text('${_payments.length} записей', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          ]),
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
                  : _payments.isEmpty
                      ? const Center(child: Text('Нет платежей', style: TextStyle(color: AppColors.textMuted)))
                      : RefreshIndicator(
                          color: AppColors.accent,
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            itemCount: _payments.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (_, i) => _paymentCard(_payments[i]),
                          ),
                        ),
        ),
      ]),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.accent,
        onPressed: () async {
          await Navigator.push(context, MaterialPageRoute(builder: (_) => const NewPaymentScreen()));
          _load();
        },
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _paymentCard(dynamic p) {
    final amount = (p['amount'] ?? 0).toDouble();
    final method = p['payment_method'];
    final status = p['status'] ?? '';
    final statusColor = status == 'confirmed' ? AppColors.success : status == 'pending' ? AppColors.warning : status == 'cancelled' ? AppColors.danger : AppColors.textMuted;
    final residentName = p['resident_detail']?['full_name'] ?? p['resident_name'] ?? 'Жилец #${p['resident'] ?? ''}';
    final date = p['payment_date']?.toString() ?? p['created_at']?.toString() ?? '';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: AppColors.success.withAlpha(15), borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.payment, color: AppColors.success, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(residentName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 3),
          Text(date.length >= 10 ? date.substring(0, 10) : date, style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        ])),
        const SizedBox(width: 8),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('+${_formatAmount(amount)} UZS', style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 14)),
          const SizedBox(height: 4),
          Row(mainAxisSize: MainAxisSize.min, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: _methodColor(method).withAlpha(15), borderRadius: BorderRadius.circular(6)),
              child: Text(_methodLabel(method), style: TextStyle(color: _methodColor(method), fontSize: 9, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(color: statusColor.withAlpha(15), borderRadius: BorderRadius.circular(6)),
              child: Text(status, style: TextStyle(color: statusColor, fontSize: 9, fontWeight: FontWeight.w600)),
            ),
          ]),
        ]),
      ]),
    );
  }
}
