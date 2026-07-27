#!/usr/bin/env bash
#
# typecheck.sh — fast type-check (tsc --noEmit) across all services, no build output.
# Quicker than a full `build:services` when you just want "does it still compile?".
# Service list is derived from services/* (drift-proof).

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOGDIR="${TMPDIR:-/tmp}/clubspark-run"
mkdir -p "$LOGDIR"

fails=""
for d in "$ROOT"/services/*/; do
  name="$(basename "$d")"
  [ -f "$d/tsconfig.json" ] || { echo "  skip: $name (no tsconfig)"; continue; }
  if ( cd "$ROOT" && npx tsc --noEmit -p "services/$name/tsconfig.json" ) >"$LOGDIR/typecheck-$name.log" 2>&1; then
    echo "  ok:   $name"
  else
    echo "  FAIL: $name  (see $LOGDIR/typecheck-$name.log)"; fails="$fails $name"
  fi
done

echo ""
[ -n "$fails" ] && { echo "Type errors in:$fails"; exit 1; }
echo "All services type-check clean."
exit 0
