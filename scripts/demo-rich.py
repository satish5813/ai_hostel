"""Rich demo data for training and review (dev only). Run with the API up:  python scripts/demo-rich.py

Everything that has a workflow goes through the API, so the same rules apply as in real use: 34 new students apply,
pay, get a bed, pay the hostel and mess fees, are fee-checked, approved by their Chief Warden and checked in. Then
outings (waiting for a parent, for the Chief Warden, approved, rejected), sick leave, discipline cases at every stage,
weekly floor reports, renewals and weekly food choices. Only past history that needs a gate or a whole term is written
straight into the database: four weeks of night roll call, past outings, and academic records.

Safe to run twice: students already registered are skipped, history is inserted only where missing.
"""
import json, os, pathlib, random, subprocess, sys, urllib.request, urllib.error
from datetime import date, datetime, timedelta, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
API = 'http://localhost:4000/api'
IST = timezone(timedelta(hours=5, minutes=30))
random.seed(26)
env = dict(l.split('=', 1) for l in (ROOT / 'apps/api/.env').read_text().splitlines() if '=' in l and not l.startswith('#'))
PGPASS = env['DATABASE_URL'].split('://', 1)[1].split('@')[0].split(':', 1)[1]
PSQL = r'C:\Program Files\PostgreSQL\18\bin\psql.exe'


def sql(q: str, fetch=False):
    r = subprocess.run([PSQL, '-h', 'localhost', '-U', 'postgres', '-d', 'klu_hostel', '-w', '-At', '-F', '|', '-v', 'ON_ERROR_STOP=1'], input=q,
                       capture_output=True, text=True, encoding='utf-8', env={**os.environ, 'PGPASSWORD': PGPASS, 'PGCLIENTENCODING': 'UTF8'})
    if r.returncode: raise RuntimeError(r.stderr.strip()[:400])
    return [l.split('|') for l in r.stdout.strip().splitlines()] if fetch else None


def call(method, path, user, role, body=None, ok_codes=(200, 201)):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'x-dev-user': user, 'x-dev-role': role, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:300]
        raise RuntimeError(f'{method} {path} as {user}: {e.code} {msg}')


q = lambda v: 'NULL' if v is None else "'" + str(v).replace("'", "''") + "'"
iso = lambda d: d.astimezone(IST).isoformat()
NOW = datetime.now(IST)
TODAY = NOW.date()

# ---------------------------------------------------------------- 1. logins with their hostels
print('1. logins')
call('POST', '/admin/logins', 'admin', 'admin', {'staff_id': 'S-GW', 'role': 'Chief_Warden', 'facility_ids': ['H-GH1'], 'approval_ref': 'DEMO/CW/GH1'})
call('POST', '/admin/logins', 'admin', 'admin', {'staff_id': 'S-OF', 'role': 'Room_Allotment', 'facility_ids': ['H-BH1', 'H-GH1', 'H-GH2'], 'approval_ref': 'DEMO/RA/1'})
CW = {'H-BH1': 'S-CW', 'H-GH1': 'S-GW', 'H-BH2': 'E2001', 'H-GH2': 'E2006'}
RA = {'H-BH1': 'S-OF', 'H-GH1': 'S-OF', 'H-GH2': 'S-OF', 'H-BH2': 'E2004'}

