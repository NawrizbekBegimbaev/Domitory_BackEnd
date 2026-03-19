import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';

class RoomsScreen extends StatefulWidget {
  const RoomsScreen({super.key});

  @override
  State<RoomsScreen> createState() => _RoomsScreenState();
}

class _RoomsScreenState extends State<RoomsScreen> {
  List<dynamic> _buildings = [];
  List<dynamic> _floors = [];
  List<dynamic> _rooms = [];
  String? _selectedBuildingId;
  bool _loading = true;
  bool _gridView = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadBuildings();
  }

  Future<void> _loadBuildings() async {
    setState(() { _loading = true; _error = null; });
    try {
      final resp = await Api.get('/buildings/', params: {'page_size': '100'});
      if (resp.statusCode == 200 && mounted) {
        _buildings = jsonDecode(resp.body)['results'] ?? [];
        if (_buildings.isNotEmpty && _selectedBuildingId == null) {
          _selectedBuildingId = _buildings.first['id'].toString();
        }
        if (_selectedBuildingId != null) {
          await _loadRooms();
          return;
        }
      } else {
        _error = 'Ошибка загрузки корпусов';
      }
    } catch (e) {
      _error = 'Ошибка сети: $e';
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _loadRooms() async {
    if (_selectedBuildingId == null) return;
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        Api.get('/floors/', params: {'building': _selectedBuildingId!, 'page_size': '100'}),
        Api.get('/rooms/', params: {'building': _selectedBuildingId!, 'page_size': '200'}),
      ]);
      if (mounted) {
        if (results[0].statusCode == 200) _floors = jsonDecode(results[0].body)['results'] ?? [];
        if (results[1].statusCode == 200) _rooms = jsonDecode(results[1].body)['results'] ?? [];
      }
    } catch (e) {
      _error = 'Ошибка загрузки: $e';
    }
    if (mounted) setState(() => _loading = false);
  }

  int get _totalRooms => _rooms.length;
  int get _occupiedRooms => _rooms.where((r) => r['status'] == 'full').length;
  int get _availableRooms => _rooms.where((r) => r['status'] == 'available').length;
  int get _loadPercent => _totalRooms > 0 ? ((_rooms.fold<int>(0, (s, r) => s + ((r['current_occupancy'] ?? 0) as int)) / _rooms.fold<int>(0, (s, r) => s + ((r['capacity'] ?? 1) as int))) * 100).round() : 0;

  Color _roomColor(String status) {
    switch (status) {
      case 'available': return AppColors.success;
      case 'full': return AppColors.textMuted;
      case 'maintenance': return AppColors.warning;
      default: return AppColors.border;
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
            const Text('Комнаты', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const Spacer(),
            GestureDetector(
              onTap: () => setState(() => _gridView = !_gridView),
              child: Icon(_gridView ? Icons.grid_view : Icons.list, color: AppColors.textMuted, size: 22),
            ),
          ]),
        ),
        const SizedBox(height: 12),

        // Stats row
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(children: [
            _statCard('Всего', '$_totalRooms', AppColors.textPrimary),
            const SizedBox(width: 8),
            _statCard('Занято', '$_occupiedRooms', AppColors.danger),
            const SizedBox(width: 8),
            _statCard('Свободно', '$_availableRooms', AppColors.success),
            const SizedBox(width: 8),
            _statCard('Загрузка', '$_loadPercent%', AppColors.accent),
          ]),
        ),
        const SizedBox(height: 12),

        // Building selector
        if (_buildings.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
              child: DropdownButtonHideUnderline(child: DropdownButton<String>(
                value: _selectedBuildingId,
                isExpanded: true,
                dropdownColor: AppColors.card,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                icon: const Icon(Icons.expand_more, color: AppColors.textMuted),
                items: _buildings.map<DropdownMenuItem<String>>((b) => DropdownMenuItem(
                  value: b['id'].toString(),
                  child: Text(b['name'] ?? 'Корпус', overflow: TextOverflow.ellipsis),
                )).toList(),
                onChanged: (v) {
                  _selectedBuildingId = v;
                  _loadRooms();
                },
              )),
            ),
          ),
        const SizedBox(height: 12),

        // Rooms
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
              : _error != null
                  ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                      const SizedBox(height: 8),
                      TextButton(onPressed: _loadRooms, child: const Text('Повторить')),
                    ]))
                  : RefreshIndicator(color: AppColors.accent, onRefresh: _loadRooms, child: _buildRoomsList()),
        ),
      ]),
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

  Widget _buildRoomsList() {
    if (_floors.isEmpty) return const Center(child: Text('Нет этажей', style: TextStyle(color: AppColors.textMuted)));

    // Sort floors by number
    final sortedFloors = List<dynamic>.from(_floors)..sort((a, b) => (a['number'] ?? 0).compareTo(b['number'] ?? 0));

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: sortedFloors.length,
      itemBuilder: (context, i) {
        final floor = sortedFloors[i];
        final floorId = floor['id'].toString();
        final floorRooms = _rooms.where((r) => (r['floor'] ?? r['floor_id'] ?? '').toString() == floorId).toList()
          ..sort((a, b) => (a['room_number'] ?? '').toString().compareTo((b['room_number'] ?? '').toString()));

        if (floorRooms.isEmpty) return const SizedBox.shrink();

        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text('${floor['number']} этаж', style: const TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w600, fontSize: 13)),
          ),
          _gridView
              ? Wrap(spacing: 8, runSpacing: 8, children: floorRooms.map((r) => _roomCard(r)).toList())
              : Column(children: floorRooms.map((r) => Padding(padding: const EdgeInsets.only(bottom: 8), child: _roomListTile(r))).toList()),
          const SizedBox(height: 8),
        ]);
      },
    );
  }

  Widget _roomCard(dynamic room) {
    final status = room['status'] ?? 'available';
    final color = _roomColor(status);
    final occupancy = room['current_occupancy'] ?? 0;
    final capacity = room['capacity'] ?? 0;

    return GestureDetector(
      onTap: () => _showRoomSheet(room),
      child: Container(
        width: 72,
        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(6, 8, 6, 4),
            child: Text('${room['room_number'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14), textAlign: TextAlign.center),
          ),
          Text('$occupancy/$capacity', style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          Container(height: 3, decoration: BoxDecoration(color: color, borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(10), bottomRight: Radius.circular(10)))),
        ]),
      ),
    );
  }

  Widget _roomListTile(dynamic room) {
    final status = room['status'] ?? 'available';
    final color = _roomColor(status);
    final occupancy = room['current_occupancy'] ?? 0;
    final capacity = room['capacity'] ?? 0;

    return GestureDetector(
      onTap: () => _showRoomSheet(room),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
        child: Row(children: [
          Container(width: 4, height: 36, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
          const SizedBox(width: 12),
          Text('${room['room_number'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const Spacer(),
          Text('$occupancy / $capacity', style: TextStyle(color: color, fontWeight: FontWeight.w600)),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(8)),
            child: Text(_statusLabel(status), style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right, color: AppColors.textMuted, size: 20),
        ]),
      ),
    );
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'available': return 'Свободна';
      case 'full': return 'Занята';
      case 'maintenance': return 'Ремонт';
      default: return status;
    }
  }

  void _showRoomSheet(dynamic room) {
    final roomId = room['id'].toString();
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.bg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      isScrollControlled: true,
      builder: (ctx) => _RoomDetailSheet(room: room, roomId: roomId),
    );
  }
}

