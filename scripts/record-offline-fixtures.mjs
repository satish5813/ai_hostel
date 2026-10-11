// Records what the API answers for three demo students, and each stage of every student flow, into one JSON file
// that the mobile app's offline demo mode replays (apps/mobile/assets/offline/fixtures.json).
// It submits real requests, so point it at a COPY of the database:
//   API=http://localhost:4101 RESET=/path/to/reset.sh node scripts/record-offline-fixtures.mjs
// RESET is a script that restores the copy and restarts that API; it runs before every variant.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const API = process.env.API ?? 'http://localhost:4101';
const RESET = process.env.RESET;
const OUT = new URL('../apps/mobile/assets/offline/fixtures.json', import.meta.url).pathname;
const DAILY = '2600040012', NEW = '2600040011', RENEW = '2600042205';

const reset = () => { if (RESET) execFileSync(RESET, { stdio: 'ignore' }); };
async function call(user, role, method, path, body) {
  let r;
  for (let i = 0; ; i++) { // after a reset the old keep-alive socket is dead: try again
    try { r = await fetch(`${API}/api${path}`, { method, headers: { 'Content-Type': 'application/json', 'x-dev-user': user, 'x-dev-role': role, Connection: 'close' }, body: body === undefined ? undefined : JSON.stringify(body) }); break; }
    catch (e) { if (i >= 4) throw e; await new Promise((ok) => setTimeout(ok, 500)); }
  }
  const t = await r.text();
  let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  if (!r.ok) console.warn(`  ! ${user} ${method} ${path} -> ${r.status} ${t.slice(0, 160)}`);
  return j;
}
const stu = (s) => (m, p, b) => call(s, 'Student', m, p, b);
const get = (s, p) => call(s, 'Student', 'GET', p);
async function approve(user, role, type, id) {
  for (const s of ((await call(user, role, 'GET', '/approvals/inbox')) ?? []).filter((s) => String(s.request_id) === String(id) && String(s.request_type).includes(type)))
    await call(user, role, 'POST', `/approvals/${s.step_id}/decide`, { decision: 'Approved' });
}
const day = (n = 0) => new Date(Date.now() + n * 864e5 + 5.5 * 36e5).toISOString().slice(0, 10);

/** Every GET the app makes for a student, with the ids it would follow. */
async function world(s) {
  const w = {};
  const take = async (p) => (w[p] = await get(s, p));
  for (const p of [`/students/${s}`, `/students/${s}/demands`, `/students/${s}/360`, '/me/profile', '/me/room', '/me/renewal', '/registrations/mine', '/meters/mine',
    '/me/electricity-bills', '/outpasses/mine', '/sick-leaves/mine', '/me/tickets', '/me/grievances', '/me/mess-grievances', '/me/caution', '/me/health', '/me/menu',
    '/me/meal-choices', '/me/meal-ratings', '/notifications', '/me/career-goal', '/me/room-change', '/allotment/catalogue']) await take(p);
  const next = w['/me/renewal']?.next?.academic_year;
  if (next) await take(`/allotment/catalogue?year=${next}`);
  for (const r of w['/me/health']?.reports ?? (Array.isArray(w['/me/health']) ? w['/me/health'] : [])) if (r.report_id) await take(`/health/reports/${r.report_id}`);
  for (const r of w['/registrations/mine'] ?? []) { await take(`/registrations/${r.registration_id}`); await take(`/registrations/${r.registration_id}/choices`); }
  for (const o of w['/outpasses/mine'] ?? []) await take(`/outpasses/${o.outpass_id}`);
  for (const l of w['/sick-leaves/mine'] ?? []) await take(`/sick-leaves/${l.sick_leave_id}`);
  for (const t of w['/me/room-change']?.types ?? []) { await take(`/me/room-change/beds?type=${t.room_type_id}`); await take(`/me/room-change/preview?type=${t.room_type_id}`); }
  for (const c of w['/me/room-change']?.requests ?? []) await take(`/room-changes/${c.change_id}`);
  for (const k of Object.keys(w)) if (w[k] && w[k].statusCode >= 400) delete w[k];
  return w;
}
/** The GETs a registration or renewal changes. */
async function regView(s) {
  const v = {};
  for (const p of ['/registrations/mine', `/students/${s}/demands`, '/me/renewal', '/me/room', `/students/${s}`]) v[p] = await get(s, p);
  for (const r of v['/registrations/mine'] ?? []) { v[`/registrations/${r.registration_id}`] = await get(s, `/registrations/${r.registration_id}`); v[`/registrations/${r.registration_id}/choices`] = await get(s, `/registrations/${r.registration_id}/choices`); }
  for (const k of Object.keys(v)) if (v[k] && v[k].statusCode >= 400) delete v[k];
  return v;
}
async function payAll(s, only) {
  const d = await get(s, `/students/${s}/demands`);
  for (const x of (d.demands ?? []).filter((x) => ['Pending', 'Part_Paid', 'Overdue'].includes(x.status) && (!only || only(x)))) {
    await stu(s)('POST', '/payments/orders', { demand_id: x.demand_id });
    await stu(s)('POST', '/payments/dev-confirm', { demand_id: x.demand_id, amount: Number(x.amount_due) - Number(x.amount_paid) });
  }
}