# ---------------------------------------------------------------- 2. students
# id, name, gender, programme, nationality, hostel, stage, profile (academic), diet
STUDENTS = [
  # Girls Hostel 1
  ('2600042001', 'ANANYA SHARMA', 'Female', 'Btech CSE', 'Indian', 'H-GH1', 'in', 'strong', 'Veg'),
  ('2600042002', 'DIVYA REDDY', 'Female', 'Btech CSE', 'Indian', 'H-GH1', 'in', 'average', 'Non_Veg'),
  ('2600042003', 'SNEHA PATEL', 'Female', 'Btech CSE', 'Indian', 'H-GH1', 'in', 'strong', 'Veg'),
  ('2600042004', 'KEERTHI NAIDU', 'Female', 'Btech ECE', 'Indian', 'H-GH1', 'in', 'struggling', 'Non_Veg'),
  ('2600042005', 'POOJA IYER', 'Female', 'Btech CSE', 'Indian', 'H-GH1', 'in', 'average', 'Veg'),
  ('2600042006', 'HARIKA CHOWDARY', 'Female', 'Btech CSE', 'Indian', 'H-GH1', 'in', 'struggling', 'Non_Veg'),
  ('2600042007', 'MEGHANA RAO', 'Female', 'Btech ME', 'Indian', 'H-GH1', 'in', 'average', 'Veg'),
  ('2600042008', 'LAHARI VARMA', 'Female', 'Btech CSE', 'Indian', 'H-GH1', 'in', 'strong', 'Non_Veg'),
  ('2600042009', 'SRAVANI GOUD', 'Female', 'BBA', 'Indian', 'H-GH1', 'in', 'average', 'Non_Veg'),
  ('2600042010', 'NIKITHA JAIN', 'Female', 'Btech CSE', 'Indian', 'H-GH1', 'confirmed', 'average', 'Veg'),
  ('2600042011', 'TEJASWINI KUMAR', 'Female', 'Btech ECE', 'Indian', 'H-GH1', 'accepted', 'average', 'Veg'),
  ('2600042012', 'BHAVYA SRI', 'Female', 'Btech CSE', 'Indian', 'H-GH1', 'applied', 'average', 'Veg'),
  # Boys Hostel 1
  ('2600042101', 'RAHUL VERMA', 'Male', 'Btech CSE', 'Indian', 'H-BH1', 'in', 'strong', 'Non_Veg'),
  ('2600042102', 'KIRAN KUMAR', 'Male', 'Btech CSE', 'Indian', 'H-BH1', 'in', 'struggling', 'Non_Veg'),
  ('2600042103', 'ADITYA MENON', 'Male', 'Btech CSE', 'Indian', 'H-BH1', 'in', 'strong', 'Veg'),
  ('2600042104', 'SAI CHARAN', 'Male', 'Btech ECE', 'Indian', 'H-BH1', 'in', 'average', 'Non_Veg'),
  ('2600042105', 'NAVEEN REDDY', 'Male', 'Btech CSE', 'Indian', 'H-BH1', 'in', 'average', 'Non_Veg'),
  ('2600042106', 'ROHIT SHARMA', 'Male', 'Btech CSE', 'Indian', 'H-BH1', 'in', 'struggling', 'Veg'),
  ('2600042107', 'MANOJ BABU', 'Male', 'Btech ME', 'Indian', 'H-BH1', 'in', 'average', 'Non_Veg'),
  ('2600042108', 'PRAVEEN TEJA', 'Male', 'Btech CSE', 'Indian', 'H-BH1', 'in', 'average', 'Veg'),
  # Boys Hostel 2 (with foreign students)
  ('2600042201', 'AARAV GUPTA', 'Male', 'Btech CSE', 'Indian', 'H-BH2', 'in', 'strong', 'Veg'),
  ('2600042202', 'VAMSI KRISHNA', 'Male', 'Btech CSE', 'Indian', 'H-BH2', 'in', 'average', 'Non_Veg'),
  ('2600042203', 'SIDDHARTH RAO', 'Male', 'Btech ECE', 'Indian', 'H-BH2', 'in', 'struggling', 'Non_Veg'),
  ('2600042204', 'HARSHA VARDHAN', 'Male', 'Btech CSE', 'Indian', 'H-BH2', 'allotted', 'average', 'Veg'),
  ('2600042205', 'NABIN SHRESTHA', 'Male', 'Btech CSE', 'Nepali', 'H-BH2', 'in', 'average', 'Non_Veg'),
  ('2600042206', 'TANVIR AHMED', 'Male', 'Btech CSE', 'Bangladeshi', 'H-BH2', 'in', 'strong', 'Non_Veg'),
  ('2600042207', 'CHINEDU OKAFOR', 'Male', 'Btech ECE', 'Nigerian', 'H-BH2', 'in', 'average', 'Non_Veg'),
  ('2600042208', 'DAWIT BEKELE', 'Male', 'Btech CSE', 'Ethiopian', 'H-BH2', 'in', 'struggling', 'Veg'),
  # Girls Hostel 2 (with foreign students)
  ('2600042301', 'RIYA DESAI', 'Female', 'Btech CSE', 'Indian', 'H-GH2', 'in', 'strong', 'Veg'),
  ('2600042302', 'SANJANA PILLAI', 'Female', 'Btech CSE', 'Indian', 'H-GH2', 'in', 'average', 'Non_Veg'),
  ('2600042303', 'ISHITA BOSE', 'Female', 'Btech ECE', 'Indian', 'H-GH2', 'verified', 'average', 'Non_Veg'),
  ('2600042304', 'ANJALI THAPA', 'Female', 'Btech CSE', 'Nepali', 'H-GH2', 'in', 'average', 'Non_Veg'),
  ('2600042305', 'NADIA PERERA', 'Female', 'Btech CSE', 'Sri Lankan', 'H-GH2', 'in', 'strong', 'Non_Veg'),
  ('2600042306', 'AMARA NWOSU', 'Female', 'Btech ECE', 'Nigerian', 'H-GH2', 'in', 'average', 'Veg'),
]
COUNTRY = {'Nepali': 'Nepal', 'Bangladeshi': 'Bangladesh', 'Sri Lankan': 'Sri Lanka', 'Nigerian': 'Nigeria', 'Ethiopian': 'Ethiopia'}
FATHERS = ['Ramesh', 'Suresh', 'Venkat', 'Prakash', 'Srinivas', 'Mohan', 'Rajesh', 'Anil', 'Ravi', 'Gopal', 'Murali', 'Ashok']
print('2. students and parents')
vals = []
for i, (sid, name, g, prog, nat, *_rest) in enumerate(STUDENTS):
    email = name.lower().replace(' ', '.') + '@kluniversity.example'
    vals.append(f"({q(sid)}, {q(name)}, 'Regular', 'UG', {q(prog)}, '2 Year / Sem 3', {q(g)}::ref.gender, date '2007-01-01' + {i * 23}, {q(nat)}, {q(email)}, true, 'Active', now(), {q(prog.split()[-1]) if prog.split()[-1] in ('CSE', 'ECE') else 'NULL::varchar'})")
