import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'http_logger.dart';

class Api {
  // Change this to your server URL
  // static const baseUrl = 'http://172.20.10.9:8000/api/v1'; // Local network
  // static const baseUrl = 'http://localhost:8000/api/v1'; // iOS simulator
  static const baseUrl = 'https://begimbaev-dormitory.uk/api/v1'; // Production

  static Future<String?> get accessToken async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('access_token');
  }

  static Future<String?> get refreshToken async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('refresh_token');
  }

  static Future<void> saveTokens(String access, String refresh) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('access_token', access);
    await prefs.setString('refresh_token', refresh);
  }

  static Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('refresh_token');
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
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('access_token', data['access']);
          return retry();
        }
      }
      await clearTokens();
    }
    return response;
  }

  static Future<http.Response> _logged(String method, Uri uri, Future<http.Response> Function() fn, {String? reqBody}) async {
    final sw = Stopwatch()..start();
    try {
      final resp = await fn();
      sw.stop();
      HttpLogger.instance.log(HttpLogEntry(
        timestamp: DateTime.now(), method: method, url: uri.toString(),
        statusCode: resp.statusCode, requestBody: reqBody,
        responseBody: resp.body.length <= 5000 ? resp.body : '${resp.body.substring(0, 5000)}...', durationMs: sw.elapsedMilliseconds,
      ));
      return resp;
    } catch (e) {
      sw.stop();
      HttpLogger.instance.log(HttpLogEntry(
        timestamp: DateTime.now(), method: method, url: uri.toString(),
        requestBody: reqBody, durationMs: sw.elapsedMilliseconds, error: e.toString(),
      ));
      rethrow;
    }
  }

  static Future<http.Response> get(String path, {Map<String, String>? params}) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: params);
    final h = await _headers();
    final resp = await _logged('GET', uri, () => http.get(uri, headers: h));
    return _handleAuth(resp, () => get(path, params: params));
  }

  static Future<http.Response> post(String path, {dynamic body}) async {
    final uri = Uri.parse('$baseUrl$path');
    final h = await _headers();
    final encoded = body != null ? jsonEncode(body) : null;
    final resp = await _logged('POST', uri, () => http.post(uri, headers: h, body: encoded), reqBody: encoded);
    return _handleAuth(resp, () => post(path, body: body));
  }

  static Future<http.Response> patch(String path, {dynamic body}) async {
    final uri = Uri.parse('$baseUrl$path');
    final h = await _headers();
    final encoded = body != null ? jsonEncode(body) : null;
    final resp = await _logged('PATCH', uri, () => http.patch(uri, headers: h, body: encoded), reqBody: encoded);
    return _handleAuth(resp, () => patch(path, body: body));
  }

  static Future<http.Response> delete(String path) async {
    final uri = Uri.parse('$baseUrl$path');
    final h = await _headers();
    final resp = await _logged('DELETE', uri, () => http.delete(uri, headers: h));
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

  static Future<http.StreamedResponse> multipart(String path, {Map<String, String>? fields, String? filePath, String fileField = 'file'}) async {
    final uri = Uri.parse('$baseUrl$path');
    final request = http.MultipartRequest('POST', uri);
    final token = await accessToken;
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    if (fields != null) request.fields.addAll(fields);
    if (filePath != null) {
      request.files.add(await http.MultipartFile.fromPath(fileField, filePath));
    }
    return request.send();
  }

  static Future<Map<String, dynamic>?> me() async {
    final resp = await get('/auth/me/');
    if (resp.statusCode == 200) return jsonDecode(resp.body);
    return null;
  }
}
