const membershipPlansService = require("../services/membership-plans-service")
const membershipPlanEntitlementsService = require("../services/membership-plan-entitlements-service")

const paginationQuery = {
  limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
  offset: { type: "integer", minimum: 0, default: 0 },
}

async function routes(app) {
  app.post("/", {
    schema: {
      body: {
        type: "object",
        required: ["schemeId", "name", "ownershipType", "durationType"],
        properties: {
          schemeId: { type: "string" },
          name: { type: "string", minLength: 1 },
          code: { type: "string" },
          description: { type: "string" },
          ownershipType: { type: "string", enum: ["person", "household"] },
          durationType: { type: "string" },
          visibility: { type: "string", enum: ["public", "private"] },
          status: { type: "string", enum: ["active", "inactive"] },
          sortOrder: { type: "integer" },
        },
      },
    },
  }, async (request, reply) => {
    const result = await membershipPlansService.create(app, request.context, request.body)
    reply.status(201).send({ data: result })
  })

  app.get("/", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          ...paginationQuery,
          schemeId: { type: "string" },
          status: { type: "string", enum: ["active", "inactive"] },
          search: { type: "string" },
        },
      },
    },
  }, async (request) => {
    const result = await membershipPlansService.list(app, request.context, request.query)
    return { data: result.items, pagination: result.pagination }
  })

  app.get("/:id", {
    schema: {
      params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
  }, async (request) => {
    const result = await membershipPlansService.getById(app, request.context, request.params.id)
    return { data: result }
  })

  app.get("/:id/entitlements", {
    schema: {
      params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
  }, async (request) => {
    const result = await membershipPlanEntitlementsService.listByPlanId(
      app,
      request.context,
      request.params.id
    )
    return { data: result }
  })

  app.put("/:id/entitlements", {
    schema: {
      params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      body: {
        type: "object",
        properties: {
          entitlements: {
            type: "array",
            items: {
              type: "object",
              required: ["entitlementPolicyId"],
              properties: {
                entitlementPolicyId: { type: "string" },
                scopeType: { type: "string" },
                scopeId: { type: ["string", "null"] },
                configuration: { type: "object" },
                priority: { type: "integer" },
              },
            },
          },
        },
      },
    },
  }, async (request) => {
    const result = await membershipPlanEntitlementsService.replaceForPlan(
      app,
      request.context,
      request.params.id,
      request.body
    )
    return { data: result }
  })

  app.patch("/:id", {
    schema: {
      params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      body: {
        type: "object",
        properties: {
          schemeId: { type: "string" },
          name: { type: "string", minLength: 1 },
          code: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
          ownershipType: { type: "string", enum: ["person", "household"] },
          durationType: { type: "string" },
          visibility: { type: "string", enum: ["public", "private"] },
          status: { type: "string", enum: ["active", "inactive"] },
          sortOrder: { type: "integer" },
        },
      },
    },
  }, async (request) => {
    const result = await membershipPlansService.update(
      app,
      request.context,
      request.params.id,
      request.body
    )
    return { data: result }
  })
}

module.exports = routes
