import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

/// TKT-07 Complaints, as pages/care/Complaints.tsx: a problem with a meal goes to the Mess In-charge; anything else
/// that is not a repair goes to the wardens, or only to the Chief Warden and Dean when confidential. Replies show here.
class ComplaintsScreen extends StatefulWidget {
  const ComplaintsScreen({super.key});
  @override
  State<ComplaintsScreen> createState() => _ComplaintsScreenState();
}

const _meals = [('Breakfast', 'Breakfast'), ('Lunch', 'Lunch'), ('Evening_Snacks', 'Snacks'), ('Dinner', 'Dinner')];
const _cat = {'Room_Mate': 'Room-mate', 'Discipline': 'Discipline', 'Mess': 'Mess', 'Staff_Conduct': 'Staff conduct', 'Ragging': 'Ragging', 'Safety': 'Safety', 'Other': 'Other'};
const _gstatus = {'Open': ('Open', 'warn'), 'In_Review': ('Being looked into', 'warn'), 'Escalated': ('With the Chief Warden', 'bad'), 'Closed': ('Closed', 'good')};
/// A day n days back, in India time, as YYYY-MM-DD.
String _back(int n) => isoDay(DateTime.now().toUtc().add(const Duration(minutes: 330)).subtract(Duration(days: n)));
String _when(dynamic s) { final d = parseDate(s); return d == null ? '' : DateFormat('d MMM').format(d); }

// the .mo palette
const _line = Color(0xFFE4E8EF), _tint = Color(0xFFE6F4F1), _ink2 = Color(0xFF475467), _goodBg = Color(0xFFECFDF3), _hair = Color(0xFFD0D5DD);

class _ComplaintsScreenState extends State<ComplaintsScreen> {
  Map? mess;
  bool messLoaded = false;
  List<Map>? mine;
  String? kind;

  @override
  void initState() { super.initState(); loadMess(); loadMine(); }

  Future<void> loadMess() async { try { final r = await api.get('/me/mess-grievances'); if (mounted) setState(() => mess = r as Map?); } catch (_) {} finally { if (mounted) setState(() => messLoaded = true); } }
  Future<void> loadMine() async { try { final r = await api.get('/me/grievances'); if (mounted) setState(() => mine = ((r as List?) ?? []).cast<Map>()); } catch (_) {} }

  @override
  Widget build(BuildContext context) {
    final m = mess?['mess'] as Map?;
    final mg = ((mess?['grievances'] as List?) ?? []).cast<Map>();
    final gs = mine ?? [];
    return RefreshIndicator(onRefresh: () => Future.wait([loadMess(), loadMine()]), child: ListView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 16, 16, 90), children: [
      // mn-head
      Panel(child: Row(children: [
        Container(width: 40, height: 40, decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF12B886), K.brand], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(12)), child: const Icon(LucideIcons.messageSquareWarning, size: 20, color: Colors.white)),
        const SizedBox(width: 12),
        const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Complaints', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: K.ink)),
          Text('About a meal, or anything else that is not a repair. For a broken fan or tap, use Repairs.', style: TextStyle(fontSize: 12, color: K.ink3)),
        ])),
      ])),
      const SizedBox(height: 18),
      Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        _Kind(LucideIcons.utensils, 'A problem with a meal', m != null ? 'Goes to the ${m['mess_name']} in-charge' : messLoaded ? 'You are not taking meals in a hostel mess' : 'Loading…',
            kind == 'meal', m == null ? null : () => setState(() => kind = 'meal')),
        const SizedBox(height: 12),
        _Kind(LucideIcons.messageSquareWarning, 'Something else', 'Room-mate, staff, discipline, ragging, safety', kind == 'other', () => setState(() => kind = 'other')),
        if (kind == 'meal') _MealForm(key: const ValueKey('meal'), onDone: () { setState(() => kind = null); loadMess(); }),
        if (kind == 'other') _OtherForm(key: const ValueKey('other'), onDone: () { setState(() => kind = null); loadMine(); }),
      ])),
      if (mg.length + gs.length > 0) ...[
        const SizedBox(height: 18),
        Panel(title: 'My complaints', child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, spacing: 8, children: [
          for (final g in mg) _Mine('${_meals.where((x) => x.$1 == g['slot']).firstOrNull?.$2}, ${_when(g['meal_date'])}', '${g['details']}', g['action_taken'] != null ? 'Mess: ${g['action_taken']}' : null,
              _XdPill(g['status'] == 'Open' ? 'Waiting for reply' : '${g['status']}', g['status'] == 'Open' ? 'warn' : 'good')),
          for (final g in gs) _Mine('${_cat[g['category']]}, ${_when(g['raised_at'])}', '${g['description']}', g['action_taken'] != null && g['status'] == 'Closed' ? '${g['action_taken']}' : null,
              _XdPill(_gstatus[g['status']]?.$1 ?? '${g['status']}', _gstatus[g['status']]?.$2 ?? 'warn', lock: g['is_confidential'] == true)),
        ])),
      ],
    ]));
  }
}