const F = { recorded_on: new Date().toISOString(), students: {}, tpl: {}, renewal: {}, registration: {} };

// ---------- 1. the three students as they are, and the everyday flows ----------
reset();
console.log('worlds');
const acc = await call('x', 'x', 'GET', '/auth/demo-accounts');
F.accounts = { ...acc, accounts: acc.accounts.filter((a) => [DAILY, NEW, RENEW].includes(a.username)) };
F.logins = {};
for (const s of [DAILY, NEW, RENEW]) {
  F.logins[s] = await call('x', 'x', 'POST', '/auth/demo-login', { username: s, password: acc.password_hint });
  F.students[s] = await world(s);
}

console.log('everyday flows');
const A = stu(DAILY), T = F.tpl;
{ // outing
  const o = await A('POST', '/outpasses', { reason: 'Home visit', destination: 'Guntur', leave_from: `${day(1)}T09:00:00+05:30`, return_by: `${day(2)}T18:00:00+05:30`, contact_during_leave: '9440000003' });
  const id = o.outpass_id, pick = async () => ({ mine: (await get(DAILY, '/outpasses/mine')).find((x) => x.outpass_id === id), detail: await get(DAILY, `/outpasses/${id}`) });
  T.outing = { created: o, applied: await pick() };
  await approve('S-FW', 'Floor_Warden', 'Out', id); T.outing.l1 = await pick();
  await approve('S-CW', 'Chief_Warden', 'Out', id); T.outing.approved = await pick();
  T.outing.qr = await get(DAILY, `/outpasses/${id}/qr`);
  await A('POST', `/outpasses/${id}/cancel`); T.outing.cancelled = await pick();
}
{ // sick leave
  const l = await A('POST', '/sick-leaves', { illness_details: 'Fever', from_date: day(), to_date: day(1) });
  const id = l.sick_leave_id, pick = async () => ({ mine: (await get(DAILY, '/sick-leaves/mine')).find((x) => x.sick_leave_id === id), detail: await get(DAILY, `/sick-leaves/${id}`) });
  T.sick = { created: l, applied: await pick() };
  await call('S-FW', 'Floor_Warden', 'POST', `/sick-leaves/${id}/visit`, { visit_remarks: 'Fever confirmed, resting', diet: 'Liquid', diet_note: 'No spice' });
  await approve('S-FW', 'Floor_Warden', 'Sick', id); T.sick.recommended = await pick();
  await approve('S-WD', 'Warden', 'Sick', id); await approve('S-CW', 'Chief_Warden', 'Sick', id); T.sick.approved = await pick();
  await A('POST', `/sick-leaves/${id}/close`, {}); T.sick.closed = await pick();
}
{ // repair ticket
  const items = (await get(DAILY, '/me/tickets')).items ?? [];
  const fan = items.find((i) => i.item_code === 'R-FAN') ?? items.find((i) => i.area === 'Room');
  const t = await A('POST', '/me/tickets', { item_code: fan.item_code, description: 'Fan makes a loud noise', location_note: null });
  const id = t.ticket_id ?? Math.max(...(await get(DAILY, '/me/tickets')).tickets.map((x) => x.ticket_id));
  const pick = async () => (await get(DAILY, '/me/tickets')).tickets.find((x) => x.ticket_id === id);
  T.ticket = { created: t, reported: await pick() };
  await call('S-FW', 'Floor_Warden', 'POST', `/repair-desk/${id}/verify`, { genuine: true, remarks: 'Checked in the room' }); T.ticket.verified = await pick();
  await call('S-MT', 'Maintenance_Supervisor', 'POST', `/repair-desk/${id}/start`); T.ticket.started = await pick();
  await call('S-MT', 'Maintenance_Supervisor', 'POST', `/repair-desk/${id}/resolve`, { report: 'Capacitor replaced; fan tested at all speeds.' }); T.ticket.resolved = await pick();
  await A('POST', `/me/tickets/${id}/confirm`, { fixed: true, note: null }); T.ticket.closed = await pick();
}
{ // complaints
  const g = await A('POST', '/me/mess-grievances', { meal_date: day(), slot: 'Lunch', aspect: 'Quality', details: 'Sambar was watery and the rice was undercooked', rating: 2 });
  const mine = async () => { const m = await get(DAILY, '/me/mess-grievances'); return (m.grievances ?? m.mine ?? []).find((x) => x.status === 'Open' || x.details?.startsWith('Sambar')); };
  T.messGrievance = { created: g, open: await mine() };
  await call('S-MS', 'Mess_Incharge', 'POST', `/mess-ops/grievances/${T.messGrievance.open.feedback_id}/reply`, { action_taken: 'Sorry about lunch. The cook has been told; sambar is checked before serving from today.', close: true });
  T.messGrievance.replied = await mine();
  const o = await A('POST', '/me/grievances', { category: 'Room_Mate', description: 'My room-mate plays music loudly after midnight', is_confidential: false });
  const all = await get(DAILY, '/me/grievances');
  T.grievance = { created: o, open: (Array.isArray(all) ? all : all.grievances ?? []).find((x) => x.description?.startsWith('My room-mate plays music loudly after')) };
}
{ // electricity recharge and a fee payment
  const m = await get(DAILY, '/meters/mine');
  const rc = await A('POST', `/meters/${m.meter_id}/recharge`, { amount: 500 });
  await A('POST', '/payments/orders', { demand_id: rc.demand.demand_id });
  const paid = await A('POST', '/payments/dev-confirm', { demand_id: rc.demand.demand_id, amount: 500 });
  T.recharge = { before: m, created: rc, paid, after: await get(DAILY, '/meters/mine'), demands_after: await get(DAILY, `/students/${DAILY}/demands`) };
  T.order = await A('POST', '/payments/orders', { demand_id: rc.demand.demand_id });
}
{ // rating, room change
  const r = await get(DAILY, '/me/meal-ratings');
  const dish = r.days?.[0]?.meals?.[0]?.dishes?.[0];
  if (dish) T.rating = { dish, saved: await A('PUT', '/me/meal-ratings', { meal_date: dish.date, meal: dish.meal, dish: dish.dish, rating: 5, comment: 'Very good' }), after: (await get(DAILY, '/me/meal-ratings')).days[0].meals[0].dishes[0] };
  const rc = await get(DAILY, '/me/room-change');
  const type = (rc.types ?? []).find((t) => t.room_type_id !== rc.stay.room_type_id && t.free_beds > 0);
  if (type) {
    const beds = await get(DAILY, `/me/room-change/beds?type=${type.room_type_id}`);
    const bed = JSON.stringify(beds).match(/"subspace_id":"([^"]+)"/)?.[1];
    const c = await A('POST', '/me/room-change', { kind: 'Room_Type', to_room_type_id: type.room_type_id, to_subspace_id: bed, reason: 'My roommate studies late at night; I would like a room with more students.' });
    const pick = async () => { const d = await get(DAILY, '/me/room-change'); const q = d.requests.find((x) => x.change_id === c.change_id); return { request: q, detail: await get(DAILY, `/room-changes/${c.change_id}`) }; };
    T.roomChange = { created: c, pendingFw: await pick() };
    await approve('S-FW', 'Floor_Warden', 'Room', c.change_id); T.roomChange.pendingCw = await pick();
    await approve('S-CW', 'Chief_Warden', 'Room', c.change_id); T.roomChange.approved = await pick();
    await A('POST', `/me/room-change/${c.change_id}/cancel`); T.roomChange.cancelled = await pick();
  }
}

