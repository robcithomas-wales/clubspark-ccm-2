# Platform Documentation

Technical specifications and architectural decisions for the Club and Coach platform.

## Ways of working

| Document | Description |
|---|---|
| [agentic-engineering.md](agentic-engineering.md) | How we drive the repo with Claude Code — shared config, slash commands, worktrees for parallel work |

## Product and architecture decisions

| Document | Description |
|---|---|
| [decisions/2026-08-24-cpo-product-architecture-decisions.md](decisions/2026-08-24-cpo-product-architecture-decisions.md) | CPO responses to the CCM 2.0 product-docs vs pilot-build engineering review; confirmed direction, open decisions and actions |

## Engineering standards

| Document | Description |
|---|---|
| [engineering/architecture-principles.md](engineering/architecture-principles.md) | Enforceable architectural invariants — service boundaries, layering, module independence |
| [engineering/coding-standards.md](engineering/coding-standards.md) | Layering, DTO validation, ESM, Prisma, ports |
| [engineering/security-and-data-boundaries.md](engineering/security-and-data-boundaries.md) | Multi-tenant isolation, secret handling, client/server boundary |
| [engineering/testing-strategy.md](engineering/testing-strategy.md) | Pool-safe service tests + Playwright e2e |
| [engineering/ai-provider-operations.md](engineering/ai-provider-operations.md) | Provisioning/operating Anthropic access for AI features |
| [engineering/azure-migration-runbook.md](engineering/azure-migration-runbook.md) | Leaving Supabase for Azure — Postgres and Auth, what is done and what is not |

## Architecture

| Document | Description |
|---|---|
| [architecture/current-reference-architecture.md](architecture/current-reference-architecture.md) | Current implemented platform: clients, service boundaries, data ownership, commerce, projections, durable events and scheduled-work coordination |
| [architecture/platform-architecture.md](architecture/platform-architecture.md) | Platform architecture, service responsibilities, DB schemas, and phased implementation plan |
| [architecture/data-classification.md](architecture/data-classification.md) | Which data is global vs regional — the residency boundary, per entity |
| [architecture/azure-reference-architecture.md](architecture/azure-reference-architecture.md) | Azure hybrid serverless reference architecture for the platform |
| [architecture/azure-aks-reference-architecture.md](architecture/azure-aks-reference-architecture.md) | Azure AKS reference architecture with Kubernetes-hosted services |
| [roadmap/architecture-hardening-todo.md](roadmap/architecture-hardening-todo.md) | Ordered engineering TODO for making the pilot architecture production- and multi-region-ready |

## Specifications

| Document | Description |
|---|---|
| [specs/people-platform-spec.md](specs/people-platform-spec.md) | People Platform evolution into a full People Operating System |
| [specs/rankings-spec.md](specs/rankings-spec.md) | Rankings system specification: ELO, points tables, leaderboards, match tracking |
| [specs/error-triage-service-spec.md](specs/error-triage-service-spec.md) | Error triage service specification for AI-assisted incident routing |
| [specs/customer-support-ai-spec.md](specs/customer-support-ai-spec.md) | Customer support AI agent specification for account-aware support workflows |

## Reference

| Document | Description |
|---|---|
| [reference/platform-features.md](reference/platform-features.md) | Full feature inventory across services, portals, and mobile app |
| [reference/platform-domain-inventory.md](reference/platform-domain-inventory.md) | Domain inventory for all major platform areas |
| [reference/pilot-hierarchy-and-membership.md](reference/pilot-hierarchy-and-membership.md) | CPO review aid: hierarchy and membership models implemented in the pilot, with target gaps and terminology questions |

## Migration

| Document | Description |
|---|---|
| [migration/comms-azure-migration.md](migration/comms-azure-migration.md) | Azure migration plan for the comms service |

## Assets

| Asset | Description |
|---|---|
| [architecture/azure-reference-architecture.svg](architecture/azure-reference-architecture.svg) | Visual of the Azure reference architecture |
| [architecture/azure-aks-reference-architecture.svg](architecture/azure-aks-reference-architecture.svg) | Visual of the Azure AKS reference architecture |
