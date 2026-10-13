#!/bin/zsh
# Makes the first administrator login on a new server (every later login is made on the portal: Admin > Logins).
# The staff member must be loaded already (ref.staff_master). Prints a one-time link to set the password, valid 7 days.
#   DATABASE=klu_hostel PUBLIC_WEB_URL=https://hostels.kluniversity.in scripts/create-first-admin.sh E1001 [e-mail]
set -e
ID=${1:?Give the employee ID}; EMAIL=${2:-}; DB=${DATABASE:-klu_hostel}; WEB=${PUBLIC_WEB_URL:-http://localhost:5180}
PSQL=${PSQL:-$(command -v psql || echo /opt/homebrew/opt/postgresql@18/bin/psql)}
TOKEN=$(openssl rand -hex 32)
OUT=$($PSQL $DB -v ON_ERROR_STOP=1 -Atq -v id="$ID" -v email="$EMAIL" -v token="$TOKEN" <<'SQL'
select count(*) as known from ref.staff_master where staff_id = :'id' \gset
\if :known
\else
  \echo NO_STAFF
  \quit
\endif
insert into portal.app_user (staff_id, full_name, email, title, home_dept)
  select staff_id, full_name, official_email, designation, dept_code from ref.staff_master
  where staff_id = :'id' and not exists (select 1 from portal.app_user where staff_id = :'id');
update portal.app_user set active = true where staff_id = :'id';
insert into portal.user_role (user_id, role_code, scope_dept, granted_by, approval_ref)
  select user_id, 'admin', 'HOSTELS', 'system', 'FIRST-ADMIN' from portal.app_user where staff_id = :'id'
  on conflict (user_id, role_code, scope_dept) do nothing;
insert into portal.login_account (username, kind, user_ref, email, created_by)
  values (:'id', 'staff', :'id', nullif(:'email', ''), 'system')
  on conflict (kind, user_ref) do update set status = case when portal.login_account.status = 'Disabled' then 'Invited' else portal.login_account.status end;
update portal.login_account set invite_hash = encode(digest(:'token', 'sha256'), 'hex'), invite_expires = now() + interval '7 days' where kind = 'staff' and user_ref = :'id';
\echo OK
SQL
)
[[ $OUT == *NO_STAFF* ]] && { echo "No staff member $ID in ref.staff_master. Load the staff first (file 7)."; exit 1; }
echo "Administrator login for $ID is ready. Open this link once to set the password (valid 7 days):"
echo "$WEB/set-password?token=$TOKEN"
