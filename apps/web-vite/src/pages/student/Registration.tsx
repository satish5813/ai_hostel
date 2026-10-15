import { useMemo, useState } from 'react';
import { Button, ConfirmDialog, Countdown, Notice, RadioGroup, StatusChip, formatDate, formatDateTime, formatINR } from '@/lib/klh';
import { api } from '@/lib/api';
import { bedLabel, roomLabel, useAction, useApi, useSession, words } from '@/lib/ui';
import { bedLetter } from '@/lib/beds';

type Reg = { registration_id: number; registration_no: string; student_id: string; hostel_code: string; hostel_name: string | null; type_name: string; status: string; applied_on: string; waitlist_no: number | null; registration_fee_status: string | null; registration_fee: string | null; fee_plan_id: number | null; plan_type: string | null; plan_status: string | null; offer_id: number | null; subspace_id: string | null; student_decision: string | null; hold_until: string | null; hostel_alloc_id: number | null; key_no: string | null; allocation_date: string | null; fee_check_status: string; fee_check_remarks: string | null };
type Type = { room_type_id: number; type_name: string; sharing_count: number; is_ac: boolean; attached_bath: boolean; registration_fee: number; hostel_fee: number; open_beds: number; caution_deposit: number; elec_caution_deposit: number; meter_charge: number; mess_fee: number | null };
type Hostel = { facility_id: string; hostel_code: string; facility_name: string; hostel_gender: string; open_beds: number; types: Type[] };
type ChoiceRoom = { space_id: string; room_code: string; floor_name: string; floor_no: number; is_accessible: boolean; sharing_count: number; mates: number; beds: { subspace_id: string; bed_code: string; bed_status: string }[] };
type Demand = { demand_id: number; fee_head: string; instalment_no: number; amount_due: string; amount_paid: string; due_date: string; status: string };
type Dues = { demands: Demand[]; receipts: { receipt_id: number; amount: string }[] };
const OPEN = ['Pending', 'Part_Paid', 'Overdue'];
const STEPS = ['Apply', 'Registration fee', 'Choose room', 'Hostel fees', 'Warden check', 'Check in'];
const stepOf = (r?: Reg) => !r ? 0 : r.status === 'Applied' ? 1 : ['Fee_Paid', 'Waitlisted', 'Allotted'].includes(r.status) ? 2 : r.status === 'Accepted' ? 3 : r.status === 'Confirmed' ? (r.fee_check_status === 'Verified' ? 5 : 4) : r.status === 'Checked_In' ? 6 : 0;
const bedNo = (code: string) => bedLetter(code);
/** BH1-301-B2 -> 2 */
const bedOf = (id?: string | null) => (id ?? '').match(/-B(\d+)$/)?.[1] ?? '';

/**
 * REG-01 / REG-03 / REG-04 Hostel registration, as one journey:
 * apply (hostel and room type) -> pay the registration fee -> choose a bed from the rooms still open -> fee plan and fees ->
 * a Warden checks the fees -> collect the key. The dues stay beside every step.
 */
/** Everything paid on joining for a room type: registration, both refundable deposits, the year's hostel, mess and meter charge. */
const joining = (t: { registration_fee: number; caution_deposit: number; elec_caution_deposit: number; hostel_fee: number; meter_charge: number; mess_fee: number | null }) =>
  t.registration_fee + t.caution_deposit + t.elec_caution_deposit + t.hostel_fee + t.meter_charge + (t.mess_fee ?? 0);

