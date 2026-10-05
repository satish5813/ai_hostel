#!/usr/bin/env bash
# Starts the API (port 4000) and the web app (port 5173) together; Ctrl+C stops both.
#   bash scripts/mac/start.sh            normal
#   bash scripts/mac/start.sh --debug    API with the Node inspector on port 9229 (VS Code "Attach to API" or chrome://inspect)
#   bash scripts/mac/start.sh --watch    API rebuilds itself when you change its code (nest --watch)
# React Scan (render highlighting) runs in the web app in development; turn it off with REACT_SCAN=0.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p logs
MODE=${1:-}

for port in 4000 5173; do
  if lsof -ti tcp:$port >/dev/null 2>&1; then echo "Port $port is in use (pid $(lsof -ti tcp:$port | head -1)). Stop that process first."; exit 1; fi
done

[[ -f apps/api/.env ]] || { echo "apps/api/.env is missing; run: bash scripts/mac/setup.sh"; exit 1; }
[[ -f apps/api/dist/main.js ]] || pnpm --filter @klu/api build

case "$MODE" in
  --debug) (cd apps/api && exec node --enable-source-maps --inspect=127.0.0.1:9229 dist/main.js) > logs/api.log 2>&1 & ;;
  --watch) (cd apps/api && exec pnpm start:dev) > logs/api.log 2>&1 & ;;
  *)       (cd apps/api && exec node --enable-source-maps dist/main.js) > logs/api.log 2>&1 & ;;
esac
API_PID=$!
pnpm --filter @klu/web-vite dev > logs/web.log 2>&1 &
WEB_PID=$!
trap 'echo; echo "Stopping"; kill $API_PID $WEB_PID 2>/dev/null; exit 0' INT TERM

for _ in $(seq 1 40); do curl -s -o /dev/null localhost:4000/api/auth/demo-accounts && break; sleep 0.5; done
echo "API  http://localhost:4000/api   docs http://localhost:4000/docs   log logs/api.log${MODE:+   ($MODE)}"
echo "Web  http://localhost:5173        log logs/web.log"
echo "Ctrl+C to stop both."
(command -v open >/dev/null && sleep 2 && open http://localhost:5173) &
tail -n 0 -F logs/api.log logs/web.log
