import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';

/* ---------- the same labels as apps/web-vite/src/pages/mess/weekly.ts ---------- */
const _weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const _choiceMeals = ['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner'];
const _mealIcon = {'Breakfast': Icons.coffee_rounded, 'Lunch': Icons.restaurant_rounded, 'Evening_Snacks': Icons.cookie_rounded, 'Dinner': Icons.soup_kitchen_rounded};
String _mealLabel(String m) => m == 'Evening_Snacks' ? 'Evening snacks' : m;
const _style = {'South': 'South Indian', 'North': 'North Indian', 'Both': 'North & South'};
String _dietLabel(String? d) => d == 'Veg' ? 'Veg' : 'Non-veg';
DateTime _date(String iso) => DateTime.parse(iso.substring(0, 10));
String _dayDate(String weekStart, int n) => DateFormat('d MMM').format(_date(weekStart).add(Duration(days: n - 1)));
String _weekShort(String weekStart) {
  final a = _date(weekStart), b = a.add(const Duration(days: 6));
  return a.month == b.month ? '${a.day}–${b.day} ${DateFormat('MMM').format(b)}' : '${DateFormat('d MMM').format(a)} – ${DateFormat('d MMM').format(b)}';
}

/// Choices close at midnight; people read the last minute before it, in India time: "Thu 08 Oct, 11:59 pm".
String _dueLabel(String? closeAt) {
  final t = closeAt == null ? null : DateTime.tryParse(closeAt);
  if (t == null) return '—';
  final ist = t.toUtc().add(const Duration(hours: 5, minutes: 30)).subtract(const Duration(minutes: 1));
  return DateFormat('EEE dd MMM, h:mm a').format(ist).replaceAll('AM', 'am').replaceAll('PM', 'pm');
}

String _key(dynamic d, dynamic m, dynamic c) => '$d|$m|$c';
Set<String> _slotsOf(List<Map> options) => {for (final o in options) _key(o['day_no'], o['meal'], o['course_code'])};

/// MES-09 Choose my meals. Each day the student gets the fixed items of their food style and chooses, course by course,
/// among the dishes the mess offers. Choices for a week close the Friday before it begins; what is left open is then
/// filled with the dish that fits the student's food choice, except live-counter items, made only for those who chose them.
class MealChoiceScreen extends StatefulWidget {
  const MealChoiceScreen({super.key});
  @override
  State<MealChoiceScreen> createState() => _MealChoiceScreenState();
}

class _MealChoiceScreenState extends State<MealChoiceScreen> {
  int? weekId;

  @override
  Widget build(BuildContext context) => ApiView(path: '/me/meal-choices', builder: (context, data, reload) {
        final d = data as Map;
        final me = d['me'] as Map?;
        if (me == null) {
          return const PageList(children: [EmptyView(icon: Icons.soup_kitchen_rounded, title: 'Choose my meals',
              body: 'You choose your meals once you live in a hostel and eat at its mess.')]);
        }
        final weeks = ((d['weeks'] as List?) ?? []).cast<Map>();
        final firstOpen = weeks.where((w) => w['is_open'] == true).firstOrNull?['week_id'];
        final w = weeks.where((x) => x['week_id'] == (weekId ?? firstOpen)).firstOrNull ?? weeks.firstOrNull;
        final courses = ((d['courses'] as List?) ?? []).cast<Map>();

        return PageList(children: [
          KCard(
            title: 'Choose my meals', subtitle: me['mess_name'], icon: Icons.soup_kitchen_rounded,
            child: Wrap(spacing: 8, runSpacing: 8, children: [
              Pill(_style[me['cuisine']] ?? '${me['cuisine']}'),
              Pill(_dietLabel(me['diet']), tone: me['diet'] == 'Veg' ? Tone.good : Tone.bad),
            ]),
          ),
          if (w == null)
            const KCard(child: EmptyView(icon: Icons.menu_book_rounded, title: 'No weekly menu yet',
                body: 'The mess has not published a weekly menu yet. You will get a message when it does.'))
          else ...[
            if (weeks.length > 1)
              Wrap(spacing: 8, runSpacing: 8, children: [
                for (final x in weeks)
                  ChoiceChip(
                    label: Text('${x['is_open'] == true ? 'Next week' : 'This week'} · ${_weekShort(x['week_start'])}'),
                    selected: x['week_id'] == w['week_id'], selectedColor: K.brand, showCheckmark: false,
                    labelStyle: TextStyle(color: x['week_id'] == w['week_id'] ? Colors.white : K.ink, fontWeight: FontWeight.w700),
                    onSelected: (_) => setState(() => weekId = x['week_id'] as int),
                  ),
              ]),
            _WeekChoices(key: ValueKey('${w['week_id']}-${identityHashCode(d)}'), week: w, courses: courses, me: me, today: d['today'],
                onFilled: reload),
          ],
        ]);
      });
}

