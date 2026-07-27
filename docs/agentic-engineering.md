# Agentic Engineering — How We Work

This repo is set up to be driven by **Claude Code** as a shared, version-controlled
capability. Rather than each engineer maintaining a private agent rig, the agent's
knowledge of our platform and our standard workflows lives **in the repo** and is loaded
automatically for everyone. Improve it via PR, the same as any other code.

## Why this approach

We deliberately do **not** run a bespoke agent framework (the old `agent-starter/` Python
scaffold has been retired). Claude Code already provides planning, tool execution,
permissioning, human-in-the-loop approval, and cost control. Our job is to give it
**good, shared context** — not to rebuild the plumbing.

## What's committed (and why it matters)

| File / dir | Purpose |
|---|---|
| `CLAUDE.md` | Loaded every session. The platform map: services, ports, commands, conventions. Single source of truth. |
| `.claude/settings.json` | Shared team settings (permissions, allowed tools). |
| `.claude/commands/*.md` | Slash commands for our recurring workflows (`/new-endpoint`, `/service-test`, `/safe-push`). |
| `.claude/agents/*.md` | Reusable review roles (e.g. `service-reviewer`). |
| `scripts/agent-worktree.sh` | Spin up isolated worktrees for parallel work. |

**Machine-local / secret** files stay out of git: `.claude/settings.local.json`,
`.claude/*.local.json`, `.claude/local/`, and all `.env*` (except `.env.example`).

## Getting started (per engineer)

1. Install Claude Code and open the repo. `CLAUDE.md` and `.claude/` load automatically.
2. Put any personal permission overrides in `.claude/settings.local.json` (git-ignored).
3. Authorize the connectors you need — see **Connectors (MCP)** below.
4. Bootstrap the checkout: run `/setup-local` (installs deps, wires `.env` files, generates
   Prisma clients).
5. Try a workflow: `/service-test booking-service` or `/new-endpoint booking-service ...`.

## Connectors (MCP)

Connectors give the agent access to our tools (source control, infra, comms, data). They
are **per-user OAuth connectors authorized on claude.ai** (Settings → Connectors), *not*
project config — so they can't be committed here, and each engineer enables their own.
This list is the shared reference so everyone turns on the same set.

**ClubSpark connectors (most relevant to platform work):**

| Connector | Use it for |
|---|---|
| Clubspark Github | Repos, PRs, issues, code search |
| Clubspark SQL | Query platform SQL databases |
| Clubspark Mongo | Query Mongo data |
| Clubspark Databricks | Analytics / data platform |
| Clubspark Grafana | Dashboards, metrics, alerts |
| Clubspark Kubernetes | Cluster / workload inspection |
| Clubspark Octopus | Deployments / releases |
| Clubspark Cloudflare | DNS, CDN, edge config |
| Clubspark Comms | Comms platform |
| Clubspark Classic | Legacy platform |
| Clubspark VPN | Network access |

**General connectors also available:** Azure, Slack, Google Drive, Atlassian/Jira,
Linear, Notion, Figma, HubSpot, Intercom, and others.

Notes:
- Enable connectors from **claude.ai → Settings → Connectors**; some also work in an
  interactive CLI session via `/mcp` or `claude mcp`.
- Non-interactive / headless runs (cron, CI) may not have interactively-authorized
  connectors available — don't rely on them in automated agents.
- Never paste secrets, tokens, or connection strings into committed files to "share" a
  connector; authorization is always per-user.

## Working on the same solution at the same time

The rule: **one working copy per active agent session.** Two agents editing the same
checkout will trip over each other. Use git worktrees:

```bash
# create an isolated copy on a new branch
./scripts/agent-worktree.sh feature/my-thing

cd ../worktrees/feature/my-thing
npm install                 # per-worktree deps + Prisma client
claude                      # start the session here
```

Each worktree is a full copy on its own branch that still picks up the committed
`CLAUDE.md` / `.claude` config. List them with `./scripts/agent-worktree.sh --list`;
remove with `--remove <branch>`. Merge back through normal PRs.

Two engineers can each run several worktrees; nothing is shared except the git history
and the committed agent config — which is exactly what we want everyone to share.

## Keeping the shared config healthy

- If you change how a service runs, a port, or a convention → update `CLAUDE.md` in the
  same PR.
- If you find yourself pasting the same instructions to the agent repeatedly → turn it
  into a `.claude/commands/` slash command.
- If you want a consistent review lens → add/adjust a `.claude/agents/` role.
- Run the `service-reviewer` agent before opening a PR that touches `services/*`.

## AI features & API keys

Some product features call the **Anthropic API** directly — currently the in-portal
support assistant in both the customer portal and admin portal
(`app/api/support/chat/route.ts`), which reads `ANTHROPIC_API_KEY`.

Rules:
- **Use one key, from the ClubSpark Anthropic API organization** — never a personal
  Anthropic account. A personal key bills an individual and will fail with
  "credit balance too low" when that account runs dry.
- This is a **pay-as-you-go Anthropic *API* key** (console.anthropic.com → the ClubSpark
  API org → API Keys), which is a *different product* from the ClubSpark Claude
  subscription that powers Claude Code / claude.ai. Having a Claude subscription does
  not imply an API org exists — check/provision billing on the API org separately.
- The key goes in each portal's `.env.local` (git-ignored). It is **not** an
  `NEXT_PUBLIC_` var — it must stay server-side only; never expose it to the browser.
- The app currently runs locally, so it lives only in the git-ignored `.env.local`. When the
  platform deploys to Azure (the near-term target), it moves to Azure Key Vault.

The same ClubSpark API key can serve every AI feature across the platform.
