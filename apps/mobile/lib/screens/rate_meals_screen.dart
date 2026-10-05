import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/api.dart';
import '../core/theme.dart';
import '../core/widgets.dart';

const _icon = {'Breakfast': Icons.coffee_rounded, 'Lunch': Icons.restaurant_rounded, 'Evening_Snacks': Icons.cookie_rounded, 'Dinner': Icons.soup_kitchen_rounded};
const _word = ['', 'Did not like it', 'Not good', 'Okay', 'Good', 'Loved it'];
String _mealLabel(String m) => m == 'Evening_Snacks' ? 'Evening snacks' : m;
DateTime _date(String iso) => DateTime.parse(iso.substring(0, 10));
String _todayIst() => isoDay(DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30)));
String _dayName(String iso, String today) {
  final diff = _date(today).difference(_date(iso)).inDays;
  return diff == 0 ? 'Today' : diff == 1 ? 'Yesterday' : DateFormat('EEEE, d MMM').format(_date(iso));
}

/// MES-02 Rate my meals. A student gives each dish they ate one to five stars, and may say why; meals of today and the
/// last three days can be rated or changed. The mess sees the ratings together, never the student's name.
class RateMealsScreen extends StatelessWidget {
  const RateMealsScreen({super.key});
  @override
  Widget build(BuildContext context) => ApiView(path: '/me/meal-ratings', builder: (context, data, reload) {
        final days = (((data as Map?)?['days'] as List?) ?? []).cast<Map>();
        final dishes = [for (final d in days) for (final m in (d['meals'] as List).cast<Map>()) ...(m['dishes'] as List).cast<Map>()];
        final rated = dishes.where((x) => x['rating'] != null).length;
        final today = _todayIst();
        return PageList(children: [
          KCard(
            title: 'Rate my meals', subtitle: 'Your stars tell the mess what to cook again. Nobody sees your name.', icon: Icons.star_rounded,
            child: dishes.isEmpty ? const SizedBox.shrink() : Align(alignment: Alignment.centerLeft,
                child: Pill('$rated of ${dishes.length} dishes rated', tone: rated == dishes.length ? Tone.good : Tone.info)),
          ),
          if (days.isEmpty)
            const KCard(child: EmptyView(icon: Icons.restaurant_rounded, title: 'Nothing to rate yet', body: 'Meals you eat appear here once they are served, for three days.')),
          for (final d in days)
            KCard(
              title: _dayName(d['date'], today), icon: Icons.calendar_today_rounded,
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                for (final m in (d['meals'] as List).cast<Map>()) ...[
                  Padding(padding: const EdgeInsets.only(top: 4, bottom: 4), child: Row(children: [
                    Icon(_icon[m['meal']] ?? Icons.restaurant_rounded, size: 17, color: K.brand), const SizedBox(width: 8),
                    Text(_mealLabel('${m['meal']}'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                  ])),
                  for (final x in (m['dishes'] as List).cast<Map>())
                    _DishRow(key: ValueKey('${x['date']}|${x['meal']}|${x['dish']}'), d: x, onSaved: reload),
                  const SizedBox(height: 6),
                ],
              ]),
            ),
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

  Future<void> save(int n, {String? text}) async {
    final t = (text ?? comment.text).trim();
    setState(() { stars = n; busy = true; });
    try {
      await Api.instance.put('/me/meal-ratings', {'meal_date': widget.d['date'], 'meal': widget.d['meal'], 'dish': widget.d['dish'], 'rating': n, 'comment': t.isEmpty ? null : t});
      if (mounted && n <= 2 && t.isEmpty) setState(() => open = true); // a low rating: ask what was wrong
      if (text != null && mounted) toast(context, 'Comment saved');
      await widget.onSaved();
    } catch (e) {
      if (mounted) { setState(() => stars = (widget.d['rating'] as num?)?.toInt() ?? 0); toast(context, e.toString(), error: true); }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.d;
    final hasComment = (d['comment'] ?? '').toString().isNotEmpty;
    return Container(
      margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.fromLTRB(12, 10, 6, 10),
      decoration: BoxDecoration(color: const Color(0xFFF9FAFB), borderRadius: BorderRadius.circular(14), border: Border.all(color: K.line)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Wrap(spacing: 6, runSpacing: 4, crossAxisAlignment: WrapCrossAlignment.center, children: [
            Text('${d['dish']}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5)),
            if (d['diet'] != null) Pill(d['diet'] == 'Veg' ? 'Veg' : 'Non-veg', tone: d['diet'] == 'Veg' ? Tone.good : Tone.bad),
            if (d['option_id'] == null) const Pill('Daily item', tone: Tone.muted),
          ])),
          IconButton(
            tooltip: 'Comment on ${d['dish']}', onPressed: () => setState(() => open = !open),
            icon: Badge(isLabelVisible: hasComment, label: const Text('1'), child: Icon(open ? Icons.chat_bubble_rounded : Icons.chat_bubble_outline_rounded, size: 20, color: K.ink2)),
          ),
        ]),
        Row(children: [
          for (var n = 1; n <= 5; n++)
            Semantics(label: '$n star${n > 1 ? 's' : ''}: ${_word[n]}', selected: stars == n, button: true, child: InkResponse(
              radius: 22, onTap: busy ? null : () => save(n),
              child: Padding(padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 2),
                  child: Icon(n <= stars ? Icons.star_rounded : Icons.star_outline_rounded, size: 32, color: n <= stars ? const Color(0xFFF5A524) : K.ink3)),
            )),
          const SizedBox(width: 8),
          if (busy) const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
          else if (stars > 0) Flexible(child: Text('${_word[stars]}${d['sentiment'] != null ? ' · read as ${'${d['sentiment']}'.toLowerCase()}' : ''}',
              style: const TextStyle(color: K.ink3, fontSize: 12.5))),
        ]),
        if (open) Padding(padding: const EdgeInsets.only(top: 8, right: 6), child: Row(children: [
          Expanded(child: TextField(
            controller: comment, maxLength: 400, textInputAction: TextInputAction.done,
            decoration: InputDecoration(hintText: 'Too salty, served cold, chala bagundi…', labelText: 'What did you think of ${d['dish']}?', counterText: '', isDense: true),
            onSubmitted: (_) => _submit(),
          )),
          const SizedBox(width: 8),
          FilledButton(onPressed: busy ? null : _submit, child: const Text('Save')),
        ])),
      ]),
    );
  }

  void _submit() {
    if (stars == 0) { toast(context, 'Give the stars first', error: true); return; }
    setState(() => open = false);
    save(stars, text: comment.text);
  }
}