// ---------- 2. renewal: keep (two plans), change, leave ----------
async function renewal(name, choice, plan) {
  reset(); console.log('renewal', name);
  const R = stu(RENEW), st = (F.renewal[name] = {});
  st.start = await regView(RENEW);
  const cat = await get(RENEW, `/allotment/catalogue?year=${st.start['/me/renewal'].next.academic_year}`);
  const cur = st.start['/me/renewal'].current;
  const other = cat.find((h) => h.facility_id === cur.facility_id)?.types.find((t) => t.room_type_id !== cur.room_type_id);
  await R('POST', '/me/renewal', choice === 'Change' ? { choice, facility_id: cur.facility_id, room_type_id: other.room_type_id } : { choice });
  st.chosen = await regView(RENEW);
  if (choice !== 'Keep') return;
  const id = st.chosen['/me/renewal'].renewal.registration_id;
  await R('POST', `/registrations/${id}/keep-room`); st.kept = await regView(RENEW);
  await R('POST', `/registrations/${id}/fee-plan`, { plan_type: plan, cuisine: 'South_Indian' }); st.planned = await regView(RENEW);
  await payAll(RENEW); st.paid = await regView(RENEW);
  await call('E2001', 'Chief_Warden', 'POST', `/registrations/${id}/fee-check`, { decision: 'Verified' });
  await call('E2001', 'Chief_Warden', 'POST', `/registrations/${id}/cw-decision`, { decision: 'Approved' });
  st.checked = await regView(RENEW);
}
await renewal('Keep|Two_Instalments', 'Keep', 'Two_Instalments');
await renewal('Keep|Single', 'Keep', 'Single');
await renewal('Change', 'Change');
await renewal('Leave', 'Leave');