class _MealForm extends StatefulWidget {
  final VoidCallback onDone;
  const _MealForm({super.key, required this.onDone});
  @override
  State<_MealForm> createState() => _MealFormState();
}

class _MealFormState extends State<_MealForm> {
  var date = _back(0), slot = 'Lunch', aspect = 'Quality', rating = 0, busy = false;
  final text = TextEditingController();

  Future<void> send() async {
    setState(() => busy = true);
    try {
      await api.post('/me/mess-grievances', {'meal_date': date, 'slot': slot, 'aspect': aspect, 'details': text.text, 'rating': rating == 0 ? null : rating});
      if (mounted) toast(context, 'Sent to the mess in-charge');
      widget.onDone();
    } catch (e) { if (mounted) toast(context, '$e', error: true); }
    finally { if (mounted) setState(() => busy = false); }
  }

  @override
  Widget build(BuildContext context) => _Form(children: [
        _Chips([for (final n in [0, 1, 2]) (n == 0 ? 'Today' : n == 1 ? 'Yesterday' : _when(_back(n)), date == _back(n), () => setState(() => date = _back(n)))]),
        _Chips([for (final (v, l) in _meals) (l, slot == v, () => setState(() => slot = v))]),
        _Chips([for (final (v, l) in const [('Quality', 'Taste or quality'), ('Quantity', 'Not enough'), ('Both', 'Both')]) (l, aspect == v, () => setState(() => aspect = v))]),
        _Chips([for (final n in [1, 2, 3, 4, 5]) ('★' * n, rating == n, () => setState(() => rating = rating == n ? 0 : n))]),
        _why(text, 3, 'What was wrong? For example: the rice was undercooked and the curd ran out by 1:15.', () => setState(() {})),
        _Acts(KButton('Send to the mess', busy: busy, onPressed: text.text.trim().length < 10 ? null : send), text.text.trim().length < 10 ? 'Say what was wrong.' : null),
      ]);
}

class _OtherForm extends StatefulWidget {
  final VoidCallback onDone;
  const _OtherForm({super.key, required this.onDone});
  @override
  State<_OtherForm> createState() => _OtherFormState();
}

class _OtherFormState extends State<_OtherForm> {
  var cat = 'Room_Mate', conf = false, busy = false;
  final text = TextEditingController();
  bool get always => cat == 'Ragging' || cat == 'Safety';

  Future<void> send() async {
    setState(() => busy = true);
    try {
      await api.post('/me/grievances', {'category': cat, 'description': text.text, 'is_confidential': conf || always});
      if (mounted) toast(context, conf || always ? 'Sent to the Chief Warden in confidence' : 'Sent to your wardens');
      widget.onDone();
    } catch (e) { if (mounted) toast(context, '$e', error: true); }
    finally { if (mounted) setState(() => busy = false); }
  }

  @override
  Widget build(BuildContext context) => _Form(children: [
        _Chips([for (final e in _cat.entries.where((e) => e.key != 'Mess')) (e.value, cat == e.key, () => setState(() => cat = e.key))]),
        _why(text, 4, 'What happened, when and where.', () => setState(() {})),
        InkWell(onTap: always ? null : () => setState(() => conf = !conf), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 16, height: 18, child: Checkbox(value: conf || always, onChanged: always ? null : (v) => setState(() => conf = v ?? false), activeColor: K.brand,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap, visualDensity: VisualDensity.compact)),
          const SizedBox(width: 6),
          const Padding(padding: EdgeInsets.only(top: 2), child: Icon(LucideIcons.lock, size: 14, color: K.ink)),
          const SizedBox(width: 6),
          Expanded(child: Text('Confidential: only the Chief Warden and the Dean see it${always ? ' (always for ragging and safety)' : ''}',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: K.ink))),
        ])),
        _Acts(KButton('Send', busy: busy, onPressed: text.text.trim().length < 10 ? null : send), text.text.trim().length < 10 ? 'Describe what happened.' : null),
      ]);
}

/* ------------------------------------------------------------ small pieces */

/// mo-form: 16 px under the choice, 12 px between its parts.
class _Form extends StatelessWidget {
  final List<Widget> children;
  const _Form({required this.children});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(top: 16), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        for (final (i, c) in children.indexed) Padding(padding: EdgeInsets.only(top: i == 0 ? 0 : 12), child: c),
      ]));
}

