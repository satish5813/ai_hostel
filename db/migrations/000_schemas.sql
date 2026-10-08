-- =====================================================================
-- KL University Hostel ERP — database foundation
-- Target: PostgreSQL 18. Database name: klu_hostel
-- Schemas:
--   ref     ERP mirrors (students, staff, departments) — read-only in the hostel module, refreshed by import
--   infra   Infrastructure & Maintenance data model (campus → facility → zone → space → sub-space, assets, maintenance)
--   portal  Stock & Purchase Portal + Inventory / Procurement / Accounts data model (materials, stores, indents, PO, GRN, accounts)
--   shared  Cross-module tables: approvals, notifications, report visibility, policy settings, documents, audit, imports
--   hostel  Hostel module (Masters MS2–MS8, Workflows A–F, stubs for G–N tables that A–F depend on)
-- Conventions:
--   snake_case names, spec names kept verbatim (Hostel_Registration -> hostel_registration)
--   bigint identity surrogate keys where the spec says "Auto"; ERP / infra codes kept as natural keys
--   timestamptz for every DateTime, date for Date, numeric(14,2) for money, numeric(14,3) for quantities
--   every hostel table carries created_at / created_by / updated_at / updated_by
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- gen_random_uuid(), digest() for QR tokens and audit hash chain
CREATE EXTENSION IF NOT EXISTS btree_gist;    -- exclusion constraints on date ranges (no overlapping assignments)

CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS infra;
CREATE SCHEMA IF NOT EXISTS portal;
CREATE SCHEMA IF NOT EXISTS shared;
CREATE SCHEMA IF NOT EXISTS hostel;

COMMENT ON SCHEMA ref    IS 'Read-only mirrors of the university ERP: students, staff, departments, courses';
COMMENT ON SCHEMA infra  IS 'Infrastructure, allocation and maintenance model (campus, facility, zone, space, sub-space, asset)';
COMMENT ON SCHEMA portal IS 'Stock and Purchase Portal merged with the Inventory, Procurement and Accounts model';
COMMENT ON SCHEMA shared IS 'Approvals, notifications, visibility rules, policy settings, documents, audit log, import batches';
COMMENT ON SCHEMA hostel IS 'Hostel module: masters and workflows A–N (A–F fully defined, G–N stubs where A–F depend on them)';

-- Common helper: touch updated_at on every UPDATE
CREATE OR REPLACE FUNCTION shared.fn_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Common enum used by many masters
CREATE TYPE shared.active_status AS ENUM ('Active','Inactive');
