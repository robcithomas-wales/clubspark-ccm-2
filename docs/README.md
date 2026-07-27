# Platform Documentation

Technical specifications and architectural decisions for the Club and Coach platform.

## Ways of working

| Document | Description |
|---|---|
| [agentic-engineering.md](agentic-engineering.md) | How we drive the repo with Claude Code — shared config, slash commands, worktrees for parallel work |

## Engineering standards

| Document | Description |
|---|---|
| [engineering/coding-standards.md](engineering/coding-standards.md) | Layering, DTO validation, ESM, Prisma, ports |
| [engineering/security-and-data-boundaries.md](engineering/security-and-data-boundaries.md) | Multi-tenant isolation, secret handling, client/server boundary |
| [engineering/testing-strategy.md](engineering/testing-strategy.md) | Pool-safe service tests + Playwright e2e |
| [engineering/ai-provider-operations.md](engineering/ai-provider-operations.md) | Provisioning/operating Anthropic access for AI features |

## Architecture

| Document | Description |
|---|---|
| [architecture/platform-architecture.md](architecture/platform-architecture.md) | Platform architecture, service responsibilities, DB schemas, and phased implementation plan |
| [architecture/azure-reference-architecture.md](architecture/azure-reference-architecture.md) | Azure hybrid serverless reference architecture for the platform |
| [architecture/azure-aks-reference-architecture.md](architecture/azure-aks-reference-architecture.md) | Azure AKS reference architecture with Kubernetes-hosted services |

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

## Migration

| Document | Description |
|---|---|
| [migration/comms-azure-migration.md](migration/comms-azure-migration.md) | Azure migration plan for the comms service |

## Assets

| Asset | Description |
|---|---|
| [architecture/azure-reference-architecture.svg](architecture/azure-reference-architecture.svg) | Visual of the Azure reference architecture |
| [architecture/azure-aks-reference-architecture.svg](architecture/azure-aks-reference-architecture.svg) | Visual of the Azure AKS reference architecture |
