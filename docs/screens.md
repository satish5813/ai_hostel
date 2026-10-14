# Screens, roles and access (this release)

Source: *KL Residencies — Roles, Screens and Access Rights* (1 Oct 2026): 27 roles, 87 screens, access codes
V view · C create · E edit · A approve or reject · X set up. The registry that drives the menus is
`apps/web-vite/src/app/screens.ts`; the screen map in the app (`/screens`) shows the same data live, including the master matrix
and the rules that apply to every role.

A person sees only the screens of the roles they hold (menu built from the registry) and on each screen only the records in
their scope (enforced by the API role guards and the database: a Floor Manager's floor from `Staff_Space_Assignment`, a parent's
child from `Student_Contact`).

## Screens in this release (Workflows A–F, general, one report, admin)

| Code | Screen | Route | Who (access) | API |
|---|---|---|---|---|
| GEN-01 | My profile and contacts | `/profile` | everyone; students edit contacts | `GET /me/profile`, `GET /students/:id`, contacts |
| GEN-02 | Notifications | `/notifications` | everyone | `GET /notifications` |
| GEN-03 | My approvals | `/approvals` | FW, WDN, CW, DSA, DSP, PVF, PVA, VPP, STO (VA) | `GET /approvals/inbox`, `POST /approvals/:id/decide` |
| REG-01 | Hostel registration | `/registration` | STU (C) | `POST /registrations` |
| REG-02 | Fees and receipts | `/fees` | STU (VC), PAR (V), HAC (V) | `GET /students/:id/demands` (demands, totals, receipts), payments |
| REG-03 | Room offer | `/registration` | STU (E) | `POST /offers/:id/decision` |
| REG-04 | Fee plan and mess choice | `/registration` | STU (C) | `POST /registrations/:id/fee-plan` |
| REG-05 | Allotment desk | `/allotment` | OFF (CE), WDN, CW (VA; CW blocks rooms) | `GET /allotment/hostels`, `GET /allotment/board`, `POST /allotment/blocks`, `POST /allotment/blocks/:id/release`, `POST /allotment/auto`, `GET /registrations`, `POST /registrations/:id/offers` |
| REG-09 | Fee check *(addition)* | `/fee-checks` | WDN, CW (VA), OFF, HAC (V) | `GET /fee-checks`, `POST /registrations/:id/fee-check`, `GET /students/:id/demands` |
| REG-06 | Check-in and room handover | `/check-in` | OFF, FW (C) | `POST /allocations`, `POST /allocations/:id/handover` |
| REG-07 | Dues and collections | `/dues` | HAC (CE), WDN, OFF (V), PVF (A) | `POST /demands/:id/receipts` |
| REG-08 | Occupancy board | `/occupancy` | FW, WDN, CW (V), OFF (VE), MNT (E) | `GET /beds`, `POST /beds/:id/status`, `POST /rooms/:id/status` |
| MAP-01 | Rooms and beds | `/rooms` | OFF (CE), CW (A), ADM (X) | `GET /beds`, `POST /rooms/:id/profile` |
| MAP-02 | Staff mapping | `/staff-mapping` | CW (CE), WDN, DSA (A) | `GET/POST /assignments`, `POST /assignments/:id/end` |
| MAP-03 | QR labels | `/qr-labels` | OFF (C) | `POST /spaces/:id/qr`, `GET /spaces/:id/qr/label` |
| MAP-04 | Room page | `/qr/:token` | public (scan) | `GET /qr/:token` |
| MAP-05 | Staff room allotment | `/staff-rooms` | OFF (C) | `GET/POST /staff-allocations`, `POST /staff-allocations/:id/vacate`, `GET /staff` |
| MAP-06 | Attendance and duty roster *(addition)* | `/duty-roster` | CW, WDN (CE), FW (VC), SEC (V) | `GET /roster`, `GET /roster/week`, `POST /roster/attendance`, `POST /roster/generate`, `POST /roster/duties/:id` |
| MAP-07 | Mapping centre *(addition)* | `/mapping`, `/mapping/data/:kind` | CW, OFF (CE), WDN (V), ADM (X) | `GET /mapping/summary`, `GET /admin/data/{duties,bed_map}`, `POST /admin/import/{duties,bed_map}/check|load|save` |
| ELE-01 | My electricity | `/electricity` | STU (VC) | `GET /meters/mine`, `POST /meters/:id/recharge` |
| ELE-02 | Meters and readings | `/meters` | MNT (CE), HAC (V) | `GET/POST /meters`, `POST /meters/:id/readings` |
| ELE-03 | Electricity tariff | `/tariff` | HAC (X), PVF (A) | `POST /tariffs`, `POST /tariffs/:id/approve` |
| TRK-01 | Student status board | `/status-board` | FW, WDN, CW (V) | `GET /locations` |
| TRK-02 | Student look-up | `/look-up` | FW, WDN, CW, SEC (V) | `GET /students/:id/location?purpose=` (logged) |
| TRK-03 | Alerts | `/alerts` | FW, WDN, CW, SEC (VE) | `GET /alerts`, `POST /alerts/:id` |
| TRK-04 | Gate scan | `/gate` | SEC (C) | `GET /gate/verify`, `POST /movements` |
| TRK-05 | Capture points | `/capture-points` | Security Officer (X) | `GET/POST /capture-points` |
| TRK-06 | Look-up log | `/look-up-log` | CW (V) | `GET /reports/location-access-log` |
| OUT-01 | My outings | `/outings` | STU (VC) | `POST /outpasses`, `GET /outpasses/mine`, `/outpasses/:id/qr` |
| OUT-02 | Parent recommendation | `/parent-recommendation` | PAR (VA) | `POST /approvals/:id/parent` |
| OUT-03 | Outing approvals | `/outing-approvals` | FW, CW, DSA (A) | `GET /outpasses`, GEN-03 |
| SCK-01 | My sick leave | `/sick-leave` | STU (VC) | `POST /sick-leaves`, `/sick-leaves/mine` |
| SCK-02 | Sick leave approvals | `/sick-leave-approvals` | FW (CA), CW (A) | `POST /sick-leaves/:id/visit`, GEN-03 |
| SCK-03 | Mess sick list | `/mess-sick-list` | MIC (V), MSU (E) | `GET /mess/sick-list`, deliveries |
| RPT-07 | Occupancy, fees and dues | `/reports/occupancy-fees-dues` | WDN, CW, HAC, PVF (V) | `GET /reports/occupancy-fees-dues` (opening logged) |
| ADM-01 | Users and roles | `/admin/users` | ADM (CE) | `GET /admin/users`, `POST/DELETE /admin/users/:id/roles…` |
| ADM-02 | Approval rules and settings | `/admin/settings` | ADM (X) | `/admin/approval-rules`, `/admin/settings`, `/admin/report-visibility` |
| ADM-03 | Audit log | `/admin/audit-log` | ADM (V) | `GET /admin/audit-log` |
| ADM-04* | Masters | `/admin/masters` | ADM (X) | `/admin/academic-years`, `/admin/hostels`, `/admin/room-types`, `/admin/room-type-fees`, `/admin/messes`, `/admin/staff`, `/admin/students` |
| TRK-08 | Night roll call *(addition)* | `/roll-call` | FW, WDN (VC), CW (V) | `GET /floor/today`, `POST /attendance/mark` |
| TRK-07* | Attendance register | `/attendance` | FW, WDN (VC), CW (V) | `GET /attendance`, `POST /attendance/mark` |

