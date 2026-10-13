#!/bin/zsh
# One check of the password logins, end to end, against a development API (dev headers on): the administrator makes a
# login, the person sets a password from the one-time link, signs in, uses the token, and is locked out when disabled.
# It removes the login it made.   API=http://localhost:4100 DATABASE=klu_hostel scripts/check-logins.sh [student_id]
set -e
API=${API:-http://localhost:4100}/api; DB=${DATABASE:-klu_hostel}; S=${1:-2600040012}; PW='Check#2026x'
PSQL=${PSQL:-$(command -v psql || echo /opt/homebrew/opt/postgresql@18/bin/psql)}
adm() { curl -s -H "Content-Type: application/json" -H "x-dev-user: admin" -H "x-dev-role: admin" "$@"; }
pub() { curl -s -H "Content-Type: application/json" "$@"; }
get() { python3 -c "import json,sys; print(json.load(sys.stdin).get('$1',''))"; }
ok() { [[ $2 == $3 ]] && echo "PASS  $1" || { echo "FAIL  $1  (got $2, wanted $3)"; FAILED=1; } }
trap '$PSQL $DB -qc "delete from portal.login_account where kind = '"'"'student'"'"' and user_ref = '"'"'$S'"'"'" >/dev/null' EXIT
ID=$(adm -X POST -d "{\"kind\":\"student\",\"user_ref\":\"$S\",\"send\":false}" $API/admin/accounts | get account_id)
ok "administrator makes a login" "${ID:+made}" made
ok "no password yet: sign-in refused" "$(pub -o /dev/null -w '%{http_code}' -X POST -d "{\"username\":\"$S\",\"password\":\"$PW\"}" $API/auth/login)" 401
TOKEN=$(adm -X POST -d '{"mode":"link"}' $API/admin/accounts/$ID/invite | get link | sed 's/.*token=//')
ok "weak password refused" "$(pub -o /dev/null -w '%{http_code}' -X POST -d "{\"token\":\"$TOKEN\",\"password\":\"abc\"}" $API/auth/set-password)" 400
ok "password set from the link" "$(pub -X POST -d "{\"token\":\"$TOKEN\",\"password\":\"$PW\"}" $API/auth/set-password | get ok)" True
ok "the link works once" "$(curl -s -o /dev/null -w '%{http_code}' $API/auth/invite/$TOKEN)" 404
JWT=$(pub -X POST -d "{\"username\":\"$S\",\"password\":\"$PW\"}" $API/auth/login | get token)
ok "sign-in gives a token" "${JWT:+token}" token
ok "the token opens the student's own data" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $JWT" $API/registrations/mine)" 200
ok "the token does not open the administrator's pages" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $JWT" $API/admin/accounts)" 403
ok "a changed token is refused" "$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer ${JWT}x" $API/registrations/mine)" 401
adm -X POST -d '{"active":false}' $API/admin/accounts/$ID/status >/dev/null
ok "disabled: sign-in refused" "$(pub -o /dev/null -w '%{http_code}' -X POST -d "{\"username\":\"$S\",\"password\":\"$PW\"}" $API/auth/login)" 401
[[ -z $FAILED ]] && echo "All checks passed." || exit 1
