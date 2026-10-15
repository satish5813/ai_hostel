import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'api.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
export 'package:lucide_icons_flutter/lucide_icons.dart';
import 'theme.dart';

/* ---------- formatting ---------- */
final _inr = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
String inr(dynamic v) => _inr.format(num.tryParse('${v ?? 0}') ?? 0);
DateTime? parseDate(dynamic v) => v == null ? null : DateTime.tryParse('$v')?.toLocal();
/// Dates and times as the web portal shows them: 05 Oct 2026, and 05 Oct 2026, 4:00 pm.
String day(dynamic v) { final d = parseDate(v); return d == null ? '—' : DateFormat('dd MMM yyyy').format(d); }
String dayTime(dynamic v) { final d = parseDate(v); return d == null ? '—' : '${DateFormat('dd MMM yyyy').format(d)}, ${DateFormat('h:mm a').format(d).toLowerCase()}'; }
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

/// The KL logo (official artwork, never recoloured). [full] adds "Deemed to be University".
class KlLogo extends StatelessWidget {
  final double height;
  final bool full;
  const KlLogo({super.key, this.height = 26, this.full = false});
  @override
  Widget build(BuildContext context) => Image.asset(full ? 'assets/brand/kl-logo.png' : 'assets/brand/kl-mark.png', height: height, fit: BoxFit.contain,
      semanticLabel: 'KL Deemed to be University', filterQuality: FilterQuality.medium);
}

/// A module icon on its gradient (the web's st-ico), or on its soft tint with [soft].
class ModIcon extends StatelessWidget {
  final IconData icon;
  final Mod mod;
  final double size;
  final bool soft;
  const ModIcon(this.icon, this.mod, {super.key, this.size = 40, this.soft = false});
  @override
  Widget build(BuildContext context) => Container(width: size, height: size,
      decoration: BoxDecoration(gradient: soft ? null : mod.grad, color: soft ? mod.bg : null, borderRadius: BorderRadius.circular(size * .3),
          boxShadow: soft ? null : [BoxShadow(color: mod.glow, blurRadius: 18, spreadRadius: -10, offset: const Offset(0, 10))]),
      child: Icon(icon, size: size * .5, color: soft ? mod.fg : mod.on));
}

/// A white card (klh-card with the app skin): 20 px corners, hairline border, soft shadow, an optional head.
class KCard extends StatelessWidget {
  final String? title;
  final String? subtitle;
  final IconData? icon;
  final Mod? mod;
  final Widget? trailing;
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets padding;
  final Color? borderColor;
  const KCard({super.key, this.title, this.subtitle, this.icon, this.mod, this.trailing, required this.child, this.onTap, this.padding = const EdgeInsets.fromLTRB(20, 18, 20, 18), this.borderColor});
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: borderColor ?? const Color(0xCCE3E7F0)), boxShadow: K.panelShadow),
        child: Material(type: MaterialType.transparency, child: InkWell(borderRadius: BorderRadius.circular(20), onTap: onTap, child: Padding(padding: padding, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (title != null) Padding(padding: const EdgeInsets.only(bottom: 12), child: Row(children: [
                if (icon != null) Padding(padding: const EdgeInsets.only(right: 12), child: ModIcon(icon!, mod ?? Mod.teal, size: 36, soft: true)),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title!, style: const TextStyle(fontSize: 15, height: 22 / 15, fontWeight: FontWeight.w600)),
                  if (subtitle != null) Text(subtitle!, style: const TextStyle(fontSize: 12, height: 16 / 12, color: K.ink2)),
                ])),
                ?trailing,
              ])),
          child,
        ])))));
}