\* Additions for this release, not among the document's 87 screens. ADM-04 is where the Data Administrator enters the masters;
TRK-07 shows each hostel student against each day (outings, sick leave, night roll call in `hostel.night_attendance`, migration 092).

## Admin set-up order (the admin home is this checklist)

1. Academic year (ADM-04) → 2. Hostel buildings and floors (ADM-04) → 3. Rooms and beds (MAP-01: add floor, add rooms by range; beds are created from the room type)
→ 4. Room types → 5. Fees per hostel and room type → 6. Mess → 7. Staff, then duties (MAP-02, Chief Manager) → 8. Users and roles (ADM-01)
→ 9. Approval rules → 10. Report access (ADM-02) → 11. Students (ERP import, or ADM-04 for single additions).
`scripts/demo-seed.sh` runs this order through the API and then walks five students to check-in.

Not in this release (listed on the screen map as "Next release"): MES-01…07 (G), TKT-01…06 (H), IND-01…12 (I), FAC-01…03 (J),
CON-01…05 (K), ACA-01…02 (L), DIS-01…06 (M), VAC-01…04 (N), RPT-01…06 and RPT-08. They need the Workflow G–N pages of the spec.

## Role codes and sign-in

| Code | Role | Session role (`portal.role`) | Fixture ID |
|---|---|---|---|
| STU | Student | Student | 2600040010 (new), 2600040012 (checked in) |
| PAR | Parent or guardian | Parent | contact:5 |
| FW | Floor Manager | Floor_Warden | S-FW |
| WDN | Warden | Warden (also Assistant_Warden, Hostel_Incharge) | S-WD |
| CW | Chief Manager (Director, Hostels) | Chief_Warden, Director_Hostels | S-CW |
| OFF | Hostel Office Staff | Office_Staff, Room_Allotment | S-OF |
| HAC | Hostel Accounts section | Accounts_Section | S-AC |
| SEC | Security | Security_Guard, Security_Officer | S-SG, S-SO |
| MIC / MSU / MSK | Mess In-charge / Supervisor / Storekeeper | Mess_Incharge, Mess_Supervisor, Mess_Storekeeper | S-MS, S-MU |
| MNT / TEC / INS | Maintenance Supervisor / Technician / Inspection Officer | Maintenance_Supervisor, Technician, Inspection_Officer | S-MT |
| STO / PUR / ACC | Stores / Purchase / Accounts (Finance) | storekeeper, purchase, accounts (portal) | — |
| DSA / DSP | Dean, Students Affairs / Students Progression | Dean_Students_Affairs, Dean_Students_Progression | S-DN, S-DP |
| PVF / PVA | Pro-VC Finance / Academics | Pro_VC_Finance, Pro_VC_Academics | S-PV |
| VC / VPP | Vice-Chancellor / Vice President and President | Vice_Chancellor, Vice_President, President | — |
| ACD / EXM | Faculty Counsellor, HOD… / Controller of Exams… | Faculty_Counsellor, HOD, Principal, Dean_Academics, Controller_Exams, Director_Examinations | — |
| ADM | Data Administrator | admin | S-AD |

