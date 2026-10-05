import 'package:flutter/material.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';

/* ------------------------------------------------------------ shared by the three mess pages (st-*, mn-* classes) */

const mnWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const mnSlots = [
  ('Breakfast', 'Breakfast', LucideIcons.coffee), ('Lunch', 'Lunch', LucideIcons.utensilsCrossed),
  ('Evening_Snacks', 'Evening snacks', LucideIcons.cookie), ('Dinner', 'Dinner', LucideIcons.soup),
];
const _food = {'South': 'South Indian', 'North': 'North Indian', 'International': 'My country'};
String _foodName(String? region, String? country) => region == 'International' ? '$country food' : (_food[region] ?? '');

/// A student mess page (.st): the page body, sections [gap] apart.
class MnPage extends StatelessWidget {
  final List<Widget> children;
  final double gap;
  const MnPage({super.key, required this.children, this.gap = 18});
  @override
  Widget build(BuildContext context) => ListView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 16, 16, 90), children: [
        for (var i = 0; i < children.length; i++) ...[if (i > 0) SizedBox(height: gap), children[i]],
      ]);
}

/// st-panel with no heading of its own; [gap] between children (flex column).
class MnPanel extends StatelessWidget {
  final List<Widget> children;
  final double gap;
  final EdgeInsets padding;
  const MnPanel({super.key, required this.children, this.gap = 0, this.padding = const EdgeInsets.all(16)});
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity, padding: padding,
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: K.line), boxShadow: K.cardShadow),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          for (var i = 0; i < children.length; i++) ...[if (i > 0 && gap > 0) SizedBox(height: gap), children[i]],
        ]));
}

/// The st-panel h2 (15.5 px, 800, 10 px below) or the mn-week / mn-choice h2 (15 px).
class MnH2 extends StatelessWidget {
  final String text;
  final double size;
  const MnH2(this.text, {super.key, this.size = 15});
  @override
  Widget build(BuildContext context) => Text(text, style: TextStyle(fontSize: size, fontWeight: FontWeight.w800, color: K.ink));
}

/// st-empty.
class MnEmpty extends StatelessWidget {
  final String text;
  const MnEmpty(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Text(text, style: const TextStyle(fontSize: 13, color: K.ink3)));
}

/// The page head (st-panel mn-head): the green tile, the title and its line, and the chips under it on a phone.
class MnHead extends StatelessWidget {
  final IconData icon;
  final String title;
  final String sub;
  final List<(IconData?, String)> chips;
  const MnHead({super.key, required this.icon, required this.title, required this.sub, this.chips = const []});
  @override
  Widget build(BuildContext context) => MnPanel(children: [
        Wrap(spacing: 12, runSpacing: 12, alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, children: [
          Row(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 40, height: 40, decoration: BoxDecoration(borderRadius: BorderRadius.circular(12),
                gradient: const LinearGradient(colors: [Color(0xFF12B886), Color(0xFF0B7A71)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
                child: Icon(icon, size: 20, color: Colors.white)),
            const SizedBox(width: 12),
            Flexible(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: K.ink)),
              Text(sub, style: const TextStyle(fontSize: 12.5, color: K.ink3)),
            ])),
          ]),
          if (chips.isNotEmpty) Wrap(spacing: 6, runSpacing: 6, children: [
            for (final (i, t) in chips) Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(color: const Color(0xFFF2FBF9), borderRadius: BorderRadius.circular(999)),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  if (i != null) ...[Icon(i, size: 13, color: K.brandDark), const SizedBox(width: 5)],
                  Text(t, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: K.brandDark)),
                ])),
          ]),
        ]),
      ]);
}

/// The amber strip (mn-pending): an icon, a bold line and a small one, and something on the right or under.
class MnPending extends StatelessWidget {
  final String title;
  final String sub;
  final Widget? trailing;
  final bool trailingInline;
  final bool closed;
  const MnPending({super.key, required this.title, required this.sub, this.trailing, this.trailingInline = false, this.closed = false});
  @override
  Widget build(BuildContext context) {
    final text = Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: K.ink)),
      const SizedBox(height: 2),
      Text(sub, style: const TextStyle(fontSize: 12.5, color: K.ink2)),
    ]);
    final row = Row(children: [
      const Icon(LucideIcons.calendarClock, size: 18, color: Color(0xFFB54708)), const SizedBox(width: 12),
      Expanded(child: text),
      if (trailing != null && trailingInline) ...[const SizedBox(width: 12), trailing!],
    ]);
    return Container(
      width: double.infinity, padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(color: closed ? K.sub : const Color(0xFFFFF8EB), borderRadius: BorderRadius.circular(14), border: Border.all(color: closed ? K.line : const Color(0xFFF5D7A1))),
      child: trailing == null || trailingInline ? row : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [row, const SizedBox(height: 10), trailing!]),
    );
  }
}

