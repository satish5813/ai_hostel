#!/usr/bin/env python3
"""Writes the Excel files the university fills in before go-live, into docs/production-data/.
One workbook per upload (columns read from the importer, apps/api/src/admin/import.service.ts, so they always match
what Admin > File uploads accepts), a "start here" workbook with the order, the rules and the logins, and a zip of all.
    python3 scripts/make-production-templates.py
"""
import re, zipfile
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'docs' / 'production-data'
src = (ROOT / 'apps/api/src/admin/import.service.ts').read_text()

# ---- the uploads, straight from the importer
kinds = []
for blk in re.split(r"\n  \{\n", src[src.index("kind: 'hostels'") - 10:]):
    m = re.search(r"kind: '([^']+)', order: (\d+), title: '([^']+)', target: '([^']+)'", blk)
    if not m: continue
    note = re.search(r"note: '((?:[^'\\]|\\.)*)'", blk)
    cols = []
    for c in re.finditer(r"\{ key: '([^']+)', label: '((?:[^'\\]|\\.)*)'(.*?)\}", blk):
        rest = c.group(3)
        hint = re.search(r"hint: '((?:[^'\\]|\\.)*)'", rest); sample = re.search(r"sample: '([^']*)'", rest)
        cols.append(dict(key=c.group(1), label=c.group(2).replace("\\'", "'"), req='required: true' in rest, hint=hint.group(1).replace("\\'", "'") if hint else '', sample=sample.group(1) if sample else ''))
    kinds.append(dict(kind=m.group(1), order=int(m.group(2)), title=m.group(3), note=note.group(1).replace("\\'", "'") if note else '', cols=cols))
kinds.sort(key=lambda k: k['order'])
assert len(kinds) == 14, len(kinds)

# who prepares each file, from where, what must be loaded before it, and whether day one needs it
PLAN = {
 'hostels':            ('Hostel office', 'Typed in: one row per building', '-', 'Must'),
 'room_types':         ('Hostel office', 'Typed in: the kinds of room offered', '-', 'Must'),
 'rooms':              ('Hostel office with Estate', 'Room register of each hostel; walk the floors if there is none', '1, 2', 'Must'),
 'fees':               ('Accounts', 'The approved fee order for the year', '1, 2, academic year', 'Must'),
 'assets':             ('Estate / stores', 'Asset register; or tag and list room by room', '1, 3', 'Later'),
 'meters':             ('Electrical section', 'Meter register: number on each room meter', '1, 3', 'For electricity'),
 'staff':              ('HR', 'ERP employee export, as it is', '-', 'Must'),
 'duties':             ('Chief Wardens', 'The duty order: who covers which hostel and floor, with the order number', '1, 3, 7', 'Must'),
 'students':           ('Academic section', 'ERP student profile export, as it is', '-', 'Must'),
 'bed_map':            ('Hostel office', 'Today\'s room allotment register: who sleeps in which bed', '1, 3, 9, academic year', 'Must for residents'),
 'opening_fees':       ('Accounts', 'Fee ledger of this year: due and paid per student', '9, academic year', 'For fees'),
 'opening_deposits':   ('Accounts', 'Caution and electricity deposit ledger', '9', 'For fees'),
 'meter_readings':     ('Electrical section', 'A reading of every meter on the go-live day', '1, 3, 6', 'For electricity'),
 'mess_subscriptions': ('Mess in-charge', 'Mess register: mess, food style and diet of each resident', '9, messes', 'For mess'),
}

F = 'Arial'
H = Font(name=F, bold=True, color='FFFFFF'); B = Font(name=F); Bb = Font(name=F, bold=True); T = Font(name=F, bold=True, size=14); I = Font(name=F, italic=True, color='555555')
HEAD = PatternFill('solid', fgColor='0B7A71'); REQ = PatternFill('solid', fgColor='B42318'); OPT = PatternFill('solid', fgColor='4B5D5A'); PINK = PatternFill('solid', fgColor='FDECEC'); YEL = PatternFill('solid', fgColor='FFF9DB')
thin = Side(style='thin', color='CCCCCC'); BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
WRAP = Alignment(wrap_text=True, vertical='top')

def table(ws, row, head, rows, widths):
    for i, h in enumerate(head, 1):
        c = ws.cell(row=row, column=i, value=h); c.font = H; c.fill = HEAD; c.alignment = WRAP; c.border = BOX
    for r, vals in enumerate(rows, row + 1):
        for i, v in enumerate(vals, 1):
            c = ws.cell(row=r, column=i, value=v); c.font = B; c.alignment = WRAP; c.border = BOX
    for i, w in enumerate(widths, 1): ws.column_dimensions[get_column_letter(i)].width = w
    return row + len(rows) + 1

OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob('*.xlsx'): old.unlink()
names = []

# ---- one workbook per upload: "Data" is what gets uploaded (header row only), "How to fill" explains every column
for k in kinds:
    wb = Workbook(); ws = wb.active; ws.title = 'Data'
    for i, c in enumerate(k['cols'], 1):
        cell = ws.cell(row=1, column=i, value=c['key']); cell.font = H; cell.fill = REQ if c['req'] else OPT; cell.border = BOX
        ws.column_dimensions[get_column_letter(i)].width = max(14, min(34, len(c['key']) + 6))
        # every data column is text, so Excel does not turn 01-08-2026 into a date serial or drop the leading zero of an ID
        ws.column_dimensions[get_column_letter(i)].number_format = '@'
    ws.freeze_panes = 'A2'
    hw = wb.create_sheet('How to fill')
    hw['A1'] = f"{k['order']}. {k['title']}"; hw['A1'].font = T
    who, source, needs, day1 = PLAN[k['kind']]
    hw['A2'] = f"Prepared by: {who}.   Taken from: {source}.   Load first: {needs}."; hw['A2'].font = I
    hw['A3'] = k['note']; hw['A3'].font = I
    hw['A4'] = 'Fill the "Data" sheet from row 2. Red headers must be filled; grey ones may be left empty. Do not rename, move or add columns. Dates as DD-MM-YYYY. Save, then upload on the portal: Admin > File uploads.'; hw['A4'].font = Bb
    for r in (2, 3, 4): hw.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5); hw.cell(row=r, column=1).alignment = WRAP; hw.row_dimensions[r].height = 32
    end = table(hw, 6, ['Column', 'Meaning', 'Required', 'Format / allowed values', 'Example'],
                [[c['key'], c['label'], 'Yes' if c['req'] else 'No', c['hint'], c['sample']] for c in k['cols']], [28, 30, 10, 62, 28])
    for r in range(7, end):
        if hw.cell(row=r, column=3).value == 'Yes':
            for i in range(1, 6): hw.cell(row=r, column=i).fill = PINK
    hw.cell(row=end + 1, column=1, value='Example row (for reading only; type your own rows in the Data sheet)').font = Bb
    for i, c in enumerate(k['cols'], 1):
        a = hw.cell(row=end + 2, column=i, value=c['key']); a.font = H; a.fill = HEAD; a.border = BOX
        b = hw.cell(row=end + 3, column=i, value=c['sample']); b.font = B; b.fill = YEL; b.border = BOX
    name = f"{k['order']:02d}_{k['kind']}.xlsx"; wb.save(OUT / name); names.append(name)

# ---- the list for "Create many logins"
wb = Workbook(); ws = wb.active; ws.title = 'Data'
c = ws.cell(row=1, column=1, value='id'); c.font = H; c.fill = REQ; c.border = BOX; ws.column_dimensions['A'].width = 22
ws.column_dimensions['A'].number_format = '@'
hw = wb.create_sheet('How to fill')
hw['A1'] = '15. Logins: a list of IDs'; hw['A1'].font = T
for r, t in enumerate(['One university ID or employee ID per row, in the "Data" sheet from row 2.',
    'Upload on the portal: Admin > Logins: create and invite > Create many > A list of IDs > read the file.',
    'Students must be loaded already (file 9). Staff must be loaded and hold a role (files 7 and 8).',
    'People who already have a login are left as they are. Each new login is e-mailed a one-time link to set a password.',
    'Not needed when you choose "Students living in a hostel", "Every student loaded" or "Staff who hold a role": those need no file.'], 2):
    hw.cell(row=r, column=1, value=t).font = B
hw.column_dimensions['A'].width = 120
wb.save(OUT / '15_logins_list.xlsx'); names.append('15_logins_list.xlsx')

