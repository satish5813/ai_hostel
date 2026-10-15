import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import 'mess_menu_screen.dart';

const _style = {'South': 'South Indian', 'North': 'North Indian', 'Both': 'North & South'};
const _mealIcon = {'Breakfast': LucideIcons.coffee, 'Lunch': LucideIcons.utensilsCrossed, 'Evening_Snacks': LucideIcons.cookie, 'Dinner': LucideIcons.soup};
const _choiceMeals = ['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner'];
String _mealLabel(String m) => m == 'Evening_Snacks' ? 'Evening snacks' : m;
String _dietLabel(dynamic d) => d == 'Veg' ? 'Veg' : 'Non-veg';
String _key(dynamic d, dynamic m, dynamic c) => '$d|$m|$c';
DateTime _date(dynamic iso) => DateTime.parse('$iso'.substring(0, 10));
/// en-IN short months, as the browser writes them (September is "Sept").
String _mon(DateTime d) => d.month == 9 ? 'Sept' : DateFormat('MMM').format(d);
/// "12 Oct": the date of day n (1 = Monday) of a week, as on the day chips.
String _dayDate(dynamic weekStart, int n) { final d = _date(weekStart).add(Duration(days: n - 1)); return '${DateFormat('dd').format(d)} ${_mon(d)}'; }
/// "12–18 Oct" (or "28 Sept – 4 Oct").
String _weekShort(dynamic weekStart) {
  final a = _date(weekStart), b = a.add(const Duration(days: 6));
  return a.month == b.month ? '${a.day}–${b.day} ${_mon(b)}' : '${a.day} ${_mon(a)} – ${b.day} ${_mon(b)}';
}
/// Choices close at midnight; people read the last minute before it: "Thu, 08 Oct, 11:59 pm" (India time).
String _dueLabel(dynamic closeAt) {
  final t = DateTime.tryParse('$closeAt');
  if (t == null) return '';
  final ist = t.toUtc().add(const Duration(hours: 5, minutes: 30)).subtract(const Duration(minutes: 1));
  return '${DateFormat('EEE').format(ist)}, ${DateFormat('dd').format(ist)} ${_mon(ist)}, ${DateFormat('h:mm a').format(ist).toLowerCase()}';
}
Set<String> _slotsOf(List<Map> options) => {for (final o in options) _key(o['day_no'], o['meal'], o['course_code'])};

/// MES-09 Choose my meals (pages/student/MealChoice.tsx). Each day the student gets the fixed items of their food style
/// and chooses, course by course, among the dishes the mess offers. Choices for a week close the Friday before it
/// begins; what is left open is then filled with the dish that fits the student's food choice, except live-counter items.
class MealChoiceScreen extends StatefulWidget {
  const MealChoiceScreen({super.key});
  @override
  State<MealChoiceScreen> createState() => _MealChoiceScreenState();
}

class _MealChoiceScreenState extends State<MealChoiceScreen> {
  int? weekId;
  int? day;
  int version = 0; // the choices are kept on the page; a fill reloads them from the server

  @override
  Widget build(BuildContext context) => ApiView(path: '/me/meal-choices', builder: (context, data, reload) {
        final d = data as Map;
        final me = d['me'] as Map?;
        if (me == null) {
          return const MnPage(gap: 12, children: [MnPanel(children: [
            Padding(padding: EdgeInsets.only(bottom: 10), child: MnH2('Choose my meals', size: 15.5)),
            MnEmpty('You choose your meals once you live in a residency and eat at its mess.'),
          ])]);
        }
        final weeks = ((d['weeks'] as List?) ?? []).cast<Map>();
        final firstOpen = weeks.where((w) => w['is_open'] == true).firstOrNull?['week_id'];
        final w = weeks.where((x) => x['week_id'] == (weekId ?? firstOpen)).firstOrNull ?? weeks.firstOrNull;
        final courses = ((d['courses'] as List?) ?? []).cast<Map>();

        return MnPage(gap: 12, children: [
          MnHead(icon: LucideIcons.chefHat, title: 'Choose my meals', sub: '${me['mess_name']}', chips: [
            (LucideIcons.utensilsCrossed, _style[me['cuisine']] ?? '${me['cuisine']}'),
            (LucideIcons.leaf, _dietLabel(me['diet'])),
          ]),
          if (w == null)
            const MnPanel(children: [MnEmpty('The rasoi has not published a weekly menu yet. You will get a message when it does.')])
          else ...[
            if (weeks.length > 1) Row(children: [
              for (var i = 0; i < weeks.length; i++) ...[
                if (i > 0) const SizedBox(width: 6),
                Expanded(child: MnPreset(i == weeks.length - 1 ? 'Next week' : 'This week', weeks[i]['week_id'] == w['week_id'],
                    () => setState(() { weekId = weeks[i]['week_id'] as int; day = null; }), sub: _weekShort(weeks[i]['week_start']))),
              ],
            ]),
            _WeekChoices(key: ValueKey('${w['week_id']}-$version'), week: w, courses: courses, me: me, today: d['today'], day: day,
                setDay: (n) => setState(() => day = n),
                onFilled: (n) async {
                  await reload();
                  if (!mounted) return;
                  setState(() => version++);
                  toast(this.context, n > 0 ? '$n dishes chosen for you; change any you like' : 'Nothing left to fill');
                }),
          ],
        ]);
      });
}