export default function Registration() {
  const s = useSession()!;
  const regs = useApi<Reg[]>('/registrations/mine');
  const reg = regs.data?.find((r) => !['Cancelled', 'Vacated'].includes(r.status));
  const dues = useApi<Dues>(reg ? `/students/${s.id}/demands` : null);
  const refresh = () => { regs.mutate(); dues.mutate(); };
  const at = stepOf(reg);
  return (
    <div className="pg">
      <div className="pg-head">
        <div><h1>{reg ? `${reg.hostel_name ?? reg.hostel_code}, ${reg.type_name}` : 'Apply for a residency room'}</h1><p>{reg ? `Registration ${reg.registration_no} · applied ${formatDate(reg.applied_on)}` : 'Residencies for you, with the fee and the beds still open in each room type.'}</p></div>
        {reg && <StatusChip status={reg.status} />}
      </div>
      <div className="steps" aria-label="Progress">
        {STEPS.map((label, i) => <div key={label} className={`step${i < at ? ' step-done' : i === at ? ' step-now' : ''}`}><i />{label}</div>)}
      </div>
      {regs.data && !reg && <Apply onDone={refresh} />}
      {reg && (
        <div className="sj">
          <div className="klh-stack" style={{ gap: 12 }}>
            {reg.status === 'Applied' && <Notice tone="info" title="Pay the registration fee">{formatINR(reg.registration_fee ?? 0)}, not refundable. The rooms open for you to choose as soon as it is paid. Pay it from the dues on the right.</Notice>}
            {['Fee_Paid', 'Waitlisted'].includes(reg.status) && <ChooseRoom reg={reg} onDone={refresh} />}
            {reg.status === 'Allotted' && <Offer reg={reg} onDone={refresh} />}
            {reg.status === 'Accepted' && !reg.fee_plan_id && <FeePlan reg={reg} onDone={refresh} />}
            {reg.status === 'Accepted' && reg.fee_plan_id && <Notice tone="info" title="Pay the residency and rasoi fees">Room {roomLabel(reg.subspace_id?.replace(/-B\d+$/, ''))}, bed {bedOf(reg.subspace_id)} is kept for you. Pay the demands on the right; a Warden then checks them.</Notice>}
            {reg.status === 'Confirmed' && reg.fee_check_status === 'Pending' && <Notice tone="progress" title="Fees paid; the Warden is checking them">This page changes as soon as the fees are verified. Then collect your key at the residency office.</Notice>}
            {reg.status === 'Confirmed' && reg.fee_check_status === 'Query' && <Notice tone="critical" title="The Warden has a query on your fees">{reg.fee_check_remarks} Visit the hostel accounts desk with your receipts.</Notice>}
            {reg.status === 'Confirmed' && reg.fee_check_status === 'Verified' && <Notice tone="success" title="All set. Collect your key">Visit the hostel office with your ID card. Your bed: {bedLabel(reg.subspace_id)}.</Notice>}
            {(reg.subspace_id || reg.status === 'Checked_In') && <MyBed reg={reg} />}
          </div>
          <DuesPanel dues={dues.data} onPaid={refresh} />
        </div>)}
    </div>
  );
}

