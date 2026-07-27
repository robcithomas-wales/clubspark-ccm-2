# AI Provider Operations

How AI features on the ClubSpark platform get access to Claude, and how to operate that
access. Written from real incidents — read it before wiring up or debugging an AI feature.

## Where AI is used today

The in-portal support assistant in both the **customer portal** and **admin portal**
(`app/api/support/chat/route.ts`) calls the Anthropic API via `@anthropic-ai/sdk`, reading
`ANTHROPIC_API_KEY`.

## The key must come from the ClubSpark Anthropic API organization

- Use **one key, issued from the ClubSpark Anthropic *API* organization** — never a personal
  Anthropic account. A personal key bills an individual and dies when that account runs out of
  credit.
- The Anthropic **API** (console.anthropic.com → API keys, pay-as-you-go) is a **different
  product** from a Claude **subscription** (claude.ai / Claude Code seats). Having a ClubSpark
  Claude subscription does **not** imply an API organization exists — API billing is provisioned
  separately. Confirm the API org has credit or a billing plan.
- The key lives in each portal's `.env.local` as `ANTHROPIC_API_KEY` (server-side only — **not**
  `NEXT_PUBLIC_`). The app currently runs locally, so the key lives only in `.env.local`; when
  the platform deploys to **Azure** (the near-term target) it moves to Azure Key Vault.

## Operational gotchas (learned the hard way)

- **"Your credit balance is too low"** is a **billing** error on the org, *not* a bad key.
  Issuing a *new* key from the same unfunded org changes nothing — the fix is to add
  credit / a billing plan in that org's **Plans & Billing**. Once funded, the existing key
  just starts working; no code change.
- An **auth** error (401) means the key value is wrong (e.g. a key *id* was copied instead of
  the secret) — that's a key problem, back to whoever issued it.
- The chat route already fails safe: no key → `503`; any API error → a generic
  "Something went wrong" to the user, with the real error logged server-side. Keep raw
  provider errors out of the user-facing response.

## Model selection

Model ids and provider specifics change. Do **not** hard-code model choices from memory —
consult the current model reference (the `claude-api` skill / Anthropic model docs) when
choosing or upgrading a model, and prefer the latest capable model unless a feature needs a
specific one.

## Adding a new AI feature — checklist

1. Read the key from `process.env.ANTHROPIC_API_KEY`, server-side only.
2. Add `ANTHROPIC_API_KEY` to the relevant `.env.local.example` with a placeholder.
3. Fail safe: no key → clear "unavailable" state; provider error → friendly message + logged detail.
4. Never expose the key or raw provider errors to the client.