/// The week's choices: the due strip with the count, the quick fill, then the day chips and each meal's courses.
class _WeekChoices extends StatefulWidget {
  final Map week;
  final List<Map> courses;
  final Map me;
  final String? today;
  final int? day;
  final ValueChanged<int> setDay;
  final Future<void> Function(int filled) onFilled;
  const _WeekChoices({super.key, required this.week, required this.courses, required this.me, this.today, required this.day, required this.setDay, required this.onFilled});
  @override
  State<_WeekChoices> createState() => _WeekChoicesState();
}

class _WeekChoicesState extends State<_WeekChoices> {
  late final Map w = widget.week;
  late final List<Map> options = ((w['options'] as List?) ?? []).cast<Map>();
  late final List<Map> fixed = ((w['fixed'] as List?) ?? []).cast<Map>();
  late final Map<String, Map> mine = {for (final c in ((w['choices'] as List?) ?? []).cast<Map>()) _key(c['day_no'], c['meal'], c['course_code']): c};
  late final Set<String> slots = _slotsOf(options);
  String? busyKey;

  bool get open => w['is_open'] == true;

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
    final done = mine.keys.where(slots.contains).length;
    final todayNo = widget.today == null ? 0 : _date(widget.today).difference(_date(w['week_start'])).inDays + 1;
    final sel = widget.day ?? (todayNo >= 1 && todayNo <= 7 ? todayNo : 1);
    bool dayDone(int n) => slots.where((k) => k.startsWith('$n|')).every(mine.containsKey);
    final cuisine = widget.me['cuisine'];
    final due = _dueLabel(w['choices_close_at']);

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      MnPending(
        closed: !open,
        title: open ? 'Choose by $due' : 'Choices closed $due',
        sub: open ? 'Anything you leave open is filled with the dish that fits your food choice. Live-counter breakfast is made only if you choose it.'
            : 'What you did not choose was filled in for you; it is marked "given".',
        trailingInline: true,
        trailing: Semantics(label: '$done of ${slots.length} chosen', child: SizedBox(width: 72, child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text.rich(TextSpan(children: [
            TextSpan(text: '$done', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: K.brand)),
            TextSpan(text: '/${slots.length}'),
          ]), style: const TextStyle(fontSize: 13, color: Color(0xFF475467))),
          const SizedBox(height: 4),
          ClipRRect(borderRadius: BorderRadius.circular(4), child: Container(height: 4, color: K.line, child: FractionallySizedBox(alignment: Alignment.centerLeft,
              widthFactor: slots.isEmpty ? 0 : done / slots.length, child: Container(color: K.brand)))),
        ]))),
      ),
      if (open && slots.length - done > 0) ...[const SizedBox(height: 12), _QuickFill(weekId: w['week_id'], me: widget.me, left: slots.length - done, onDone: widget.onFilled)],
      const SizedBox(height: 12),
      MnPanel(gap: 14, children: [
        MnDays(selected: sel, onPick: widget.setDay, small: (i) => _dayDate(w['week_start'], i), tick: dayDone),
        for (final meal in _choiceMeals) _meal(meal, sel, cuisine),
        if (!options.any((o) => o['day_no'] == sel)) const MnEmpty('No choices on this day.'),
      ]),
    ]);
  }

  Widget _meal(String meal, int sel, dynamic cuisine) {
    final fx = fixed.where((f) => f['meal'] == meal).toList()..sort((a, b) => (b['cuisine'] == cuisine ? 1 : 0) - (a['cuisine'] == cuisine ? 1 : 0));
    final cs = widget.courses.where((c) => ((c['meals'] as List?) ?? []).contains(meal) && options.any((o) => o['day_no'] == sel && o['meal'] == meal && o['course_code'] == c['course_code'])).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Padding(padding: const EdgeInsets.only(bottom: 6), child: Row(children: [
        MnMealIco(_mealIcon[meal]!), const SizedBox(width: 8),
        Text(_mealLabel(meal), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
      ])),
      if (fx.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 8), child: Wrap(spacing: 6, runSpacing: 6, children: [
        for (final f in fx) Builder(builder: (_) {
          final mineF = f['cuisine'] == cuisine;
          final fg = mineF ? const Color(0xFF0B4F49) : const Color(0xFF475467);
          return Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: mineF ? const Color(0xFFECFDF8) : K.sub, borderRadius: BorderRadius.circular(10)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                Opacity(opacity: .75, child: Text('${_style[f['cuisine']] ?? f['cuisine']}${mineF ? ' · yours' : ''}'.toUpperCase(),
                    style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w700, letterSpacing: .315, color: fg))),
                Text('${f['items']}', style: TextStyle(fontSize: 12.5, fontWeight: mineF ? FontWeight.w600 : FontWeight.w400, color: fg)),
              ]));
        }),
      ])),
      for (final c in cs) _course(sel, meal, c),
    ]);
  }

  Widget _course(int sel, String meal, Map c) {
    final k = _key(sel, meal, c['course_code']);
    final ch = mine[k];
    final opts = options.where((o) => o['day_no'] == sel && o['meal'] == meal && o['course_code'] == c['course_code']).toList();
    final madeToOrder = c['default_on_close'] == 'Skip';
    final off = !open || busyKey == k;
    Widget em(String t, {bool todo = false}) => Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 1),
        decoration: BoxDecoration(color: todo ? const Color(0xFFFFF4E5) : K.hover, borderRadius: BorderRadius.circular(999)),
        child: Text(t, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: todo ? const Color(0xFFB54708) : const Color(0xFF475467))));
    return Padding(padding: const EdgeInsets.only(bottom: 10), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Padding(padding: const EdgeInsets.only(bottom: 6), child: Wrap(spacing: 8, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
        Text('${c['course_name']}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: K.ink4)),
        if (madeToOrder) em('Made to order'),
        if (ch == null && open) em('Choose', todo: true),
        if (ch?['source'] == 'Default') em('Given'),
        if (ch?['source'] == 'Staff') em('Entered by the chef'),
      ])),
      LayoutBuilder(builder: (context, box) {
        final cols = ((box.maxWidth + 8) / 158).floor().clamp(1, 6);
        final cellW = (box.maxWidth - 8 * (cols - 1)) / cols;
        return Wrap(spacing: 8, runSpacing: 8, children: [
          for (final o in opts) SizedBox(width: cellW, child: _Opt(
              title: '${o['dish']}', sub: '${_style[o['cuisine']] ?? o['cuisine']} · ${_dietLabel(o['diet'])}',
              dot: o['diet'] == 'Veg' ? const Color(0xFF12B76A) : const Color(0xFFB54708),
              on: ch != null && ch['option_id'] == o['option_id'], enabled: !off, onTap: () => pick(sel, meal, c, o['option_id'] as int))),
          if (c['can_skip'] == true) SizedBox(width: cellW, child: _Opt(
              title: madeToOrder ? 'Not today' : 'No thanks', sub: madeToOrder ? 'Idli or poha is enough' : 'Skip this', dashed: true,
              on: ch != null && ch['option_id'] == null, enabled: !off, onTap: () => pick(sel, meal, c, null))),
        ]);
      }),
    ]));
  }
}

