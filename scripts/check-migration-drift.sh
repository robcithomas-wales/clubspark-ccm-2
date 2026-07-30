#!/usr/bin/env bash
#
# check-migration-drift.sh — fail if any service's migrations no longer reproduce
# its schema.prisma.
#
# This is the guard that stops the platform sliding back into the state we found
# on 2026-07-30: six services whose tables existed only in the live database,
# because `prisma db push` applies a schema without recording a migration.
#
# It answers one question per service: "if I replay this service's migrations
# into an empty database, do I get exactly what schema.prisma describes?" A
# non-empty diff means someone changed schema.prisma without adding a migration.
#
# Needs a scratch database for Prisma to replay migrations into (the shadow
# database). It is created and dropped by Prisma; it never touches your real data.
#
# Usage:
#   SHADOW_DATABASE_URL=postgresql://... ./scripts/check-migration-drift.sh
#
# In CI this points at the ephemeral Postgres container. Locally, point it at any
# throwaway database — NOT at the shared Supabase instance.
#
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

: "${SHADOW_DATABASE_URL:?SHADOW_DATABASE_URL must be set (a throwaway database)}"

clean=0; drifted=0; skipped=0; drifted_names=""

for d in "$ROOT"/services/*/; do
  name="$(basename "$d")"

  if [ ! -d "$d/prisma/migrations" ] || [ -z "$(ls -A "$d/prisma/migrations" 2>/dev/null)" ]; then
    echo "  skip:  $name (no migrations — should not happen; see docs/engineering/database-migrations.md)"
    skipped=$((skipped+1))
    continue
  fi

  # --exit-code: 0 = no difference, 2 = differences found, 1 = error.
  out=$( cd "$d" && npx prisma migrate diff \
            --from-migrations prisma/migrations \
            --to-schema-datamodel prisma/schema.prisma \
            --shadow-database-url "$SHADOW_DATABASE_URL" \
            --exit-code --script 2>&1 )
  rc=$?

  case "$rc" in
    0) echo "  ok:    $name"; clean=$((clean+1)) ;;
    2) echo "  DRIFT: $name — schema.prisma is not reproduced by its migrations"
       echo "$out" | grep -vE '^\s*$' | head -15 | sed 's/^/           /'
       drifted=$((drifted+1)); drifted_names="$drifted_names $name" ;;
    *) echo "  ERROR: $name"; echo "$out" | tail -8 | sed 's/^/           /'
       drifted=$((drifted+1)); drifted_names="$drifted_names $name(error)" ;;
  esac
done

echo ""
echo "  clean: $clean   drifted: $drifted   skipped: $skipped"
if [ "$drifted" -ne 0 ]; then
  echo ""
  echo "  Drift in:$drifted_names"
  echo "  Fix by generating a migration for the change:"
  echo "    npm run prisma:migrate:dev --workspace=services/<name> -- --name <what_changed>"
  echo "  Never use \`prisma db push\` against a shared database — it applies schema"
  echo "  changes without recording them, which is how this drift happens."
  exit 1
fi
