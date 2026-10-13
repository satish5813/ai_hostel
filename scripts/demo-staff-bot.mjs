// The demo assistant: plays the wardens, the mess, maintenance and the hostel office for ONE student, so a single
// phone can show every operation from start to end without anyone using the web portal.
// A few seconds after the student acts, it does the staff step through the same API the portal uses:
//   registration / renewal  fee check, Chief Warden approval, and (new student) check-in with the key and room handover
//   outing, room change     each approval level in order
//   sick leave              the visit with a diet, then each approval
//   repair ticket           checked genuine, started, repaired
//   meal complaint          a reply from the mess
//   uploaded receipt        checked by the Floor Warden, approved by the Chief Warden
// and, once the student has a room, it puts in place what a working hostel already has where the demo data lacks it:
// an electricity meter in the room (before check-in), a Floor Warden for the floor, and next week's menu published.
// It touches only the requests of the student(s) named, and only works where demo sign-in is on (DEMO_LOGIN=1).
//   node scripts/demo-staff-bot.mjs                      student 2600040011, API on port 4100
//   STUDENTS=2600040011,2600040012 DELAY=5 API=http://localhost:4100 node scripts/demo-staff-bot.mjs
const API = process.env.API ?? 'http://localhost:4100';
const STUDENTS = (process.env.STUDENTS ?? '2600040011').split(',').map((s) => s.trim()).filter(Boolean);
const DELAY = Number(process.env.DELAY ?? 6) * 1000, EVERY = 3000;
// steps left to a person at the portal, so they can be shown live: MANUAL=checkin (key and handover), proof (receipts), cw (Chief Warden's bed approval)
const MANUAL = new Set((process.env.MANUAL ?? '').split(',').map((x) => x.trim()).filter(Boolean));
const ONCE = process.argv.includes('--once');

async function call(user, role, method, path, body) {
  try {
    const r = await fetch(`${API}/api${path}`, { method, headers: { 'Content-Type': 'application/json', 'x-dev-user': user, 'x-dev-role': role }, body: body === undefined ? undefined : JSON.stringify(body) });
    const t = await r.text();
    let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
    return { ok: r.ok, status: r.status, body: j };
  } catch (e) { return { ok: false, status: 0, body: { message: String(e.message ?? e) } }; }
}
const asStudent = async (s, path) => { const r = await call(s, 'Student', 'GET', path); return r.ok ? r.body : null; }; // a failed read (say, a rate limit) reads as nothing
const log = (s, what) => console.log(`${new Date().toLocaleTimeString('en-IN')}  ${s}  ${what}`);

// every staff sign-in the demo offers, grouped by what they may do; the first one the API accepts for a step is used
let STAFF = [];
const withRole = (...roles) => STAFF.filter((a) => roles.includes(a.role_code));
const WARDENS = ['Floor_Warden', 'Warden', 'Assistant_Warden', 'Hostel_Incharge', 'Chief_Warden', 'Director_Hostels'];
async function first(roles, method, path, body) {
  let last = null;
  for (const a of withRole(...roles)) { last = await call(a.username, a.role_code, method, path, body); if (last.ok) return { ...last, by: a }; }
  return last ?? { ok: false, status: 0, body: { message: 'no staff sign-in for ' + roles.join('/') } };
}

// a step is taken DELAY after it is first seen waiting, and tried again at most every few seconds if it failed
const seen = new Map(), tried = new Map();
function due(key) {
  const now = Date.now();
  if (!seen.has(key)) { seen.set(key, now); return DELAY === 0; }
  return now - seen.get(key) >= DELAY && now - (tried.get(key) ?? 0) >= 4000;
}
async function step(s, key, what, run) {
  if (!due(key)) return;
  tried.set(key, Date.now());
  const r = await run();
  if (r?.ok) { log(s, `${what}${r.by ? '  (' + r.by.display_name + ')' : ''}`); seen.delete(key); tried.delete(key); }
  else if (r && !r.quiet) log(s, `could not: ${what}: ${r.body?.message ?? r.status}`);
}