/// The home's panel (st-panel): white, 18 px corners, a bold 15.5 px heading and an optional link on the right.
class Panel extends StatelessWidget {
  final String? title;
  final String? sub;
  final Widget? link;
  final Widget child;
  const Panel({super.key, this.title, this.sub, this.link, required this.child});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: K.line), boxShadow: K.cardShadow),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // the link has margin-left: auto on the web, so at phone width it wraps to its own line on the right
          if (title != null) Padding(padding: EdgeInsets.only(bottom: sub != null || link != null ? 14 : 10), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Wrap(crossAxisAlignment: WrapCrossAlignment.end, spacing: 10, runSpacing: 4, children: [
                  Text(title!, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w800)),
                  if (sub != null) Text(sub!, style: const TextStyle(fontSize: 14, color: K.ink3)),
                ]),
                if (link != null) Padding(padding: const EdgeInsets.only(top: 4), child: Align(alignment: Alignment.centerRight, child: link)),
              ])),
          child,
        ]),
      );
}

/// A teal text link with an arrow (st-link).
class KLink extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final IconData? icon;
  const KLink(this.label, this.onTap, {super.key, this.icon});
  @override
  Widget build(BuildContext context) => InkWell(onTap: onTap, borderRadius: BorderRadius.circular(4), child: Padding(padding: const EdgeInsets.symmetric(vertical: 2), child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 15, color: K.brand), const SizedBox(width: 6)],
        Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: K.brand)),
        const SizedBox(width: 4), const Icon(LucideIcons.arrowRight, size: 14, color: K.brand),
      ])));
}

enum Tone { good, warn, bad, info, muted, progress }

/// A status chip (klh-chip): the word, a dot, a hairline in the tone's ink. Same word, same tone, everywhere.
class Pill extends StatelessWidget {
  final String label;
  final Tone tone;
  const Pill(this.label, {super.key, this.tone = Tone.info});
  /// A status value as a chip in its fixed tone (design-system table), shown with spaces for underscores.
  factory Pill.status(String? status, {Key? key}) => Pill(words(status), key: key, tone: toneOf(status));
  static const _good = {'Active', 'Confirmed', 'Checked_In', 'Accepted', 'Paid', 'Credited', 'Approved', 'Vacant', 'In_Room', 'In_Hostel', 'Returned', 'Delivered', 'Good', 'Verified', 'Success', 'Resolved', 'Moved', 'Done', 'Completed'};
  static const _progress = {'Fee_Paid', 'Allotted', 'Parent_Recommended', 'L1_Approved', 'L2_Approved', 'Recommended', 'Occupied', 'Day_Or_More', 'In_Progress', 'Assigned'};
  static const _info = {'Applied', 'Out', 'On_Campus', 'Outside_On_Pass', 'Transferred', 'Acknowledged', 'Auto', 'Handover', 'Info', 'Same_Day', 'Scan', 'Camera'};
  static const _warn = {'Pending', 'Waitlisted', 'Held', 'Part_Paid', 'On_Sick_Leave', 'Not_Seen', 'Open', 'Fair', 'Warning', 'Reopened'};
  static const _bad = {'Overdue', 'Rejected', 'Failed', 'Faulty', 'Suspended', 'Outside_No_Pass', 'Missed', 'Damaged', 'Missing', 'Expired', 'Critical', 'Overdue_Return'};
  static Tone toneOf(String? s) => _good.contains(s) ? Tone.good : _progress.contains(s) ? Tone.progress : _info.contains(s) ? Tone.info
      : _warn.contains(s) ? Tone.warn : _bad.contains(s) ? Tone.bad : Tone.muted;
  @override
  Widget build(BuildContext context) {
    final (fg, bg) = switch (tone) {
      Tone.good => (K.good, K.goodBg), Tone.warn => (K.warn, K.warnBg), Tone.bad => (K.bad, K.badBg),
      Tone.info => (K.info, K.infoBg), Tone.muted => (K.muted, K.mutedBg), Tone.progress => (K.progress, K.progressBg) };
    return Container(height: 24, padding: const EdgeInsets.only(left: 8, right: 10),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999), border: Border.all(color: fg.withValues(alpha: .18))),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 6, height: 6, decoration: BoxDecoration(color: fg, shape: BoxShape.circle)), const SizedBox(width: 6),
          Text(label, style: TextStyle(color: fg, fontSize: 12, height: 16 / 12, fontWeight: FontWeight.w600)),
        ]));
  }
}

