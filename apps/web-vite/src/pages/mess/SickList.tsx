import { useState } from 'react';
import { Button, Card, EmptyState, Field, Input, Notice, Person, StatCard, StatusChip, formatDate } from '@/lib/klh';
import { api } from '@/lib/api';
import { ScreenHeader, roomLabel, titleCase, useAction, useApi, useSession, words } from '@/lib/ui';
import { can } from '@/app/screens';
import { DIET, type Diet } from '@/pages/warden/sickDiet';

type Row = { meal_date: string; slot: string; sick_leave_id: number; student_id: string; full_name: string; space_id: string; cuisine: string | null; status: string; diet: Diet; diet_note: string | null };
const SLOTS = ['Breakfast', 'Lunch', 'Evening_Snacks', 'Dinner'];
const COLOR = { Breakfast: 'amber', Lunch: 'cyan', Evening_Snacks: 'brand', Dinner: 'indigo' } as const;

/** SCK-03 Mess sick list: students to be served in their rooms. Mess In-charge V; Mess Supervisor E (delivery ticks). */
export default function MessSickList() {
  const s = useSession()!;
  const ticks = can(s.role, 'SCK-03', 'E');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const list = useApi<Row[]>(`/mess/sick-list?date=${date}`);
  const { run, busy } = useAction();
  const delivered = list.data?.filter((r) => r.status === 'Delivered').length ?? 0;
  return (
    <div className="klh-stack klh-comfortable" style={{ gap: 24 }}>
      <ScreenHeader code="SCK-03" subtitle={ticks ? 'Tick each room meal as delivered. A slot not ticked by its deadline becomes Missed and raises a Sick-Meal-Missed alert.' : 'Students on approved sick leave: room, the food to send (light, liquid or normal) and any note. The Rasoi Supervisor ticks deliveries.'} actions={<Field label="Day"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>} />
      <div className="klh-grid-3">
        <StatCard color="rose" icon="heart" label="Hostel students on sick leave" value={String(new Set(list.data?.map((r) => r.student_id)).size)} />
        <StatCard color="cyan" icon="utensils" label="Meals to deliver" value={String((list.data?.length ?? 0) - delivered)} sub={`${delivered} delivered`} />
        <StatCard color="orange" icon="alert" label="Missed" value={String(list.data?.filter((r) => r.status === 'Missed').length ?? 0)} tone={list.data?.some((r) => r.status === 'Missed') ? 'critical' : undefined} />
      </div>
      <div className="klh-grid-2">
        {SLOTS.map((slot) => { const rows = list.data?.filter((r) => r.slot === slot) ?? []; return (
          <Card key={slot} icon="utensils" color={COLOR[slot as keyof typeof COLOR]} title={words(slot)} subtitle={`${rows.filter((r) => r.status === 'Delivered').length} of ${rows.length} delivered`} padding={rows.length ? undefined : 0}>
            {rows.length === 0 ? <EmptyState icon="utensils" title="No one for this slot" /> : (
              <div className="klh-stack" style={{ gap: 12 }}>
                {rows.map((r) => (
                  <div key={r.student_id + r.slot} className="klh-row" style={{ justifyContent: 'space-between' }}>
                    <span className="klh-stack" style={{ gap: 4, minWidth: 0 }}>
                      <Person name={titleCase(r.full_name)} sub={`Room ${roomLabel(r.space_id)}${r.diet_note ? ` · ${r.diet_note}` : ''}`} />
                      <span style={{ fontSize: 13 }}><span className={`xd-pill xd-t-${DIET[r.diet]?.tone ?? 'warn'}`}>{DIET[r.diet]?.label ?? r.diet}</span> <span className="klh-muted">{DIET[r.diet]?.menu}</span></span>
                    </span>
                    {ticks && (r.status === 'Pending' || r.status === 'Missed') ? <Button size="lg" variant="primary" icon="check" loading={busy} onClick={() => run(() => api(`/sick-leaves/${r.sick_leave_id}/deliveries/${r.meal_date}/${r.slot}`, { method: 'POST', json: { status: 'Delivered' } }).then(() => list.mutate()), `${words(slot)} delivered to ${titleCase(r.full_name)}`)}>Delivered</Button> : <StatusChip status={r.status} />}
                  </div>))}
              </div>)}
          </Card>); })}
      </div>
      <Notice tone="info" title={`Showing ${formatDate(date)}`}>Names are shown because meals go to rooms. Feedback ratings elsewhere are anonymous.</Notice>
    </div>
  );
}
