#!/usr/bin/env bash
# End-to-end HTTP walk through Workflows A–F (outing: parent, Floor Warden, Chief Warden; sick leave: Floor Warden visits, Chief Warden approves) against a running API (dev auth) and the dev fixtures.
# Usage: API=http://localhost:4000 DATABASE_URL=postgresql://... bash scripts/api-smoke.sh   (the database is read for the parent's SMS link)
set -euo pipefail
API=${API:-http://localhost:4000}
call() { # call <user> <role> <method> <path> [json]
  local u=$1 r=$2 m=$3 p=$4 b=${5:-}
  if [ -n "$b" ]; then curl -s -X "$m" -H "x-dev-user: $u" -H "x-dev-role: $r" -H 'Content-Type: application/json' -d "$b" "$API/api$p";
  else curl -s -X "$m" -H "x-dev-user: $u" -H "x-dev-role: $r" "$API/api$p"; fi
}
j() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1"; }
pass() { echo "PASS $1"; }
fail() { echo "FAIL $1"; exit 1; }
S=2600040012; CW=S-CW; FW=S-FW; OF=S-OF; AC=S-AC; DN=S-DN; SG=S-SG; MS=S-MS; MT=S-MT

echo "== A: apply"
REG=$(call $S Student POST /registrations '{"facility_id":"H-BH1","room_type_id":2,"rules_accepted":true}')
RID=$(echo "$REG" | j "['registration_id']"); RDEM=$(echo "$REG" | j "['demands'][0]['demand_id']")
[ "$(echo "$REG" | j "['status']")" = "Applied" ] && pass "registration $RID Applied, demand $RDEM raised"
echo "== A: office cannot offer before fee"
call $OF Office_Staff POST /registrations/$RID/offers '{}' | grep -q "not paid" && pass "offer refused until registration fee paid (422)"
echo "== A: pay registration fee (dev gateway)"
call $S Student POST /payments/orders "{\"demand_id\":$RDEM}" | grep -q '"mode":"dev"' && call $S Student POST /payments/dev-confirm "{\"demand_id\":$RDEM,\"amount\":5000}" >/dev/null
[ "$(call $S Student GET /registrations/$RID | j "['status']")" = "Fee_Paid" ] && pass "registration Fee_Paid after online receipt"
echo "== A: auto-allot"
OFFER=$(call $OF Office_Staff POST /registrations/$RID/offers '{}'); OID=$(echo "$OFFER" | j "['offer_id']"); BED=$(echo "$OFFER" | j "['subspace_id']")
pass "offer $OID for bed $BED"
echo "== A: accept, fee plan with mess"
call $S Student POST /offers/$OID/decision '{"decision":"Accepted"}' | grep -q Accepted && pass "offer accepted"
PLAN=$(call $S Student POST /registrations/$RID/fee-plan '{"plan_type":"Two_Instalments","cuisine":"South_Indian"}')
[ "$(echo "$PLAN" | j "['demands'].__len__()")" = "6" ] && pass "two hostel demands, mess, caution deposit, electricity deposit, meter charge"
echo "== A: pay everything, check in"
for d in $(echo "$PLAN" | python3 -c "import sys,json; [print(x['demand_id'], x['amount_due']) for x in json.load(sys.stdin)['demands']]" | tr ' ' ':'); do
  call $AC Accounts_Section POST /demands/${d%%:*}/receipts "{\"amount\":${d##*:},\"payment_mode\":\"Cash\"}" >/dev/null; done
[ "$(call $S Student GET /registrations/$RID | j "['status']")" = "Confirmed" ] && pass "registration Confirmed when the plan is fully paid"
call $OF Office_Staff POST /registrations/$RID/fee-check '{"decision":"Verified"}' >/dev/null
call $CW Chief_Warden POST /registrations/$RID/cw-decision '{"decision":"Approved"}' >/dev/null
ALLOC=$(call $OF Office_Staff POST /allocations "{\"offer_id\":$OID,\"key_no\":\"K-TEST\"}"); AID=$(echo "$ALLOC" | j "['hostel_alloc_id']")
call $FW Floor_Warden POST /allocations/$AID/handover '{"handover_type":"Check_In","meter_reading":1500,"occupant_acknowledged":true,"lines":[{"asset_id":"AST-102-COT1","condition":"Good"},{"asset_id":"AST-102-FAN","condition":"Fair"}]}' >/dev/null
[ "$(call $S Student GET /registrations/$RID | j "['status']")" = "Checked_In" ] && pass "checked in (allocation $AID), handover recorded"
echo "== C: meter"
M=$(call $S Student GET /meters/mine); [ "$(echo "$M" | j "['last_reading']")" = "1500.00" ] && pass "student sees own meter, opening reading from handover"
MID=$(echo "$M" | j "['meter_id']")
call $MT Maintenance_Supervisor POST /meters/$MID/readings '{"reading_kwh":1400}' | grep -q "lower" && pass "lower reading refused"
RC=$(call $S Student POST /meters/$MID/recharge '{"amount":170}'); RDID=$(echo "$RC" | j "['demand']['demand_id']")
call $S Student POST /payments/dev-confirm "{\"demand_id\":$RDID,\"amount\":170}" | grep -q '"units_credited":"20.00"' && pass "recharge 170 → 20 units at 8.50"
CONTACT=$(call $OF Office_Staff GET /students/$S | python3 -c "import sys,json; print([c['contact_id'] for c in json.load(sys.stdin)['contacts'] if c['is_outpass_approver']][0])")
echo "== D: consent + gate"
call $S Student POST /consents "{\"given_by\":\"Parent\",\"contact_id\":$CONTACT}" | grep -q consent_id && pass "parent consent recorded (contact $CONTACT)"
GATE=$(call $CW Chief_Warden GET /capture-points | python3 -c "import sys,json; print([p['point_id'] for p in json.load(sys.stdin) if p['point_type']=='Campus_Gate'][0])")
call gate-device system POST /movements "{\"student_id\":\"$S\",\"point_id\":$GATE,\"direction\":\"Out\"}" | grep -q Outside_No_Pass && pass "exit without pass → Outside_No_Pass"
call $FW Floor_Warden GET "/alerts?status=Open&alert_type=No_Pass_Exit" | grep -q "$S" && pass "No_Pass_Exit alert visible to Floor Warden"
call gate-device system POST /movements "{\"student_id\":\"$S\",\"point_id\":$GATE,\"direction\":\"In\"}" >/dev/null
echo "== E: outpass"
FROM=$(date -u -d '+2 days 08:00' +%Y-%m-%dT%H:%M:%S+00:00 2>/dev/null || date -u -v+2d +%Y-%m-%dT08:00:00+00:00); TO=$(date -u -d '+2 days 18:00' +%Y-%m-%dT%H:%M:%S+00:00 2>/dev/null || date -u -v+2d +%Y-%m-%dT18:00:00+00:00)
OP=$(call $S Student POST /outpasses "{\"reason\":\"Home visit\",\"destination\":\"Guntur\",\"leave_from\":\"$FROM\",\"return_by\":\"$TO\",\"contact_during_leave\":\"9440000003\"}"); OPID=$(echo "$OP" | j "['outpass_id']")
pass "outpass $OPID applied ($(echo "$OP" | j "['outing_category']"), $(echo "$OP" | j "['levels_required']") levels)"
# the parent acts through the link sent by SMS; the test reads the link from the database (needs DATABASE_URL)
LINK=$(psql "$DATABASE_URL" -Atc "select k.token from shared.approval_link k join shared.approval_step s on s.step_id = k.step_id where s.request_type = 'Outpass' and s.request_id = $OPID and s.level = 0 and k.used_at is null limit 1")
curl -s -X POST -H 'Content-Type: application/json' -d '{"decision":"Approved"}' "$API/api/links/$LINK" >/dev/null
[ "$(psql "$DATABASE_URL" -Atc "select decision from shared.approval_step where request_type = 'Outpass' and request_id = $OPID and level = 0")" = "Recommended" ] && pass "parent recommended through the SMS link" || fail "parent step"
STEP1=$(call $FW Floor_Warden GET /approvals/inbox | python3 -c "import sys,json; print([s['step_id'] for s in json.load(sys.stdin) if str(s['request_id'])=='$OPID'][0])"); call $FW Floor_Warden POST /approvals/$STEP1/decide '{"decision":"Approved"}' >/dev/null
STEP2=$(call $CW Chief_Warden GET /approvals/inbox | python3 -c "import sys,json; print([s['step_id'] for s in json.load(sys.stdin) if str(s['request_id'])=='$OPID'][0])"); call $CW Chief_Warden POST /approvals/$STEP2/decide '{"decision":"Approved"}' >/dev/null
OPV=$(call $S Student GET /outpasses/$OPID); [ "$(echo "$OPV" | j "['status']")" = "Approved" ] && pass "approved by Chief Warden; QR token issued"
TOKEN=$(echo "$OPV" | j "['qr_token']")
call $CW Chief_Warden GET "/gate/verify?token=$TOKEN" | grep -q "$S" && pass "gate verifies the QR"
call $S Student GET /outpasses/$OPID/qr | grep -q "data:image/png" && pass "student gets QR image"
echo "== F: sick leave"
SL=$(call $S Student POST /sick-leaves "{\"illness_details\":\"Fever\",\"from_date\":\"$(date +%F)\",\"to_date\":\"$(date +%F)\"}"); SLID=$(echo "$SL" | j "['sick_leave_id']")
call $FW Floor_Warden POST /sick-leaves/$SLID/visit '{"visit_remarks":"Fever confirmed"}' >/dev/null
S2=$(call $CW Chief_Warden GET /approvals/inbox | python3 -c "import sys,json; print([s['step_id'] for s in json.load(sys.stdin) if s['request_type']=='Sick_Leave' and str(s['request_id'])=='$SLID'][0])"); call $CW Chief_Warden POST /approvals/$S2/decide '{"decision":"Approved"}' >/dev/null
[ "$(call $S Student GET /sick-leaves/$SLID | j "['status']")" = "Approved" ] && pass "sick leave approved"
call $MS Mess_Incharge GET "/mess/sick-list?date=$(date +%F)" | grep -q "$S" && pass "student on today's mess sick list"
call $MS Mess_Incharge POST "/sick-leaves/$SLID/deliveries/$(date +%F)/Lunch" '{"status":"Delivered"}' | grep -q Delivered && pass "lunch delivered to the room"
echo "== B: QR page (public)"
QT=$(curl -s -H "x-dev-user: $OF" -H "x-dev-role: Office_Staff" "$API/api/spaces/BH1-101/qr/label" | j "['url'].split('/')[-1]")
curl -s "$API/api/qr/$QT" | grep -q "Chief" && pass "public QR page lists responsible staff"
echo "ALL PASSED"
