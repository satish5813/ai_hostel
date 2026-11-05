#!/bin/sh
# One-time set-up of the KL Residencies TRAINING DEMO (https://demo-residency.klfacultyhiring.com).
# Run on the master as user "test":   sh setup-demo.sh ~/klu_hostel_demo.dump
# Needs: the demo dump (made-up students only), kubectl. Creates namespace hostel-demo, its secrets (random
# passwords, never printed), the Flux Kustomization, then loads the dump. Safe to run again: it reloads the dump
# (a fresh demo for the next training day). It never touches hostel-prod.
set -eu
DUMP="${1:?usage: sh setup-demo.sh <path to klu_hostel_demo.dump>}"
[ -f "$DUMP" ] || { echo "dump not found: $DUMP"; exit 1; }
NS=hostel-demo
rnd() { head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'; }

kubectl get ns $NS >/dev/null 2>&1 || kubectl create ns $NS
kubectl annotate ns $NS kustomize.toolkit.fluxcd.io/prune=disabled --overwrite >/dev/null
kubectl label ns $NS pod-security.kubernetes.io/enforce=baseline pod-security.kubernetes.io/warn=restricted --overwrite >/dev/null

if ! kubectl -n $NS get secret hostel-db >/dev/null 2>&1; then
  APP_PW=$(rnd)
  kubectl -n $NS create secret generic hostel-db --from-literal=superuser-password="$(rnd)" --from-literal=app-password="$APP_PW" >/dev/null
  # NODE_ENV=production; ALLOW_HEADER_AUTH only lets the API start (header sign-in stays off: no DEV_HEADERS).
  # A whole classroom signs in from one network: allow 600 sign-ins a minute instead of 10.
  kubectl -n $NS create secret generic hostel-env \
    --from-literal=DATABASE_URL="postgresql://klu_app:$APP_PW@postgres:5432/klu_hostel" \
    --from-literal=AUTH_SECRET="$(rnd)" \
    --from-literal=NODE_ENV=production \
    --from-literal=ALLOW_HEADER_AUTH=1 \
    --from-literal=PUBLIC_WEB_URL=https://demo-residency.klfacultyhiring.com \
    --from-literal=RATE_LIMIT_TIGHT_PER_MINUTE=600 >/dev/null
  echo "secrets hostel-db, hostel-env created"
fi
if ! kubectl -n $NS get secret ghcr-pull >/dev/null 2>&1; then
  kubectl -n hostel-prod get secret ghcr-pull -o yaml | sed -e '/^  namespace:/d' -e '/^  uid:/d' -e '/^  resourceVersion:/d' -e '/^  creationTimestamp:/d' \
    | kubectl -n $NS apply -f - >/dev/null
  echo "secret ghcr-pull copied from hostel-prod"
fi

kubectl apply -f - <<'EOF'
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: hostel-demo
  namespace: flux-system
spec:
  sourceRef: {kind: GitRepository, name: ai-hostel}
  path: ./deploy/hostel/overlays/demo
  interval: 5m
  prune: false
  wait: false
  timeout: 10m
EOF
kubectl -n flux-system annotate gitrepository ai-hostel reconcile.fluxcd.io/requestedAt="$(date +%s)" --overwrite >/dev/null
kubectl -n flux-system annotate kustomization hostel-demo reconcile.fluxcd.io/requestedAt="$(date +%s)" --overwrite >/dev/null

echo "waiting for the demo database (up to 5 min)..."
i=0; until kubectl -n $NS get pod postgres-0 >/dev/null 2>&1; do i=$((i+1)); [ $i -ge 60 ] && { echo "postgres-0 not created - check: kubectl -n flux-system get kustomization hostel-demo"; exit 1; }; sleep 5; done
kubectl -n $NS wait --for=condition=Ready pod/postgres-0 --timeout=300s
i=0; until kubectl -n $NS exec postgres-0 -- psql -U postgres -d klu_hostel -Atc 'select 1' >/dev/null 2>&1; do i=$((i+1)); [ $i -ge 60 ] && { echo "klu_hostel not created"; exit 1; }; sleep 3; done

echo "loading the demo data..."
kubectl -n $NS scale deploy/api --replicas=0 >/dev/null 2>&1 || true
sleep 5
kubectl -n $NS cp "$DUMP" postgres-0:/tmp/demo.dump
kubectl -n $NS exec -i postgres-0 -- sh -eu <<'EOF'
psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q <<SQL
select pg_terminate_backend(pid) from pg_stat_activity where datname = 'klu_hostel' and pid <> pg_backend_pid();
drop database klu_hostel;
create database klu_hostel owner klu_app;
SQL
psql -U postgres -d klu_hostel -v ON_ERROR_STOP=1 -qc "create extension if not exists pgcrypto; create extension if not exists btree_gist;"
pg_restore -l /tmp/demo.dump | grep -v ' EXTENSION ' > /tmp/demo.list
pg_restore -U postgres -d klu_hostel --no-owner --no-privileges --role=klu_app -L /tmp/demo.list /tmp/demo.dump
rm -f /tmp/demo.dump /tmp/demo.list
psql -U postgres -d klu_hostel -Atc "select 'students ' || count(*) from ref.student_master; select 'demo logins: ' || string_agg(username, ', ' order by username) from portal.login_account where status = 'Active'"
EOF
kubectl -n $NS scale deploy/api --replicas=1 >/dev/null
kubectl -n $NS rollout status deploy/api --timeout=300s
kubectl -n $NS rollout status deploy/web --timeout=300s
echo "SUCCESS: demo site ready - https://demo-residency.klfacultyhiring.com"
