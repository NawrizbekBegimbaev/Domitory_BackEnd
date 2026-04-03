import 'dart:convert';

class HttpLogEntry {
  final DateTime timestamp;
  final String method;
  final String url;
  final int? statusCode;
  final String? requestBody;
  final String? responseBody;
  final int durationMs;
  final String? error;

  HttpLogEntry({
    required this.timestamp,
    required this.method,
    required this.url,
    this.statusCode,
    this.requestBody,
    this.responseBody,
    required this.durationMs,
    this.error,
  });

  bool get isSuccess => statusCode != null && statusCode! >= 200 && statusCode! < 300;
  bool get isError => statusCode != null && statusCode! >= 400 || error != null;

  String get shortUrl {
    try {
      final uri = Uri.parse(url);
      final path = uri.path.replaceAll('/api/v1', '');
      final query = uri.query.isNotEmpty ? '?${uri.query}' : '';
      return '$path$query';
    } catch (_) {
      return url;
    }
  }

  String? get prettyRequestBody {
    if (requestBody == null || requestBody!.isEmpty) return null;
    try {
      return const JsonEncoder.withIndent('  ').convert(jsonDecode(requestBody!));
    } catch (_) {
      return requestBody;
    }
  }

  String? get prettyResponseBody {
    if (responseBody == null || responseBody!.isEmpty) return null;
    try {
      final decoded = jsonDecode(responseBody!);
      return const JsonEncoder.withIndent('  ').convert(decoded);
    } catch (_) {
      return responseBody!.length > 2000 ? '${responseBody!.substring(0, 2000)}...' : responseBody;
    }
  }
}

class HttpLogger {
  static final HttpLogger _instance = HttpLogger._();
  static HttpLogger get instance => _instance;
  HttpLogger._();

  final List<HttpLogEntry> _logs = [];
  static const _maxLogs = 200;

  List<HttpLogEntry> get logs => List.unmodifiable(_logs);

  void log(HttpLogEntry entry) {
    _logs.insert(0, entry);
    if (_logs.length > _maxLogs) _logs.removeLast();
  }

  void clear() => _logs.clear();
}
