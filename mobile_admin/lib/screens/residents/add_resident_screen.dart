import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
// image_picker removed — using placeholder for now
import '../../core/theme.dart';
import '../../core/api.dart';

class AddResidentScreen extends StatefulWidget {
  const AddResidentScreen({super.key});

  @override
  State<AddResidentScreen> createState() => _AddResidentScreenState();
}

class _AddResidentScreenState extends State<AddResidentScreen> {
  final _formKey = GlobalKey<FormState>();
  bool _saving = false;
  File? _photo;

  // Personal
  final _lastNameCtrl = TextEditingController();
  final _firstNameCtrl = TextEditingController();
  final _middleNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  DateTime? _birthDate;
  String _gender = 'male';

  // Document
  String _docType = 'id_card';
  final _docNumberCtrl = TextEditingController();
  File? _docFile;

  // University
  final _universityIdCtrl = TextEditingController();
  String? _faculty;
  int _course = 1;
  List<dynamic> _faculties = [];

  // Guardian
  final _guardianNameCtrl = TextEditingController();
  String _guardianRelationship = 'parent';
  final _guardianPhoneCtrl = TextEditingController();

  static const _docTypes = {
    'id_card': 'ID-карта',
    'passport': 'Паспорт',
    'driver_license': 'Вод. удостоверение',
  };

  static const _relationships = {
    'parent': 'Родитель',
    'sibling': 'Брат/Сестра',
    'spouse': 'Супруг(а)',
    'other': 'Другое',
  };

  @override
  void initState() {
    super.initState();
    _loadFaculties();
  }

