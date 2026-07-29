---
description: Scaffold a feature spec in docs/specs/ in the standard shape
---

Create a new feature specification for **$1** at `docs/specs/<slug>-spec.md` (slugify `$1`,
lower-kebab). This is the "promise" `@product-reviewer` will later check the implementation
against, so structure it like the existing specs.

1. **Match the house style** — read an existing spec (e.g. `docs/specs/rankings-spec.md`) and
   mirror its header block and section layout exactly.
2. **Header** — title `# Club & Coach — $1 Specification`, then a blockquote with
   **Status:** `Proposed`, **Author**, **Date**, **Audience:** CPO, engineering.
3. **Sections** — include the standard set, adapting to the feature:
   1. Overview (what it is, who it's for, what this spec covers)
   2. Scope / what's included (and explicitly what's out)
   3. Domain rules / behaviour (the acceptance criteria — the specific rules that must hold)
   4. Data Model
   5. Service Architecture (which service owns it; cross-service events)
   6. API Design (endpoints, DTO shapes)
   7. Admin Portal
   8. Customer Portal
   9. Mobile App
   10. Implementation Plan (phases)
   11. Open Questions
   12. Effort Estimate
4. **Fill what I've told you; leave the rest as clearly-marked `TODO` / `Open Question`** — do
   **not** invent product decisions. Where a choice is needed, list it under Open Questions rather
   than silently deciding.
5. Keep every surface section (7–9) honest about what that surface will and won't get, so scope
   is explicit from day one.

Report the file path and list every `TODO`/Open Question I still need to resolve. Don't set
Status beyond `Proposed` — that changes only when the feature actually ships.