sql(f"""insert into ref.student_master (student_id, full_name, admission_type, student_type, programme, year_semester, gender, date_of_birth, nationality, personal_email, is_hosteller, status, synced_at, dept_code)
select v.* from (values {', '.join(vals)}) v(a,b,c,d,e,f,g,h,i,j,k,l,m,n)
where not exists (select 1 from ref.student_master s where s.student_id = v.a)""".replace("'Regular', 'UG'", "'Regular'::ref.admission_type, 'UG'::ref.student_type").replace("'Active', now()", "'Active'::ref.student_status, now()"))
for i, (sid, name, *_r) in enumerate(STUDENTS):
    sql(f"""insert into hostel.student_contact (student_id, relation, contact_name, mobile_no, is_verified, verified_on, is_outpass_approver, status, created_by)
      select {q(sid)}, 'Father', {q(FATHERS[i % len(FATHERS)] + ' ' + name.split()[-1].title())}, {q('98' + str(48000000 + i * 7919)[-8:])}, true, now(), true, 'Active', 'demo'
      where not exists (select 1 from hostel.student_contact where student_id = {q(sid)} and relation = 'Father')""")

# ---------------------------------------------------------------- 3. registration to check-in, through the workflow
def pay(sid, keep_second=False):
    d = call('GET', f'/students/{sid}/demands', sid, 'Student')
    for x in d['demands']:
        if x['status'] in ('Pending', 'Part_Paid', 'Overdue') and not (keep_second and x['fee_head'] == 'Hostel' and x['instalment_no'] == 2):
            call('POST', '/payments/orders', sid, 'Student', {'demand_id': x['demand_id']})
            call('POST', '/payments/dev-confirm', sid, 'Student', {'demand_id': x['demand_id'], 'amount': float(x['amount_due']) - float(x['amount_paid'])})

