import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';

const _week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const _slots = [
  ('Breakfast', 'Breakfast', Icons.coffee_rounded),
  ('Lunch', 'Lunch', Icons.restaurant_rounded),
  ('Evening_Snacks', 'Evening snacks', Icons.cookie_rounded),
  ('Dinner', 'Dinner', Icons.soup_kitchen_rounded),
];
const _food = {'South': 'South Indian', 'North': 'North Indian', 'International': 'My country'};
String _foodName(String? region, String? country) => region == 'International' ? '$country food' : (_food[region] ?? '');
String _diet(String? d) => d == 'Veg' ? 'Veg' : 'Non-veg';

/// Withdraw a pending change of food (DELETE /me/food).
Future<void> _withdrawChange() => Api.instance.delete('/me/food');

/// MES-01 for a student: this week's menu for their group, and the weekly change of food (applies from next Monday;
/// until then it can be changed again or withdrawn).
class MessMenuScreen extends StatefulWidget {
  const MessMenuScreen({super.key});
  @override
  State<MessMenuScreen> createState() => _MessMenuScreenState();
}

class _MessMenuScreenState extends State<MessMenuScreen> {
  String week = 'this';
  int? sel;
  bool withdrawing = false;

  @override
  Widget build(BuildContext context) => ApiView(path: '/me/menu', builder: (context, data, reload) {
        final d = data as Map;
        final me = d['me'] as Map?;
        if (me == null) {
          return const PageList(children: [EmptyView(icon: Icons.restaurant_menu_rounded, title: 'Mess menu',
              body: 'Your menu appears here once you live in a hostel and have a mess subscription.')]);
        }
        final pending = me['pending_change_id'] != null;
        final showNext = week == 'next' && pending;
        final items = ((showNext ? d['next_items'] : d['items']) as List? ?? []).cast<Map>();
        final today = d['today'] as int?;
        final dayNo = sel ?? (showNext ? 1 : today ?? 1);
        String? meal(String slot) => items.where((i) => i['day_no'] == dayNo && i['meal'] == slot).firstOrNull?['dishes'];

        return PageList(children: [
          KCard(
            title: 'Mess menu', subtitle: me['mess_name'] ?? me['hostel_code'], icon: Icons.restaurant_menu_rounded,
            child: Wrap(spacing: 8, runSpacing: 8, children: [
              Pill('${me['hostel_gender']} hostel', tone: Tone.muted),
              Pill(me['is_foreign'] == true ? 'Foreign student' : 'Local student', tone: Tone.muted),
              Pill(_foodName(me['region'], me['country'])),
              Pill(_diet(me['diet']), tone: me['diet'] == 'Veg' ? Tone.good : Tone.bad),
            ]),
          ),
          if (pending)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: K.warnBg, borderRadius: BorderRadius.circular(16), border: Border.all(color: K.warn.withValues(alpha: .25))),
              child: Row(children: [
                const Icon(Icons.event_repeat_rounded, color: K.warn), const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('From Monday ${day(me['change_from'])}: ${_foodName(me['next_region'], me['next_country'])}, ${_diet(me['next_diet']).toLowerCase()}',
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                  const Text('You can change it again or withdraw it until Sunday night.', style: TextStyle(color: K.ink3, fontSize: 12.5)),
                ])),
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: withdrawing ? null : () async {
                    setState(() => withdrawing = true);
                    final ok = await act(context, _withdrawChange, 'Change withdrawn; your food stays the same');
                    if (!mounted) return;
                    setState(() { withdrawing = false; if (ok) { week = 'this'; sel = null; } });
                    if (ok) await reload();
                  },
                  child: withdrawing ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Withdraw'),
                ),
              ]),
            ),
          KCard(
            title: showNext ? 'From Monday ${day(me['change_from'])}' : 'This week', icon: Icons.calendar_view_week_rounded,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (pending) Padding(padding: const EdgeInsets.only(bottom: 10), child: Wrap(spacing: 8, children: [
                    for (final (k, l) in [('this', 'This week'), ('next', 'Next week')])
                      ChoiceChip(label: Text(l), selected: week == k, selectedColor: K.brand, showCheckmark: false,
                          labelStyle: TextStyle(color: week == k ? Colors.white : K.ink, fontWeight: FontWeight.w700),
                          onSelected: (_) => setState(() { week = k; sel = null; })),
                  ])),
              SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [
                for (var i = 1; i <= 7; i++) Padding(padding: const EdgeInsets.only(right: 6), child: _DayChip(
                      name: _week[i - 1].substring(0, 3), note: !showNext && i == today ? 'Today' : null, selected: dayNo == i,
                      onTap: () => setState(() => sel = i))),
              ])),
              const SizedBox(height: 12),
              Text('${_week[dayNo - 1]}${!showNext && dayNo == today ? ' (today)' : ''}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
              const SizedBox(height: 4),
              if (items.isEmpty)
                const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Text('There is no approved menu for this group yet. The hostel office prepares it.', style: TextStyle(color: K.ink3)))
              else
                for (final (id, label, icon) in _slots) Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Container(width: 32, height: 32, decoration: BoxDecoration(color: K.brandTint, borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 17, color: K.brand)),
                      const SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
                        Text(meal(id) ?? 'Not set', style: const TextStyle(color: K.ink2, fontSize: 13.5)),
                      ])),
                    ])),
            ]),
          ),
          _FoodChoice(key: ValueKey('${me['next_region']}|${me['next_diet']}|${me['next_country']}|${me['pending_change_id']}'), m: d,
              onDone: () async { setState(() { week = 'next'; sel = null; }); await reload(); }),
        ]);
      });
}