enum BtnKind { primary, accent, secondary, soft, ghost, violet, danger }

/// The web's button (klh-btn): 40 px, 10 px corners, 600 14 px; primary is the teal gradient, accent yellow-to-coral.
class KButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool busy;
  final BtnKind kind;
  final bool small;
  final bool large;
  final bool block;
  final bool pill;
  const KButton(this.label, {super.key, this.icon, this.onPressed, this.busy = false, this.kind = BtnKind.primary, this.small = false, this.large = false, this.block = false, this.pill = false});
  @override
  Widget build(BuildContext context) {
    final on = onPressed != null && !busy;
    final (Gradient? grad, Color? bg, Color fg, Color? border, List<BoxShadow>? shadow) = switch (kind) {
      BtnKind.primary => (K.primaryGradient, null, Colors.white, null, K.primaryShadow),
      BtnKind.accent => (const LinearGradient(colors: [K.sun, K.ember], stops: [0, .55], begin: Alignment.topLeft, end: Alignment.bottomRight), null, K.onAccent, null, K.accentShadow),
      BtnKind.violet => (Mod.violet.grad, null, Colors.white, null, const [BoxShadow(color: Color(0x2E101828), blurRadius: 24, offset: Offset(0, 10))]),
      BtnKind.secondary => (null, Colors.white, K.ink, K.control, null),
      BtnKind.soft => (null, K.progressBg, K.brandInk, null, null),
      BtnKind.ghost => (null, Colors.transparent, K.brand, null, null),
      BtnKind.danger => (null, const Color(0xFFC4302B), Colors.white, null, null),
    };
    final r = BorderRadius.circular(pill ? 999 : 10);
    final h = small ? 32.0 : large ? 44.0 : 40.0;
    final row = Row(mainAxisSize: block ? MainAxisSize.max : MainAxisSize.min, mainAxisAlignment: MainAxisAlignment.center, children: [
      if (busy) SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: fg))
      else if (icon != null) Icon(icon, size: 16, color: fg),
      if (busy || icon != null) const SizedBox(width: 8),
      Flexible(child: Text(label, overflow: TextOverflow.ellipsis, style: TextStyle(color: fg, fontWeight: FontWeight.w600, fontSize: small ? 13 : large ? 15 : 14))),
    ]);
    return Opacity(opacity: on || busy ? 1 : .45, child: Container(
      height: h, decoration: BoxDecoration(gradient: grad, color: bg, borderRadius: r, border: border == null ? null : Border.all(color: border), boxShadow: on ? shadow : null),
      child: Material(type: MaterialType.transparency, child: InkWell(borderRadius: r, onTap: on ? onPressed : null,
          child: Padding(padding: EdgeInsets.symmetric(horizontal: small ? 12 : large ? 20 : 16), child: row)))));
  }
}

/// The student portal's main call to action: the primary button (kept for the screens that use it).
class ActionButton extends StatelessWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool busy;
  final BtnKind kind;
  const ActionButton({super.key, required this.label, this.icon, this.onPressed, this.busy = false, this.kind = BtnKind.primary});
  @override
  Widget build(BuildContext context) => KButton(label, icon: icon, onPressed: onPressed, busy: busy, kind: kind, large: true);
}

/// A grey note with a teal icon (st-note).
class Note extends StatelessWidget {
  final String text;
  final IconData icon;
  const Note(this.text, {super.key, this.icon = LucideIcons.info});
  @override
  Widget build(BuildContext context) => Container(width: double.infinity, padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
      decoration: BoxDecoration(color: K.sub, borderRadius: BorderRadius.circular(10)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(padding: const EdgeInsets.only(top: 1), child: Icon(icon, size: 14, color: K.brand)), const SizedBox(width: 8),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 12.5, color: K.ink2, height: 1.4))),
      ]));
}

