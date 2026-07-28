#!/usr/bin/env bash
#
# new-service.sh — scaffold a new blueprint-compliant NestJS service.
#
# Clones the template-service skeleton (the standard service shape), renames its tokens,
# and registers the service platform-wide (run-all.sh + build:services). Then run
# check-service.sh to confirm compliance.
#
# Usage:
#   ./scripts/new-service.sh <name> <port> [schema]
#     name   short service name, no "-service" suffix (e.g. notifications)
#     port   canonical port (must be unused — see CLAUDE.md port table)
#     schema Prisma schema namespace (default: <name>)

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

name="${1:-}"; port="${2:-}"; schema="${3:-${1:-}}"
if [ -z "$name" ] || [ -z "$port" ]; then
  echo "usage: $0 <name> <port> [schema]"; exit 1
fi
svc="${name}-service"
dir="$ROOT/services/$svc"
tmpl="$ROOT/services/template-service"

[ ! -e "$dir" ] || { echo "error: services/$svc already exists"; exit 1; }
[ -d "$tmpl" ] || { echo "error: template-service skeleton not found"; exit 1; }
if grep -q " [a-z-]*:$port" "$ROOT/scripts/run-all.sh"; then
  echo "error: port $port already assigned (see run-all.sh SERVICES / CLAUDE.md port table)"; exit 1
fi

echo "Scaffolding services/$svc  (port $port, schema '$schema')  from template-service ..."

# ── Copy the skeleton (exclude deps / build output / env / generated) ──────────
( cd "$tmpl" && find . -type f \
    -not -path './node_modules/*' -not -path './dist/*' \
    -not -path './prisma/generated/*' -not -path './src/generated/*' \
    -not -name '.env' -print0 | while IFS= read -r -d '' f; do
      mkdir -p "$dir/$(dirname "$f")"
      cp "$f" "$dir/$f"
    done )

# ── Rename tokens inside the new service ───────────────────────────────────────
Name="$(printf '%s' "$name" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"
perl -pi -e "s#\@clubspark/template-service#\@clubspark/$svc#g" "$dir/package.json"
perl -pi -e "s#'4000'#'$port'#g" "$dir/src/config/configuration.ts"
perl -pi -e "s/Template Service/$Name Service/g" "$dir/src/main.ts"
perl -pi -e "s/template-service/$svc/g" "$dir/src/health/health.controller.ts"
perl -pi -e 's/schemas  = \["public"\].*/schemas  = ["'"$schema"'"]/' "$dir/prisma/schema.prisma"

# ── Register platform-wide (reliable single-line edits) ────────────────────────
perl -pi -e "s/(SERVICES=\"[^\"]*)\"/\$1 $name:$port\"/" "$ROOT/scripts/run-all.sh"
perl -pi -e "s#(\"build:services\": \"[^\"]*)\"#\$1 && npm run build --workspace=services/$svc\"#" "$ROOT/package.json"
# Best-effort CLAUDE.md port-table row (appended after the last service row).
perl -0777 -pi -e "s/(\n\| integration-service \| 4016 \|)/\$1\n| $svc | $port |/" "$ROOT/CLAUDE.md" || true

echo ""
echo "Scaffolded. Registered in run-all.sh + build:services."
echo "Next:"
echo "  1. Add the CLAUDE.md port-table row if not auto-added:  | $svc | $port |"
echo "  2. cp services/$svc/.env.example services/$svc/.env   (fill Supabase DATABASE_URL etc.)"
echo "  3. npm install"
echo "  4. npm run prisma:generate --workspace=services/$svc"
echo "  5. ./scripts/check-service.sh $name        # verify blueprint compliance"
echo "  6. npm run build --workspace=services/$svc"
echo "  7. define the schema in services/$svc/prisma/schema.prisma, then build your modules"