# ---- start here
wb = Workbook(); ws = wb.active; ws.title = 'Load order'
ws['A1'] = 'KL University Hostels: data for go-live'; ws['A1'].font = T
ws['A2'] = 'Work down this list. A to D are typed on the portal; 1 to 14 are the Excel files in this folder, uploaded at Admin > File uploads; 15 makes the logins. "Load first" says what must already be there.'; ws['A2'].font = I
ws.merge_cells('A2:H2'); ws['A2'].alignment = WRAP; ws.row_dimensions[2].height = 34
rows = [
 ['A', 'Academic year 2026-27 with the registration and renewal windows, set as current', 'Portal form', 'Hostel office', 'Masters > Academic years', '-', 'Must', '-'],
 ['B', 'Messes: name, hostel, capacity, yearly fee', 'Portal form', 'Mess in-charge', 'Masters > Messes', '1', 'For mess', '-'],
 ['C', 'Approval rules and settings: gate time, outing limits, levels of approval', 'Portal form', 'Chief Wardens / Admin', 'Admin > Approval rules and settings (defaults exist)', '-', 'Check', '-'],
 ['D', 'Weekly mess menu (non-veg is chicken and egg only)', 'Portal form', 'Mess in-charge', 'Mess > Weekly menu', 'B', 'For mess', '-'],
] + [[k['order'], k['title'], 'Excel upload', PLAN[k['kind']][0], PLAN[k['kind']][1], PLAN[k['kind']][2], PLAN[k['kind']][3], f"{k['order']:02d}_{k['kind']}.xlsx"] for k in kinds] + [
 [15, 'Logins for students and staff, with the invitation e-mails', 'Portal', 'Administrator', 'Admin > Logins: create and invite > Create many', '7, 8, 9', 'Must', '15_logins_list.xlsx (only for a hand-picked list)'],
]
table(ws, 4, ['#', 'What', 'How', 'Who prepares it', 'Taken from / where', 'Load first', 'Day one?', 'File'], rows, [5, 46, 14, 24, 52, 22, 18, 34])
ws.freeze_panes = 'A5'

hp = wb.create_sheet('How to prepare')
hp['A1'] = 'Rules for every file'; hp['A1'].font = T
rules = [
 ('Use the file as given', 'Type or paste into the "Data" sheet from row 2. Do not rename, reorder, add or delete columns. The portal reads the first sheet only.'),
 ('Red and grey headers', 'Red header = must be filled in every row. Grey = may be left empty; the "How to fill" sheet says what an empty cell means.'),
 ('IDs exactly as in the ERP', 'University ID and employee ID are the key to everything. Paste them as text so a leading zero is not lost. The same ID must be used in every file.'),
 ('Hostel code and room number', 'Decide the hostel codes once (BH1, GH1...) in file 1 and use them everywhere. A room number is what is painted on the door: 101, 102, G05.'),
 ('Dates', 'DD-MM-YYYY, for example 01-08-2026. The Data sheet is set to text so Excel does not change them.'),
 ('Amounts', 'Digits only, no commas, no rupee sign: 105000.'),
 ('Yes / No', 'Yes, No, Y, N, 1 or 0.'),
 ('Fixed lists', 'Where "How to fill" lists allowed values (Boys, Girls, Staff...), use one of them exactly.'),
 ('ERP exports', 'Files 7 (staff) and 9 (students) accept the ERP export as it is. Extra columns are ignored; identity numbers, bank details and dependants are dropped in the browser and never stored.'),
 ('Check before loading', 'On the portal choose the file and press Check: every row is tested and the mistakes are listed with their row number. Nothing is saved until you press Load.'),
 ('Loading twice is safe', 'A row that is already there is updated or skipped, never doubled. Correct the file and load it again.'),
 ('One hostel at a time', 'For the pilot, prepare one boys\' and one girls\' hostel. More hostels are added later with the same files.'),
 ('Who signs off', 'Accounts signs files 4, 11 and 12. The Chief Warden signs 8 and 10. Keep the signed copy: the portal keeps the file name and who loaded it.'),
]
table(hp, 3, ['Rule', 'What to do'], [list(r) for r in rules], [30, 120])

