import 'package:flutter/material.dart';
import '../../core/theme.dart';

class FinanceScreen extends StatelessWidget {
  const FinanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('DORMITORY')),
      body: const Center(child: Text('Финансы — в разработке', style: TextStyle(color: AppColors.textMuted))),
    );
  }
}
