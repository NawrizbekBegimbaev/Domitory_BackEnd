import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../../core/widgets.dart';

class CreateContractScreen extends StatefulWidget {
  final Map<String, dynamic>? preselectedResident;
  final Map<String, dynamic>? preselectedRoom;
  const CreateContractScreen({super.key, this.preselectedResident, this.preselectedRoom});

  @override
  State<CreateContractScreen> createState() => _CreateContractScreenState();
}

class _CreateContractScreenState extends State<CreateContractScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;
  int _step = 1; // 1 = contract, 2 = room assignment

  // Step 1
  Map<String, dynamic>? _resident;
  List<dynamic> _searchResults = [];
  final _searchCtrl = TextEditingController();
  bool _searching = false;

  List<dynamic> _buildings = [];
  String? _selectedBuildingId;
  String _contractNumber = '';
  DateTime _startDate = DateTime.now();
  DateTime? _endDate;
  int _durationMonths = 0;

  // Step 2
  String? _createdContractId;
  List<dynamic> _floors = [];
  List<dynamic> _rooms = [];
  String? _selectedFloorId;
  String? _selectedRoomId;

  @override
  void initState() {
    super.initState();
    _resident = widget.preselectedResident;
    _contractNumber = _generateContractNumber();
    _loadBuildings();

    // If room is preselected, set building
    if (widget.preselectedRoom != null) {
      final room = widget.preselectedRoom!;
      _selectedBuildingId = room['building']?.toString();
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  String _generateContractNumber() {
    final year = DateTime.now().year;
    final rand = (Random().nextInt(9000) + 1000).toString();
    return 'ДГ-$year-$rand';
  }

  Future<void> _loadBuildings() async {
    try {
      final resp = await Api.get('/buildings/', params: {'page_size': '100'});
      if (resp.statusCode == 200 && mounted) {
        setState(() => _buildings = jsonDecode(resp.body)['results'] ?? []);
      }
    } catch (_) {}
  }

  Future<void> _searchResidents(String query) async {
    if (query.length < 2) {
      setState(() => _searchResults = []);
      return;
    }
    setState(() => _searching = true);
    try {
      final resp = await Api.get('/residents/', params: {'search': query, 'page_size': '10'});
      if (resp.statusCode == 200 && mounted) {
        setState(() => _searchResults = jsonDecode(resp.body)['results'] ?? []);
      }
    } catch (_) {}
    if (mounted) setState(() => _searching = false);
  }

  void _selectResident(dynamic r) {
    setState(() {
      _resident = Map<String, dynamic>.from(r);
      _searchResults = [];
      _searchCtrl.clear();
    });
  }

  void _selectDuration(int months) {
    setState(() {
      _durationMonths = months;
      final d = DateTime(_startDate.year, _startDate.month + months, _startDate.day);
      _endDate = d;
    });
  }

  Future<void> _pickStartDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      locale: const Locale('ru'),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(colorScheme: const ColorScheme.dark(primary: AppColors.accent, surface: AppColors.card)),
        child: child!,
      ),
    );
    if (date != null && mounted) {
      setState(() {
        _startDate = date;
        if (_durationMonths > 0) _selectDuration(_durationMonths);
      });
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '';
    return '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year}';
  }

  String _isoDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  // Step 1 → Create contract
  Future<void> _createContract() async {
    if (_resident == null || _selectedBuildingId == null || _endDate == null || _durationMonths == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Заполните все поля'), backgroundColor: AppColors.danger),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final resp = await Api.post('/contracts/', body: {
        'resident': _resident!['id'],
        'building': _selectedBuildingId,
        'contract_number': _contractNumber,
        'start_date': _isoDate(_startDate),
        'end_date': _isoDate(_endDate!),
      });

      if (resp.statusCode == 201 || resp.statusCode == 200) {
        final contract = jsonDecode(resp.body);
        _createdContractId = contract['id'].toString();

        // Always go to step 2 for room selection
        await _loadFloorsRooms();
        if (mounted) {
          // Pre-select room if coming from room detail
          if (widget.preselectedRoom != null) {
            _selectedRoomId = widget.preselectedRoom!['id'].toString();
          }
          setState(() => _step = 2);
        }
      } else {
        final errorBody = jsonDecode(resp.body);
        String errorMsg = '';
        if (errorBody is Map) {
          errorBody.forEach((key, value) {
            if (value is List) errorMsg += '${value.join(', ')}\n';
            else errorMsg += '$value\n';
          });
        }
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(errorMsg.trim().isNotEmpty ? errorMsg.trim() : 'Ошибка создания'), backgroundColor: AppColors.danger),
          );
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e'), backgroundColor: AppColors.danger));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _loadFloorsRooms() async {
    if (_selectedBuildingId == null) return;
    try {
      final results = await Future.wait([
        Api.get('/floors/', params: {'building': _selectedBuildingId!, 'page_size': '100'}),
        Api.get('/rooms/available/', params: {'building': _selectedBuildingId!, 'page_size': '200'}),
      ]);
      if (mounted) {
        if (results[0].statusCode == 200) _floors = jsonDecode(results[0].body)['results'] ?? [];
        if (results[1].statusCode == 200) {
          final body = jsonDecode(results[1].body);
          _rooms = body is List ? body : (body['results'] ?? []);
        }
      }
    } catch (_) {}
  }

  Future<void> _assignRoomDirect(String roomId) async {
    try {
      final resp = await Api.post('/assignments/', body: {
        'contract': _createdContractId,
        'resident': _resident!['id'],
        'room': roomId,
        'start_date': _isoDate(_startDate),
      });
      if (mounted) {
        if (resp.statusCode == 201 || resp.statusCode == 200) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Договор создан и комната назначена'), backgroundColor: AppColors.success),
          );
          Navigator.pop(context, true);
        } else {
          final body = jsonDecode(resp.body);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Договор создан, но ошибка назначения: ${body.toString()}'), backgroundColor: AppColors.warning),
          );
          Navigator.pop(context, true);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Договор создан, ошибка назначения: $e'), backgroundColor: AppColors.warning),
        );
        Navigator.pop(context, true);
      }
    }
  }

  // Step 2 → Assign room
  Future<void> _assignRoom() async {
    if (_selectedRoomId == null) return;
    setState(() => _saving = true);
    await _assignRoomDirect(_selectedRoomId!);
    if (mounted) setState(() => _saving = false);
  }

  void _skipRoom() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Договор создан'), backgroundColor: AppColors.success),
    );
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('DORMITORY'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
      ),
      body: Form(
        key: _formKey,
        child: ListView(padding: const EdgeInsets.all(16), children: [
          const Text('Новый договор', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),

          // Stepper
          Row(children: [
            _stepIndicator(1, 'Договор'),
            Expanded(child: Container(height: 1, color: AppColors.border, margin: const EdgeInsets.symmetric(horizontal: 8))),
            _stepIndicator(2, 'Комната'),
          ]),
          const SizedBox(height: 20),

          if (_step == 1) _buildStep1(),
          if (_step == 2) _buildStep2(),
        ]),
      ),
    );
  }

  Widget _stepIndicator(int step, String label) {
    final active = _step == step;
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: 28, height: 28,
        decoration: BoxDecoration(shape: BoxShape.circle, color: active ? AppColors.accent : AppColors.card, border: Border.all(color: active ? AppColors.accent : AppColors.border)),
        alignment: Alignment.center,
        child: Text('$step', style: TextStyle(color: active ? Colors.white : AppColors.textMuted, fontWeight: FontWeight.bold, fontSize: 12)),
      ),
      const SizedBox(width: 6),
      Text(label, style: TextStyle(color: active ? AppColors.accent : AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
    ]);
  }

  Widget _buildStep1() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Resident
      _sectionTitle('Жилец'),
      const SizedBox(height: 10),
      if (_resident != null)
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.accent.withAlpha(60))),
          child: Row(children: [
            ResidentAvatar(photoUrl: _resident!['photo']?.toString(), name: _resident!['full_name'] ?? '?', radius: 18),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(_resident!['full_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              Text('ID: ${_resident!['university_id'] ?? '-'}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            ])),
            if (widget.preselectedResident == null)
              GestureDetector(onTap: () => setState(() => _resident = null), child: const Icon(Icons.close, color: AppColors.textMuted, size: 18)),
            if (widget.preselectedResident != null)
              const Icon(Icons.check_circle, color: AppColors.success, size: 20),
          ]),
        )
      else ...[
        TextField(
          controller: _searchCtrl,
          onChanged: _searchResidents,
          decoration: const InputDecoration(hintText: 'Поиск по имени или ID...', prefixIcon: Icon(Icons.search, color: AppColors.textMuted, size: 20)),
        ),
        if (_searching) const Padding(padding: EdgeInsets.all(8), child: Center(child: CircularProgressIndicator(color: AppColors.accent, strokeWidth: 2))),
        if (_searchResults.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(top: 4),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
            child: Column(children: _searchResults.map((r) => InkWell(
              onTap: () => _selectResident(r),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                child: Row(children: [
                  ResidentAvatar(photoUrl: r['photo']?.toString(), name: r['full_name'] ?? '?', radius: 14),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(r['full_name'] ?? '', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                    Text('#${r['university_id'] ?? ''}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                  ])),
                ]),
              ),
            )).toList()),
          ),
      ],
      const SizedBox(height: 20),

      // Building
      _sectionTitle('Корпус'),
      const SizedBox(height: 10),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
        child: DropdownButtonFormField<String>(
          value: _selectedBuildingId,
          decoration: const InputDecoration(labelText: 'Выберите корпус', border: InputBorder.none, enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, contentPadding: EdgeInsets.zero),
          dropdownColor: AppColors.card,
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
          icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.textMuted, size: 20),
          items: _buildings.map<DropdownMenuItem<String>>((b) => DropdownMenuItem(value: b['id'].toString(), child: Text(b['name'] ?? 'Корпус'))).toList(),
          onChanged: (v) => setState(() => _selectedBuildingId = v),
        ),
      ),
      const SizedBox(height: 20),

      // Contract number
      _sectionTitle('Номер договора'),
      const SizedBox(height: 10),
      TextFormField(
        initialValue: _contractNumber,
        enabled: false,
        style: const TextStyle(color: AppColors.accent, fontSize: 14, fontWeight: FontWeight.w600),
        decoration: const InputDecoration(filled: true, fillColor: AppColors.card),
      ),
      const SizedBox(height: 20),

      // Duration — month buttons
      _sectionTitle('Срок (месяцев)'),
      const SizedBox(height: 10),
      Wrap(spacing: 8, runSpacing: 8, children: List.generate(12, (i) {
        final m = i + 1;
        final selected = _durationMonths == m;
        return GestureDetector(
          onTap: () => _selectDuration(m),
          child: Container(
            width: 48, height: 42,
            decoration: BoxDecoration(
              color: selected ? AppColors.accent : AppColors.card,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: selected ? AppColors.accent : AppColors.border),
            ),
            alignment: Alignment.center,
            child: Text('$m', style: TextStyle(color: selected ? Colors.white : AppColors.textSecondary, fontWeight: FontWeight.w600, fontSize: 15)),
          ),
        );
      })),
      if (_durationMonths > 0 && _endDate != null) ...[
        const SizedBox(height: 8),
        Text('${_formatDate(_startDate)} → ${_formatDate(_endDate)}', style: const TextStyle(color: AppColors.accent, fontSize: 12, fontWeight: FontWeight.w500)),
      ],
      const SizedBox(height: 10),

      // Start date
      GestureDetector(
        onTap: _pickStartDate,
        child: AbsorbPointer(child: TextFormField(
          controller: TextEditingController(text: _formatDate(_startDate)),
          decoration: InputDecoration(labelText: 'Дата начала', suffixIcon: const Icon(Icons.calendar_today, color: AppColors.textMuted, size: 18)),
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
        )),
      ),
      const SizedBox(height: 24),

      // Next button
      SizedBox(
        width: double.infinity, height: 50,
        child: ElevatedButton(
          onPressed: _saving || _resident == null || _selectedBuildingId == null || _durationMonths == 0 ? null : _createContract,
          child: _saving
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Row(mainAxisAlignment: MainAxisAlignment.center, children: const [
                  Text('Далее', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                  SizedBox(width: 8),
                  Icon(Icons.arrow_forward, size: 18),
                ]),
        ),
      ),
      const SizedBox(height: 20),
    ]);
  }

  Widget _buildStep2() {
    final filteredRooms = _selectedFloorId != null
        ? _rooms.where((r) => (r['floor'] ?? '').toString() == _selectedFloorId).toList()
        : _rooms;

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _sectionTitle('Выберите комнату'),
      const SizedBox(height: 10),

      // Floor filter
      if (_floors.isNotEmpty) ...[
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
          child: DropdownButtonFormField<String>(
            value: _selectedFloorId,
            decoration: const InputDecoration(labelText: 'Этаж', border: InputBorder.none, enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, contentPadding: EdgeInsets.zero),
            dropdownColor: AppColors.card,
            style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.textMuted, size: 20),
            items: [
              const DropdownMenuItem(value: null, child: Text('Все этажи')),
              ..._floors.map<DropdownMenuItem<String>>((f) => DropdownMenuItem(value: f['id'].toString(), child: Text('${f['number']} этаж'))),
            ],
            onChanged: (v) => setState(() { _selectedFloorId = v; _selectedRoomId = null; }),
          ),
        ),
        const SizedBox(height: 12),
      ],

      // Room list
      if (filteredRooms.isEmpty)
        const Padding(padding: EdgeInsets.all(20), child: Center(child: Text('Нет свободных комнат', style: TextStyle(color: AppColors.textMuted))))
      else
        ...filteredRooms.map((room) {
          final roomId = room['id'].toString();
          final isSelected = _selectedRoomId == roomId;
          final occupancy = room['current_occupancy'] ?? 0;
          final capacity = room['capacity'] ?? 0;
          return GestureDetector(
            onTap: () => setState(() => _selectedRoomId = roomId),
            child: Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.accent.withAlpha(15) : AppColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: isSelected ? AppColors.accent : AppColors.border),
              ),
              child: Row(children: [
                Icon(Icons.meeting_room_outlined, color: isSelected ? AppColors.accent : AppColors.textMuted, size: 18),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Комната ${room['room_number'] ?? ''}', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: isSelected ? AppColors.accent : AppColors.textPrimary)),
                  Text('$occupancy/$capacity мест · ${room['monthly_price'] ?? '-'} UZS/мес', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                ])),
                if (isSelected) const Icon(Icons.check_circle, color: AppColors.accent, size: 20),
              ]),
            ),
          );
        }),
      const SizedBox(height: 16),

      // Buttons
      Row(children: [
        Expanded(child: OutlinedButton(
          onPressed: _skipRoom,
          style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.border), padding: const EdgeInsets.symmetric(vertical: 14)),
          child: const Text('Пропустить', style: TextStyle(color: AppColors.textMuted)),
        )),
        const SizedBox(width: 12),
        Expanded(child: ElevatedButton(
          onPressed: _saving || _selectedRoomId == null ? null : _assignRoom,
          style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
          child: _saving
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Назначить', style: TextStyle(fontWeight: FontWeight.w700)),
        )),
      ]),
      const SizedBox(height: 20),
    ]);
  }

  Widget _sectionTitle(String title) {
    return Row(children: [
      Container(width: 3, height: 16, decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(2))),
      const SizedBox(width: 8),
      Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
    ]);
  }
}
