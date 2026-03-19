import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../core/api.dart';

class NewPaymentScreen extends StatefulWidget {
  final Map<String, dynamic>? preselectedResident;
  const NewPaymentScreen({super.key, this.preselectedResident});

  @override
  State<NewPaymentScreen> createState() => _NewPaymentScreenState();
}

class _NewPaymentScreenState extends State<NewPaymentScreen> {
  final _searchController = TextEditingController();
  final _amountController = TextEditingController();
  List<dynamic> _searchResults = [];
  Map<String, dynamic>? _selectedResident;
  Map<String, dynamic>? _balance;
  String _paymentMethod = 'cash';
  bool _searching = false;
  bool _loadingBalance = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.preselectedResident != null) {
      _selectedResident = widget.preselectedResident;
      _loadBalance();
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _search(String query) async {
    if (query.length < 2) {
      setState(() => _searchResults = []);
      return;
    }
    setState(() => _searching = true);
    try {
      final resp = await Api.get('/residents/', params: {'search': query, 'page_size': '5'});
      if (resp.statusCode == 200 && mounted) {
        setState(() => _searchResults = jsonDecode(resp.body)['results'] ?? []);
      }
    } catch (_) {}
    if (mounted) setState(() => _searching = false);
  }

  Future<void> _loadBalance() async {
    if (_selectedResident == null) return;
    setState(() => _loadingBalance = true);
    try {
      final resp = await Api.get('/residents/${_selectedResident!['id']}/balance/');
      if (resp.statusCode == 200 && mounted) {
        _balance = jsonDecode(resp.body);
      }
    } catch (_) {}
    if (mounted) setState(() => _loadingBalance = false);
  }

  void _selectResident(dynamic resident) {
    setState(() {
      _selectedResident = Map<String, dynamic>.from(resident);
      _searchResults = [];
      _searchController.clear();
    });
    _loadBalance();
  }

  Future<void> _submit() async {
    if (_selectedResident == null) return;
    final amount = double.tryParse(_amountController.text.replaceAll(' ', ''));
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Введите корректную сумму'), backgroundColor: AppColors.danger));
      return;
    }

    setState(() => _submitting = true);
    try {
      final today = DateTime.now();
      final dateStr = '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
      final resp = await Api.post('/payments/', body: {
        'resident': _selectedResident!['id'],
        'amount': amount.toString(),
        'payment_date': dateStr,
        'payment_method': _paymentMethod,
      });
      if (mounted) {
        if (resp.statusCode == 201 || resp.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Оплата успешно создана'), backgroundColor: AppColors.success));
          Navigator.pop(context, true);
        } else {
          final body = jsonDecode(resp.body);
          final msg = body['error']?['message'] ?? body['detail'] ?? 'Ошибка создания оплаты';
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg.toString()), backgroundColor: AppColors.danger));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка сети: $e'), backgroundColor: AppColors.danger));
    }
    if (mounted) setState(() => _submitting = false);
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

  @override
  Widget build(BuildContext context) {
    final debt = (_balance?['debt'] ?? 0).toDouble();

    return Scaffold(
      appBar: AppBar(
        title: const Text('DORMITORY'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const Text('Новая оплата', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),

        // Search resident
        if (_selectedResident == null) ...[
          const Text('ЖИЛЕЦ', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 1)),
          const SizedBox(height: 8),
          TextField(
            controller: _searchController,
            onChanged: _search,
            decoration: const InputDecoration(
              hintText: 'Поиск по имени или ID...',
              prefixIcon: Icon(Icons.search, color: AppColors.textMuted, size: 20),
            ),
          ),
          if (_searching)
            const Padding(padding: EdgeInsets.all(12), child: Center(child: CircularProgressIndicator(color: AppColors.accent, strokeWidth: 2))),
          if (_searchResults.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(top: 4),
              decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
              child: Column(children: _searchResults.map((r) => InkWell(
                onTap: () => _selectResident(r),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(children: [
                    CircleAvatar(radius: 16, backgroundColor: AppColors.accent.withAlpha(20), child: Text((r['full_name'] ?? '?')[0], style: const TextStyle(color: AppColors.accent, fontSize: 12, fontWeight: FontWeight.bold))),
                    const SizedBox(width: 10),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(r['full_name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                      Text('#${r['university_id'] ?? ''} · ${r['faculty'] ?? ''}', style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
                    ])),
                  ]),
                ),
              )).toList()),
            ),
        ],

        // Selected resident card
        if (_selectedResident != null) ...[
          const Text('ЖИЛЕЦ', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 1)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.accent.withAlpha(60))),
            child: Row(children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: AppColors.accent.withAlpha(20),
                backgroundImage: _selectedResident!['photo'] != null && _selectedResident!['photo'].toString().isNotEmpty ? NetworkImage(_selectedResident!['photo']) : null,
                child: _selectedResident!['photo'] == null || _selectedResident!['photo'].toString().isEmpty
                    ? Text((_selectedResident!['full_name'] ?? '?')[0], style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold))
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(_selectedResident!['full_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                Text('#${_selectedResident!['university_id'] ?? ''} · ${_selectedResident!['faculty'] ?? ''}', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ])),
              if (widget.preselectedResident == null)
                GestureDetector(
                  onTap: () => setState(() { _selectedResident = null; _balance = null; }),
                  child: const Icon(Icons.close, color: AppColors.textMuted, size: 20),
                ),
            ]),
          ),
          const SizedBox(height: 8),
          if (_loadingBalance)
            const Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator(color: AppColors.accent, strokeWidth: 2)))
          else if (_balance != null)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.danger.withAlpha(10), borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.danger.withAlpha(30))),
              child: Row(children: [
                const Icon(Icons.warning_amber_rounded, color: AppColors.danger, size: 18),
                const SizedBox(width: 8),
                Text('Задолженность: ${_formatAmount(debt)} UZS', style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600, fontSize: 13)),
              ]),
            ),
        ],
        const SizedBox(height: 20),

        // Amount input
        const Text('СУММА', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 1)),
        const SizedBox(height: 8),
        TextField(
          controller: _amountController,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          decoration: const InputDecoration(
            hintText: '0',
            hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 24, fontWeight: FontWeight.bold),
            suffixText: 'UZS',
            suffixStyle: TextStyle(color: AppColors.textMuted, fontSize: 16, fontWeight: FontWeight.w600),
          ),
        ),
        if (_balance != null && debt > 0) ...[
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () => _amountController.text = debt.toStringAsFixed(0),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              alignment: Alignment.center,
              decoration: BoxDecoration(color: AppColors.accent.withAlpha(10), borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.accent.withAlpha(30))),
              child: Text('Заполнить долг: ${_formatAmount(debt)} UZS', style: const TextStyle(color: AppColors.accent, fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
        const SizedBox(height: 20),

        // Payment method
        const Text('СПОСОБ ОПЛАТЫ', style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 1)),
        const SizedBox(height: 8),
        _methodRadio('cash', 'Наличные', Icons.money, true),
        const SizedBox(height: 8),
        _methodRadio('bank_transfer', 'Банковский перевод', Icons.account_balance, true),
        const SizedBox(height: 8),
        _methodRadio('card', 'Карта (скоро)', Icons.credit_card, false),
        const SizedBox(height: 28),

        // Submit button
        SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: _submitting || _selectedResident == null ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accent,
              foregroundColor: Colors.white,
              disabledBackgroundColor: AppColors.accent.withAlpha(80),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: _submitting
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                : const Text('ПОДТВЕРДИТЬ ОПЛАТУ', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15, letterSpacing: 0.5)),
          ),
        ),
        const SizedBox(height: 20),
      ]),
    );
  }

  Widget _methodRadio(String value, String label, IconData icon, bool enabled) {
    final selected = _paymentMethod == value;
    return GestureDetector(
      onTap: enabled ? () => setState(() => _paymentMethod = value) : null,
      child: Opacity(
        opacity: enabled ? 1.0 : 0.4,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: selected ? AppColors.accent.withAlpha(10) : AppColors.card,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: selected ? AppColors.accent : AppColors.border),
          ),
          child: Row(children: [
            Icon(icon, color: selected ? AppColors.accent : AppColors.textMuted, size: 20),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: TextStyle(color: enabled ? AppColors.textPrimary : AppColors.textMuted, fontWeight: FontWeight.w500, fontSize: 14))),
            Container(
              width: 20, height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: selected ? AppColors.accent : AppColors.border, width: 2),
              ),
              child: selected
                  ? Center(child: Container(width: 10, height: 10, decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.accent)))
                  : null,
            ),
          ]),
        ),
      ),
    );
  }
}