Roles the document names that 090_seed lacked are added by `db/migrations/091_roles_screens.sql`, which also moves the vacating
chain to Dean, Students Progression (L3) and Pro-VC Finance (L4), adds `approval_ref`/`granted_by` to `portal.user_role`
(ADM-01 "on written approval"), makes the meter view use approved tariffs only (ELE-03), and adds the RPT-07 view.

## Rules that apply to every role, and where they live

| Rule | Implementation |
|---|---|
| Nobody approves their own request | approval steps are generated for the roles above the requester (DB) |
| Levels in order | inbox lists only the lowest pending level; DB rejects out-of-order decisions |
| Several roles, one person | session carries `roles[]`; the menu is the union (registry) |
| Sensitive data | Aadhaar/PAN/bank never copied into the hostel DB; phone numbers only on warden, security and office screens |
| Location look-ups | `GET /students/:id/location` requires a purpose and writes `location_access_log`; TRK-06 reviews it |
| Reports are read-only | RPT-07 is a view; each opening writes an audit row |
| Everything is logged | hash-chained `shared.audit_log` triggers; bed/room status and report openings add rows |
| Roles are given on approval | ADM-01 requires `approval_ref`; the API refuses a grant to oneself |
| Admin acts in no workflow | `RolesGuard` no longer bypasses role checks for `admin` |

**Floor Manager home** (`/home` for `Floor_Warden`): `GET /floor/today` (floors in charge, hostel students with tonight's state, alerts, sick visits, outings today, arrivals, floor staff) plus `GET /approvals/inbox`; panels act through `POST /approvals/:id/decide`, `POST /sick-leaves/:id/visit`, `POST /alerts/:id`, `POST /roster/attendance`.

**095 additions**
| Code | Screen | Route | Who | API |
|---|---|---|---|---|
| TRK-08 | Roll call (sessions) | `/roll-call` | FW, WDN (VC) | `GET /attendance/sessions`, `GET /attendance/sessions/:id/marks`, `POST /attendance/session-mark` |
| TKT-04 / TKT-02 | Floor rounds and repairs | `/maintenance` | FW (C, A), WDN (C) | `GET/POST /floor/round`, `GET/POST /tickets`, `POST /tickets/:id/confirm`, `POST /tickets/:id/resolve` (maintenance) |
| ACA-01 | Student academic page (student 360) | `/academics`, `/academics/:id` | Student (own), FW, WDN, CW, Dean… (V) | `GET /students/:id/360`, `GET /acad/board`, `POST /me/certifications`, `POST /me/achievements`, `POST /acad/{certifications,achievements}/:id/verify` |
| TRK-09 | Access control *(addition)* | `/access` | CW (VCEA), SEC (VCE), FW, WDN (VA) | `GET /access/points`, `POST /access/points/:id/policy`, `POST /access/check`, `POST /access/scan`, `GET /access/requests`, `POST /access/requests/:id/decide`, `GET /access/log`, `GET /access/enrolment`, `POST /access/enrol` |