class _WeekChoices extends StatefulWidget {
  final Map week;
  final List<Map> courses;
  final Map me;
  final String? today;
  final Future<void> Function() onFilled;
  const _WeekChoices({super.key, required this.week, required this.courses, required this.me, this.today, required this.onFilled});
  @override
  State<_WeekChoices> createState() => _WeekChoicesState();
}

class _WeekChoicesState extends State<_WeekChoices> {
  late final Map w = widget.week;
  late final List<Map> options = ((w['options'] as List?) ?? []).cast<Map>();
  late final List<Map> fixed = ((w['fixed'] as List?) ?? []).cast<Map>();
  late final Map<String, Map> mine = {for (final c in ((w['choices'] as List?) ?? []).cast<Map>()) _key(c['day_no'], c['meal'], c['course_code']): c};
  late final Set<String> slots = _slotsOf(options);
  int? sel;
  String? busyKey;

  bool get open => w['is_open'] == true;
  int get done => mine.keys.where(slots.contains).length;
  bool dayDone(int n) => slots.where((k) => k.startsWith('$n|')).every(mine.containsKey);
  bool dayHasSlots(int n) => slots.any((k) => k.startsWith('$n|'));

  Future<void> pick(int d, String meal, Map c, int? optionId) async {
    final k = _key(d, meal, c['course_code']);
    final before = mine[k];
    setState(() { mine[k] = {'day_no': d, 'meal': meal, 'course_code': c['course_code'], 'option_id': optionId, 'source': 'Student'}; busyKey = k; });
    try {
      await Api.instance.put('/me/meal-choices/${w['week_id']}', {'day_no': d, 'meal': meal, 'course_code': c['course_code'], 'option_id': optionId});
    } catch (e) {
      if (mounted) {
        setState(() { if (before != null) { mine[k] = before; } else { mine.remove(k); } });
        toast(context, e.toString(), error: true);
      }
    } finally {
      if (mounted) setState(() => busyKey = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final todayNo = widget.today == null ? 0 : _date(widget.today!).difference(_date(w['week_start'])).inDays + 1;
    final day = sel ?? (todayNo >= 1 && todayNo <= 7 ? todayNo : 1);
    final total = slots.length;
    final left = total - done;
    final cuisine = widget.me['cuisine'];

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      // deadline and progress
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: open ? K.warnBg : const Color(0xFFF2F4F7), borderRadius: BorderRadius.circular(16),
            border: Border.all(color: open ? K.warn.withValues(alpha: .25) : K.line)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(Icons.event_rounded, color: open ? K.warn : K.ink3), const SizedBox(width: 10),
            Expanded(child: Text(open ? 'Choose by ${_dueLabel(w['choices_close_at'])}' : 'Choices closed ${_dueLabel(w['choices_close_at'])}',
                style: const TextStyle(fontWeight: FontWeight.w800))),
            Text('$done/$total', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          ]),
          const SizedBox(height: 6),
          Text(open ? 'Anything you leave open is filled with the dish that fits your food choice. Live-counter breakfast is made only if you choose it.'
              : 'What you did not choose was filled in for you; it is marked "given".', style: const TextStyle(color: K.ink2, fontSize: 12.5)),
          const SizedBox(height: 10),
          ClipRRect(borderRadius: BorderRadius.circular(99), child: LinearProgressIndicator(value: total == 0 ? 0 : done / total, minHeight: 6,
              backgroundColor: Colors.white, color: K.brand)),
          if (open && left > 0) Padding(padding: const EdgeInsets.only(top: 8),
              child: Text('$left still to choose', style: const TextStyle(color: K.warn, fontWeight: FontWeight.w700, fontSize: 12.5))),
        ]),
      ),
      if (open && left > 0) ...[const SizedBox(height: 14), _QuickFill(weekId: w['week_id'], me: widget.me, left: left, onDone: widget.onFilled)],
      const SizedBox(height: 14),
      // days
      SingleChildScrollView(scrollDirection: Axis.horizontal, child: Row(children: [
        for (var i = 1; i <= 7; i++) Padding(padding: const EdgeInsets.only(right: 6), child: _DayTab(
              name: _weekDays[i - 1].substring(0, 3), date: _dayDate(w['week_start'], i), selected: day == i, today: i == todayNo,
              allChosen: dayHasSlots(i) && dayDone(i), onTap: () => setState(() => sel = i))),
      ])),
      const SizedBox(height: 14),
      if (!options.any((o) => o['day_no'] == day))
        const KCard(child: Text('No choices on this day.', style: TextStyle(color: K.ink3)))
      else
        for (final meal in _choiceMeals) ...[_meal(day, meal, cuisine), const SizedBox(height: 14)],
    ]);
  }

  Widget _meal(int day, String meal, dynamic cuisine) {
    final fx = fixed.where((f) => f['meal'] == meal).toList()..sort((a, b) => (b['cuisine'] == cuisine ? 1 : 0) - (a['cuisine'] == cuisine ? 1 : 0));
    final cs = widget.courses.where((c) => ((c['meals'] as List?) ?? []).contains(meal) &&
        options.any((o) => o['day_no'] == day && o['meal'] == meal && o['course_code'] == c['course_code'])).toList();
    if (fx.isEmpty && cs.isEmpty) return const SizedBox.shrink();
    return KCard(
      title: _mealLabel(meal), icon: _mealIcon[meal],
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        for (final f in fx)
          Container(
            width: double.infinity, margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: f['cuisine'] == cuisine ? K.brandTint : const Color(0xFFF7F8FA), borderRadius: BorderRadius.circular(12)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Fixed · ${_style[f['cuisine']]}${f['cuisine'] == cuisine ? ' · yours' : ''}',
                  style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: f['cuisine'] == cuisine ? K.brand : K.ink3)),
              Text('${f['items']}', style: TextStyle(color: f['cuisine'] == cuisine ? K.ink : K.ink3, fontSize: 13.5)),
            ]),
          ),
        for (final c in cs) _course(day, meal, c),
      ]),
    );
  }

  Widget _course(int day, String meal, Map c) {
    final k = _key(day, meal, c['course_code']);
    final ch = mine[k];
    final opts = options.where((o) => o['day_no'] == day && o['meal'] == meal && o['course_code'] == c['course_code']).toList();
    final skipFirst = c['default_on_close'] == 'Skip';
    final disabled = !open || busyKey == k;
    Widget chip(String label, String sub, bool on, VoidCallback tap, {Color? dot}) => ChoiceChip(
          selected: on, selectedColor: K.brand, showCheckmark: false, backgroundColor: Colors.white, disabledColor: on ? K.brand.withValues(alpha: .7) : const Color(0xFFF7F8FA),
          onSelected: disabled ? null : (_) => tap(),
          label: Row(mainAxisSize: MainAxisSize.min, children: [
            if (dot != null) Container(width: 9, height: 9, margin: const EdgeInsets.only(right: 6), decoration: BoxDecoration(color: on ? Colors.white : dot, shape: BoxShape.circle)),
            Flexible(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              Text(label, style: TextStyle(fontWeight: FontWeight.w700, color: on ? Colors.white : K.ink)),
              Text(sub, style: TextStyle(fontSize: 11, color: on ? Colors.white70 : K.ink3)),
            ])),
          ]),
        );
    return Padding(padding: const EdgeInsets.only(top: 6, bottom: 10), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Wrap(spacing: 6, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
        Text('${c['course_name']}', style: const TextStyle(fontWeight: FontWeight.w800)),
        if (skipFirst) const Pill('Made to order', tone: Tone.muted),
        if (ch == null && open) const Pill('Choose', tone: Tone.warn),
        if (ch?['source'] == 'Default') const Pill('Given', tone: Tone.muted),
        if (ch?['source'] == 'Staff') const Pill('Entered by the chef', tone: Tone.muted),
        if (busyKey == k) const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)),
      ]),
      const SizedBox(height: 8),
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final o in opts)
          chip('${o['dish']}', '${_style[o['cuisine']]} · ${_dietLabel(o['diet'])}', ch != null && ch['option_id'] == o['option_id'],
              () => pick(day, meal, c, o['option_id'] as int), dot: o['diet'] == 'Veg' ? K.good : K.bad),
        if (c['can_skip'] == true)
          chip(skipFirst ? 'Not today' : 'No thanks', skipFirst ? 'Idli or poha is enough' : 'Skip this', ch != null && ch['option_id'] == null,
              () => pick(day, meal, c, null)),
      ]),
    ]));
  }
}

