import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';

class AuditScreen extends StatefulWidget {
  const AuditScreen({super.key});

  @override
  State<AuditScreen> createState() => _AuditScreenState();
}

class _AuditScreenState extends State<AuditScreen> {
  List<dynamic> _entries = [];
  bool _loading = true;
  String? _error;
  String _actionFilter = '';
  String _modelFilter = '';
  int? _expandedIndex;

  static const _actionLabels = {
    '': 'Все действия',
    'create': 'Создание',
    'update': 'Изменение',
    'delete': 'Удаление',
  };

  static const _modelLabels = {
    '': 'Все разделы',
    'RoomAssignment': 'Заселение',
    'Payment': 'Оплата',
    'Resident': 'Жилец',
    'AccommodationContract': 'Договор',
    'Room': 'Комната',
    'Building': 'Корпус',
  };

  static const _actionColors = {
    'create': AppColors.success,
    'update': Color(0xFF3B82F6),
    'delete': AppColors.danger,
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final params = <String, String>{'page_size': '50'};
      if (_actionFilter.isNotEmpty) params['action'] = _actionFilter;
      if (_modelFilter.isNotEmpty) params['model_name'] = _modelFilter;
      final resp = await Api.get('/audit/', params: params);
      if (!mounted) return;
      if (resp.statusCode == 200) {
        final body = jsonDecode(resp.body);
        setState(() {
          _entries = body is List ? body : body['results'] ?? [];
          _loading = false;
        });
      } else {
        setState(() { _error = 'Ошибка ${resp.statusCode}'; _loading = false; });
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  String _actionLabel(String action) => _actionLabels[action] ?? action;
  String _modelLabel(String model) => _modelLabels[model] ?? model;
  Color _actionColor(String action) => _actionColors[action] ?? AppColors.textMuted;

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
            child: Text('Аудит', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(children: [
              Expanded(child: _dropdown(
                value: _actionFilter,
                items: _actionLabels,
                onChanged: (v) { _actionFilter = v ?? ''; _load(); },
              )),
              const SizedBox(width: 8),
              Expanded(child: _dropdown(
                value: _modelFilter,
                items: _modelLabels,
                onChanged: (v) { _modelFilter = v ?? ''; _load(); },
              )),
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
                        child: _entries.isEmpty
                            ? ListView(children: const [
                                SizedBox(height: 80),
                                Center(child: Text('Нет записей', style: TextStyle(color: AppColors.textMuted))),
                              ])
                            : ListView.separated(
                                padding: const EdgeInsets.symmetric(horizontal: 16),
                                itemCount: _entries.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 8),
                                itemBuilder: (_, i) => _auditCard(i),
                              ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _dropdown({
    required String value,
    required Map<String, String> items,
    required ValueChanged<String?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isExpanded: true,
          dropdownColor: AppColors.card,
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
          icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.textMuted, size: 20),
          items: items.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _auditCard(int index) {
    final entry = _entries[index];
    final action = entry['action'] ?? '';
    final model = entry['model_name'] ?? '';
    final timestamp = entry['timestamp'] ?? '';
    final color = _actionColor(action);
    final isExpanded = _expandedIndex == index;

    String timeStr = '';
    try {
      final dt = DateTime.parse(timestamp).toLocal();
      timeStr = '${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')}.${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      timeStr = timestamp;
    }

    return GestureDetector(
      onTap: () => setState(() => _expandedIndex = isExpanded ? null : index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isExpanded ? color.withAlpha(80) : AppColors.border),
          boxShadow: [BoxShadow(color: Colors.black.withAlpha(6), blurRadius: 6, offset: const Offset(0, 2))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(
                    '${_actionLabel(action)} · ${_modelLabel(model)}',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  Text(timeStr, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                ]),
              ),
              Icon(
                isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                color: AppColors.textMuted,
                size: 20,
              ),
            ]),
            if (isExpanded) ...[
              const SizedBox(height: 10),
              const Divider(height: 1),
              const SizedBox(height: 10),
              _detailRow('Пользователь', entry['user_name'] ?? entry['user']?.toString() ?? ''),
              _detailRow('Раздел', _modelLabel(model)),
              if (entry['object_id'] != null)
                _detailRow('ID объекта', entry['object_id'].toString()),
              if (entry['changes'] != null) ...[
                const SizedBox(height: 8),
                const Text('Изменения:', style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                _buildChanges(entry['changes']),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(children: [
        Text('$label: ', style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 13))),
      ]),
    );
  }

  Widget _buildChanges(dynamic changes) {
    if (changes is! Map) {
      return Text(changes.toString(), style: const TextStyle(color: AppColors.textMuted, fontSize: 11));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: (changes as Map).entries.map<Widget>((e) {
        final key = e.key.toString();
        final val = e.value;

        if (val is Map && val.containsKey('old') && val.containsKey('new')) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: RichText(
              text: TextSpan(
                style: const TextStyle(fontSize: 11, fontFamily: 'Inter'),
                children: [
                  TextSpan(text: '$key: ', style: const TextStyle(color: AppColors.textMuted)),
                  TextSpan(
                    text: '${val['old']}',
                    style: const TextStyle(color: AppColors.danger, decoration: TextDecoration.lineThrough),
                  ),
                  const TextSpan(text: ' → ', style: TextStyle(color: AppColors.textMuted)),
                  TextSpan(text: '${val['new']}', style: const TextStyle(color: AppColors.success)),
                ],
              ),
            ),
          );
        }

        return Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Text('$key: $val', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        );
      }).toList(),
    );
  }
}
