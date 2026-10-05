# KL University Hostel ERP

Hostel module of the university ERP (database + NestJS API + React/Vite web), built from *Hostel Database Design and Data Model, by Workflow v2.1* and the
three master-data models it aligns with (Infrastructure & Maintenance; Inventory, Procurement & Accounts;
Stock & Purchase Portal). **Database: every master table (186 tables). Application: Workflows A–F.**

| Workflow | What it covers | Status |
|---|---|---|
| A | Registration, allotment, fees, check-in | DB + API + web |
| B | Mapping people to rooms, QR labels | DB + API + web |
| C | Electricity meter, readings, online recharge | DB + API + web |
| D | Student tracking: consent, gate/corridor events, alerts, access log | DB + API + web |
| E | Outing permission: parent → Floor Warden → Chief Warden → Dean, QR pass, gate | DB + API + web |
| F | Sick leave: visit, approval, mess sick list, room meals | DB + API + web |
| G | Mess: routine menu (MES-01); weekly menu written by the Mess In-charge or Chef, students choose dishes (incl. evening snacks) by Friday (MES-08, MES-09), the Chief Chef enters choices for students (MES-10); choice report (RPT-11); students rate dishes (MES-02) and the sentiment dashboard for the President, Vice President, Pro-VCs, Mess Supervisor and Chief Chef with daily, weekly and monthly downloads (RPT-12) | DB + API + web (rest of G: stubs) |
| Repairs | Students raise tickets for their room (furniture, plumbing and sanitation, electrical), the mess or a common facility (elevator, corridor lighting, reading room, activity room …) (TKT-01); wardens check them, the mess or maintenance repairs and files the closure report, the student confirms (TKT-03) | DB + API + web |
| Electricity | Each room's monthly bill (units beyond those included and recharged × approved rate) shared equally by roommates by days lived there, as each student's Electricity fee in the fees portal (ELE-04, made on the 1st of the month); cumulative collections on EXE-01 | DB + API + web |
| Careers | Career tracker (CAR-01) for the Chief Warden, student by student: second-year progress towards the chosen career (milestones, On track / Watch / Needs guidance), final-year placements and packages, higher studies, competitive exams and ventures, recorded stage by stage; the same building by building on EXE-01 | DB + API + web |
| Exec | Executive dashboard (EXE-01, `/exec`, no menu) for the President, Vice President and Pro-VCs: every building as a card, opening into academic standing (backlogs, attendance shortfall, CGPA), activities, night roll call, mess, fees and dues, wardens' attendance and discipline | DB view + API + web |
| H–N | Tickets, procurement, facilities, convention, academics, discipline, vacating | DB stubs only — spec pages missing |

## Layout

```
db/           PostgreSQL 18 schema: migrations (19 files), rules & triggers, views, seed, smoke test  → db/README.md
packages/db   Drizzle schema generated from the migrated database (pnpm --filter @klu/db pull)
apps/api      NestJS API, one module per workflow, Swagger at /docs                                    → http://localhost:4000/docs
apps/web-vite React 19 + Vite + Tailwind app on the KLH design system (apps/web-vite/src/vendor, refreshed by scripts/sync-klh.mjs).
              Screens and menus follow "Roles, Screens and Access Rights" (27 roles, 87 screens): the registry is src/app/screens.ts,
              every route carries its screen code (GEN-01 … ADM-03), the in-app screen map is /screens         → docs/screens.md
docs/         plan & stack decision, data dictionary (generated), hostel ER diagram, design-system-klh.md (KLH guide), screens.md (screen/role/access map)
scripts/      api-smoke.sh — end-to-end HTTP walk through A–F
```

## Run it locally

```powershell
# 1. database (PostgreSQL 18 on this machine)
.\db\apply.ps1 -ConnectionString "postgresql://postgres:<password>@localhost:5432/postgres" -Database klu_hostel -Test
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" "postgresql://postgres:<password>@localhost:5432/klu_hostel" -f db\seed\dev_fixtures.sql

# 2. code
pnpm install
pnpm --filter @klu/db build
copy .env.example .env            # set DATABASE_URL
pnpm api                           # http://localhost:4000/api  (Swagger at /docs)
pnpm web                           # http://localhost:5173 (Vite dev server proxies /api to the API)
```

Sign in on the web app with one of the 27 roles and an id from the fixtures (student `2600040010` new or `2600040012` checked in,
parent `contact:5`, Floor Warden `S-FW`, Warden `S-WD`, Chief Warden `S-CW`, office `S-OF`, accounts `S-AC`, guard `S-SG`,
Security Officer `S-SO`, mess `S-MS` / supervisor `S-MU`, maintenance `S-MT`, Dean `S-DN`, Dean Progression `S-DP`,
Pro-VC Finance `S-PV`, Data Administrator `S-AD`). The menu shows only that role's screens (docs/screens.md).
Start as the Data Administrator (`S-AD`): the home screen is the set-up order (masters, people and access, rules and reports).
`db/seed/weekly_menu_demo.sql` adds six weeks of weekly menus (four eaten, one closed, one open) with students' choices, and `db/seed/mess_sentiment_demo.sql` a month of meal ratings, `db/seed/exec_demo.sql` 30 days of wardens' attendance, `db/seed/career_demo.sql` fourteen final-year residents with offers, admits, exams and ventures, `db/seed/electricity_demo.sql` meters, readings and the August and September room bills, `db/seed/tickets_demo.sql` forty repair tickets, plus logins: Mess In-charge `S-MS`, Chief Chef `S-CK`, Mess Supervisor `S-MU`, Floor Warden `S-FW`, Maintenance `S-MT`, Accounts `S-AC`, President `S-PR`, Vice President `S-VP`, Pro-VC `S-PC`.
`bash scripts/demo-seed.sh` adds a second hostel, more rooms, five checked-in students, outings, a sick leave and a week of roll call.
OTP for contact verification in development is `000000`; payments run in DEV mode until Razorpay keys are set.

