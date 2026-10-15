import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight, BedDouble, Bell, BookOpen, CalendarClock, CheckCircle2, ChevronRight, DoorOpen, GraduationCap, HeartPulse, IdCard, KeyRound, Phone, Receipt,
  Coffee, Cookie, Lock, ShieldCheck, Soup, Sparkles, Users, UtensilsCrossed, Wallet, X, Zap, type LucideIcon,
  ChefHat, Star, Wrench,
} from 'lucide-react';
import { ApprovalTrail, Button, Field, Input, Select, StatusChip, Stepper, Textarea, formatDate, formatDateTime, formatINR } from '@/lib/klh';
import { api } from '@/lib/api';
import { greeting, titleCase, toast, today, useAction, useApi, useSession, words } from '@/lib/ui';
import { MODC, type Mod } from '@/app/apps';
import { bedLetter } from '@/lib/beds';
import { Done, Sheet } from './Sheet';
import { OutingSheet, type Pass, type Step } from './OutingSheet';
import { MEAL_SLOTS, foodName, type MyMenu } from './MyMenu';
import { progressOf, type MealChoices } from './MealChoice';
import { dueLabel } from '@/pages/mess/weekly';
import { CareerGoalSheet, GOALS, useCareerGoal } from './CareerGoalSheet';

type Reg = { registration_id: number; registration_no: string; hostel_code: string; status: string; applied_on: string; subspace_id: string | null; student_decision: string | null; hold_until: string | null; allocation_date: string | null };
type Demand = { demand_id: number; fee_head: string; instalment_no: number; amount_due: string; amount_paid: string; due_date: string; status: string };
type Rcpt = { receipt_id: number; receipt_no: string; fee_head: string; instalment_no: number; amount: string; paid_on: string; payment_mode: string };
type Dues = { demands: Demand[]; receipts: Rcpt[] };
type Me = { full_name: string; programme: string | null; contacts: { is_verified: boolean }[]; stay: { space_id: string; subspace_id: string } | null };
type Meter = { meter_id: number; meter_no: string; units_this_month: string | null; included_units_per_month: string | null; recharged_this_month: string; units_left: string | null; rate_per_unit: string | null; recharges: { recharge_id: number; units_credited: string; status: string; created_at: string }[] };
type Sick = { sick_leave_id: number; illness_details: string; from_date: string; to_date: string; status: string; visited_by: string | null; visit_remarks: string | null; applied_on: string };
type Room = {
  bed_label: string; hostel_name: string; hostel_code: string; floor_name: string; room_code: string; bed_code: string; type_name: string | null; is_ac: boolean; sharing_count: number; key_no: string; allocation_date: string;
  mates: { bed_code: string; student_id: string | null; full_name: string | null; programme: string | null; staff_id: string | null; staff_name: string | null }[];
  people: { hostel_role: string; full_name: string; mobile_no: string | null }[]; mess: { mess_name: string; cuisine: string | null } | null;
};
type SheetKey = 'fees' | 'power' | 'outing' | 'ask' | 'sick' | 'repair' | 'room' | 'receipts' | 'renew' | 'goal' | null;
type Year = { academic_year: string; start_date: string; renewal_opens: string | null; renewal_closes: string | null; registration_opens: string | null; registration_closes: string | null; renewal_open: boolean; registration_open: boolean };
type RenewalReg = { registration_id: number; registration_no: string; status: string; facility_id: string; hostel_code: string; type_name?: string; retain_subspace_id: string | null; bed_label: string | null;
  offer_id: number | null; student_decision: string | null; hold_until: string | null; fee_plan_id: number | null; fee_check_status: string; cw_status: string; registration_fee: string };
type Renewal = {
  current: { registration_id: number; academic_year: string; facility_id: string; room_type_id: number; bed_label: string; hostel_name: string; type_name: string | null; next_year_intent: string | null; continued_into: number | null } | null;
  next: Year | null; same_fee: { registration_fee: number; hostel_fee: number; meter_charge: number; mess_fee: number | null } | null; renewal: RenewalReg | null; demands: Demand[];
};

const OPEN = ['Pending', 'Part_Paid', 'Overdue'];
const balance = (d: Demand) => Number(d.amount_due) - Number(d.amount_paid);
const headOf = (d: { fee_head: string; instalment_no: number }) => `${words(d.fee_head)}${d.fee_head === 'Residency' ? `, instalment ${d.instalment_no}` : ''}`;
const STAGE = (r?: Reg) => (!r ? 0 : r.status === 'Applied' ? 1 : ['Fee_Paid', 'Waitlisted'].includes(r.status) ? 2 : r.status === 'Allotted' ? 3 : r.status === 'Accepted' ? 4 : r.status === 'Confirmed' ? 5 : 6);
const trail = (st: Step) => ({ level: st.level === 0 ? 'P' : st.level, role: words(st.role), person: st.by, decision: st.decision, at: st.on, remarks: st.remarks });
const ROLE: Record<string, string> = { Floor_Warden: 'Floor Manager', Chief_Warden: 'Chief Manager', Sweeper: 'Sweeper', Scavenger: 'Scavenger' };

/**
 * Student home: the room at a glance, one card per everyday task (fees, electricity, outing, sick leave) and quick tiles.
 * Every task opens in a sheet over the home (a centred dialog on wide screens, a bottom sheet on phones), so the
 * student pays, recharges, applies or reports without leaving the page.
 */