print('3. registrations')
cats = {}
for sid, name, g, prog, nat, fac, stage, prof, diet in STUDENTS:
    if call('GET', '/registrations/mine', sid, 'Student'): continue
    if fac not in cats:
        cats[fac] = next(h for h in call('GET', '/allotment/catalogue', sid, 'Student') if h['facility_id'] == fac)
    types = [t for t in cats[fac]['types'] if t['open_beds'] > 0] or cats[fac]['types']
    t = types[hash(sid) % len(types)]
    reg = call('POST', '/registrations', sid, 'Student', {'facility_id': fac, 'room_type_id': t['room_type_id'], 'rules_accepted': True})
    rid = reg['registration_id']
    if stage == 'applied': print(' ', sid, 'applied'); continue
    pay(sid)
    ch = call('GET', f'/registrations/{rid}/choices', sid, 'Student')
    bed = next((b['subspace_id'] for r in ch['rooms'] for b in r['beds'] if b['bed_status'] == 'Vacant'), None)
    if not bed: print(' ', sid, 'no bed free'); continue
    if stage == 'allotted':   # the office offers the bed; the student has not answered yet
        call('POST', f'/registrations/{rid}/offers', RA[fac], 'Room_Allotment', {'subspace_id': bed}); print(' ', sid, 'allotted'); continue
    call('POST', f'/registrations/{rid}/choose', sid, 'Student', {'subspace_id': bed})
    cuisine = 'North_Indian' if prog in ('BBA', 'Btech ME') or hash(name) % 3 == 0 else 'South_Indian'
    call('POST', f'/registrations/{rid}/fee-plan', sid, 'Student', {'plan_type': 'Two_Instalments' if hash(sid) % 2 else 'Single', 'cuisine': cuisine})
    if stage == 'accepted': print(' ', sid, 'accepted, fees due'); continue
    pay(sid)
    if stage == 'confirmed': print(' ', sid, 'paid, fee check due'); continue
    call('POST', f'/registrations/{rid}/fee-check', CW[fac], 'Chief_Warden', {'decision': 'Verified'})
    if stage == 'verified': print(' ', sid, 'verified, Chief Warden to approve'); continue
    call('POST', f'/registrations/{rid}/cw-decision', CW[fac], 'Chief_Warden', {'decision': 'Approved'})
    r = next(x for x in call('GET', '/registrations/mine', sid, 'Student') if x['registration_id'] == rid)
    lab = sql(f"select bed_label from hostel.v_bed where subspace_id = {q(r['subspace_id'])}", True)[0][0]
    call('POST', '/allocations', RA[fac], 'Room_Allotment', {'offer_id': r['offer_id'], 'key_no': 'K-' + lab})
    print(' ', sid, 'checked in', lab)

residents = sql("select b.student_id, b.facility_id, b.bed_label from hostel.v_bed b where b.occupant_type = 'Student' and b.student_id is not null", True)
res_ids = [r[0] for r in residents]
fac_of = {r[0]: r[1] for r in residents}
print('   residents now', len(residents))

# ---------------------------------------------------------------- 4. food choice on the mess subscription
print('4. food choices')
for sid, name, g, prog, nat, fac, stage, prof, diet in STUDENTS:
    if nat in COUNTRY and hash(sid) % 4 != 0:   # most foreign students choose their own country's food
        sql(f"update hostel.mess_subscription set region = 'International', country = {q(COUNTRY[nat])}, diet = {q(diet)}, cuisine = 'Special_Diet' where student_id = {q(sid)} and status = 'Active'")
    else:
        sql(f"update hostel.mess_subscription set diet = {q(diet)} where student_id = {q(sid)} and status = 'Active'")
for sid, region, diet in [('2600042101', 'North', 'Non_Veg'), ('2600042003', 'North', 'Veg'), ('2600042208', 'South', 'Veg')]:
    if sid in res_ids:
        try: call('POST', '/me/food', sid, 'Student', {'region': region, 'diet': diet})
        except RuntimeError as e: print('  ', e)

# ---------------------------------------------------------------- 5. four weeks of night roll call
print('5. night roll call, 28 nights')
repeat = {'2600042102', '2600042006', '2600042203', '2600040025'}
rows = []
for sid in res_ids:
    for d in range(1, 29):
        day = TODAY - timedelta(days=d)
        r = random.random()
        st = 'Absent' if (sid in repeat and r < 0.16) or r < 0.025 else 'On_Pass' if r < 0.06 else 'Sick_Leave' if r < 0.075 else 'Present'
        rows.append(f"({q(sid)}, date {q(day.isoformat())}, {q(st)}::hostel.attendance_status, {q(fac_of[sid])}, 'S-FW', timestamp {q(day.isoformat() + ' 21:45')})")
