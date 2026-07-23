#!/usr/bin/env bash
#
# agent-worktree.sh — create an isolated git worktree so multiple engineers/agents can
# work on the ClubSpark monorepo at the same time without colliding in one checkout.
#
# Usage:
#   ./scripts/agent-worktree.sh <branch-name> [base-branch]
#   ./scripts/agent-worktree.sh --list
#   ./scripts/agent-worktree.sh --remove <branch-name>
#
# Worktrees are created as siblings of this repo under ../worktrees/<branch-name>.
# Each is a full working copy on its own branch — open a Claude Code session in it and
# it picks up the same committed CLAUDE.md / .claude config automatically.

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
repo_name="$(basename "$repo_root")"
worktrees_dir="$(dirname "$repo_root")/worktrees"

usage() {
  grep '^#' "$0" | sed 's/^# \{0,1\}//' | sed '1d'
  exit "${1:-0}"
}

cmd="${1:-}"

case "$cmd" in
  ""|-h|--help)
    usage 0
    ;;

  --list)
    git -C "$repo_root" worktree list
    ;;

  --remove)
    branch="${2:-}"
    [ -n "$branch" ] || { echo "error: --remove needs a branch name" >&2; exit 1; }
    path="$worktrees_dir/$branch"
    git -C "$repo_root" worktree remove "$path"
    echo "Removed worktree at $path (branch '$branch' still exists — delete with 'git branch -d $branch')"
    ;;

  *)
    branch="$cmd"
    base="${2:-main}"
    path="$worktrees_dir/$branch"

    if [ -e "$path" ]; then
      echo "error: $path already exists" >&2
      exit 1
    fi

    mkdir -p "$worktrees_dir"

    # Reuse the branch if it exists, otherwise create it from the base branch.
    if git -C "$repo_root" show-ref --verify --quiet "refs/heads/$branch"; then
      git -C "$repo_root" worktree add "$path" "$branch"
    else
      git -C "$repo_root" worktree add -b "$branch" "$path" "$base"
    fi

    echo ""
    echo "Worktree ready:"
    echo "  path:   $path"
    echo "  branch: $branch (from $base)"
    echo ""
    echo "Next:"
    echo "  cd \"$path\""
    echo "  npm install        # workspaces install for this copy"
    echo "  claude             # start an agent session here"
    echo ""
    echo "Note: node_modules and Prisma clients are per-worktree — run 'npm install'"
    echo "and 'prisma:generate' in the new worktree before running services."
    ;;
esac
