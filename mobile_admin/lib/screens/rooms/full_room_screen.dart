import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../core/widgets.dart';

class FullRoomScreen extends StatefulWidget {
  final Map<String, dynamic> room;
  const FullRoomScreen({super.key, required this.room});

  @override
  State<FullRoomScreen> createState() => _FullRoomScreenState();
}

class _ResidentEntry {
  Map<String, dynamic>? resident;
  List<dynamic> searchResults = [];
  String searchQuery = '';
  bool searching = false;
  int months = 0;
}

class _FullRoomScreenState extends State<FullRoomScreen> {
  List<_ResidentEntry> _entries = [];
  List<dynamic> _buildings = [];
  bool _saving = false;

  int get _capacity => widget.room['capacity'] ?? 1;
  double get _pricePerBed => double.tryParse(widget.room['monthly_price']?.toString() ?? '0') ?? 0;
  double get _totalPrice => _pricePerBed * _capacity;
  double get _priceEach => _entries.isNotEmpty ? _totalPrice / _entries.length : _totalPrice;

  @override
  void initState() {
    super.initState();
    _entries = [_ResidentEntry()];
    _loadBuildings();
  }

  Future<void> _loadBuildings() async {
    try {
      final resp = await Api.get('/buildings/', params: {'page_size': '100'});
      if (resp.statusCode == 200 && mounted) {
        _buildings = jsonDecode(resp.body)['results'] ?? [];
      }
    } catch (_) {}
  }

  Future<void> _search(int index, String query) async {
    if (query.length < 2) {
      setState(() => _entries[index].searchResults = []);
      return;
    }
    setState(() => _entries[index].searching = true);
    try {
      final resp = await Api.get('/residents/', params: {'search': query, 'page_size': '5'});
      if (resp.statusCode == 200 && mounted) {
        setState(() => _entries[index].searchResults = jsonDecode(resp.body)['results'] ?? []);
      }
    } catch (_) {}
    if (mounted) setState(() => _entries[index].searching = false);
  }

  String _formatMoney(double v) {
    final str = v.toStringAsFixed(0);
    final buf = StringBuffer();
    for (int i = 0; i < str.length; i++) {
      if (i > 0 && (str.length - i) % 3 == 0) buf.write(' ');
      buf.write(str[i]);
    }
    return buf.toString();
  }

  bool get _canSave => _entries.every((e) => e.resident != null && e.months > 0);

  Future<void> _save() async {
    if (!_canSave) return;
    setState(() => _saving = true);

    try {
      final today = DateTime.now();
      final todayStr = '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';
      final buildingId = widget.room['building']?.toString() ?? _buildings.firstOrNull?['id']?.toString() ?? '';

      final assignments = <Map<String, String>>[];

      for (final entry in _entries) {
        final endDate = DateTime(today.year, today.month + entry.months, today.day);
        final endStr = '${endDate.year}-${endDate.month.toString().padLeft(2, '0')}-${endDate.day.toString().padLeft(2, '0')}';
        final rand = (Random().nextInt(9000) + 1000).toString();

        final contractResp = await Api.post('/contracts/', body: {
          'resident': entry.resident!['id'],
          'building': buildingId,
          'contract_number': 'ДГ-${today.year}-$rand',
          'start_date': todayStr,
          'end_date': endStr,
        });

        if (contractResp.statusCode == 201 || contractResp.statusCode == 200) {
          final contract = jsonDecode(contractResp.body);
          assignments.add({
            'resident': entry.resident!['id'].toString(),
            'contract': contract['id'].toString(),
          });
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Ошибка создания договора для ${entry.resident!['full_name']}'), backgroundColor: AppColors.danger),
            );
          }
          setState(() => _saving = false);
          return;
        }
      }

      // Full room assignment
      final resp = await Api.post('/assignments/full-room/', body: {
        'room': widget.room['id'],
        'assignments': assignments,
      });

