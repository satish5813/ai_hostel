import { Card, EmptyState, NotificationItem, StatusChip, formatDateTime } from '@/lib/klh';
import { ScreenHeader, useApi, words } from '@/lib/ui';

type Note = { notification_id: number; channel: string; template_code: string; subject: string | null; body: string; related_type: string | null; related_id: string | null; queued_at: string; sent_at: string | null; delivery_status: string };
const ICON = (t: string | null) => (t === 'outpass' ? 'door' : t === 'fee' || t === 'receipt' ? 'wallet' : t === 'sick_leave' ? 'heart' : t === 'meter' ? 'bolt' : t === 'alert' ? 'alert' : 'bell') as 'door' | 'wallet' | 'heart' | 'bolt' | 'alert' | 'bell';
const COLOR = (t: string | null) => (t === 'outpass' ? 'violet' : t === 'fee' || t === 'receipt' ? 'orange' : t === 'sick_leave' ? 'rose' : t === 'meter' ? 'amber' : t === 'alert' ? 'sky' : 'brand') as 'violet' | 'orange' | 'rose' | 'amber' | 'sky' | 'brand';

/** GEN-02 Notifications: every message addressed to the person, whichever channel carried it. */
export default function Notifications() {
  const list = useApi<Note[]>('/notifications');
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <ScreenHeader code="GEN-02" compact subtitle="SMS, WhatsApp, e-mail and in-app messages sent to you, newest first. Messages are kept; they cannot be deleted." />
      <Card padding={0}>
        {!list.data ? null : list.data.length === 0 ? <EmptyState icon="bell" title="No messages yet" body="Approvals, receipts, passes and reminders arrive here." /> : (
          <div className="klh-stack" style={{ gap: 0 }}>
            {list.data.map((n) => (
              <NotificationItem key={n.notification_id} icon={ICON(n.related_type)} color={COLOR(n.related_type)} unread={n.delivery_status !== 'Read'}
                title={n.subject ?? words(n.template_code).toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} body={n.body}
                time={<span className="klh-row" style={{ gap: 8 }}>{formatDateTime(n.sent_at ?? n.queued_at)}<StatusChip status={n.channel} tone="neutral" /><StatusChip status={n.delivery_status} /></span>} />))}
          </div>)}
      </Card>
    </div>
  );
}