// ---------- 3. new registration: every hostel and room type the student may choose, two fee plans ----------
reset();
const cat = await get(NEW, '/allotment/catalogue');
for (const h of cat) for (const t of h.types) for (const plan of ['Two_Instalments', 'Single']) {
  const name = `${h.facility_id}|${t.room_type_id}|${plan}`;
  reset(); console.log('registration', name);
  const N = stu(NEW), st = (F.registration[name] = {});
  const reg = await N('POST', '/registrations', { facility_id: h.facility_id, room_type_id: t.room_type_id, rules_accepted: true });
  if (!reg?.registration_id) { delete F.registration[name]; continue; }
  const id = reg.registration_id;
  st.applied = await regView(NEW);
  await payAll(NEW); st.feePaid = await regView(NEW);
  const bed = (st.feePaid[`/registrations/${id}/choices`]?.rooms ?? []).flatMap((r) => r.beds).find((x) => x.bed_status === 'Vacant')?.subspace_id;
  if (!bed) { st.waitlisted = true; continue; }
  const ch = await N('POST', `/registrations/${id}/choose`, { subspace_id: bed });
  if (ch?.statusCode >= 400) { st.waitlisted = true; continue; }
  st.bed = bed; st.chosen = await regView(NEW);
  await N('POST', `/registrations/${id}/fee-plan`, { plan_type: plan, cuisine: 'South_Indian' }); st.planned = await regView(NEW);
  await payAll(NEW); st.paid = await regView(NEW);
  // the office: fee check, Chief Warden, check-in with the key and the room handover
  const cw = h.facility_id === 'H-GH2' ? 'E2006' : 'S-GW';
  await call('S-OF', 'Room_Allotment', 'POST', `/registrations/${id}/fee-check`, { decision: 'Verified' });
  await call(cw, 'Chief_Warden', 'POST', `/registrations/${id}/cw-decision`, { decision: 'Approved' });
  st.checked = await regView(NEW);
  const offer = st.checked['/registrations/mine'].find((r) => r.registration_id === id)?.offer_id;
  const alloc = await call('S-OF', 'Room_Allotment', 'POST', '/allocations', { offer_id: offer, key_no: 'K-DEMO' });
  if (alloc?.hostel_alloc_id) {
    await call('S-OF', 'Room_Allotment', 'POST', `/allocations/${alloc.hostel_alloc_id}/handover`, { handover_type: 'Check_In', meter_reading: 1500, occupant_acknowledged: true, lines: [] });
    st.checkedIn = await world(NEW);
  }
}

mkdirSync(OUT.replace(/\/[^/]+$/, ''), { recursive: true });
writeFileSync(OUT, JSON.stringify(F));
console.log('wrote', OUT, (JSON.stringify(F).length / 1e6).toFixed(2), 'MB');