lg = wb.create_sheet('Logins')
lg['A1'] = 'Who gets a login'; lg['A1'].font = T
lg['A2'] = 'The administrator makes the logins on the portal (Admin > Logins: create and invite), one at a time or many at once. Each person receives an e-mail with a one-time link and sets their own password. Count is for the pilot of one boys\' and one girls\' hostel; write your own numbers in the last column.'; lg['A2'].font = I
lg.merge_cells('A2:F2'); lg['A2'].alignment = WRAP; lg.row_dimensions[2].height = 46
logins = [
 ['Student', 'Their own registration, fees and receipts, outings, mess, repairs, electricity and record', 'Phone app (and portal)', 'One for each student', 'Create many > Every student loaded, or Students living in a hostel', ''],
 ['Chief Warden', 'Final approval of receipts, beds, outings, sick leave, room changes; only editor of a student\'s hostel record', 'Portal', '1 per hostel = 2', 'Create a login: role, hostels, written approval', ''],
 ['Floor Warden', 'First check of receipts, outings, sick leave, repairs; roll call; key and room handover', 'Portal', '1 per floor, about 8 to 12', 'File 8 with the order number, then Create many > Staff who hold a role', ''],
 ['Warden', 'Day-to-day running of one hostel', 'Portal', '0 to 2', 'Create a login', ''],
 ['Room Allotment (hostel office)', 'Fee checks, bed offers, check-in and handover, renewals, vacating', 'Portal', '2 to 3', 'Create a login: role and hostels', ''],
 ['Accounts', 'Fees, receipts, deposits and refunds, electricity bills', 'Portal', '1 to 2', 'Create a login', ''],
 ['Mess In-charge, Chief Chef, Supervisor, Storekeeper', 'Weekly menu, meal choices, complaints, store', 'Portal', '3 to 5', 'Create a login for each', ''],
 ['Maintenance Supervisor, Technician, Electrician', 'Repair tickets, meters and readings', 'Portal', '2 to 4', 'Create a login for each', ''],
 ['Dean, Students Affairs', 'Reports; long outings', 'Portal', '1', 'Create a login', ''],
 ['President, Vice-President, Vice-Chancellor, Pro-VCs', 'Executive dashboards', 'Portal', '1 each, as wanted', 'Create a login', ''],
 ['Administrator', 'Masters, uploads, logins and roles, rules, audit log', 'Portal', '2 (never one alone)', 'The first one is made on the server; the others from the portal', ''],
 ['Parent', 'Recommends outings', 'One-time link by SMS', 'No login', 'Mobile number in the student\'s hostel record', '-'],
 ['Security guard', 'Scans the gate pass', 'Gate device', 'No login', 'Device registered at Capture points', '-'],
]
table(lg, 4, ['Login', 'Responsible for', 'Signs in on', 'How many (pilot)', 'How it is made', 'Your number'], logins, [34, 62, 22, 26, 52, 14])
r = 4 + len(logins) + 2
lg.cell(row=r, column=1, value='Rules of a login').font = Bb
for i, t in enumerate(['Username is the university ID (students) or the employee ID (staff). Nobody chooses a username.',
    'Nobody is given a password. The e-mail carries a link that works once, for 7 days; the person types their own password (8 or more characters, a letter and a digit).',
    'A staff role is given only with a written approval number, and never to oneself. A warden sees only the hostels ticked for the login.',
    'No e-mail address on record: the administrator copies the one-time link and gives it in person.',
    'Forgot the password: the administrator presses "Reset password"; a new link is e-mailed.',
    'Someone leaves: "Disable" signs them out everywhere within half a minute. Their records stay.',
    'Five wrong passwords lock a login for 15 minutes.'], r + 1):
    lg.cell(row=i, column=1, value=t).font = B

gl = wb.create_sheet('Go-live checklist')
gl['A1'] = 'Before the first student signs in'; gl['A1'].font = T
steps = [
 ['Server', 'API, database and portal on the university server with HTTPS; NODE_ENV=production; DEMO_LOGIN off', 'IT', ''],
 ['Server', 'AUTH_SECRET set (32 characters or more); PUBLIC_WEB_URL set to the portal address; CORS_ORIGINS set', 'IT', ''],
 ['Mail', 'SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM set; one test invitation received', 'IT', ''],
 ['Data', 'A to D typed in; files 1 to 4 and 7 to 10 loaded with no errors left', 'Hostel office', ''],
 ['Data', 'Set-up board on the portal shows every hostel "ready" (fees, wardens, office login)', 'Administrator', ''],
 ['Logins', 'Two administrators; Chief Warden, Floor Wardens and office of each hostel created and signed in once', 'Administrator', ''],
 ['Logins', 'Students: Create many, invitations sent; "No e-mail address" list cleared by hand', 'Administrator', ''],
 ['App', 'Android app on the Play Store or as an APK link; iPhone through TestFlight or the portal in Safari', 'IT', ''],
 ['Payments', 'Students told to download the PDF receipt from the payment portal; wardens shown the approval screen', 'Chief Wardens', ''],
 ['Backup', 'Nightly database backup running and one restore tried', 'IT', ''],
]
table(gl, 3, ['Area', 'Check', 'Who', 'Done on'], steps, [14, 100, 18, 14])

wb.save(OUT / '00_Start_here.xlsx'); names.insert(0, '00_Start_here.xlsx')
with zipfile.ZipFile(OUT / 'KL_Hostels_production_data.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for n in names: z.write(OUT / n, n)
print(f'{len(names)} workbooks in {OUT.relative_to(ROOT)}:'); [print(' ', n) for n in names]
