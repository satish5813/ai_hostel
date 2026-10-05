#!/usr/bin/env bash
# Starts the built API against the CI database on a spare port and walks Workflows A-F over HTTP (scripts/api-smoke.sh).
# Every check in the walk must pass: a check that does not print PASS fails the run.
# Usage: DATABASE_URL=postgresql://.../klu_ci bash scripts/ci/api-test.sh   (after the API is built)
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${DATABASE_URL:?set DATABASE_URL to the CI database}"
PORT=${CI_API_PORT:-4199}
API_PORT=$PORT node apps/api/dist/main.js > logs/api-ci.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do curl -s -o /dev/null "http://localhost:$PORT/api/healthz" && break; sleep 1; done
out=$(API="http://localhost:$PORT" bash scripts/api-smoke.sh 2>&1) || true
echo "$out"
want=$(grep -c 'pass "' scripts/api-smoke.sh); got=$(echo "$out" | grep -c '^PASS' || true)
[ "$got" -eq "$want" ] || { echo "FAIL API walk: $got of $want checks passed (log: logs/api-ci.log)"; exit 1; }
echo "PASS API walk: all $got checks"