for i in range(0, len(rows), 400):
    sql(f"""insert into hostel.night_attendance (student_id, att_date, status, facility_id, marked_by, marked_at)
      select * from (values {', '.join(rows[i:i + 400])}) v on conflict (student_id, att_date) do nothing""")

# ---------------------------------------------------------------- 6. academic records
print('6. academic records')
PROF = {'strong': (8.6, 0.3, 82, 0), 'average': (7.6, 0.4, 62, 0), 'struggling': (6.4, 0.5, 42, 1)}
CERTS = [('AWS Cloud Practitioner', 'Amazon', 'Cloud'), ('Python for Everybody', 'Coursera', 'Programming'), ('Java SE 17 Programmer', 'Oracle', 'Programming'),
         ('Azure Fundamentals', 'Microsoft', 'Cloud'), ('Data Structures in C++', 'NPTEL', 'Technical'), ('Business English', 'British Council', 'Language')]
for sid, name, g, prog, nat, fac, stage, prof, diet in STUDENTS:
    if sql(f"select 1 from acad.term_result where student_id = {q(sid)}", True): continue
    base, spread, crt, backlog = PROF[prof]
    falling = prof != 'strong' and hash(name) % 3 == 0
    sgpas = [round(min(9.8, base + random.uniform(-spread, spread) + (0.5 if falling and s < 3 else 0) - (0.6 if falling and s == 3 else 0)), 2) for s in (1, 2, 3)]
    for s in (1, 2, 3):
        cg = round(sum(sgpas[:s]) / s, 2)
        att = round(min(99, max(58, 88 - (14 if prof == 'struggling' else 0) + random.uniform(-6, 6))), 1)
        sql(f"insert into acad.term_result (student_id, semester_no, term_label, sgpa, cgpa, credits_earned, attendance_pct, backlogs) values ({q(sid)}, {s}, {q(f'Sem {s}')}, {sgpas[s - 1]}, {cg}, {20 if not (backlog and s == 3) else 16}, {att}, {backlog if s == 3 else 0})")
    for cat in ('Coding', 'Aptitude', 'Technical', 'Verbal'):
        for k in (1, 2):
            sc = max(12, min(98, crt + random.uniform(-12, 12) + (8 if cat == 'Aptitude' else 0)))
            sql(f"insert into acad.crt_assessment (student_id, test_name, test_date, category, score, max_score) values ({q(sid)}, {q(f'{cat} test {k}')}, date {q((TODAY - timedelta(days=60 - 25 * k)).isoformat())}, {q(cat)}::acad.crt_category, {round(sc)}, 100)")
    for m in (7, 8, 9):
        held = 12; att = max(4, min(12, round(held * (0.9 if prof == 'strong' else 0.75 if prof == 'average' else 0.5) + random.uniform(-1.5, 1.5))))
        sql(f"insert into acad.crt_attendance (student_id, month, sessions_held, sessions_attended) values ({q(sid)}, date '2026-{m:02d}-01', {held}, {att}) on conflict do nothing")
    for c in random.sample(CERTS, {'strong': 3, 'average': 1, 'struggling': 0}[prof]):
        sql(f"insert into acad.certification (student_id, title, provider, category, issued_on, added_by) values ({q(sid)}, {q(c[0])}, {q(c[1])}, {q(c[2])}::acad.cert_category, date '2026-06-15', 'ACAD-IMPORT')")
    if prof == 'strong':
        sql(f"insert into acad.activity (student_id, activity_type, title, role, from_date, to_date, hours) values ({q(sid)}, 'Internship', 'Summer internship, software', 'Intern', date '2026-05-15', date '2026-07-10', 240)")
        sql(f"insert into acad.achievement (student_id, title, level, category, achieved_on, award, added_by) values ({q(sid)}, 'Hackathon finalist', 'National', 'Technical', date '2026-03-12', 'Finalist', 'ACAD-IMPORT')")
    if hash(name) % 4 == 0:
        sql(f"insert into acad.activity (student_id, activity_type, title, role, from_date, hours) values ({q(sid)}, 'Club', 'Coding club', 'Coordinator', date '2026-01-10', 40)")
    if prof != 'struggling' and hash(sid) % 2:
        sql(f"insert into acad.activity (student_id, activity_type, title, role, from_date, hours) values ({q(sid)}, 'Technical_Event', 'Inter-college tech fest', 'Participant', date '2026-02-20', 16)")
