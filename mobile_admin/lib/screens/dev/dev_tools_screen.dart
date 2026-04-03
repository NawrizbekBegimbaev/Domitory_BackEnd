import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme.dart';
import '../../core/http_logger.dart';

class DevToolsScreen extends StatefulWidget {
  const DevToolsScreen({super.key});

  @override
  State<DevToolsScreen> createState() => _DevToolsScreenState();
}

class _DevToolsScreenState extends State<DevToolsScreen> {
  String _filter = ''; // '', 'success', 'error'

  List<HttpLogEntry> get _filteredLogs {
    final logs = HttpLogger.instance.logs;
    if (_filter == 'success') return logs.where((l) => l.isSuccess).toList();
    if (_filter == 'error') return logs.where((l) => l.isError).toList();
    return logs;
  }

  @override
  Widget build(BuildContext context) {
    final logs = _filteredLogs;
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        title: Row(children: [
          const Icon(Icons.bug_report, color: AppColors.accent, size: 20),
          const SizedBox(width: 8),
          const Text('Dev Tools', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const Spacer(),
          Text('${logs.length}', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
        ]),
        leading: IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline, size: 20),
            onPressed: () {
              HttpLogger.instance.clear();
              setState(() {});
            },
          ),
        ],
      ),
      body: Column(children: [
        // Filter tabs
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(children: [
            _filterChip('Все', ''),
            const SizedBox(width: 6),
            _filterChip('OK', 'success'),
            const SizedBox(width: 6),
            _filterChip('Ошибки', 'error'),
          ]),
        ),
        // Log list
        Expanded(
          child: logs.isEmpty
              ? const Center(child: Text('Нет запросов', style: TextStyle(color: AppColors.textMuted)))
              : ListView.builder(
                  itemCount: logs.length,
                  itemBuilder: (_, i) => _logTile(logs[i]),
                ),
        ),
      ]),
    );
  }

  Widget _filterChip(String label, String value) {
    final active = _filter == value;
    return GestureDetector(
      onTap: () => setState(() => _filter = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: active ? AppColors.accent : AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: active ? AppColors.accent : AppColors.border),
        ),
        child: Text(label, style: TextStyle(color: active ? Colors.white : AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _logTile(HttpLogEntry log) {
    final methodColor = log.method == 'GET'
        ? Colors.green
        : log.method == 'POST'
            ? Colors.blue
            : log.method == 'PATCH'
                ? Colors.orange
                : log.method == 'DELETE'
                    ? Colors.red
                    : AppColors.textMuted;

    final statusColor = log.statusCode == null
        ? AppColors.danger
        : log.statusCode! < 300
            ? AppColors.success
            : log.statusCode! < 400
                ? AppColors.warning
                : AppColors.danger;

    return GestureDetector(
      onTap: () => _showLogDetail(log),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFF1A1A1A)))),
        child: Row(children: [
          // Method badge
          Container(
            width: 46,
            padding: const EdgeInsets.symmetric(vertical: 3),
            decoration: BoxDecoration(color: methodColor.withAlpha(20), borderRadius: BorderRadius.circular(4)),
            alignment: Alignment.center,
            child: Text(log.method, style: TextStyle(color: methodColor, fontSize: 9, fontWeight: FontWeight.w800, fontFamily: 'monospace')),
          ),
          const SizedBox(width: 8),
          // URL + time
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(log.shortUrl, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Text(
              '${log.timestamp.hour.toString().padLeft(2, '0')}:${log.timestamp.minute.toString().padLeft(2, '0')}:${log.timestamp.second.toString().padLeft(2, '0')} · ${log.durationMs}ms',
              style: const TextStyle(color: AppColors.textMuted, fontSize: 9, fontFamily: 'monospace'),
            ),
          ])),
          // Status
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: statusColor.withAlpha(20), borderRadius: BorderRadius.circular(4)),
            child: Text(
              log.error != null ? 'ERR' : '${log.statusCode ?? '?'}',
              style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w700, fontFamily: 'monospace'),
            ),
          ),
        ]),
      ),
    );
  }

  void _showLogDetail(HttpLogEntry log) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => _LogDetailScreen(log: log)));
  }
}

class _LogDetailScreen extends StatelessWidget {
  final HttpLogEntry log;
  const _LogDetailScreen({required this.log});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        title: Text('${log.method} ${log.statusCode ?? 'ERR'}', style: const TextStyle(fontSize: 14, fontFamily: 'monospace')),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => Navigator.pop(context)),
        actions: [
          IconButton(
            icon: const Icon(Icons.copy, size: 18),
            onPressed: () {
              final text = 'URL: ${log.url}\nMethod: ${log.method}\nStatus: ${log.statusCode}\nDuration: ${log.durationMs}ms\n\nRequest:\n${log.prettyRequestBody ?? '-'}\n\nResponse:\n${log.prettyResponseBody ?? '-'}';
              Clipboard.setData(ClipboardData(text: text));
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Скопировано'), duration: Duration(seconds: 1)));
            },
          ),
        ],
      ),
      body: ListView(padding: const EdgeInsets.all(12), children: [
        _section('URL', log.url),
        _section('Метод', log.method),
        _section('Статус', '${log.statusCode ?? 'Ошибка'}'),
        _section('Время', '${log.durationMs} мс'),
        _section('Время запроса', '${log.timestamp.hour.toString().padLeft(2, '0')}:${log.timestamp.minute.toString().padLeft(2, '0')}:${log.timestamp.second.toString().padLeft(2, '0')}.${log.timestamp.millisecond}'),
        if (log.error != null) _section('Ошибка', log.error!),
        if (log.prettyRequestBody != null) _codeSection('Request Body', log.prettyRequestBody!),
        if (log.prettyResponseBody != null) _codeSection('Response Body', log.prettyResponseBody!),
      ]),
    );
  }

  Widget _section(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 80, child: Text(label, style: const TextStyle(color: AppColors.textMuted, fontSize: 11))),
        Expanded(child: Text(value, style: const TextStyle(fontSize: 12, fontFamily: 'monospace'))),
      ]),
    );
  }

  Widget _codeSection(String label, String code) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(color: AppColors.accent, fontSize: 11, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: AppColors.card2, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
          child: SelectableText(code, style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: AppColors.textPrimary, height: 1.4)),
        ),
      ]),
    );
  }
}
