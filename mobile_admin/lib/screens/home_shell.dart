import 'package:flutter/material.dart';
import '../core/theme.dart';
import 'dashboard/dashboard_screen.dart';
import 'residents/residents_screen.dart';
import 'rooms/rooms_screen.dart';
import 'finance/finance_screen.dart';
import 'menu/menu_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _currentIndex = 0;

  final _screens = const [
    DashboardScreen(),
    ResidentsScreen(),
    RoomsScreen(),
    FinanceScreen(),
    MenuScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _screens),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: AppColors.border, width: 0.5)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (i) {
            if (i != _currentIndex) {
              setState(() => _currentIndex = i);
            }
          },
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.dashboard_outlined), activeIcon: Icon(Icons.dashboard), label: 'Главная'),
            BottomNavigationBarItem(icon: Icon(Icons.people_outline), activeIcon: Icon(Icons.people), label: 'Жильцы'),
            BottomNavigationBarItem(icon: Icon(Icons.door_front_door_outlined), activeIcon: Icon(Icons.door_front_door), label: 'Комнаты'),
            BottomNavigationBarItem(icon: Icon(Icons.wallet_outlined), activeIcon: Icon(Icons.wallet), label: 'Финансы'),
            BottomNavigationBarItem(icon: Icon(Icons.menu), activeIcon: Icon(Icons.menu), label: 'Меню'),
          ],
        ),
      ),
    );
  }
}
