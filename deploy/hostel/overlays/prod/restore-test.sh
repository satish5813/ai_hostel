#!/bin/sh
# Monthly restore test.  decrypt: newest backup -> /work/db.dump (node)
#                        load: throw-away PostgreSQL in this pod, pg_restore, count tables and migrations (postgres)
#                        report: append the result to /results/restore-tests.log (node, NFS owner)
set -eu
case "$1" in
  decrypt)
    f=$(ls -1t /backups/hostel-prod_*.dump.enc 2>/dev/null | head -1)
    [ -n "$f" ] || { echo "RESTORE TEST FAILED: no backup found"; exit 1; }
    echo "testing $(basename "$f")"; basename "$f" > /work/name
    node /scripts/backup-encrypt.js decrypt "$f" /work/db.dump
    ;;
  load)
    D=/work/pg
    initdb -D $D -U postgres --auth=trust >/dev/null
    pg_ctl -D $D -o "-c listen_addresses='' -k /work" -l /work/pg.log -w start >/dev/null
    createdb -h /work -U postgres klu_hostel
    psql -h /work -U postgres -d klu_hostel -q -c "create role klu_app" >/dev/null 2>&1 || true
    pg_restore -h /work -U postgres -d klu_hostel --no-owner /work/db.dump 2>/work/restore.err || true
    t=$(psql -h /work -U postgres -d klu_hostel -At -c "select count(*) from information_schema.tables where table_schema not in ('pg_catalog','information_schema')")
    m=$(psql -h /work -U postgres -d klu_hostel -At -c "select count(*) || ' (latest ' || max(file) || ')' from public.klu_migration" 2>/dev/null || echo 0)
    e=$(grep -c "pg_restore: error" /work/restore.err || true)
    pg_ctl -D $D -m fast stop >/dev/null
    [ "$t" -gt 200 ] || { echo "RESTORE TEST FAILED: only $t tables"; exit 1; }
    echo "RESTORE TEST OK $(date -u -d "@$(( $(date +%s) + 19800 ))" '+%F %T') IST $(cat /work/name): $t tables, migrations $m, restore errors $e" | tee /work/result
    ;;
  report)
    cat /work/result; cat /work/result >> /results/restore-tests.log
    ;;
  *) echo "usage: restore-test.sh decrypt|load|report"; exit 2 ;;
esac
