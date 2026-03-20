import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../core/api.dart';
import 'add_resident_screen.dart';
import 'resident_detail_screen.dart';

class ResidentsScreen extends StatefulWidget {
  const ResidentsScreen({super.key});

  @override
  State<ResidentsScreen> createState() => _ResidentsScreenState();
}

class _ResidentsScreenState extends State<ResidentsScreen> {
  List<dynamic> _residents = [];
  String _statusFilter = '';
  String _search = '';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final params = <String, String>{'page_size': '50'};
    if (_statusFilter.isNotEmpty) params['status'] = _statusFilter;
    if (_search.isNotEmpty) params['search'] = _search;
    final resp = await Api.get('/residents/', params: params);
    if (resp.statusCode == 200 && mounted) {
      setState(() { _residents = jsonDecode(resp.body)['results'] ?? []; _loading = false; });
    } else {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tabs = ['', 'pending', 'active', 'evicted', 'graduated'];
    final tabLabels = ['Все', 'Ожидающие', 'Активные', 'Выселенные', 'Выпустились'];

    return Scaffold(
      appBar: AppBar(title: const Text('DORMITORY')),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
          child: Row(children: [
            const Text('Жильцы', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const Spacer(),
            Text('${_residents.length}', style: const TextStyle(color: AppColors.textMuted)),
          ]),
        ),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: TextField(
            onChanged: (v) { _search = v; _load(); },
            decoration: const InputDecoration(hintText: 'Поиск по имени или ID...', prefixIcon: Icon(Icons.search, color: AppColors.textMuted, size: 20)),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 36,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: tabs.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final active = _statusFilter == tabs[i];
              return GestureDetector(
                onTap: () { _statusFilter = tabs[i]; _load(); },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(color: active ? AppColors.accent : AppColors.card, borderRadius: BorderRadius.circular(20), border: Border.all(color: active ? AppColors.accent : AppColors.border)),
                  alignment: Alignment.center,
                  child: Text(tabLabels[i], style: TextStyle(color: active ? Colors.white : AppColors.textSecondary, fontSize: 12, fontWeight: FontWeight.w500)),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        Expanded(
          child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.accent))
            : RefreshIndicator(color: AppColors.accent, onRefresh: _load, child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _residents.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) => _card(_residents[i]),
              )),
        ),
      ]),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.accent,
        onPressed: () async {
          final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddResidentScreen()));
          if (result == true) _load();
        },
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _card(dynamic r) {
    final status = r['status'] ?? '';
    final color = status == 'active' ? AppColors.success : status == 'pending' ? AppColors.warning : status == 'evicted' ? AppColors.danger : Colors.blue;
    return GestureDetector(
      onTap: () {
        final id = r['id']?.toString();
        if (id != null && id.isNotEmpty) {
          Navigator.push(context, MaterialPageRoute(builder: (_) => ResidentDetailScreen(residentId: id)));
        }
      },
      child: Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border)),
      child: Row(children: [
        CircleAvatar(radius: 22, backgroundColor: AppColors.accent.withAlpha(25),
          backgroundImage: r['photo'] != null && r['photo'].toString().isNotEmpty ? NetworkImage(r['photo']) : null,
          child: r['photo'] == null || r['photo'].toString().isEmpty ? Text((r['full_name'] ?? '?')[0], style: const TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold)) : null),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(r['full_name'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 2),
          Text('#${r['university_id'] ?? ''} · ${r['faculty'] ?? ''}', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(color: color.withAlpha(20), borderRadius: BorderRadius.circular(12)),
          child: Text(status, style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w700)),
        ),
        const Icon(Icons.chevron_right, color: AppColors.textMuted, size: 20),
      ]),
    ),
    );
  }
}