export default function StudentHome() {
  const s = useSession()!;
  const navigate = useNavigate();
  const regs = useApi<Reg[]>('/registrations/mine');
  const dues = useApi<Dues>(`/students/${s.id}/demands`);
  const me = useApi<Me>(`/students/${s.id}`);
  const meter = useApi<Meter>('/meters/mine');
  const passes = useApi<Pass[]>('/outpasses/mine');
  const sick = useApi<Sick[]>('/sick-leaves/mine');
  const room = useApi<Room | null>('/me/room');
  const renewal = useApi<Renewal>('/me/renewal');
  const menu = useApi<MyMenu>('/me/menu');
  const meals = useApi<MealChoices>('/me/meal-choices');
  const tickets = useApi<{ tickets: { status: string }[] }>('/me/tickets');
  const openWeek = meals.data?.weeks.find((w) => w.is_open);
  const mealsLeft = openWeek ? (({ done, total }) => total - done)(progressOf(openWeek)) : 0;
  const goal = useCareerGoal();
  const [sheet, setSheet] = useState<SheetKey>(null);

  // the stay in progress first: a renewal for next year is newer but is not where the student lives today
  const reg = regs.data?.find((r) => r.status === 'Checked_In') ?? regs.data?.find((r) => !['Cancelled', 'Vacated'].includes(r.status));
  const stage = STAGE(reg);
  const living = !!me.data?.stay || !!room.data;
  const rn = renewal.data;
  const showRenewal = !!rn?.current && !!rn.next && (rn.next.renewal_open || rn.next.registration_open || !!rn.renewal || !!rn.current.next_year_intent);
  const open = (dues.data?.demands ?? []).filter((d) => OPEN.includes(d.status));
  const due = open.reduce((a, d) => a + balance(d), 0);
  const next = open.slice().sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const overdue = open.some((d) => d.status === 'Overdue');
  const left = Number(meter.data?.units_left ?? 0), included = Number(meter.data?.included_units_per_month ?? 0), used = Number(meter.data?.units_this_month ?? 0);
  const livePass = passes.data?.find((o) => ['Approved', 'Out', 'Overdue'].includes(o.status));
  const pending = passes.data?.find((o) => ['Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved'].includes(o.status));
  const curSick = sick.data?.find((l) => ['Applied', 'Recommended', 'Approved'].includes(l.status));
  const first = me.data ? titleCase(me.data.full_name.split(' ')[0]) : '';
  const refresh = () => { dues.mutate(); meter.mutate(); passes.mutate(); sick.mutate(); regs.mutate(); room.mutate(); renewal.mutate(); menu.mutate(); meals.mutate(); };

  // repair tickets: open ones, and repairs waiting for this student to confirm
  const openTickets = tickets.data?.tickets.filter((t) => t.status !== 'Closed').length ?? 0;
  const toConfirm = tickets.data?.tickets.filter((t) => t.status === 'Resolved').length ?? 0;
  const cards: { key: SheetKey; mod: Mod; icon: LucideIcon; title: string; value: string; sub: string; cta: string; alert?: boolean; off?: string; alt?: { label: string; key: SheetKey }; go?: () => void }[] = [
    { key: 'fees', mod: 'orange', icon: Wallet, title: 'Fees', value: due ? formatINR(due) : 'All paid', sub: next ? `${headOf(next)} · due ${formatDate(next.due_date)}` : `${dues.data?.receipts.length ?? 0} receipts`, cta: due ? 'Pay now' : 'Receipts', alert: overdue },
    { key: 'power', mod: 'amber', icon: Zap, title: 'Electricity', value: meter.data ? `${Math.max(left, 0).toFixed(0)} units left` : '—', sub: meter.data ? `${used.toFixed(0)} of ${included.toFixed(0)} used this month` : 'Linked at check-in', cta: 'Recharge', alert: !!meter.data && left < 10, off: meter.error ? 'After check-in' : undefined },
    { key: 'outing', mod: 'violet', icon: DoorOpen, title: 'Outing', value: livePass ? words(livePass.status) : pending ? 'In approval' : 'At hostel', sub: livePass ? `${livePass.destination} · back by ${formatDateTime(livePass.return_by)}` : pending ? `${pending.destination} · ${words(pending.status).toLowerCase()}` : `${passes.data?.length ?? 0} outings this year`, cta: 'Ask permission', alt: livePass ? { label: 'Show pass', key: 'outing' } : pending ? { label: 'See status', key: 'outing' } : undefined, off: living ? undefined : 'After check-in' },
    { key: 'repair', mod: 'orange', icon: Wrench, title: 'Repairs', value: openTickets ? `${openTickets} open` : 'Nothing open',
      sub: toConfirm ? `${toConfirm} repaired: please confirm` : 'Room, mess or common facility', cta: toConfirm ? 'Confirm repair' : 'Report a problem', alert: toConfirm > 0,
      off: room.data ? undefined : 'After check-in', go: () => navigate('/my-tickets') },
    { key: 'sick', mod: 'rose', icon: HeartPulse, title: 'Sick leave', value: curSick ? words(curSick.status) : 'Feeling well', sub: curSick ? `${formatDate(curSick.from_date)} to ${formatDate(curSick.to_date)}` : 'Report if you are unwell', cta: curSick ? 'View' : 'Report', off: living ? undefined : 'After check-in' },
  ];
  const todayLunch = menu.data?.items.find((i) => i.day_no === menu.data?.today && i.meal === 'Lunch')?.dishes.split(', ').slice(0, 3).join(', ');
  const tiles: { label: string; sub: string; icon: LucideIcon; mod: Mod; go: () => void }[] = [
    { label: 'My room', sub: room.data ? room.data.bed_label : 'Not yet', icon: BedDouble, mod: 'teal', go: () => (room.data ? setSheet('room') : navigate('/registration')) },
    { label: 'Mess menu', sub: todayLunch ? `Lunch: ${todayLunch}` : menu.data?.me ? 'This week' : 'After check-in', icon: UtensilsCrossed, mod: 'em', go: () => navigate('/mess-menu') },
    { label: 'Choose my meals', sub: openWeek ? (mealsLeft ? `${mealsLeft} to choose by ${dueLabel(openWeek.choices_close_at)}` : 'Next week chosen') : 'When the mess publishes next week', icon: ChefHat, mod: 'orange', go: () => navigate('/my-meals') },
    { label: 'Repairs', sub: 'Room, mess or common facility', icon: Wrench, mod: 'orange', go: () => navigate('/my-tickets') },
    { label: 'Rate my meals', sub: 'Tell the mess what you liked', icon: Star, mod: 'amber', go: () => navigate('/rate-meals') },
    { label: 'Receipts', sub: `${dues.data?.receipts.length ?? 0} on record`, icon: Receipt, mod: 'orange', go: () => setSheet('receipts') },
    { label: 'Residency journey', sub: reg ? reg.registration_no : 'Apply for a room', icon: Sparkles, mod: 'indigo', go: () => navigate('/registration') },
    { label: 'Academic record', sub: 'Attendance, marks', icon: GraduationCap, mod: 'sky', go: () => navigate('/academics') },
    { label: 'My career goal', sub: goal.data ? GOALS.find((g) => g.value === goal.data!.goal)?.label ?? 'Set' : 'Tell us what you aim for', icon: Sparkles, mod: 'indigo', go: () => setSheet('goal') },
    { label: 'Parents and profile', sub: `${me.data?.contacts.filter((c) => c.is_verified).length ?? 0} verified contacts`, icon: IdCard, mod: 'em', go: () => navigate('/profile') },
    { label: 'Notifications', sub: 'Messages and alerts', icon: Bell, mod: 'violet', go: () => navigate('/notifications') },
  ];
  const activity = [
    ...(dues.data?.receipts ?? []).map((r) => ({ at: r.paid_on, icon: Receipt, mod: 'orange' as Mod, title: `Paid ${formatINR(r.amount)}`, sub: `${headOf(r)} · ${r.receipt_no}` })),
    ...(passes.data ?? []).map((o) => ({ at: o.leave_from, icon: DoorOpen, mod: 'violet' as Mod, title: `Outing to ${o.destination}`, sub: `${o.outpass_no} · ${words(o.status)}` })),
    ...(sick.data ?? []).map((l) => ({ at: l.applied_on, icon: HeartPulse, mod: 'rose' as Mod, title: 'Sick leave', sub: `${formatDate(l.from_date)} to ${formatDate(l.to_date)} · ${words(l.status)}` })),
  ].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 5);
  const steps = ['Applied', 'Registration fee paid', 'Room allotted', 'Room accepted', 'Fees paid', 'Checked in'].map((label, i) => ({ label, state: (stage >= 6 || i < stage - 1 ? 'done' : i === stage - 1 ? 'current' : 'upcoming') as 'done' | 'current' | 'upcoming' }));

  return (
    <div className="st">
      <section className="st-hero">
        <div className="st-hero-pattern" /><div className="st-orb st-orb-sun" /><div className="st-orb st-orb-violet" />
        <div className="st-hero-main">
          <span className="st-hero-date">{today()}{reg ? ` · ${reg.hostel_code}` : ''}</span>
          <h1>{first ? `${greeting()}, ${first}` : 'Welcome'}</h1>
          <p>{!reg ? 'You have not applied for a residency room yet.' : stage === 3 && reg.student_decision === 'Pending' ? `A bed is held for you until ${formatDateTime(reg.hold_until)}. Accept it to continue.` : living ? (due ? `${formatINR(due)} is due${next ? ` by ${formatDate(next.due_date)}` : ''}.` : 'Everything is paid. Have a good day.') : stage === 2 ? 'The hostel office is choosing a bed for you.' : stage < 3 ? 'Pay the registration fee to be allotted a bed.' : 'Pay the hostel and mess fees to check in.'}</p>
          <div className="st-hero-chips">
            {reg && <span className="st-chip"><CheckCircle2 size={13} />{words(reg.status)}</span>}
            {livePass && <span className="st-chip"><DoorOpen size={13} />Pass {livePass.outpass_no}</span>}
            {curSick && <span className="st-chip"><HeartPulse size={13} />Sick leave {words(curSick.status).toLowerCase()}</span>}
          </div>
          <div className="st-hero-actions">
            {due > 0 ? <button type="button" className="st-cta" onClick={() => setSheet('fees')}><Wallet size={17} />Pay {formatINR(due)}</button>
              : !reg ? <button type="button" className="st-cta" onClick={() => navigate('/registration')}><BedDouble size={17} />Apply for a room</button>
              : stage < 6 ? <button type="button" className="st-cta" onClick={() => navigate('/registration')}><Sparkles size={17} />Continue registration</button>
              : <button type="button" className="st-cta" onClick={() => setSheet(livePass || pending ? 'outing' : 'ask')}><DoorOpen size={17} />{livePass ? 'Show my pass' : pending ? 'Outing request status' : 'Ask for outing permission'}</button>}
            {living && (due > 0 || stage < 6) && <button type="button" className="st-cta st-cta-ghost" onClick={() => setSheet('ask')}><DoorOpen size={17} />Ask for outing</button>}
            {living && <button type="button" className="st-cta st-cta-ghost" onClick={() => navigate('/my-tickets')}><Wrench size={17} />Report a problem</button>}
          </div>
        </div>
        <button type="button" className="st-roomcard" onClick={() => (room.data ? setSheet('room') : navigate('/registration'))} aria-label="Open my room">
          <span className="st-roomcard-top"><KeyRound size={15} />{room.data ? 'Your room' : 'No room yet'}</span>
          <b>{room.data ? room.data.bed_label : reg ? words(reg.status) : 'Apply'}</b>
          {room.data ? (
            <span className="st-roomcard-rows">
              <span><BedDouble size={13} />{room.data.floor_name} · {room.data.type_name ?? 'Room'}</span>
              <span><Users size={13} />{room.data.mates.filter((m) => m.student_id || m.staff_id).length} of {room.data.sharing_count} beds taken</span>
              {room.data.people.find((p) => p.hostel_role === 'Floor_Warden') && <span><ShieldCheck size={13} />{room.data.people.find((p) => p.hostel_role === 'Floor_Warden')!.full_name}</span>}
            </span>
          ) : <span className="st-roomcard-rows"><span>Your bed appears here after check-in.</span></span>}
          <span className="st-roomcard-go">Details<ChevronRight size={14} /></span>
        </button>
      </section>

      {showRenewal && rn && <RenewalBanner rn={rn} onOpen={() => setSheet('renew')} />}

      <div className="st-cards">
        {cards.map((c) => { const M = MODC[c.mod]; const I = c.icon; return (
          <article key={c.key} className={`st-card${c.alert ? ' st-card-alert' : ''}${c.off ? ' st-card-off' : ''}`}>
            <header><span className="st-ico" style={{ background: M.grad, color: M.on, boxShadow: `0 10px 18px -10px ${M.glow}` }}><I size={20} /></span><span>{c.title}</span>{c.alert && <i className="st-dot" aria-label="Needs attention" />}</header>
            <b>{c.value}</b>
            <small>{c.off ?? c.sub}</small>
            {c.alt && !c.off && <button type="button" className="st-card-alt" style={{ color: M.fg }} onClick={() => setSheet(c.alt!.key)}>{c.alt.label}<ChevronRight size={14} /></button>}
            <button type="button" className="st-card-btn" style={{ color: M.fg, background: M.bg }} disabled={!!c.off} onClick={() => (c.go ? c.go() : setSheet(c.key === 'outing' ? 'ask' : c.key))}>{c.cta}<ArrowRight size={15} /></button>
          </article>); })}
      </div>

      {menu.data?.me && (
        <section className="st-panel st-today" aria-label="Today's menu">
          <div className="st-panel-head"><h2>Today's menu</h2>
            <span className="st-muted">{menu.data.me.hostel_gender} · {menu.data.me.is_foreign ? 'Foreign' : 'Local'} · {foodName(menu.data.me.region, menu.data.me.country)} · {menu.data.me.diet === 'Veg' ? 'Veg' : 'Non-veg'}</span>
            <button type="button" className="st-link" onClick={() => navigate('/mess-menu')}>Week and change food<ArrowRight size={14} /></button></div>
          {menu.data.items.length ? (
            <ul className="st-today-meals">{MEAL_SLOTS.map((m) => <li key={m.id}><span className="st-meal-ico"><m.icon size={15} /></span><span className="st-line-tx"><b>{m.label}</b><small>{menu.data!.items.find((i) => i.day_no === menu.data!.today && i.meal === m.id)?.dishes ?? 'Not set'}</small></span></li>)}</ul>
          ) : <p className="st-empty">No approved menu for your food choice yet.</p>}
          {menu.data.me.pending_change_id && <p className="st-note"><CalendarClock size={14} />From Monday {formatDate(menu.data.me.change_from!)} you eat {foodName(menu.data.me.next_region, menu.data.me.next_country)}, {menu.data.me.next_diet === 'Veg' ? 'veg' : 'non-veg'}.</p>}
        </section>)}

      <div className="st-cols">
        <section className="st-panel" aria-label="Quick actions">
          <h2>Quick actions</h2>
          <div className="st-tiles">
            {tiles.map((t) => { const M = MODC[t.mod]; const I = t.icon; return (
              <button key={t.label} type="button" className="st-tile" onClick={t.go}>
                <span className="st-tile-ico" style={{ background: M.bg, color: M.fg }}><I size={19} /></span>
                <span className="st-tile-tx"><b>{t.label}</b><small>{t.sub}</small></span><ChevronRight size={16} className="st-muted" />
              </button>); })}
          </div>
        </section>
        <section className="st-panel" aria-label="Recent activity">
          <h2>Recent activity</h2>
          {activity.length ? (
            <ul className="st-feed">{activity.map((a, i) => { const M = MODC[a.mod]; const I = a.icon; return (
              <li key={i}><span className="st-feed-ico" style={{ background: M.bg, color: M.fg }}><I size={15} /></span><span><b>{a.title}</b><small>{a.sub}</small></span><time>{formatDate(a.at)}</time></li>); })}</ul>
          ) : <p className="st-empty">Payments, outings and sick leave appear here.</p>}
        </section>
      </div>

      {reg && (
        <section className="st-panel" aria-label="Hostel journey">
          <div className="st-panel-head"><h2>Your residency journey</h2><span className="st-muted">{reg.registration_no}</span><button type="button" className="st-link" onClick={() => navigate('/registration')}>Open<ArrowRight size={14} /></button></div>
          <Stepper steps={steps} />
        </section>)}

      {sheet === 'fees' && <FeesSheet open={open} receipts={dues.data?.receipts ?? []} onClose={() => setSheet(null)} onPaid={refresh} onReceipts={() => setSheet('receipts')} />}
      {sheet === 'receipts' && <ReceiptsSheet receipts={dues.data?.receipts ?? []} onClose={() => setSheet(null)} onAll={() => navigate('/fees')} />}
      {sheet === 'power' && meter.data && <PowerSheet m={meter.data} onClose={() => setSheet(null)} onDone={refresh} />}
      {(sheet === 'outing' || sheet === 'ask') && <OutingSheet ask={sheet === 'ask'} live={livePass} pending={pending} room={room.data?.bed_label} onClose={() => setSheet(null)} onDone={refresh} onShow={() => setSheet('outing')} />}
      {sheet === 'goal' && <CareerGoalSheet goal={goal.data ?? null} onClose={() => setSheet(null)} onDone={() => goal.mutate()} />}
      {sheet === 'renew' && rn && <RenewalSheet rn={rn} demands={rn.demands} onClose={() => setSheet(null)} onDone={refresh} />}
      {sheet === 'sick' && <SickSheet current={curSick} onClose={() => setSheet(null)} onDone={refresh} />}
      {sheet === 'room' && room.data && <RoomSheet r={room.data} onClose={() => setSheet(null)} />}
    </div>
  );
}

