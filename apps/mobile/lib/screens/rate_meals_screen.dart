import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import 'mess_menu_screen.dart';

const _icon = {'Breakfast': LucideIcons.coffee, 'Lunch': LucideIcons.utensilsCrossed, 'Evening_Snacks': LucideIcons.cookie, 'Dinner': LucideIcons.soup};
const _word = ['', 'Did not like it', 'Not good', 'Okay', 'Good', 'Loved it'];
String _mealLabel(String m) => m == 'Evening_Snacks' ? 'Evening snacks' : m;
DateTime _date(String iso) => DateTime.parse(iso.substring(0, 10));
String _todayIst() => isoDay(DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30)));
/// "Today", "Yesterday", else "Saturday, 3 Oct" (en-IN; September is "Sept").
String _dayName(String iso, String today) {
  final diff = _date(today).difference(_date(iso)).inDays;
  final d = _date(iso);
  return diff == 0 ? 'Today' : diff == 1 ? 'Yesterday' : '${DateFormat('EEEE').format(d)}, ${d.day} ${d.month == 9 ? 'Sept' : DateFormat('MMM').format(d)}';
}

/// MES-02 Rate my meals (pages/student/RateMeals.tsx). A student gives each dish they ate one to five stars, and may
/// say why; meals of today and the last three days can be rated or changed. Nobody sees the student's name.
class RateMealsScreen extends StatelessWidget {
  const RateMealsScreen({super.key});
  @override
  Widget build(BuildContext context) => ApiView(path: '/me/meal-ratings', builder: (context, data, reload) {
        final days = (((data as Map?)?['days'] as List?) ?? []).cast<Map>();
        final dishes = [for (final d in days) for (final m in ((d['meals'] as List?) ?? []).cast<Map>()) ...((m['dishes'] as List?) ?? []).cast<Map>()];
        final rated = dishes.where((x) => x['rating'] != null && x['rating'] != 0).length;
        final today = _todayIst();
        return MnPage(gap: 12, children: [
          MnHead(icon: LucideIcons.star, title: 'Rate my meals', sub: 'Your stars tell the rasoi what to cook again. Nobody sees your name.',
              chips: [if (dishes.isNotEmpty) (null, '$rated of ${dishes.length} dishes rated')]),
          if (days.isEmpty) const MnPanel(children: [MnEmpty('Meals you eat appear here once they are served, for three days.')]),
          for (final d in days) MnPanel(children: [
            Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_dayName('${d['date']}', today), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800))),
            for (final (i, m) in ((d['meals'] as List?) ?? []).cast<Map>().indexed) Padding(padding: EdgeInsets.only(top: i > 0 ? 12 : 0), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Padding(padding: const EdgeInsets.only(bottom: 4), child: Row(children: [
                MnMealIco(_icon[m['meal']] ?? LucideIcons.utensilsCrossed, size: 15), const SizedBox(width: 8),
                Text(_mealLabel('${m['meal']}'), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
              ])),
              for (final x in ((m['dishes'] as List?) ?? []).cast<Map>()) _DishRow(key: ValueKey('${x['date']}|${x['meal']}|${x['dish']}'), d: x, onSaved: reload),
            ])),
          ]),
        ]);
      });
}

class _DishRow extends StatefulWidget {
  final Map d;
  final Future<void> Function() onSaved;
  const _DishRow({super.key, required this.d, required this.onSaved});
  @override
  State<_DishRow> createState() => _DishRowState();
}

class _DishRowState extends State<_DishRow> {
  late int stars = (widget.d['rating'] as num?)?.toInt() ?? 0;
  late final comment = TextEditingController(text: widget.d['comment'] ?? '');
  bool open = false;
  bool busy = false;

  @override
  void dispose() { comment.dispose(); super.dispose(); }

