import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../core/widgets.dart';

class FloorsScreen extends StatefulWidget {
  final String buildingId;
  final String buildingName;
  final String buildingGenderPolicy;

  const FloorsScreen({
    super.key,
    required this.buildingId,
    required this.buildingName,
    required this.buildingGenderPolicy,
  });

  @override
  State<FloorsScreen> createState() => _FloorsScreenState();
}

class _FloorsScreenState extends State<FloorsScreen> {
  List<dynamic> _floors = [];
  List<dynamic> _rooms = [];
  Set<String> _expanded = {};
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
      final results = await Future.wait([
        Api.get('/floors/', params: {'building': widget.buildingId, 'page_size': '100'}),
        Api.get('/rooms/', params: {'building': widget.buildingId, 'page_size': '500'}),
      ]);
      if (mounted) {
        if (results[0].statusCode == 200) {
          _floors = (jsonDecode(results[0].body)['results'] ?? []) as List;
          _floors.sort((a, b) => (a['number'] ?? 0).compareTo(b['number'] ?? 0));
          // Auto-expand first floor
          if (_expanded.isEmpty && _floors.isNotEmpty) {
            _expanded.add(_floors.first['id'].toString());
          }
        }
        if (results[1].statusCode == 200) {
          _rooms = (jsonDecode(results[1].body)['results'] ?? []) as List;
        }
      }
    } catch (e) {
      _error = 'Ошибка загрузки: $e';
    }
    if (mounted) setState(() => _loading = false);
  }

  List<dynamic> _roomsForFloor(String floorId) {
    return _rooms.where((r) => (r['floor'] ?? r['floor_id'] ?? '').toString() == floorId).toList()
      ..sort((a, b) => (a['room_number'] ?? '').toString().compareTo((b['room_number'] ?? '').toString()));
  }

  Color _roomColor(String status) {
    switch (status) {
      case 'available': return AppColors.success;
      case 'full': return AppColors.textMuted;
      case 'maintenance': return AppColors.warning;
      case 'closed': return const Color(0xFF4B5563);
      default: return AppColors.border;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'available': return 'Свободна';
      case 'full': return 'Занята';
      case 'maintenance': return 'Ремонт';
      case 'closed': return 'Закрыта';
      default: return status;
    }
  }

  String _genderLabel(String? policy) {
    switch (policy) {
      case 'male_only': return 'Мужской';
      case 'female_only': return 'Женский';
      case 'mixed': return 'Смешанный';
      default: return policy ?? '-';
    }
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
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.buildingName, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text('${_floors.length} этажей  ·  ${_rooms.length} комнат', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
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
                  : _floors.isEmpty
                      ? const Center(child: Text('Нет этажей', style: TextStyle(color: AppColors.textMuted)))
                      : RefreshIndicator(
                          color: AppColors.accent,
                          onRefresh: _load,
                          child: ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            itemCount: _floors.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 10),
                            itemBuilder: (_, i) => _floorCard(_floors[i]),
                          ),
                        ),
        ),
      ]),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.accent,
        onPressed: () => _showFloorForm(null),
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _floorCard(dynamic floor) {
    final floorId = floor['id'].toString();
    final isOpen = _expanded.contains(floorId);
    final floorRooms = _roomsForFloor(floorId);
    final fCap = floorRooms.fold<int>(0, (s, r) => s + ((r['capacity'] ?? 0) as int));
    final fOcc = floorRooms.fold<int>(0, (s, r) => s + ((r['current_occupancy'] ?? 0) as int));
    final fFree = fCap - fOcc;
    final fPct = fCap > 0 ? ((fOcc / fCap) * 100).round() : 0;
    final pctColor = fPct >= 90 ? AppColors.danger : fPct >= 50 ? AppColors.accent : AppColors.success;

    return Container(
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Column(children: [
        // Floor header
        GestureDetector(
          onTap: () => setState(() {
            if (isOpen) { _expanded.remove(floorId); } else { _expanded.add(floorId); }
          }),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(children: [
              Icon(isOpen ? Icons.expand_more : Icons.chevron_right, color: AppColors.textSecondary, size: 20),
              const SizedBox(width: 8),
              Text('${floor['number']} этаж', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(width: 8),
              Text('${floorRooms.length} комн. · $fOcc зан. · $fFree своб.', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              const Spacer(),
              SizedBox(
                width: 40,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    value: fCap > 0 ? fOcc / fCap : 0,
                    backgroundColor: AppColors.border,
                    valueColor: AlwaysStoppedAnimation<Color>(pctColor),
                    minHeight: 4,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Text('$fPct%', style: TextStyle(color: pctColor, fontSize: 12, fontWeight: FontWeight.w700)),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => _showFloorForm(floor),
                child: const Icon(Icons.edit_outlined, color: AppColors.textMuted, size: 16),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => _deleteFloor(floor, floorRooms),
                child: const Icon(Icons.delete_outline, color: AppColors.textMuted, size: 16),
              ),
            ]),
          ),
        ),

        // Expanded rooms
        if (isOpen) ...[
          Container(height: 1, color: AppColors.border),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (floorRooms.isEmpty)
                const Text('Нет комнат на этаже', style: TextStyle(color: AppColors.textMuted, fontSize: 12))
              else
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: floorRooms.map<Widget>((room) => _roomChip(room)).toList(),
                ),
              const SizedBox(height: 10),
              GestureDetector(
                onTap: () => _showRoomForm(floorId),
                child: Row(mainAxisSize: MainAxisSize.min, children: const [
                  Icon(Icons.add, color: AppColors.accent, size: 16),
                  SizedBox(width: 4),
                  Text('Добавить комнату', style: TextStyle(color: AppColors.accent, fontSize: 12)),
                ]),
              ),
            ]),
          ),
        ],
      ]),
    );
  }

  Widget _roomChip(dynamic room) {
    final status = room['status'] ?? 'available';
    final color = _roomColor(status);
    final occupancy = room['current_occupancy'] ?? 0;
    final capacity = room['capacity'] ?? 0;

    return GestureDetector(
      onTap: () => _showRoomDetailSheet(room),
      child: Container(
        width: 72,
        decoration: BoxDecoration(color: AppColors.card2, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(6, 8, 6, 4),
            child: Text('${room['room_number'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14), textAlign: TextAlign.center),
          ),
          Text('$occupancy/$capacity', style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Container(height: 3, decoration: BoxDecoration(color: color, borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(10), bottomRight: Radius.circular(10)))),
        ]),
      ),
    );
  }

  // --- Room detail bottom sheet ---
  void _showRoomDetailSheet(dynamic room) {
    final roomId = room['id'].toString();
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      isScrollControlled: true,
      builder: (ctx) => _RoomDetailSheet(
        room: room,
        roomId: roomId,
        buildingGenderPolicy: widget.buildingGenderPolicy,
        onUpdated: () { Navigator.pop(ctx); _load(); },
      ),
    );
  }

  // --- Floor form ---
  void _showFloorForm(dynamic floor) {
    final isEdit = floor != null;
    final numberCtrl = TextEditingController(text: isEdit ? (floor['number'] ?? '').toString() : '');
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
            Text(isEdit ? 'Редактировать этаж' : 'Новый этаж', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 20),
            const Text('НОМЕР ЭТАЖА *', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
            const SizedBox(height: 6),
            TextField(
              controller: numberCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(hintText: '1'),
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
                    final num = int.tryParse(numberCtrl.text.trim());
                    if (num == null || num < 1) return;
                    setSheetState(() => saving = true);
                    try {
                      final body = <String, dynamic>{'number': num};
                      if (!isEdit) body['building'] = widget.buildingId;
                      final resp = isEdit
                          ? await Api.patch('/floors/${floor['id']}/', body: body)
                          : await Api.post('/floors/', body: body);
                      if (mounted) {
                        Navigator.pop(ctx);
                        if (resp.statusCode == 200 || resp.statusCode == 201) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                            content: Text(isEdit ? 'Этаж обновлён' : 'Этаж создан'),
                            backgroundColor: AppColors.success,
                          ));
                          _load();
                        } else {
                          final b = jsonDecode(resp.body);
                          final msg = b['error']?['message'] ?? b['detail'] ?? 'Ошибка';
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

  // --- Room form ---
  void _showRoomForm(String floorId) {
    final roomNumberCtrl = TextEditingController();
    final capacityCtrl = TextEditingController(text: '4');
    final priceCtrl = TextEditingController();
    final isMixed = widget.buildingGenderPolicy == 'mixed';
    String genderPolicy = isMixed ? 'mixed' : widget.buildingGenderPolicy;
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
            const Text('Новая комната', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 20),
            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('НОМЕР КОМНАТЫ *', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
                const SizedBox(height: 6),
                TextField(controller: roomNumberCtrl, decoration: const InputDecoration(hintText: '101')),
              ])),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('ВМЕСТИМОСТЬ *', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
                const SizedBox(height: 6),
                TextField(controller: capacityCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(hintText: '4')),
              ])),
            ]),
            const SizedBox(height: 16),
            const Text('ГЕНДЕРНАЯ ПОЛИТИКА', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
            const SizedBox(height: 6),
            if (isMixed)
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
              )
            else
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
                child: Text(
                  _genderLabel(widget.buildingGenderPolicy),
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
                ),
              ),
            const SizedBox(height: 16),
            const Text('ЦЕНА В МЕСЯЦ', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
            const SizedBox(height: 6),
            TextField(
              controller: priceCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(hintText: '500000'),
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
                    if (roomNumberCtrl.text.trim().isEmpty) return;
                    final cap = int.tryParse(capacityCtrl.text.trim());
                    if (cap == null || cap < 1) return;
                    setSheetState(() => saving = true);
                    try {
                      final body = {
                        'floor': floorId,
                        'room_number': roomNumberCtrl.text.trim(),
                        'capacity': cap,
                        'gender_policy': genderPolicy,
                        'monthly_price': priceCtrl.text.trim().isEmpty ? '0' : priceCtrl.text.trim(),
                      };
                      final resp = await Api.post('/rooms/', body: body);
                      if (mounted) {
                        Navigator.pop(ctx);
                        if (resp.statusCode == 201 || resp.statusCode == 200) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Комната создана'), backgroundColor: AppColors.success));
                          _load();
                        } else {
                          final b = jsonDecode(resp.body);
                          final msg = b['error']?['message'] ?? b['detail'] ?? 'Ошибка';
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg.toString()), backgroundColor: AppColors.danger));
                        }
                      }
                    } catch (e) {
                      setSheetState(() => saving = false);
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: AppColors.danger));
                    }
                  },
                  child: Text(saving ? 'Сохранение...' : 'Создать'),
                ),
              ),
            ]),
          ]),
        ),
      ),
    );
  }

  // --- Delete floor ---
  Future<void> _deleteFloor(dynamic floor, List<dynamic> floorRooms) async {
    final hasOccupied = floorRooms.any((r) => (r['current_occupancy'] ?? 0) > 0);
    if (hasOccupied) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Нельзя удалить этаж с проживающими'),
        backgroundColor: AppColors.danger,
      ));
      return;
    }
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: const Text('Удалить этаж?', style: TextStyle(fontSize: 16)),
        content: Text('Этаж ${floor['number']} и все его комнаты будут удалены.',
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
      // Delete rooms first, then floor
      for (final r in floorRooms) {
        await Api.delete('/rooms/${r['id']}/');
      }
      final resp = await Api.delete('/floors/${floor['id']}/');
      if (mounted) {
        if (resp.statusCode == 204 || resp.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Этаж удалён'), backgroundColor: AppColors.success));
          _expanded.remove(floor['id'].toString());
          _load();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ошибка удаления'), backgroundColor: AppColors.danger));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: AppColors.danger));
    }
  }
}