/// One st-presets button: 38 px pill, the yellow-to-coral fill when pressed.
class MnPreset extends StatelessWidget {
  final String label;
  final String? sub;
  final bool on;
  final VoidCallback? onTap;
  final bool small;
  final bool stretch;
  const MnPreset(this.label, this.on, this.onTap, {super.key, this.sub, this.small = false, this.stretch = false});
  @override
  Widget build(BuildContext context) {
    final r = BorderRadius.circular(sub != null ? 14 : 999);
    return Semantics(button: true, selected: on, child: Material(color: Colors.transparent, borderRadius: r, child: InkWell(onTap: onTap, borderRadius: r, child: Container(
      height: sub != null ? null : small ? 32 : 38,
      padding: EdgeInsets.symmetric(horizontal: small ? 12 : 16, vertical: sub != null ? 7 : 0),
      alignment: sub != null ? Alignment.centerLeft : stretch ? Alignment.center : null,
      decoration: BoxDecoration(borderRadius: r, border: Border.all(color: on ? Colors.transparent : K.line),
          gradient: on ? const LinearGradient(colors: [K.sun, K.ember], begin: Alignment.topLeft, end: Alignment.bottomRight) : null),
      child: sub != null
          ? Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              Text(label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: on ? K.onAccent : K.ink)),
              const SizedBox(height: 1),
              Opacity(opacity: .75, child: Text(sub!, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 11, color: on ? K.onAccent : K.ink))),
            ])
          : Row(mainAxisSize: MainAxisSize.min, children: [Text(label, style: TextStyle(fontWeight: FontWeight.w700, fontSize: small ? 13 : 14, color: on ? K.onAccent : K.ink))]),
    ))));
  }
}

/// st-days: seven equal day buttons; the chosen one teal.
class MnDays extends StatelessWidget {
  final int selected;
  final ValueChanged<int> onPick;
  final String? Function(int day) small;
  final bool Function(int day)? tick;
  const MnDays({super.key, required this.selected, required this.onPick, required this.small, this.tick});
  @override
  Widget build(BuildContext context) => Row(children: [
        for (var i = 1; i <= 7; i++) ...[
          if (i > 1) const SizedBox(width: 6),
          Expanded(child: Semantics(button: true, selected: selected == i, child: Material(color: selected == i ? K.brand : Colors.transparent, borderRadius: BorderRadius.circular(12),
              child: InkWell(onTap: () => onPick(i), borderRadius: BorderRadius.circular(12), child: Stack(children: [
                Container(width: double.infinity, padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: selected == i ? K.brand : K.line)),
                    child: Column(children: [
                      Text(mnWeek[i - 1].substring(0, 3), style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: selected == i ? Colors.white : K.ink)),
                      if (small(i) != null) Text(small(i)!, maxLines: 1, overflow: TextOverflow.clip, softWrap: false,
                          style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, color: selected == i ? const Color(0xFFCFF3EC) : K.brand)),
                    ])),
                if (tick?.call(i) == true) Positioned(top: 2, right: 3, child: Container(width: 14, height: 14, decoration: const BoxDecoration(color: Color(0xFF12B76A), shape: BoxShape.circle),
                    child: const Icon(LucideIcons.check, size: 10, color: Colors.white))),
              ]))))),
        ],
      ]);
}

/// The green meal tile (st-meal-ico).
class MnMealIco extends StatelessWidget {
  final IconData icon;
  final double size;
  const MnMealIco(this.icon, {super.key, this.size = 16});
  @override
  Widget build(BuildContext context) => Container(width: 32, height: 32, decoration: BoxDecoration(color: const Color(0xFFE7F8EF), borderRadius: BorderRadius.circular(10)),
      child: Icon(icon, size: size, color: const Color(0xFF12805C)));
}