  Future<void> save(int n, [String? text]) async {
    final t = (text ?? comment.text).trim();
    setState(() => busy = true);
    try {
      await Api.instance.put('/me/meal-ratings', {'meal_date': widget.d['date'], 'meal': widget.d['meal'], 'dish': widget.d['dish'], 'rating': n, 'comment': t.isEmpty ? null : t});
      widget.onSaved();
      if (n <= 2 && t.isEmpty && mounted) setState(() => open = true); // a low rating: ask what was wrong
    } catch (e) {
      if (mounted) { setState(() => stars = (widget.d['rating'] as num?)?.toInt() ?? 0); toast(context, e.toString(), error: true); }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void submit() {
    if (stars == 0) { toast(context, 'Give the stars first'); return; }
    save(stars, comment.text);
    setState(() => open = false);
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.d;
    final diet = d['diet'];
    final name = Wrap(spacing: 8, runSpacing: 2, crossAxisAlignment: WrapCrossAlignment.end, children: [
      Text('${d['dish']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
      if (diet != null) Text(diet == 'Veg' ? 'Veg' : 'Non-veg', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: diet == 'Veg' ? const Color(0xFF067647) : const Color(0xFFB54708))),
      if (d['option_id'] == null) const Text('Daily item', style: TextStyle(fontSize: 11.5, color: K.ink3)),
    ]);
    final starRow = Semantics(label: 'Rate ${d['dish']}', child: Row(mainAxisSize: MainAxisSize.min, children: [
      for (var n = 1; n <= 5; n++) Semantics(button: true, checked: stars == n, label: '$n star${n > 1 ? 's' : ''}: ${_word[n]}', child: InkWell(
        onTap: busy ? null : () { setState(() => stars = n); save(n); },
        borderRadius: BorderRadius.circular(6),
        child: Padding(padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 6), child: _Star(on: n <= stars)),
      )),
    ]));
    final say = Semantics(button: true, label: 'Comment on ${d['dish']}', expanded: open, child: Material(color: open ? const Color(0xFFF2FBF9) : Colors.transparent, borderRadius: BorderRadius.circular(8),
        child: InkWell(onTap: () => setState(() => open = !open), borderRadius: BorderRadius.circular(8), child: Padding(padding: const EdgeInsets.all(8), child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(LucideIcons.messageSquare, size: 16, color: open ? K.brand : K.ink3),
          if (d['comment'] != null && '${d['comment']}'.isNotEmpty) ...[const SizedBox(width: 2), Text('1', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: open ? K.brand : K.ink3))],
        ])))));
    final sentiment = d['sentiment'];
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFEEF1F6)))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        // rm-row wraps: name (140 px or more) and the stars, the comment button too when the line is wide enough
        LayoutBuilder(builder: (context, box) {
          final oneLine = box.maxWidth >= 140 + 8 + 140 + 8 + 34;
          final first = Row(children: [Expanded(child: name), const SizedBox(width: 8), starRow, if (oneLine) ...[const SizedBox(width: 8), say]]);
          return oneLine ? first : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [first, const SizedBox(height: 8), say]);
        }),
        if (stars > 0) Padding(padding: const EdgeInsets.only(top: 2), child: Text('${_word[stars]}${sentiment != null ? ' · read as ${'$sentiment'.toLowerCase()}' : ''}',
            style: const TextStyle(fontSize: 11.5, color: K.ink3))),
        if (open) Padding(padding: const EdgeInsets.only(top: 6), child: Row(children: [
          Expanded(child: TextField(
            controller: comment, maxLength: 400, autofocus: true, onSubmitted: (_) => submit(),
            style: const TextStyle(fontSize: 13.5),
            decoration: InputDecoration(
              counterText: '', hintText: 'Too salty, served cold, chala bagundi…', hintStyle: const TextStyle(fontSize: 13.5, color: K.ink3),
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFD0D5DD))),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFD0D5DD))),
            ),
          )),
          const SizedBox(width: 6),
          SizedBox(height: 38, child: Material(color: K.brand, borderRadius: BorderRadius.circular(10), child: InkWell(onTap: busy ? null : submit, borderRadius: BorderRadius.circular(10),
              child: const Padding(padding: EdgeInsets.symmetric(horizontal: 14), child: Center(child: Text('Save', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13.5))))))),
        ])),
      ]),
    );
  }
}

/// The lucide star, 22 px: grey outline, or amber and filled when on.
class _Star extends StatelessWidget {
  final bool on;
  const _Star({required this.on});
  @override
  Widget build(BuildContext context) => SizedBox(width: 22, height: 22, child: Stack(children: [
        if (on) const Positioned.fill(child: CustomPaint(painter: _StarFill())),
        Icon(LucideIcons.star, size: 22, color: on ? const Color(0xFFF5A524) : const Color(0xFFD0D5DD)),
      ]));
}

class _StarFill extends CustomPainter {
  const _StarFill();
  static const _pts = [12.0, 2.0, 15.09, 8.26, 22.0, 9.27, 17.0, 14.14, 18.18, 21.02, 12.0, 17.77, 5.82, 21.02, 7.0, 14.14, 2.0, 9.27, 8.91, 8.26];
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 24;
    final path = Path()..moveTo(_pts[0] * s, _pts[1] * s);
    for (var i = 2; i < _pts.length; i += 2) { path.lineTo(_pts[i] * s, _pts[i + 1] * s); }
    canvas.drawPath(path..close(), Paint()..color = const Color(0xFFF5A524)..strokeJoin = StrokeJoin.round);
  }
  @override
  bool shouldRepaint(_) => false;
}
