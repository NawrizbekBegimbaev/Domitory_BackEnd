import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/auth_provider.dart';
import '../../core/api.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController(text: '+998');
  final _otpCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _error;
  bool _otpSent = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _loginEmail() async {
    setState(() { _loading = true; _error = null; });
    try {
      final auth = context.read<AuthProvider>();
      final success = await auth.loginEmail(_emailCtrl.text, _passwordCtrl.text);
      if (!success && mounted) {
        setState(() { _error = 'Неверный email или пароль'; _loading = false; });
      }
    } catch (e) {
      if (mounted) setState(() { _error = 'Ошибка сети: $e'; _loading = false; });
    }
  }

  void _showForgotPassword() {
    final resetEmailCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) {
        bool sending = false;
        String? dialogError;
        return StatefulBuilder(
          builder: (ctx, setDialogState) => AlertDialog(
            backgroundColor: AppColors.card,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Text('Восстановление пароля', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            content: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text(
                'Введите email, указанный при регистрации. Мы отправим инструкции по сбросу пароля.',
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: resetEmailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(hintText: 'admin@dormitory.edu'),
              ),
              if (dialogError != null) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: AppColors.danger.withAlpha(20), borderRadius: BorderRadius.circular(8)),
                  child: Text(dialogError!, style: const TextStyle(color: AppColors.danger, fontSize: 12), textAlign: TextAlign.center),
                ),
              ],
            ]),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Отмена'),
              ),
              ElevatedButton(
                onPressed: sending
                    ? null
                    : () async {
                        final email = resetEmailCtrl.text.trim();
                        if (email.isEmpty) {
                          setDialogState(() => dialogError = 'Введите email');
                          return;
                        }
                        setDialogState(() { sending = true; dialogError = null; });
                        try {
                          final resp = await Api.post('/auth/password-reset/', body: {'email': email});
                          if (!ctx.mounted) return;
                          if (resp.statusCode == 200 || resp.statusCode == 204) {
                            Navigator.pop(ctx);
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Инструкции отправлены на email'),
                                  backgroundColor: AppColors.success,
                                ),
                              );
                            }
                          } else {
                            String msg;
                            try {
                              final body = jsonDecode(resp.body);
                              msg = body['error']?['message'] ?? body['detail'] ?? 'Ошибка отправки';
                            } catch (_) {
                              msg = 'Ошибка ${resp.statusCode}';
                            }
                            setDialogState(() { sending = false; dialogError = msg; });
                          }
                        } catch (e) {
                          setDialogState(() { sending = false; dialogError = 'Ошибка сети: $e'; });
                        }
                      },
                child: sending
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Отправить'),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _sendOtp() async {
    setState(() { _loading = true; _error = null; });
    try {
      final auth = context.read<AuthProvider>();
      final ok = await auth.loginPhoneRequest(_phoneCtrl.text.replaceAll(' ', ''));
      if (mounted) {
        setState(() {
          _loading = false;
          if (ok) { _otpSent = true; } else { _error = 'Номер не найден или Telegram не привязан'; }
        });
      }
    } catch (e) {
      if (mounted) setState(() { _error = 'Ошибка сети: $e'; _loading = false; });
    }
  }

  Future<void> _confirmOtp() async {
    setState(() { _loading = true; _error = null; });
    try {
      final auth = context.read<AuthProvider>();
      final ok = await auth.loginPhoneConfirm(_phoneCtrl.text.replaceAll(' ', ''), _otpCtrl.text);
      if (!ok && mounted) {
        setState(() { _error = 'Неверный код'; _loading = false; });
      }
    } catch (e) {
      if (mounted) setState(() { _error = 'Ошибка сети: $e'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                // Brand
                const Text('EDormitory', style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold, color: AppColors.accent, letterSpacing: 0.5)),
                const SizedBox(height: 2),
                const Text('by Naurizbek', style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
                const SizedBox(height: 32),

                // Tabs
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(25),
                  ),
                  child: TabBar(
                    controller: _tabController,
                    indicator: BoxDecoration(
                      color: AppColors.accent,
                      borderRadius: BorderRadius.circular(25),
                    ),
                    indicatorSize: TabBarIndicatorSize.tab,
                    labelColor: Colors.white,
                    unselectedLabelColor: AppColors.textMuted,
                    labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    dividerHeight: 0,
                    tabs: const [Tab(text: 'По Email'), Tab(text: 'По номеру')],
                  ),
                ),
                const SizedBox(height: 24),

                // Form card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: SizedBox(
                    height: 280,
                    child: TabBarView(
                      controller: _tabController,
                      children: [
                        _buildEmailForm(),
                        _buildPhoneForm(),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),
                const Text('Только для сотрудников университета', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmailForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('EMAIL', style: TextStyle(color: AppColors.accent, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 1)),
        const SizedBox(height: 8),
        TextField(
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(hintText: 'admin@dormitory.edu'),
        ),
        const SizedBox(height: 16),
        const Text('ПАРОЛЬ', style: TextStyle(color: AppColors.accent, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 1)),
        const SizedBox(height: 8),
        TextField(
          controller: _passwordCtrl,
          obscureText: _obscure,
          decoration: InputDecoration(
            hintText: '••••••••',
            suffixIcon: IconButton(
              icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility, color: AppColors.textMuted, size: 20),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.danger.withAlpha(20), borderRadius: BorderRadius.circular(8)),
            child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12), textAlign: TextAlign.center),
          ),
        ],
        const Spacer(),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _loginEmail,
            child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Войти'),
          ),
        ),
        const SizedBox(height: 8),
        Center(child: TextButton(onPressed: _showForgotPassword, child: const Text('Забыли пароль?', style: TextStyle(fontSize: 13)))),
      ],
    );
  }

  Widget _buildPhoneForm() {
    if (_otpSent) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Код отправлен в Telegram', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          const SizedBox(height: 16),
          const Text('КОД', style: TextStyle(color: AppColors.accent, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 1)),
          const SizedBox(height: 8),
          TextField(
            controller: _otpCtrl,
            keyboardType: TextInputType.number,
            maxLength: 6,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, letterSpacing: 8),
            decoration: const InputDecoration(hintText: '000000', counterText: ''),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.danger.withAlpha(20), borderRadius: BorderRadius.circular(8)),
              child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12), textAlign: TextAlign.center),
            ),
          ],
          const Spacer(),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading ? null : _confirmOtp,
              child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Войти'),
            ),
          ),
          Center(child: TextButton(onPressed: () => setState(() { _otpSent = false; _otpCtrl.clear(); }), child: const Text('Назад'))),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('ТЕЛЕФОН', style: TextStyle(color: AppColors.accent, fontSize: 11, fontWeight: FontWeight.w600, letterSpacing: 1)),
        const SizedBox(height: 8),
        TextField(
          controller: _phoneCtrl,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(hintText: '+998 XX XXX XX XX'),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: AppColors.danger.withAlpha(20), borderRadius: BorderRadius.circular(8)),
            child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontSize: 12), textAlign: TextAlign.center),
          ),
        ],
        const Spacer(),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _sendOtp,
            child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Отправить код'),
          ),
        ),
      ],
    );
  }
}
