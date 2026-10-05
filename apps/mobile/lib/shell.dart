import 'package:flutter/material.dart';
import 'core/api.dart';
import 'core/session.dart';
import 'core/theme.dart';
import 'screens/academics_screen.dart';
import 'screens/change_room_screen.dart';
import 'screens/complaints_screen.dart';
import 'screens/deposit_screen.dart';
import 'screens/electricity_screen.dart';
import 'screens/fees_screen.dart';
import 'screens/health_screen.dart';
import 'screens/home_screen.dart';
import 'screens/meal_choice_screen.dart';
import 'screens/mess_menu_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/outings_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/rate_meals_screen.dart';
import 'screens/repairs_screen.dart';
import 'screens/room_screen.dart';
import 'screens/sick_leave_screen.dart';

/// One place in the app: its menu label, icon, menu group (as in the web portal's side menu) and page.
class Place {
  final String key;
  final String label;
  final IconData icon;
  final String group;
  final Widget Function() page;
  const Place(this.key, this.label, this.icon, this.group, this.page);
}

final places = <Place>[
  Place('home', 'Home', Icons.home_rounded, '', () => const HomeScreen()),
  Place('room', 'Room and registration', Icons.bed_rounded, 'My stay', () => const RoomScreen()),
  Place('fees', 'Fees and receipts', Icons.receipt_long_rounded, 'My stay', () => const FeesScreen()),
  Place('electricity', 'Electricity', Icons.bolt_rounded, 'My stay', () => const ElectricityScreen()),
  Place('deposit', 'Caution deposit', Icons.verified_user_rounded, 'My stay', () => const DepositScreen()),
  Place('change_room', 'Change room', Icons.swap_horiz_rounded, 'My stay', () => const ChangeRoomScreen()),
  Place('repairs', 'Repairs', Icons.build_rounded, 'My stay', () => const RepairsScreen()),
  Place('mess_menu', 'Mess menu', Icons.restaurant_menu_rounded, 'Mess', () => const MessMenuScreen()),
  Place('meal_choice', 'Choose my meals', Icons.soup_kitchen_rounded, 'Mess', () => const MealChoiceScreen()),
  Place('rate_meals', 'Rate my meals', Icons.star_rounded, 'Mess', () => const RateMealsScreen()),
  Place('outings', 'Outings', Icons.door_front_door_rounded, 'Daily life', () => const OutingsScreen()),
  Place('sick_leave', 'Sick leave', Icons.healing_rounded, 'Daily life', () => const SickLeaveScreen()),
  Place('complaints', 'Complaints', Icons.feedback_rounded, 'Daily life', () => const ComplaintsScreen()),
  Place('academics', 'Academic record', Icons.school_rounded, 'Me', () => const AcademicsScreen()),
  Place('health', 'My health', Icons.monitor_heart_rounded, 'Me', () => const HealthScreen()),
  Place('notifications', 'Notifications', Icons.notifications_rounded, 'Me', () => const NotificationsScreen()),
  Place('profile', 'Profile', Icons.person_rounded, 'Me', () => const ProfileScreen()),
];
Place placeOf(String key) => places.firstWhere((p) => p.key == key);

/// The four pages most used, on the bottom bar; everything else from the menu.
const tabs = ['home', 'outings', 'fees', 'repairs'];

/// Opens a place: a bottom-bar page switches tab, anything else opens as its own page.
void openPlace(BuildContext context, String key) {
  final shell = context.findAncestorStateOfType<ShellState>();
  if (tabs.contains(key) && shell != null) { shell.select(tabs.indexOf(key)); return; }
  final p = placeOf(key);
  Navigator.of(context).push(MaterialPageRoute(builder: (_) => Scaffold(appBar: AppBar(title: Text(p.label)), body: p.page())));
}

class Shell extends StatefulWidget {
  const Shell({super.key});
  @override
  State<Shell> createState() => ShellState();
}

class ShellState extends State<Shell> {
  int index = 0;
  final _pages = <int, Widget>{};
  void select(int i) => setState(() => index = i);

  @override
  Widget build(BuildContext context) {
    final p = placeOf(tabs[index]);
    _pages.putIfAbsent(index, p.page);
    return Scaffold(
      appBar: AppBar(title: Text(index == 0 ? 'KL Hostels' : p.label), actions: [
        IconButton(tooltip: 'Notifications', icon: const Icon(Icons.notifications_none_rounded), onPressed: () => openPlace(context, 'notifications')),
      ]),
      drawer: const _Menu(),
      body: IndexedStack(index: index, children: List.generate(tabs.length, (i) => _pages[i] ?? const SizedBox.shrink())),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: select,
        destinations: [for (final k in tabs) NavigationDestination(icon: Icon(placeOf(k).icon), label: k == 'home' ? 'Home' : placeOf(k).label.split(' ').first)],
      ),
    );
  }
}

class _Menu extends StatelessWidget {
  const _Menu();
  @override
  Widget build(BuildContext context) {
    final s = SessionStore.instance.current!;
    String? group;
    final items = <Widget>[];
    for (final p in places) {
      if (p.group != group && p.group.isNotEmpty) {
        group = p.group;
        items.add(Padding(padding: const EdgeInsets.fromLTRB(20, 16, 20, 6), child: Text(p.group.toUpperCase(), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: K.ink3, letterSpacing: 1))));
      }
      items.add(ListTile(dense: true, leading: Icon(p.icon, color: K.ink2), title: Text(p.label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14.5)),
          onTap: () { Navigator.of(context).pop(); openPlace(context, p.key); }));
    }
    return Drawer(child: SafeArea(child: Column(children: [
      Container(
        width: double.infinity, margin: const EdgeInsets.all(12), padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(gradient: K.heroGradient, borderRadius: BorderRadius.circular(18)),
        child: Row(children: [
          CircleAvatar(backgroundColor: Colors.white24, child: Text(s.name.isEmpty ? '?' : s.name.trim().split(' ').map((w) => w[0]).take(2).join(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(s.name.isEmpty ? s.id : s.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16), overflow: TextOverflow.ellipsis),
            Text(s.id, style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ])),
        ]),
      ),
      Expanded(child: ListView(padding: EdgeInsets.zero, children: items)),
      const Divider(),
      ListTile(leading: const Icon(Icons.logout_rounded, color: K.ink2), title: const Text('Sign out', style: TextStyle(fontWeight: FontWeight.w600)),
          onTap: () async { Navigator.of(context).pop(); await SessionStore.instance.signOut(); }),
    ])));
  }
}

/// Used by screens that need the student's ID for an address (fees, profile).
String get me => SessionStore.instance.current!.id;
Api get api => Api.instance;
