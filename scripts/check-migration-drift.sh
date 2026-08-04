#!/usr/bin/env bash
#
# check-migration-drift.sh — fail if any service's schema.prisma disagrees with
# the database.
#
# This is the guard that stops the platform sliding back into the state we found
# on 2026-07-30, when `prisma db push` had been used to apply schema changes
# without recording migrations, and six services' tables existed only in the live
# database.
#
# HOW IT WORKS
#
# Run this against a database that was built BY scripts/migrate-all.sh (CI does
# exactly that, on a throwaway Postgres). Then:
#
#     migrations built this database   [migrate-all.sh]
#     this database == schema.prisma   [this script]
#     ⇒ migrations == schema.prisma
#
# A non-empty diff means someone changed schema.prisma without a migration, or
# changed the database without one.
#
# WHY NOT `--from-migrations` WITH A SHADOW DATABASE
#
# That is the more obvious formulation, but Prisma's shadow replay mishandles the
# pg_dump-generated baselines (it fails to register the CREATE SCHEMA and then
# reports every table as unqualified, producing a full drop-and-recreate diff for
# every service). Comparing against the already-built database is both accurate
# and cheaper.
#
# Usage:
#   DATABASE_URL=... ./scripts/check-migration-drift.sh
#
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

: "${DATABASE_URL:?DATABASE_URL must be set (a database built by scripts/migrate-all.sh)}"
export DIRECT_DATABASE_URL="${DIRECT_DATABASE_URL:-$DATABASE_URL}"

# Services with known, unreconciled drift. Reported, not fatal.
#
# EMPTY as of 2026-08-04 — every service's schema.prisma now matches the database
# exactly. Adding the 15 missing foreign keys is what made this possible:
# introspection cannot see a relation without one, so `db pull` used to drop the
# relation fields and break compilation.
#
# Keep it empty. Adding a name here silences a real signal — while this list held
# three services it masked the outbox tables being absent from schema.prisma, and
# only the one service NOT on the list failed the build.
KNOWN_DRIFT=""

clean=0; drifted=0; skipped=0; known=0; drifted_names=""; known_names=""

for d in "$ROOT"/services/*/; do
  name="$(basename "$d")"

  if [ ! -d "$d/prisma/migrations" ] || [ -z "$(ls -A "$d/prisma/migrations" 2>/dev/null)" ]; then
    echo "  skip:  $name (no migrations)"
    skipped=$((skipped+1))
    continue
  fi

  sch=$(grep -m1 'schemas *=' "$d/prisma/schema.prisma" | sed 's|//.*||' \
        | grep -oE '"[a-z_]+"' | head -1 | tr -d '"')
  sep='?'; case "$DATABASE_URL" in *\?*) sep='&';; esac
  url="${DATABASE_URL}${sep}schema=${sch}"

  # --exit-code: 0 = identical, 2 = differences, 1 = error.
  out=$( cd "$d" && DATABASE_URL="$url" DIRECT_DATABASE_URL="$url" \
           npx prisma migrate diff \
             --from-schema-datasource prisma/schema.prisma \
             --to-schema-datamodel prisma/schema.prisma \
             --exit-code --script 2>&1 )
  rc=$?

  case "$rc" in
    0) echo "  ok:    $name"; clean=$((clean+1)) ;;
    2) case " $KNOWN_DRIFT " in
         *" $name "*)
           echo "  known: $name (known drift, not yet reconciled — see KNOWN_DRIFT)"
           known=$((known+1)); known_names="$known_names $name" ;;
         *)
           echo "  DRIFT: $name"
           echo "$out" | grep -vE '^\s*$' | head -12 | sed 's/^/           /'
           drifted=$((drifted+1)); drifted_names="$drifted_names $name" ;;
       esac ;;
    *) echo "  ERROR: $name"; echo "$out" | tail -6 | sed 's/^/           /'
       drifted=$((drifted+1)); drifted_names="$drifted_names $name(error)" ;;
  esac
done

echo ""
echo "  clean: $clean   new drift: $drifted   known drift: $known   skipped: $skipped"
[ "$known" -ne 0 ] && echo "  known (tracked, not blocking):$known_names"
if [ "$drifted" -ne 0 ]; then
  echo ""
  echo "  Drift in:$drifted_names"
  echo ""
  echo "  If schema.prisma is right, generate a migration for the change:"
  echo "    npm run prisma:migrate:dev --workspace=services/<name> -- --name <what_changed>"
  echo "  If the DATABASE is right (it often is — e.g. timestamptz columns that the"
  echo "  schema file declares as bare DateTime), re-introspect instead:"
  echo "    npx prisma db pull    # from services/<name>"
  echo ""
  echo "  Never use \`prisma db push\` against a shared database — it applies schema"
  echo "  changes without recording them, which is how this drift happens."
  exit 1
fi
