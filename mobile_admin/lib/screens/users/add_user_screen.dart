import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../core/api.dart';

class AddUserScreen extends StatefulWidget {
  const AddUserScreen({super.key});

  @override
  State<AddUserScreen> createState() => _AddUserScreenState();
}

class _AddUserScreenState extends State<AddUserScreen> {
  int _step = 1; // 1=email, 2=phone, 3=details
  bool _loading = false;
  String? _error;

  // Step 1 — Email
  final _emailCtrl = TextEditingController();
  final _emailCodeCtrl = TextEditingController();
  bool _emailVerified = false;
  bool _emailSending = false;
  bool _emailCodeSent = false;

  // Step 2 — Phone
  final _phoneCtrl = TextEditingController();
  final _phoneCodeCtrl = TextEditingController();
  bool _phoneVerified = false;
  bool _phoneSending = false;
  bool _phoneCodeSent = false;
  bool _phoneSkipped = false;

  // Step 3 — Details
  final _lastNameCtrl = TextEditingController();
  final _firstNameCtrl = TextEditingController();
  final _middleNameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _showPassword = false;
  int? _roleId;
  List<dynamic> _roles = [];

  static const _roleLabels = {
    'platform_admin': 'Администратор платформы',
    'university_admin': 'Администратор',
    'dorm_manager': 'Комендант',
    'accountant': 'Бухгалтер',
    'security_staff': 'Охрана',
  };

  static const _roleIcons = {
    'university_admin': Icons.shield_outlined,
    'dorm_manager': Icons.people_outline,
    'accountant': Icons.wallet_outlined,
    'security_staff': Icons.visibility_outlined,
  };

