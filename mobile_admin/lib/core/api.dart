import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class Api {
  // Change this to your server URL
  static const baseUrl = 'http://10.0.2.2:8000/api/v1'; // Android emulator
  // static const baseUrl = 'http://localhost:8000/api/v1'; // iOS simulator
  // static const baseUrl = 'https://yourdomain.com/api/v1'; // Production

  static const _storage = FlutterSecureStorage();

  static Future<String?> get accessToken => _storage.read(key: 'access_token');
  static Future<String?> get refreshToken => _storage.read(key: 'refresh_token');

  static Future<void> saveTokens(String access, String refresh) async {
    await _storage.write(key: 'access_token', value: access);
    await _storage.write(key: 'refresh_token', value: refresh);
  }

  static Future<void> clearTokens() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }

  static Future<Map<String, String>> _headers() async {
    final token = await accessToken;
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<http.Response> _handleAuth(http.Response response, Future<http.Response> Function() retry) async {
    if (response.statusCode == 401) {
      final refresh = await refreshToken;
      if (refresh != null) {
        final refreshResp = await http.post(
          Uri.parse('$baseUrl/auth/refresh/'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'refresh': refresh}),
        );
        if (refreshResp.statusCode == 200) {
          final data = jsonDecode(refreshResp.body);
          await _storage.write(key: 'access_token', value: data['access']);
          return retry();
        }
      }
      await clearTokens();
    }
    return response;
  }

  static Future<http.Response> get(String path, {Map<String, String>? params}) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: params);
    final resp = await http.get(uri, headers: await _headers());
    return _handleAuth(resp, () => get(path, params: params));
  }

  static Future<http.Response> post(String path, {dynamic body}) async {
    final resp = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleAuth(resp, () => post(path, body: body));
  }

  static Future<http.Response> patch(String path, {dynamic body}) async {
    final resp = await http.patch(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleAuth(resp, () => patch(path, body: body));
  }

  static Future<http.Response> delete(String path) async {
    final resp = await http.delete(Uri.parse('$baseUrl$path'), headers: await _headers());
    return _handleAuth(resp, () => delete(path));
  }

  // Auth
  static Future<Map<String, dynamic>?> login(String email, String password) async {
    final resp = await http.post(
      Uri.parse('$baseUrl/auth/login/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (resp.statusCode == 200) {
      final data = jsonDecode(resp.body);
      await saveTokens(data['access'], data['refresh']);
      return data;
    }
    return null;
  }

  static Future<Map<String, dynamic>?> phoneLoginRequest(String phone) async {
    final resp = await http.post(
      Uri.parse('$baseUrl/auth/login/phone/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone}),
    );
    if (resp.statusCode == 200) return jsonDecode(resp.body);
    return null;
  }

  static Future<Map<String, dynamic>?> phoneLoginConfirm(String phone, String code) async {
    final resp = await http.post(
      Uri.parse('$baseUrl/auth/login/phone/confirm/'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone, 'code': code}),
    );
    if (resp.statusCode == 200) {
      final data = jsonDecode(resp.body);
      await saveTokens(data['access'], data['refresh']);
      return data;
    }
    return null;
  }

  static Future<Map<String, dynamic>?> me() async {
    final resp = await get('/auth/me/');
    if (resp.statusCode == 200) return jsonDecode(resp.body);
    return null;
  }
}