  @override
  void dispose() {
    _lastNameCtrl.dispose();
    _firstNameCtrl.dispose();
    _middleNameCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _docNumberCtrl.dispose();
    _universityIdCtrl.dispose();
    _guardianNameCtrl.dispose();
    _guardianPhoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadFaculties() async {
    try {
      final resp = await Api.get('/faculties/', params: {'page_size': '200'});
      if (resp.statusCode == 200 && mounted) {
        final body = jsonDecode(resp.body);
        setState(() {
          _faculties = body is List ? body : body['results'] ?? [];
        });
      }
    } catch (_) {}
  }

  Future<void> _pickPhoto() async {
    // Photo picker disabled — image_picker not available
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Фото можно загрузить через веб-версию')),
      );
    }
  }

  Future<void> _pickDocFile() async {
    // File picker disabled — image_picker not available
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Документы можно загрузить через веб-версию')),
      );
    }
  }

  Future<void> _selectBirthDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _birthDate ?? DateTime(2000, 1, 1),
      firstDate: DateTime(1960),
      lastDate: DateTime.now(),
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
      final fullName = '${_lastNameCtrl.text.trim()} ${_firstNameCtrl.text.trim()} ${_middleNameCtrl.text.trim()}'.trim();
      final phone = '+998${_phoneCtrl.text.replaceAll(RegExp(r'[^0-9]'), '')}';

      // Create resident
      final residentBody = {
        'full_name': fullName,
        'phone': phone,
        'email': _emailCtrl.text.trim().isNotEmpty ? _emailCtrl.text.trim() : null,
        'birth_date': _birthDate != null
            ? '${_birthDate!.year}-${_birthDate!.month.toString().padLeft(2, '0')}-${_birthDate!.day.toString().padLeft(2, '0')}'
            : null,
        'gender': _gender,
        'university_id': _universityIdCtrl.text.trim(),
        'faculty': _faculty,
        'course': _course,
      };

      final resp = await Api.post('/residents/', body: residentBody);

      if (resp.statusCode == 201 || resp.statusCode == 200) {
        final resident = jsonDecode(resp.body);
        final residentId = resident['id'];

        // Create guardian if name provided
        if (_guardianNameCtrl.text.trim().isNotEmpty) {
          final guardianPhone = '+998${_guardianPhoneCtrl.text.replaceAll(RegExp(r'[^0-9]'), '')}';
          await Api.post('/residents/$residentId/guardians/', body: {
            'full_name': _guardianNameCtrl.text.trim(),
            'relationship': _guardianRelationship,
            'phone': guardianPhone,
            'is_emergency_contact': true,
          });
        }

        // Upload document if number provided
        if (_docNumberCtrl.text.trim().isNotEmpty) {
          await Api.post('/residents/$residentId/documents/', body: {
            'document_type': _docType,
            'document_number': _docNumberCtrl.text.trim(),
          });
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Жилец добавлен'),
              backgroundColor: AppColors.success,
            ),
          );
          Navigator.pop(context, true);
        }
      } else {
        final errorBody = jsonDecode(resp.body);
        final errorMsg = errorBody['error']?['message'] ?? errorBody.toString();
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
            const Text('Новый жилец', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),

            // Photo
            Center(
              child: GestureDetector(
                onTap: _pickPhoto,
                child: CircleAvatar(
                  radius: 48,
                  backgroundColor: AppColors.card,
                  backgroundImage: _photo != null ? FileImage(_photo!) : null,
                  child: _photo == null
                      ? Column(mainAxisAlignment: MainAxisAlignment.center, children: const [
                          Icon(Icons.camera_alt_outlined, color: AppColors.textMuted, size: 28),
                          SizedBox(height: 4),
                          Text('Фото', style: TextStyle(color: AppColors.textMuted, fontSize: 10)),
                        ])
                      : null,
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Personal
            _sectionTitle('Личные данные'),
            const SizedBox(height: 12),
            _textField(_lastNameCtrl, 'Фамилия', required: true),
            const SizedBox(height: 10),
            _textField(_firstNameCtrl, 'Имя', required: true),
            const SizedBox(height: 10),
            _textField(_middleNameCtrl, 'Отчество'),
            const SizedBox(height: 10),
            TextFormField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(9),
              ],
              decoration: const InputDecoration(
                labelText: 'Телефон',
                prefixText: '+998 ',
                prefixStyle: TextStyle(color: AppColors.textPrimary, fontSize: 14),
              ),
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
              validator: (v) => v != null && v.length == 9 ? null : 'Введите 9 цифр',
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
                        ? '${_birthDate!.day.toString().padLeft(2, '0')}.${_birthDate!.month.toString().padLeft(2, '0')}.${_birthDate!.year}'
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
            Row(children: [
              _genderButton('male', 'Мужской'),
              const SizedBox(width: 10),
              _genderButton('female', 'Женский'),
            ]),
            const SizedBox(height: 24),

            // Document
            _sectionTitle('Документ'),
            const SizedBox(height: 12),
            _dropdownField(
              value: _docType,
              items: _docTypes,
              label: 'Тип документа',
              onChanged: (v) => setState(() => _docType = v ?? 'id_card'),
            ),
            const SizedBox(height: 10),
            _textField(_docNumberCtrl, 'Номер документа'),
            const SizedBox(height: 10),
            GestureDetector(
              onTap: _pickDocFile,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: _docFile != null ? AppColors.success : AppColors.border),
                ),
                child: Row(children: [
                  Icon(
                    _docFile != null ? Icons.check_circle : Icons.attach_file,
                    color: _docFile != null ? AppColors.success : AppColors.textMuted,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    _docFile != null ? 'Файл выбран' : 'Прикрепить файл',
                    style: TextStyle(color: _docFile != null ? AppColors.success : AppColors.textMuted, fontSize: 14),
                  ),
                ]),
              ),
            ),
            const SizedBox(height: 24),

            // University
            _sectionTitle('Университет'),
            const SizedBox(height: 12),
            _textField(_universityIdCtrl, 'Студенческий ID', required: true),
            const SizedBox(height: 10),
            _faculties.isNotEmpty
                ? _dropdownField(
                    value: _faculty,
                    items: {for (var f in _faculties) (f['id']?.toString() ?? f['name']): f['name'] ?? ''},
                    label: 'Факультет',
                    onChanged: (v) => setState(() => _faculty = v),
                    allowNull: true,
                  )
                : _textField(
                    TextEditingController(text: _faculty ?? ''),
                    'Факультет',
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
                      child: Text(
                        label,
                        style: TextStyle(
                          color: active ? Colors.white : AppColors.textSecondary,
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),

            // Guardian
            _sectionTitle('Опекун'),
            const SizedBox(height: 12),
            _textField(_guardianNameCtrl, 'ФИО опекуна'),
            const SizedBox(height: 10),
            _dropdownField(
              value: _guardianRelationship,
              items: _relationships,
              label: 'Отношение',
              onChanged: (v) => setState(() => _guardianRelationship = v ?? 'parent'),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _guardianPhoneCtrl,
              keyboardType: TextInputType.phone,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(9),
              ],
              decoration: const InputDecoration(
                labelText: 'Телефон опекуна',
                prefixText: '+998 ',
                prefixStyle: TextStyle(color: AppColors.textPrimary, fontSize: 14),
              ),
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
            ),
            const SizedBox(height: 32),

            // Save
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Сохранить'),
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
    ValueChanged<String>? onChanged,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      onChanged: onChanged,
      decoration: InputDecoration(labelText: label),
      style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
      validator: required ? (v) => v == null || v.trim().isEmpty ? 'Обязательное поле' : null : null,
    );
  }

  Widget _dropdownField({
    required String? value,
    required Map<String, String> items,
    required String label,
    required ValueChanged<String?> onChanged,
    bool allowNull = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
      ),
      child: DropdownButtonFormField<String>(
        value: value,
        decoration: InputDecoration(
          labelText: label,
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding: EdgeInsets.zero,
        ),
        dropdownColor: AppColors.card,
        style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
        icon: const Icon(Icons.keyboard_arrow_down, color: AppColors.textMuted, size: 20),
        items: [
          if (allowNull) const DropdownMenuItem(value: null, child: Text('Не выбрано')),
          ...items.entries.map((e) => DropdownMenuItem(value: e.key, child: Text(e.value))),
        ],
        onChanged: onChanged,
      ),
    );
  }

  Widget _genderButton(String value, String label) {
    final active = _gender == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _gender = value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: active ? AppColors.accent : AppColors.card,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: active ? AppColors.accent : AppColors.border),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              color: active ? Colors.white : AppColors.textSecondary,
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }
}
