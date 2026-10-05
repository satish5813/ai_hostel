import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../core/widgets.dart';

(IconData, Color) _look(String? t) => switch (t) {
      'outpass' => (Icons.door_front_door_rounded, K.violet),
      'fee' || 'receipt' => (Icons.account_balance_wallet_rounded, K.ember),
      'sick_leave' => (Icons.favorite_rounded, const Color(0xFFE11D48)),
      'meter' => (Icons.bolt_rounded, const Color(0xFFD97706)),
      'alert' => (Icons.warning_amber_rounded, const Color(0xFF0284C7)),
      _ => (Icons.notifications_rounded, K.brand),
    };

String _title(Map n) {
  if (n['subject'] != null && '${n['subject']}'.isNotEmpty) return '${n['subject']}';
  final s = words(n['template_code']).toLowerCase();
  return s.isEmpty ? 'Message' : '${s[0].toUpperCase()}${s.substring(1)}';
}

/// Notifications: every message sent to you (SMS, WhatsApp, e-mail and in-app), newest first.
class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});
  @override
  Widget build(BuildContext context) => ApiView(path: '/notifications', builder: (context, data, reload) {
        final list = ((data as List?) ?? []).cast<Map>();
        return PageList(children: [
          const Text('SMS, WhatsApp, e-mail and in-app messages sent to you, newest first. Messages are kept; they cannot be deleted.',
              style: TextStyle(color: K.ink3, fontSize: 13)),
          if (list.isEmpty)
            const Card(child: EmptyView(icon: Icons.notifications_none_rounded, title: 'No messages yet', body: 'Approvals, receipts, passes and reminders arrive here.'))
          else
            Card(child: Column(children: [
              for (var i = 0; i < list.length; i++) ...[
                if (i > 0) const Divider(),
                _Item(n: list[i]),
              ],
            ])),
        ]);
      });
}

class _Item extends StatelessWidget {
  final Map n;
  const _Item({required this.n});
  @override
  Widget build(BuildContext context) {
    final (icon, color) = _look(n['related_type']);
    final unread = n['delivery_status'] != 'Read';
    return Padding(padding: const EdgeInsets.all(14), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(width: 38, height: 38, decoration: BoxDecoration(color: color.withValues(alpha: .12), borderRadius: BorderRadius.circular(12)), child: Icon(icon, size: 19, color: color)),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(_title(n), style: TextStyle(fontWeight: unread ? FontWeight.w800 : FontWeight.w600, fontSize: 14.5))),
          if (unread) Container(width: 8, height: 8, margin: const EdgeInsets.only(left: 6), decoration: const BoxDecoration(color: K.ember, shape: BoxShape.circle)),
        ]),
        const SizedBox(height: 2),
        Text('${n['body'] ?? ''}', style: const TextStyle(color: K.ink2, fontSize: 13.5)),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 6, crossAxisAlignment: WrapCrossAlignment.center, children: [
          Text(dayTime(n['sent_at'] ?? n['queued_at']), style: const TextStyle(color: K.ink3, fontSize: 12)),
          Pill(words(n['channel']), tone: Tone.muted),
          Pill(words(n['delivery_status']), tone: switch (n['delivery_status']) { 'Delivered' || 'Read' || 'Sent' => Tone.good, 'Failed' => Tone.bad, 'Queued' => Tone.warn, _ => Tone.info }),
        ]),
      ])),
    ]));
  }
}
