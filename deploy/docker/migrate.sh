#!/bin/sh
# Each file in /migrations runs once, in name order, and is recorded in public.klu_migration (as scripts/mac/migrate.sh).
# A database restored from a backup without that table: set KLU_BACKUP_LAST_MIGRATION to the newest migration the
# backup already contains; files up to it are recorded as applied without running them.
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
# a new pod's network-policy rules take a few seconds: wait for PostgreSQL (max 2 min)
i=0; until pg_isready -d "$DATABASE_URL" -q; do i=$((i+1)); [ $i -ge 40 ] && { echo "PostgreSQL not reachable"; exit 1; }; sleep 3; done

q() { psql "$DATABASE_URL" -X -q -At -v ON_ERROR_STOP=1 "$@"; }
q -c "create table if not exists public.klu_migration (file text primary key, applied_at timestamptz not null default now())"
if [ "$(q -c 'select count(*) from public.klu_migration')" = 0 ] && [ -n "${KLU_BACKUP_LAST_MIGRATION:-}" ]; then
  for f in /migrations/*.sql; do
    b=$(basename "$f"); [ "$b" \> "$KLU_BACKUP_LAST_MIGRATION" ] && break
    q -c "insert into public.klu_migration (file) values ('$b')"
  done
  echo "marked migrations up to $KLU_BACKUP_LAST_MIGRATION as already in the restored backup"
fi
n=0
for f in /migrations/*.sql; do
  b=$(basename "$f")
  [ "$(q -c "select count(*) from public.klu_migration where file = '$b'")" = 1 ] && continue
  echo "applying $b"
  q -f "$f" >/dev/null
  q -c "insert into public.klu_migration (file) values ('$b')"
  n=$((n + 1))
done
echo "$n migration(s) applied; latest: $(q -c 'select max(file) from public.klu_migration')"
