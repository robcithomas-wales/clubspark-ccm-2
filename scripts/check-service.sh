#!/usr/bin/env bash
#
# check-service.sh — deterministic architecture-compliance check for services.
#
# Enforces the "standard service shape" (docs/engineering/architecture-principles.md #7),
# platform registration, and two security invariants we hardened in the audit. Fast and
# CI-friendly; the architecture-reviewer agent runs this as its first, deterministic pass
# before doing judgement-based review.
#
# Usage:
#   ./scripts/check-service.sh <name | name-service>   check one service
#   ./scripts/check-service.sh --all                   check every service
#
# Exit 0 = all checked services compliant; 1 = at least one FAIL.

set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

REQUIRED_FILES="src/main.ts src/app.module.ts src/config/configuration.ts src/prisma/prisma.module.ts src/prisma/prisma.service.ts src/common/guards/tenant-context.guard.ts src/health/health.controller.ts prisma/schema.prisma package.json tsconfig.json nest-cli.json"
REQUIRED_SCRIPTS="build dev start test prisma:generate"

check_one() {
  svc="$1"
  dir="$ROOT/services/$svc"
  name="${svc%-service}"
  errs=""
  warns=""

  if [ ! -d "$dir" ]; then echo "  ✗ $svc: directory not found"; return 1; fi

  # 1. Standard-shape files
  for f in $REQUIRED_FILES; do
    [ -f "$dir/$f" ] || errs="$errs\n      ✗ missing $f"
  done

  # 2. Required package scripts
  if [ -f "$dir/package.json" ]; then
    for s in $REQUIRED_SCRIPTS; do
      node -e "process.exit((require('$dir/package.json').scripts||{})['$s']?0:1)" 2>/dev/null \
        || errs="$errs\n      ✗ package.json missing script: $s"
    done
  fi

  # 3. cwd-independent env loading (so it runs regardless of launch dir)
  if [ -f "$dir/src/app.module.ts" ] && ! grep -q "envFilePath: join(__dirname" "$dir/src/app.module.ts"; then
    errs="$errs\n      ✗ app.module.ts: ConfigModule missing cwd-independent envFilePath"
  fi

  # 4. Fail-closed tenant guard (x-tenant-id header path must be NODE_ENV-gated)
  g="$dir/src/common/guards/tenant-context.guard.ts"
  if [ -f "$g" ] && grep -q "x-tenant-id" "$g" && ! grep -q "NODE_ENV'] !== 'test'" "$g"; then
    errs="$errs\n      ✗ tenant-context.guard.ts: x-tenant-id fallback not fail-closed (missing NODE_ENV gate)"
  fi

  # 5. Registered platform-wide
  grep -q "| $svc " "$ROOT/CLAUDE.md" 2>/dev/null || errs="$errs\n      ✗ not in CLAUDE.md port table"
  node -e "const s=(require('$ROOT/package.json').scripts||{})['build:services']||''; process.exit(s.indexOf('services/$svc')>=0?0:1)" 2>/dev/null \
    || errs="$errs\n      ✗ not in build:services (package.json)"
  grep '^SERVICES=' "$ROOT/scripts/run-all.sh" 2>/dev/null | grep -qE "[\" ]$name:" \
    || errs="$errs\n      ✗ not in run-all.sh SERVICES"

  # 6. Recommended (warn only)
  [ -f "$dir/.env.example" ] || warns="$warns\n      ⚠ .env.example missing (recommended)"

  if [ -z "$errs" ]; then
    echo "  ✓ $svc"
    [ -n "$warns" ] && printf "%b\n" "$warns"
    return 0
  else
    echo "  ✗ $svc"
    printf "%b\n" "$errs"
    [ -n "$warns" ] && printf "%b\n" "$warns"
    return 1
  fi
}

arg="${1:-}"
targets=""
if [ "$arg" = "--all" ]; then
  for d in "$ROOT"/services/*/; do targets="$targets $(basename "$d")"; done
elif [ -n "$arg" ]; then
  case "$arg" in *-service) targets="$arg";; *) targets="$arg-service";; esac
else
  echo "usage: $0 <name | name-service | --all>"; exit 1
fi

echo "Architecture compliance check:"
fails=0
count=0
for t in $targets; do
  count=$((count + 1))
  check_one "$t" || fails=$((fails + 1))
done
echo ""
if [ "$fails" -eq 0 ]; then
  echo "All $count service(s) compliant with the blueprint."
  exit 0
else
  echo "$fails of $count service(s) non-compliant — see ✗ above."
  exit 1
fi
