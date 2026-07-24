#!/usr/bin/env bash
#
# run-all.sh — bring up the whole ClubSpark stack locally with one command.
#
# Usage:
#   ./scripts/run-all.sh [start|stop|status]      (default: start)
#   ./scripts/run-all.sh start --with-mobile      also start the Expo/Metro bundler
#   ./scripts/run-all.sh stop                     stop services, portals, and mobile
#   ./scripts/run-all.sh status                   health-check every port
#
# Notes:
# - Services read their own services/<name>/.env (Supabase). This script forces the
#   canonical PORT per service so the stack is consistent regardless of local .env values.
# - Each service is launched from its own directory (its ConfigModule loads .env via a
#   cwd-independent path, but running in-dir keeps logs and relative paths tidy).
# - Requires services to be built first: `npm run build --workspace=services/<name>`
#   (or build all). Portals run via `next dev` and need no prior build.
# - Logs go to $TMPDIR/clubspark-run (or /tmp/clubspark-run).

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGDIR="${TMPDIR:-/tmp}/clubspark-run"
mkdir -p "$LOGDIR"

# name:port — canonical scheme (must match CLAUDE.md)
SERVICES="template:4000 venue:4003 people:4004 booking:4005 admin:4006 coaching:4007 team:4008 competition:4009 membership:4010 payment:4011 comms:4012 entitlement:4013 analytics:4014 order:4015 integration:4016"
PORTALS="admin-portal:3005 customer-portal:3006 internal-portal:3010"

start_services() {
  # Make inter-service calls resolve to the canonical ports.
  export INTEGRATION_SERVICE_URL="http://localhost:4016"
  export NEXT_PUBLIC_INTEGRATION_SERVICE_URL="http://127.0.0.1:4016"
  export ENTITLEMENT_SERVICE_URL="http://127.0.0.1:4013"
  for pair in $SERVICES; do
    name="${pair%%:*}"; port="${pair##*:}"; svc="${name}-service"
    main="$ROOT/services/$svc/dist/main.js"
    if [ ! -f "$main" ]; then
      echo "  ! $svc not built — run: npm run build --workspace=services/$svc"
      continue
    fi
    ( cd "$ROOT/services/$svc" && PORT="$port" nohup node dist/main.js > "$LOGDIR/$svc.log" 2>&1 & )
    echo "  -> $svc on $port"
  done
}

start_portals() {
  for pair in $PORTALS; do
    app="${pair%%:*}"; port="${pair##*:}"
    ( cd "$ROOT/$app" && nohup npm run dev > "$LOGDIR/$app.log" 2>&1 & )
    echo "  -> $app on $port"
  done
}

start_mobile() {
  ( cd "$ROOT/mobile-app" && CI=1 BROWSER=none nohup npx expo start --port 8081 > "$LOGDIR/mobile-app.log" 2>&1 & )
  echo "  -> mobile-app (Expo/Metro) on 8081"
}

stop_all() {
  pkill -f "dist/main.js" 2>/dev/null
  pkill -f "next dev" 2>/dev/null
  pkill -f "next-server" 2>/dev/null
  pkill -f "expo start" 2>/dev/null
  echo "stopped services, portals, and mobile"
}

status() {
  echo "Services:"
  for pair in $SERVICES; do
    name="${pair%%:*}"; port="${pair##*:}"
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:$port/health" 2>/dev/null)
    printf "  %-22s http://localhost:%s  health=%s\n" "$name-service" "$port" "$code"
  done
  echo "Portals:"
  for pair in $PORTALS; do
    app="${pair%%:*}"; port="${pair##*:}"
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:$port/" 2>/dev/null)
    printf "  %-22s http://localhost:%s  http=%s\n" "$app" "$port" "$code"
  done
}

cmd="${1:-start}"
case "$cmd" in
  start)
    echo "Starting 15 services..."; start_services
    echo "Starting 3 portals..."; start_portals
    if [ "${2:-}" = "--with-mobile" ]; then echo "Starting mobile..."; start_mobile; fi
    echo ""
    echo "Logs: $LOGDIR"
    echo "Portals compile on first request; run './scripts/run-all.sh status' in ~30s."
    ;;
  stop) stop_all ;;
  status) status ;;
  *) echo "usage: $0 [start [--with-mobile]|stop|status]"; exit 1 ;;
esac
