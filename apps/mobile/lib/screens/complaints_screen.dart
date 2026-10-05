import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

const _meals = [('Breakfast', 'Breakfast'), ('Lunch', 'Lunch'), ('Evening_Snacks', 'Snacks'), ('Dinner', 'Dinner')];
const _aspects = [('Quality', 'Taste or quality'), ('Quantity', 'Not enough'), ('Both', 'Both')];
const _cat = {'Room_Mate': 'Room-mate', 'Discipline': 'Discipline', 'Mess': 'Mess', 'Staff_Conduct': 'Staff conduct', 'Ragging': 'Ragging', 'Safety': 'Safety', 'Other': 'Other'};
const _gStatus = {
  'Open': ('Open', Tone.warn),
  'In_Review': ('Being looked into', Tone.warn),
  'Escalated': ('With the Chief Warden', Tone.bad),
  'Closed': ('Closed', Tone.good),
};
String _when(dynamic s) { final d = parseDate(s); return d == null ? '—' : DateFormat('d MMM').format(d); }

/// Complaints (TKT-07): a problem with a meal goes to the Mess In-charge; anything else that is not a repair (room-mate,
/// staff conduct, ragging, safety) goes to the wardens, or only to the Chief Warden and Dean when confidential. Replies
/// show under My complaints.
class ComplaintsScreen extends StatefulWidget {
  const ComplaintsScreen({super.key});
  @override
  State<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

class _ComplaintsScreenState extends State<ComplaintsScreen> {
  Map? mess;
  List<Map> mine = [];
  Object? error;
  bool loading = true;
  String? kind;

  @override
  void initState() { super.initState(); load(); }

  Future<void> load() async {
    try {
      final r = await Future.wait([api.get('/me/mess-grievances'), api.get('/me/grievances')]);
      if (!mounted) return;
      setState(() { mess = r[0] as Map?; mine = ((r[1] as List?) ?? []).cast<Map>(); error = null; loading = false; });
    } catch (e) {
      if (mounted) setState(() { error = e; loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()));
    if (error != null && mess == null) return ErrorView(message: error.toString(), onRetry: () { setState(() => loading = true); load(); });
    final messName = (mess?['mess'] as Map?)?['mess_name'];
    final messG = ((mess?['grievances'] as List?) ?? []).cast<Map>();

    return RefreshIndicator(
      onRefresh: load,
      child: PageList(children: [
        KCard(
          icon: Icons.feedback_rounded,
          title: 'Complaints',
          subtitle: 'About a meal, or anything else that is not a repair.',
          child: Row(children: [
            const Expanded(child: Text('For a broken fan or tap, use Repairs.', style: TextStyle(color: K.ink3, fontSize: 13))),
            TextButton(onPressed: () => openPlace(context, 'repairs'), child: const Text('Repairs')),
          ]),
        ),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: _Kind(
            icon: Icons.restaurant_rounded, title: 'A problem with a meal',
            body: messName != null ? 'Goes to the $messName in-charge' : 'You are not taking meals in a hostel mess',
            selected: kind == 'meal', onTap: messName == null ? null : () => setState(() => kind = kind == 'meal' ? null : 'meal'),
          )),
          const SizedBox(width: 10),
          Expanded(child: _Kind(
            icon: Icons.report_rounded, title: 'Something else', body: 'Room-mate, staff, discipline, ragging, safety',
            selected: kind == 'other', onTap: () => setState(() => kind = kind == 'other' ? null : 'other'),
          )),
        ]),
        if (kind == 'meal') _MealForm(onDone: () { setState(() => kind = null); load(); }),
        if (kind == 'other') _OtherForm(onDone: () { setState(() => kind = null); load(); }),
        KCard(
          icon: Icons.forum_rounded,
          title: 'My complaints',
          child: messG.isEmpty && mine.isEmpty
              ? const EmptyView(icon: Icons.forum_rounded, title: 'No complaints yet', body: 'What you send, and the replies, appear here.')
              : Column(children: [
                  for (final g in messG)
                    _Item(
                      title: '${_meals.where((m) => m.$1 == g['slot']).firstOrNull?.$2 ?? words(g['slot'])}, ${_when(g['meal_date'])}',
                      text: '${g['details'] ?? ''}',
                      reply: g['action_taken'] == null ? null : 'Mess: ${g['action_taken']}',
                      pill: Pill(g['status'] == 'Open' ? 'Waiting for reply' : words(g['status']), tone: g['status'] == 'Open' ? Tone.warn : Tone.good),
                    ),
                  for (final g in mine)
                    _Item(
                      title: '${_cat[g['category']] ?? words(g['category'])}, ${_when(g['raised_at'])}',
                      text: '${g['description'] ?? ''}',
                      reply: g['action_taken'] != null && g['status'] == 'Closed' ? '${g['action_taken']}' : null,
                      confidential: g['is_confidential'] == true,
                      pill: Pill(_gStatus[g['status']]?.$1 ?? words(g['status']), tone: _gStatus[g['status']]?.$2 ?? Tone.warn),
                    ),
                ]),
        ),
      ]),
    );
  }
}

