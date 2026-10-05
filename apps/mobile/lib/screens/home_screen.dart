import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

/// Home: who and where you are, what needs doing (dues, an outing, sick leave), and today's meals.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic> d = {};
  bool loading = true;

  @override
  void initState() { super.initState(); load(); }

  Future<dynamic> _try(String path) async { try { return await Api.instance.get(path); } catch (_) { return null; } }

  Future<void> load() async {
    final r = await Future.wait([_try('/students/$me'), _try('/me/room'), _try('/students/$me/demands'), _try('/outpasses/mine'), _try('/sick-leaves/mine'), _try('/me/menu')]);
    if (!mounted) return;
    setState(() { d = {'student': r[0], 'room': r[1], 'dues': r[2], 'outings': r[3], 'sick': r[4], 'menu': r[5]}; loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    final student = d['student'] as Map?;
    final room = d['room'] as Map?;
    final demands = ((d['dues'] as Map?)?['demands'] as List?) ?? [];
    final open = demands.where((x) => ['Pending', 'Part_Paid', 'Overdue'].contains(x['status'])).toList();
    final due = open.fold<num>(0, (a, x) => a + (num.tryParse('${x['amount_due']}') ?? 0) - (num.tryParse('${x['amount_paid']}') ?? 0));
    final overdue = open.any((x) => x['status'] == 'Overdue');
    final outing = ((d['outings'] as List?) ?? []).cast<Map>().where((o) => ['Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved', 'Approved', 'Out'].contains(o['status'])).firstOrNull;
    final sick = ((d['sick'] as List?) ?? []).cast<Map>().where((l) => ['Applied', 'Recommended', 'Approved'].contains(l['status'])).firstOrNull;
    final today = (d['menu'] as Map?)?['today'] ?? DateTime.now().weekday;
    final meals = (((d['menu'] as Map?)?['items'] as List?) ?? []).cast<Map>().where((m) => m['day_no'] == today).toList();
    final name = titleCase(student?['full_name'] ?? '');

    return RefreshIndicator(onRefresh: load, child: PageList(children: [
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(gradient: K.heroGradient, borderRadius: BorderRadius.circular(22)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Hello${name.isEmpty ? '' : ', ${name.split(' ').first}'}', style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(room == null ? 'No room yet: register for a hostel in Room and registration.' : '${room['hostel_name']} · ${room['bed_label']} · ${room['type_name']}',
              style: const TextStyle(color: Colors.white70)),
          const SizedBox(height: 16),
          Wrap(spacing: 8, runSpacing: 8, children: [
            _Quick('Ask for outing', Icons.door_front_door_rounded, () => openPlace(context, 'outings')),
            _Quick('Report sick', Icons.healing_rounded, () => openPlace(context, 'sick_leave')),
            _Quick('Report a problem', Icons.build_rounded, () => openPlace(context, 'repairs')),
            _Quick('Choose meals', Icons.soup_kitchen_rounded, () => openPlace(context, 'meal_choice')),
          ]),
        ]),
      ),
      KCard(
        title: due > 0 ? '${inr(due)} to pay' : 'Nothing to pay',
        subtitle: due > 0 ? '${open.length} due${open.length == 1 ? '' : 's'}${overdue ? ', some overdue' : ''}' : 'All your fees are paid',
        icon: Icons.receipt_long_rounded,
        trailing: due > 0 ? Pill(overdue ? 'Overdue' : 'Due', tone: overdue ? Tone.bad : Tone.warn) : const Pill('Paid', tone: Tone.good),
        onTap: () => openPlace(context, 'fees'),
        child: const Text('Open Fees and receipts to pay or download receipts.', style: TextStyle(color: K.ink3, fontSize: 13)),
      ),
      if (outing != null)
        KCard(title: 'Outing to ${outing['destination']}', subtitle: '${dayTime(outing['leave_from'])} to ${dayTime(outing['return_by'])}', icon: Icons.door_front_door_rounded,
            trailing: Pill(words(outing['status']), tone: outing['status'] == 'Approved' ? Tone.good : Tone.warn), onTap: () => openPlace(context, 'outings'),
            child: Text(outing['status'] == 'Approved' ? 'Show the QR code at the gate.' : 'Waiting for approval.', style: const TextStyle(color: K.ink3, fontSize: 13))),
      if (sick != null)
        KCard(title: 'Sick leave', subtitle: '${day(sick['from_date'])} to ${day(sick['to_date'])}', icon: Icons.healing_rounded,
            trailing: Pill(words(sick['status']), tone: Pill.toneOf(sick['status'])), onTap: () => openPlace(context, 'sick_leave'),
            child: Text(sick['status'] == 'Approved' ? 'Meals are coming to your room.' : 'Your wardens are looking at it.', style: const TextStyle(color: K.ink3, fontSize: 13))),
      KCard(
        title: "Today's meals", subtitle: (d['menu'] as Map?)?['me']?['menu_title'], icon: Icons.restaurant_menu_rounded, onTap: () => openPlace(context, 'mess_menu'),
        child: meals.isEmpty ? const Text('No menu for today.', style: TextStyle(color: K.ink3))
            : Column(children: [for (final m in meals) Padding(padding: const EdgeInsets.symmetric(vertical: 6), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                SizedBox(width: 92, child: Text(words(m['meal']) == 'Evening Snacks' ? 'Snacks' : words(m['meal']), style: const TextStyle(fontWeight: FontWeight.w700))),
                Expanded(child: Text('${m['dishes'] ?? ''}', style: const TextStyle(color: K.ink2, fontSize: 13.5))),
              ]))]),
      ),
    ]));
  }
}

class _Quick extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  const _Quick(this.label, this.icon, this.onTap);
  @override
  Widget build(BuildContext context) => Material(color: Colors.white.withValues(alpha: .14), borderRadius: BorderRadius.circular(999), child: InkWell(
      borderRadius: BorderRadius.circular(999), onTap: onTap,
      child: Padding(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8), child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 16, color: Colors.white), const SizedBox(width: 6), Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
      ]))));
}
