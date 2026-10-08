# KL University Hostel ERP — Development Plan and Stack

Source: *Hostel Database Design and Data Model, by Workflow*, Version 2.1 (1 Oct 2026).
Companion: *Integrated Hostel Workflow and Policy Blueprint*, Version 2.

## 0. Gap in the supplied document

The supplied PDF (23 pages) contains the Masters (MS1–MS8) and Workflows **A, B, C, D, E, F** only.
The index on pages 2–4 lists 14 workflows and 84 new tables, but the detail pages for the
following are **not in the scan** and must be supplied before those modules can be built:

| Missing | Tables listed in index |
|---|---|
| G Mess | G1–G9 |
| H Tickets / grievances / checklists | H1–H7 |
| I Indent, procurement, assets, accounts | I1–I40 (mostly EXISTING; I13, I17, I22–I24, I26, I27, I32–I35, I37–I40 are NEW) |
| J Facilities | J1–J3 |
| K Convention centre | K1–K6 |
| L Academic performance | L1–L5 |
| M Discipline | M1–M4 |
| N Vacating | N1–N2 |
| Shared (section 17) | SH1 Approval_Rule, SH2 Approval_Step, SH3 Report_Visibility, SH4 Notification |
| Infrastructure model | Campus, Facility, Zone, Space, SubSpace, Asset_Master, role, department, document, location |

Workflows A–F already reference Approval_Rule / Approval_Step, Vacate_Request, Mess_Subscription,
No_Dues_Clearance, Policy_Setting and the Infrastructure tables, so those must be defined (at least
as stubs from the index descriptions) in Phase 1.

## 1. Recommended stack (secure university ERP)

| Layer | Choice | Why |
|---|---|---|
| Database | **PostgreSQL 16** | The spec is relational with ~110 tables, strict enums, derived columns and "rules the database must enforce". Postgres gives CHECK/partial-unique constraints, triggers, row-level security, table partitioning (Movement_Event), and native audit. Mature, free, runs on campus hardware. |
| Backend API | **NestJS (TypeScript, Node 24 LTS)** + **Drizzle ORM** | Modular monolith maps 1:1 to the workflow letters (one Nest module per workflow). Strong typing end-to-end, guards/interceptors for RBAC and audit, built-in validation (class-validator / zod), OpenAPI generation. Drizzle keeps SQL explicit so DB-level constraints stay the source of truth. |
| Web front-end | **Next.js 15 (App Router) + shadcn/ui + Tailwind** | One codebase for student portal, warden/office dashboards and accounts screens. Installable as a PWA for the gate QR scanner, floor-warden checklists and meter readings on phones. |
| Identity / SSO | **Keycloak** (self-hosted, OIDC) | University ERPs need SSO against the existing ERP / Active Directory, MFA for staff, and data residency inside the campus. Roles (Student, Parent, Floor Warden, Chief Warden, Dean, Accounts, Security, Mess In-charge…) become Keycloak realm roles; fine-grained scope comes from Staff_Space_Assignment in the DB. |
| Background jobs | **BullMQ on Redis** | Alerts (No_Pass_Exit, Fee_Overdue, Meter_Low), ticket auto-close, meter recharge push with retry, Movement_Event retention deletion, nightly Meter_Monthly_Usage roll-ups, ERP import batches. |
| Files | **MinIO** (S3-compatible, on-prem) | Student photos, medical documents, handover photos, QR label PDFs. Private buckets, signed URLs only. |
| Payments | **Razorpay** (UPI / card / net-banking) | Fee_Receipt.Gateway_Ref / Gateway_Status; webhook-driven, idempotent. |
| Notifications | SMS/WhatsApp (MSG91 or Gupshup) + SMTP | Notification (SH4) rows → outbox → provider. OTP for Student_Contact.Is_Verified. |
| Infra | Docker Compose (dev) → Kubernetes or Docker Swarm on campus VMs (prod), Nginx ingress, TLS from internal CA / Let's Encrypt | Keeps PII on campus (DPDP Act 2023). Cloud (Vercel/AWS) remains possible later for the Next.js front-end only. |
| Observability | OpenTelemetry → Grafana/Loki/Tempo, Sentry | Required for incident forensics in a tracking system. |

Alternative if the team is Python-first: Django + Django REST Framework with the same Postgres,
Keycloak, Redis and MinIO. Do not split the backend into microservices; a modular monolith is
the right size for this spec.

### Security baseline (non-negotiable)

1. **Authentication**: OIDC via Keycloak, short-lived access tokens, refresh in HTTP-only cookies,
   MFA mandatory for Chief Warden / Dean / Accounts / Security Officer roles.
2. **Authorisation**: RBAC by role + scope by Staff_Space_Assignment (a Floor Warden sees only their
   floor). Report_Visibility (SH3) drives report access. Enforced in the API *and* mirrored as
   Postgres row-level-security policies for the reporting user.
