#!/bin/sh
# hostel-backup steps.  dump: pg_dump -Fc of klu_hostel -> /work/db.dump (postgres image, superuser)
#                       encrypt: KLB1 encrypt to /backups, verify, prune old files (node image)
set -eu
case "$1" in
  dump)
    # a new pod's network-policy rules take a few seconds to apply: wait until PostgreSQL answers (max 2 min)
    i=0; until pg_isready -h postgres -U postgres -q; do
      i=$((i+1)); [ $i -ge 40 ] && { echo "BACKUP FAILED: PostgreSQL not reachable"; exit 1; }; sleep 3
    done
    pg_dump -h postgres -U postgres -d klu_hostel -Fc -f /work/db.dump
    pg_restore -l /work/db.dump >/dev/null || { echo "BACKUP FAILED: dump unreadable"; exit 1; }
    echo "dump OK: $(wc -c < /work/db.dump) bytes, $(pg_restore -l /work/db.dump | grep -c ' TABLE DATA ') tables with data"
    ;;
  encrypt)
    ts=$(date -u -d "@$(( $(date +%s) + 19800 ))" +%Y%m%d_%H%M)   # IST (the image has no time-zone data)
    out="/backups/hostel-prod_${ts}.dump.enc"
    node /scripts/backup-encrypt.js encrypt /work/db.dump "$out.part"
    node /scripts/backup-encrypt.js verify "$out.part"
    mv "$out.part" "$out"
    find /backups -name 'hostel-prod_*.dump.enc' -mtime +"${KEEP_DAYS:-14}" -delete
    echo "BACKUP OK $(basename "$out") $(du -h "$out" | cut -f1); kept: $(ls /backups | grep -c '^hostel-prod_')"
    ;;
  *) echo "usage: backup.sh dump|encrypt"; exit 2 ;;
esac