      if (mounted) {
        if (resp.statusCode == 201 || resp.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Комната заселена'), backgroundColor: AppColors.success),
          );
          Navigator.pop(context, true);
        } else {
          final body = jsonDecode(resp.body);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Ошибка: ${body['error']?['message'] ?? body.toString()}'), backgroundColor: AppColors.danger),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка: $e'), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const AjouAppBar(),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const Text('Вся комната', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text('Комната ${widget.room['room_number']} · ${_capacity} мест', style: const TextStyle(color: AppColors.textSecondary, fontSize: 14)),
        const SizedBox(height: 16),

        // Price calculation
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppColors.accent.withAlpha(15),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.accent.withAlpha(40)),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('$_capacity мест × ${_formatMoney(_pricePerBed)} = ${_formatMoney(_totalPrice)} UZS/мес',
                style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
            const SizedBox(height: 4),
            Text('÷ ${_entries.length} жилец${_entries.length > 1 ? 'а' : ''} = ${_formatMoney(_priceEach)} UZS каждый',
                style: TextStyle(color: AppColors.accent, fontSize: 15, fontWeight: FontWeight.w700)),
          ]),
        ),
        const SizedBox(height: 20),

        // Residents
        ...List.generate(_entries.length, (i) => _buildResidentCard(i)),

        // Add resident button
        if (_entries.length < _capacity) ...[
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () => setState(() => _entries.add(_ResidentEntry())),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border, style: BorderStyle.solid),
              ),
              child: const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                Icon(Icons.add, color: AppColors.accent, size: 18),
                SizedBox(width: 6),
                Text('Добавить жильца', style: TextStyle(color: AppColors.accent, fontSize: 14, fontWeight: FontWeight.w500)),
              ]),
            ),
          ),
        ],
        const SizedBox(height: 24),

        // Save button
        SizedBox(
          width: double.infinity, height: 50,
          child: ElevatedButton(
            onPressed: _saving || !_canSave ? null : _save,
            child: _saving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text('Заселить (${_entries.length} чел.)', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          ),
        ),
        const SizedBox(height: 20),
      ]),
    );
  }

  Widget _buildResidentCard(int index) {
    final entry = _entries[index];
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border, width: 0.5),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text('Жилец ${index + 1}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const Spacer(),
          if (_entries.length > 1)
            GestureDetector(
              onTap: () => setState(() => _entries.removeAt(index)),
              child: const Icon(Icons.close, color: AppColors.danger, size: 18),
            ),
        ]),
        const SizedBox(height: 10),

        // Search or selected
        if (entry.resident == null) ...[
          TextField(
            onChanged: (v) {
              _entries[index].searchQuery = v;
              _search(index, v);
            },
            decoration: const InputDecoration(
              hintText: 'Поиск по имени или ID...',
              prefixIcon: Icon(Icons.search, color: AppColors.textMuted, size: 18),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
            style: const TextStyle(fontSize: 14),
          ),
          if (entry.searchResults.isNotEmpty) ...[
            const SizedBox(height: 4),
            Container(
              decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
              child: Column(children: entry.searchResults.map((r) => InkWell(
                onTap: () => setState(() {
                  _entries[index].resident = Map<String, dynamic>.from(r);
                  _entries[index].searchResults = [];
                }),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(children: [
                    ResidentAvatar(photoUrl: r['photo']?.toString(), name: r['full_name'] ?? '?', radius: 14),
                    const SizedBox(width: 8),
                    Expanded(child: Text(r['full_name'] ?? '', style: const TextStyle(fontSize: 13))),
                    Text('#${r['university_id'] ?? ''}', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                  ]),
                ),
              )).toList()),
            ),
          ],
        ] else ...[
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.accent.withAlpha(10), borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.accent.withAlpha(40))),
            child: Row(children: [
              ResidentAvatar(photoUrl: entry.resident!['photo']?.toString(), name: entry.resident!['full_name'] ?? '?', radius: 16),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(entry.resident!['full_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                Text('#${entry.resident!['university_id'] ?? ''}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              ])),
              GestureDetector(
                onTap: () => setState(() => _entries[index].resident = null),
                child: const Icon(Icons.close, color: AppColors.textMuted, size: 16),
              ),
            ]),
          ),
          const SizedBox(height: 10),

          // Duration
          const Text('Срок (месяцев)', style: TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Wrap(spacing: 6, runSpacing: 6, children: List.generate(12, (mi) {
            final m = mi + 1;
            final selected = entry.months == m;
            return GestureDetector(
              onTap: () => setState(() => _entries[index].months = m),
              child: Container(
                width: 42, height: 36,
                decoration: BoxDecoration(
                  color: selected ? AppColors.accent : AppColors.card,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: selected ? AppColors.accent : AppColors.border),
                ),
                alignment: Alignment.center,
                child: Text('$m', style: TextStyle(color: selected ? Colors.white : AppColors.textSecondary, fontWeight: FontWeight.w600, fontSize: 14)),
              ),
            );
          })),
        ],
      ]),
    );
  }
}
