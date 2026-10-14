import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/api.dart';
import 'core/session.dart';
import 'core/theme.dart';
import 'core/widgets.dart';
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

/// One place in the app: its menu label, icon, menu group and page, in the order of the web portal's side menu.
class Place {
  final String key;
  final String label;
  final IconData icon;
  final String group;
  final Widget Function() page;
  const Place(this.key, this.label, this.icon, this.group, this.page);
}

final places = <Place>[
  Place('home', 'Home', LucideIcons.house, '', () => const HomeScreen()),
  Place('room', 'Room and registration', LucideIcons.bedDouble, 'My stay', () => const RoomScreen()),
  Place('change_room', 'Change room', LucideIcons.arrowLeftRight, 'My stay', () => const ChangeRoomScreen()),
  Place('fees', 'Fees and receipts', LucideIcons.receipt, 'My stay', () => const FeesScreen()),
  Place('electricity', 'Electricity', LucideIcons.zap, 'My stay', () => const ElectricityScreen()),
  Place('deposit', 'Caution deposit', LucideIcons.shieldCheck, 'My stay', () => const DepositScreen()),
  Place('repairs', 'Repairs', LucideIcons.wrench, 'My stay', () => const RepairsScreen()),
  Place('mess_menu', 'Mess menu', LucideIcons.utensils, 'Mess', () => const MessMenuScreen()),
  Place('meal_choice', 'Choose my meals', LucideIcons.chefHat, 'Mess', () => const MealChoiceScreen()),
  Place('rate_meals', 'Rate my meals', LucideIcons.star, 'Mess', () => const RateMealsScreen()),
  Place('outings', 'Outings', LucideIcons.doorOpen, 'Daily life', () => const OutingsScreen()),
  Place('sick_leave', 'Sick leave', LucideIcons.heartPulse, 'Daily life', () => const SickLeaveScreen()),
  Place('complaints', 'Complaints', LucideIcons.messageSquareWarning, 'Daily life', () => const ComplaintsScreen()),
  Place('academics', 'Academic record', LucideIcons.graduationCap, 'Me', () => const AcademicsScreen()),
  Place('health', 'My health', LucideIcons.heartPulse, 'Me', () => const HealthScreen()),
  Place('notifications', 'Notifications', LucideIcons.bell, 'Me', () => const NotificationsScreen()),
  Place('profile', 'Profile', LucideIcons.userRound, 'Me', () => const ProfileScreen()),
];
Place placeOf(String key) => places.firstWhere((p) => p.key == key);

/// The four places on the bottom bar (web BOTTOM); Menu opens the side menu.
const tabs = ['home', 'outings', 'fees', 'repairs'];

/// Opens a place inside the frame, as the web does: the top bar and bottom bar stay, the page changes.
void openPlace(BuildContext context, String key) => context.findAncestorStateOfType<ShellState>()?.open(key);

class Shell extends StatefulWidget {
  const Shell({super.key});
  @override
  State<Shell> createState() => ShellState();
}

class ShellState extends State<Shell> {
  final _scaffold = GlobalKey<ScaffoldState>();
  final _tabPages = <String, Widget>{};
  /// Pages opened from the menu, newest last; a bottom-bar place clears them.
  final _stack = <String>[];
  String _tab = 'home';
  int unread = 0;
  String? bed;
  String? name;

  String get current => _stack.isEmpty ? _tab : _stack.last;

  @override
  void initState() { super.initState(); refreshFrame(); }

  /// The unread count on the bell, and the name and bed on the menu card.
  Future<void> refreshFrame() async {
    try {
      final r = await Future.wait([Api.instance.get('/notifications'), Api.instance.get('/me/room').catchError((_) => null), Api.instance.get('/students/$me').catchError((_) => null)]);
      if (!mounted) return;
      setState(() {
        unread = ((r[0] as List?) ?? []).where((n) => n['delivery_status'] != 'Read').length;
        bed = (r[1] as Map?)?['bed_label'];
        name = (r[2] as Map?)?['full_name'];
      });
    } catch (_) {/* the frame works without them */}
  }

