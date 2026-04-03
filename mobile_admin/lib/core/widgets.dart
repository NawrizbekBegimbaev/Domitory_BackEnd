import 'package:flutter/material.dart';
import 'theme.dart';

class AjouAppBar extends StatelessWidget implements PreferredSizeWidget {
  final List<Widget>? actions;
  final Widget? leading;
  const AjouAppBar({super.key, this.actions, this.leading});

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      leading: leading,
      title: Row(mainAxisSize: MainAxisSize.min, children: [
        Image.asset('assets/ajou_logo.png', height: 32),
        const SizedBox(width: 10),
        const Text('DORMITORY', style: TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 2)),
      ]),
      actions: actions,
    );
  }
}

/// Standard card decoration with shadow for white theme
BoxDecoration cardDecoration({Color? color, Color? borderColor}) {
  return BoxDecoration(
    color: color ?? AppColors.card,
    borderRadius: BorderRadius.circular(14),
    border: Border.all(color: borderColor ?? AppColors.border, width: 0.5),
    boxShadow: [BoxShadow(color: Colors.black.withAlpha(8), blurRadius: 8, offset: const Offset(0, 2))],
  );
}

class ResidentAvatar extends StatelessWidget {
  final String? photoUrl;
  final String name;
  final double radius;

  const ResidentAvatar({super.key, this.photoUrl, required this.name, this.radius = 20});

  @override
  Widget build(BuildContext context) {
    final hasPhoto = photoUrl != null && photoUrl!.isNotEmpty;
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';
    return CircleAvatar(
      radius: radius,
      backgroundColor: AppColors.accent.withAlpha(25),
      backgroundImage: hasPhoto ? NetworkImage(photoUrl!) : null,
      child: hasPhoto ? null : Text(initial, style: TextStyle(color: AppColors.accent, fontWeight: FontWeight.bold, fontSize: radius * 0.65)),
    );
  }
}
