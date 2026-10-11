# Implementation Audit — KL University Hostel ERP

**Audit date:** 7 Oct 2026 · **Branch:** `main` @ `46840a5` (+ uncommitted outing changes, migration 122)
**Baseline:** *Roles, Screens and Access Rights* (87 screens), *Plan and Stack* (`docs/00-plan-and-stack.md`), go-live checklist (`docs/go-live-checklist.html`)
**Method:** screen registry `apps/web-vite/src/app/screens.ts` checked against routes in `apps/web-vite/src/App.tsx`, API controllers in `apps/api/src`, and tables in `db/migrations`. A screen counts as **Done** only when it has a route, a page and an API behind it.

Legend: ✅ Done · 🟡 Partial · ❌ Not done

---

## 1. Summary

| Area | Total | ✅ Done | 🟡 Partial | ❌ Not done |
|---|---:|---:|---:|---:|
| Spec screens (87 in the document) | 87 | 48 | 0 | **39** |
| Extra screens (not in the document) | 36 | 36 | 0 | 0 |
| Platform and security controls | 20 | 9 | 5 | **6** |
| Go-live operations (not code; owned by IT, Accounts, Office…) | 31 | see the live checklist | | |

**Not yet done in code: 45 items** (39 screens + 6 platform controls), plus 5 partial controls.

---

## 2. Spec screens by workflow

| Workflow | Screens | ✅ | ❌ | Status |
|---|---:|---:|---:|---|
| General (GEN) | 3 | 3 | 0 | Complete |
| A Registration (REG) | 8 | 8 | 0 | Complete |
| B Mapping (MAP) | 5 | 5 | 0 | Complete |
| C Electricity (ELE) | 3 | 3 | 0 | Complete |
| D Tracking (TRK) | 6 | 6 | 0 | Complete |
| E Outing (OUT) | 3 | 3 | 0 | Complete (open changes in the working tree) |
| F Sick leave (SCK) | 3 | 3 | 0 | Complete |
| G Mess (MES) | 6 | 6 | 0 | Complete |
| H Tickets (TKT) | 6 | 6 | 0 | Complete |
| I Indent and purchase (IND) | 12 | 0 | **12** | DB tables exist (`portal.indent`, `purchase_order`, `vendor_*`, `grn`, `ledger`…). No API and no UI |
| J Facilities (FAC) | 3 | 0 | **3** | DB tables exist (`hostel_facility`, `facility_usage`, `facility_day_register`). No API and no UI |
| K Convention centre (CON) | 5 | 0 | **5** | DB tables exist (`convention_booking`, `booking_guest`, `event_report`…). No API and no UI |
| L Academics (ACA) | 2 | 1 | **1** | ACA-01 done; ACA-02 Import monitor missing |
| M Discipline (DIS) | 6 | 0 | **6** | Partly covered by the extra DIS-07 register (`/discipline`, Dean API). The 4-step chain, the student view and the exam alarm are missing |
| N Vacating (VAC) | 4 | 0 | **4** | DB tables exist (`vacate_request`, `no_dues_clearance`). No API and no UI |
| Reports (RPT) | 8 | 1 | **7** | RPT-07 done |
| Admin (ADM) | 3 | 3 | 0 | Complete |
| Not in the registry | 1 | 0 | **1** | The document lists 87 screens but `screens.ts` has 86. Find the missing one and add it |
| **Total** | **87** | **48** | **39** | **55 % done** |

### 2.1 Checklist: screens not yet built (39)

**I — Indent, procurement, assets, accounts (12)**
- [ ] IND-01 Raise indent
- [ ] IND-02 Indent approval
- [ ] IND-03 Stock check and issue
- [ ] IND-04 Quotations and vendor ranking
- [ ] IND-05 Purchase order
- [ ] IND-06 Purchase order approval
- [ ] IND-07 Gate entry, receipt and inspection
- [ ] IND-08 Installation and handover
- [ ] IND-09 Asset register
- [ ] IND-10 Invoice and payment (three-way match)
- [ ] IND-11 Budget and ledger
- [ ] IND-12 Purchase order tracker