  void open(String key) {
    _scaffold.currentState?.closeDrawer();
    setState(() {
      if (tabs.contains(key)) { _tab = key; _stack.clear(); } else { _stack.remove(key); _stack.add(key); }
    });
    if (key == 'notifications') Future.delayed(const Duration(seconds: 2), refreshFrame);
  }

  bool _back() {
    if (_stack.isNotEmpty) { setState(_stack.removeLast); return true; }
    if (_tab != 'home') { setState(() => _tab = 'home'); return true; }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    _tabPages.putIfAbsent(_tab, placeOf(_tab).page);
    final top = _stack.isEmpty ? null : _stack.last;
    return AnnotatedRegion<SystemUiOverlayStyle>(value: SystemUiOverlayStyle.dark, child: PopScope(
      canPop: _stack.isEmpty && _tab == 'home',
      onPopInvokedWithResult: (didPop, _) { if (!didPop) _back(); },
      child: Scaffold(
        key: _scaffold,
        backgroundColor: K.ground,
        drawer: _SideMenu(shell: this),
        drawerScrimColor: const Color(0x73101828),
        body: Column(children: [
          _TopBar(shell: this, back: top != null),
          Expanded(child: Stack(children: [
            Offstage(offstage: top != null, child: IndexedStack(index: tabs.indexOf(_tab), children: [for (final t in tabs) _tabPages[t] ?? const SizedBox.shrink()])),
            if (top != null) KeyedSubtree(key: ValueKey(top), child: placeOf(top).page()),
            const Positioned(left: 0, right: 0, bottom: 0, height: 22, child: IgnorePointer(child: DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0x00F4F6FA), K.ground]))))),
            if (!['home', 'outings'].contains(current)) Positioned(right: 14, bottom: 16, child: _OutingFab(onTap: () => open('outings'))),
          ])),
        ]),
        bottomNavigationBar: _BottomBar(shell: this),
      ),
    ));
  }
}

/// The phone top bar (sn-bar): menu or back, the KL mark with "KL Residencies", the bell with its red dot.
class _TopBar extends StatelessWidget {
  final ShellState shell;
  final bool back;
  const _TopBar({required this.shell, required this.back});
  @override
  Widget build(BuildContext context) => ClipRect(child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8), child: Container(
        padding: EdgeInsets.fromLTRB(10, MediaQuery.of(context).padding.top + 6, 10, 6),
        decoration: const BoxDecoration(color: Color(0xEEFFFFFF), border: Border(bottom: BorderSide(color: Color(0xFFE8ECF2)))),
        child: Row(children: [
          back ? _FrameIcon(LucideIcons.chevronLeft, 'Back', shell._back) : _FrameIcon(LucideIcons.menu, 'Open menu', () => shell._scaffold.currentState?.openDrawer()),
          Expanded(child: Center(child: InkWell(onTap: () => shell.open('home'), borderRadius: BorderRadius.circular(8), child: Row(mainAxisSize: MainAxisSize.min, children: [
            const KlLogo(height: 26), const SizedBox(width: 8),
            const Text('KL Residencies', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF1D2939))),
          ])))),
          _FrameIcon(LucideIcons.bell, shell.unread > 0 ? 'Notifications, ${shell.unread} unread' : 'Notifications', () => shell.open('notifications'), size: 19, dot: shell.unread > 0),
        ]),
      )));
}

class _FrameIcon extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final double size;
  final bool dot;
  const _FrameIcon(this.icon, this.label, this.onTap, {this.size = 20, this.dot = false});
  @override
  Widget build(BuildContext context) => Semantics(button: true, label: label, child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(12), child: SizedBox(width: 40, height: 40, child: Stack(children: [
        Center(child: Icon(icon, size: size, color: const Color(0xFF475467))),
        if (dot) Positioned(top: 9, right: 10, child: Container(width: 8, height: 8, decoration: BoxDecoration(color: K.red, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)))),
      ]))));
}

