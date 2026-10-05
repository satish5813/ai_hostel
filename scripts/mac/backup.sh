#!/usr/bin/env bash
# Backs up the database to backups/klu_hostel-<date>.dump (restore with: pg_restore --no-owner -d klu_hostel <file>).
set -euo pipefail
cd "$(dirname "$0")/../.."
# PostgreSQL client tools: Homebrew, Postgres.app or the EDB installer
for d in /opt/homebrew/opt/postgresql@18/bin /opt/homebrew/opt/postgresql@17/bin /opt/homebrew/opt/postgresql@16/bin /usr/local/opt/postgresql@18/bin          /Applications/Postgres.app/Contents/Versions/latest/bin /Library/PostgreSQL/18/bin /Library/PostgreSQL/17/bin /Library/PostgreSQL/16/bin; do
  if [[ -x "$d/psql" ]] && ! command -v psql >/dev/null; then export PATH="$d:$PATH"; fi
done
DATABASE_URL=$(grep -E '^DATABASE_URL=' apps/api/.env | cut -d= -f2-)
mkdir -p backups
OUT="backups/klu_hostel-$(date +%Y%m%d-%H%M).dump"
pg_dump "$DATABASE_URL" -Fc --no-owner --no-privileges -f "$OUT"
echo "Saved $OUT ($(du -h "$OUT" | cut -f1))"
