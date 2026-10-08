# User-wise flow: who does what, in which order, on which screen

KL University Hostels, release covering Workflows A to F. Screen codes are those of *Roles, Screens and Access Rights*;
ADM-04 and TRK-07 are additions. "Built" means the screen and its API exist and were exercised; "Next release" means the
workflow pages of the specification (G to N) are still awaited.

## 1. Data Administrator: set-up before anyone else can work

Sign in as the Data Administrator. The home screen is this list as a checklist; each line opens the screen that takes the input.
Masters are uploaded as files on **ADM-04 Masters > Upload files**, or entered one record at a time under the other tabs.

| Step | Master | How | File columns (needed in bold) | What it creates |
|---|---|---|---|---|
| 1 | Academic year | Masters > Academic years | year, start, end; mark one current | the year registrations and fees belong to |
| 2 | Hostel buildings | Upload `1-hostels` | **hostel_code, hostel_name, gender, floors**, gate_close_time | building, hostel profile, Floor 1 to n |
| 3 | Room types | Upload `2-room-types` | **type_name, sharing_count**, is_ac, attached_bath | room type; sharing = beds per room |
| 4 | Rooms and beds | Upload `3-rooms` (or Room management screen) | **hostel_code, floor_no, room_no**, room_type, category, reserved_for, accessible | room, its room profile, one bed per sharing place; missing floors |
| 5 | Fees by room type | Upload `4-fees` | **hostel_code, room_type, academic_year, registration_fee, hostel_fee, instalment_1_pct, instalment_2_due_date** | fee a student is charged on registration |
| 6 | Room assets | Upload `5-room-assets` | **hostel_code, room_no, asset_id, asset_name, category**, make_model, serial_no, purchase_date, cost, warranty_expiry, condition | handover list at check-in, damage list at check-out |
| 7 | Room meters | Upload `6-room-meters` | **hostel_code, room_no, meter_no, meter_type, installed_on**, device_ref | one active electricity meter per room |
| 8 | Mess | Masters > Mess | name, hostel, in-charge, seats, yearly fee | mess the student subscribes to |
| 9 | Staff and wardens | Upload `7-staff-wardens` (or the ERP employee export) | **staff_id, first_name, gender, dept_code, designation, mobile_no**, … | employee record and a login user |
| 10 | Warden duties | Upload `8-warden-duties` | **staff_id, hostel_role, hostel_code**, floor_no, area, shift, show_on_qr, approval_ref | who is responsible for which hostel or floor; with approval_ref also grants the role |
| 11 | Users and roles | ADM-01 | role, department, written approval reference | role for anyone not covered by step 10 |
| 12 | Approval rules, limits, report access | ADM-02 | level, approver, SLA; limits; report by role | who approves what; which role opens which report |
| 13 | Students | Upload `9-students` (or the ERP student export) | **student_id, full_name, gender, student_type, programme, date_of_birth, personal_email**, parents, address… | student record, parent contacts (unverified), address |
| 14 | Check | ADM-03 Audit log, Recent uploads | | every upload: file, rows read, loaded, refused, who, when |

Rules of an upload:

* The file is read in the browser. Only the columns the master knows are sent; an Aadhaar, PAN or bank column never leaves the computer.
* Every row is checked first. A refused row is listed with its row number and the reason; nothing is saved until **Load** is pressed.
* Loading the same file again updates existing records and never duplicates them.
* Order matters and is enforced: a room needs its hostel and room type, an asset or meter needs its room, a duty needs its employee.
* Sample files for all nine uploads are in `db/seed/samples/`; `python scripts/upload-samples.py` loads them through the API.

Checked against the real exports: the student profile export (9,449 rows) passes with 9,421 rows ready and 28 refused for a
missing e-mail; its Identity Number column is dropped.

## 2. Everyone else: daily operations

| User | Operations in order | Screens | State |
|---|---|---|---|
| **Student** | 1 apply for a room > 2 pay registration fee > 3 accept the offered bed > 4 choose fee plan and mess > 5 pay fees > 6 check in at the office > then: recharge electricity, apply for outing and show the QR pass, report sick leave, keep contacts verified | GEN-01, GEN-02, REG-01, REG-02, REG-03, REG-04, ELE-01, OUT-01, SCK-01 | Built |
| | menu, mess feedback, tickets, grievances, facility entry, convention centre, academics, discipline record, vacating | MES-01/02, TKT-01/06, FAC-01, CON-01, ACA-01, DIS-05, VAC-01 | Next release |
| **Parent** | recommend or decline an outing; see fees and receipts | OUT-02, REG-02, GEN-01, GEN-02 | Built |
| **Hostel Office** | 1 offer a bed to a paid registration (or auto-allot) > 2 check in: key, room items, opening meter reading > block or release a bed > correct rooms > print door labels > allot staff rooms > view dues | REG-05, REG-06, REG-08, MAP-01, MAP-03, MAP-05, REG-07 | Built |
| **Hostel Accounts** | record cash or DD receipts > follow the dues list > enter electricity tariff > read the occupancy, fees and dues report | REG-07, REG-02, ELE-02, ELE-03, RPT-07 | Built |
| **Floor Warden** | take the night roll call > act on alerts > look up a student with a purpose > Level 1 on outings > visit and recommend sick leave > hand over the room at check-in | TRK-07, TRK-03, TRK-01, TRK-02, GEN-03, OUT-03, SCK-02, REG-06, REG-08 | Built |
| **Warden** | watch the hostel: occupancy, status board, attendance, alerts, dues, report; approve exceptions | REG-05, REG-07, REG-08, MAP-02, TRK-01/02/03/07, RPT-07, GEN-03 | Built |
| **Chief Warden** | assign Floor Wardens and duties > Level 2 on outings (final for a same-day outing) > approve sick leave > review the look-up log > alerts, occupancy, report | MAP-02, GEN-03, OUT-03, SCK-02, TRK-06, TRK-01/02/03/07, REG-05, REG-08, MAP-01, RPT-07 | Built |
| **Dean, Students Affairs** | Level 3 on an outing of a day or more; approve warden assignments | GEN-03, OUT-03, MAP-02 | Built |
| **Pro-VC Finance** | approve the electricity tariff; read the report | ELE-03, RPT-07, GEN-03 | Built |
| **Security** | scan students in and out at the gate, manual entry when the scanner fails; alerts; Security Officer registers gates, readers, cameras | TRK-04, TRK-03, TRK-02, TRK-05 | Built |
| **Mess In-charge, Mess Supervisor** | see who is on sick leave; tick each room meal delivered | SCK-03 | Built |
| **Maintenance Supervisor** | register meters, enter manual readings; mark a room under maintenance | ELE-02, REG-08 | Built |
| **Data Administrator** | section 1 | ADM-04, MAP-01, ADM-01, ADM-02, ADM-03 | Built |
| Mess store, technicians, inspection, stores, purchase, finance, facility in-charge, exams, academic roles | their workflows G to N | MES, TKT, IND, FAC, CON, ACA, DIS, VAC, RPT-01 to 06, RPT-08 | Next release |