class _DayTab extends StatelessWidget {
  final String name, date;
  final bool selected, today, allChosen;
  final VoidCallback onTap;
  const _DayTab({required this.name, required this.date, required this.selected, required this.today, required this.allChosen, required this.onTap});
  @override
  Widget build(BuildContext context) => Material(
      color: selected ? K.brand : Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: selected ? K.brand : (today ? K.brand.withValues(alpha: .5) : K.line))),
      child: InkWell(borderRadius: BorderRadius.circular(14), onTap: onTap, child: SizedBox(width: 62, height: 58, child: Stack(children: [
        Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(name, style: TextStyle(fontWeight: FontWeight.w800, color: selected ? Colors.white : K.ink)),
          Text(date, style: TextStyle(fontSize: 10.5, color: selected ? Colors.white70 : K.ink3)),
        ])),
        if (allChosen) Positioned(top: 4, right: 4, child: Icon(Icons.check_circle_rounded, size: 14, color: selected ? Colors.white : K.good)),
      ]))));
}

/// Fill every open course with the dishes of one food style and diet; the student changes what they like after.
class _QuickFill extends StatefulWidget {
  final dynamic weekId;
  final Map me;
  final int left;
  final Future<void> Function() onDone;
  const _QuickFill({required this.weekId, required this.me, required this.left, required this.onDone});
  @override
  State<_QuickFill> createState() => _QuickFillState();
}