// --- Room detail sheet with residents, edit, status change ---
class _RoomDetailSheet extends StatefulWidget {
  final dynamic room;
  final String roomId;
  final String buildingGenderPolicy;
  final VoidCallback onUpdated;

  const _RoomDetailSheet({
    required this.room,
    required this.roomId,
    required this.buildingGenderPolicy,
    required this.onUpdated,
  });

  @override
  State<_RoomDetailSheet> createState() => _RoomDetailSheetState();
}

class _RoomDetailSheetState extends State<_RoomDetailSheet> {
  List<dynamic> _residents = [];
  bool _loading = true;
  bool _editing = false;
  late TextEditingController _capacityCtrl;
  late TextEditingController _priceCtrl;
  late String _genderPolicy;
  late String _status;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _capacityCtrl = TextEditingController(text: (widget.room['capacity'] ?? 0).toString());
    _priceCtrl = TextEditingController(text: (widget.room['monthly_price'] ?? '0').toString());
    _genderPolicy = widget.room['gender_policy'] ?? 'mixed';
    _status = widget.room['status'] ?? 'available';
    _loadResidents();
  }

  @override
  void dispose() {
    _capacityCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadResidents() async {
    try {
      final resp = await Api.get('/assignments/', params: {'room': widget.roomId, 'status': 'active'});
      if (resp.statusCode == 200 && mounted) {
        _residents = jsonDecode(resp.body)['results'] ?? [];
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'available': return 'Свободна';
      case 'full': return 'Занята';
      case 'maintenance': return 'Ремонт';
      case 'closed': return 'Закрыта';
      default: return status;
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'available': return AppColors.success;
      case 'full': return AppColors.textMuted;
      case 'maintenance': return AppColors.warning;
      default: return AppColors.border;
    }
  }

  String _genderLabel(String? policy) {
    switch (policy) {
      case 'male_only': return 'Мужской';
      case 'female_only': return 'Женский';
      case 'mixed': return 'Смешанный';
      default: return policy ?? '-';
    }
  }

  Future<void> _saveRoom() async {
    setState(() => _saving = true);
    try {
      final cap = int.tryParse(_capacityCtrl.text.trim());
      final body = <String, dynamic>{
        'gender_policy': _genderPolicy,
        'status': _status,
        'monthly_price': _priceCtrl.text.trim().isEmpty ? '0' : _priceCtrl.text.trim(),
      };
      if (cap != null && cap >= 1) body['capacity'] = cap;
      final resp = await Api.patch('/rooms/${widget.roomId}/', body: body);
      if (mounted) {
        if (resp.statusCode == 200) {
          widget.onUpdated();
        } else {
          final b = jsonDecode(resp.body);
          final msg = b['error']?['message'] ?? b['detail'] ?? 'Ошибка';
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg.toString()), backgroundColor: AppColors.danger));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: AppColors.danger));
    }
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.room;
    final status = r['status'] ?? 'available';
    final occupancy = r['current_occupancy'] ?? 0;
    final capacity = r['capacity'] ?? 0;
    final emptySlots = (capacity - occupancy).clamp(0, capacity);
    final color = _statusColor(status);

    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.9,
      expand: false,
      builder: (_, controller) => ListView(controller: controller, padding: const EdgeInsets.all(20), children: [
        Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)))),
        const SizedBox(height: 16),

        // Header
        Row(children: [
          Text('Комната ${r['room_number'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(10)),
            child: Text(_statusLabel(status), style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
          ),
        ]),
        const SizedBox(height: 12),

        if (!_editing) ...[
          // Info display
          Row(children: [
            _detail('Вместимость', '$capacity'),
            const SizedBox(width: 16),
            _detail('Проживает', '$occupancy'),
            const SizedBox(width: 16),
            _detail('Свободных мест', '$emptySlots'),
          ]),
          if (r['monthly_price'] != null) ...[
            const SizedBox(height: 8),
            _detail('Цена/мес', '${r['monthly_price']} UZS'),
          ],
          if (r['gender_policy'] != null) ...[
            const SizedBox(height: 8),
            _detail('Гендер', _genderLabel(r['gender_policy'])),
          ],
          const SizedBox(height: 16),

          // Action buttons
          Row(children: [
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.accent,
                  side: const BorderSide(color: AppColors.accent),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.edit_outlined, size: 16),
                label: const Text('Изменить', style: TextStyle(fontSize: 12)),
                onPressed: () => setState(() => _editing = true),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: status == 'maintenance' ? AppColors.success : AppColors.warning,
                  side: BorderSide(color: status == 'maintenance' ? AppColors.success : AppColors.warning),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: Icon(status == 'maintenance' ? Icons.check_circle_outline : Icons.build_outlined, size: 16),
                label: Text(status == 'maintenance' ? 'Доступна' : 'Ремонт', style: const TextStyle(fontSize: 12)),
                onPressed: () async {
                  final newStatus = status == 'maintenance' ? 'available' : 'maintenance';
                  final resp = await Api.patch('/rooms/${widget.roomId}/', body: {'status': newStatus});
                  if (resp.statusCode == 200 && mounted) {
                    widget.onUpdated();
                  }
                },
              ),
            ),
          ]),
        ] else ...[
          // Edit mode
          const Text('ВМЕСТИМОСТЬ', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
          const SizedBox(height: 6),
          TextField(controller: _capacityCtrl, keyboardType: TextInputType.number),
          const SizedBox(height: 12),
          const Text('ЦЕНА В МЕСЯЦ', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
          const SizedBox(height: 6),
          TextField(controller: _priceCtrl, keyboardType: TextInputType.number),
          const SizedBox(height: 12),
          const Text('ГЕНДЕРНАЯ ПОЛИТИКА', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
          const SizedBox(height: 6),
          if (widget.buildingGenderPolicy == 'mixed')
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
              child: DropdownButtonHideUnderline(child: DropdownButton<String>(
                value: _genderPolicy,
                isExpanded: true,
                dropdownColor: AppColors.card,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                items: const [
                  DropdownMenuItem(value: 'mixed', child: Text('Смешанный')),
                  DropdownMenuItem(value: 'male_only', child: Text('Мужской')),
                  DropdownMenuItem(value: 'female_only', child: Text('Женский')),
                ],
                onChanged: (v) { if (v != null) setState(() => _genderPolicy = v); },
              )),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
              child: Text(_genderLabel(widget.buildingGenderPolicy), style: const TextStyle(color: AppColors.textSecondary, fontSize: 14)),
            ),
          const SizedBox(height: 12),
          const Text('СТАТУС', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
            child: DropdownButtonHideUnderline(child: DropdownButton<String>(
              value: _status,
              isExpanded: true,
              dropdownColor: AppColors.card,
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
              items: const [
                DropdownMenuItem(value: 'available', child: Text('Свободна')),
                DropdownMenuItem(value: 'maintenance', child: Text('Ремонт')),
              ],
              onChanged: (v) { if (v != null) setState(() => _status = v); },
            )),
          ),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.textSecondary,
                  side: const BorderSide(color: AppColors.border),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () => setState(() => _editing = false),
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
                onPressed: _saving ? null : _saveRoom,
                child: Text(_saving ? 'Сохранение...' : 'Сохранить'),
              ),
            ),
          ]),
        ],

        const SizedBox(height: 20),
        const Text('Проживающие', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: AppColors.accent)))
        else if (_residents.isEmpty)
          const Text('Никто не проживает', style: TextStyle(color: AppColors.textMuted, fontSize: 12))
        else
          ..._residents.map((a) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
            child: Row(children: [
              ResidentAvatar(photoUrl: (a['resident_detail']?['photo'] ?? a['resident_photo'])?.toString(), name: a['resident_detail']?['full_name'] ?? a['resident_name'] ?? '?', radius: 16),
              const SizedBox(width: 10),
              Expanded(child: Text(a['resident_detail']?['full_name'] ?? a['resident_name'] ?? 'Жилец', style: const TextStyle(fontSize: 13))),
            ]),
          )),
        // Empty slots
        if (!_editing)
          ...List.generate(emptySlots, (_) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
            child: Row(children: [
              CircleAvatar(radius: 16, backgroundColor: AppColors.border, child: const Icon(Icons.person_add_outlined, size: 14, color: AppColors.textMuted)),
              const SizedBox(width: 10),
              const Text('Свободное место', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
            ]),
          )),
      ]),
    );
  }

  Widget _detail(String label, String value) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
      Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
    ]);
  }
}