/* ---------------------------------------------------------------- fees */

function FeesSheet({ open, receipts, onClose, onPaid, onReceipts }: { open: Demand[]; receipts: Rcpt[]; onClose: () => void; onPaid: () => void; onReceipts: () => void }) {
  const [busy, setBusy] = useState(0);
  const [paid, setPaid] = useState<number | null>(null);
  const pay = async (list: Demand[]) => {
    setBusy(list.length > 1 ? -1 : list[0].demand_id);
    try {
      let total = 0;
      for (const d of list) {
        const order = await api<{ mode: string; order_id?: string; amount: number }>('/payments/orders', { method: 'POST', json: { demand_id: d.demand_id } });
        if (order.mode !== 'dev') { toast(`Payment order ${order.order_id} created; the receipt arrives when the bank confirms.`); continue; }
        await api('/payments/dev-confirm', { method: 'POST', json: { demand_id: d.demand_id, amount: balance(d) } });
        total += balance(d);
      }
      setPaid(total); onPaid();
    } catch (e) { toast(e instanceof Error ? e.message : String(e), 'critical'); } finally { setBusy(0); }
  };
  const total = open.reduce((a, d) => a + balance(d), 0);
  return (
    <Sheet mod="orange" icon={Wallet} title="Fees" sub={open.length ? `${open.length} to pay · ${formatINR(total)}` : 'Nothing is due'} onClose={onClose}
      footer={paid === null && open.length > 1 ? <Button variant="primary" loading={busy === -1} onClick={() => pay(open)}>Pay all {formatINR(total)}</Button> : undefined}>
      {paid !== null ? <Done title={`Paid ${formatINR(paid)}`} body="Your receipt is issued and saved under Receipts." onClose={onClose} /> : (
        <div className="st-stack">
          {open.length === 0 && <p className="st-empty">Nothing is due. Thank you.</p>}
          {open.map((d) => (
            <div key={d.demand_id} className={`st-line${d.status === 'Overdue' ? ' st-line-alert' : ''}`}>
              <span className="st-line-tx"><b>{headOf(d)}</b><small>Due {formatDate(d.due_date)}{d.status === 'Overdue' ? ' · overdue' : ''}{Number(d.amount_paid) ? ` · ${formatINR(d.amount_paid)} paid` : ''}</small></span>
              <span className="st-amt">{formatINR(balance(d))}</span>
              <Button size="sm" variant="secondary" loading={busy === d.demand_id} disabled={busy !== 0 && busy !== d.demand_id} onClick={() => pay([d])}>Pay</Button>
            </div>))}
          {receipts.length > 0 && <button type="button" className="st-link st-link-block" onClick={onReceipts}><Receipt size={15} />{receipts.length} receipts<ArrowRight size={14} /></button>}
          <p className="st-note">Payments go through the university gateway. In this test system the payment is confirmed at once.</p>
        </div>)}
    </Sheet>
  );
}