async function registrations(s) {
  for (const r of (await asStudent(s, '/registrations/mine')) ?? []) {
    const id = r.registration_id, k = `reg:${id}`;
    if (r.status !== 'Confirmed') continue; // not fully paid yet, or already checked in
    if (r.fee_check_status !== 'Verified') { await step(s, k + ':fee', `fees verified for ${r.registration_no}`, () => first(['Room_Allotment', 'Office_Staff', ...WARDENS], 'POST', `/registrations/${id}/fee-check`, { decision: 'Verified' })); continue; }
    if (r.cw_status !== 'Approved') { if (MANUAL.has('cw')) continue; await step(s, k + ':cw', `Chief Warden approved ${r.registration_no}`, () => first(['Chief_Warden', 'Director_Hostels'], 'POST', `/registrations/${id}/cw-decision`, { decision: 'Approved' })); continue; }
    if (r.renewal_of == null && r.hostel_alloc_id == null && r.offer_id != null && !MANUAL.has('checkin')) {
      await step(s, k + ':in', `checked in: key given and room handed over (${r.registration_no})`, async () => {
        // the room's electricity meter must be there before check-in: checking in is what links the student to it
        const space = String(r.subspace_id ?? '').replace(/-B\d+$/, '');
        if (space) {
          const meters = (await first(['Maintenance_Supervisor', 'Technician', 'Chief_Warden'], 'GET', `/meters?facility_id=${r.facility_id}`)).body;
          if (Array.isArray(meters) && !meters.some((m) => m.space_id === space && (m.status ?? 'Active') === 'Active')) {
            const m = await first(['Maintenance_Supervisor', 'Technician'], 'POST', '/meters', { space_id: space, meter_no: `MTR-${space}`, meter_type: 'Manual', installed_on: new Date().toISOString().slice(0, 10) });
            if (m.ok) log(s, `electricity meter fitted in room ${space}  (${m.by.display_name})`); else log(s, `could not fit a meter in ${space}: ${m.body?.message ?? m.status}`);
          }
        }
        const a = await first(['Room_Allotment', 'Office_Staff'], 'POST', '/allocations', { offer_id: r.offer_id, key_no: 'K-' + String(id).padStart(4, '0') });
        if (!a.ok) return a;
        const h = await first(['Room_Allotment', 'Office_Staff', 'Floor_Warden'], 'POST', `/allocations/${a.body.hostel_alloc_id}/handover`, { handover_type: 'Check_In', meter_reading: 1500, occupant_acknowledged: true, lines: [] });
        return h.ok ? { ...h, by: a.by } : h;
      });
    }
  }
}

