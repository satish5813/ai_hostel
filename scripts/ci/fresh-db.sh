#!/usr/bin/env bash
# Builds a throwaway database from nothing: every migration in order, the database rule tests (db/tests, rolled back),
# then the development fixtures and demo logins the API test needs. Fails on the first error.
# Usage: PG_BASE=postgresql://user:pass@host:5432 DB=klu_ci bash scripts/ci/fresh-db.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${PG_BASE:?set PG_BASE to the server, e.g. postgresql://postgres:secret@localhost:5432}"
DB=${DB:-klu_ci}
psql "$PG_BASE/postgres" -q -v ON_ERROR_STOP=1 -c "drop database if exists $DB" -c "create database $DB"
URL="$PG_BASE/$DB"
psql "$URL" -q -c "create table public.klu_migration (file text primary key, applied_at timestamptz not null default now())"
for f in db/migrations/*.sql; do
  psql "$URL" -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>/tmp/klu_mig_err || { echo "FAIL migration $(basename "$f")"; grep -i error /tmp/klu_mig_err | head -5; exit 1; }
  psql "$URL" -q -c "insert into public.klu_migration (file) values ('$(basename "$f")')"
done
echo "PASS $(ls db/migrations/*.sql | wc -l | tr -d ' ') migrations build a fresh database"
out=$(psql "$URL" -v ON_ERROR_STOP=1 -q -f db/tests/smoke_a_to_f.sql 2>&1) || { echo "$out" | grep -E "ERROR|FAIL" | head -5; echo "FAIL database rule tests"; exit 1; }
echo "PASS $(echo "$out" | grep -c 'PASS') database rule tests"
psql "$URL" -q -v ON_ERROR_STOP=1 -f db/seed/dev_fixtures.sql >/dev/null
psql "$URL" -q -v ON_ERROR_STOP=1 -f db/seed/demo_logins.sql >/dev/null
echo "PASS fixtures loaded into $DB"
