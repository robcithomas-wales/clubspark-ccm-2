# Club & Coach — Rankings System Specification

> **Status:** Proposed
> **Author:** Engineering
> **Date:** March 2026
> **Audience:** CPO, engineering

---

## 1. Overview

The Rankings system provides automated, sport-appropriate player and team rankings derived from competition results. Rankings update automatically when match results are verified and give clubs a live league table of performance across their competitions.

This spec covers:
- What gets ranked and at what scope
- The two ranking algorithms (Points Table and ELO Rating)
- Data model
- API design
- Admin portal integration
- Customer portal and mobile app exposure
- Implementation plan

---

## 2. What Gets Ranked

### 2.1 Ranking subjects

| Subject | When used |
|---|---|
| **Individual player** (`personId`) | Individual sports: tennis, squash, padel, badminton |
| **Doubles pair** (`personId` + partner) | Doubles formats |
| **Team** (`teamId`) | Team sports: football, rugby, cricket, hockey, netball |

Rankings are scoped to a **sport** within a **tenant**. A player may have separate rankings for tennis and squash. A team may have separate rankings in different seasons.

### 2.2 Ranking scope options

| Scope | Description |
|---|---|
| **Division** | Within a single competition division (default — already covered by `standings`) |
| **Competition** | Across all divisions of one competition |
| **Season** | Across all competitions in a defined season string (e.g. "2026 Spring") |
| **All-time** | Career aggregate across all competitions for the tenant |

Season and all-time rankings are the new capability — division-level standings already exist.

---

## 3. Ranking Algorithms

### 3.1 Points Table (team sports and league formats)

Used for: football, rugby, cricket, hockey, netball, basketball — and any LEAGUE format competition.

**How it works:**
- Win → N points (configurable per competition, default 3)
- Draw → 1 point
- Loss → 0 points
- Ranking order: points → goal difference → goals scored → head-to-head

Points-table rankings aggregate across competitions in a season or all-time by summing all match outcomes.

**Pros:** Universally understood, directly mirrors what clubs are used to. Already partially implemented in `standings` per division.

**Cons:** Does not account for opponent strength — a win against the bottom team is worth the same as a win against the top team.

### 3.2 ELO Rating (individual sports and knockout formats)

Used for: tennis, squash, padel, badminton — and any KNOCKOUT or ROUND_ROBIN format.

**How it works:**

Starting rating: **1000** for all new entrants.

After each match:

```
Expected score: E_a = 1 / (1 + 10^((R_b - R_a) / 400))
New rating:     R_a' = R_a + K × (S_a - E_a)
```

Where:
- `R_a`, `R_b` = current ratings of player A and B
- `S_a` = actual score (1 = win, 0.5 = draw, 0 = loss)
- `K` = K-factor (sensitivity constant)

**K-factor by competition maturity:**

| Condition | K |
|---|---|
| Fewer than 10 rated matches | 40 (fast calibration) |
| 10–29 rated matches | 30 |
| 30+ rated matches | 20 (stable) |

**Pros:** Accounts for opponent strength. Rewards playing up, punishes losing to weaker opponents. Industry standard for racket sports (ATP, WTA, FIDE chess).

**Cons:** Slightly harder to explain to casual users. Requires a minimum match history to be meaningful (hence provisional flag on < 5 matches).

### 3.3 Algorithm selection per competition

The algorithm is set at the **Competition** level and defaults based on format:

| Competition format | Default algorithm |
|---|---|
| LEAGUE | POINTS_TABLE |
| ROUND_ROBIN | POINTS_TABLE |
| GROUP_KNOCKOUT | POINTS_TABLE (group stage) / ELO (overall) |
| KNOCKOUT | ELO |
| SWISS | ELO |
| LADDER | ELO |

An admin can override the default per competition.

---

## 4. Data Model

### 4.1 New Prisma models (within `competition-service`, `competitions` schema)

