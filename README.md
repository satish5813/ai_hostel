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
| G–N | Mess, tickets, procurement, facilities, convention, academics, discipline, vacating | DB stubs only — spec pages missing |

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

## Before production

1. Supply the missing spec pages (Workflows G–N, shared section 17) and finish those modules.
2. Wire Keycloak (realm roles = `portal.role` codes, claim `uni_id`), Razorpay live keys and webhook secret,
   the SMS/WhatsApp provider for `shared.notification`, MinIO for `shared.document`, the smart-meter vendor push.
3. Import real data: `student_profile` CSV → `ref.student_master` + `hostel.student_contact`; `employee_profile`
   → `ref.staff_master`; infrastructure → `infra.*`. The CSV column mapping is documented in `db/migrations/010_ref.sql`.
4. Monthly partitions for `hostel.movement_event` and `shared.audit_log`; backups; TLS; rate limits.
