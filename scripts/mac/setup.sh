#!/usr/bin/env bash
# KL Hostel ERP: first-time set-up on a Mac.
#   bash scripts/mac/setup.sh            restore the database from the backup in db/ (demo data included)
#   bash scripts/mac/setup.sh --fresh    build an empty database from db/migrations instead
# Needs: Node 22 (or 20+), PostgreSQL running locally (any recent version; 18 recommended). pnpm comes with Node (corepack).
set -euo pipefail
cd "$(dirname "$0")/../.."
ROOT=$(pwd)
FRESH=0; [[ "${1:-}" == "--fresh" ]] && FRESH=1

say()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mxx  %s\033[0m\n' "$*"; exit 1; }

# ---------------------------------------------------------------- tools
say "Checking the tools"
command -v node >/dev/null || die "Node.js is missing. Install it:  brew install node@22   (then open a new terminal)"
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
(( NODE_MAJOR >= 20 )) || die "Node $(node -v) is too old; install Node 22:  brew install node@22"
echo "node $(node -v)"
if ! command -v pnpm >/dev/null; then
  corepack enable 2>/dev/null || sudo corepack enable
fi
command -v pnpm >/dev/null || die "pnpm is missing:  npm install -g pnpm@10"
echo "pnpm $(pnpm -v)"
# PostgreSQL client tools: Homebrew, Postgres.app or the EDB installer
for d in /opt/homebrew/opt/postgresql@18/bin /opt/homebrew/opt/postgresql@17/bin /opt/homebrew/opt/postgresql@16/bin /usr/local/opt/postgresql@18/bin \
         /Applications/Postgres.app/Contents/Versions/latest/bin /Library/PostgreSQL/18/bin /Library/PostgreSQL/17/bin /Library/PostgreSQL/16/bin; do
  if [[ -x "$d/psql" ]] && ! command -v psql >/dev/null; then export PATH="$d:$PATH"; fi
done
command -v psql >/dev/null || die "psql is not on the PATH. With Homebrew:  brew install postgresql@18 && brew services start postgresql@18"
PG_CLIENT=$(psql --version | awk '{print $3}' | cut -d. -f1)
echo "psql $(psql --version | awk '{print $3}')"

# ---------------------------------------------------------------- connection
say "Database connection"
DEF_USER=${PGUSER:-$(whoami)}
read -r -p "PostgreSQL host [localhost]: " PGHOST_IN; export PGHOST=${PGHOST_IN:-localhost}
read -r -p "PostgreSQL port [5432]: " PGPORT_IN; export PGPORT=${PGPORT_IN:-5432}
read -r -p "PostgreSQL user [$DEF_USER] (Homebrew uses your Mac user name; the EDB installer uses postgres): " PGUSER_IN; export PGUSER=${PGUSER_IN:-$DEF_USER}
read -r -s -p "Password for $PGUSER (press Enter if none): " PGPASSWORD_IN; echo
export PGPASSWORD=${PGPASSWORD_IN:-}
psql -d postgres -Atc 'select 1' >/dev/null 2>&1 || die "Cannot connect to PostgreSQL as $PGUSER on $PGHOST:$PGPORT. Is it running?  brew services start postgresql@18"
PG_SERVER=$(psql -d postgres -Atc 'show server_version_num' | cut -c1-2)
echo "connected; server version $PG_SERVER"
for ext in pgcrypto btree_gist; do
  [[ $(psql -d postgres -Atc "select count(*) from pg_available_extensions where name = '$ext'") == 1 ]] || die "The PostgreSQL extension $ext is not available on this server."
done

# ---------------------------------------------------------------- database
DB=${KLU_DB:-klu_hostel}
ENV_FILE=${KLU_ENV_FILE:-apps/api/.env}
if [[ $(psql -d postgres -Atc "select count(*) from pg_database where datname = '$DB'") == 1 ]]; then
  read -r -p "Database $DB already exists. Replace it (all its data is lost)? [y/N]: " yn
  [[ "$yn" =~ ^[Yy]$ ]] || die "Stopped; nothing was changed. Use another name or drop $DB yourself."
  psql -d postgres -qc "select pg_terminate_backend(pid) from pg_stat_activity where datname = '$DB' and pid <> pg_backend_pid()" >/dev/null
  psql -d postgres -qc "drop database $DB"
fi
psql -d postgres -qc "create database $DB"

if (( FRESH )); then
  say "Building an empty database from db/migrations"
  for f in db/migrations/*.sql; do printf '  %s\n' "$(basename "$f")"; psql -d $DB -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null; done
  psql -d $DB -q -v ON_ERROR_STOP=1 -f db/seed/dev_fixtures.sql >/dev/null 2>&1 || warn "dev_fixtures.sql did not load completely (optional)"
  psql -d $DB -q -f db/seed/demo_logins.sql >/dev/null 2>&1 || true
elif (( PG_CLIENT >= 18 && PG_SERVER >= 18 )); then
  say "Restoring the backup db/klu_hostel.dump"
  pg_restore --no-owner --no-privileges -d $DB db/klu_hostel.dump || warn "pg_restore reported some warnings; checking the result"
else
  say "Restoring the plain backup db/klu_hostel.sql.gz (PostgreSQL $PG_SERVER)"
  warn "The backup was made with PostgreSQL 18; on an older server a few settings lines may print errors. That is expected."
  gunzip -c db/klu_hostel.sql.gz | psql -d $DB -q >/tmp/klu_restore.log 2>&1 || true
  grep -i 'error' /tmp/klu_restore.log | grep -v 'transaction_timeout' | head -5 || true
fi
TABLES=$(psql -d $DB -Atc "select count(*) from information_schema.tables where table_schema in ('ref','infra','portal','shared','hostel','acad')")
RES=$(psql -d $DB -Atc "select count(*) from hostel.hostel_allocation where status = 'Active'" 2>/dev/null || echo 0)
echo "tables: $TABLES   active stays: $RES"
(( TABLES > 200 )) || die "The database looks incomplete ($TABLES tables). See /tmp/klu_restore.log"

# ---------------------------------------------------------------- API settings (apps/api/.env, never committed)
say "Writing apps/api/.env"
ENC_PW=$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1] ?? ""))' "$PGPASSWORD")
AUTH="$PGUSER"; [[ -n "$PGPASSWORD" ]] && AUTH="$PGUSER:$ENC_PW"
if [[ -f "$ENV_FILE" ]]; then cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%s)"; fi
cat > "$ENV_FILE" <<EOF
DATABASE_URL=postgres://$AUTH@$PGHOST:$PGPORT/$DB
API_PORT=4000
DEMO_LOGIN=1
DEMO_PASSWORD_HINT=Demo@2026
EOF
chmod 600 "$ENV_FILE"

# ---------------------------------------------------------------- packages (dev and debug tools included)
if [[ -z "${KLU_SKIP_INSTALL:-}" ]]; then
  say "Installing packages (this takes a few minutes the first time)"
  pnpm install
  say "Building"
  pnpm --filter @klu/db build
  pnpm --filter @klu/api build
fi
chmod +x scripts/mac/*.sh

say "Ready"
cat <<'EOF'
Start the application:        bash scripts/mac/start.sh
Start with the API debugger:  bash scripts/mac/start.sh --debug      (attach VS Code: "Attach to API", or chrome://inspect)
Open:                         http://localhost:5173   (demo accounts are listed on the sign-in page)
API documentation:            http://localhost:4000/docs
New migrations later:         bash scripts/mac/migrate.sh
Backup:                       bash scripts/mac/backup.sh
EOF