/** The requests of this student that are waiting for somebody: "Outpass:25", "Sick_Leave:14", "Room_Change:12". */
async function waiting(s) {
  const w = new Map();
  for (const o of (await asStudent(s, '/outpasses/mine')) ?? []) if (['Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved'].includes(o.status)) w.set(`Outpass:${o.outpass_id}`, `outing ${o.outpass_no}`);
  for (const l of (await asStudent(s, '/sick-leaves/mine')) ?? []) if (['Applied', 'Recommended'].includes(l.status)) w.set(`Sick_Leave:${l.sick_leave_id}`, { text: 'sick leave', leave: l });
  for (const c of (await asStudent(s, '/me/room-change'))?.requests ?? []) if (String(c.status).startsWith('Pending')) w.set(`Room_Change:${c.change_id}`, `room change ${c.change_no}`);
  if (!MANUAL.has('proof')) for (const p of (await asStudent(s, '/me/payment-proofs')) ?? []) if (['Uploaded', 'Checked'].includes(p.status)) w.set(`Payment_Proof:${p.proof_id}`, `receipt ${p.proof_no} for ₹${p.amount} (system check: ${p.ocr_status ?? 'pending'})`);
  return w;
}
async function approvals(s) {
  const w = await waiting(s);
  if (!w.size) return;
  for (const [key, v] of w) {
    const leave = typeof v === 'object' ? v.leave : null, text = typeof v === 'object' ? v.text : v;
    // a sick student is visited first: the visitor sees them and chooses the diet
    if (leave && !leave.visited_by) {
      await step(s, key + ':visit', 'sick leave: visited, light diet chosen', () => first(WARDENS, 'POST', `/sick-leaves/${leave.sick_leave_id}/visit`, { visit_remarks: 'Seen in the room; resting', diet: 'Light', diet_note: 'No spice' }));
      continue;
    }
    if (!due(key + ':approve')) continue;
    tried.set(key + ':approve', Date.now());
    const [type, id] = key.split(':');
    let done = false;
    for (const a of withRole(...WARDENS, 'Dean_Students_Affairs')) {
      const inbox = (await call(a.username, a.role_code, 'GET', '/approvals/inbox')).body;
      const st = (Array.isArray(inbox) ? inbox : []).find((x) => String(x.request_id) === id && String(x.request_type) === type);
      if (!st) continue;
      const r = await call(a.username, a.role_code, 'POST', `/approvals/${st.step_id}/decide`, { decision: 'Approved' });
      if (r.ok) { log(s, `${text}: approved at level ${st.level}  (${a.display_name})`); done = true; break; }
      log(s, `could not approve ${text} as ${a.display_name}: ${r.body?.message ?? r.status}`);
    }
    if (!done) { // not in anyone's inbox (a new student has no floor yet): take the pending step by its id, in role order
      const steps = (await first([...WARDENS], 'GET', `/approvals/${type}/${id}`)).body;
      const st = (Array.isArray(steps) ? steps : []).find((x) => x.decision === 'Pending');
      if (st) {
        const order = st.approver_role === 'Floor_Warden' ? ['Floor_Warden', 'Chief_Warden', 'Director_Hostels'] : [st.approver_role, 'Director_Hostels'];
        const r = await first(order, 'POST', `/approvals/${st.step_id}/decide`, { decision: 'Approved' });
        if (r.ok) { log(s, `${text}: approved at level ${st.level}  (${r.by.display_name})`); done = true; }
        else if (r.status) log(s, `could not approve ${text}: ${r.body?.message ?? r.status}`);
      }
    }
    if (done) { seen.delete(key + ':approve'); tried.delete(key + ':approve'); }
  }
}
async function tickets(s) {
  for (const t of (await asStudent(s, '/me/tickets'))?.tickets ?? []) {
    const id = t.ticket_id, k = `ticket:${id}`, name = `#${id} ${t.item_label}`;
    if (t.status === 'Open') await step(s, k + ':verify', `ticket ${name}: checked, genuine`, () => first([...WARDENS, 'Mess_Incharge', 'Mess_Supervisor'], 'POST', `/repair-desk/${id}/verify`, { genuine: true, remarks: 'Checked on the spot' }));
    else if (t.status === 'Assigned') await step(s, k + ':start', `ticket ${name}: repair started`, () => first(['Maintenance_Supervisor', 'Technician', 'Mess_Incharge', 'Mess_Supervisor', 'Chief_Warden'], 'POST', `/repair-desk/${id}/start`));
    else if (t.status === 'In_Progress' || t.status === 'Reopened') await step(s, k + ':done:' + t.status, `ticket ${name}: repaired`, () => first(['Maintenance_Supervisor', 'Technician', 'Mess_Incharge', 'Mess_Supervisor', 'Chief_Warden'], 'POST', `/repair-desk/${id}/resolve`, { report: 'Repaired and tested; working now.' }));
  }
}
async function mess(s) {
  for (const g of (await asStudent(s, '/me/mess-grievances'))?.grievances ?? []) {
    if (g.status !== 'Open') continue;
    await step(s, `mess:${g.feedback_id}`, 'meal complaint: the mess replied', () => first(['Mess_Incharge', 'Mess_Supervisor', 'Chief_Warden'], 'POST', `/mess-ops/grievances/${g.feedback_id}/reply`,
      { action_taken: 'Sorry about that meal. The cook has been told and the dish is checked before serving from today.', close: true }));
  }
}