/// One line in a sheet or list (st-line): a bold title and a small grey line, something on the right.
class LineItem extends StatelessWidget {
  final String title;
  final String? sub;
  final Widget? leading;
  final Widget? trailing;
  final bool boxed;
  final bool alert;
  final VoidCallback? onTap;
  const LineItem(this.title, {super.key, this.sub, this.leading, this.trailing, this.boxed = false, this.alert = false, this.onTap});
  @override
  Widget build(BuildContext context) {
    final body = Row(children: [
      if (leading != null) ...[leading!, const SizedBox(width: 12)],
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
        if (sub != null && sub!.isNotEmpty) Text(sub!, style: const TextStyle(fontSize: 12, color: K.ink3)),
      ])),
      if (trailing != null) ...[const SizedBox(width: 10), trailing!],
    ]);
    final box = boxed
        ? Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: alert ? const Color(0xFFFFF7F7) : Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: alert ? K.alertLine : K.line)), child: body)
        : Padding(padding: const EdgeInsets.symmetric(vertical: 10), child: body);
    return onTap == null ? box : InkWell(onTap: onTap, borderRadius: BorderRadius.circular(14), child: box);
  }
}

/// A list with hairlines between its lines (st-list).
class Lines extends StatelessWidget {
  final List<Widget> children;
  const Lines(this.children, {super.key});
  @override
  Widget build(BuildContext context) => Column(children: [
        for (var i = 0; i < children.length; i++) ...[if (i > 0) const Divider(height: 1, color: K.line2), children[i]],
      ]);
}

/// Small facts in grey boxes (st-facts): label above, value below.
class Facts extends StatelessWidget {
  final List<(String label, String value, IconData? icon)> items;
  const Facts(this.items, {super.key});
  @override
  Widget build(BuildContext context) => Column(children: [
        for (final (l, v, i) in items) Container(width: double.infinity, margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(color: K.sub, borderRadius: BorderRadius.circular(12)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (i != null) Padding(padding: const EdgeInsets.only(bottom: 2), child: Icon(i, size: 15, color: K.brand)),
              Text(l, style: const TextStyle(fontSize: 11.5, color: K.ink3)),
              Text(v, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700)),
            ])),
      ]);
}

/// A section label (st-label).
class KLabel extends StatelessWidget {
  final String text;
  const KLabel(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(text, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: K.ink2)));
}

/// The finished state of a sheet (st-done): a big tick, a title, a line and Done.
class DoneView extends StatelessWidget {
  final String title;
  final String body;
  final VoidCallback onClose;
  const DoneView({super.key, required this.title, required this.body, required this.onClose});
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.fromLTRB(0, 18, 0, 6), child: Column(children: [
        Container(width: 64, height: 64, decoration: const BoxDecoration(color: Color(0xFFE3F4F2), shape: BoxShape.circle), child: const Icon(LucideIcons.circleCheck, size: 34, color: K.brand)),
        const SizedBox(height: 8),
        Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        Text(body, textAlign: TextAlign.center, style: const TextStyle(fontSize: 14, color: K.ink2)),
        const SizedBox(height: 16),
        KButton('Done', onPressed: onClose),
      ]));
}

