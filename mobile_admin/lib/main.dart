import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'core/theme.dart';
import 'core/auth_provider.dart';
import 'screens/login/login_screen.dart';
import 'screens/home_shell.dart';
import 'screens/dev/dev_tools_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthProvider()..init(),
      child: const DormitoryApp(),
    ),
  );
}

class DormitoryApp extends StatefulWidget {
  const DormitoryApp({super.key});

  @override
  State<DormitoryApp> createState() => _DormitoryAppState();
}

class _DormitoryAppState extends State<DormitoryApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  StreamSubscription? _accelSub;
  DateTime _lastShake = DateTime(2000);
  bool _devToolsOpen = false;

  @override
  void initState() {
    super.initState();
    _initShakeDetector();
  }

  void _initShakeDetector() {
    try {
      _accelSub = accelerometerEventStream(
        samplingPeriod: const Duration(milliseconds: 200),
      ).listen((event) {
        final g = sqrt(event.x * event.x + event.y * event.y + event.z * event.z);
        if (g > 25) {
          final now = DateTime.now();
          if (now.difference(_lastShake).inMilliseconds > 1500) {
            _lastShake = now;
            _openDevTools();
          }
        }
      }, onError: (_) {});
    } catch (_) {
      // Sensor not available — ignore
    }
  }

  void _openDevTools() {
    if (_devToolsOpen) return;
    _devToolsOpen = true;
    _navigatorKey.currentState?.push(
      MaterialPageRoute(builder: (_) => const DevToolsScreen()),
    ).then((_) => _devToolsOpen = false);
  }

  @override
  void dispose() {
    _accelSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: _navigatorKey,
      title: 'EDormitory Admin',
      debugShowCheckedModeBanner: false,
      theme: darkTheme,
      home: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          if (auth.loading) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator(color: AppColors.accent)),
            );
          }
          return auth.isLoggedIn ? const HomeShell() : const LoginScreen();
        },
      ),
    );
  }
}
