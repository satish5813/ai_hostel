import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'api.dart';
import 'theme.dart';

/* ---------- formatting ---------- */
final _inr = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
String inr(dynamic v) => _inr.format(num.tryParse('${v ?? 0}') ?? 0);
DateTime? parseDate(dynamic v) => v == null ? null : DateTime.tryParse('$v')?.toLocal();
String day(dynamic v) { final d = parseDate(v); return d == null ? '—' : DateFormat('d MMM yyyy').format(d); }
String dayTime(dynamic v) { final d = parseDate(v); return d == null ? '—' : DateFormat('d MMM, h:mm a').format(d); }
String words(String? s) => (s ?? '').replaceAll('_', ' ');
String titleCase(String? s) => (s ?? '').toLowerCase().split(' ').map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}').join(' ');
String isoDay(DateTime d) => DateFormat('yyyy-MM-dd').format(d);

/* ---------- feedback ---------- */
void toast(BuildContext context, String msg, {bool error = false}) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(msg), backgroundColor: error ? K.bad : K.ink));
}

/// Runs an action, shows what happened, and returns whether it worked.
Future<bool> act(BuildContext context, Future<dynamic> Function() run, String done) async {
  try {
    await run();
    if (context.mounted) toast(context, done);
    return true;
  } catch (e) {
    if (context.mounted) toast(context, e.toString(), error: true);
    return false;
  }
}

/* ---------- loading data ---------- */
/// Loads [path] from the API and builds from it, with a loader, an error with "Try again", and pull-to-refresh.
class ApiView extends StatefulWidget {
  final String path;
  final Widget Function(BuildContext context, dynamic data, Future<void> Function() reload) builder;
  const ApiView({super.key, required this.path, required this.builder});
  @override
  State<ApiView> createState() => ApiViewState();
}

class ApiViewState extends State<ApiView> {
  dynamic data;
  Object? error;
  bool loading = true;

  @override
  void initState() { super.initState(); reload(); }

  @override
  void didUpdateWidget(ApiView oldWidget) { super.didUpdateWidget(oldWidget); if (oldWidget.path != widget.path) reload(); }

  Future<void> reload() async {
    setState(() { loading = data == null; error = null; });
    try {
      final d = await Api.instance.get(widget.path);
      if (mounted) setState(() { data = d; loading = false; });
    } catch (e) {
      if (mounted) setState(() { error = e; loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()));
    if (error != null && data == null) return ErrorView(message: error.toString(), onRetry: reload);
    return RefreshIndicator(onRefresh: reload, child: widget.builder(context, data, reload));
  }
}

class ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const ErrorView({super.key, required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.cloud_off_rounded, size: 40, color: K.ink3), const SizedBox(height: 12),
        Text(message, textAlign: TextAlign.center, style: const TextStyle(color: K.ink2)), const SizedBox(height: 16),
        OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Try again')),
      ])));
}

class EmptyView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? body;
  const EmptyView({super.key, required this.icon, required this.title, this.body});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16), child: Column(children: [
        Icon(icon, size: 36, color: K.ink3), const SizedBox(height: 10),
        Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15), textAlign: TextAlign.center),
        if (body != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(body!, style: const TextStyle(color: K.ink3), textAlign: TextAlign.center)),
      ]));
}

/* ---------- building blocks ---------- */
/// A page body: scrolls (so pull-to-refresh always works), padded, with gaps between sections.
class PageList extends StatelessWidget {
  final List<Widget> children;
  const PageList({super.key, required this.children});
  @override
  Widget build(BuildContext context) => ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        itemCount: children.length, separatorBuilder: (_, _) => const SizedBox(height: 14), itemBuilder: (_, i) => children[i]);
}

class KCard extends StatelessWidget {
  final String? title;
  final String? subtitle;
  final IconData? icon;
  final Widget? trailing;
  final Widget child;
  final VoidCallback? onTap;
  const KCard({super.key, this.title, this.subtitle, this.icon, this.trailing, required this.child, this.onTap});
  @override
  Widget build(BuildContext context) => Card(clipBehavior: Clip.antiAlias, child: InkWell(onTap: onTap, child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (title != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Row(children: [
              if (icon != null) Container(width: 36, height: 36, margin: const EdgeInsets.only(right: 10), decoration: BoxDecoration(color: K.brandTint, borderRadius: BorderRadius.circular(11)),
                  child: Icon(icon, size: 19, color: K.brand)),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title!, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                if (subtitle != null) Text(subtitle!, style: const TextStyle(fontSize: 12.5, color: K.ink3)),
              ])),
              ?trailing,
            ])),
        child,
      ]))));
}

enum Tone { good, warn, bad, info, muted }

class Pill extends StatelessWidget {
  final String label;
  final Tone tone;
  const Pill(this.label, {super.key, this.tone = Tone.info});
  static Tone toneOf(String? status) {
    switch (status) {
      case 'Paid': case 'Approved': case 'Closed': case 'Delivered': case 'Returned': case 'Moved': case 'Resolved': case 'Done': return Tone.good;
      case 'Overdue': case 'Rejected': case 'Missed': case 'Cancelled': case 'Overdue_Return': return Tone.bad;
      case 'Pending': case 'Applied': case 'Recommended': case 'Part_Paid': case 'Open': case 'In_Progress': return Tone.warn;
      default: return Tone.info;
    }
  }
  @override
  Widget build(BuildContext context) {
    final (fg, bg) = switch (tone) { Tone.good => (K.good, K.goodBg), Tone.warn => (K.warn, K.warnBg), Tone.bad => (K.bad, K.badBg), Tone.info => (K.brand, K.brandTint), Tone.muted => (K.ink2, const Color(0xFFF2F4F7)) };
    return Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
        child: Text(label, style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w700)));
  }
}

/// The warm call-to-action button of the student portal.
class ActionButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool busy;
  const ActionButton({super.key, required this.label, this.icon, this.onPressed, this.busy = false});
  @override
  Widget build(BuildContext context) {
    final on = onPressed != null && !busy;
    return Opacity(opacity: on ? 1 : .5, child: DecoratedBox(
      decoration: BoxDecoration(gradient: K.actionGradient, borderRadius: BorderRadius.circular(999), boxShadow: on ? [BoxShadow(color: K.ember.withValues(alpha: .3), blurRadius: 14, offset: const Offset(0, 6))] : null),
      child: Material(color: Colors.transparent, child: InkWell(borderRadius: BorderRadius.circular(999), onTap: on ? onPressed : null, child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          if (busy) const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2B1405)))
          else if (icon != null) Icon(icon, size: 19, color: const Color(0xFF2B1405)),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(color: Color(0xFF2B1405), fontWeight: FontWeight.w800, fontSize: 15)),
        ]))))));
  }
}

/// A label and its value, one per line.
class InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const InfoRow(this.label, this.value, {super.key});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 5), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        SizedBox(width: 120, child: Text(label, style: const TextStyle(color: K.ink3, fontSize: 13))),
        Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14))),
      ]));
}
