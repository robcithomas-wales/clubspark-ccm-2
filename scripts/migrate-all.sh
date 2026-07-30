#!/usr/bin/env bash
#
# migrate-all.sh — apply every service's migrations to the target database.
#
# This is the script that proves the repository can build a database from
# nothing. That property is what makes CI (ephemeral Postgres) and multi-region
# (a fresh regional database) possible. Before the 2026-07-30 baselining, six
# services had models but no migrations, so this was impossible.
#
# Order matters only in that schemas must exist before anything references them;
# each service's baseline creates its own schema, and there are deliberately no
# cross-schema foreign keys, so plain alphabetical order is safe.
#
# Usage:
#   DATABASE_URL=... DIRECT_DATABASE_URL=... ./scripts/migrate-all.sh
#
# Prisma uses DIRECT_DATABASE_URL for migrations (see any schema.prisma) — the
# Supabase transaction pooler on 6543 hangs on DDL, so migrations need 5432.
#
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

: "${DATABASE_URL:?DATABASE_URL must be set}"
# Fall back to DATABASE_URL when no separate direct URL is given (e.g. a local
# Postgres or a CI container, where there is no pooler in front).
export DIRECT_DATABASE_URL="${DIRECT_DATABASE_URL:-$DATABASE_URL}"

# Platform-level objects that no single service owns but several depend on
# (the shared schema + set_updated_at, and the btree_gist extension). Must run
# before any service migration. Idempotent.
echo "  bootstrap: shared schema, functions, extensions"
if command -v psql >/dev/null 2>&1; then
  psql "$DIRECT_DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$ROOT/scripts/sql/000_shared_bootstrap.sql" \
    || { echo "  FAIL: bootstrap"; exit 1; }
else
  echo "  !! psql not found — cannot apply scripts/sql/000_shared_bootstrap.sql"
  echo "     Install the postgresql client, or apply that file by hand first."
  exit 1
fi

# Build the work list, skipping services with no migrations.
pending=""; skipped=0
for d in "$ROOT"/services/*/; do
  name="$(basename "$d")"
  if [ ! -d "$d/prisma/migrations" ] || [ -z "$(ls -A "$d/prisma/migrations" 2>/dev/null)" ]; then
    echo "  skip: $name (no migrations)"
    skipped=$((skipped+1))
  else
    pending="$pending $name"
  fi
done

# Apply in repeated passes rather than a fixed order.
#
# Some objects still reference another service's schema — booking's
# check_unit_availability() function queries venue.bookable_units, and Postgres
# validates function bodies at creation — so a service can fail purely because a
# dependency has not been created yet. Retrying until no further progress is made
# converges regardless of ordering, and avoids hard-coding a dependency graph that
# would go stale. (Those cross-schema references are themselves being removed —
# see docs/architecture/cross-schema-coupling-inventory.md.)
applied=0; pass=0
while [ -n "${pending// /}" ]; do
  pass=$((pass+1))
  progressed=0; still=""
  for name in $pending; do
    # Give each service its OWN _prisma_migrations table by pinning the
    # connection's schema. Without this all 15 share public._prisma_migrations,
    # which breaks two ways: identical migration names collide (one service's
    # baseline makes every other service think it is already applied), and a
    # single failed migration returns P3009 for every other service.
    sch=$(grep -m1 'schemas *=' "$ROOT/services/$name/prisma/schema.prisma" \
          | sed 's|//.*||' | grep -oE '"[a-z_]+"' | head -1 | tr -d '"')
    sep='?'; case "$DATABASE_URL" in *\?*) sep='&';; esac
    svc_url="${DATABASE_URL}${sep}schema=${sch}"
    svc_direct="${DIRECT_DATABASE_URL}${sep}schema=${sch}"

    if out=$( cd "$ROOT/services/$name" && DATABASE_URL="$svc_url" DIRECT_DATABASE_URL="$svc_direct" npx prisma migrate deploy 2>&1 ); then
      echo "  ok:   $name (pass $pass)"
      applied=$((applied+1)); progressed=1
    else
      still="$still $name"
      reason=$(echo "$out" | grep -iE 'ERROR: ' | head -1 | sed 's/^ *//')
      echo "  wait: $name — ${reason:-see final report}"

      # Prisma runs each migration in a transaction, so a failure leaves no
      # objects behind — but it DOES leave a failed row, and that returns P3009
      # on every later attempt. Clear the marker so the next pass can retry once
      # the dependency it was waiting for exists.
      failed_mig=$(echo "$out" | grep -oE 'Migration name: [^ ]+' | awk '{print $3}' | head -1)
      if [ -n "$failed_mig" ]; then
        ( cd "$ROOT/services/$name" && DATABASE_URL="$svc_url" DIRECT_DATABASE_URL="$svc_direct" \
            npx prisma migrate resolve --rolled-back "$failed_mig" >/dev/null 2>&1 ) || true
      fi
    fi
  done
  pending="$still"
  if [ "$progressed" -eq 0 ]; then
    echo ""
    echo "  STUCK after $pass pass(es) — these could not be applied:$pending"
    for name in $pending; do
      echo "  --- $name ---"
      # Recompute the URL for THIS service. Reusing the loop's last $svc_url here
      # would run one service's migration against another's schema.
      dsch=$(grep -m1 'schemas *=' "$ROOT/services/$name/prisma/schema.prisma" \
             | sed 's|//.*||' | grep -oE '"[a-z_]+"' | head -1 | tr -d '"')
      dsep='?'; case "$DATABASE_URL" in *\?*) dsep='&';; esac
      ( cd "$ROOT/services/$name" \
        && DATABASE_URL="${DATABASE_URL}${dsep}schema=${dsch}" \
           DIRECT_DATABASE_URL="${DIRECT_DATABASE_URL}${dsep}schema=${dsch}" \
           npx prisma migrate deploy 2>&1 ) | grep -iE 'ERROR:|Database error' | head -4 | sed 's/^/        /'
    done
    exit 1
  fi
done

echo ""
echo "  services migrated: $applied   skipped: $skipped   passes: $pass"