/// The bottom bar (sn-bottom): four places and Menu; the current one teal with a tinted pill behind its icon.
class _BottomBar extends StatelessWidget {
  final ShellState shell;
  const _BottomBar({required this.shell});
  @override
  Widget build(BuildContext context) {
    final safe = MediaQuery.of(context).padding.bottom;
    // a floating bar: a white capsule lifted off the page, clear of the screen edges and the home indicator
    return Container(
      color: K.ground,
      padding: EdgeInsets.fromLTRB(14, 2, 14, safe > 0 ? safe - 6 : 12),
      child: Container(
        height: 66,
        padding: const EdgeInsets.symmetric(horizontal: 6),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(26), border: Border.all(color: const Color(0xFFE6ECEB)),
            boxShadow: const [BoxShadow(color: Color(0x29101828), blurRadius: 28, spreadRadius: -8, offset: Offset(0, 14)), BoxShadow(color: Color(0x0F101828), blurRadius: 6, offset: Offset(0, 2))]),
        child: Row(children: [
          for (final k in tabs) _item(placeOf(k).icon, k == 'fees' ? 'Fees' : placeOf(k).label, shell.current == k, () => shell.open(k)),
          _item(LucideIcons.menu, 'Menu', false, () => shell._scaffold.currentState?.openDrawer(), dot: shell.unread > 0),
        ]),
      ),
    );
  }

  Widget _item(IconData icon, String label, bool on, VoidCallback tap, {bool dot = false}) => Expanded(child: Semantics(selected: on, button: true, child: InkWell(
      onTap: tap, borderRadius: BorderRadius.circular(20),
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Stack(clipBehavior: Clip.none, alignment: Alignment.center, children: [
          AnimatedContainer(duration: const Duration(milliseconds: 220), curve: Curves.easeOutCubic, width: on ? 52 : 32, height: 30, alignment: Alignment.center,
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(999),
                  gradient: on ? const LinearGradient(colors: [Color(0xFF0E8F84), Color(0xFF0A5F6E)], begin: Alignment.topLeft, end: Alignment.bottomRight) : null,
                  boxShadow: on ? const [BoxShadow(color: Color(0x520B7A71), blurRadius: 12, spreadRadius: -3, offset: Offset(0, 6))] : null),
              child: Icon(icon, size: 19, color: on ? Colors.white : K.ink3)),
          if (dot) Positioned(top: 2, right: 2, child: Container(width: 9, height: 9, decoration: BoxDecoration(color: K.red, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 1.5)))),
        ]),
        const SizedBox(height: 4),
        Text(label, style: TextStyle(fontSize: 11, height: 1, fontWeight: on ? FontWeight.w800 : FontWeight.w600, color: on ? K.brand : K.ink3)),
      ]))));
}

