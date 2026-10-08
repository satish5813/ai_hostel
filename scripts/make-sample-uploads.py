"""Writes the sample upload files in db/seed/samples: one CSV per master, in set-up order.
Each file has one or two rows that must be refused, so the refusal messages can be seen."""
import csv, os

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'db', 'seed', 'samples')
os.makedirs(out, exist_ok=True)

def write(name, rows):
    with open(os.path.join(out, name), 'w', newline='', encoding='utf8') as f:
        csv.writer(f).writerows(rows)
    print(name, len(rows) - 1, 'rows')

write('1-hostels.csv', [
    ['hostel_code', 'hostel_name', 'gender', 'floors', 'gate_close_time'],
    ['BH2', 'Boys Hostel 2', 'Boys', 4, '21:30'],
    ['GH2', 'Girls Hostel 2', 'Girls', 3, '20:30'],
])

write('2-room-types.csv', [
    ['type_name', 'sharing_count', 'is_ac', 'attached_bath'],
    ['3-sharing AC', 3, 'Yes', 'Yes'],
    ['2-sharing AC', 2, 'Yes', 'Yes'],
])

rooms = [['hostel_code', 'floor_no', 'room_no', 'room_type', 'category', 'reserved_for', 'accessible']]
for f in (1, 2, 3, 4):
    for n in range(1, 9):
        rooms.append(['BH2', f, f * 100 + n, '3-sharing AC' if n < 7 else '2-sharing AC', 'Hostel_Room', 'None', 'Yes' if (f == 1 and n == 1) else 'No'])
    rooms.append(['BH2', f, 'T%d' % f, '', 'Toilet_Block', '', ''])
for f in (1, 2, 3):
    for n in range(1, 7):
        rooms.append(['GH2', f, f * 100 + n, '2-sharing AC', 'Hostel_Room', 'Staff' if (f == 1 and n == 6) else 'None', 'No'])
rooms.append(['XX9', 1, 101, '2-sharing AC', 'Hostel_Room', 'None', 'No'])      # unknown hostel: refused
rooms.append(['BH2', 1, 109, '9-sharing AC', 'Hostel_Room', 'None', 'No'])      # unknown room type: refused
write('3-rooms.csv', rooms)

write('4-fees.csv', [
    ['hostel_code', 'room_type', 'academic_year', 'registration_fee', 'hostel_fee', 'instalment_1_pct', 'instalment_2_due_date'],
    ['BH2', '3-sharing AC', '2026-27', 5000, 105000, 60, '15-12-2026'],
    ['BH2', '2-sharing AC', '2026-27', 5000, 120000, 60, '15-12-2026'],
    ['GH2', '2-sharing AC', '2026-27', 5000, 120000, 60, '15-12-2026'],
])

assets = [['hostel_code', 'room_no', 'asset_id', 'asset_name', 'category', 'make_model', 'serial_no', 'purchase_date', 'cost', 'warranty_expiry', 'condition']]
items = [('Cot', 'Furniture', 'Steel cot', 4500), ('Cot', 'Furniture', 'Steel cot', 4500), ('Cot', 'Furniture', 'Steel cot', 4500), ('Study table', 'Furniture', 'Teak finish', 3200),
         ('Chair', 'Furniture', 'Moulded', 900), ('Ceiling fan', 'Electrical', 'Crompton 1200 mm', 2100), ('Air conditioner', 'Electrical', 'Voltas 1.5 ton', 38000)]
for room in (101, 102, 103):
    for i, (name, cat, make, cost) in enumerate(items, 1):
        assets.append(['BH2', room, 'BH2-%d-A%d' % (room, i), name, cat, make, '', '01-06-2025', cost, '01-06-2027' if cat == 'Electrical' else '', 'Good'])
assets.append(['BH2', 999, 'BH2-999-A1', 'Cot', 'Furniture', '', '', '', '', '', ''])   # room does not exist: refused
write('5-room-assets.csv', assets)

meters = [['hostel_code', 'room_no', 'meter_no', 'meter_type', 'device_ref', 'installed_on']]
meters += [['BH2', r, 'MTR-BH2-%d' % r, 'Manual', '', '01-06-2026'] for r in (101, 102, 103, 104)]
meters.append(['BH2', 105, 'MTR-BH2-105', 'Smart_Prepaid', '', '01-06-2026'])           # smart meter without device reference: refused
write('6-room-meters.csv', meters)