/// A task sheet over the page (the web's Sheet): grab handle, module icon, title, close; body; optional footer.
Future<T?> showKSheet<T>(BuildContext context, {required Mod mod, required IconData icon, required String title, String? sub,
    required Widget Function(BuildContext context, StateSetter setState) body, Widget Function(BuildContext context, StateSetter setState)? footer}) =>
    showModalBottomSheet<T>(context: context, isScrollControlled: true, useSafeArea: true, barrierColor: const Color(0x73101828),
        builder: (ctx) => StatefulBuilder(builder: (ctx, set) => ConstrainedBox(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * .92),
              child: Padding(padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom), child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Center(child: Container(width: 40, height: 4, margin: const EdgeInsets.only(top: 8), decoration: BoxDecoration(color: const Color(0xFFD0D5DD), borderRadius: BorderRadius.circular(999)))),
                Container(padding: const EdgeInsets.fromLTRB(18, 10, 18, 14), decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: K.line2))),
                    child: Row(children: [
                      ModIcon(icon, mod), const SizedBox(width: 12),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -.17)),
                        if (sub != null) Text(sub, style: const TextStyle(fontSize: 12.5, color: K.ink3)),
                      ])),
                      IconButton(tooltip: 'Close', onPressed: () => Navigator.of(ctx).pop(), icon: const Icon(LucideIcons.x, size: 18, color: K.ink2),
                          style: IconButton.styleFrom(fixedSize: const Size(34, 34), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)))),
                    ])),
                Flexible(child: SingleChildScrollView(padding: const EdgeInsets.fromLTRB(18, 16, 18, 18), child: body(ctx, set))),
                if (footer != null) Container(padding: EdgeInsets.fromLTRB(18, 12, 18, 14 + MediaQuery.of(ctx).padding.bottom),
                    decoration: const BoxDecoration(border: Border(top: BorderSide(color: K.line2))), child: footer(ctx, set)),
              ])),
            )));

/// A page's header (klh-screen-head): the screen code in its module colour and the module, the title,
/// the purpose in grey, and what the student may do on it, from the web portal's screen registry.
class PageHead extends StatelessWidget {
  final String code;
  final String? title;
  final String? subtitle;
  final Widget? action;
  const PageHead(this.code, {super.key, this.title, this.subtitle, this.action});
  static const _tiles = {
    'brand': (Color(0xFFE0F5F1), Color(0xFF08665E)), 'indigo': (Color(0xFFECF0FF), Color(0xFF3B5BDB)), 'amber': (Color(0xFFFFF6D6), Color(0xFF8F5C00)),
    'violet': (Color(0xFFF1ECFF), Color(0xFF5F3DC4)), 'rose': (Color(0xFFFFE9F0), Color(0xFFB8215A)), 'cyan': (Color(0xFFDDF6FA), Color(0xFF0B7285)),
    'orange': (Color(0xFFFFF1E7), Color(0xFFB4410F)), 'sky': (Color(0xFFE7F3FF), Color(0xFF1864AB)),
  };
  /// code: (name, purpose, module, module colour, access)
  static const screens = {
    'GEN-01': ('My profile and contacts', 'Own details and phone numbers', 'General', 'brand', 'VE'),
    'GEN-02': ('Notifications', 'Messages, reminders and alerts addressed to the person', 'General', 'brand', 'V'),
    'REG-01': ('Hostel registration', 'Choose hostel building and room type', 'A Registration', 'indigo', 'C'),
    'REG-02': ('Fees and receipts', 'Pay online; see and download receipts', 'A Registration', 'indigo', 'VC'),
    'ELE-01': ('My electricity', 'Units used, balance, online recharge', 'C Electricity', 'amber', 'VC'),
    'OUT-01': ('My outings', 'Apply for an outing; show the QR pass', 'E Outing', 'violet', 'VC'),
    'SCK-01': ('My sick leave', 'Apply for sick leave or an extension', 'F Sick leave', 'rose', 'VC'),
    'MES-01': ('Routine menu', 'A week of meals per hostel (Boys, Girls), food style or country, Veg or Non-veg', 'G Mess', 'cyan', 'V'),
    'MES-09': ('Choose my meals', "Pick next week's live breakfast, curry, fry, dal, chutney, rasam or sambar before Friday", 'G Rasoi', 'cyan', 'VC'),
    'MES-02': ('Rate my meals', 'Stars and a comment for each dish eaten, up to three days after', 'G Mess', 'cyan', 'C'),
    'TKT-01': ('My tickets', 'Report a problem in the room, the mess or a common facility; confirm the repair', 'H Tickets', 'orange', 'VCE'),
    'TKT-07': ('Complaints', 'A student complains about a meal or raises a grievance that is not a repair', 'H Tickets', 'orange', 'VC'),
    'ACA-01': ('Student academic page', 'Results, CRT, certifications, activities and achievements', 'L Academics', 'sky', 'V'),
    'CDP-02': ('Caution deposit', 'Own deposit held, deductions with reasons, refund', 'A Registration', 'indigo', 'V'),
    'RCH-02': ('Change room', 'Ask for another room or room type and see what it does to the fees', 'A Registration', 'indigo', 'VC'),
    'HLT-03': ('My health', 'Own health reports and suggestions', 'L Academics', 'sky', 'V'),
  };
  @override
  Widget build(BuildContext context) {
    final (name, purpose, _, colour, _) = screens[code] ?? (code, '', '', 'brand', '');
    final (_, fg) = _tiles[colour]!;
    return Padding(padding: const EdgeInsets.only(bottom: 8), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
        Container(width: 4, height: 26, decoration: BoxDecoration(color: fg, borderRadius: BorderRadius.circular(2))),
        const SizedBox(width: 10),
        Expanded(child: Text(title ?? name, style: const TextStyle(fontSize: 24, height: 30 / 24, fontWeight: FontWeight.w800, letterSpacing: -.4))),
      ]),
      if ((subtitle ?? purpose).isNotEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: Text(subtitle ?? purpose, style: const TextStyle(fontSize: 14.5, height: 1.5, color: K.ink2))),
      if (action != null) Padding(padding: const EdgeInsets.only(top: 14), child: action!),
    ]));
  }
}