GOALS = {'strong': ['Placement_Product', 'Higher_Studies'], 'average': ['Placement_Services', 'Placement_Product', 'Govt_Exams'], 'struggling': ['Placement_Product', 'Undecided', 'Higher_Studies']}
for sid, name, g, prog, nat, fac, stage, prof, diet in STUDENTS:
    if hash(name) % 5 != 0:   # most say what they aim for; a few have not yet
        goal = random.choice(GOALS[prof])
        sql(f"insert into acad.career_goal (student_id, goal, updated_by) values ({q(sid)}, {q(goal)}, {q(sid)}) on conflict (student_id) do nothing")

# ---------------------------------------------------------------- 7. outings: past history and open requests
print('7. outings')
if not sql("select 1 from hostel.outpass where outpass_no like 'OP-2026-9%'", True):
    hist = []
    places = ['Vijayawada', 'Guntur', 'Hyderabad', 'Tenali', 'Mangalagiri', 'Visakhapatnam']
    for n, sid in enumerate(random.sample(res_ids, min(24, len(res_ids)))):
        d = TODAY - timedelta(days=random.randint(3, 27))
        out = datetime(d.year, d.month, d.day, 10, 0, tzinfo=IST)
        back = out + timedelta(hours=8 if n % 3 else 32)
        late = random.choice([0, 0, 0, 0, 25, 70]) if n % 2 else 0
        cat = 'Same_Day' if back.date() == out.date() else 'Day_Or_More'
        hist.append(f"({q(f'OP-2026-9{n:04d}')}, {q(sid)}, 'Visit family', {q(random.choice(places))}, {q(iso(out))}::timestamptz, {q(iso(back))}::timestamptz, {q(cat)}::hostel.outing_category, {2 if cat == 'Same_Day' else 3}, '9848012345', {q(iso(out - timedelta(days=1)))}::timestamptz, {q(iso(out))}::timestamptz, {q(iso(back + timedelta(minutes=late)))}::timestamptz, {late or 'NULL'}, 'Returned'::hostel.outpass_status, md5({q(f'OP-2026-9{n:04d}')} || random()::text))")
    # history only: these outings happened before this demo, so the approval and gate triggers are not replayed
    sql("set session_replication_role = replica; insert into hostel.outpass (outpass_no, student_id, reason, destination, leave_from, return_by, outing_category, levels_required, contact_during_leave, applied_on, actual_out_at, actual_in_at, late_by_minutes, status, qr_token) values "
        + ', '.join(hist) + "; set session_replication_role = origin;")

def open_pass(sid, place, days, hours, reason):
    mine = call('GET', '/outpasses/mine', sid, 'Student')
    if any(x['status'] in ('Applied', 'Parent_Recommended', 'L1_Approved', 'L2_Approved', 'Approved', 'Out', 'Overdue') for x in mine): return None
    lf = (NOW + timedelta(days=days)).replace(hour=9, minute=0, second=0, microsecond=0)
    return call('POST', '/outpasses', sid, 'Student', {'reason': reason, 'destination': place, 'leave_from': iso(lf), 'return_by': iso(lf + timedelta(hours=hours)), 'contact_during_leave': '9848022334'})

def parent_ok(op_id):
    tok = sql(f"select l.token from shared.approval_link l join shared.approval_step s on s.step_id = l.step_id where s.request_type = 'Outpass' and s.request_id = {op_id} and l.used_at is null and l.contact_id is not null limit 1", True)
    if tok: call('POST', f'/links/{tok[0][0]}', 'anon', 'Student', {'decision': 'Approved', 'remarks': 'Yes, she/he may go.'})