function ReceiptsSheet({ receipts, onClose, onAll }: { receipts: Rcpt[]; onClose: () => void; onAll: () => void }) {
  return (
    <Sheet mod="orange" icon={Receipt} title="Receipts" sub={`${receipts.length} on record`} onClose={onClose} footer={<Button variant="secondary" onClick={onAll}>Print a receipt</Button>}>
      {receipts.length === 0 ? <p className="st-empty">No receipts yet.</p> : (
        <ul className="st-list">{receipts.map((r) => (
          <li key={r.receipt_id}><span className="st-line-tx"><b>{headOf(r)}</b><small>{r.receipt_no} · {formatDateTime(r.paid_on)} · {r.payment_mode}</small></span><span className="st-amt">{formatINR(r.amount)}</span></li>))}</ul>)}
    </Sheet>
  );
}

/* ---------------------------------------------------------------- electricity */

function PowerSheet({ m, onClose, onDone }: { m: Meter; onClose: () => void; onDone: () => void }) {
  const rate = Number(m.rate_per_unit ?? 0), left = Number(m.units_left ?? 0), included = Number(m.included_units_per_month ?? 0), used = Number(m.units_this_month ?? 0), recharged = Number(m.recharged_this_month);
  const [amount, setAmount] = useState(200);
  const [done, setDone] = useState<number | null>(null);
  const { run, busy } = useAction();
  const pct = Math.min(100, (used / Math.max(included + recharged, 1)) * 100);
  const recharge = () => run(async () => {
    const r = await api<{ demand: { demand_id: number }; order: { mode: string } }>(`/meters/${m.meter_id}/recharge`, { method: 'POST', json: { amount } });
    if (r.order.mode === 'dev') await api('/payments/dev-confirm', { method: 'POST', json: { demand_id: r.demand.demand_id, amount } });
    setDone(amount / rate); onDone();
  }, '');
  return (
    <Sheet mod="amber" icon={Zap} title="Electricity" sub={`Meter ${m.meter_no} · ${included.toFixed(0)} units a month included`} onClose={onClose}
      footer={done === null ? <Button variant="primary" loading={busy} blockedReason={!rate ? 'The tariff for your room is not approved yet.' : amount < 50 ? 'At least ₹50.' : undefined} onClick={recharge}>Pay {formatINR(amount)}{rate ? ` for ${(amount / rate).toFixed(1)} units` : ''}</Button> : undefined}>
      {done !== null ? <Done title={`${done.toFixed(1)} units added`} body="The units are credited to your room meter." onClose={onClose} /> : (
        <div className="st-stack">
          <div className="st-meter">
            <div><b>{Math.max(left, 0).toFixed(0)}</b><small>units left</small></div>
            <div className="st-meter-bar"><i style={{ width: `${pct}%`, background: left < 10 ? '#E5484D' : undefined }} /></div>
            <small>{used.toFixed(0)} used of {(included + recharged).toFixed(0)} this month · {formatINR(rate)} per extra unit</small>
          </div>
          <div><span className="st-label">Recharge amount</span>
            <div className="st-presets">{[100, 200, 500, 1000].map((v) => <button key={v} type="button" aria-pressed={amount === v} onClick={() => setAmount(v)}>{formatINR(v)}</button>)}</div>
          </div>
          <Field label="Or type an amount"><Input type="number" min={50} step={10} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
          {m.recharges.length > 0 && <div><span className="st-label">Recent recharges</span><ul className="st-list">{m.recharges.slice(0, 3).map((r) => <li key={r.recharge_id}><span className="st-line-tx"><b>{Number(r.units_credited).toFixed(1)} units</b><small>{formatDateTime(r.created_at)}</small></span><StatusChip status={r.status} /></li>)}</ul></div>}
        </div>)}
    </Sheet>
  );
}