```prisma
enum RankingAlgorithm {
  POINTS_TABLE
  ELO
  @@schema("competitions")
}

enum RankingScope {
  COMPETITION   // across all divisions of one competition
  SEASON        // across all competitions in a season string
  ALL_TIME      // all competitions for the tenant
  @@schema("competitions")
}

model RankingConfig {
  id            String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId      String            @map("tenant_id") @db.Uuid
  sport         String            // tennis | football | etc.
  scope         RankingScope
  algorithm     RankingAlgorithm
  season        String?           // e.g. "2026 Spring" — required when scope = SEASON
  pointsPerWin  Int               @default(3) @map("points_per_win")
  eloKFactor    Int?              @map("elo_k_factor")  // null = auto by match count
  createdAt     DateTime          @default(now()) @map("created_at")
  updatedAt     DateTime          @default(now()) @updatedAt @map("updated_at")

  entries RankingEntry[]

  @@map("ranking_configs")
  @@schema("competitions")
  @@index([tenantId, sport, scope])
}

model RankingEntry {
  id              String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  configId        String        @map("config_id") @db.Uuid
  tenantId        String        @map("tenant_id") @db.Uuid
  personId        String?       @map("person_id") @db.Uuid   // for individual rankings
  teamId          String?       @map("team_id") @db.Uuid     // for team rankings
  displayName     String        @map("display_name")          // denormalised
  sport           String

  // ELO fields
  eloRating       Int           @default(1000) @map("elo_rating")
  eloProvisional  Boolean       @default(true) @map("elo_provisional") // < 5 matches

  // Points Table fields
  matchesPlayed   Int           @default(0) @map("matches_played")
  wins            Int           @default(0)
  draws           Int           @default(0)
  losses          Int           @default(0)
  points          Int           @default(0)
  goalsFor        Int           @default(0) @map("goals_for")
  goalsAgainst    Int           @default(0) @map("goals_against")
  goalDifference  Int           @default(0) @map("goal_difference")

  rank            Int?          // computed, stored for fast read
  previousRank    Int?          @map("previous_rank")
  rankChange      Int?          @map("rank_change")  // positive = moved up
  lastMatchAt     DateTime?     @map("last_match_at")
  updatedAt       DateTime      @default(now()) @updatedAt @map("updated_at")

  config RankingConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

  @@map("ranking_entries")
  @@schema("competitions")
  @@unique([configId, personId])
  @@unique([configId, teamId])
  @@index([configId, rank])
  @@index([tenantId, sport])
}

model RankingMatchEvent {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  configId        String   @map("config_id") @db.Uuid
  matchResultId   String   @map("match_result_id") @db.Uuid
  entryId         String   @map("entry_id") @db.Uuid    // RankingEntry
  opponentEntryId String?  @map("opponent_entry_id") @db.Uuid
  ratingBefore    Int?     @map("rating_before")
  ratingAfter     Int?     @map("rating_after")
  ratingChange    Int?     @map("rating_change")
  pointsAwarded   Int?     @map("points_awarded")
  processedAt     DateTime @default(now()) @map("processed_at")

  @@map("ranking_match_events")
  @@schema("competitions")
  @@index([configId])
  @@index([matchResultId])
}
```

### 4.2 Competition model addition

Add `rankingAlgorithm` field to the existing `Competition` model:

```prisma
rankingAlgorithm  RankingAlgorithm? @map("ranking_algorithm")
```

---

## 5. Service Architecture

Rankings live in `competition-service` as a new `RankingsModule`.

### 5.1 Recalculation trigger

When a match result moves to `VERIFIED` status (in `StandingsService.recalculate`), also call `RankingsService.processMatchResult(matchResult)`.

This is fire-and-forget within the same request — no separate job queue needed at this scale. At higher scale, push to a queue (Azure Service Bus).

### 5.2 Recalculation logic

```
processMatchResult(matchResult):
  1. Find all RankingConfigs for this tenant + sport that include this match's competition
  2. For each config:
     a. Find or create RankingEntry for home and away competitor
     b. Apply algorithm (ELO or POINTS_TABLE) to update entry stats
     c. Store RankingMatchEvent for audit trail
     d. Recalculate rank order across all entries for this config
     e. Write rank + rank_change back to RankingEntry
```

ELO recalculation is incremental (update on each result). Points Table recalculation is also incremental (add match outcome to running totals).

Full recalculation from scratch (for corrections/disputes) is also supported via `POST /rankings/:configId/recalculate` — replays all `RankingMatchEvent` records.

---

## 6. API Design

All routes under `competition-service` (port 4009).

### 6.1 Ranking Configs

```
POST   /rankings/configs                     Create a ranking config
GET    /rankings/configs                     List configs for tenant (filter by sport, scope)
GET    /rankings/configs/:id                 Get config detail
PATCH  /rankings/configs/:id                 Update config (algorithm, pointsPerWin, etc.)
DELETE /rankings/configs/:id                 Delete config
```

### 6.2 Rankings (leaderboard read)

```
GET    /rankings/:configId                   Ranked leaderboard for a config
GET    /rankings/:configId/entries/:entryId  Single competitor ranking detail + match history
POST   /rankings/:configId/recalculate       Full recalculation from match events (admin)
```

**Leaderboard response shape:**

```json
{
  "config": {
    "id": "...",
    "sport": "tennis",
    "scope": "SEASON",
    "season": "2026 Spring",
    "algorithm": "ELO"
  },
  "data": [
    {
      "rank": 1,
      "previousRank": 2,
      "rankChange": 1,
      "displayName": "Alice Smith",
      "personId": "...",
      "eloRating": 1147,
      "eloProvisional": false,
      "matchesPlayed": 12,
      "wins": 9,
      "losses": 3,
      "lastMatchAt": "2026-03-21T14:00:00Z"
    }
  ],
  "total": 24,
  "updatedAt": "2026-03-27T16:00:00Z"
}
```

