#!/usr/bin/env bash
#
# migrate-status.sh — report migration state for every service, read-only.
#
# Exists so engineers never need DIRECT_DATABASE_URL in a .env file. Like
# migrate-all.sh and check-migration-drift.sh, it derives the session-mode URL
# and the per-service ?schema= pin itself, from one DATABASE_URL.
#
# The schema pin matters: each service keeps its own _prisma_migrations inside
# its own schema. Without the pin Prisma looks in `public`, finds no history and
# reports applied baselines as PENDING.
#
# Usage:
#   npm run migrate:status                 # uses the root .env
#   DATABASE_URL=... npm run migrate:status
#
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Fall back to the root .env when DATABASE_URL is not already exported.
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ROOT/.env" ]; then
  DATABASE_URL="$(grep -m1 '^DATABASE_URL=' "$ROOT/.env" | cut -d= -f2-)"
fi
: "${DATABASE_URL:?DATABASE_URL must be set (root .env or environment)}"

# Migrations need a session connection: Supabase's transaction pooler (6543)
# silently hangs on DDL. Strip pooler-only query params too.
direct="${DIRECT_DATABASE_URL:-$(printf '%s' "$DATABASE_URL" \
  | sed -e 's/:6543/:5432/' -e 's/[?&]pgbouncer=true//' -e 's/[?&]connection_limit=[0-9]*//')}"

fail=0
for d in "$ROOT"/services/*/; do
  name="$(basename "$d")"
  [ -f "$d/prisma/schema.prisma" ] || continue
  if [ ! -d "$d/prisma/migrations" ] || [ -z "$(ls -A "$d/prisma/migrations" 2>/dev/null)" ]; then
    printf '  %-22s %s\n' "$name" "no migrations"
    continue
  fi

  sch=$(grep -m1 'schemas *=' "$d/prisma/schema.prisma" \
        | sed 's|//.*||' | grep -oE '"[a-z_]+"' | head -1 | tr -d '"')
  sep='?'; case "$direct" in *\?*) sep='&';; esac
  url="${direct}${sep}schema=${sch}"

  out=$( cd "$d" && DATABASE_URL="$url" DIRECT_DATABASE_URL="$url" \
         npx prisma migrate status 2>&1 )
  if printf '%s' "$out" | grep -q "Database schema is up to date"; then
    printf '  %-22s up to date        (schema %s)\n' "$name" "$sch"
  elif printf '%s' "$out" | grep -q "have not yet been applied"; then
    printf '  %-22s PENDING           (schema %s) — run npm run migrate:all\n' "$name" "$sch"
    fail=1
  else
    printf '  %-22s ERROR             (schema %s)\n' "$name" "$sch"
    printf '%s\n' "$out" | grep -iE 'error|P[0-9]{4}' | head -2 | sed 's/^/      /'
    fail=1
  fi
done

exit $fail