class _Kind extends StatelessWidget {
  final IconData icon;
  final String title;
  final String body;
  final bool selected;
  final VoidCallback? onTap;
  const _Kind({required this.icon, required this.title, required this.body, required this.selected, this.onTap});
  @override
  Widget build(BuildContext context) => Opacity(
        opacity: onTap == null ? .5 : 1,
        child: Material(
          color: selected ? K.brandTint : Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: selected ? K.brand : K.line, width: selected ? 2 : 1)),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Icon(icon, color: K.brand),
                const SizedBox(height: 8),
                Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                Text(body, style: const TextStyle(color: K.ink3, fontSize: 12)),
              ]),
            ),
          ),
        ),
      );
}

class _Item extends StatelessWidget {
  final String title;
  final String text;
  final String? reply;
  final Pill pill;
  final bool confidential;
  const _Item({required this.title, required this.text, required this.pill, this.reply, this.confidential = false});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
            Text(text, style: const TextStyle(color: K.ink2, fontSize: 13)),
            if (reply != null)
              Container(
                margin: const EdgeInsets.only(top: 6),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: K.goodBg, borderRadius: BorderRadius.circular(10)),
                child: Text(reply!, style: const TextStyle(color: K.good, fontSize: 12.5, fontWeight: FontWeight.w600)),
              ),
          ])),
          const SizedBox(width: 8),
          Row(mainAxisSize: MainAxisSize.min, children: [
            if (confidential) const Padding(padding: EdgeInsets.only(right: 4), child: Icon(Icons.lock_rounded, size: 14, color: K.ink3)),
            pill,
          ]),
        ]),
      );
}

Widget _label(String s) => Padding(padding: const EdgeInsets.only(top: 12, bottom: 6), child: Text(s, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: K.ink2)));

Widget _chips<T>(List<(T, String)> options, T value, ValueChanged<T> onPick) => Wrap(spacing: 6, runSpacing: 6, children: [
      for (final (v, l) in options)
        ChoiceChip(
          label: Text(l), selected: value == v, onSelected: (_) => onPick(v),
          labelStyle: TextStyle(color: value == v ? Colors.white : K.ink, fontWeight: FontWeight.w600), showCheckmark: false,
        ),
    ]);

/* ---------------------------------------------------------------- a meal */

class _MealForm extends StatefulWidget {
  final VoidCallback onDone;
  const _MealForm({required this.onDone});
  @override
  State<_MealForm> createState() => _MealFormState();
}

class _MealFormState extends State<_MealForm> {
  late String date = isoDay(DateTime.now());
  String slot = 'Lunch';
  String aspect = 'Quality';
  int rating = 0;
  final text = TextEditingController();
  bool busy = false;

  @override
  void dispose() { text.dispose(); super.dispose(); }

