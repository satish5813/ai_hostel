#!/bin/sh
# KL Residencies production: the mailbox that sends students their "Create my login" code, and the sign-in limit
# for a shared campus network. Run on the master as "test" in an interactive terminal:
#     ssh -t -i ~/.ssh/klu_server -p 985 test@10.5.1.5 "sh ~/hostel-set-mail.sh"
# The password is typed without being shown, goes straight into the Kubernetes secret, and is never printed.
# RATE_LIMIT_TIGHT_PER_MINUTE=300: sign-ins and codes per minute from ONE network address (was 10; campus Wi-Fi and
# R604 share one address). Wrong passwords still lock a login for 15 minutes after 5 tries.
# Queued invite e-mails are not sent by this; they go only when an administrator presses send.
set -eu
export KUBECONFIG="$HOME/.kube/config"
NS=hostel-prod
printf 'Mailbox address [engg.skilldevelopment@kluniversity.in]: '
read -r USER_ADDR
[ -n "$USER_ADDR" ] || USER_ADDR=engg.skilldevelopment@kluniversity.in
printf 'Password for %s (not shown): ' "$USER_ADDR"
stty -echo; read -r PASS; stty echo; echo
[ -n "$PASS" ] || { echo "No password given; nothing changed."; exit 1; }
b64() { printf %s "$1" | base64 -w0; }
kubectl -n "$NS" patch secret hostel-env --type merge -p "{\"data\":{
  \"SMTP_HOST\":\"$(b64 smtp.office365.com)\",
  \"SMTP_PORT\":\"$(b64 587)\",
  \"SMTP_USER\":\"$(b64 "$USER_ADDR")\",
  \"SMTP_PASS\":\"$(b64 "$PASS")\",
  \"MAIL_FROM\":\"$(b64 "KL Residencies <$USER_ADDR>")\",
  \"RATE_LIMIT_TIGHT_PER_MINUTE\":\"$(b64 300)\"}}" >/dev/null
PASS=""
echo "Saved. Restarting KL Residencies API..."
kubectl -n "$NS" rollout restart deploy/api >/dev/null
kubectl -n "$NS" rollout status deploy/api --timeout=300s >/dev/null
echo "Testing the Office 365 login (no e-mail is sent)..."
kubectl -n "$NS" exec deploy/api -- node -e '
import("nodemailer").then(({ default: n }) => n.createTransport({ host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT, secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, connectionTimeout: 15000 }).verify())
  .then(() => console.log("MAIL LOGIN OK for " + process.env.SMTP_USER)).catch((e) => { console.log("MAIL LOGIN FAILED: " + e.message); process.exit(1); })'
