#!/usr/bin/env bash
#
# test-services.sh — run every service's test suite SEQUENTIALLY (pool-safe).
#
# Kills running services first: they hold Supabase connections that would otherwise
# exhaust the pgbouncer connection limit and cause flaky failures (see CLAUDE.md).
# Runs one service at a time for the same reason — do not parallelise this.
#
# Service list is derived from services/* (drift-proof — new services covered
# automatically). Services with no test files are reported as skipped, not failed.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGDIR="${TMPDIR:-/tmp}/clubspark-run"
mkdir -p "$LOGDIR"

echo "Killing running services to free the DB pool..."
pkill -f "nest start" 2>/dev/null || true
pkill -f "dist/main.js" 2>/dev/null || true
sleep 2

pass=0; skip=0; fail=0; failed=""
for d in "$ROOT"/services/*/; do
  name="$(basename "$d")"
  log="$LOGDIR/test-$name.log"
  if ( cd "$ROOT" && npm run test --workspace="services/$name" ) >"$log" 2>&1; then
    if grep -q "No test files found" "$log"; then
      echo "  skip: $name (no test files)"; skip=$((skip+1))
    else
      echo "  PASS: $name"; pass=$((pass+1))
    fi
  else
    echo "  FAIL: $name  (see $log)"; fail=$((fail+1)); failed="$failed $name"
  fi
done

echo ""
echo "Summary: $pass passed, $skip skipped, $fail failed"
echo "(services are now stopped — run ./scripts/run-all.sh start to bring the stack back up)"
[ -n "$failed" ] && { echo "Failed:$failed"; exit 1; }
exit 0