/// One dish button (mc-opts button): the food-label dot, the dish and its style; teal with a tick when chosen.
class _Opt extends StatelessWidget {
  final String title, sub;
  final Color? dot;
  final bool on, enabled, dashed;
  final VoidCallback onTap;
  const _Opt({required this.title, required this.sub, this.dot, required this.on, required this.enabled, this.dashed = false, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final r = BorderRadius.circular(12);
    final body = Container(
      constraints: const BoxConstraints(minHeight: 52),
      padding: EdgeInsets.fromLTRB(dashed ? 12 : 26, 10, 26, 10),
      decoration: BoxDecoration(color: on ? const Color(0xFFECFDF8) : Colors.white, borderRadius: r,
          border: dashed && !on ? null : Border.all(color: on ? K.brand : K.line, width: 1.5)),
      foregroundDecoration: on ? BoxDecoration(borderRadius: r, border: Border.all(color: K.brand, width: 2.5)) : null,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Text(title, style: const TextStyle(fontSize: 13.5, height: 1.3, fontWeight: FontWeight.w700, color: Color(0xFF1D2939))),
        const SizedBox(height: 2),
        Text(sub, style: const TextStyle(fontSize: 11.5, color: K.ink3)),
      ]),
    );
    return Semantics(button: true, selected: on, enabled: enabled, child: Opacity(opacity: !enabled && !on ? .6 : 1, child: Material(color: Colors.transparent, borderRadius: r, child: InkWell(
      onTap: enabled ? onTap : null, borderRadius: r,
      child: Stack(children: [
        dashed && !on ? CustomPaint(foregroundPainter: const _Dashed(), child: body) : body,
        if (dot != null) Positioned(left: 10, top: 14, child: Container(width: 9, height: 9, decoration: BoxDecoration(color: dot, shape: BoxShape.circle,
            boxShadow: [BoxShadow(color: dot!, spreadRadius: 3.5), const BoxShadow(color: Colors.white, spreadRadius: 2)]))),
        if (on) const Positioned(top: 8, right: 10, child: Text('✓', style: TextStyle(fontWeight: FontWeight.w800, color: K.brand, fontSize: 14))),
      ]),
    ))));
  }
}