/** Once the student lives in a room: what a working hostel already has, put in place where the demo data lacks it. */
const ready = new Set();
async function prepare(s) {
  const room = await asStudent(s, '/me/room');
  if (!room?.space_id) return;
  // a Floor Warden for the floor (room changes and sick visits start with one)
  if (!ready.has(s + ':fw')) {
    const list = (await first(['Chief_Warden', 'Director_Hostels', 'Room_Allotment', 'Office_Staff'], 'GET', `/assignments?facility_id=${room.facility_id}`)).body;
    const has = (Array.isArray(list) ? list : []).some((a) => a.hostel_role === 'Floor_Warden' && (!a.zone_id || a.zone_id === room.zone_id));
    const fw = withRole('Floor_Warden')[0];
    if (has || !fw) ready.add(s + ':fw');
    else await step(s, s + ':fw', `${room.floor_name} of ${room.hostel_code} given a Floor Warden`, async () => {
      const r = await first(['Chief_Warden', 'Director_Hostels', 'Office_Staff'], 'POST', '/assignments', { staff_id: fw.username, hostel_role: 'Floor_Warden', facility_id: room.facility_id, zone_id: room.zone_id, shift: 'General' });
      if (r.ok) ready.add(s + ':fw');
      return r;
    });
  }
  // next week's menu published, so meals can be chosen
  if (!ready.has(s + ':week')) {
    const mc = await asStudent(s, '/me/meal-choices');
    const weeks = mc?.weeks ?? [];
    if (!mc?.me?.mess_id || weeks.some((w) => w.is_open)) ready.add(s + ':week');
    else if (mc.next?.week_start) await step(s, s + ':week', `next week's menu published by the mess (week of ${mc.next.week_start})`, async () => {
      const roles = ['Mess_Incharge', 'Cook', 'Chief_Chef', 'Mess_Supervisor', 'Chief_Warden'];
      const last = weeks.length ? weeks[weeks.length - 1].week_id : undefined;
      let made = await first(roles, 'POST', '/weekly-menus', { mess_id: mc.me.mess_id, week_start: String(mc.next.week_start).slice(0, 10), ...(last ? { copy_from: last } : {}) });
      let id = made.body?.week_id;
      if (!made.ok) { // it may be there already as a draft
        const all = (await first(roles, 'GET', '/weekly-menus')).body;
        id = (Array.isArray(all) ? all : []).find((w) => w.mess_id === mc.me.mess_id && String(w.week_start).slice(0, 10) === String(mc.next.week_start).slice(0, 10))?.week_id;
        if (!id) return made;
      }
      const pub = await first(['Mess_Incharge', 'Mess_Supervisor', 'Chief_Warden', 'Cook', 'Chief_Chef'], 'POST', `/weekly-menus/${id}/publish`);
      if (pub.ok) ready.add(s + ':week');
      return pub;
    });
  }
}

const acc = await call('x', 'x', 'GET', '/auth/demo-accounts');
if (!acc.ok || !acc.body?.enabled) { console.error(`Demo sign-in is not on at ${API} (or the API is not running). The assistant needs DEMO_LOGIN=1.`); process.exit(1); }
STAFF = acc.body.accounts.filter((a) => a.role_code !== 'Student');
console.log(`Demo assistant for ${STUDENTS.join(', ')} on ${API}; staff act ${DELAY / 1000}s after the student. Ctrl+C stops it.`);
for (;;) {
  for (const s of STUDENTS) {
    try { await registrations(s); await prepare(s); await approvals(s); await tickets(s); await mess(s); } catch (e) { log(s, 'error: ' + (e.message ?? e)); }
  }
  if (ONCE) break;
  await new Promise((ok) => setTimeout(ok, EVERY));
}
