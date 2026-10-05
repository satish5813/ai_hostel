#!/usr/bin/env bash
# Demo data through the API only (so every rule and audit trigger runs):
#   1. the Data Administrator sets up masters: a third floor in BH1, a girls' hostel GH1 with rooms, fees, mess, staff, students
#   2. five students go from registration to check-in
#   3. outings, a sick leave and a week of night roll call, so the attendance register has something to show
# Usage: API=http://localhost:4000 bash scripts/demo-seed.sh      (run once on the dev fixtures)
set -uo pipefail
API=${API:-http://localhost:4000}
call() { local u=$1 r=$2 m=$3 p=$4 b=${5:-}
  if [ -n "$b" ]; then curl -s -X "$m" -H "x-dev-user: $u" -H "x-dev-role: $r" -H 'Content-Type: application/json' -d "$b" "$API/api$p";
  else curl -s -X "$m" -H "x-dev-user: $u" -H "x-dev-role: $r" "$API/api$p"; fi; }
j() { python -c "import sys,json; d=json.load(sys.stdin); print(eval('d'+sys.argv[1]))" "$1"; }
AD=S-AD; OF=S-OF; AC=S-AC; FW=S-FW; CW=S-CW
day() { python -c "import datetime,sys; print((datetime.date.today()+datetime.timedelta(days=int(sys.argv[1]))).isoformat())" "$1"; }
at() { python -c "import datetime,sys; d=datetime.datetime.now().astimezone().replace(hour=int(sys.argv[2]),minute=0,second=0,microsecond=0)+datetime.timedelta(days=int(sys.argv[1])); print(d.isoformat())" "$1" "$2"; }

echo "== masters (admin)"
call $AD admin POST /hostels/H-BH1/floors '{}' | head -c 80; echo
call $AD admin POST /floors/BH1-F3/rooms '{"room_nos":["301","302","303","304"],"space_category":"Hostel_Room","room_type_id":7}' | head -c 120; echo
call $AD admin POST /floors/BH1-F3/rooms '{"room_nos":["T3"],"space_category":"Toilet_Block"}' | head -c 80; echo
call $AD admin POST /admin/hostels '{"hostel_code":"GH1","facility_name":"Girls Hostel 1","hostel_gender":"Girls","floors":2,"gate_close_time":"20:30"}' | head -c 80; echo
call $AD admin POST /floors/GH1-F1/rooms '{"room_nos":["101","102","103","104","105","106"],"space_category":"Hostel_Room","room_type_id":2}' | head -c 80; echo
call $AD admin POST /floors/GH1-F2/rooms '{"room_nos":["201","202","203","204"],"space_category":"Hostel_Room","room_type_id":4}' | head -c 80; echo
for rt in 2 4; do call $AD admin POST /admin/room-type-fees "{\"room_type_id\":$rt,\"facility_id\":\"H-GH1\",\"academic_year\":\"2026-27\",\"registration_fee\":5000,\"hostel_fee\":$([ $rt = 2 ] && echo 120000 || echo 105000),\"instalment_1_pct\":60,\"instalment_2_due_date\":\"2026-12-15\"}" >/dev/null; done
call $AD admin POST /admin/staff '{"staff_id":"S-GW","salutation":"Dr.","first_name":"Lakshmi","last_name":"Devi","gender":"Female","dept_code":"HOSTELS","designation":"Chief Warden – Girls","staff_type":"Warden","mobile_no":"9000000021","official_email":"chiefwarden.girls@kluniversity.in"}' | head -c 60; echo
call $AD admin POST /admin/messes '{"mess_name":"GH1 Mess","facility_id":"H-GH1","incharge_id":"S-MS","capacity":400,"annual_fee":48000}' | head -c 60; echo

echo "== students (admin) and their journey to check-in"
i=0
while IFS='|' read -r SID NAME PROG DEPT DOB FATHER MOB RT METER KEY; do
  i=$((i+1))
  call $AD admin POST /admin/students "{\"student_id\":\"$SID\",\"full_name\":\"$NAME\",\"gender\":\"Male\",\"student_type\":\"UG\",\"programme\":\"$PROG\",\"date_of_birth\":\"$DOB\",\"personal_email\":\"$SID@kluniversity.in\",\"dept_code\":\"$DEPT\",\"father_name\":\"$FATHER\",\"parent_mobile\":\"$MOB\"}" >/dev/null
  CID=$(call $OF Office_Staff GET /students/$SID | j "['contacts'][0]['contact_id']")
  call $SID Student POST /contacts/$CID/verify '{"otp":"000000"}' >/dev/null
  call $SID Student POST /contacts/$CID/outpass-approver >/dev/null
  REG=$(call $SID Student POST /registrations "{\"facility_id\":\"H-BH1\",\"room_type_id\":$RT,\"rules_accepted\":true}")
  RID=$(echo "$REG" | j "['registration_id']"); RDEM=$(echo "$REG" | j "['demands'][0]['demand_id']")
  call $SID Student POST /payments/dev-confirm "{\"demand_id\":$RDEM,\"amount\":5000}" >/dev/null
  OID=$(call $OF Office_Staff POST /registrations/$RID/offers '{}' | j "['offer_id']")
  call $SID Student POST /offers/$OID/decision '{"decision":"Accepted"}' >/dev/null
  PLAN=$(call $SID Student POST /registrations/$RID/fee-plan '{"plan_type":"Single","cuisine":"South_Indian"}')
  for d in $(echo "$PLAN" | python -c "import sys,json; [print(str(x['demand_id'])+':'+str(x['amount_due'])) for x in json.load(sys.stdin)['demands']]"); do
    call $AC Accounts_Section POST /demands/${d%%:*}/receipts "{\"amount\":${d##*:},\"payment_mode\":\"Cash\"}" >/dev/null; done
  AID=$(call $OF Office_Staff POST /allocations "{\"offer_id\":$OID,\"key_no\":\"$KEY\"}" | j "['hostel_alloc_id']")
  call $FW Floor_Warden POST /allocations/$AID/handover "{\"handover_type\":\"Check_In\",\"meter_reading\":$METER,\"occupant_acknowledged\":true,\"lines\":[]}" >/dev/null
  call $SID Student POST /consents "{\"given_by\":\"Parent\",\"contact_id\":$CID}" >/dev/null
  echo "$SID $NAME: $(call $SID Student GET /registrations/$RID | j "['status']") contact $CID"
  eval "C$i=$CID"
done <<'ROWS'
2600040021|KARTHIK VARMA|Btech CSE|CSE|2007-02-11|S VARMA|9440000021|7|120|K-201-1
2600040022|ROHAN GUPTA|Btech ECE|ECE|2007-06-30|A GUPTA|9440000022|7|120|K-201-2
2600040023|SAI TEJA NAIDU|Btech CSE|CSE|2006-12-05|R NAIDU|9440000023|7|120|K-201-3
2600040024|MOHAMMED IRFAN|Btech ECE|ECE|2007-09-17|M KHAN|9440000024|2|1600|K-102-1
2600040025|VIKRAM SINGH|Btech CSE|CSE|2007-04-23|H SINGH|9440000025|2|1600|K-102-2
ROWS

approve() { # approve <student> <contact> <levels: P | P1 | P12>
  local S=$1 C=$2 L=$3 OPID=$4
  local s0; s0=$(call contact:$C Parent GET /approvals/inbox | j "[0]['step_id']"); call contact:$C Parent POST /approvals/$s0/parent "{\"contact_id\":$C,\"decision\":\"Approved\"}" >/dev/null
  if [[ $L == *1* ]]; then local s1; s1=$(call $FW Floor_Warden GET /approvals/inbox | python -c "import sys,json; print([s['step_id'] for s in json.load(sys.stdin) if str(s['request_id'])=='$OPID' and s['request_type']=='Outpass'][0])"); call $FW Floor_Warden POST /approvals/$s1/decide '{"decision":"Approved"}' >/dev/null; fi
  if [[ $L == *2* ]]; then local s2; s2=$(call $CW Chief_Warden GET /approvals/inbox | python -c "import sys,json; print([s['step_id'] for s in json.load(sys.stdin) if str(s['request_id'])=='$OPID' and s['request_type']=='Outpass'][0])"); call $CW Chief_Warden POST /approvals/$s2/decide '{"decision":"Approved"}' >/dev/null; fi
}
echo "== outings"
OP=$(call 2600040021 Student POST /outpasses "{\"reason\":\"Dental appointment\",\"destination\":\"Vijayawada\",\"leave_from\":\"$(at 1 10)\",\"return_by\":\"$(at 1 18)\",\"contact_during_leave\":\"9440000021\"}" | j "['outpass_id']"); approve 2600040021 $C1 P12 $OP; echo "outing $OP approved (same day)"
OP=$(call 2600040022 Student POST /outpasses "{\"reason\":\"Sister's wedding\",\"destination\":\"Hyderabad\",\"leave_from\":\"$(at 3 8)\",\"return_by\":\"$(at 6 20)\",\"contact_during_leave\":\"9440000022\"}" | j "['outpass_id']"); approve 2600040022 $C2 P1 $OP; echo "outing $OP at Level 2 (day or more)"
OP=$(call 2600040024 Student POST /outpasses "{\"reason\":\"Family function\",\"destination\":\"Guntur\",\"leave_from\":\"$(at 8 9)\",\"return_by\":\"$(at 10 19)\",\"contact_during_leave\":\"9440000024\"}" | j "['outpass_id']"); approve 2600040024 $C4 P $OP; echo "outing $OP waiting for the Floor Warden"

echo "== sick leave"
SL=$(call 2600040023 Student POST /sick-leaves "{\"illness_details\":\"Viral fever, advised rest\",\"from_date\":\"$(day 0)\",\"to_date\":\"$(day 2)\"}" | j "['sick_leave_id']")
call $FW Floor_Warden POST /sick-leaves/$SL/visit '{"visit_remarks":"Temperature 101 F, resting in room"}' >/dev/null
for U in "$FW Floor_Warden" "$CW Chief_Warden"; do set -- $U; ST=$(call $1 $2 GET /approvals/inbox | python -c "import sys,json; print([s['step_id'] for s in json.load(sys.stdin) if str(s['request_id'])=='$SL' and s['request_type']=='Sick_Leave'][0])"); call $1 $2 POST /approvals/$ST/decide '{"decision":"Approved"}' >/dev/null; done
echo "sick leave $SL: $(call 2600040023 Student GET /sick-leaves/$SL | j "['status']")"

echo "== night roll call for the last six nights"
for n in -6 -5 -4 -3 -2 -1; do
  ABS=""; [ $n = -3 ] && ABS=2600040025; [ $n = -1 ] && ABS=2600040022
  M=$(python -c "
import json,sys
ids=['2600040012','2600040021','2600040022','2600040023','2600040024','2600040025']
print(json.dumps({'att_date':sys.argv[1],'facility_id':'H-BH1','marks':[{'student_id':i,'status':'Absent' if i==sys.argv[2] else 'Present'} for i in ids]}))" "$(day $n)" "$ABS")
  call $FW Floor_Warden POST /attendance/mark "$M" | head -c 40; echo " $(day $n)"
done
echo "done"
