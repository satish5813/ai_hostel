# Database — KL University Hostel ERP

PostgreSQL 18 schema for the hostel module and every master it depends on. Verified on PostgreSQL 18.0: all
migrations apply cleanly and the Workflow A–F smoke test passes (30 rule checks).

## Layout

```
db/
  migrations/           ordered SQL files; apply in name order
    000_schemas.sql             extensions, schemas, common helper
    010_ref.sql                 ERP mirrors: department, course, section, batch, subject, sport, staff_* (9), student_* (2)
    020_infra.sql               campus, facility, zone, space, subspace, asset_master, allocation, maintenance
    030_portal_masters.sql      roles & users, product catalogue (material + Tally masters), stores, bins, stock, vendors, GL, budgets
    031_portal_stock_indent.sql stock ledger, transfers, returns, adjustments, counts, indent & issue, new product request
    032_portal_procurement.sql  purchase requisition, RFQ, bids, evaluation, ranking, purchase order, conditions, alerts
    033_portal_logistics_assets.sql shipment, gate entry, GRN, quality inspection, RTV, deployment, commissioning, assets, AMC
    034_portal_accounts.sql     budget txn, vendor invoice, payments, advances, debit/credit notes, journals
    040_shared.sql              policy_setting, document, import_batch, approval_rule, approval_step, report_visibility, notification, audit_log
    050_hostel_masters.sql      academic_year, hostel_profile, room_type, room_type_fee, room_profile, student_contact + G/I/M/N stubs
    051_hostel_a_registration.sql   Workflow A  (A1–A8)
    052_hostel_b_mapping.sql        Workflow B  (B1–B2)
    053_hostel_c_meter.sql          Workflow C  (C1–C6)
    054_hostel_d_tracking.sql       Workflow D  (D1–D6)
    055_hostel_e_outpass.sql        Workflow E  (E1)
    056_hostel_f_sick_leave.sql     Workflow F  (F1–F2)
    060_hostel_rules.sql        triggers and functions: every "rule the database must enforce", derived columns, scheduled-job functions
    080_views.sql               v_bed, v_vacancy, v_registration, v_floors_without_warden, v_space_qr_page, v_meter_position, v_student_location, v_outpass, v_mess_sick_list, v_student_dues
    090_seed.sql                roles (organogram), approval rules, policy settings, indent steps, room types, academic years, report visibility
  tests/smoke_a_to_f.sql  end-to-end rule test; runs in a transaction and rolls back
  apply.ps1               applies migrations (and optionally the test) to a database of your choice
```

## Apply to your PostgreSQL

```powershell
# creates the database if missing, applies every migration in order, then runs the smoke test
.\db\apply.ps1 -ConnectionString "postgresql://postgres:<password>@localhost:5432/postgres" -Database klu_hostel -Test
```

The script never stores the password; pass it on the command line or set `PGPASSWORD` for the session.

## Design decisions (read before changing anything)

1. **Spec names are kept verbatim** in snake_case (`Hostel_Registration` → `hostel.hostel_registration`), so every column traces back to the document.
2. **Keys.** ERP and infrastructure codes are natural keys (`student_id`, `staff_id`, `facility_id`, `space_id`, `subspace_id`, `sku`, `vendor_id`). Hostel transactional tables use `bigint identity`. Printed numbers (`HR-2026-00412`, `RC-`, `OP-`) are filled by trigger from `hostel.doc_counter`.
3. **Enums.** Every status list in the spec is a PostgreSQL enum type in the owning schema (186 types). Values come from the spec and, for the ERP mirrors, from the real student and employee exports.
4. **Derived columns are never typed.** `amount_paid`, `total_damage_amount`, `units_credited`, `outing_category`, `levels_required`, `late_by_minutes`, `qty_available`, `stock_value`, `grand_total` are generated columns, trigger-maintained, or views (`portal.v_po_total`).
5. **Rules the database must enforce** are constraints or triggers, not application code: one registration per student per year, one Pending offer per bed and per registration, gender ↔ hostel gender, no offer until the registration fee is Paid, no fee plan until the offer is Accepted, exactly two demands for Two_Instalments, one Active meter per room, readings never decrease, no movement without consent, approval levels in order, parent step only by the verified approver, QR only after the final level, Chief Warden only for sick-leave approval.
6. **Append-only tables.** `hostel.movement_event`, `hostel.location_access_log`, `hostel.meter_reading`, `shared.audit_log` refuse UPDATE/DELETE. `hostel.fee_receipt` allows only the gateway outcome to change. The audit log is hash-chained (`prev_hash`/`hash`).
7. **Privacy.** Aadhaar, PAN and bank details of students and staff are **not** in this database (spec rule). Photos and medical notes are object-storage keys in `shared.document`. Every look-up of a student's location must insert a `hostel.location_access_log` row (the API does this).
8. **Scheduled jobs** are plain functions the job runner calls: `hostel.fn_mark_overdue_fees()`, `hostel.fn_mark_overdue_outpasses()`, `hostel.fn_raise_not_seen_alerts()`, `hostel.fn_flag_missed_sick_meals()`, `hostel.fn_rollup_meter_month(date)`, `hostel.fn_purge_movement_events()`.
9. **Partitioning.** `hostel.movement_event` and `shared.audit_log` are range-partitioned by time; add monthly partitions from the job runner (a DEFAULT partition catches everything until then).
10. **One role table.** `portal.role` holds the portal roles and the hostel organogram roles; `hostel.staff_space_assignment` scopes a role to a hostel, floor or area, and that is how approvers are found (B rule).
11. **Portal merge.** `portal.material` = portal product + Item Master + Tally material (31 attributes); `portal.location` = store + Store Master + godown tree; `portal.vendor` is the single vendor table used by maintenance and purchase. The portal's 53 tables keep their names; the Inventory/Procurement/Accounts tables the hostel index marks NEW were added beside them.

## Stubs that need the missing spec pages

`hostel.mess_master` (G1), `hostel.mess_subscription` (G2), `hostel.discipline_case` / `hostel.discipline_punishment` (M1/M2),
`hostel.vacate_request` (N1), `hostel.no_dues_clearance` (N2), and the H1 extension columns on `infra.maintenance_ticket`
are defined from the index descriptions only. Workflows G–N (G3–G9, H2–H7, J, K, L, M3–M4) are not created yet.