/// A KLH button with its blocked reason: the button stays its own width with a lock and the reason under it.
class MnBlockedButton extends StatelessWidget {
  final String label;
  final String? blockedReason;
  final bool busy;
  final VoidCallback onPressed;
  const MnBlockedButton(this.label, {super.key, this.blockedReason, this.busy = false, required this.onPressed});
  @override
  Widget build(BuildContext context) => blockedReason == null
      ? KButton(label, block: true, busy: busy, onPressed: onPressed)
      : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          KButton(label),
          Padding(padding: const EdgeInsets.only(top: 6), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Padding(padding: EdgeInsets.only(top: 1), child: Icon(LucideIcons.lock, size: 14, color: K.ink2)), const SizedBox(width: 4),
            Flexible(child: Text(blockedReason!, style: const TextStyle(fontSize: 12, height: 16 / 12, color: K.ink2))),
          ])),
        ]);
}

/* ------------------------------------------------------------ MES-01 for a student (pages/student/MyMenu.tsx) */

/// This week's menu for the student's group, and the weekly change of food. A change applies from next Monday;
/// until then it can be changed again or withdrawn.
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
          return const MnPage(children: [MnPanel(children: [
            Padding(padding: EdgeInsets.only(bottom: 10), child: MnH2('Mess menu', size: 15.5)),
            MnEmpty('Your menu appears here once you live in a hostel and have a mess subscription.'),
          ])]);
        }
        final pending = me['pending_change_id'] != null;
        final showNext = week == 'next' && pending;
        final items = (((showNext ? d['next_items'] : d['items']) as List?) ?? []).cast<Map>();
        final today = d['today'] as int?;
        final dayNo = sel ?? (showNext ? 1 : today ?? 1);
        String? meal(String slot) => items.where((i) => i['day_no'] == dayNo && i['meal'] == slot).firstOrNull?['dishes'];

        return MnPage(children: [
          MnHead(icon: LucideIcons.utensilsCrossed, title: 'Mess menu', sub: '${me['mess_name'] ?? me['hostel_code']}', chips: [
            (LucideIcons.users, '${me['hostel_gender']} hostel'),
            (LucideIcons.earth, me['is_foreign'] == true ? 'Foreign student' : 'Local student'),
            (LucideIcons.utensilsCrossed, _foodName(me['region'], me['country'])),
            (LucideIcons.leaf, me['diet'] == 'Veg' ? 'Veg' : 'Non-veg'),
          ]),
          if (pending) MnPending(
            title: 'From Monday ${day(me['change_from'])}: ${_foodName(me['next_region'], me['next_country'])}, ${me['next_diet'] == 'Veg' ? 'veg' : 'non-veg'}',
            sub: 'You can change it again or withdraw it until Sunday night.',
            trailing: KButton('Withdraw', small: true, kind: BtnKind.secondary, busy: withdrawing, onPressed: () async {
              setState(() => withdrawing = true);
              if (await act(context, () => Api.instance.delete('/me/food'), 'Change withdrawn; your food stays the same')) await reload();
              if (mounted) setState(() => withdrawing = false);
            }),
          ),
          MnPanel(gap: 12, children: [
            Wrap(spacing: 8, runSpacing: 8, alignment: WrapAlignment.spaceBetween, crossAxisAlignment: WrapCrossAlignment.center, children: [
              MnH2(showNext ? 'From Monday ${day(me['change_from'])}' : 'This week'),
              if (pending) Wrap(spacing: 8, children: [
                MnPreset('This week', week == 'this', () => setState(() { week = 'this'; sel = null; }), small: true),
                MnPreset('Next week', week == 'next', () => setState(() { week = 'next'; sel = null; }), small: true),
              ]),
            ]),
            MnDays(selected: dayNo, onPick: (i) => setState(() => sel = i), small: (i) => !showNext && i == today ? 'Today' : null),
            if (items.isNotEmpty) Column(children: [
              for (final (id, label, icon) in mnSlots) Container(
                width: double.infinity, margin: EdgeInsets.only(bottom: id == 'Dinner' ? 0 : 8), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                decoration: BoxDecoration(borderRadius: BorderRadius.circular(14), border: Border.all(color: K.line)),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  MnMealIco(icon), const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    Text(meal(id) ?? 'Not set', style: const TextStyle(fontSize: 13, height: 1.45, color: K.ink4)),
                  ])),
                ])),
            ])
            else const MnEmpty('There is no approved menu for this group yet. The hostel office prepares it.'),
          ]),
          _FoodChoice(m: d, onDone: () async { await reload(); if (mounted) setState(() { week = 'next'; sel = null; }); }),
        ]);
      });
}