## How the pieces fit

* **The database enforces the workflow rules** (one registration per student per year, no offer until the fee is
  paid, approval levels in order, readings never decrease, no movement without consent, …) through constraints and
  triggers in `db/migrations/060_hostel_rules.sql`. The API only records what each actor did; a broken rule comes
  back as HTTP 422 with the rule's message, which the web app shows.
* **Audit**: every write runs in a transaction stamped with the acting user; sensitive tables feed a hash-chained
  `shared.audit_log`. Movement events, location look-ups and receipts are append-only.
* **Approvals** for outing, sick leave and vacating share `shared.approval_rule` / `shared.approval_step`;
  approvers are found through `hostel.staff_space_assignment` (who is Floor Warden of this floor today).
* **Auth**: Bearer tokens from the university Keycloak realm (`OIDC_ISSUER`); dev headers `x-dev-user` /
  `x-dev-role` when it is not set. Roles are `portal.role` codes.
* **Jobs**: cron in the API calls the database functions (overdue fees and passes, not-seen alerts, missed sick
  meals, monthly meter roll-up, movement purge) and drains the notification outbox.
* **Room change** (`db/migrations/115_room_change.sql`, `apps/api/src/room-change`, `/change-room`, `/room-changes`): a resident asks
  for another room type or another room of the same type in their hostel; Floor Warden then Chief Warden approve on the shared
  approval engine (the Chief Warden gives or changes the bed, which is then held). On the day the warden enters the old room's
  meter reading and key, and `hostel.fn_room_change_complete` moves the student (Transfer exception of 100) and settles the money:
  hostel fee pro rata by days (a demand for the difference, or a credit on unpaid instalments and a refund due), and the
  electricity share up to the move, which the month-end bill then counts as paid.
  The Chief Warden has full control of their building (`117_room_change_cw_control.sql`): one approval takes both steps, any free
  bed of any room type can be given (also after approval), and `hostel.fn_room_change_direct` moves a resident without a request.
* **Caution deposit** (`db/migrations/116_caution_deposit.sql`, `apps/api/src/caution`, `/caution-deposits`, `/my-deposit`): a refundable
  deposit (`room_type_fee.caution_deposit`, default ₹10,000) raised once as a `Caution_Deposit` fee demand when a room is taken;
  each student's account is `hostel.caution_entry` (Opening, Collected from the receipt, Deduction proposed by a warden and approved
  by the Chief Warden, Refund with the bank reference). Accounts can pay unpaid dues from it (`fn_caution_pay_due`). The balance can
  never go below zero; lines are never changed or deleted. The money itself stays in the university's bank account via the gateway.
* **Joining and renewal fees** (`db/migrations/118_joining_and_renewal_fees.sql`): joining = registration fee, caution deposit,
  electricity caution deposit, hostel fee, mess fee and the yearly electricity meter charge (`room_type_fee.elec_caution_deposit`,
  `meter_charge`); renewal = hostel fee, mess fee and meter charge only (registration is a waived ₹0 line, no deposits). The two
  deposits are kept apart in `hostel.caution_entry.deposit_kind`.
* **Mess operations and checklists** (`db/migrations/119_mess_operations_and_checklists.sql`, `apps/api/src/messops`, `apps/api/src/care`):
  complaints desk with significant meals (5 students or 10% of the mess), meal scan at the counter, mess store (goods received,
  issues acknowledged by the supervisor, never more than in stock, re-order under four days of use), daily record, monthly report;
  checklists filled by role and signed by the reviewer (a failed item opens a repair ticket); grievances that are not repairs,
  ragging and safety always confidential. Demo data: `db/seed/mess_ops_demo.sql` (login `S-MK`, Mess Storekeeper).
* **Student health** (`db/migrations/114_student_health.sql`, `apps/api/src/health`, `/health`, `/my-health`): 13
  panels / 76 tests with units, LOINC codes and male/female reference ranges; the database flags each result L/H/LL/HH.
  The gym equipment posts JSON to `POST /api/health/reports`, or the Gym Manager uploads the CSV template
  (`POST /api/health/import`, each row checked on its own). Food, activity and see-a-doctor suggestions come from
  `hostel.health_rule`. Gym Manager and Dean see everyone; Chief Warden and Warden their hostels; Floor Warden their
  floors; students their own. Every opening is logged in `hostel.health_view_log`. Reference ranges are typical
  young-adult values: check them against the lab's and the equipment's own before going live.

## Before production

1. Supply the missing spec pages (Workflows G–N, shared section 17) and finish those modules.
2. Wire Keycloak (realm roles = `portal.role` codes, claim `uni_id`), Razorpay live keys and webhook secret,
   the SMS/WhatsApp provider for `shared.notification`, MinIO for `shared.document`, the smart-meter vendor push.
3. Import real data: `student_profile` CSV → `ref.student_master` + `hostel.student_contact`; `employee_profile`
   → `ref.staff_master`; infrastructure → `infra.*`. The CSV column mapping is documented in `db/migrations/010_ref.sql`.
4. Monthly partitions for `hostel.movement_event` and `shared.audit_log`; backups; TLS; rate limits.
