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

# Build shared packages before anything imports them. Services resolve
# @clubspark/auth to its compiled dist/, which is git-ignored — without this the
# suites die with "Failed to resolve entry for package @clubspark/auth" on any
# clean checkout, which is exactly what happened in CI.
echo "Building shared packages..."
if ! ( cd "$ROOT" && npm run build:packages ) >"$LOGDIR/build-packages.log" 2>&1; then
  echo "  FAIL: shared packages did not build (see $LOGDIR/build-packages.log)"
  tail -20 "$LOGDIR/build-packages.log"
  exit 1
fi

pass=0; skip=0; fail=0; failed=""

# Shared packages first. @clubspark/auth guards every request in every service,
# so a break here is a break everywhere — and its suite needs no database, so it
# costs a fraction of a second and fails fast before the slow work starts.
for pd in "$ROOT"/packages/*/; do
  pname="$(basename "$pd")"
  [ -d "$pd/test" ] || continue
  plog="$LOGDIR/test-package-$pname.log"
  if ( cd "$ROOT" && npm run test --workspace="packages/$pname" ) >"$plog" 2>&1; then
    echo "  PASS: packages/$pname"; pass=$((pass+1))
  else
    echo "  FAIL: packages/$pname  (see $plog)"; fail=$((fail+1)); failed="$failed packages/$pname"
  fi
done

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

if [ -n "$failed" ]; then
  # Print the failing output. Without this the log only exists inside the runner
  # and a CI failure is undiagnosable — you get "FAIL: <service>" and nothing else.
  for name in $failed; do
    echo ""
    echo "───────── $name — failing output ─────────"
    # The vitest summary and the assertion detail both live near the end.
    tail -80 "$LOGDIR/test-$name.log" 2>/dev/null || echo "(no log captured)"
  done
  echo ""
  echo "Failed:$failed"
  exit 1
fi
exit 0