function Apply({ onDone }: { onDone: () => void }) {
  const cat = useApi<Hostel[]>('/allotment/catalogue');
  const [hostel, setHostel] = useState<Hostel | null>(null);
  const [type, setType] = useState<Type | null>(null);
  const [ok, setOk] = useState(false);
  const { run, busy } = useAction();
  return (
    <div className="klh-stack" style={{ gap: 16 }}>
      <section className="box"><div className="box-head"><h2>1. Residency</h2></div>
        <div className="box-body opts">
          {(cat.data ?? []).map((h) => (
            <button key={h.facility_id} type="button" className="opt" aria-pressed={hostel?.facility_id === h.facility_id} onClick={() => { setHostel(h); setType(null); }}>
              <span className="opt-row"><b>{h.facility_name}</b><span className="tag">{h.hostel_code}</span></span>
              <span className="opt-row"><span>{h.types.length} room type{h.types.length === 1 ? '' : 's'}</span><span className={h.open_beds ? 'tag tag-ok' : 'tag tag-warn'}>{h.open_beds ? `${h.open_beds} beds open` : 'Waiting list only'}</span></span>
            </button>))}
          {cat.data && !cat.data.length && <p className="klh-muted">No residency has fees set for this year yet.</p>}
        </div>
      </section>
      {hostel && (
        <section className="box"><div className="box-head"><h2>2. Room type in {hostel.hostel_code}</h2></div>
          <div className="box-body opts">
            {hostel.types.map((t) => (
              <button key={t.room_type_id} type="button" className="opt" aria-pressed={type?.room_type_id === t.room_type_id} onClick={() => setType(t)}>
                <span className="opt-row"><b>{t.type_name}</b><span className={t.open_beds ? 'tag tag-ok' : 'tag tag-warn'}>{t.open_beds ? `${t.open_beds} open` : 'Full'}</span></span>
                <span className="opt-big">{formatINR(t.hostel_fee)}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink-muted)' }}> a year</span></span>
                <span>{t.sharing_count} per room{t.is_ac ? ' · AC' : ''}{t.attached_bath ? ' · attached bath' : ''}</span>
                <span className="reg-join"><b>On joining {formatINR(joining(t))}</b> registration {formatINR(t.registration_fee)} · caution deposit {formatINR(t.caution_deposit)} · electricity deposit {formatINR(t.elec_caution_deposit)} · hostel {formatINR(t.hostel_fee)}{t.mess_fee != null ? ` · mess ${formatINR(t.mess_fee)}` : ''} · meter {formatINR(t.meter_charge)}</span>
              </button>))}
          </div>
        </section>)}
      {type && (
        <section className="box"><div className="box-body klh-stack" style={{ gap: 12 }}>
          {!type.open_beds && <Notice tone="warning" title="No bed open in this room type">You can still apply; you join the waiting list in order of application.</Notice>}
          <label className="klh-row" style={{ alignItems: 'flex-start', gap: 10, fontSize: 14 }}><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} style={{ marginTop: 4 }} /> <span>I accept the hostel rules, including that the registration fee of {formatINR(type.registration_fee)} is not refundable. The caution deposit ({formatINR(type.caution_deposit)}) and electricity caution deposit ({formatINR(type.elec_caution_deposit)}) are returned when I leave, less approved deductions. On renewal only the hostel fee, mess fee and meter charge are paid.</span></label>
          <div><Button variant="accent" pill size="lg" iconRight="arrow-right" loading={busy} blockedReason={!ok ? 'Accept the residency rules to apply.' : undefined}
            onClick={() => run(() => api('/registrations', { method: 'POST', json: { facility_id: hostel!.facility_id, room_type_id: type.room_type_id, rules_accepted: true } }).then(onDone), 'Applied. Pay the registration fee next.')}>Apply for {type.type_name}</Button></div>
        </div></section>)}
    </div>
  );
}

