import 'package:flutter/material.dart';
import 'api.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _user;
  bool _loading = true;

  Map<String, dynamic>? get user => _user;
  bool get loading => _loading;
  bool get isLoggedIn => _user != null;
  String get roleName => _user?['role']?['name'] ?? '';

  Future<void> init() async {
    _loading = true;
    notifyListeners();
    final token = await Api.accessToken;
    if (token != null) {
      _user = await Api.me();
    }
    _loading = false;
    notifyListeners();
  }

  Future<bool> loginEmail(String email, String password) async {
    final result = await Api.login(email, password);
    if (result != null) {
      _user = await Api.me();
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<bool> loginPhoneRequest(String phone) async {
    final result = await Api.phoneLoginRequest(phone);
    return result != null;
  }

  Future<bool> loginPhoneConfirm(String phone, String code) async {
    final result = await Api.phoneLoginConfirm(phone, code);
    if (result != null) {
      _user = await Api.me();
      notifyListeners();
      return true;
    }
    return false;
  }

  Future<void> logout() async {
    await Api.clearTokens();
    _user = null;
    notifyListeners();
  }
}