### 6.3 Query parameters (leaderboard)

| Param | Type | Description |
|---|---|---|
| `limit` | int | Max entries to return (default 50) |
| `offset` | int | Pagination |
| `sport` | string | Filter by sport |
| `provisional` | bool | Include/exclude provisional entries |

---

## 7. Admin Portal

### 7.1 New page: `/rankings`

A rankings management and leaderboard page.

**Layout:**
- Top: ranking config selector (sport, scope, season) with "Create Config" button
- Selected config summary: algorithm, scope, total entries, last updated
- Leaderboard table: rank, Δ rank (arrow up/down/same), display name, rating/points, W/D/L, matches played, last match date
- Config management: edit algorithm, points-per-win, ELO K-factor, or delete

**Leaderboard table design:**
- Rank badge (gold/silver/bronze for top 3)
- Rank change indicator: ▲ green / ▼ red / — grey
- Provisional badge on ELO entries with < 5 matches
- Click-through to person or team detail

### 7.2 Dashboard addition

Add a Rankings card to the "What this pilot demonstrates" section, and a Rankings row in the Teams, Coaching & Competitions snapshot section.

### 7.3 Reports addition

Add a **Rankings Report** page (`/reports/rankings`) covering:
- Top N leaderboard by sport and scope
- Rating distribution histogram
- Most improved (biggest rank change in last 30 days)
- Most active (most matches played)
- CSV export

---

## 8. Customer Portal

### 8.1 Public rankings page

At `/[slug]/rankings`, show:
- Sport selector (tabs: tennis, football, squash, etc.)
- Scope selector: Season / All-time
- Leaderboard table (read-only, public)

No auth required — rankings are public by default (configurable per config).

### 8.2 Individual profile integration

On a player's public profile (if one exists), show their current ranking in each sport they have competed in.

---

## 9. Mobile App

### 9.1 Rankings tab or section

Within the Competitions tab, add a "Rankings" section:
- Sport picker
- Leaderboard list with rank, name, and rating/points
- Highlight the signed-in user's own row

---

## 10. Implementation Plan

### Phase 1 — Core engine (competition-service)
- [ ] Prisma migration: `ranking_configs`, `ranking_entries`, `ranking_match_events`
- [ ] `RankingsModule`: repository, service, controller
- [ ] ELO algorithm implementation + unit tests
- [ ] Points Table algorithm implementation + unit tests
- [ ] Hook into `StandingsService.recalculate` to call `RankingsService.processMatchResult`
- [ ] Integration tests: create config, verify result, assert ranking updates
- [ ] API: config CRUD + leaderboard GET

### Phase 2 — Admin portal
- [ ] `/rankings` page: config management + leaderboard table
- [ ] Dashboard additions
- [ ] Rankings report page

### Phase 3 — Customer portal + mobile
- [ ] `/[slug]/rankings` public leaderboard page
- [ ] Mobile app rankings section within Competitions tab

### Phase 4 — Advanced
- [ ] Head-to-head filtering
- [ ] "Most improved" and "most active" computed views
- [ ] Dispute handling: when a result is disputed, reverse the rating change
- [ ] Season rollover: archive old season rankings, start fresh ELO (or carry over with decay)
- [ ] Rating decay for inactive players (optional — after N days without a match, slowly pull rating toward 1000)

---

## 11. Open Questions

1. **Public vs private** — should all rankings be public, or should clubs be able to make them private (members only)?
2. **Doubles** — how do doubles pair rankings work? Two individual people share one rating? Or separate doubles/singles ratings?
3. **Season definition** — is a season a free-text string on Competition (already exists), or do we need a dedicated Season model that groups competitions?
4. **ELO starting point** — should new entrants always start at 1000, or should there be seeding based on external ranking data (e.g. national rating)?
5. **Walkover/bye results** — do these count for ELO? Suggest: walkovers count as a win/loss, byes are excluded.
6. **Team ELO** — team ELO is unusual; most clubs would prefer Points Table for team sports. Recommend defaulting all TEAM entry type competitions to POINTS_TABLE and making ELO opt-in.

---

## 12. Effort Estimate

| Phase | Effort |
|---|---|
| Phase 1 — Core engine + tests | 1 session |
| Phase 2 — Admin portal | 1 session |
| Phase 3 — Customer + mobile | 0.5 session |
| Phase 4 — Advanced features | 1 session |

Phase 1 is the value-unlock — the engine, API, and integration tests. Phases 2–4 are UI layers on top of a working backend.

---

*Spec written March 2026.*