write('7-staff-wardens.csv', [
    ['staff_id', 'salutation', 'first_name', 'last_name', 'gender', 'dept_code', 'designation', 'staff_type', 'mobile_no', 'official_email', 'joining_date'],
    ['E2001', 'Dr.', 'Suresh', 'Rao', 'Male', 'HOSTELS', 'Chief Warden, Boys Hostel 2', '', '9000020001', 'cw.bh2@kluniversity.in', '01-07-2019'],
    ['E2002', 'Mr.', 'Naveen', 'Kumar', 'Male', 'HOSTELS', 'Floor Warden', '', '9000020002', 'fw1.bh2@kluniversity.in', '15-06-2022'],
    ['E2003', 'Mr.', 'Prakash', 'Reddy', 'Male', 'HOSTELS', 'Floor Warden', '', '9000020003', 'fw2.bh2@kluniversity.in', '15-06-2023'],
    ['E2004', 'Ms.', 'Anitha', 'Devi', 'Female', 'HOSTELS', 'Hostel Office Assistant', '', '9000020004', 'office.bh2@kluniversity.in', '01-08-2021'],
    ['E2005', 'Mr.', 'Ravi', 'Teja', 'Male', 'HOSTELS', 'Security Guard', '', '9000020005', '', '01-01-2024'],
    ['E2006', 'Ms.', 'Padma', 'Sri', 'Female', 'HOSTELS', 'Chief Warden, Girls Hostel 2', '', '9000020006', 'cw.gh2@kluniversity.in', '01-07-2018'],
    ['E2007', 'Mr.', 'No', 'Mobile', 'Male', 'HOSTELS', 'Floor Warden', '', '12345', '', ''],          # bad mobile: refused
])

write('8-warden-duties.csv', [
    ['staff_id', 'hostel_role', 'hostel_code', 'floor_no', 'area', 'shift', 'show_on_qr', 'approval_ref'],
    ['E2001', 'Chief_Warden', 'BH2', '', '', 'General', 'Yes', 'HO/2026/ROLES/21'],
    ['E2002', 'Floor_Warden', 'BH2', 1, '', 'General', 'Yes', 'HO/2026/ROLES/21'],
    ['E2002', 'Floor_Warden', 'BH2', 2, '', 'General', 'Yes', 'HO/2026/ROLES/21'],
    ['E2003', 'Floor_Warden', 'BH2', 3, '', 'General', 'Yes', 'HO/2026/ROLES/21'],
    ['E2003', 'Floor_Warden', 'BH2', 4, '', 'General', 'Yes', 'HO/2026/ROLES/21'],
    ['E2004', 'Office_Staff', 'BH2', '', '', 'General', 'No', 'HO/2026/ROLES/21'],
    ['E2005', 'Security_Guard', 'BH2', '', '', 'Night', 'No', ''],
    ['E2006', 'Chief_Warden', 'GH2', '', '', 'General', 'Yes', 'HO/2026/ROLES/22'],
    ['E9999', 'Floor_Warden', 'BH2', 1, '', 'General', 'Yes', ''],                                      # unknown employee: refused
])

students = [['student_id', 'full_name', 'gender', 'student_type', 'programme', 'date_of_birth', 'personal_email', 'dept_code', 'father_name', 'mother_name', 'father_mobile', 'mother_mobile']]
names = ['ADITYA VARMA', 'BHARGAV RAM', 'CHARAN TEJA', 'DINESH KUMAR', 'ESWAR RAO', 'FAROOQ ALI', 'GANESH BABU', 'HARSHA VARDHAN', 'KAVYA SRI', 'LAKSHMI PRIYA', 'MEGHANA REDDY', 'NIKITHA RAO']
for i, name in enumerate(names):
    first = name.split()[0]
    students.append(['26000410%02d' % (i + 1), name, 'Female' if i >= 8 else 'Male', 'UG', 'Btech CSE' if i % 2 else 'Btech ECE', '%02d-0%d-2007' % (10 + i, 1 + i % 9),
                     '%s%d@example.com' % (first.lower(), i), 'CSE' if i % 2 else 'ECE', 'FATHER OF ' + first, 'MOTHER OF ' + first, '94400410%02d' % (i + 1), '94410410%02d' % (i + 1)])
students.append(['2600041099', 'NO EMAIL', 'Male', 'UG', 'Btech CSE', '01-01-2007', '', 'CSE', '', '', '', ''])   # no e-mail: refused
write('9-students.csv', students)