/* ---------------------------------------------------------------- sick leave */

function SickSheet({ current, onClose, onDone }: { current?: Sick; onClose: () => void; onDone: () => void }) {
  const today0 = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ illness_details: '', from_date: today0, to_date: today0 });
  const [sent, setSent] = useState(false);
  const { run, busy } = useAction();
  if (current) return (
    <Sheet mod="rose" icon={HeartPulse} title="Sick leave" sub={`${formatDate(current.from_date)} to ${formatDate(current.to_date)}`} onClose={onClose}
      footer={<Button variant="secondary" loading={busy} onClick={() => run(() => api(`/sick-leaves/${current.sick_leave_id}/close`, { method: 'POST', json: {} }).then(() => { onDone(); onClose(); }), 'Glad you are better. Leave closed.')}>I am well now</Button>}>
      <div className="st-stack">
        <StatusChip status={current.status} />
        <p style={{ margin: 0 }}>{current.illness_details}</p>
        {current.visited_by ? <p className="st-note"><ShieldCheck size={14} />Visited: {current.visit_remarks}</p> : <p className="st-note"><ShieldCheck size={14} />Stay in your room; your Floor Manager will come and see you.</p>}
        {current.status === 'Approved' && <p className="st-note"><UtensilsCrossed size={14} />Your meals come to your room until the leave ends.</p>}
      </div>
    </Sheet>);
  return (
    <Sheet mod="rose" icon={HeartPulse} title="Report that you are unwell" sub="Your Floor Manager visits; the Chief Manager approves" onClose={onClose}
      footer={sent ? undefined : <Button variant="primary" loading={busy} blockedReason={f.illness_details.trim().length < 3 ? 'Say what is wrong.' : f.to_date < f.from_date ? 'Until must be after From.' : undefined}
        onClick={() => run(() => api('/sick-leaves', { method: 'POST', json: f }).then(() => { setSent(true); onDone(); }), '')}>Report sick leave</Button>}>
      {sent ? <Done title="Reported" body="Your Floor Manager will come and see you. Rest in your room." onClose={onClose} /> : (
        <div className="st-stack">
          <Field label="What is wrong" required><Textarea rows={3} value={f.illness_details} onChange={(e) => setF({ ...f, illness_details: e.target.value })} placeholder="Fever since last night" /></Field>
          <div className="st-grid2">
            <Field label="From" required><Input type="date" value={f.from_date} onChange={(e) => setF({ ...f, from_date: e.target.value })} /></Field>
            <Field label="Until" required><Input type="date" value={f.to_date} min={f.from_date} onChange={(e) => setF({ ...f, to_date: e.target.value })} /></Field>
          </div>
        </div>)}
    </Sheet>
  );
}