  @override
  void initState() {
    super.initState();
    _loadRoles();
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _emailCodeCtrl.dispose();
    _phoneCtrl.dispose();
    _phoneCodeCtrl.dispose();
    _lastNameCtrl.dispose();
    _firstNameCtrl.dispose();
    _middleNameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadRoles() async {
    try {
      final resp = await Api.get('/roles/');
      if (resp.statusCode == 200 && mounted) {
        final body = jsonDecode(resp.body);
        final all = body is List ? body : body['results'] ?? [];
        // Filter assignable roles (exclude platform_admin)
        setState(() => _roles = all.where((r) => _roleIcons.containsKey(r['name'])).toList());
      }
    } catch (_) {}
  }

  // Step 1 — Email verification
  Future<void> _sendEmailCode() async {
    if (_emailCtrl.text.trim().isEmpty) return;
    setState(() { _emailSending = true; _error = null; });
    try {
      final resp = await Api.post('/auth/verify-email/', body: {'email': _emailCtrl.text.trim()});
      if (mounted) {
        if (resp.statusCode == 200 || resp.statusCode == 201) {
          setState(() { _emailCodeSent = true; _emailSending = false; });
        } else {
          final body = jsonDecode(resp.body);
          setState(() { _error = body['error']?['message'] ?? body['detail'] ?? 'Ошибка отправки'; _emailSending = false; });
        }
      }
    } catch (e) {
      if (mounted) setState(() { _error = 'Ошибка: $e'; _emailSending = false; });
    }
  }

  Future<void> _verifyEmailCode() async {
    if (_emailCodeCtrl.text.length != 6) return;
    setState(() { _loading = true; _error = null; });
    try {
      final resp = await Api.post('/auth/verify-email/confirm/', body: {'code': _emailCodeCtrl.text});
      if (mounted) {
        if (resp.statusCode == 200 || resp.statusCode == 201) {
          setState(() { _emailVerified = true; _step = 2; _loading = false; });
        } else {
          setState(() { _error = 'Неверный код'; _loading = false; });
        }
      }
    } catch (_) {
      if (mounted) setState(() { _error = 'Ошибка подтверждения'; _loading = false; });
    }
  }

  // Step 2 — Phone verification
  Future<void> _sendPhoneCode() async {
    final phone = '+998${_phoneCtrl.text.replaceAll(RegExp(r'[^0-9]'), '')}';
    if (phone.length < 13) return;
    setState(() { _phoneSending = true; _error = null; });
    try {
      final resp = await Api.post('/auth/verify-phone/', body: {'phone': phone});
      if (mounted) {
        if (resp.statusCode == 200 || resp.statusCode == 201) {
          setState(() { _phoneCodeSent = true; _phoneSending = false; });
        } else {
          final body = jsonDecode(resp.body);
          setState(() { _error = body['error']?['message'] ?? body['detail'] ?? 'Ошибка отправки'; _phoneSending = false; });
        }
      }
    } catch (e) {
      if (mounted) setState(() { _error = 'Ошибка: $e'; _phoneSending = false; });
    }
  }

  Future<void> _verifyPhoneCode() async {
    if (_phoneCodeCtrl.text.length != 6) return;
    setState(() { _loading = true; _error = null; });
    try {
      final resp = await Api.post('/auth/verify-phone/confirm/', body: {'code': _phoneCodeCtrl.text});
      if (mounted) {
        if (resp.statusCode == 200 || resp.statusCode == 201) {
          setState(() { _phoneVerified = true; _step = 3; _loading = false; });
        } else {
          setState(() { _error = 'Неверный код'; _loading = false; });
        }
      }
    } catch (_) {
      if (mounted) setState(() { _error = 'Ошибка подтверждения'; _loading = false; });
    }
  }

  // Step 3 — Create user
  Future<void> _createUser() async {
    final fullName = [_lastNameCtrl.text.trim(), _firstNameCtrl.text.trim(), _middleNameCtrl.text.trim()].where((s) => s.isNotEmpty).join(' ');
    if (fullName.isEmpty || _passwordCtrl.text.length < 8 || _roleId == null) return;

    setState(() { _loading = true; _error = null; });
    try {
      final phone = _phoneSkipped ? null : '+998${_phoneCtrl.text.replaceAll(RegExp(r'[^0-9]'), '')}';
      final body = {
        'email': _emailCtrl.text.trim(),
        'full_name': fullName,
        'password': _passwordCtrl.text,
        'role': _roleId,
        if (phone != null && phone.length >= 13) 'phone_number': phone,
      };

      final resp = await Api.post('/users/', body: body);
      if (!mounted) return;

      if (resp.statusCode == 201 || resp.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Пользователь создан'), backgroundColor: AppColors.success));
        Navigator.pop(context, true);
      } else {
        final errorBody = jsonDecode(resp.body);
        String errorMsg = '';
        if (errorBody is Map) {
          errorBody.forEach((key, value) {
            if (value is List) errorMsg += '${value.join(', ')}\n';
            else errorMsg += '$value\n';
          });
        }
        setState(() { _error = errorMsg.trim().isNotEmpty ? errorMsg.trim() : 'Ошибка создания'; _loading = false; });
      }
    } catch (e) {
      if (mounted) setState(() { _error = 'Ошибка: $e'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('DORMITORY'),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
      ),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const Text('Новый пользователь', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        const SizedBox(height: 16),

        // Stepper
        Row(children: [
          _stepBadge(1, 'Email', _emailVerified),
          _stepLine(),
          _stepBadge(2, 'Телефон', _phoneVerified || _phoneSkipped),
          _stepLine(),
          _stepBadge(3, 'Данные', false),
        ]),
        const SizedBox(height: 24),

        if (_step == 1) _buildEmailStep(),
        if (_step == 2) _buildPhoneStep(),
        if (_step == 3) _buildDetailsStep(),
      ]),
    );
  }

  Widget _stepBadge(int step, String label, bool done) {
    final active = _step == step;
    return Expanded(child: Row(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: 28, height: 28,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: done ? AppColors.success : active ? AppColors.accent : AppColors.card,
          border: Border.all(color: done ? AppColors.success : active ? AppColors.accent : AppColors.border),
        ),
        alignment: Alignment.center,
        child: done
            ? const Icon(Icons.check, color: Colors.white, size: 16)
            : Text('$step', style: TextStyle(color: active ? Colors.white : AppColors.textMuted, fontWeight: FontWeight.bold, fontSize: 12)),
      ),
      const SizedBox(width: 4),
      Flexible(child: Text(label, style: TextStyle(color: active ? AppColors.accent : AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis)),
    ]));
  }

  Widget _stepLine() => Container(width: 16, height: 1, color: AppColors.border, margin: const EdgeInsets.symmetric(horizontal: 2));

  // --- STEP 1: Email ---
  Widget _buildEmailStep() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _sectionTitle('Подтверждение Email'),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: TextField(
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
          enabled: !_emailVerified,
          decoration: const InputDecoration(hintText: 'user@example.com', labelText: 'Email'),
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
        )),
        const SizedBox(width: 8),
        SizedBox(
          height: 48,
          child: ElevatedButton.icon(
            onPressed: _emailSending || _emailVerified || _emailCtrl.text.isEmpty ? null : _sendEmailCode,
            icon: Icon(_emailCodeSent ? Icons.refresh : Icons.send, size: 16),
            label: Text(_emailSending ? '...' : _emailCodeSent ? 'Ещё раз' : 'Отправить', style: const TextStyle(fontSize: 12)),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.accent,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
          ),
        ),
      ]),
      if (_emailCodeSent) ...[
        const SizedBox(height: 4),
        const Text('Код отправлен на почту', style: TextStyle(color: AppColors.success, fontSize: 11)),
      ],
      const SizedBox(height: 16),
      const Text('ВВЕДИТЕ КОД', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
      const SizedBox(height: 6),
      TextField(
        controller: _emailCodeCtrl,
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 12, color: AppColors.textPrimary),
        decoration: const InputDecoration(hintText: '000000', hintStyle: TextStyle(color: AppColors.textMuted, letterSpacing: 12)),
      ),
      if (_error != null) _errorBox(),
      const SizedBox(height: 20),
      SizedBox(width: double.infinity, height: 50, child: ElevatedButton(
        onPressed: _loading || _emailCodeCtrl.text.length != 6 ? null : _verifyEmailCode,
        child: _loading
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : const Text('Подтвердить', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
      )),
    ]);
  }

  // --- STEP 2: Phone ---
  Widget _buildPhoneStep() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      _sectionTitle('Подтверждение телефона'),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: TextField(
          controller: _phoneCtrl,
          keyboardType: TextInputType.phone,
          enabled: !_phoneVerified,
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9 ]')), _PhoneFormatter()],
          decoration: const InputDecoration(
            hintText: 'XX XXX XX XX',
            labelText: 'Телефон',
            prefixText: '+998 ',
            prefixStyle: TextStyle(color: AppColors.textPrimary, fontSize: 14),
          ),
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
        )),
        const SizedBox(width: 8),
        SizedBox(
          height: 48,
          child: ElevatedButton.icon(
            onPressed: _phoneSending || _phoneVerified ? null : _sendPhoneCode,
            icon: Icon(_phoneCodeSent ? Icons.refresh : Icons.send, size: 16),
            label: Text(_phoneSending ? '...' : _phoneCodeSent ? 'Ещё раз' : 'Отправить', style: const TextStyle(fontSize: 12)),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.accent, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 12)),
          ),
        ),
      ]),
      if (_phoneCodeSent) ...[
        const SizedBox(height: 4),
        const Text('Код отправлен в Telegram', style: TextStyle(color: AppColors.success, fontSize: 11)),
      ],
      const SizedBox(height: 16),
      const Text('ВВЕДИТЕ КОД', style: TextStyle(color: AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
      const SizedBox(height: 6),
      TextField(
        controller: _phoneCodeCtrl,
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 12, color: AppColors.textPrimary),
        decoration: const InputDecoration(hintText: '000000', hintStyle: TextStyle(color: AppColors.textMuted, letterSpacing: 12)),
      ),
      if (_error != null) _errorBox(),
      const SizedBox(height: 20),
      SizedBox(width: double.infinity, height: 50, child: ElevatedButton(
        onPressed: _loading || _phoneCodeCtrl.text.length != 6 ? null : _verifyPhoneCode,
        child: _loading
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : const Text('Подтвердить', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
      )),
      const SizedBox(height: 12),
      Center(child: GestureDetector(
        onTap: () => setState(() { _phoneSkipped = true; _step = 3; _error = null; }),
        child: const Text('Пропустить', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
      )),
    ]);
  }

  // --- STEP 3: Details ---
  Widget _buildDetailsStep() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      // Verified info
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(10), border: Border.all(color: AppColors.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Icon(Icons.check_circle, color: AppColors.success, size: 16),
            const SizedBox(width: 6),
            Text(_emailCtrl.text, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
          ]),
          if (_phoneVerified) ...[
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.check_circle, color: AppColors.success, size: 16),
              const SizedBox(width: 6),
              Text('+998 ${_phoneCtrl.text}', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
            ]),
          ],
          if (_phoneSkipped) ...[
            const SizedBox(height: 4),
            const Row(children: [
              Icon(Icons.info_outline, color: AppColors.warning, size: 16),
              SizedBox(width: 6),
              Text('Телефон: пропущен', style: TextStyle(fontSize: 12, color: AppColors.warning)),
            ]),
          ],
        ]),
      ),
      const SizedBox(height: 20),

      _sectionTitle('Личные данные'),
      const SizedBox(height: 12),
      TextFormField(controller: _lastNameCtrl, decoration: const InputDecoration(labelText: 'Фамилия *'), style: const TextStyle(color: AppColors.textPrimary, fontSize: 14)),
      const SizedBox(height: 10),
      TextFormField(controller: _firstNameCtrl, decoration: const InputDecoration(labelText: 'Имя *'), style: const TextStyle(color: AppColors.textPrimary, fontSize: 14)),
      const SizedBox(height: 10),
      TextFormField(controller: _middleNameCtrl, decoration: const InputDecoration(labelText: 'Отчество'), style: const TextStyle(color: AppColors.textPrimary, fontSize: 14)),
      const SizedBox(height: 10),
      TextFormField(
        controller: _passwordCtrl,
        obscureText: !_showPassword,
        decoration: InputDecoration(
          labelText: 'Пароль * (мин. 8 символов)',
          suffixIcon: IconButton(
            icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility, color: AppColors.textMuted, size: 20),
            onPressed: () => setState(() => _showPassword = !_showPassword),
          ),
        ),
        style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
      ),
      const SizedBox(height: 20),

      _sectionTitle('Роль'),
      const SizedBox(height: 12),
      if (_roles.isEmpty)
        const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(color: AppColors.accent, strokeWidth: 2)))
      else
        Wrap(spacing: 8, runSpacing: 8, children: _roles.map((r) {
          final id = r['id'] as int;
          final name = r['name'] ?? '';
          final label = _roleLabels[name] ?? name;
          final icon = _roleIcons[name] ?? Icons.person_outline;
          final selected = _roleId == id;
          return GestureDetector(
            onTap: () => setState(() => _roleId = id),
            child: Container(
              width: (MediaQuery.of(context).size.width - 48) / 2,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: selected ? AppColors.accent.withAlpha(15) : AppColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: selected ? AppColors.accent : AppColors.border),
              ),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Icon(icon, color: selected ? AppColors.accent : AppColors.textMuted, size: 22),
                const SizedBox(height: 6),
                Text(label, style: TextStyle(color: selected ? AppColors.accent : AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
              ]),
            ),
          );
        }).toList()),
      if (_error != null) _errorBox(),
      const SizedBox(height: 24),

      SizedBox(width: double.infinity, height: 50, child: ElevatedButton(
        onPressed: _loading || _lastNameCtrl.text.isEmpty || _firstNameCtrl.text.isEmpty || _passwordCtrl.text.length < 8 || _roleId == null ? null : _createUser,
        child: _loading
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : const Text('Создать пользователя', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
      )),
      const SizedBox(height: 24),
    ]);
  }

  Widget _errorBox() {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: AppColors.danger.withAlpha(15), borderRadius: BorderRadius.circular(8)),
        child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12), textAlign: TextAlign.center),
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
