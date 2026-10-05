import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/widgets.dart';

/// The KLH icon tile per kind of message (Notifications.tsx ICON / COLOR), soft tint and ink as globals.css sets them.
(IconData, Color, Color) _look(String? t) => switch (t) {
      'outpass' => (LucideIcons.doorOpen, const Color(0xFFF1ECFF), const Color(0xFF5F3DC4)),
      'fee' || 'receipt' => (LucideIcons.wallet, const Color(0xFFFFF1E7), const Color(0xFFB4410F)),
      'sick_leave' => (LucideIcons.heartPulse, const Color(0xFFFFE9F0), const Color(0xFFB8215A)),
      'meter' => (LucideIcons.zap, const Color(0xFFFFF6D6), const Color(0xFF8F5C00)),
      'alert' => (LucideIcons.triangleAlert, const Color(0xFFE7F3FF), const Color(0xFF1864AB)),
      _ => (LucideIcons.bell, const Color(0xFFE0F5F1), K.brandInk),
    };

String _title(Map n) {
  if (n['subject'] != null) return '${n['subject']}';
  final s = words(n['template_code']).toLowerCase();
  return s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';
}

double _textW(String t, TextStyle s) => (TextPainter(text: TextSpan(text: t, style: s), textDirection: TextDirection.ltr)..layout()).width;

const _titleStyle = TextStyle(fontFamily: 'PlusJakartaSans', fontSize: 14, fontWeight: FontWeight.w700, color: K.ink);
const _timeStyle = TextStyle(fontFamily: 'PlusJakartaSans', fontSize: 12, color: Color(0xFF626B7C));
const _chipStyle = TextStyle(fontFamily: 'PlusJakartaSans', fontSize: 12, fontWeight: FontWeight.w600);

/// GEN-02 Notifications (pages/general/Notifications.tsx): every message addressed to the student, whichever channel carried it.
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});
  @override
  Widget build(BuildContext context) => ApiView(path: '/notifications', builder: (context, data, reload) {
        final list = ((data as List?) ?? []).cast<Map>();
        return ListView(physics: const AlwaysScrollableScrollPhysics(), padding: const EdgeInsets.fromLTRB(16, 16, 16, 90), children: [
          const PageHead('GEN-02', subtitle: 'SMS, WhatsApp, e-mail and in-app messages sent to you, newest first. Messages are kept; they cannot be deleted.'),
          const SizedBox(height: 16),
          KCard(padding: EdgeInsets.zero, child: list.isEmpty ? const _Empty() : Column(children: [for (final n in list) _Item(n: n)])),
        ]);
      });
}

/// KLH EmptyState: the tinted bell, a title and a line.
class _Empty extends StatelessWidget {
  const _Empty();
  @override
  Widget build(BuildContext context) => SizedBox(width: double.infinity, child: Padding(padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48), child: Column(children: [
        Container(width: 64, height: 64, margin: const EdgeInsets.only(bottom: 8 + 8),
            decoration: BoxDecoration(color: const Color(0xFFE0F5F1), borderRadius: BorderRadius.circular(20), boxShadow: const [BoxShadow(color: Color(0x73E0F5F1), spreadRadius: 8)]),
            child: const Icon(LucideIcons.bell, size: 28, color: K.brandInk)),
        const Text('No messages yet', textAlign: TextAlign.center, style: TextStyle(fontSize: 17, height: 24 / 17, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Approvals, receipts, passes and reminders arrive here.', textAlign: TextAlign.center, style: TextStyle(fontSize: 14, color: K.ink2)),
        const SizedBox(height: 8),
      ])));
}

/// KLH NotificationItem: icon tile, the title with the time and two chips on its right, the message, a dot when unread.
class _Item extends StatelessWidget {
  final Map n;
  const _Item({required this.n});
  @override
  Widget build(BuildContext context) {
    final (icon, bg, fg) = _look(n['related_type']);
    final unread = n['delivery_status'] != 'Read';
    final title = _title(n);
    final time = dayTime(n['sent_at'] ?? n['queued_at']);
    final channel = Pill(words(n['channel']), tone: Tone.muted), status = Pill.status(n['delivery_status']);
    double chipW(String s) => 8 + 6 + 6 + _textW(s, _chipStyle) + 10 + 2;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(color: unread ? const Color(0x8CE0F5F1) : null, borderRadius: BorderRadius.circular(10)),
      child: Stack(clipBehavior: Clip.none, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(width: 40, height: 40, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 20, color: fg)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // the title and the time share one line and shrink as CSS flex does, each no narrower than its widest word or item
            LayoutBuilder(builder: (context, box) {
              final avail = box.maxWidth - 8;
              final tB = _textW(title, _titleStyle) + 1, tMin = title.split(' ').map((w) => _textW(w, _titleStyle)).fold<double>(0, math.max) + 1;
              final items = [_textW(time, _timeStyle) + 1, chipW(words(n['channel'])), chipW(words(n['delivery_status']))];
              final sB = items.reduce((a, b) => a + b) + 16, sMin = items.reduce(math.max);
              var tW = tB, sW = sB;
              if (tB + sB > avail) {
                final cut = tB + sB - avail;
                tW = tB - cut * tB / (tB + sB);
                sW = sB - cut * sB / (tB + sB);
                if (tW < tMin) { tW = tMin; sW = math.max(sMin, avail - tMin); }
                if (sW < sMin) { sW = sMin; tW = math.max(tMin, avail - sMin); }
              }
              return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                SizedBox(width: tW, child: Text(title, style: _titleStyle)),
                const SizedBox(width: 8),
                SizedBox(width: sW, child: Wrap(spacing: 8, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [Text(time, style: _timeStyle, softWrap: false), channel, status])),
              ]);
            }),
            if ('${n['body'] ?? ''}'.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 2), child: Text('${n['body']}', style: const TextStyle(fontSize: 13, height: 18 / 13, color: K.ink2))),
          ])),
        ]),
        if (unread) Positioned(right: -2, bottom: 4, child: Semantics(label: 'Unread', child: Container(width: 8, height: 8, decoration: const BoxDecoration(color: K.ember, shape: BoxShape.circle)))),
      ]),
    );
  }
}