class _QuickFillState extends State<_QuickFill> {
  late String cuisine = widget.me['cuisine'] ?? 'South';
  late String diet = widget.me['diet'] ?? 'Veg';
  bool busy = false;

  Widget _chip(String label, bool on, VoidCallback tap) => ChoiceChip(label: Text(label), selected: on, selectedColor: K.brand, showCheckmark: false,
      labelStyle: TextStyle(color: on ? Colors.white : K.ink, fontWeight: FontWeight.w700), onSelected: (_) => tap());

  Future<void> fill() async {
    setState(() => busy = true);
    try {
      final r = await Api.instance.post('/me/meal-choices/${widget.weekId}/fill', {'cuisine': cuisine, 'diet': diet});
      final n = r is Map ? (r['filled'] ?? 0) : 0;
      if (mounted) toast(context, n != 0 ? '$n dishes chosen for you; change any you like' : 'Nothing left to fill');
      await widget.onDone();
    } catch (e) {
      if (mounted) toast(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => KCard(
        title: 'Fill the rest for me', subtitle: '${widget.left} still open. Live-counter items are left for you to pick.', icon: Icons.auto_awesome_rounded,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(spacing: 8, runSpacing: 8, children: [for (final v in ['South', 'North']) _chip(_style[v]!, cuisine == v, () => setState(() => cuisine = v))]),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: [for (final v in ['Veg', 'Non_Veg']) _chip(_dietLabel(v), diet == v, () => setState(() => diet = v))]),
          const SizedBox(height: 14),
          ActionButton(label: 'Fill', icon: Icons.auto_awesome_rounded, busy: busy, onPressed: fill),
        ]),
      );
}
