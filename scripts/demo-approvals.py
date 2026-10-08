"""Demo applicants for the allotment approvals board (dev only).
Each student applies to BH2, pays the registration fee (dev payment), picks the first open bed, chooses a fee plan,
and is then left at a different stage: fees due, paid (Warden to verify), or verified (Chief Warden to approve)."""
import json, urllib.request

API = 'http://localhost:4000/api'

def call(path, user, role, body=None):
    req = urllib.request.Request(API + path, method='POST' if body is not None else 'GET',
        data=json.dumps(body).encode() if body is not None else None,
        headers={'x-dev-user': user, 'x-dev-role': role, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r: return json.loads(r.read() or b'null')

def pay_all(sid, heads=None):
    d = call(f'/students/{sid}/demands', sid, 'Student')
    for x in d['demands']:
        if x['status'] in ('Pending', 'Part_Paid', 'Overdue') and (heads is None or x['fee_head'] in heads):
            bal = float(x['amount_due']) - float(x['amount_paid'])
            call('/payments/orders', sid, 'Student', {'demand_id': x['demand_id']})
            call('/payments/dev-confirm', sid, 'Student', {'demand_id': x['demand_id'], 'amount': bal})

PLAN = [('2600041003', 'fee'), ('2600041004', 'fee'), ('2600041005', 'verify'), ('2600041006', 'verify'), ('2600041007', 'approve')]
cat = call('/allotment/catalogue', PLAN[0][0], 'Student')
bh2 = next(h for h in cat if h['hostel_code'] == 'BH2')
types = [t for t in bh2['types'] if t['open_beds'] > 0]
for i, (sid, stage) in enumerate(PLAN):
    mine = call('/registrations/mine', sid, 'Student')
    if mine: print(sid, 'already registered'); continue
    t = types[i % len(types)]
    reg = call('/registrations', sid, 'Student', {'facility_id': bh2['facility_id'], 'room_type_id': t['room_type_id'], 'rules_accepted': True})
    rid = reg['registration_id']
    pay_all(sid, ['Registration'])
    ch = call(f'/registrations/{rid}/choices', sid, 'Student')
    bed = next(b['subspace_id'] for r in ch['rooms'] for b in r['beds'] if b['bed_status'] == 'Vacant')
    call(f'/registrations/{rid}/choose', sid, 'Student', {'subspace_id': bed})
    call(f'/registrations/{rid}/fee-plan', sid, 'Student', {'plan_type': 'Two_Instalments', 'cuisine': 'South_Indian'})
    if stage in ('verify', 'approve'):
        d = call(f'/students/{sid}/demands', sid, 'Student')
        heads = [x for x in d['demands'] if x['status'] != 'Paid' and not (x['fee_head'] == 'Hostel' and x['instalment_no'] == 2)]
        for x in heads:
            call('/payments/orders', sid, 'Student', {'demand_id': x['demand_id']})
            call('/payments/dev-confirm', sid, 'Student', {'demand_id': x['demand_id'], 'amount': float(x['amount_due']) - float(x['amount_paid'])})
        pay_all(sid)  # second instalment too, so the plan is fully paid (Confirmed)
    if stage == 'approve':
        call(f'/registrations/{rid}/fee-check', 'E2001', 'Chief_Warden', {'decision': 'Verified'})
    print(sid, stage, bed)
