import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import 'floors_screen.dart';

class BuildingsScreen extends StatefulWidget {
  const BuildingsScreen({super.key});

  @override
  State<BuildingsScreen> createState() => _BuildingsScreenState();
}

class _BuildingsScreenState extends State<BuildingsScreen> {
  List<Map<String, dynamic>> _buildingStats = [];
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
      final resp = await Api.get('/buildings/', params: {'page_size': '100'});
      if (resp.statusCode == 200 && mounted) {
        final buildings = (jsonDecode(resp.body)['results'] ?? []) as List;
        final stats = <Map<String, dynamic>>[];
        for (final b in buildings) {
          final bId = b['id'].toString();
          final results = await Future.wait([
            Api.get('/floors/', params: {'building': bId, 'page_size': '100'}),
            Api.get('/rooms/', params: {'building': bId, 'page_size': '500'}),
          ]);
          final floors = results[0].statusCode == 200 ? (jsonDecode(results[0].body)['results'] ?? []) as List : [];
          final rooms = results[1].statusCode == 200 ? (jsonDecode(results[1].body)['results'] ?? []) as List : [];
          final capacity = rooms.fold<int>(0, (s, r) => s + ((r['capacity'] ?? 0) as int));
          final occupancy = rooms.fold<int>(0, (s, r) => s + ((r['current_occupancy'] ?? 0) as int));
          stats.add({
            'building': b,
            'floorCount': floors.length,
            'roomCount': rooms.length,
            'capacity': capacity,
            'occupancy': occupancy,
          });
        }
        if (mounted) setState(() { _buildingStats = stats; _loading = false; });
      } else {
        if (mounted) setState(() { _error = 'Ошибка загрузки корпусов'; _loading = false; });
      }
    } catch (e) {
      if (mounted) setState(() { _error = 'Ошибка сети: $e'; _loading = false; });
    }
  }

  int get _totalCapacity => _buildingStats.fold(0, (s, b) => s + (b['capacity'] as int));
  int get _totalOccupancy => _buildingStats.fold(0, (s, b) => s + (b['occupancy'] as int));
  int get _totalFree => _totalCapacity - _totalOccupancy;
  int get _loadPercent => _totalCapacity > 0 ? ((_totalOccupancy / _totalCapacity) * 100).round() : 0;

  String _genderLabel(String? policy) {
    switch (policy) {
      case 'male_only': return 'Мужской';
      case 'female_only': return 'Женский';
      case 'mixed': return 'Смешанный';
      default: return policy ?? '-';
    }
  }

  Color _genderColor(String? policy) {
    switch (policy) {
      case 'male_only': return Colors.blue;
      case 'female_only': return Colors.pink;
      case 'mixed': return AppColors.accent;
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
            const Text('Корпуса', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const Spacer(),
            Text('${_buildingStats.length}', style: const TextStyle(color: AppColors.textMuted)),
          ]),
        ),
        const SizedBox(height: 12),

        // Summary stats
        if (_buildingStats.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(children: [
              _statCard('Корпуса', '${_buildingStats.length}', AppColors.textPrimary),
              const SizedBox(width: 8),
              _statCard('Вместимость', '$_totalCapacity', AppColors.accent),
              const SizedBox(width: 8),
              _statCard('Занято', '$_totalOccupancy', AppColors.danger),
              const SizedBox(width: 8),
              _statCard('Свободно', '$_totalFree', AppColors.success),
            ]),
          ),
        if (_buildingStats.isNotEmpty) const SizedBox(height: 4),
        if (_buildingStats.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(children: [
              const SizedBox(height: 4),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: _totalCapacity > 0 ? _totalOccupancy / _totalCapacity : 0,
                  backgroundColor: AppColors.border,
                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.accent),
                  minHeight: 4,
                ),
              ),
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.centerRight,
                child: Text('$_loadPercent% загрузка', style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
              ),
            ]),
          ),
        const SizedBox(height: 8),

        // Buildings list
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
              : _error != null
                  ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextButton(onPressed: _load, child: const Text('Повторить')),
                    ]))
                  : _buildingStats.isEmpty
                      ? const Center(child: Text('Нет корпусов', style: TextStyle(color: AppColors.textMuted)))
                      : RefreshIndicator(
                          color: AppColors.accent,
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            itemCount: _buildingStats.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (_, i) => _buildingCard(_buildingStats[i]),
                          ),
                        ),
        ),
      ]),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.accent,
        onPressed: () => _showBuildingForm(null),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _statCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
        child: Column(children: [
          Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 9)),
        ]),
      ),
    );
  }

  Widget _buildingCard(Map<String, dynamic> stat) {
    final b = stat['building'] as Map<String, dynamic>;
    final floorCount = stat['floorCount'] as int;
    final roomCount = stat['roomCount'] as int;
    final capacity = stat['capacity'] as int;
    final occupancy = stat['occupancy'] as int;
    final genderPolicy = b['gender_policy'] as String?;
    final gColor = _genderColor(genderPolicy);

    return GestureDetector(
      onTap: () async {
        await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => FloorsScreen(
            buildingId: b['id'].toString(),
            buildingName: b['name'] ?? 'Корпус',
            buildingGenderPolicy: genderPolicy ?? 'mixed',
          )),
        );
        _load();
      },
      onLongPress: () => _showBuildingForm(b),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(b['name'] ?? 'Корпус', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: gColor.withAlpha(25), borderRadius: BorderRadius.circular(8)),
              child: Text(_genderLabel(genderPolicy).toUpperCase(), style: TextStyle(color: gColor, fontSize: 9, fontWeight: FontWeight.w700)),
            ),
          ]),
          const SizedBox(height: 4),
          Row(children: [
            Container(width: 6, height: 6, decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle)),
            const SizedBox(width: 4),
            const Text('Активный', style: TextStyle(color: AppColors.success, fontSize: 11)),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            _infoChip('Этажей', '$floorCount'),
            const SizedBox(width: 12),
            _infoChip('Комнат', '$roomCount'),
            const SizedBox(width: 12),
            _infoChip('Вместимость', '$capacity'),
          ]),
          const SizedBox(height: 6),
          Row(children: [
            _infoChip('Занято', '$occupancy'),
            const SizedBox(width: 12),
            _infoChip('Свободно', '${capacity - occupancy}'),
          ]),
          if (b['address'] != null && (b['address'] as String).isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.location_on_outlined, color: AppColors.textMuted, size: 14),
              const SizedBox(width: 4),
              Expanded(child: Text(b['address'], style: const TextStyle(color: AppColors.textMuted, fontSize: 11))),
            ]),
          ],
          const SizedBox(height: 10),
          Container(height: 1, color: AppColors.border),
          const SizedBox(height: 10),
          Row(children: [
            GestureDetector(
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => FloorsScreen(
                    buildingId: b['id'].toString(),
                    buildingName: b['name'] ?? 'Корпус',
                    buildingGenderPolicy: genderPolicy ?? 'mixed',
                  )),
                );
                _load();
              },
              child: const Text('Этажи и комнаты', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            ),
            const SizedBox(width: 16),
            GestureDetector(
              onTap: () => _showBuildingForm(b),
              child: const Text('Изменить', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            ),
            const Spacer(),
            GestureDetector(
              onTap: () => _deleteBuilding(b, occupancy),
              child: const Text('Удалить', style: TextStyle(color: AppColors.danger, fontSize: 12)),
            ),
          ]),
        ]),
      ),
    );
  }

  Widget _infoChip(String label, String value) {
    return Row(children: [
      Text('$label: ', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
      Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
    ]);
  }

  void _showBuildingForm(Map<String, dynamic>? building) {
    final isEdit = building != null;
    final nameCtrl = TextEditingController(text: building?['name'] ?? '');
    final addressCtrl = TextEditingController(text: building?['address'] ?? '');
    String genderPolicy = building?['gender_policy'] ?? 'mixed';
    bool saving = false;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 20),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            Text(isEdit ? 'Редактировать корпус' : 'Новый корпус', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 20),
            const Text('НАЗВАНИЕ *', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
            const SizedBox(height: 6),
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(hintText: 'Корпус A'),
            ),
            const SizedBox(height: 16),
            const Text('АДРЕС', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
            const SizedBox(height: 6),
            TextField(
              controller: addressCtrl,
              decoration: const InputDecoration(hintText: 'ул. Примерная, 1'),
            ),
            const SizedBox(height: 16),
            const Text('ГЕНДЕРНАЯ ПОЛИТИКА *', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
              child: DropdownButtonHideUnderline(child: DropdownButton<String>(
                value: genderPolicy,
                isExpanded: true,
                dropdownColor: AppColors.card,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                items: const [
                  DropdownMenuItem(value: 'mixed', child: Text('Смешанный')),
                  DropdownMenuItem(value: 'male_only', child: Text('Мужской')),
                  DropdownMenuItem(value: 'female_only', child: Text('Женский')),
                ],
                onChanged: (v) { if (v != null) setSheetState(() => genderPolicy = v); },
              )),
            ),
            const SizedBox(height: 24),
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textSecondary,
                    side: const BorderSide(color: AppColors.border),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Отмена'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: saving ? null : () async {
                    if (nameCtrl.text.trim().isEmpty) return;
                    setSheetState(() => saving = true);
                    try {
                      final body = {
                        'name': nameCtrl.text.trim(),
                        'address': addressCtrl.text.trim(),
                        'gender_policy': genderPolicy,
                      };
                      final resp = isEdit
                          ? await Api.patch('/buildings/${building['id']}/', body: body)
                          : await Api.post('/buildings/', body: body);
                      if (mounted) {
                        Navigator.pop(ctx);
                        if (resp.statusCode == 200 || resp.statusCode == 201) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                            content: Text(isEdit ? 'Корпус обновлён' : 'Корпус создан'),
                            backgroundColor: AppColors.success,
                          ));
                          _load();
                        } else {
                          final body = jsonDecode(resp.body);
                          final msg = body['error']?['message'] ?? body['detail'] ?? 'Ошибка';
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg.toString()), backgroundColor: AppColors.danger));
                        }
                      }
                    } catch (e) {
                      setSheetState(() => saving = false);
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: AppColors.danger));
                    }
                  },
                  child: Text(saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'),
                ),
              ),
            ]),
          ]),
        ),
      ),
    );
  }

  Future<void> _deleteBuilding(Map<String, dynamic> building, int occupancy) async {
    if (occupancy > 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Нельзя удалить корпус с проживающими'),
        backgroundColor: AppColors.danger,
      ));
      return;
    }
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: const Text('Удалить корпус?', style: TextStyle(fontSize: 16)),
        content: Text('Корпус "${building['name']}" будет удалён. Это действие нельзя отменить.',
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Отмена')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Удалить'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      final resp = await Api.delete('/buildings/${building['id']}/');
      if (mounted) {
        if (resp.statusCode == 204 || resp.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Корпус удалён'), backgroundColor: AppColors.success));
          _load();
        } else {
          final body = jsonDecode(resp.body);
          final msg = body['error']?['message'] ?? body['detail'] ?? 'Ошибка удаления';
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg.toString()), backgroundColor: AppColors.danger));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: AppColors.danger));
    }
  }
}
