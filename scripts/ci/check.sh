#!/usr/bin/env bash
# Every check a change must pass before it can go to the server: types, lint, build, a database built from nothing
# with its rule tests, and the API walked end to end. The same script runs in GitHub Actions and on a developer's Mac.
# Usage: PG_BASE=postgresql://user:pass@localhost:5432 bash scripts/ci/check.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p logs
step() { echo; echo "== $1"; }
# the API imports @klu/db, which exports its compiled dist/: build it first (a fresh checkout has no dist/)
step "DB package: build"; (cd packages/db && npx tsc -p tsconfig.json) && echo "PASS DB package build"
step "API: types";  (cd apps/api && npx tsc -p tsconfig.build.json --noEmit) && echo "PASS API types"
step "API: lint";   (cd apps/api && npx oxlint src >/dev/null) && echo "PASS API lint"
step "Web: types";  (cd apps/web-vite && npx tsc -p tsconfig.app.json --noEmit) && echo "PASS web types"
step "API: build";  (cd apps/api && npx nest build) && echo "PASS API build"
step "Web: build";  (cd apps/web-vite && npx vite build --logLevel error) && echo "PASS web build"
step "Database";    DB=${DB:-klu_ci} bash scripts/ci/fresh-db.sh
step "API walk";    DATABASE_URL="$PG_BASE/${DB:-klu_ci}" bash scripts/ci/api-test.sh | tail -3
echo; echo "ALL CHECKS PASSED"