class _RoomDetailSheet extends StatefulWidget {
  final dynamic room;
  final String roomId;
  const _RoomDetailSheet({required this.room, required this.roomId});

  @override
  State<_RoomDetailSheet> createState() => _RoomDetailSheetState();
}

class _RoomDetailSheetState extends State<_RoomDetailSheet> {
  List<dynamic> _residents = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadResidents();
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

  @override
  Widget build(BuildContext context) {
    final r = widget.room;
    final status = r['status'] ?? 'available';
    final occupancy = r['current_occupancy'] ?? 0;
    final capacity = r['capacity'] ?? 0;
    final emptySlots = (capacity - occupancy).clamp(0, capacity);
    final color = status == 'available' ? AppColors.success : status == 'full' ? AppColors.textMuted : AppColors.warning;

    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      minChildSize: 0.3,
      maxChildSize: 0.85,
      expand: false,
      builder: (_, controller) => ListView(controller: controller, padding: const EdgeInsets.all(20), children: [
        Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)))),
        const SizedBox(height: 16),
        Row(children: [
          Text('Комната ${r['room_number'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(10)),
            child: Text(status == 'available' ? 'Свободна' : status == 'full' ? 'Занята' : 'Ремонт', style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
          ),
        ]),
        const SizedBox(height: 12),
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
          _detail('Гендер', r['gender_policy'] == 'male' ? 'Мужской' : r['gender_policy'] == 'female' ? 'Женский' : 'Смешанный'),
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
              CircleAvatar(radius: 16, backgroundColor: AppColors.accent.withAlpha(20), child: Text(((a['resident_detail']?['full_name'] ?? a['resident']?.toString() ?? '?')[0]), style: const TextStyle(color: AppColors.accent, fontSize: 12, fontWeight: FontWeight.bold))),
              const SizedBox(width: 10),
              Expanded(child: Text(a['resident_detail']?['full_name'] ?? 'Жилец #${a['resident']}', style: const TextStyle(fontSize: 13))),
            ]),
          )),
        // Empty slots
        ...List.generate(emptySlots, (_) => Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border, style: BorderStyle.solid)),
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
      Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
      Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
    ]);
  }
}
