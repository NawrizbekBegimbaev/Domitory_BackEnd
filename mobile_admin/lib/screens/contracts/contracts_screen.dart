import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../core/widgets.dart';

class ContractsScreen extends StatefulWidget {
  const ContractsScreen({super.key});

  @override
  State<ContractsScreen> createState() => _ContractsScreenState();
}

class _ContractsScreenState extends State<ContractsScreen> {
  List<dynamic> _contracts = [];
  String _statusFilter = '';
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
      final params = <String, String>{'page_size': '50'};
      if (_statusFilter.isNotEmpty) params['status'] = _statusFilter;
      final resp = await Api.get('/contracts/', params: params);
      if (resp.statusCode == 200 && mounted) {
        _contracts = jsonDecode(resp.body)['results'] ?? [];
      } else {
        _error = 'Ошибка загрузки договоров';
      }
    } catch (e) {
      _error = 'Ошибка сети: $e';
    }
    if (mounted) setState(() => _loading = false);
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'active': return AppColors.success;
      case 'terminated': return AppColors.danger;
      case 'expired': return AppColors.warning;
      default: return AppColors.textMuted;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'active': return 'Активный';
      case 'terminated': return 'Расторгнут';
      case 'expired': return 'Истёк';
      default: return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tabs = ['', 'active', 'terminated'];
    final tabLabels = ['Все', 'Активные', 'Расторгнутые'];

    return Scaffold(
      appBar: const AjouAppBar(),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Row(children: [
            const Text('Договоры', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const Spacer(),
            Text('${_contracts.length}', style: const TextStyle(color: AppColors.textMuted)),
          ]),
        ),
        const SizedBox(height: 12),

        // Status tabs
        SizedBox(
          height: 36,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: tabs.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final active = _statusFilter == tabs[i];
              return GestureDetector(
                onTap: () { _statusFilter = tabs[i]; _load(); },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(color: active ? AppColors.accent : AppColors.card, borderRadius: BorderRadius.circular(20), border: Border.all(color: active ? AppColors.accent : AppColors.border)),
                  alignment: Alignment.center,
                  child: Text(tabLabels[i], style: TextStyle(color: active ? Colors.white : AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),

        // Contracts list
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
              : _error != null
                  ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextButton(onPressed: _load, child: const Text('Повторить')),
                    ]))
                  : _contracts.isEmpty
                      ? const Center(child: Text('Нет договоров', style: TextStyle(color: AppColors.textMuted)))
                      : RefreshIndicator(
                          color: AppColors.accent,
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _contracts.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 8),
                            itemBuilder: (_, i) => _contractCard(_contracts[i]),
                          ),
                        ),
        ),
      ]),
    );
  }

  Widget _contractCard(dynamic c) {
    final status = c['status'] ?? '';
    final color = _statusColor(status);
    final residentName = c['resident_detail']?['full_name'] ?? c['resident_name'] ?? 'Жилец #${c['resident'] ?? ''}';
    final buildingName = c['building_detail']?['name'] ?? c['building_name'] ?? '';

    return GestureDetector(
      onTap: () => _showContractDetail(c),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border), boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2))]),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(c['contract_number'] ?? '', style: const TextStyle(fontFamily: 'monospace', color: AppColors.accent, fontWeight: FontWeight.w700, fontSize: 14))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(8)),
              child: Text(_statusLabel(status), style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
            ),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            const Icon(Icons.person_outline, color: AppColors.textMuted, size: 14),
            const SizedBox(width: 6),
            Expanded(child: Text(residentName, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13))),
          ]),
          if (buildingName.isNotEmpty) ...[
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.apartment_outlined, color: AppColors.textMuted, size: 14),
              const SizedBox(width: 6),
              Text(buildingName, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            ]),
          ],
          const SizedBox(height: 6),
          Row(children: [
            const Icon(Icons.calendar_today_outlined, color: AppColors.textMuted, size: 12),
            const SizedBox(width: 6),
            Text('${_formatDate(c['start_date'])} — ${_formatDate(c['end_date'])}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          ]),
        ]),
      ),
    );
  }

  void _showContractDetail(dynamic contract) {
    final status = contract['status'] ?? '';
    final color = _statusColor(status);
    final residentName = contract['resident_detail']?['full_name'] ?? contract['resident_name'] ?? 'Жилец #${contract['resident'] ?? ''}';
    final buildingName = contract['building_detail']?['name'] ?? contract['building_name'] ?? '-';

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.3,
        maxChildSize: 0.75,
        expand: false,
        builder: (_, controller) => ListView(controller: controller, padding: const EdgeInsets.all(20), children: [
          Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 16),
          Row(children: [
            const Text('Договор', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(10)),
              child: Text(_statusLabel(status), style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
            ),
          ]),
          const SizedBox(height: 12),
          Text(contract['contract_number'] ?? '', style: const TextStyle(fontFamily: 'monospace', color: AppColors.accent, fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 16),
          _detailRow('Жилец', residentName),
          _detailRow('Корпус', buildingName),
          _detailRow('Начало', _formatDate(contract['start_date'])),
          _detailRow('Окончание', _formatDate(contract['end_date'])),
          if (contract['created_by_detail']?['full_name'] != null)
            _detailRow('Создал', contract['created_by_detail']['full_name']),
          const SizedBox(height: 20),
          if (status == 'active')
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14)),
                onPressed: () => _terminateContract(contract['id'].toString(), ctx),
                child: const Text('РАСТОРГНУТЬ ДОГОВОР', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
        ]),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(children: [
        SizedBox(width: 100, child: Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13))),
        Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13))),
      ]),
    );
  }

  Future<void> _terminateContract(String contractId, BuildContext sheetContext) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: const Text('Расторгнуть договор?', style: TextStyle(fontSize: 16)),
        content: const Text('Это действие нельзя отменить.', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Отмена')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Расторгнуть'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      final resp = await Api.post('/contracts/$contractId/terminate/');
      if (mounted) {
        Navigator.pop(sheetContext);
        if (resp.statusCode == 200 || resp.statusCode == 204) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Договор расторгнут'), backgroundColor: AppColors.success));
          _load();
        } else {
          final body = jsonDecode(resp.body);
          final msg = body['error']?['message'] ?? body['detail'] ?? 'Ошибка';
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg.toString()), backgroundColor: AppColors.danger));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: AppColors.danger));
    }
  }

  String _formatDate(dynamic date) {
    if (date == null) return '-';
    final s = date.toString();
    if (s.length >= 10) {
      final d = s.substring(0, 10);
      final parts = d.split('-');
      if (parts.length == 3) return '${parts[2]}.${parts[1]}.${parts[0]}';
      return d;
    }
    return s;
  }
}