/// rc-kinds button: a big choice with an icon, a bold line and a small one; off when it does not apply.
class _Kind extends StatelessWidget {
  final IconData icon;
  final String title, sub;
  final bool on;
  final VoidCallback? onTap;
  const _Kind(this.icon, this.title, this.sub, this.on, this.onTap);
  @override
  Widget build(BuildContext context) => Opacity(opacity: onTap == null ? .5 : 1, child: Container(
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), boxShadow: on ? const [BoxShadow(color: Color(0x260B7A71), spreadRadius: 3)] : null),
      child: Material(color: on ? _tint : Colors.white, borderRadius: BorderRadius.circular(16), child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(16),
          child: Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(borderRadius: BorderRadius.circular(16), border: Border.all(color: on ? K.brand : _line, width: 1.5)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Icon(icon, size: 22, color: K.brand), const SizedBox(height: 8),
                Text(title, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700, color: K.ink)), const SizedBox(height: 4),
                Text(sub, style: const TextStyle(fontSize: 12, color: K.ink3)),
              ]))))));
}

/// mo-chips: pill buttons, teal when chosen.
class _Chips extends StatelessWidget {
  final List<(String, bool, VoidCallback)> items;
  const _Chips(this.items);
  @override
  Widget build(BuildContext context) => Wrap(spacing: 6, runSpacing: 6, children: [
        for (final (l, on, tap) in items) Material(color: on ? K.brand : Colors.white, shape: StadiumBorder(side: BorderSide(color: on ? K.brand : _hair)), child: InkWell(onTap: tap, customBorder: const StadiumBorder(),
            child: Padding(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7), child: Text(l, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: on ? Colors.white : K.ink))))),
      ]);
}

/// rc-why: the text box, 15 px, 12 px corners.
Widget _why(TextEditingController c, int rows, String hint, VoidCallback changed) {
  OutlineInputBorder b(Color c, [double w = 1]) => OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: c, width: w));
  return TextField(controller: c, minLines: rows, maxLines: null, onChanged: (_) => changed(), style: const TextStyle(fontSize: 15, color: K.ink),
      decoration: InputDecoration(hintText: hint, hintMaxLines: rows, hintStyle: const TextStyle(fontSize: 15, color: Color(0xFF8A919E)), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          enabledBorder: b(_hair), border: b(_hair), focusedBorder: b(K.brand, 2)));
}

/// rc-acts: the button on the right, 14 px below; when blocked, it says why under it.
class _Acts extends StatelessWidget {
  final KButton button;
  final String? reason;
  const _Acts(this.button, this.reason);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(top: 14), child: Align(alignment: Alignment.centerRight, child: reason == null ? button
      : Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          button,
          Padding(padding: const EdgeInsets.only(top: 6), child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 340), child: Row(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Icon(LucideIcons.lock, size: 14, color: K.ink2), const SizedBox(width: 4),
            Flexible(child: Text(reason!, style: const TextStyle(fontSize: 12, height: 16 / 12, color: K.ink2))),
          ]))),
        ])));
}

/// One of my complaints (mo-mine li): bold what and when, the text, the reply in green, the status on the right.
class _Mine extends StatelessWidget {
  final String head, body;
  final String? reply;
  final Widget pill;
  const _Mine(this.head, this.body, this.reply, this.pill);
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: _line)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text.rich(TextSpan(children: [TextSpan(text: head, style: const TextStyle(fontWeight: FontWeight.w700)), TextSpan(text: ' $body')]), style: const TextStyle(fontSize: 14, color: K.ink)),
          if (reply != null) Container(margin: const EdgeInsets.only(top: 4), padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(color: _goodBg, borderRadius: BorderRadius.circular(8)), child: Text(reply!, style: const TextStyle(fontSize: 12, color: _ink2))),
        ])),
        const SizedBox(width: 12),
        pill,
      ]));
}

/// xd-pill, with the lock of a confidential complaint in the tone's colour.
class _XdPill extends StatelessWidget {
  final String label, tone;
  final bool lock;
  const _XdPill(this.label, this.tone, {this.lock = false});
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: const {'good': Color(0xFFE7F6E7), 'warn': Color(0xFFFFF5DC), 'bad': Color(0xFFFCE9E9)}[tone] ?? K.hover, borderRadius: BorderRadius.circular(999)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (lock) ...[Icon(LucideIcons.lock, size: 11, color: const {'good': Color(0xFF067647), 'warn': Color(0xFFB07800), 'bad': Color(0xFFB42318)}[tone] ?? K.ink), const SizedBox(width: 4)],
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: K.ink)),
      ]));
}
