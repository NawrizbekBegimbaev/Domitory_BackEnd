import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import '../finance/new_payment_screen.dart';
import 'edit_resident_screen.dart';
import '../contracts/create_contract_screen.dart';

class ResidentDetailScreen extends StatefulWidget {
  final String residentId;
  const ResidentDetailScreen({super.key, required this.residentId});

  @override
  State<ResidentDetailScreen> createState() => _ResidentDetailScreenState();
}

class _ResidentDetailScreenState extends State<ResidentDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Map<String, dynamic>? _resident;
  Map<String, dynamic>? _balance;
  List<dynamic> _charges = [];
  List<dynamic> _payments = [];
  List<dynamic> _assignments = [];
  List<dynamic> _contracts = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadAll();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() { _loading = true; _error = null; });
    try {
      final results = await Future.wait([
        Api.get('/residents/${widget.residentId}/'),
        Api.get('/residents/${widget.residentId}/balance/'),
        Api.get('/charges/', params: {'resident': widget.residentId, 'page_size': '100'}),
        Api.get('/payments/', params: {'resident': widget.residentId, 'page_size': '100'}),
        Api.get('/assignments/', params: {'resident': widget.residentId, 'page_size': '100'}),
        Api.get('/contracts/', params: {'resident': widget.residentId, 'page_size': '100'}),
      ]);
      if (!mounted) return;
      if (results[0].statusCode == 200) {
        _resident = jsonDecode(results[0].body);
      } else {
        _error = 'Не удалось загрузить данные жильца';
      }
      if (results[1].statusCode == 200) _balance = jsonDecode(results[1].body);
      if (results[2].statusCode == 200) _charges = jsonDecode(results[2].body)['results'] ?? [];
      if (results[3].statusCode == 200) _payments = jsonDecode(results[3].body)['results'] ?? [];
      if (results[4].statusCode == 200) _assignments = jsonDecode(results[4].body)['results'] ?? [];
      if (results[5].statusCode == 200) _contracts = jsonDecode(results[5].body)['results'] ?? [];
    } catch (e) {
      _error = 'Ошибка сети: $e';
    }
    if (mounted) setState(() => _loading = false);
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'active': return AppColors.success;
      case 'pending': return AppColors.warning;
      case 'evicted': return AppColors.danger;
      case 'graduated': return Colors.blue;
      default: return AppColors.textMuted;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'active': return 'Активный';
      case 'pending': return 'Ожидающий';
      case 'evicted': return 'Выселен';
      case 'graduated': return 'Выпустился';
      default: return status;
    }
  }

  // --- Active contract/assignment helpers ---
  Map<String, dynamic>? get _activeContract {
    try {
      return _contracts.firstWhere((c) => c['status'] == 'active');
    } catch (_) {
      return null;
    }
  }

  Map<String, dynamic>? get _activeAssignment {
    try {
      return _assignments.firstWhere((a) => a['status'] == 'active');
    } catch (_) {
      return null;
    }
  }

  bool get _hasActiveContract => _activeContract != null;
  bool get _hasActiveAssignment => _activeAssignment != null;

  // --- ACTIONS ---

  Future<void> _onEdit() async {
    if (_resident == null) return;
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => EditResidentScreen(resident: _resident!)),
    );
    if (result == true) _loadAll();
  }

  Future<void> _onTransfer() async {
    if (!_hasActiveAssignment) {
      _showSnack('Нет активного назначения для перевода', isError: true);
      return;
    }

    // Load available rooms
    final roomsResp = await Api.get('/rooms/available/', params: {'page_size': '200'});
    if (!mounted) return;
    List<dynamic> rooms = [];
    if (roomsResp.statusCode == 200) {
      final body = jsonDecode(roomsResp.body);
      rooms = body is List ? body : (body['results'] ?? []);
    }
    if (rooms.isEmpty) {
      _showSnack('Нет свободных комнат', isError: true);
      return;
    }

    String? selectedRoomId;
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: AppColors.bg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => DraggableScrollableSheet(
          initialChildSize: 0.6,
          minChildSize: 0.3,
          maxChildSize: 0.85,
          expand: false,
          builder: (_, controller) => ListView(controller: controller, padding: const EdgeInsets.all(20), children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            const Text('Перевод в другую комнату', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
            const SizedBox(height: 4),
            Text(
              'Текущая: ${_activeAssignment?['room_detail']?['room_number'] ?? _activeAssignment?['room'] ?? '-'}',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
            const SizedBox(height: 16),
            const Text('Выберите новую комнату', style: TextStyle(color: AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ...rooms.map((room) {
              final roomId = room['id'].toString();
              final isSelected = selectedRoomId == roomId;
              final occupancy = room['current_occupancy'] ?? 0;
              final capacity = room['capacity'] ?? 0;
              return GestureDetector(
                onTap: () => setSheetState(() => selectedRoomId = roomId),
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
                      Text('$occupancy/$capacity мест', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                    ])),
                    if (isSelected) const Icon(Icons.check_circle, color: AppColors.accent, size: 20),
                  ]),
                ),
              );
            }),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: selectedRoomId != null ? () => Navigator.pop(ctx, true) : null,
                child: const Text('Перевести'),
              ),
            ),
          ]),
        ),
      ),
    );

    if (confirmed != true || selectedRoomId == null || !mounted) return;

    try {
      final resp = await Api.post('/residents/${widget.residentId}/transfer/', body: {'room_id': selectedRoomId});
      if (!mounted) return;
      if (resp.statusCode == 200 || resp.statusCode == 201) {
        _showSnack('Жилец переведён');
        _loadAll();
      } else {
        final body = jsonDecode(resp.body);
        _showSnack(body['error']?['message'] ?? body['detail'] ?? 'Ошибка перевода', isError: true);
      }
    } catch (e) {
      if (mounted) _showSnack('Ошибка: $e', isError: true);
    }
  }

  Future<void> _onEvict() async {
    if (!_hasActiveContract) {
      _showSnack('Нет активного договора для расторжения', isError: true);
      return;
    }

    final contractId = _activeContract!['id'].toString();
    final contractNumber = _activeContract!['contract_number'] ?? '';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: const Text('Выселить жильца?', style: TextStyle(fontSize: 16)),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Будет расторгнут договор $contractNumber.', style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          const SizedBox(height: 8),
          const Text('Это действие нельзя отменить.', style: TextStyle(color: AppColors.danger, fontSize: 12)),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Отмена')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Выселить'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      final resp = await Api.post('/contracts/$contractId/terminate/');
      if (!mounted) return;
      if (resp.statusCode == 200 || resp.statusCode == 204) {
        _showSnack('Договор расторгнут, жилец выселен');
        _loadAll();
      } else {
        final body = jsonDecode(resp.body);
        _showSnack(body['error']?['message'] ?? body['detail'] ?? 'Ошибка', isError: true);
      }
    } catch (e) {
      if (mounted) _showSnack('Ошибка: $e', isError: true);
    }
  }

  Future<void> _onCreateContract() async {
    if (_resident == null) return;
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(builder: (_) => CreateContractScreen(preselectedResident: _resident!)),
    );
    if (result != null && mounted) {
      await _loadAll();
      // If user wants to assign room right away
      if (result['assign_room'] == true) {
        _onAssignRoom();
      }
    }
  }

  Future<void> _onAssignRoom() async {
    if (!_hasActiveContract) {
      _showSnack('Сначала создайте договор', isError: true);
      return;
    }

    // Load available rooms
    final roomsResp = await Api.get('/rooms/available/', params: {'page_size': '200'});
    if (!mounted) return;
    List<dynamic> rooms = [];
    if (roomsResp.statusCode == 200) {
      final body = jsonDecode(roomsResp.body);
      rooms = body is List ? body : (body['results'] ?? []);
    }
    if (rooms.isEmpty) {
      _showSnack('Нет свободных комнат', isError: true);
      return;
    }

    String? selectedRoomId;
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: AppColors.bg,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => DraggableScrollableSheet(
          initialChildSize: 0.6,
          minChildSize: 0.3,
          maxChildSize: 0.85,
          expand: false,
          builder: (_, controller) => ListView(controller: controller, padding: const EdgeInsets.all(20), children: [
            Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: AppColors.border, borderRadius: BorderRadius.circular(2)))),
            const SizedBox(height: 16),
            const Text('Назначить комнату', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
            const SizedBox(height: 4),
            Text(
              _resident?['full_name'] ?? '',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
            const SizedBox(height: 16),
            ...rooms.map((room) {
              final roomId = room['id'].toString();
              final isSelected = selectedRoomId == roomId;
              final occupancy = room['current_occupancy'] ?? 0;
              final capacity = room['capacity'] ?? 0;
              return GestureDetector(
                onTap: () => setSheetState(() => selectedRoomId = roomId),
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
                      Text('$occupancy/$capacity мест', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                    ])),
                    if (isSelected) const Icon(Icons.check_circle, color: AppColors.accent, size: 20),
                  ]),
                ),
              );
            }),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: selectedRoomId != null ? () => Navigator.pop(ctx, true) : null,
                child: const Text('Назначить'),
              ),
            ),
          ]),
        ),
      ),
    );

    if (confirmed != true || selectedRoomId == null || !mounted) return;

    try {
      final resp = await Api.post('/assignments/', body: {
        'resident': widget.residentId,
        'room': selectedRoomId,
        'contract': _activeContract!['id'].toString(),
        'start_date': DateTime.now().toIso8601String().substring(0, 10),
      });
      if (!mounted) return;
      if (resp.statusCode == 200 || resp.statusCode == 201) {
        _showSnack('Комната назначена');
        _loadAll();
      } else {
        final body = jsonDecode(resp.body);
        _showSnack(body['error']?['message'] ?? body['detail'] ?? 'Ошибка назначения', isError: true);
      }
    } catch (e) {
      if (mounted) _showSnack('Ошибка: $e', isError: true);
    }
  }

  void _showSnack(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: isError ? AppColors.danger : AppColors.success),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('DORMITORY'),
        actions: [
          if (_resident != null)
            IconButton(icon: const Icon(Icons.refresh, size: 20), onPressed: _loadAll),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
          : _error != null
              ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text(_error!, style: const TextStyle(color: AppColors.danger)),
                  const SizedBox(height: 12),
                  TextButton(onPressed: _loadAll, child: const Text('Повторить')),
                ]))
              : RefreshIndicator(color: AppColors.accent, onRefresh: _loadAll, child: _body()),
    );
  }

  Widget _body() {
    final r = _resident!;
    final status = r['status'] ?? '';
    final guardians = r['guardians'] as List<dynamic>? ?? [];
    final documents = r['documents'] as List<dynamic>? ?? [];
    final debt = (_balance?['debt'] ?? 0).toDouble();

    return NestedScrollView(
      headerSliverBuilder: (context, _) => [
        SliverToBoxAdapter(child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Profile card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: AppColors.accent.withAlpha(25),
                  backgroundImage: r['photo'] != null && r['photo'].toString().isNotEmpty ? NetworkImage(r['photo']) : null,
                  child: r['photo'] == null || r['photo'].toString().isEmpty
                      ? Text((r['full_name'] ?? '?')[0], style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 24))
                      : null,
                ),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text(r['full_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: _statusColor(status).withAlpha(25), borderRadius: BorderRadius.circular(12)),
                      child: Text(_statusLabel(status), style: TextStyle(color: _statusColor(status), fontSize: 11, fontWeight: FontWeight.w700)),
                    ),
                  ]),
                  const SizedBox(height: 6),
                  _infoRow(Icons.badge_outlined, 'ID: ${r['university_id'] ?? '-'}'),
                  _infoRow(Icons.school_outlined, '${r['faculty'] ?? '-'} · ${r['course'] ?? '-'} курс'),
                  if (r['phone'] != null) _infoRow(Icons.phone_outlined, r['phone']),
                ])),
              ]),
            ),
            const SizedBox(height: 12),

            // Debt card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: const LinearGradient(colors: [Color(0xFFF97316), Color(0xFFEA580C)]),
              ),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Задолженность', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Text('${_formatAmount(debt)} UZS', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                ])),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: AppColors.accent, padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10), textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                  onPressed: () async {
                    await Navigator.push(context, MaterialPageRoute(builder: (_) => NewPaymentScreen(preselectedResident: _resident)));
                    _loadAll();
                  },
                  child: const Text('ВНЕСТИ ОПЛАТУ'),
                ),
              ]),
            ),
            const SizedBox(height: 12),

            // Primary action buttons row
            Row(children: [
              _actionButton(Icons.edit_outlined, 'Редактировать', AppColors.accent, _onEdit),
              const SizedBox(width: 8),
              _actionButton(Icons.swap_horiz, 'Перевести', AppColors.warning, _onTransfer),
              const SizedBox(width: 8),
              _actionButton(Icons.logout, 'Выселить', AppColors.danger, _onEvict),
            ]),

            // Conditional action buttons
            if (!_hasActiveContract || !_hasActiveAssignment) ...[
              const SizedBox(height: 8),
              Row(children: [
                if (!_hasActiveContract)
                  Expanded(child: _actionButton(Icons.description_outlined, 'Создать договор', AppColors.success, _onCreateContract)),
                if (!_hasActiveContract && _hasActiveContract == false && !_hasActiveAssignment)
                  const SizedBox(width: 8),
                if (_hasActiveContract && !_hasActiveAssignment)
                  Expanded(child: _actionButton(Icons.meeting_room_outlined, 'Назначить комнату', Colors.blue, _onAssignRoom)),
              ]),
            ],
          ]),
        )),
        SliverPersistentHeader(
          pinned: true,
          delegate: _TabBarDelegate(TabBar(
            controller: _tabController,
            labelColor: AppColors.accent,
            unselectedLabelColor: AppColors.textMuted,
            indicatorColor: AppColors.accent,
            indicatorSize: TabBarIndicatorSize.label,
            labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            tabs: const [
              Tab(text: 'Опекуны'),
              Tab(text: 'Документы'),
              Tab(text: 'Финансы'),
              Tab(text: 'Проживание'),
            ],
          )),
        ),
      ],
      body: TabBarView(controller: _tabController, children: [
        _guardiansTab(guardians),
        _documentsTab(documents),
        _financeTab(),
        _accommodationTab(),
      ]),
    );
  }

  Widget _infoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(children: [
        Icon(icon, size: 14, color: AppColors.textMuted),
        const SizedBox(width: 6),
        Expanded(child: Text(text, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12))),
      ]),
    );
  }

  Widget _actionButton(IconData icon, String label, Color color, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(color: color.withAlpha(15), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withAlpha(40))),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
          ]),
        ),
      ),
    );
  }

  // --- Guardians Tab ---
  Widget _guardiansTab(List<dynamic> guardians) {
    if (guardians.isEmpty) return const Center(child: Text('Нет опекунов', style: TextStyle(color: AppColors.textMuted)));
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: guardians.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final g = guardians[i];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
          child: Row(children: [
            CircleAvatar(radius: 20, backgroundColor: AppColors.accent.withAlpha(20), child: const Icon(Icons.person_outline, color: AppColors.accent, size: 20)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(g['full_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              const SizedBox(height: 2),
              Text(g['relationship'] ?? '', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(g['phone'] ?? '', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
              if (g['is_emergency_contact'] == true)
                Container(
                  margin: const EdgeInsets.only(top: 4),
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: AppColors.danger.withAlpha(20), borderRadius: BorderRadius.circular(8)),
                  child: const Text('Экстренный', style: TextStyle(color: AppColors.danger, fontSize: 9, fontWeight: FontWeight.w600)),
                ),
            ]),
          ]),
        );
      },
    );
  }

  // --- Documents Tab ---
  Widget _documentsTab(List<dynamic> documents) {
    if (documents.isEmpty) return const Center(child: Text('Нет документов', style: TextStyle(color: AppColors.textMuted)));
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: documents.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final d = documents[i];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: AppColors.accent.withAlpha(20), borderRadius: BorderRadius.circular(8)),
              child: Text((d['document_type'] ?? '').toString().toUpperCase(), style: const TextStyle(color: AppColors.accent, fontSize: 10, fontWeight: FontWeight.w700)),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(d['document_number'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              if (d['created_at'] != null)
                Text(d['created_at'].toString().substring(0, 10), style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
            ])),
            const Icon(Icons.description_outlined, color: AppColors.textMuted, size: 20),
          ]),
        );
      },
    );
  }

  // --- Finance Tab ---
  Widget _financeTab() {
    return ListView(padding: const EdgeInsets.all(16), children: [
      // Balance summary
      if (_balance != null) ...[
        Row(children: [
          _summaryChip('Начислено', _formatAmount((_balance!['total_charges'] ?? 0).toDouble()), AppColors.textPrimary),
          const SizedBox(width: 8),
          _summaryChip('Оплачено', _formatAmount((_balance!['total_paid'] ?? 0).toDouble()), AppColors.success),
          const SizedBox(width: 8),
          _summaryChip('Долг', _formatAmount((_balance!['debt'] ?? 0).toDouble()), AppColors.danger),
        ]),
        const SizedBox(height: 16),
      ],
      // Charges table
      const Text('Начисления', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
      const SizedBox(height: 8),
      if (_charges.isEmpty)
        const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('Нет начислений', style: TextStyle(color: AppColors.textMuted, fontSize: 12)))
      else
        Container(
          decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                headingRowColor: WidgetStateProperty.all(AppColors.card2),
                dataRowColor: WidgetStateProperty.all(AppColors.card),
                headingTextStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.w600),
                dataTextStyle: const TextStyle(color: AppColors.textPrimary, fontSize: 12),
                columnSpacing: 16,
                columns: const [
                  DataColumn(label: Text('Период')),
                  DataColumn(label: Text('Сумма'), numeric: true),
                  DataColumn(label: Text('Статус')),
                ],
                rows: _charges.map<DataRow>((c) {
                  final chargeStatus = c['status'] ?? '';
                  final statusColor = chargeStatus == 'paid' ? AppColors.success : chargeStatus == 'overdue' ? AppColors.danger : chargeStatus == 'partially_paid' ? AppColors.warning : AppColors.textMuted;
                  return DataRow(cells: [
                    DataCell(Text('${c['period_month']}/${c['period_year']}')),
                    DataCell(Text(_formatAmount((c['amount'] ?? 0).toDouble()))),
                    DataCell(Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: statusColor.withAlpha(20), borderRadius: BorderRadius.circular(8)),
                      child: Text(chargeStatus, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w600)),
                    )),
                  ]);
                }).toList(),
              ),
            ),
          ),
        ),
      const SizedBox(height: 20),
      // Payment history
      const Text('История оплат', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
      const SizedBox(height: 8),
      if (_payments.isEmpty)
        const Text('Нет оплат', style: TextStyle(color: AppColors.textMuted, fontSize: 12))
      else
        ..._payments.map((p) => Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
          child: Row(children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: AppColors.success.withAlpha(15), borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.payment, color: AppColors.success, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${_formatAmount((p['amount'] ?? 0).toDouble())} UZS', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.success)),
              Text(_formatDate(p['payment_date']), style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: AppColors.card2, borderRadius: BorderRadius.circular(8)),
              child: Text(_paymentMethodLabel(p['payment_method']), style: const TextStyle(color: AppColors.textSecondary, fontSize: 10, fontWeight: FontWeight.w500)),
            ),
          ]),
        )),
    ]);
  }

  Widget _summaryChip(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
        child: Column(children: [
          Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 13)),
        ]),
      ),
    );
  }

  // --- Accommodation Tab ---
  Widget _accommodationTab() {
    return ListView(padding: const EdgeInsets.all(16), children: [
      // Current assignment
      const Text('Текущее проживание', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
      const SizedBox(height: 8),
      if (_assignments.isNotEmpty) ...[
        () {
          final active = _assignments.where((a) => a['status'] == 'active').toList();
          if (active.isEmpty) return const Text('Нет активного назначения', style: TextStyle(color: AppColors.textMuted, fontSize: 12));
          final a = active.first;
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.success.withAlpha(60))),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                const Icon(Icons.meeting_room_outlined, color: AppColors.success, size: 18),
                const SizedBox(width: 8),
                Text('Комната ${a['room_detail']?['room_number'] ?? a['room'] ?? '-'}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: AppColors.success.withAlpha(20), borderRadius: BorderRadius.circular(8)),
                  child: const Text('Активно', style: TextStyle(color: AppColors.success, fontSize: 10, fontWeight: FontWeight.w700)),
                ),
              ]),
              const SizedBox(height: 8),
              Text('С ${_formatDate(a['start_date'])}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            ]),
          );
        }(),
      ] else
        const Text('Нет назначений', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),

      const SizedBox(height: 20),
      // Contracts
      const Text('Договоры', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
      const SizedBox(height: 8),
      if (_contracts.isEmpty)
        const Text('Нет договоров', style: TextStyle(color: AppColors.textMuted, fontSize: 12))
      else
        ..._contracts.map((c) {
          final cStatus = c['status'] ?? '';
          final cColor = cStatus == 'active' ? AppColors.success : cStatus == 'terminated' ? AppColors.danger : AppColors.textMuted;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text(c['contract_number'] ?? '', style: const TextStyle(fontFamily: 'monospace', color: AppColors.accent, fontWeight: FontWeight.w700, fontSize: 13)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: cColor.withAlpha(20), borderRadius: BorderRadius.circular(8)),
                  child: Text(cStatus, style: TextStyle(color: cColor, fontSize: 10, fontWeight: FontWeight.w600)),
                ),
              ]),
              const SizedBox(height: 6),
              Text('${_formatDate(c['start_date'])} — ${_formatDate(c['end_date'])}', style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
            ]),
          );
        }),

      const SizedBox(height: 20),
      // Assignment history
      const Text('История назначений', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
      const SizedBox(height: 8),
      if (_assignments.isEmpty)
        const Text('Нет истории', style: TextStyle(color: AppColors.textMuted, fontSize: 12))
      else
        ..._assignments.map((a) {
          final aStatus = a['status'] ?? '';
          final aColor = aStatus == 'active' ? AppColors.success : AppColors.textMuted;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
            child: Row(children: [
              Icon(Icons.meeting_room_outlined, color: aColor, size: 16),
              const SizedBox(width: 8),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Комната ${a['room_detail']?['room_number'] ?? a['room'] ?? '-'}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                Text('${_formatDate(a['start_date'])} — ${a['end_date'] != null ? _formatDate(a['end_date']) : 'по сей день'}', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ])),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: aColor.withAlpha(20), borderRadius: BorderRadius.circular(8)),
                child: Text(aStatus, style: TextStyle(color: aColor, fontSize: 9, fontWeight: FontWeight.w600)),
              ),
            ]),
          );
        }),
    ]);
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

  String _formatDate(dynamic date) {
    if (date == null) return '-';
    final s = date.toString();
    if (s.length >= 10) return s.substring(0, 10);
    return s;
  }

  String _paymentMethodLabel(dynamic method) {
    switch (method) {
      case 'cash': return 'Наличные';
      case 'bank_transfer': return 'Перевод';
      case 'card': return 'Карта';
      default: return method?.toString() ?? '-';
    }
  }
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  _TabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;
  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(color: AppColors.bg, child: tabBar);
  }

  @override
  bool shouldRebuild(covariant _TabBarDelegate oldDelegate) => false;
}
