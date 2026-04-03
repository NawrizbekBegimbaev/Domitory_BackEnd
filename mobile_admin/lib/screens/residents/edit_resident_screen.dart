import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../core/api.dart';

class EditResidentScreen extends StatefulWidget {
  final Map<String, dynamic> resident;
  const EditResidentScreen({super.key, required this.resident});

  @override
  State<EditResidentScreen> createState() => _EditResidentScreenState();
}

class _EditResidentScreenState extends State<EditResidentScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;

  late final TextEditingController _fullNameCtrl;
  late final TextEditingController _phoneCtrl;
  late final TextEditingController _emailCtrl;
  late final TextEditingController _universityIdCtrl;
  late final TextEditingController _notesCtrl;
  late int _course;
  late String _gender;
  late String _status;
  DateTime? _birthDate;
  String? _faculty;
  List<dynamic> _faculties = [];

  static const _genders = {'male': 'Мужской', 'female': 'Женский'};
  static const _statuses = {
    'active': 'Активный',
    'pending': 'Ожидающий',
    'evicted': 'Выселен',
    'graduated': 'Выпустился',
  };

  @override
  void initState() {
    super.initState();
    final r = widget.resident;
    _fullNameCtrl = TextEditingController(text: r['full_name'] ?? '');
    _phoneCtrl = TextEditingController(text: _extractPhone(r['phone_number'] ?? r['phone']));
    _emailCtrl = TextEditingController(text: r['email'] ?? '');
    _universityIdCtrl = TextEditingController(text: r['university_id'] ?? '');
    _notesCtrl = TextEditingController(text: r['notes'] ?? '');
    _faculty = r['faculty'] ?? '';
    _course = r['course'] ?? 1;
    _gender = r['gender'] ?? 'male';
    _status = r['status'] ?? 'active';
    if (r['birth_date'] != null) {
      try {
        _birthDate = DateTime.parse(r['birth_date'].toString());
      } catch (_) {}
    }
    _loadFaculties();
  }

  Future<void> _loadFaculties() async {
    try {
      final resp = await Api.get('/faculties/', params: {'page_size': '200'});
      if (resp.statusCode == 200 && mounted) {
        final body = jsonDecode(resp.body);
        setState(() => _faculties = body is List ? body : body['results'] ?? []);
      }
    } catch (_) {}
  }

  String _extractPhone(dynamic phone) {
    if (phone == null) return '';
    final s = phone.toString().replaceAll(RegExp(r'[^0-9]'), '');
    if (s.length >= 9) return s.substring(s.length - 9);
    return s;
  }

  @override
  void dispose() {
    _fullNameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _universityIdCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _selectBirthDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _birthDate ?? DateTime(2000, 1, 1),
      firstDate: DateTime(1960),
      lastDate: DateTime.now(),
      locale: const Locale('ru'),
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
      setState(() => _birthDate = date);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _saving = true);
    try {
      final phone = _phoneCtrl.text.replaceAll(RegExp(r'[^0-9]'), '');
      final body = <String, dynamic>{
        'full_name': _fullNameCtrl.text.trim(),
        'gender': _gender,
        'university_id': _universityIdCtrl.text.trim(),
        'faculty': _faculty != null && _faculty!.isNotEmpty ? _faculty : null,
        'course': _course,
        'status': _status,
        'notes': _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : null,
      };
      if (phone.length == 9) body['phone_number'] = '+998$phone';
      if (_emailCtrl.text.trim().isNotEmpty) body['email'] = _emailCtrl.text.trim();
      if (_birthDate != null) {
        body['birth_date'] = '${_birthDate!.year}-${_birthDate!.month.toString().padLeft(2, '0')}-${_birthDate!.day.toString().padLeft(2, '0')}';
      }

      final resp = await Api.patch('/residents/${widget.resident['id']}/', body: body);

      if (resp.statusCode == 200 || resp.statusCode == 204) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Данные обновлены'), backgroundColor: AppColors.success),
          );
          Navigator.pop(context, true);
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
            const Text('Редактирование', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(widget.resident['full_name'] ?? '', style: const TextStyle(color: AppColors.textMuted, fontSize: 14)),
            const SizedBox(height: 20),

            // Personal
            _sectionTitle('Личные данные'),
            const SizedBox(height: 12),
            _textField(_fullNameCtrl, 'ФИО', required: true),
            const SizedBox(height: 10),
            TextFormField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9 ]')),
                _PhoneFormatter(),
              ],
              decoration: const InputDecoration(
                labelText: 'Телефон',
                prefixText: '+998 ',
                hintText: 'XX XXX XX XX',
                prefixStyle: TextStyle(color: AppColors.textPrimary, fontSize: 14),
              ),
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
              validator: (v) {
                final digits = v?.replaceAll(' ', '') ?? '';
                if (digits.isNotEmpty && digits.length != 9) return 'Введите 9 цифр';
                return null;
              },
            ),
            const SizedBox(height: 10),
            _textField(_emailCtrl, 'Email', keyboardType: TextInputType.emailAddress),
            const SizedBox(height: 10),

            // Birth date
            GestureDetector(
              onTap: _selectBirthDate,
              child: AbsorbPointer(
                child: TextFormField(
                  decoration: InputDecoration(
                    labelText: 'Дата рождения',
                    hintText: 'Выберите дату',
                    suffixIcon: const Icon(Icons.calendar_today, color: AppColors.textMuted, size: 18),
                  ),
                  controller: TextEditingController(
                    text: _birthDate != null
                        ? '${_birthDate!.day.toString().padLeft(2, '0')}/${_birthDate!.month.toString().padLeft(2, '0')}/${_birthDate!.year}'
                        : '',
                  ),
                  style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Gender
            const Text('Пол', style: TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(children: _genders.entries.map((e) {
              final active = _gender == e.key;
              return Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _gender = e.key),
                  child: Container(
                    margin: EdgeInsets.only(right: e.key == 'male' ? 10 : 0),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: active ? AppColors.accent : AppColors.card,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: active ? AppColors.accent : AppColors.border),
                    ),
                    alignment: Alignment.center,
                    child: Text(e.value, style: TextStyle(color: active ? Colors.white : AppColors.textSecondary, fontWeight: FontWeight.w600, fontSize: 14)),
                  ),
                ),
              );
            }).toList()),
            const SizedBox(height: 24),

            // University
            _sectionTitle('Университет'),
            const SizedBox(height: 12),
            _textField(_universityIdCtrl, 'Студенческий ID', required: true),
            const SizedBox(height: 10),
            _faculties.isNotEmpty
                ? Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
                    child: DropdownButtonFormField<String>(
                      value: _faculties.any((f) => f['name'] == _faculty) ? _faculty : null,
                      decoration: const InputDecoration(labelText: 'Факультет', border: InputBorder.none, enabledBorder: InputBorder.none, focusedBorder: InputBorder.none, contentPadding: EdgeInsets.zero),
                      dropdownColor: AppColors.card,
                      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                      icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.textMuted, size: 20),
                      items: [
                        const DropdownMenuItem(value: null, child: Text('Не выбрано')),
                        ..._faculties.map((f) => DropdownMenuItem(value: f['name']?.toString() ?? '', child: Text(f['name']?.toString() ?? ''))),
                      ],
                      onChanged: (v) => setState(() => _faculty = v),
                    ),
                  )
                : TextFormField(
                    initialValue: _faculty,
                    decoration: const InputDecoration(labelText: 'Факультет'),
                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                    onChanged: (v) => _faculty = v,
                  ),
            const SizedBox(height: 12),
            const Text('Курс', style: TextStyle(color: AppColors.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: [1, 2, 3, 4].map((c) {
                final label = c == 4 ? '4+' : '$c';
                final active = _course == c;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _course = c),
                    child: Container(
                      margin: EdgeInsets.only(right: c < 4 ? 8 : 0),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: active ? AppColors.accent : AppColors.card,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: active ? AppColors.accent : AppColors.border),
                      ),
                      alignment: Alignment.center,
                      child: Text(label, style: TextStyle(color: active ? Colors.white : AppColors.textSecondary, fontWeight: FontWeight.w600, fontSize: 14)),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),

            // Status
            _sectionTitle('Статус'),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.border),
              ),
              child: DropdownButtonFormField<String>(
                value: _status,
                decoration: const InputDecoration(
                  labelText: 'Статус',
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                ),
                dropdownColor: AppColors.card,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.textMuted, size: 20),
                items: _statuses.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))).toList(),
                onChanged: (v) => setState(() => _status = v ?? 'active'),
              ),
            ),
            const SizedBox(height: 24),

            // Notes
            _sectionTitle('Заметки'),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notesCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Заметки',
                alignLabelWithHint: true,
              ),
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            ),
            const SizedBox(height: 32),

            // Save button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Сохранить изменения'),
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

  Widget _textField(
    TextEditingController controller,
    String label, {
    bool required = false,
    TextInputType? keyboardType,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      decoration: InputDecoration(labelText: label),
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
      validator: required ? (v) => v == null || v.trim().isEmpty ? 'Обязательное поле' : null : null,
    );
  }
}

class _PhoneFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(' ', '');
    if (digits.length > 9) return oldValue;
    final buffer = StringBuffer();
    for (int i = 0; i < digits.length; i++) {
      if (i == 2 || i == 5 || i == 7) buffer.write(' ');
      buffer.write(digits[i]);
    }
    final formatted = buffer.toString();
    return TextEditingValue(text: formatted, selection: TextSelection.collapsed(offset: formatted.length));
  }
}