3. **PII minimisation**: Aadhaar / government IDs are never copied (spec says so). Photos and medical
   docs in private object storage; only signed URLs leave the server.
4. **Consent & tracking**: no Movement_Event without current Tracking_Consent (DB trigger).
   Location_Access_Log written on every lookup; Movement_Event and Location_Access_Log are
   append-only (UPDATE/DELETE revoked). Retention job deletes old Movement_Event rows.
5. **Audit**: every table has created_at / created_by / updated_at / updated_by; a generic
   `audit_log` table captures before/after JSON on sensitive tables via triggers.
6. **Money**: Fee_Demand.Amount_Paid and Room_Handover.Total_Damage_Amount are derived, never typed
   (computed by trigger / query). Receipts are immutable; reversals are new rows.
7. **Transport & secrets**: TLS everywhere, HSTS, CSP, CSRF tokens, rate limiting on login/OTP/payment
   webhooks, secrets in Vault or Kubernetes secrets, never in the repo.
8. **Testing**: OWASP ASVS L2 checklist, dependency scanning (npm audit / Snyk), DB migration review.

## 2. Database design approach

* **Naming**: snake_case tables and columns; the spec's names are kept verbatim
  (`hostel_registration`, `room_offer`, `meter_student_map` …) so the dev team can trace every
  column back to the document.
* **Keys**: `bigint identity` surrogate PKs where the spec says *Auto*; natural keys (Student_ID,
  Staff_ID, Academic_Year, Facility_ID, Space_ID) where the spec says they come from the ERP or
  Infrastructure model.
* **Enums**: one Postgres `ENUM` type per status list in the spec (e.g. `registration_status`:
  Applied / Fee_Paid / Waitlisted / Allotted / Accepted / Confirmed / Checked_In / Cancelled / Vacated).
* **Derived columns**: computed by views or triggers, never writable from the API
  (Outing_Category, Levels_Required, Late_By_Minutes, Amount_Paid, Total_Damage_Amount, Units_Credited).
* **"Rules the database must enforce"** become real constraints, e.g.
  * one Hostel_Registration per student per academic year → `UNIQUE (student_id, academic_year)`;
  * one Pending offer per registration and per bed → partial unique indexes on `student_decision = 'Pending'`;
  * one Active meter per room, one Active Space_QR per space → partial unique on `status = 'Active'`;
  * reading cannot drop below the previous reading → trigger;
  * gender must match Hostel_Gender, bed Under_Maintenance cannot be offered, Room_Offer only when
    registration fee demand is Paid → triggers on insert.
* **Schemas**: `erp_ref` (read-only mirrors of Student_Master, Staff_Master, department),
  `infra` (Campus / Facility / Zone / Space / SubSpace / Asset_Master, used as-is),
  `hostel` (all NEW / EXTENDED tables), `audit`.
* **Partitioning**: Movement_Event and Meter_Reading partitioned by month; retention job drops partitions.
* **Migrations**: Drizzle SQL migrations, reviewed; seed data for Room_Type, Academic_Year, Approval_Rule.

## 3. Build phases

| Phase | Scope | Output |
|---|---|---|
| 1 | Masters (MS1–MS8), Infrastructure stubs, shared tables (SH1–SH4, Policy_Setting), audit, RBAC skeleton, Keycloak realm, monorepo scaffold, Docker Compose | Running empty app with login and role routing |
| 2 | Workflow **B** Mapping people to rooms (Staff_Space_Assignment, Space_QR) — needed by every approval | Warden/floor assignment screens, QR label PDF |
| 3 | Workflow **A** Registration → allotment → fees → check-in (A1–A8) + Razorpay | Student portal, allotment desk, accounts desk |
| 4 | Workflow **C** Electricity meter (C1–C6) + recharge job | Meter admin, student recharge, monthly usage report |
| 5 | Workflow **E** Outing (E1 + approval engine) and **D** Student tracking (D1–D6) + gate scanner PWA | QR outpass, gate in/out, alerts, consent |
| 6 | Workflow **F** Sick leave (F1–F2) | Sick list, meal delivery |
| 7 | Workflows **G–N** — blocked until the missing pages are supplied | — |
| 8 | Hardening: pen-test fixes, load test, backups/DR, UAT with hostel administration, go-live | — |

Each phase ends with migrations, API tests, and a short UAT script for the hostel office.

## 4. Open questions for the hostel administration

1. Supply pages for Workflows G–N and Section 17 (shared tables) of the v2.1 document, plus the
   Infrastructure data model (Facility / Zone / Space / SubSpace / Asset_Master column lists).
2. Identity source: does the university ERP expose LDAP/AD or an OIDC provider for SSO?
3. Payment gateway already contracted by the university (Razorpay / PayU / SBI Collect)?
4. Smart-meter vendor API for `Device_Ref` recharge push; camera vendor for `Match_Confidence` feed.
5. Hosting: campus data centre vs cloud, and who operates it.
6. Policy_Setting values: offer hold period, gate close time, Movement_Event retention days.