/* ---------------------------------------------------------------- room */

function RoomSheet({ r, onClose }: { r: Room; onClose: () => void }) {
  return (
    <Sheet mod="teal" icon={BedDouble} title={r.bed_label} sub={`${r.hostel_name} · ${r.floor_name} · ${r.type_name ?? 'Room'}${r.is_ac ? ' · AC' : ''}`} onClose={onClose}>
      <div className="st-stack">
        <div className="st-facts">
          <span><KeyRound size={15} /><small>Key</small><b>{r.key_no}</b></span>
          <span><CalendarClock size={15} /><small>Since</small><b>{formatDate(r.allocation_date)}</b></span>
          <span><UtensilsCrossed size={15} /><small>Mess</small><b>{r.mess ? `${r.mess.mess_name}${r.mess.cuisine ? ` · ${words(r.mess.cuisine)}` : ''}` : '—'}</b></span>
        </div>
        <div><span className="st-label">In this room</span>
          <ul className="st-list">{r.mates.map((m) => (
            <li key={m.bed_code}><span className="st-bed">{bedLetter(m.bed_code)}</span><span className="st-line-tx"><b>{m.full_name ?? m.staff_name ?? 'Vacant'}</b><small>{m.student_id ? `${m.student_id}${m.programme ? ` · ${m.programme}` : ''}` : m.staff_id ? 'Faculty' : 'Free bed'}</small></span></li>))}</ul>
        </div>
        <div><span className="st-label">Who to call</span>
          <ul className="st-list">{r.people.map((p) => (
            <li key={p.hostel_role}><span className="st-line-tx"><b>{p.full_name}</b><small>{ROLE[p.hostel_role] ?? words(p.hostel_role)}</small></span>{p.mobile_no && <a className="st-call" href={`tel:${p.mobile_no}`}><Phone size={14} />{p.mobile_no}</a>}</li>))}</ul>
        </div>
        <p className="st-note"><BookOpen size={14} />Report a damaged item to your Floor Manager; it is checked against your room list when you vacate.</p>
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- yearly renewal */

type Cat = { facility_id: string; hostel_code: string; facility_name: string; types: { room_type_id: number; type_name: string; registration_fee: number; hostel_fee: number; open_beds: number }[] }[];

/** Where the renewal is, as six steps: choose, registration fee, room, hostel fees, office checks, moved into next year. */
function renewalStep(rn: Renewal) {
  const r = rn.renewal;
  if (!r) return 0;
  if (r.status === 'Applied') return 1;
  if (['Fee_Paid', 'Waitlisted', 'Allotted'].includes(r.status)) return 2;
  if (r.status === 'Accepted') return 3;
  if (r.status === 'Confirmed') return rn.demands.some((d) => OPEN.includes(d.status)) ? 3 : 4;
  return 5;
}
const RENEW_STEPS = ['Choose', 'Registration fee', 'Room for next year', 'Hostel fees', 'Office checks', 'Moved in'];

function RenewalBanner({ rn, onOpen }: { rn: Renewal; onOpen: () => void }) {
  const r = rn.renewal, y = rn.next!;
  const leaving = !r && rn.current?.next_year_intent === 'Leave';
  const step = renewalStep(rn);
  const closes = y.renewal_open ? y.renewal_closes : y.registration_closes;
  const line = leaving ? `You told the office you are not staying in ${y.academic_year}. You can still change your mind while renewal is open.`
    : !r ? `Renewal for ${y.academic_year} is open${closes ? ` until ${formatDate(closes)}` : ''}. Keep ${rn.current!.bed_label}, ask for another room, or tell us you are leaving.`
    : step === 4 ? `All paid. Room Allotment moves you into ${y.academic_year} once the fee check and the Chief Manager are done.`
    : `${r.registration_no} · next step: ${RENEW_STEPS[step].toLowerCase()}.`;
  return (
    <section className="st-renew" aria-label={`Renewal for ${y.academic_year}`}>
      <span className="st-ico st-renew-ico"><CalendarClock size={20} /></span>
      <span className="st-renew-tx">
        <b>{leaving ? `Leaving after ${rn.current!.academic_year}` : r ? `Your ${y.academic_year} renewal` : `Stay with us in ${y.academic_year}?`}</b>
        <small>{line}</small>
        {r && <span className="st-renew-bar" aria-hidden="true">{RENEW_STEPS.map((s, i) => <i key={s} className={i < step ? 'on' : i === step ? 'now' : ''} />)}</span>}
      </span>
      <button type="button" className="st-card-btn st-renew-btn" onClick={onOpen}>{leaving ? 'Change my mind' : r ? 'Open' : 'Renew my room'}<ArrowRight size={15} /></button>
    </section>
  );
}

function RenewalSheet({ rn, demands, onClose, onDone }: { rn: Renewal; demands: Demand[]; onClose: () => void; onDone: () => void }) {
  const cur = rn.current!, y = rn.next!, r = rn.renewal;
  const step = renewalStep(rn);
  const leaving = !r && cur.next_year_intent === 'Leave';
  const [choice, setChoice] = useState<'Keep' | 'Change' | 'Leave'>('Keep');
  const [fac, setFac] = useState(cur.facility_id);
  const [type, setType] = useState<number | ''>('');
  const [plan, setPlan] = useState<'Single' | 'Two_Instalments'>('Single');
  const [cuisine, setCuisine] = useState('South_Indian');
  const [left, setLeft] = useState(false);
  const cat = useApi<Cat>(choice === 'Change' && !r ? `/allotment/catalogue?year=${y.academic_year}` : null);
  const { run, busy } = useAction();
  const open = demands.filter((d) => OPEN.includes(d.status));
  const regFee = demands.find((d) => d.fee_head === 'Registration' && OPEN.includes(d.status));
  const hostel = cat.data?.find((h) => h.facility_id === fac);
  const windowOpen = y.renewal_open || y.registration_open;

  const payAll = (list: Demand[]) => run(async () => {
    for (const d of list) {
      const order = await api<{ mode: string; order_id?: string }>('/payments/orders', { method: 'POST', json: { demand_id: d.demand_id } });
      if (order.mode !== 'dev') { toast(`Payment order ${order.order_id} created; the receipt arrives when the bank confirms.`); continue; }
      await api('/payments/dev-confirm', { method: 'POST', json: { demand_id: d.demand_id, amount: balance(d) } });
    }
    onDone();
  }, 'Paid. Your receipt is saved under Receipts.');
  const submit = () => run(async () => {
    await api('/me/renewal', { method: 'POST', json: choice === 'Change' ? { choice, facility_id: fac, room_type_id: Number(type) } : { choice } });
    if (choice === 'Leave') setLeft(true);
    onDone();
  }, choice === 'Leave' ? '' : 'Renewal started. Pay the registration fee to hold your place.');

  let body: ReactNode, footer: ReactNode = undefined;
  if (left) body = <Done title="Noted" body={`The office knows you are not staying in ${y.academic_year}. Your room is yours until the end of ${cur.academic_year}; vacate and hand over the key before you leave.`} onClose={onClose} />;
  else if (!r) {
    const fee = rn.same_fee;
    body = (
      <div className="st-stack">
        {leaving && <p className="st-note"><CalendarClock size={14} />You said you are leaving. Choose again below if your plans changed.</p>}
        {!windowOpen && <p className="st-note"><CalendarClock size={14} />Renewal for {y.academic_year} {y.renewal_opens ? `opens on ${formatDate(y.renewal_opens)}` : 'is not open yet'}. You can choose then.</p>}
        <div className="st-choices" role="radiogroup" aria-label="Next year">
          {([
            { v: 'Keep', icon: KeyRound, t: `Keep ${cur.bed_label}`, s: fee ? `Same bed and key. ${formatINR(fee.hostel_fee)} residency${fee.mess_fee != null ? ` + ${formatINR(fee.mess_fee)} mess` : ''} + ${formatINR(fee.meter_charge)} meter charge for the year. No registration fee or deposits on renewal.` : `Same bed. The ${y.academic_year} fee for this room is not set yet.` },
            { v: 'Change', icon: BedDouble, t: 'Move to another room', s: 'Choose a hostel and room type. The office offers a bed from those free next year.' },
            { v: 'Leave', icon: DoorOpen, t: 'I am not staying', s: `Your bed is released for ${y.academic_year}. Nothing to pay.` },
          ] as const).map((o) => (
            <button key={o.v} type="button" role="radio" aria-checked={choice === o.v} className="st-choice" onClick={() => setChoice(o.v)}>
              <span className="st-choice-ico"><o.icon size={18} /></span><span className="st-line-tx"><b>{o.t}</b><small>{o.s}</small></span><i className="st-choice-dot" />
            </button>))}
        </div>
        {choice === 'Change' && (
          <div className="st-grid2">
            <Field label="Hostel"><Select value={fac} onChange={(e) => { setFac(e.target.value); setType(''); }} options={(cat.data ?? []).map((h) => ({ value: h.facility_id, label: `${h.hostel_code} · ${h.facility_name}` }))} /></Field>
            <Field label="Room type"><Select value={String(type)} onChange={(e) => setType(e.target.value ? Number(e.target.value) : '')}
              options={[{ value: '', label: 'Choose' }, ...(hostel?.types ?? []).map((t) => ({ value: String(t.room_type_id), label: `${t.type_name} · ${formatINR(t.hostel_fee)}` }))]} /></Field>
          </div>)}
      </div>);
    footer = <Button variant="primary" loading={busy} blockedReason={!windowOpen ? 'Renewal is not open.' : choice === 'Keep' && !fee ? 'The fee for next year is not set yet.' : choice === 'Change' && !type ? 'Choose the room type.' : undefined} onClick={submit}>
      {choice === 'Leave' ? 'Confirm I am leaving' : choice === 'Keep' ? `Renew ${cur.bed_label}` : 'Ask for this room'}</Button>;
  } else {
    const keeps = !!r.retain_subspace_id;
    const flow = RENEW_STEPS.map((label, i) => ({ label, state: i < step ? 'done' : i === step ? 'now' : 'next' }));
    let action: ReactNode = null;
    if (step === 1 && regFee) {
      action = <p className="st-note"><Wallet size={14} />Pay the {formatINR(balance(regFee))} registration fee to hold your place for {y.academic_year}.</p>;
      footer = <Button variant="primary" loading={busy} onClick={() => payAll([regFee])}>Pay {formatINR(balance(regFee))}</Button>;
    } else if (step === 2 && keeps) {
      action = <p className="st-note"><KeyRound size={14} />Confirm {r.bed_label ?? cur.bed_label} as your bed for {y.academic_year}. The same bed and key carry on.</p>;
      footer = <Button variant="primary" loading={busy} onClick={() => run(() => api(`/registrations/${r.registration_id}/keep-room`, { method: 'POST' }).then(onDone), 'Room confirmed for next year')}>Confirm my room</Button>;
    } else if (step === 2 && r.status === 'Allotted' && r.student_decision === 'Pending') {
      action = <p className="st-note"><BedDouble size={14} />The office offers {r.bed_label} for {y.academic_year}. It is held until {formatDateTime(r.hold_until)}.</p>;
      footer = <Button variant="primary" loading={busy} onClick={() => run(() => api(`/offers/${r.offer_id}/decision`, { method: 'POST', json: { decision: 'Accepted' } }).then(onDone), 'Room accepted')}>Accept {r.bed_label}</Button>;
    } else if (step === 2) {
      action = <p className="st-note"><BedDouble size={14} />You asked for another room. The office offers a bed when one is free for {y.academic_year}; it appears here.</p>;
    } else if (step === 3 && !r.fee_plan_id) {
      action = (
        <div className="st-stack">
          <div><span className="st-label">How will you pay the residency fee?</span>
            <div className="st-presets">{([['Single', 'In one payment'], ['Two_Instalments', 'In two instalments']] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={plan === v} onClick={() => setPlan(v)}>{l}</button>)}</div></div>
          <div><span className="st-label">Mess for next year</span>
            <div className="st-presets">{[['South_Indian', 'South Indian'], ['North_Indian', 'North Indian'], ['Special_Diet', 'Special diet']].map(([v, l]) => <button key={v} type="button" aria-pressed={cuisine === v} onClick={() => setCuisine(v)}>{l}</button>)}</div></div>
        </div>);
      footer = <Button variant="primary" loading={busy} onClick={() => run(() => api(`/registrations/${r.registration_id}/fee-plan`, { method: 'POST', json: { plan_type: plan, cuisine } }).then(onDone), 'Your fees are ready to pay')}>Confirm fee plan</Button>;
    } else if (step === 3) {
      const total = open.reduce((a, d) => a + balance(d), 0);
      action = <ul className="st-list">{open.map((d) => <li key={d.demand_id}><span className="st-line-tx"><b>{headOf(d)}</b><small>Due {formatDate(d.due_date)}</small></span><span className="st-amt">{formatINR(balance(d))}</span></li>)}</ul>;
      footer = <Button variant="primary" loading={busy} onClick={() => payAll(open)}>Pay {formatINR(total)}</Button>;
    } else if (step === 4) {
      action = (
        <div className="st-facts">
          <span><small>Fee check</small><b>{r.fee_check_status === 'Verified' ? 'Verified' : 'With Room Allotment'}</b></span>
          <span><small>Chief Manager</small><b>{r.cw_status === 'Approved' ? 'Approved' : words(r.cw_status)}</b></span>
          <span><small>Moving in</small><b>From {formatDate(y.start_date)}</b><small>No break in your stay</small></span>
        </div>);
    } else action = <Done title={`You are in for ${y.academic_year}`} body={`${r.bed_label ?? cur.bed_label} is yours for ${y.academic_year}.`} onClose={onClose} />;
    body = (
      <div className="st-stack">
        <ol className="st-flow st-flow-mini">{flow.map((x, i) => <li key={x.label} className={`st-flow-${x.state}`}><span>{x.state === 'done' ? <CheckCircle2 size={13} /> : i + 1}</span><b>{x.label}</b></li>)}</ol>
        <div className="st-facts">
          <span><small>Renewal</small><b>{r.registration_no}</b><small>{words(r.status)}</small></span>
          <span><small>Next year</small><b>{r.bed_label ?? (keeps ? cur.bed_label : 'Bed to be offered')}</b><small>{r.hostel_code}{r.type_name ? ` · ${r.type_name}` : ''}</small></span>
          <span><small>This year</small><b>{cur.bed_label}</b><small>Until {cur.academic_year} ends</small></span>
        </div>
        {action}
      </div>);
  }
  return <Sheet mod="teal" icon={CalendarClock} title={`Renewal for ${y.academic_year}`} sub={r ? r.registration_no : `You live in ${cur.bed_label} this year`} onClose={onClose} footer={footer}>{body}</Sheet>;
}