**J — Facilities (3)**
- [ ] FAC-01 Facility entry
- [ ] FAC-02 Facility day register
- [ ] FAC-03 Facility setup

**K — Convention centre (5)**
- [ ] CON-01 Book convention centre
- [ ] CON-02 Booking approval
- [ ] CON-03 Guest check-in
- [ ] CON-04 Event report
- [ ] CON-05 Event food order

**L — Academics (1)**
- [ ] ACA-02 Import monitor (files received from the academic system)

**M — Discipline (6)** *(reuse `hostel.discipline_case` / `discipline_punishment` and the DIS-07 API)*
- [ ] DIS-01 Record indiscipline
- [ ] DIS-02 Verify and recommend
- [ ] DIS-03 Award punishment
- [ ] DIS-04 Ratify punishment
- [ ] DIS-05 My discipline record (student)
- [ ] DIS-06 Exam alarm (`hostel.exam_alert` exists)

**N — Vacating (4)** *(blocks the end of the student life cycle: caution refund and the final electricity bill)*
- [ ] VAC-01 Apply to vacate
- [ ] VAC-02 Vacating approvals (L1–L4; the chain is already seeded in 091)
- [ ] VAC-03 Check-out inspection (furniture, damages, final meter, key)
- [ ] VAC-04 No-dues clearance and refund

**Reports (7)**
- [ ] RPT-01 Mess grievance summary (`hostel.mess_grievance_summary` exists)
- [ ] RPT-02 Tickets: work not done (auto-closed after 24 h)
- [ ] RPT-03 Facility utilisation *(needs J)*
- [ ] RPT-04 Convention centre utilisation *(needs K)*
- [ ] RPT-05 Academic cumulative report
- [ ] RPT-06 Discipline summary *(needs M)*
- [ ] RPT-08 Purchase and payment status *(needs I)*

**Registry gap (1)**
- [ ] Find the 87th screen from the source document and add it to `screens.ts`

---

## 3. Platform and security controls (from the Plan and Stack baseline)

| # | Control | Status | Evidence / gap |
|---|---|---|---|
| 1 | OIDC sign-in (Keycloak) | 🟡 | `auth.guard.ts` validates against `OIDC_ISSUER`; production refuses to start without it. The realm and client are not provisioned yet (go-live `it-sso`) |
| 2 | MFA for CW / Dean / Accounts / Security | ❌ | Nothing in code. Must be set in the Keycloak realm |
| 3 | Role guards (RBAC) and scope | ✅ | `RolesGuard`; Floor Warden scope from `Staff_Space_Assignment`; admin no longer bypasses role checks |
| 4 | Row-level security for the reporting user | ❌ | No `ENABLE ROW LEVEL SECURITY` in any migration |
| 5 | Aadhaar / PAN / bank never stored | ✅ | Upload drops those columns in the browser (`import.service.ts`) |
| 6 | Private file storage (MinIO, signed URLs) | ❌ | No storage client. Photos are data URLs in `hostel.student_photo` (stop-gap, see 112). Medical documents and handover photos have nowhere to go |
| 7 | Tracking consent and append-only movement log | ✅ | Consent checks in 054/060 |
| 8 | Hash-chained audit log | ✅ | `shared.audit_log` (040) |
| 9 | Movement and audit tables partitioned, retention purge | ✅ | `PARTITION BY RANGE` in 040/054; `fn_purge_movement_events` cron |
| 10 | Background jobs (alerts, overdue, roll-ups, bills) | ✅ | `jobs.service.ts`, 18 cron jobs (`@nestjs/schedule` instead of BullMQ; enough at this size) |
| 11 | Online payment (Razorpay) | 🟡 | Order, webhook with signature check and receipt are done. Live keys are pending; dev mode falls back to `dev-confirm` |
| 12 | SMS / WhatsApp / e-mail delivery | 🟡 | The outbox is done. The provider is not wired (`SMS_PROVIDER_URL` unset), so parents' outing links are not sent |
| 13 | Contact OTP verification | 🟡 | The flow exists; in development **`000000` is accepted**. Make sure this is off in production |
| 14 | Rate limiting on login / OTP / webhook | ❌ | No throttler |
| 15 | Security headers (HSTS, CSP) | 🟡 | None in the app (no helmet). Expected from IIS: confirm on the server |
| 16 | CORS | ❌ | `main.ts` uses `cors: { origin: true, credentials: true }`, which reflects **any** origin with credentials. Restrict it to the hostel site |
| 17 | Error tracking and metrics (Sentry / OpenTelemetry) | ❌ | Not present |
| 18 | Automated tests | 🟡 | `db/tests/smoke_a_to_f.sql` and `scripts/api-smoke.sh` cover A–F only. No API unit tests. G, H and later modules are not covered |
| 19 | Backups and restore | ✅ code / ❌ proven | The deploy pipeline takes backups; a test restore is still open (go-live `it-backup`) |
| 20 | Smart-meter recharge push and camera feed | ✅ by design | Out of scope until the vendor APIs are given (Plan §4 Q4). Meters run on manual readings |