/// The side menu (sn-side): logo, the teal card with the student, groups of places, Sign out at the foot.
class _SideMenu extends StatelessWidget {
  final ShellState shell;
  const _SideMenu({required this.shell});
  @override
  Widget build(BuildContext context) {
    final s = SessionStore.instance.current!;
    final name = titleCase(shell.name ?? s.name.split(',').first);
    final initials = name.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).take(2).map((w) => w[0]).join().toUpperCase();
    final groups = <String, List<Place>>{};
    for (final p in places) { groups.putIfAbsent(p.group, () => []).add(p); }
    return Drawer(
      width: MediaQuery.of(context).size.width * .86 > 300 ? 300 : MediaQuery.of(context).size.width * .86,
      backgroundColor: Colors.white, surfaceTintColor: Colors.transparent,
      shape: const RoundedRectangleBorder(),
      child: SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(0, 14, 0, 14), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(padding: const EdgeInsets.fromLTRB(16, 2, 16, 6), child: Row(children: [
          Expanded(child: InkWell(onTap: () => shell.open('home'), child: const Row(children: [
            KlLogo(height: 30), SizedBox(width: 10),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('KL Residencies', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF1D2939), height: 1.15)),
              Text('STUDENT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: K.brand, letterSpacing: .66, height: 1.15)),
            ]),
          ]))),
          _FrameIcon(LucideIcons.x, 'Close menu', () => Navigator.of(context).pop(), size: 18),
        ])),
        const SizedBox(height: 10),
        Padding(padding: const EdgeInsets.symmetric(horizontal: 12), child: InkWell(onTap: () => shell.open('profile'), borderRadius: BorderRadius.circular(14), child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(gradient: K.primaryGradient, borderRadius: BorderRadius.circular(14)),
          child: Row(children: [
            Container(width: 40, height: 40, alignment: Alignment.center,
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: .18), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withValues(alpha: .55), width: 2)),
                child: Text(initials, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14))),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 13.5, fontWeight: FontWeight.w700)),
              Text(shell.bed ?? s.id, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.white.withValues(alpha: .82), fontSize: 11.5)),
            ])),
          ]),
        ))),
        const SizedBox(height: 10),
        // side padding inside the list, so the current page's teal edge at -12 px is not clipped
        Expanded(child: ListView(padding: const EdgeInsets.symmetric(horizontal: 12), children: [
          for (final g in groups.entries) Padding(padding: const EdgeInsets.only(bottom: 10), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (g.key.isNotEmpty) Padding(padding: const EdgeInsets.fromLTRB(10, 6, 10, 4),
                child: Text(g.key.toUpperCase(), style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800, color: K.ink3, letterSpacing: .84))),
            for (final p in g.value) _MenuItem(p.icon, p.label, shell.current == p.key, () => shell.open(p.key), badge: p.key == 'notifications' ? shell.unread : 0),
          ])),
        ])),
        Container(margin: const EdgeInsets.symmetric(horizontal: 12), padding: const EdgeInsets.only(top: 8), decoration: const BoxDecoration(border: Border(top: BorderSide(color: Color(0xFFE8ECF2)))),
            child: _MenuItem(LucideIcons.logOut, 'Sign out', false, () async { Navigator.of(context).pop(); await SessionStore.instance.signOut(); })),
      ]))),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool on;
  final VoidCallback onTap;
  final int badge;
  const _MenuItem(this.icon, this.label, this.on, this.onTap, {this.badge = 0});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 2), child: Stack(clipBehavior: Clip.none, children: [
        Material(color: on ? K.brandTint : Colors.transparent, borderRadius: BorderRadius.circular(10), child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(10), child: Container(
          constraints: const BoxConstraints(minHeight: 40), padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Row(children: [
            Icon(icon, size: 18, color: on ? K.brand : K.ink3), const SizedBox(width: 12),
            Expanded(child: Text(label, style: TextStyle(fontSize: 13.5, fontWeight: on ? FontWeight.w700 : FontWeight.w600, color: on ? K.brand : const Color(0xFF475467)))),
            if (badge > 0) Container(constraints: const BoxConstraints(minWidth: 20), padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(color: K.red, borderRadius: BorderRadius.circular(999)),
                child: Text(badge > 99 ? '99+' : '$badge', textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800))),
          ]),
        ))),
        if (on) Positioned(left: -12, top: 8, bottom: 8, child: Container(width: 3, decoration: const BoxDecoration(color: K.brand, borderRadius: BorderRadius.horizontal(right: Radius.circular(3))))),
      ]));
}

/// Ask for an outing from any page without its own button (st-fab): a violet pill above the bottom bar.
class _OutingFab extends StatelessWidget {
  final VoidCallback onTap;
  const _OutingFab({required this.onTap});
  @override
  Widget build(BuildContext context) => Container(
        height: 44,
        decoration: BoxDecoration(gradient: Mod.violet.grad, borderRadius: BorderRadius.circular(999), boxShadow: const [BoxShadow(color: Color(0x995932D1), blurRadius: 24, spreadRadius: -10, offset: Offset(0, 12))]),
        child: Material(type: MaterialType.transparency, child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(999), child: const Padding(padding: EdgeInsets.symmetric(horizontal: 15),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(LucideIcons.doorOpen, size: 18, color: Colors.white), SizedBox(width: 8),
              Text('Ask for outing', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14)),
            ])))),
      );
}

/// Used by screens that need the student's ID for an address (fees, profile).
String get me => SessionStore.instance.current!.id;
Api get api => Api.instance;
