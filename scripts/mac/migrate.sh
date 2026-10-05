#!/usr/bin/env bash
# Applies migrations that are newer than the database: each file in db/migrations runs once, in order, and is
# recorded in public.klu_migration. On a database restored from the backup, the files already in it are marked first.
set -euo pipefail
cd "$(dirname "$0")/../.."
# PostgreSQL client tools: Homebrew, Postgres.app or the EDB installer
for d in /opt/homebrew/opt/postgresql@18/bin /opt/homebrew/opt/postgresql@17/bin /opt/homebrew/opt/postgresql@16/bin /usr/local/opt/postgresql@18/bin          /Applications/Postgres.app/Contents/Versions/latest/bin /Library/PostgreSQL/18/bin /Library/PostgreSQL/17/bin /Library/PostgreSQL/16/bin; do
  if [[ -x "$d/psql" ]] && ! command -v psql >/dev/null; then export PATH="$d:$PATH"; fi
done
DATABASE_URL=$(grep -E '^DATABASE_URL=' apps/api/.env | cut -d= -f2-)
DB_URL=$DATABASE_URL
psql "$DB_URL" -q -c "create table if not exists public.klu_migration (file text primary key, applied_at timestamptz not null default now())"
if [[ $(psql "$DB_URL" -Atc "select count(*) from public.klu_migration") == 0 ]]; then
  # a restored backup already has every migration up to the one it was made with
  LAST=${KLU_BACKUP_LAST_MIGRATION:-105_mess_choice_from_cuisine.sql}
  for f in db/migrations/*.sql; do b=$(basename "$f"); [[ "$b" > "$LAST" ]] && break; psql "$DB_URL" -q -c "insert into public.klu_migration (file) values ('$b')"; done
fi
n=0
for f in db/migrations/*.sql; do
  b=$(basename "$f")
  [[ $(psql "$DB_URL" -Atc "select count(*) from public.klu_migration where file = '$b'") == 1 ]] && continue
  echo "applying $b"
  psql "$DB_URL" -q -v ON_ERROR_STOP=1 -f "$f"
  psql "$DB_URL" -q -c "insert into public.klu_migration (file) values ('$b')"
  n=$((n + 1))
done
echo "$n migration(s) applied."