**Not done (6):** 2 MFA, 4 RLS, 6 file storage, 14 rate limiting, 16 CORS, 17 observability.
**Partial (5):** 1 SSO, 11 Razorpay, 12 SMS, 13 OTP bypass, 15 headers (and 18 tests, 19 restore drill to watch).

---

## 4. Mobile app (Flutter, student only)

17 screens built (`apps/mobile/lib/screens`). Compared with the student web portal, these are missing:
- [ ] Hostel registration, room offer, fee plan (REG-01/03/04): a new student has to use the web
- [ ] Career goal sheet
- [ ] Staff apps (Floor Warden, Security gate scan, mess counter scan): web or PWA only today

---

## 5. Go-live operations (31 items; not code)

Tracked live in `docs/go-live-checklist.html`: 7 server/services, 10 master uploads, 4 opening balances, 6 settings, 4 pilot. 26 of the 31 are marked "Needed for the test". The items that block code paths above are `it-sso` (#1), `it-sms` (#12), `it-pay` (#11) and `it-backup` (#19).

---

## 6. Recommended order

1. **Before the pilot (security):** CORS (#16), OTP bypass off in production (#13), rate limiting (#14), confirm the IIS headers (#15), MFA in Keycloak (#2).
2. **N Vacating (4 screens):** the student life cycle is not closed without it (refunds, final bill, no-dues).
3. **M Discipline (6):** extend the existing DIS-07 instead of starting fresh.
4. **Reports that need no new module:** RPT-01, RPT-02, RPT-05.
5. **J Facilities (3), then K Convention centre (5):** tables already exist.
6. **I Indent and purchase (12) + RPT-08:** the largest module. Tables exist in `portal.*`; confirm whether the university's existing ERP already covers it before building.
7. File storage (#6), RLS (#4), observability (#17), tests for G onward (#18).

---

## 7. Status on 11 Oct 2026 (after the live test)

**Tested live, one student, with the demo assistant playing the staff:** 33 of 33 operations pass on the real API and database (registration to check-in, outing with QR pass, sick leave, repair, mess menu and complaint, meal choice and rating, electricity recharge, fees and receipts, caution deposit, room change, renewal, academic record, notifications, contacts).

**Added:** Pay all with a receipt from the university payment portal (photo upload → Floor Warden checks → Chief Warden approves → receipts written, registration verified and approved → office checks in), and the student wallet (migration 123, API `wallet`, app `pay_all_sheet.dart`, portal approvals drawer). Tested end to end on a copy of the live database.

**Not production-ready yet (unchanged from section 3):** university sign-in (Keycloak) not provisioned; Razorpay live keys and SMS provider not set; CORS open; no rate limiting; OTP dev code `000000` accepted in development; the demo assistant must stay off in production (it only runs where demo sign-in is on); workflows I, J, K, M, N and most reports not built.

**Added later on 11 Oct:** the system reads every uploaded receipt (OCR for photos, the text layer for PDFs) and matches the amount, date, reference and student against the claim; the same file or reference cannot be uploaded twice; PDFs accepted. Hardening: CORS allow-list, rate limiting on sign-in/OTP/webhook/uploads, security headers, OTP dev code refused in production, global error handler in the app.