def cw_decide(op_id, fac, decision, remarks):
    inbox = call('GET', '/approvals/inbox', CW[fac], 'Chief_Warden')
    st = next((x for x in inbox if x['request_type'] == 'Outpass' and x['request_id'] == op_id), None)
    if st: call('POST', f"/approvals/{st['step_id']}/decide", CW[fac], 'Chief_Warden', {'decision': decision, 'remarks': remarks})

plan = [('2600042001', 'Vijayawada', 2, 9, 'Sister\'s birthday', 'parent'), ('2600042005', 'Guntur', 3, 8, 'Bank work', 'applied'),
        ('2600042104', 'Hyderabad', 4, 56, 'Cousin\'s wedding', 'parent'), ('2600042105', 'Tenali', 1, 7, 'Dentist appointment', 'approved'),
        ('2600042202', 'Vijayawada', 2, 8, 'Passport office', 'approved'), ('2600042302', 'Mangalagiri', 1, 6, 'Temple visit with family', 'applied'),
        ('2600042107', 'Guntur', 2, 9, 'Shopping', 'rejected'), ('2600042008', 'Vijayawada', 5, 30, 'Family function', 'approved')]
for sid, place, days, hours, reason, to in plan:
    if sid not in res_ids: continue
    op = open_pass(sid, place, days, hours, reason)
    if not op: continue
    oid = op['outpass_id']
    if to in ('parent', 'approved', 'rejected'): parent_ok(oid)
    if to == 'approved': cw_decide(oid, fac_of[sid], 'Approved', 'Approved. Be back on time.')
    if to == 'rejected': cw_decide(oid, fac_of[sid], 'Rejected', 'Internal examination that day.')
    print('  ', sid, to)

# ---------------------------------------------------------------- 8. sick leave
print('8. sick leave')
for sid, ill, d0, d1 in [('2600042004', 'Viral fever, 101 F', 0, 2), ('2600042203', 'Stomach infection', 0, 1), ('2600042306', 'Migraine', -1, 0)]:
    if sid not in res_ids: continue
    if any(x['status'] in ('Applied', 'Recommended', 'Approved') for x in call('GET', '/sick-leaves/mine', sid, 'Student')): continue
    try: call('POST', '/sick-leaves', sid, 'Student', {'illness_details': ill, 'from_date': (TODAY + timedelta(days=d0)).isoformat(), 'to_date': (TODAY + timedelta(days=d1)).isoformat()})
    except RuntimeError as e: print('  ', e)

