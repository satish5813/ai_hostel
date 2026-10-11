#!/bin/zsh
# Puts the live demo back to its starting point: the database as saved in backups/demo-ready.dump (Meghana has not
# applied, Priya has paid and waits for the office, Arjun lives in BH1-101-A), the API restarted, the demo assistant
# stopped, and the app on the Android emulator signed out. Run it after a rehearsal, and once before the demo.
#   scripts/reset-demo.sh
set -e
ROOT=${0:A:h:h}; PG=/opt/homebrew/opt/postgresql@18/bin; SNAP=$ROOT/backups/demo-ready.dump
[[ -f $SNAP ]] || { echo "No $SNAP"; exit 1; }
pkill -f demo-staff-bot 2>/dev/null || true
echo "Stopping the API"; lsof -ti tcp:4100 -sTCP:LISTEN | xargs kill 2>/dev/null || true; sleep 2
echo "Restoring the database"; $PG/dropdb --force klu_hostel && $PG/createdb klu_hostel && $PG/pg_restore -d klu_hostel $SNAP
echo "Starting the API"; cd $ROOT/apps/api && (API_PORT=4100 TESSDATA_DIR=$ROOT/apps/api/tessdata nohup node --enable-source-maps dist/main.js > $ROOT/logs/api-4100.log 2>&1 &)
for i in {1..40}; do curl -s -o /dev/null localhost:4100/api/auth/demo-accounts && break; sleep 1; done
ADB=$HOME/Library/Android/sdk/platform-tools/adb
if $ADB devices 2>/dev/null | grep -q "emulator-.*device"; then $ADB shell pm clear in.kluniversity.klu_hostels >/dev/null && echo "Android app signed out"; fi
echo "Demo is reset. On the iPhone, sign out from the menu if a student is still signed in."
