# Azure AKS Reference Architecture

This alternative hosts the synchronous ClubSpark services and selected workers on a private, multi-zone Azure Kubernetes Service cluster. Azure Functions remain available for lightweight integration and orchestration workloads.

```mermaid
flowchart TB
  users["Club admins, members, staff<br/>Web, mobile and partner clients"]

  subgraph edge["Edge and API access"]
    fd["Azure Front Door<br/>CDN, WAF, TLS and global routing"]
    swa["Azure Static Web Apps<br/>Admin, customer and internal portals"]
    apim["Azure API Management<br/>Authentication, rate limits and API versions"]
  end

  subgraph aks["Private multi-zone Azure Kubernetes Service cluster"]
    ingress["Application Gateway for Containers<br/>or managed NGINX ingress"]

    subgraph system["System node pool - 3 availability zones"]
      dns["CoreDNS and platform agents"]
      policy["Azure Policy, Defender and workload identity"]
    end

    subgraph apps["User node pools - 3 availability zones"]
      commerce["Commerce deployments<br/>Booking, order and payment"]
      customer["Customer deployments<br/>People, membership and entitlement"]
      sport["Sport deployments<br/>Venue, coaching, teams and competitions"]
      platform["Platform deployments<br/>Admin and templates"]
    end

    workers["KEDA-scaled workers<br/>Service Bus consumers"]
    cron["Kubernetes CronJobs<br/>Analytics and controlled batch work"]
    outbox["Transactional outbox dispatcher"]
  end

  subgraph serverless["Managed serverless workflows"]
    functions["Azure Functions - Flex Consumption<br/>External webhooks and lightweight integrations"]
    durable["Durable Functions<br/>Long-running renewal and refund workflows"]
  end

  subgraph messaging["Asynchronous backbone"]
    sb["Azure Service Bus<br/>Topics, queues, scheduling, retries and DLQs"]
  end

  subgraph data["Managed data services"]
    pg["Azure Database for PostgreSQL Flexible Server<br/>Private endpoint, HA, PgBouncer and read replica"]
    redis["Azure Managed Redis<br/>Availability, rules and entitlement cache"]
    storage["Azure Blob Storage<br/>Media, exports and integration payloads"]
  end

  subgraph operations["Security and operations"]
    kv["Azure Key Vault and Secrets Store CSI driver"]
    monitor["Azure Monitor, managed Prometheus,<br/>Grafana and Application Insights"]
    acr["Azure Container Registry"]
    gitops["GitHub Actions or Azure DevOps<br/>plus Flux GitOps"]
  end

  external["Stripe, GoCardless, email, SMS,<br/>Xero, QuickBooks and partner systems"]

  users --> fd
  fd --> swa
  fd --> apim
  swa --> apim
  apim --> ingress
  ingress --> commerce
  ingress --> customer
  ingress --> sport
  ingress --> platform

  commerce --> pg
  customer --> pg
  sport --> pg
  platform --> pg
  commerce <--> redis
  customer <--> redis
  sport <--> redis

  commerce --> outbox
  customer --> outbox
  sport --> outbox
  platform --> outbox
  outbox --> sb
  sb --> workers
  sb --> functions
  sb --> durable
  functions --> sb
  durable --> sb

  workers --> pg
  cron --> pg
  functions --> pg
  workers --> storage
  functions --> storage
  functions <--> external
  commerce <--> external

  kv -.-> aks
  kv -.-> serverless
  monitor -.-> aks
  monitor -.-> serverless
  gitops --> acr
  acr --> aks
```

## AKS Resilience Baseline

- Use a private Standard-tier AKS cluster with availability-zone-spanning system and user node pools.
- Run at least three replicas of critical APIs with topology spread constraints across zones.
- Apply pod disruption budgets, readiness/startup probes and rolling deployment safeguards.
- Use separate system, general application and compute-heavy batch node pools.
- Enable horizontal pod autoscaling, cluster autoscaling and KEDA for Service Bus consumers.
- Use workload identity and the Key Vault Secrets Store CSI driver instead of Kubernetes secrets for credentials.
- Use Azure CNI powered by Cilium, Network Policies, Defender for Containers and Azure Policy.
- Keep PostgreSQL, Redis, Service Bus and Blob Storage outside the cluster as managed Azure services.
- Deploy a second AKS cluster in another region when regional recovery objectives require it.

The presentation-ready SVG is in [`azure-aks-reference-architecture.svg`](./azure-aks-reference-architecture.svg).