# ---------------------------------------------------------------- 9. discipline cases at every stage
print('9. discipline')
CASES = [
  ('2600042102', 41, 'Curfew_Violation', 'Entered at 23:10 without a pass; gate closes at 21:30.', 'Missed the last bus from Vijayawada.', 'Gate log confirms 23:10 entry, no pass. Second late entry this term.', 'Outing ban for two weeks; parents informed.', 'ban'),
  ('2600042006', 33, 'Curfew_Violation', 'Absent at roll call and came back at 22:40.', 'Was at a friend\'s room in another block.', 'Floor warden confirms; CCTV shows her entering Block B at 22:38.', 'Written warning.', 'warn'),
  ('2600042203', 19, 'Property_Damage', 'Broken window pane in room 204 during a cricket game in the corridor.', 'It was an accident; I will pay.', 'Three students involved; this student hit the ball.', 'Fine of Rs 1,500 for the glass.', 'dean'),
  ('2600042107', 9, 'Misconduct', 'Loud music after 23:00 on two nights; complaints from the floor.', None, 'Two written complaints from neighbours; warned once orally.', 'Written warning and a talk with the parents.', 'dean'),
  ('2600042106', 4, 'Other', 'Cooking with an electric heater in the room.', 'Did not know it was not allowed.', None, None, 'inquiry'),
  ('2600042009', 2, 'Misconduct', 'Argument with the mess staff about the queue.', None, None, None, 'inquiry'),
  ('2600042205', 26, 'Curfew_Violation', 'Late by 15 minutes after a project review.', 'Faculty kept us late; I have the mail.', 'Faculty mail confirms the review ran late.', 'No action; genuine reason.', 'none'),
]
if not sql("select 1 from hostel.discipline_case where case_no <> 'DC-2026-00001' limit 1", True):
    for sid, ago, kind, what, stmt, finding, rec, end in CASES:
        if sid not in res_ids: continue
        fac = fac_of[sid]
        c = call('POST', '/discipline', CW[fac], 'Chief_Warden', {'student_id': sid, 'incident_on': iso(NOW - timedelta(days=ago, hours=2)), 'incident_type': kind, 'description': what, 'student_statement': stmt})
        if end == 'inquiry': continue
        call('PUT', f"/discipline/{c['case_id']}", CW[fac], 'Chief_Warden', {'cw_findings': finding, 'cw_recommendation': rec, 'send': True})
        if end == 'dean': continue
        if end == 'ban':
            call('POST', f"/discipline/{c['case_id']}/decide", 'S-DN', 'Dean_Students_Affairs', {'outcome': 'Punish', 'decision': 'Outing ban for two weeks. A third late entry goes to the disciplinary committee.',
                 'punishment': {'punishment_type': 'Outing_Ban', 'from_date': (TODAY - timedelta(days=38)).isoformat(), 'to_date': (TODAY - timedelta(days=24)).isoformat(), 'details': 'Parents informed by phone.'}})
        elif end == 'warn':
            call('POST', f"/discipline/{c['case_id']}/decide", 'S-DN', 'Dean_Students_Affairs', {'outcome': 'Punish', 'decision': 'Written warning on record.', 'punishment': {'punishment_type': 'Warning'}})
        else:
            call('POST', f"/discipline/{c['case_id']}/decide", 'S-DN', 'Dean_Students_Affairs', {'outcome': 'No_Action', 'decision': 'Genuine reason, confirmed by the faculty. Closed.'})
    sql("update hostel.discipline_punishment set status = 'Served' where to_date < current_date and status = 'In_Force'")

# ---------------------------------------------------------------- 10. weekly floor reports, last four weeks
print('10. weekly floor reports')
monday = TODAY - timedelta(days=TODAY.weekday())
weeks = [monday - timedelta(days=7 * k) for k in (4, 3, 2, 1)]
for w in weeks: call('POST', '/weekly-reports/build', 'S-CW', 'Chief_Warden', {'week': w.isoformat()})
REMARKS = ['Quiet week. Roll call complete every night.', 'Two late returns, both with a reason; parents called.', 'One student absent three nights; counselling arranged.']
for k, w in enumerate(weeks[:3]):
    for fac, cw in CW.items():
        rep = sql(f"select report_id from hostel.weekly_floor_report where facility_id = {q(fac)} and week_start = {q(w.isoformat())} and status = 'Draft'", True)
        if rep: call('POST', f'/weekly-reports/{rep[0][0]}/send', cw, 'Chief_Warden', {'remarks': REMARKS[(k + len(fac)) % 3]})
for w in weeks[:2]:   # the Dean has read the older ones; last week's wait to be read
    for (rid,) in sql(f"select report_id from hostel.weekly_floor_report where week_start = {q(w.isoformat())} and status = 'Sent'", True):
        call('GET', f'/weekly-reports/{rid}', 'S-DN', 'Dean_Students_Affairs')

# ---------------------------------------------------------------- 11. renewals for next year
print('11. renewals')
for sid, choice in [('2600042101', 'Keep'), ('2600042001', 'Keep'), ('2600042104', 'Leave'), ('2600042302', 'Keep'), ('2600042105', 'Change')]:
    if sid not in res_ids: continue
    m = call('GET', '/me/renewal', sid, 'Student')
    if not m.get('current') or m.get('renewal') or (m['current'] or {}).get('next_year_intent'): continue
    body = {'choice': choice}
    if choice == 'Change': body.update({'facility_id': m['current']['facility_id'], 'room_type_id': m['current']['room_type_id']})
    r = call('POST', '/me/renewal', sid, 'Student', body)
    if choice == 'Keep':
        pay(sid)
        if sid != '2600042302': call('POST', f"/registrations/{r['registration_id']}/keep-room", sid, 'Student')
    print('  ', sid, choice)

print('done:', len(res_ids), 'residents')