## 2a. Allotment, fee check and duty roster (094)

**Room allotment (Workflow A)**
1. Chief Warden, Allotment desk: *Block rooms*, tap rooms on the floor plan, pick a reason (management quota, sports, guests, medical…). Blocked rooms leave the students' choice and automatic allotment; the office can still offer a bed in them by name. *Release the block* puts them back.
2. Student, Registration: choose a hostel (only hostels of the student's gender are listed) and a room type (fee and open beds shown) → pay the registration fee → **choose a bed** from the rooms still open (blocked, reserved and maintenance rooms are hidden) → fee plan and mess → pay the hostel and mess fees. The dues are shown beside every step.
3. Office: students who do not choose are allotted with *Allot automatically* (one hostel at a time, in order of application; accessible rooms first for a student with a disability; no bed → waiting list), or one by one from a room on the floor plan.
4. Warden, Fee check: the demands and receipts side by side → *Verify fees* or *Raise a query* (note required). The database refuses check-in until the fees are verified.
5. Office, Check-in: only students whose fees are paid **and** verified are listed.

**Staff attendance and duty roster (Workflow B)**
1. Warden / Chief Warden / Floor Warden, Attendance and duty roster: mark each mapped person P / A / L, or *Mark rest present*.
2. *Build roster*: every floor gets a Floor Warden and a sweeper, every washroom block a scavenger, the hostel a Warden, and each guard shift (morning, evening, night) a guard. The mapped person takes the place when present; otherwise the least-loaded present colleague who can stand in (sweeper ↔ cleaner ↔ scavenger, Floor Warden ← Assistant Warden ← Warden, guard ← Security Officer; at most four places each). Amber = covering, red = nobody available.
3. A place can be given to someone else by hand; hand changes are kept when the roster is rebuilt.

**Mapping centre**: one board for students ↔ beds and wardens, sweepers, scavengers and guards ↔ floors, washrooms and shifts, with how complete each hostel is. Each card opens the list, a one-at-a-time form, or a file upload checked row by row. *Students in beds* maps residents who already live in the hostel (registration fee waived, fees marked checked).

**Floor Warden's day**: Home shows the floors in charge (residents in, on a pass, sick, not seen, empty beds), the operations as cards — night roll call, approvals, sick students (record the visit), alerts (acknowledge, close with what was done), outings today, new arrivals, floor staff (mark sweepers and scavengers present), attendance register — and every room with a dot per resident. *Night roll call* goes room by room (In / Not seen / Pass / Sick, passes and sick leave filled in); a resident not seen raises one Not Seen alert to the Floor Warden.

**Attendance sessions, rounds, student 360, access (095)**
- *Roll call* has a card per session of the day (morning, study hours by QR, night). Each keeps its own marks; the night session also fills the night register and raises Not Seen alerts.
- *Floor rounds and repairs*: room by room, washroom and floor checklist (lights, fan, taps, leaks, extinguisher, exits, Wi-Fi…). A fault needs a note and raises one ticket per place and trade with the trade's deadline; the maintenance side marks it repaired; the Floor Warden confirms (closed) or sends it back (reopened).
- *Student academic page*: a student's own 360 — CGPA, class attendance, CRT sessions and tests, certifications, activities, achievements, hostel record. Students add certificates and achievements; a warden verifies. Staff see all hostellers in one sortable table with weak figures in red.
- *Access control*: every gate, corridor, mess, library and gym is a point with accepted methods (QR, face, thumb, card) and a rule (who, hours, outside hours: refuse / ask approval / let in and tell, pass needed to go out). Each scan is judged and kept with the reason; out-of-hours requests go to the named approver (Floor Warden home → Entry approvals). Face and thumb templates stay on the device; only a reference is stored.

## 3. Count

| | Number |
|---|---|
| Roles in the document | 27 |
| Screens in the document | 87 |
| Screens built from the document | 35 |
| Screens added (ADM-04 Masters with uploads, TRK-07 Attendance) | 2 |
| **Screens working now** | **37** |
| Masters that upload from a file | 9 |
| Masters entered on a form | 7 (years, hostels, room types, fees, mess, staff, students) |
| Screens waiting for the G to N specification pages | 52 |
