const entitlementPoliciesService = require("../services/entitlement-policies-service")

const paginationQuery = {
  limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
  offset: { type: "integer", minimum: 0, default: 0 },
}

async function routes(app) {
  app.get("/", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          ...paginationQuery,
        },
      },
    },
  }, async (request) => {
    const result = await entitlementPoliciesService.list(app, request.context, request.query)
    return { data: result.items, pagination: result.pagination }
  })

  app.get("/:id", {
    schema: {
      params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
  }, async (request) => {
    const result = await entitlementPoliciesService.getById(app, request.context, request.params.id)
    return { data: result }
  })
}

module.exports = routes