/// A klh-table at phone width: each row a block, each cell a line with its column name on the left
/// (12 px, grey, at most 42 %) and the value on the right; the first cell bold.
class PhoneTable extends StatelessWidget {
  final List<String> labels;
  final List<List<Widget>> rows;
  final void Function(int index)? onRow;
  const PhoneTable({super.key, required this.labels, required this.rows, this.onRow});
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        for (var i = 0; i < rows.length; i++) InkWell(onTap: onRow == null ? null : () => onRow!(i), child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(border: i == rows.length - 1 ? null : const Border(bottom: BorderSide(color: K.line))),
          child: Column(children: [
            for (var j = 0; j < rows[i].length; j++) Container(constraints: const BoxConstraints(minHeight: 26), padding: const EdgeInsets.symmetric(vertical: 4), child: LayoutBuilder(builder: (c, b) => Row(children: [
              if (j < labels.length && labels[j].isNotEmpty) ConstrainedBox(constraints: BoxConstraints(maxWidth: b.maxWidth * .42),
                  child: Text(labels[j], style: const TextStyle(fontSize: 12, color: K.ink2))),
              const SizedBox(width: 14),
              Expanded(child: Align(alignment: Alignment.centerRight, child: DefaultTextStyle.merge(textAlign: TextAlign.right,
                  style: TextStyle(fontSize: 13.5, color: K.ink, fontWeight: j == 0 ? FontWeight.w600 : null), child: rows[i][j]))),
            ]))),
          ]),
        )),
      ]);
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

/// Reloads a page by itself every few seconds, so what the wardens and the office do shows up without a pull to refresh.
/// Call [autoRefresh] once in initState after the first load; the timer stops with the page.
mixin AutoRefresh<T extends StatefulWidget> on State<T> {
  Timer? _autoTimer;
  void autoRefresh(FutureOr<void> Function() reload, {Duration every = const Duration(seconds: 6)}) {
    _autoTimer?.cancel();
    _autoTimer = Timer.periodic(every, (_) { if (mounted) reload(); });
  }
  @override
  void dispose() { _autoTimer?.cancel(); super.dispose(); }
}

/// Black and white while a module is not open yet (before check-in); full colour once it is.
class Grey extends StatelessWidget {
  final bool off;
  final Widget child;
  const Grey({super.key, required this.off, required this.child});
  static const _desaturate = ColorFilter.matrix(<double>[
    0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0, 0, 0, 1, 0]);
  @override
  Widget build(BuildContext context) => off ? Opacity(opacity: .7, child: ColorFiltered(colorFilter: _desaturate, child: child)) : child;
}
