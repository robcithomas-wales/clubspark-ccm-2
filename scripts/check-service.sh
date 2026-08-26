#!/usr/bin/env bash
#
# check-service.sh — deterministic architecture-compliance check for services.
#
# Enforces the "standard service shape" (docs/engineering/architecture-principles.md #7),
# platform registration, and the tenant-guard invariants: the x-tenant-id fallback must be
# fail-closed, and health routes must be exempt so probes still work. Fast and
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

REQUIRED_FILES="src/main.ts src/app.module.ts src/config/configuration.ts src/prisma/prisma.module.ts src/prisma/prisma.service.ts src/health/health.controller.ts prisma/schema.prisma package.json tsconfig.json nest-cli.json"
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

  # 4. Authentication comes from the shared package, not a local copy.
  #
  #    Every service used to carry its own tenant-context.guard.ts. They drifted
  #    into six variants, and two of them silently ignored @SkipTenant() because
  #    their copy had no Reflector. The guard now lives in @clubspark/auth, is
  #    fail-closed there, and AuthModule.forRoot() registers it globally.
  if [ -f "$dir/package.json" ]; then
    node -e "process.exit((require('$dir/package.json').dependencies||{})['@clubspark/auth']?0:1)" 2>/dev/null \
      || errs="$errs\n      ✗ package.json: missing dependency @clubspark/auth"
  fi
  if [ -f "$dir/src/app.module.ts" ] && ! grep -q "AuthModule.forRoot(" "$dir/src/app.module.ts"; then
    errs="$errs\n      ✗ app.module.ts: no AuthModule.forRoot() — the service is unauthenticated"
  fi
  # A re-forked local guard is how the drift started. Fail on it, don't warn.
  for stale in src/common/guards/tenant-context.guard.ts \
               src/common/guards/internal-secret.guard.ts \
               src/common/decorators/skip-tenant.decorator.ts; do
    [ -f "$dir/$stale" ] && errs="$errs\n      ✗ $stale: local copy of shared auth — import from @clubspark/auth instead"
  done
  # ...and by content, not just at those three paths. admin-service carried a fork
  # for months at src/internal/guards/internal.guard.ts — a path this list did not
  # name — so --all reported it compliant while it compared secrets with `===` and
  # trusted an unverified x-staff-id. Match on what a guard DOES instead: any
  # CanActivate implementation that inspects the internal secret or a token is
  # authentication, and authentication comes from the shared package.
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    grep -qE "x-internal-secret|INTERNAL_SECRET|app_metadata|jwks|verifyToken" "$f" || continue
    rel="${f#$dir/}"
    errs="$errs\n      ✗ $rel: local auth guard — use InternalSecretGuard/TenantContextGuard from @clubspark/auth"
  done <<EOF
$(grep -rlE "implements +CanActivate" "$dir/src" 2>/dev/null || true)
EOF

  # 5. Health routes exempt from the tenant guard (probes send no JWT/tenant header)
  #    The guard is global and fail-closed, so a health controller without @SkipTenant()
  #    returns 401 and every liveness/readiness probe fails. Matches both layouts:
  #    SkipTenant imported from common/decorators/ or re-exported by the guard itself.
  #    Anchored to a decorator on its own line so a leftover import or a mention in a
  #    doc comment can't satisfy the check (both start with 'import'/'*' before the @).
  h="$dir/src/health/health.controller.ts"
  if [ -f "$h" ] && ! grep -qE '^[[:space:]]*@SkipTenant\(\)' "$h"; then
    errs="$errs\n      ✗ health.controller.ts: missing @SkipTenant() — probes will get 401 from TenantContextGuard"
  fi

  # 6. Registered platform-wide
  grep -q "| $svc " "$ROOT/CLAUDE.md" 2>/dev/null || errs="$errs\n      ✗ not in CLAUDE.md port table"
  node -e "const s=(require('$ROOT/package.json').scripts||{})['build:services']||''; process.exit(s.indexOf('services/$svc')>=0?0:1)" 2>/dev/null \
    || errs="$errs\n      ✗ not in build:services (package.json)"
  grep '^SERVICES=' "$ROOT/scripts/run-all.sh" 2>/dev/null | grep -qE "[\" ]$name:" \
    || errs="$errs\n      ✗ not in run-all.sh SERVICES"

  # 7. Recommended (warn only)
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