  Future<void> _send() async {
    setState(() => busy = true);
    final ok = await act(context, () => api.post('/me/mess-grievances', {'meal_date': date, 'slot': slot, 'aspect': aspect, 'details': text.text.trim(), 'rating': rating == 0 ? null : rating}),
        'Sent to the mess in-charge');
    if (!mounted) return;
    setState(() => busy = false);
    if (ok) widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final days = [for (var n = 0; n < 3; n++) DateTime(now.year, now.month, now.day - n)];
    final blocked = text.text.trim().length < 10 ? 'Say what was wrong.' : null;
    return KCard(
      icon: Icons.restaurant_rounded,
      title: 'A problem with a meal',
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _label('Day'),
        _chips([for (final (n, d) in days.indexed) (isoDay(d), n == 0 ? 'Today' : n == 1 ? 'Yesterday' : _when(d))], date, (v) => setState(() => date = v)),
        _label('Meal'),
        _chips(_meals, slot, (v) => setState(() => slot = v)),
        _label('What was wrong'),
        _chips(_aspects, aspect, (v) => setState(() => aspect = v)),
        _label('Rating (optional)'),
        Row(children: [
          for (var n = 1; n <= 5; n++)
            IconButton(
              tooltip: '$n star${n == 1 ? '' : 's'}',
              onPressed: () => setState(() => rating = rating == n ? 0 : n),
              icon: Icon(n <= rating ? Icons.star_rounded : Icons.star_outline_rounded, color: n <= rating ? K.ember : K.ink3, size: 30),
            ),
        ]),
        const SizedBox(height: 8),
        TextField(
          controller: text, minLines: 3, maxLines: 5, onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(hintText: 'What was wrong? For example: the rice was undercooked and the curd ran out by 1:15.'),
        ),
        const SizedBox(height: 16),
        Center(child: ActionButton(label: 'Send to the mess', icon: Icons.send_rounded, busy: busy, onPressed: blocked == null ? _send : null)),
        if (blocked != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(blocked, textAlign: TextAlign.center, style: const TextStyle(color: K.ink3, fontSize: 12.5))),
      ]),
    );
  }
}

/* ---------------------------------------------------------------- anything else */

class _OtherForm extends StatefulWidget {
  final VoidCallback onDone;
  const _OtherForm({required this.onDone});
  @override
  State<_OtherForm> createState() => _OtherFormState();
}

class _OtherFormState extends State<_OtherForm> {
  String cat = 'Room_Mate';
  bool conf = false;
  final text = TextEditingController();
  bool busy = false;

  @override
  void dispose() { text.dispose(); super.dispose(); }

  bool get alwaysConf => cat == 'Ragging' || cat == 'Safety';

  Future<void> _send() async {
    final secret = conf || alwaysConf;
    setState(() => busy = true);
    final ok = await act(context, () => api.post('/me/grievances', {'category': cat, 'description': text.text.trim(), 'is_confidential': secret}),
        secret ? 'Sent to the Chief Warden in confidence' : 'Sent to your wardens');
    if (!mounted) return;
    setState(() => busy = false);
    if (ok) widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    final blocked = text.text.trim().length < 10 ? 'Describe what happened.' : null;
    return KCard(
      icon: Icons.report_rounded,
      title: 'Something else',
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _label('About'),
        _chips([for (final e in _cat.entries) if (e.key != 'Mess') (e.key, e.value)], cat, (v) => setState(() => cat = v)),
        const SizedBox(height: 12),
        TextField(
          controller: text, minLines: 4, maxLines: 6, onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(hintText: 'What happened, when and where.'),
        ),
        const SizedBox(height: 8),
        CheckboxListTile(
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          value: conf || alwaysConf,
          onChanged: alwaysConf ? null : (v) => setState(() => conf = v ?? false),
          title: Row(children: [
            const Icon(Icons.lock_rounded, size: 15, color: K.ink2),
            const SizedBox(width: 6),
            Expanded(child: Text('Confidential: only the Chief Warden and the Dean see it${alwaysConf ? ' (always for ragging and safety)' : ''}', style: const TextStyle(fontSize: 13.5))),
          ]),
        ),
        const SizedBox(height: 8),
        Center(child: ActionButton(label: 'Send', icon: Icons.send_rounded, busy: busy, onPressed: blocked == null ? _send : null)),
        if (blocked != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(blocked, textAlign: TextAlign.center, style: const TextStyle(color: K.ink3, fontSize: 12.5))),
      ]),
    );
  }
}