function ChooseRoom({ reg, onDone }: { reg: Reg; onDone: () => void }) {
  const ch = useApi<{ rooms: ChoiceRoom[] }>(`/registrations/${reg.registration_id}/choices`);
  const floors = useMemo(() => [...new Map((ch.data?.rooms ?? []).map((r) => [r.floor_name, r.floor_no])).entries()].sort((a, b) => a[1] - b[1]).map(([n]) => n), [ch.data]);
  const [floor, setFloor] = useState('');
  const [bed, setBed] = useState<{ id: string; room: string; no: string } | null>(null);
  const [ask, setAsk] = useState(false);
  const { run, busy } = useAction();
  const f = floor || floors[0];
  const rooms = (ch.data?.rooms ?? []).filter((r) => r.floor_name === f);
  return (
    <section className="box">
      <div className="box-head"><h2>Choose your room</h2><span className="grow" /><span className="legend"><span><i className="bd bd-open" />Open</span><span><i className="bd bd-occ" />Taken</span></span></div>
      {reg.waitlist_no && <div className="box-body" style={{ paddingBottom: 0 }}><Notice tone="progress" title={`Waiting list number ${reg.waitlist_no}`}>You can still pick any bed that opens below.</Notice></div>}
      {ch.data && !ch.data.rooms.length && <div className="q-empty">No bed of {reg.type_name} is open right now. You stay on the waiting list; the office offers a bed when one opens.</div>}
      {floors.length > 0 && <div className="fl-tabs" role="tablist">{floors.map((x) => <button key={x} role="tab" className="fl-tab" aria-selected={x === f} onClick={() => setFloor(x)}>{x}</button>)}</div>}
      <div className="rooms" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {rooms.map((r) => (
          <div key={r.space_id} className={`rm${bed?.room === r.room_code ? ' rm-pick' : ''}`} style={{ cursor: 'default' }}>
            <span className="rm-top"><span className="rm-no">{r.room_code}</span><span className="rm-type">{r.mates ? `${r.mates} already in` : 'Empty room'}</span></span>
            <span className="beds">
              {r.beds.map((b) => {
                const open = b.bed_status === 'Vacant';
                return <button key={b.subspace_id} type="button" className="bed" disabled={!open} aria-label={`Room ${r.room_code}, bed ${bedNo(b.bed_code)}${open ? "" : ", taken"}`} aria-pressed={bed?.id === b.subspace_id} onClick={() => setBed({ id: b.subspace_id, room: r.room_code, no: bedNo(b.bed_code) })}><i className={`bd ${open ? 'bd-open' : 'bd-occ'}`} />{bedNo(b.bed_code)}</button>;
              })}
            </span>
            {r.is_accessible && <span className="rm-foot">Accessible</span>}
          </div>))}
      </div>
      <div className="box-body" style={{ borderTop: '1px solid var(--ui-line)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ flex: 1, fontSize: 13, color: 'var(--ink-muted)' }}>{bed ? `Room ${bed.room}, bed ${bed.no} selected.` : 'Pick an open bed. You can also wait for the office to allot one.'}</span>
        <Button variant="accent" pill icon="bed" loading={busy} blockedReason={!bed ? 'Pick an open bed first.' : undefined} onClick={() => setAsk(true)}>Take this bed</Button>
      </div>
      <ConfirmDialog open={ask} title={`Take room ${bed?.room}, bed ${bed?.no}?`} body="The bed is kept for you while you choose your fee plan and pay the residency and rasoi fees. To change it later, ask the residency office." confirmLabel="Take bed"
        onCancel={() => setAsk(false)} onConfirm={() => { setAsk(false); run(() => api(`/registrations/${reg.registration_id}/choose`, { method: 'POST', json: { subspace_id: bed!.id } }).then(onDone), 'Bed is yours. Choose the fee plan next.'); }} />
    </section>
  );
}

function Offer({ reg, onDone }: { reg: Reg; onDone: () => void }) {
  const [decline, setDecline] = useState(false);
  const { run, busy } = useAction();
  return (
    <section className="box">
      <div className="box-head"><h2>Room offered: {roomLabel(reg.subspace_id?.replace(/-B\d+$/, ''))}, bed {bedOf(reg.subspace_id)}</h2><span className="grow" />{reg.hold_until && <Countdown until={reg.hold_until} label="Hold ends in" />}</div>
      <div className="box-body klh-stack" style={{ gap: 12 }}>
        <p className="klh-muted" style={{ margin: 0 }}>The hostel office offered you this bed. Accept before {formatDateTime(reg.hold_until)} or it is released.</p>
        <div className="klh-row"><Button variant="accent" pill icon="check" loading={busy} onClick={() => run(() => api(`/offers/${reg.offer_id}/decision`, { method: 'POST', json: { decision: 'Accepted' } }).then(onDone), 'Room accepted. Choose your fee plan next.')}>Accept room</Button><Button variant="secondary" onClick={() => setDecline(true)}>Decline</Button></div>
      </div>
      <ConfirmDialog open={decline} title="Decline this room?" body="The bed is released and you can choose another open bed." tone="danger" confirmLabel="Decline room" requireRemarks remarksLabel="Why are you declining?" onCancel={() => setDecline(false)}
        onConfirm={(r) => { setDecline(false); run(() => api(`/offers/${reg.offer_id}/decision`, { method: 'POST', json: { decision: 'Declined', decline_reason: r } }).then(onDone), 'Room declined'); }} />
    </section>
  );
}

function FeePlan({ reg, onDone }: { reg: Reg; onDone: () => void }) {
  const [plan, setPlan] = useState('Two_Instalments');
  const [cuisine, setCuisine] = useState('South_Indian');
  const { run, busy } = useAction();
  return (
    <section className="box">
      <div className="box-head"><h2>Fee plan and rasoi</h2></div>
      <div className="box-body klh-stack" style={{ gap: 14 }}>
        <RadioGroup label="Residency fee" variant="cards" value={plan} onChange={setPlan} options={[{ value: 'Single', label: 'Single payment', description: 'Due within 7 days' }, { value: 'Two_Instalments', label: 'Two instalments', description: 'First part now, second on the due date' }]} />
        <RadioGroup label="Rasoi cuisine" variant="cards" value={cuisine} onChange={setCuisine} options={[{ value: 'South_Indian', label: 'South Indian' }, { value: 'North_Indian', label: 'North Indian' }, { value: 'Special_Diet', label: 'Continental / special diet' }]} />
        <div><Button variant="accent" pill loading={busy} onClick={() => run(() => api(`/registrations/${reg.registration_id}/fee-plan`, { method: 'POST', json: { plan_type: plan, cuisine } }).then(onDone), 'Fees are ready to pay')}>Confirm plan</Button></div>
      </div>
    </section>
  );
}

function MyBed({ reg }: { reg: Reg }) {
  const room = reg.subspace_id?.replace(/-B\d+$/, '');
  return (
    <section className="box"><div className="box-body">
      <div className="facts">
        <div><span>Room</span><b>{roomLabel(room)}</b></div>
        <div><span>Bed</span><b>{bedOf(reg.subspace_id)}</b></div>
        <div><span>Room type</span><b>{reg.type_name}</b></div>
        <div><span>{reg.status === 'Checked_In' ? 'Key' : 'Fee check'}</span><b>{reg.status === 'Checked_In' ? reg.key_no : words(reg.fee_check_status)}</b></div>
      </div>
    </div></section>
  );
}

function DuesPanel({ dues, onPaid }: { dues?: Dues; onPaid: () => void }) {
  const s = useSession()!;
  const { run, busy } = useAction();
  const open = (dues?.demands ?? []).filter((d) => OPEN.includes(d.status));
  const total = open.reduce((a, d) => a + Number(d.amount_due) - Number(d.amount_paid), 0);
  const paid = (dues?.receipts ?? []).reduce((a, r) => a + Number(r.amount), 0);
  const pay = (d: Demand) => run(async () => {
    const bal = Number(d.amount_due) - Number(d.amount_paid);
    const order = await api<{ mode: string; order_id?: string; key_id?: string; amount: number }>('/payments/orders', { method: 'POST', json: { demand_id: d.demand_id } });
    if (order.mode === 'dev') await api('/payments/dev-confirm', { method: 'POST', json: { demand_id: d.demand_id, amount: bal } });
    else alert(`Razorpay order ${order.order_id} for ₹${order.amount} (key ${order.key_id}). The receipt is recorded by the webhook.`);
    onPaid();
  }, 'Paid. Receipt issued.');
  return (
    <aside className="box dues" aria-label="Your dues">
      <div className="dues-total"><span>To pay now</span><b>{formatINR(total)}</b><span>{formatINR(paid)} paid so far</span></div>
      {(dues?.demands ?? []).map((d) => {
        const due = OPEN.includes(d.status);
        return (
          <div key={d.demand_id} className="dues-line">
            <span>{words(d.fee_head)}{d.fee_head === 'Hostel' ? `, part ${d.instalment_no}` : ''}</span>
            {due && s.kind === 'student' ? <Button variant="accent" size="sm" pill loading={busy} onClick={() => pay(d)}>Pay {formatINR(Number(d.amount_due) - Number(d.amount_paid))}</Button> : <span className="num">{formatINR(d.amount_due)}</span>}
            <small>{due ? `due ${formatDate(d.due_date)}` : words(d.status).toLowerCase()}</small>
          </div>);
      })}
      {dues && !dues.demands.length && <div className="q-empty">No fees yet.</div>}
    </aside>
  );
}
