#!/usr/bin/env bash
#
# lint-changed.sh — lint only the files this branch changes.
#
# This mirrors what CI gates on (.github/workflows/ci.yml, "Lint changed files").
# `npm run lint` over the whole repo reports ~15k pre-existing problems, almost
# all Prettier formatting, so it is useless as a signal: mass-fixing them would
# produce an unreviewable diff that collides with every open branch. Running the
# same narrow check locally tells you whether *your* change is clean.
#
# Usage:
#   npm run lint:changed              # vs origin/main (or main)
#   BASE=some-branch npm run lint:changed
#
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Prefer the remote main so a stale local main does not widen the diff.
if [ -z "${BASE:-}" ]; then
  if git rev-parse --verify --quiet origin/main >/dev/null; then
    BASE="origin/main"
  else
    BASE="main"
  fi
fi

if ! git rev-parse --verify --quiet "$BASE" >/dev/null; then
  echo "BASE '$BASE' is not a valid ref" >&2
  exit 1
fi

# `mapfile` is a bash 4 builtin and macOS ships bash 3.2, so collect with a
# while-read loop instead. Both the committed diff vs BASE and uncommitted work
# are included — the point is to check before you push.
all=()
add_file() {
  [ -n "$1" ] || return 0
  [ -f "$1" ] || return 0   # skip files deleted since
  case " ${all[*]-} " in *" $1 "*) return 0 ;; esac
  all+=("$1")
}

while IFS= read -r f; do add_file "$f"; done <<EOF
$(git diff --name-only --diff-filter=ACMR "$BASE" HEAD -- '*.ts' '*.tsx' '*.mjs' 2>/dev/null \
    | grep -Ev '(generated|dist|node_modules|\.next)/' || true)
$(git diff --name-only --diff-filter=ACMR -- '*.ts' '*.tsx' '*.mjs' 2>/dev/null \
    | grep -Ev '(generated|dist|node_modules|\.next)/' || true)
EOF

if [ ${#all[@]} -eq 0 ]; then
  echo "No changed lintable files vs $BASE — nothing to do."
  exit 0
fi

echo "Linting ${#all[@]} changed file(s) vs $BASE:"
printf '  %s\n' "${all[@]}"
echo

NODE_OPTIONS=--max-old-space-size=8192 npx eslint "${all[@]}"
