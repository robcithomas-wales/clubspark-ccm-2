#!/usr/bin/env bash
#
# run-all.sh — bring up the whole ClubSpark stack locally with one command.
#
# Usage:
#   ./scripts/run-all.sh [start|stop|status]            (default: start)
#   ./scripts/run-all.sh start [--with-mobile] [--services-only]   flags for start
#   ./scripts/run-all.sh up [--pull] [--with-mobile]    (re)build all services, then (re)start
#   ./scripts/run-all.sh stop                           stop services, portals, and mobile
#   ./scripts/run-all.sh status                         health-check every port
#
# start vs up:
#   start — launch from existing build output (fast; assumes services already built)
#   up    — rebuild all 15 services from source, stop any running stack, then start it fresh
#             --pull         FIRST run `git pull --ff-only`. Opt-in only, and SKIPPED if the
#                            working tree has uncommitted changes (never clobbers local work).
#             --with-mobile  also start Expo/Metro
#
# Notes:
# - Services read their own services/<name>/.env (Supabase). This script forces the
#   canonical PORT per service so the stack is consistent regardless of local .env values.
# - Logs go to $TMPDIR/clubspark-run (or /tmp/clubspark-run).

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGDIR="${TMPDIR:-/tmp}/clubspark-run"
mkdir -p "$LOGDIR"

# name:port — canonical scheme (must match CLAUDE.md)
SERVICES="template:4000 venue:4003 people:4004 booking:4005 admin:4006 coaching:4007 team:4008 competition:4009 membership:4010 payment:4011 comms:4012 entitlement:4013 analytics:4014 order:4015 integration:4016"
PORTALS="admin-portal:3005 customer-portal:3006 internal-portal:3010"

pull_latest() {
  echo "Pull latest (--pull):"
  if [ -n "$(git -C "$ROOT" status --porcelain)" ]; then
    echo "  ! Working tree has uncommitted changes — SKIPPING pull so nothing is clobbered."
    echo "    Commit or stash first, then re-run with --pull. Continuing with current code."
    return 0
  fi
  if git -C "$ROOT" pull --ff-only; then
    echo "  updated to latest (fast-forward)."
  else
    echo "  ! git pull --ff-only failed (diverged branch or no upstream). Continuing with current code."
  fi
}

build_all() {
  echo "Building 15 services..."
  fails=""
  for pair in $SERVICES; do
    name="${pair%%:*}"; svc="${name}-service"
    if ( cd "$ROOT" && npm run build --workspace="services/$svc" ) >"$LOGDIR/build-$svc.log" 2>&1; then
      echo "  ok:   $svc"
    else
      echo "  FAIL: $svc (see $LOGDIR/build-$svc.log)"
      fails="$fails $svc"
    fi
  done
  [ -n "$fails" ] && echo "  ! build failures:$fails — those services won't start."
  return 0
}

start_services() {
  # Local dev: services trust the x-tenant-id header only when NODE_ENV is
  # 'development' or 'test' (fail-closed in production — see TenantContextGuard).
  export NODE_ENV="${NODE_ENV:-development}"
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

start_stack() {
  # flags: --with-mobile (also start Expo), --services-only (skip portals)
  mobile=false; services_only=false
  for a in "$@"; do
    case "$a" in
      --with-mobile) mobile=true ;;
      --services-only) services_only=true ;;
    esac
  done
  echo "Starting 15 services..."; start_services
  [ "$services_only" = true ] || { echo "Starting 3 portals..."; start_portals; }
  [ "$mobile" = true ] && { echo "Starting mobile..."; start_mobile; }
  echo ""
  echo "Logs: $LOGDIR"
  echo "Portals compile on first request; run '$0 status' in ~30s."
}

cmd="${1:-start}"
case "$cmd" in
  start)
    shift
    start_stack "$@"
    ;;
  up)
    shift
    want_pull=false; mobile_flag=""
    for arg in "$@"; do
      case "$arg" in
        --pull) want_pull=true ;;
        --with-mobile) mobile_flag="--with-mobile" ;;
        *) echo "unknown flag for 'up': $arg"; echo "usage: $0 up [--pull] [--with-mobile]"; exit 1 ;;
      esac
    done
    [ "$want_pull" = true ] && pull_latest
    build_all
    echo "Stopping any running stack..."; stop_all; sleep 2
    start_stack "$mobile_flag"
    ;;
  stop) stop_all ;;
  status) status ;;
  *) echo "usage: $0 [start [--with-mobile] [--services-only] | up [--pull] [--with-mobile] | stop | status]"; exit 1 ;;
esac
