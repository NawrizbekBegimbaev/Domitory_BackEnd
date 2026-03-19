import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme.dart';
import 'core/auth_provider.dart';
import 'screens/login/login_screen.dart';
import 'screens/home_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthProvider()..init(),
      child: const DormitoryApp(),
    ),
  );
}

class DormitoryApp extends StatelessWidget {
  const DormitoryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Dormitory Admin',
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