/// A 1.5 px dashed outline with 12 px corners (the "No thanks" button).
class _Dashed extends CustomPainter {
  const _Dashed();
  @override
  void paint(Canvas canvas, Size size) {
    final p = Paint()..style = PaintingStyle.stroke..strokeWidth = 1.5..color = K.line;
    final path = Path()..addRRect(RRect.fromRectAndRadius(Rect.fromLTWH(.75, .75, size.width - 1.5, size.height - 1.5), const Radius.circular(11.25)));
    for (final m in path.computeMetrics()) {
      for (double t = 0; t < m.length; t += 9) { canvas.drawPath(m.extractPath(t, (t + 5).clamp(0, m.length)), p); }
    }
  }
  @override
  bool shouldRepaint(_) => false;
}

/// Fill the rest for me (mc-fill): every open course with the dishes of one food style and diet.
class _QuickFill extends StatefulWidget {
  final dynamic weekId;
  final Map me;
  final int left;
  final Future<void> Function(int filled) onDone;
  const _QuickFill({required this.weekId, required this.me, required this.left, required this.onDone});
  @override
  State<_QuickFill> createState() => _QuickFillState();
}

class _QuickFillState extends State<_QuickFill> {
  late String cuisine = '${widget.me['cuisine']}';
  late String diet = '${widget.me['diet']}';
  bool busy = false;

  @override
  Widget build(BuildContext context) => MnPanel(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12), children: [
        Wrap(spacing: 12, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(LucideIcons.sparkles, size: 16, color: K.ink), const SizedBox(width: 8),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Fill the rest for me', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
              Text('${widget.left} still open. Live-counter items are left for you to pick.', style: const TextStyle(fontSize: 12, color: K.ink3)),
            ])),
          ]),
          Wrap(spacing: 8, runSpacing: 8, children: [for (final v in ['South', 'North']) MnPreset(_style[v]!, cuisine == v, () => setState(() => cuisine = v))]),
          Wrap(spacing: 8, runSpacing: 8, children: [for (final v in ['Veg', 'Non_Veg']) MnPreset(_dietLabel(v), diet == v, () => setState(() => diet = v))]),
          KButton('Fill', small: true, busy: busy, onPressed: () async {
            setState(() => busy = true);
            try {
              final r = await Api.instance.post('/me/meal-choices/${widget.weekId}/fill', {'cuisine': cuisine, 'diet': diet});
              await widget.onDone(((r is Map ? r['filled'] : 0) as num?)?.toInt() ?? 0);
            } catch (e) {
              if (context.mounted) toast(context, e.toString(), error: true);
            } finally {
              if (mounted) setState(() => busy = false);
            }
          }),
        ]),
      ]);
}