class _DayChip extends StatelessWidget {
  final String name;
  final String? note;
  final bool selected;
  final VoidCallback onTap;
  const _DayChip({required this.name, this.note, required this.selected, required this.onTap});
  @override
  Widget build(BuildContext context) => Material(
      color: selected ? K.brand : Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: selected ? K.brand : (note != null ? K.brand.withValues(alpha: .5) : K.line))),
      child: InkWell(borderRadius: BorderRadius.circular(14), onTap: onTap, child: SizedBox(width: 54, height: 52, child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(name, style: TextStyle(fontWeight: FontWeight.w800, color: selected ? Colors.white : K.ink)),
        if (note != null) Text(note!, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: selected ? Colors.white70 : K.brand)),
      ]))));
}

/// Change my food: South / North Indian (or My country, where allowed), Veg or Non-veg, from next Monday.
class _FoodChoice extends StatefulWidget {
  final Map m;
  final Future<void> Function() onDone;
  const _FoodChoice({super.key, required this.m, required this.onDone});
  @override
  State<_FoodChoice> createState() => _FoodChoiceState();
}

class _FoodChoiceState extends State<_FoodChoice> {
  late Map me = widget.m['me'] as Map;
  late List<String> countries = ((widget.m['countries'] as List?) ?? []).map((e) => '$e').toList();
  late String region = me['next_region'] ?? me['region'];
  late String diet = me['next_diet'] ?? me['diet'];
  late String countryPick = me['next_country'] ?? me['country'] ?? (countries.isEmpty ? '' : countries.first);
  bool busy = false;

  Widget _chip(String label, bool on, VoidCallback tap) => ChoiceChip(label: Text(label), selected: on, selectedColor: K.brand, showCheckmark: false,
      labelStyle: TextStyle(color: on ? Colors.white : K.ink, fontWeight: FontWeight.w700), onSelected: (_) => tap());

  @override
  Widget build(BuildContext context) {
    final nextMonday = day(widget.m['next_monday']);
    final country = region == 'International' ? countryPick : null;
    final unchanged = region == me['next_region'] && diet == me['next_diet'] && country == (me['next_region'] == 'International' ? me['next_country'] : null);
    final backToNow = region == me['region'] && diet == me['diet'] && country == (me['region'] == 'International' ? me['country'] : null);
    final needsCountry = region == 'International' && (country ?? '').isEmpty;
    final options = [('South', 'South Indian'), ('North', 'North Indian'), if (me['international_allowed'] == true) ('International', 'My country')];
    final blocked = unchanged ? 'Choose a different food or diet.' : needsCountry ? 'Choose the country.' : null;

    return KCard(
      title: 'Change my food', icon: Icons.swap_horiz_rounded,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Every week you can change your food. A change applies from Monday $nextMonday, so the mess can plan.', style: const TextStyle(color: K.ink3, fontSize: 13)),
        const SizedBox(height: 10),
        InfoRow('Hostel', '${me['hostel_gender']}'),
        InfoRow('Student', me['is_foreign'] == true ? 'Foreign' : 'Local'),
        const SizedBox(height: 8),
        const Text('Food', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        Wrap(spacing: 8, runSpacing: 8, children: [for (final (v, l) in options) _chip(l, region == v, () => setState(() => region = v))]),
        if (me['is_foreign'] != true) const Padding(padding: EdgeInsets.only(top: 6), child: Text('Food by country is for foreign students and apartment residents.', style: TextStyle(color: K.ink3, fontSize: 12))),
        if (region == 'International') Padding(padding: const EdgeInsets.only(top: 12), child: DropdownButtonFormField<String>(
              initialValue: countries.contains(countryPick) ? countryPick : null, decoration: const InputDecoration(labelText: 'Country'),
              items: [for (final c in countries) DropdownMenuItem(value: c, child: Text(c))], onChanged: (v) => setState(() => countryPick = v ?? ''))),
        const SizedBox(height: 12),
        const Text('Diet', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        Wrap(spacing: 8, children: [for (final (v, l) in [('Veg', 'Veg'), ('Non_Veg', 'Non-veg')]) _chip(l, diet == v, () => setState(() => diet = v))]),
        const SizedBox(height: 16),
        ActionButton(
          label: backToNow && me['pending_change_id'] != null ? 'Keep my current food' : 'Change from Monday $nextMonday',
          icon: Icons.check_rounded, busy: busy,
          onPressed: blocked != null ? null : () async {
            setState(() => busy = true);
            final ok = await act(context, () => Api.instance.post('/me/food', {'region': region, 'diet': diet, 'country': country}),
                backToNow ? 'Your food stays the same next week' : 'Changed from Monday $nextMonday');
            if (mounted) setState(() => busy = false);
            if (ok) await widget.onDone();
          },
        ),
        if (blocked != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(blocked, style: const TextStyle(color: K.ink3, fontSize: 12))),
      ]),
    );
  }
}