/// Change my food (mn-choice): food and diet presets, the country for foreign students, and the change button.
class _FoodChoice extends StatefulWidget {
  final Map m;
  final Future<void> Function() onDone;
  const _FoodChoice({required this.m, required this.onDone});
  @override
  State<_FoodChoice> createState() => _FoodChoiceState();
}

class _FoodChoiceState extends State<_FoodChoice> {
  late Map me = widget.m['me'] as Map;
  late List<String> countries = ((widget.m['countries'] as List?) ?? []).map((e) => '$e').toList();
  late String region = '${me['next_region']}';
  late String diet = '${me['next_diet']}';
  late String country = me['next_country'] ?? me['country'] ?? countries.firstOrNull ?? '';
  bool busy = false;

  @override
  void didUpdateWidget(_FoodChoice old) { super.didUpdateWidget(old); me = widget.m['me'] as Map; countries = ((widget.m['countries'] as List?) ?? []).map((e) => '$e').toList(); }

  @override
  Widget build(BuildContext context) {
    final nextMonday = day(widget.m['next_monday']);
    final c = region == 'International' ? country : null;
    final unchanged = region == me['next_region'] && diet == me['next_diet'] && c == (me['next_region'] == 'International' ? me['next_country'] : null);
    final backToNow = region == me['region'] && diet == me['diet'] && c == (me['region'] == 'International' ? me['country'] : null);
    final options = [('South', 'South Indian'), ('North', 'North Indian'), if (me['international_allowed'] == true) ('International', 'My country')];
    Widget group(String l, String v) => Expanded(child: Container(padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
        decoration: BoxDecoration(color: K.sub, borderRadius: BorderRadius.circular(12)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(l, style: const TextStyle(fontSize: 11.5, color: K.ink3)), const SizedBox(height: 2),
          Text(v, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        ])));
    return MnPanel(gap: 12, children: [
      const MnH2('Change my food'),
      Note('Every week you can change your food. A change applies from Monday $nextMonday, so the mess can plan.', icon: LucideIcons.calendarClock),
      Row(children: [group('Hostel', '${me['hostel_gender']}'), const SizedBox(width: 8), group('Student', me['is_foreign'] == true ? 'Foreign' : 'Local')]),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const KLabel('Food'),
        Wrap(spacing: 8, runSpacing: 8, children: [for (final (v, l) in options) MnPreset(l, region == v, () => setState(() => region = v))]),
        if (me['is_foreign'] != true) const Padding(padding: EdgeInsets.only(top: 6), child: Text('Food by country is for foreign students and apartment residents.', style: TextStyle(fontSize: 12, color: K.ink3))),
      ]),
      if (region == 'International') Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Text('Country', style: TextStyle(fontSize: 13, height: 18 / 13, fontWeight: FontWeight.w600, color: K.ink)),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          initialValue: countries.contains(country) ? country : null, isExpanded: true,
          items: [for (final x in countries) DropdownMenuItem(value: x, child: Text(x, style: const TextStyle(fontSize: 16)))],
          onChanged: (v) => setState(() => country = v ?? ''),
          decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
        ),
      ]),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const KLabel('Diet'),
        Wrap(spacing: 8, runSpacing: 8, children: [for (final (v, l) in const [('Veg', 'Veg'), ('Non_Veg', 'Non-veg')]) MnPreset(l, diet == v, () => setState(() => diet = v))]),
      ]),
      MnBlockedButton(backToNow && me['pending_change_id'] != null ? 'Keep my current food' : 'Change from Monday $nextMonday', busy: busy,
          blockedReason: unchanged ? 'Choose a different food or diet.' : region == 'International' && country.isEmpty ? 'Choose the country.' : null,
          onPressed: () async {
            setState(() => busy = true);
            final ok = await act(context, () => Api.instance.post('/me/food', {'region': region, 'diet': diet, 'country': c}),
                backToNow ? 'Your food stays the same next week' : 'Changed from Monday $nextMonday');
            if (ok) await widget.onDone();
            if (mounted) setState(() => busy = false);
          }),
    ]);
  }
}
