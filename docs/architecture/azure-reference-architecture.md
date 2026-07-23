# Azure Reference Architecture

This diagram describes the recommended hybrid serverless deployment for the ClubSpark platform.

```mermaid
flowchart TB
  users["Club admins, members, staff<br/>Web and mobile clients"]

  subgraph edge["Edge and API access"]
    fd["Azure Front Door<br/>CDN, WAF, TLS, global routing"]
    apim["Azure API Management<br/>Authentication, rate limits, API versions"]
    swa["Azure Static Web Apps<br/>Admin, customer and internal portals"]
  end

  subgraph app["Private Azure Container Apps environment"]
    core["Core domain APIs<br/>Booking, venue, people, membership,<br/>entitlement, order and payment"]
    sport["Sport domain APIs<br/>Coaching, teams and competitions"]
    platform["Platform APIs<br/>Admin and templates"]
  end

  subgraph serverless["Serverless processing"]
    functions["Azure Functions - Flex Consumption<br/>Comms, reminders, expiry, webhooks,<br/>accounting sync, cache invalidation"]
    durable["Durable Functions<br/>Renewals, refunds and long-running workflows"]
    jobs["Azure Container Apps Jobs<br/>Scoring, forecasting and batch analytics"]
  end

  subgraph messaging["Asynchronous backbone"]
    sb["Azure Service Bus<br/>Topics, queues, scheduled messages and DLQs"]
    outbox["Transactional outbox<br/>Reliable domain event publication"]
  end

  subgraph data["Managed data services"]
    pg["Azure Database for PostgreSQL Flexible Server<br/>Private endpoint, HA, PgBouncer and read replica"]
    redis["Azure Managed Redis<br/>Availability, rules and entitlement cache"]
    storage["Azure Blob Storage<br/>Exports, media and integration payloads"]
  end

  subgraph operations["Security and operations"]
    kv["Azure Key Vault<br/>Secrets, keys and certificates"]
    mi["Managed identities and RBAC"]
    monitor["Azure Monitor, Application Insights<br/>Log Analytics and OpenTelemetry"]
    acr["Azure Container Registry"]
    cicd["GitHub Actions or Azure DevOps<br/>Build, test, scan and deploy"]
  end

  external["External providers<br/>Stripe, GoCardless, email, SMS,<br/>Xero, QuickBooks and partner webhooks"]

  users --> fd
  fd --> swa
  fd --> apim
  swa --> apim
  apim --> core
  apim --> sport
  apim --> platform

  core --> pg
  sport --> pg
  platform --> pg
  core <--> redis
  sport <--> redis

  core --> outbox
  sport --> outbox
  platform --> outbox
  outbox --> sb
  sb --> functions
  sb --> durable
  sb --> jobs
  functions --> sb
  durable --> sb

  functions --> pg
  durable --> pg
  jobs --> pg
  functions --> storage
  functions <--> external
  core <--> external

  kv -.-> core
  kv -.-> functions
  mi -.-> app
  mi -.-> serverless
  monitor -.-> app
  monitor -.-> serverless
  cicd --> acr
  acr --> app
  acr --> jobs
```

## Deployment Principles

- Keep synchronous NestJS domain APIs in Azure Container Apps.
- Use Azure Functions for short, event-driven and scheduled processing.
- Use Container Apps Jobs for heavier analytics and batch workloads.
- Publish domain events through a transactional outbox and Azure Service Bus.
- Keep all application services private behind API Management and Front Door.
- Use managed identities and Key Vault instead of application-held credentials.
- Connect Prisma workloads through PgBouncer and cap per-instance concurrency.

The presentation-ready SVG version is in [`azure-reference-architecture.svg`](./azure-reference-architecture.svg).
