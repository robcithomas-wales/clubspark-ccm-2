---
description: Add a new REST endpoint to a NestJS service the ClubSpark way
argument-hint: <service-name> <resource> <verb + path>
---

Add a new endpoint to `services/$1`.

Requirements — match the existing patterns in that service exactly:

1. **Controller** — add the route to the appropriate controller. Use URI versioning
   (the service already calls `enableVersioning`). Keep tenant/org header handling
   consistent with sibling endpoints.
2. **DTO** — create/extend a request DTO. Validate id fields with `@IsString()` +
   `@IsNotEmpty()` — **never** `@IsUUID()`. Use `class-validator` decorators like the
   neighbouring DTOs.
3. **Service + repository** — put business logic in the service, data access in the
   repository/Prisma layer. Do not query Prisma from the controller.
4. **Swagger** — annotate so it shows up in the non-prod Swagger docs.
5. **Test** — add a vitest test alongside the existing ones and run
   `npm run test --workspace=services/$1`.

Requested endpoint: **$2 $3**

Read the target service's existing controller/service/repository/dto files first and
mirror their structure before writing anything.
