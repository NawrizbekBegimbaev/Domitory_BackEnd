import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';

class CreateContractScreen extends StatefulWidget {
  final Map<String, dynamic>? preselectedResident;
  const CreateContractScreen({super.key, this.preselectedResident});

  @override
  State<CreateContractScreen> createState() => _CreateContractScreenState();
}

class _CreateContractScreenState extends State<CreateContractScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;
  bool _loadingBuildings = true;

  List<dynamic> _buildings = [];
  String? _selectedBuildingId;
  DateTime? _startDate;
  DateTime? _endDate;

  // If resident is pre-selected
  Map<String, dynamic>? _resident;

  @override
  void initState() {
    super.initState();
    _resident = widget.preselectedResident;
    _startDate = DateTime.now();
    _endDate = DateTime(DateTime.now().year + 1, DateTime.now().month, DateTime.now().day);
    _loadBuildings();
  }

  Future<void> _loadBuildings() async {
    try {
      final resp = await Api.get('/buildings/', params: {'page_size': '100'});
      if (resp.statusCode == 200 && mounted) {
        final body = jsonDecode(resp.body);
        _buildings = body['results'] ?? [];
      }
    } catch (_) {}
    if (mounted) setState(() => _loadingBuildings = false);
  }

  Future<void> _pickDate({required bool isStart}) async {
    final initial = isStart ? (_startDate ?? DateTime.now()) : (_endDate ?? DateTime.now().add(const Duration(days: 365)));
    final date = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppColors.accent,
              surface: AppColors.card,
            ),
          ),
          child: child!,
        );
      },
    );
    if (date != null && mounted) {
      setState(() {
        if (isStart) {
          _startDate = date;
        } else {
          _endDate = date;
        }
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

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_startDate == null || _endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Выберите даты начала и окончания'), backgroundColor: AppColors.danger),
      );
      return;
    }
    if (_endDate!.isBefore(_startDate!) || _endDate!.isAtSameMomentAs(_startDate!)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Дата окончания должна быть позже даты начала'), backgroundColor: AppColors.danger),
      );
      return;
    }
    if (_selectedBuildingId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Выберите корпус'), backgroundColor: AppColors.danger),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      final body = {
        'resident': _resident!['id'],
        'building': _selectedBuildingId,
        'start_date': _isoDate(_startDate!),
        'end_date': _isoDate(_endDate!),
      };

      final resp = await Api.post('/contracts/', body: body);

      if (resp.statusCode == 201 || resp.statusCode == 200) {
        final contract = jsonDecode(resp.body);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Договор создан'), backgroundColor: AppColors.success),
          );
          // Ask if user wants to assign a room
          final assignRoom = await showDialog<bool>(
            context: context,
            builder: (ctx) => AlertDialog(
              backgroundColor: AppColors.card,
              title: const Text('Назначить комнату?', style: TextStyle(fontSize: 16)),
              content: const Text(
                'Договор создан. Хотите сразу назначить комнату жильцу?',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx, false),
                  child: const Text('Позже'),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, true),
                  child: const Text('Назначить'),
                ),
              ],
            ),
          );
          if (mounted) {
            // Return contract data so the caller can use it
            Navigator.pop(context, {
              'contract': contract,
              'assign_room': assignRoom == true,
            });
          }
        }
      } else {
        final errorBody = jsonDecode(resp.body);
        final errorMsg = errorBody['error']?['message'] ?? errorBody['detail'] ?? errorBody.toString();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Ошибка: $errorMsg'), backgroundColor: AppColors.danger),
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
      appBar: AppBar(
        title: const Text('DORMITORY'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Новый договор', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),

            // Resident info
            _sectionTitle('Жилец'),
            const SizedBox(height: 12),
            if (_resident != null)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.accent.withAlpha(60)),
                ),
                child: Row(children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.accent.withAlpha(25),
                    child: Text(
                      (_resident!['full_name'] ?? '?')[0],
                      style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(_resident!['full_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    Text('ID: ${_resident!['university_id'] ?? '-'}', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
                  ])),
                  const Icon(Icons.check_circle, color: AppColors.success, size: 20),
                ]),
              )
            else
              const Text('Жилец не выбран', style: TextStyle(color: AppColors.danger, fontSize: 13)),
            const SizedBox(height: 24),

            // Building
            _sectionTitle('Корпус'),
            const SizedBox(height: 12),
            if (_loadingBuildings)
              const Center(child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(color: AppColors.accent),
              ))
            else
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.border),
                ),
                child: DropdownButtonFormField<String>(
                  value: _selectedBuildingId,
                  decoration: const InputDecoration(
                    labelText: 'Выберите корпус',
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    contentPadding: EdgeInsets.zero,
                  ),
                  dropdownColor: AppColors.card,
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                  icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.textMuted, size: 20),
                  items: _buildings.map<DropdownMenuItem<String>>((b) => DropdownMenuItem(
                    value: b['id'].toString(),
                    child: Text(b['name'] ?? 'Корпус'),
                  )).toList(),
                  onChanged: (v) => setState(() => _selectedBuildingId = v),
                  validator: (v) => v == null ? 'Выберите корпус' : null,
                ),
              ),
            const SizedBox(height: 24),

            // Dates
            _sectionTitle('Срок договора'),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => _pickDate(isStart: true),
                  child: AbsorbPointer(
                    child: TextFormField(
                      decoration: InputDecoration(
                        labelText: 'Начало',
                        suffixIcon: const Icon(Icons.calendar_today, color: AppColors.textMuted, size: 18),
                      ),
                      controller: TextEditingController(text: _formatDate(_startDate)),
                      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                      validator: (_) => _startDate == null ? 'Выберите дату' : null,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () => _pickDate(isStart: false),
                  child: AbsorbPointer(
                    child: TextFormField(
                      decoration: InputDecoration(
                        labelText: 'Окончание',
                        suffixIcon: const Icon(Icons.calendar_today, color: AppColors.textMuted, size: 18),
                      ),
                      controller: TextEditingController(text: _formatDate(_endDate)),
                      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                      validator: (_) => _endDate == null ? 'Выберите дату' : null,
                    ),
                  ),
                ),
              ),
            ]),
            const SizedBox(height: 8),
            if (_startDate != null && _endDate != null)
              Text(
                'Длительность: ${_endDate!.difference(_startDate!).inDays} дней',
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
              ),
            const SizedBox(height: 32),

            // Save button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving || _resident == null ? null : _save,
                child: _saving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Создать договор'),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Row(children: [
      Container(width: 3, height: 16, decoration: BoxDecoration(color: AppColors.accent, borderRadius: BorderRadius.circular(2))),
      const SizedBox(width: 8),
      Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
    ]);
  }
}
