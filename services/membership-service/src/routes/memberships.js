const membershipsService = require("../services/memberships-service")

const paginationQuery = {
  limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
  offset: { type: "integer", minimum: 0, default: 0 },
}

async function routes(app) {
  app.post("/", {
    schema: {
      body: {
        type: "object",
        required: ["planId", "startDate"],
        properties: {
          planId: { type: "string" },
          customerId: { type: "string" },
          householdId: { type: "string" },
          startDate: { type: "string", format: "date" },
          endDate: { type: ["string", "null"], format: "date" },
          renewalDate: { type: ["string", "null"], format: "date" },
          autoRenew: { type: "boolean" },
          status: { type: "string" },
          paymentStatus: { type: "string" },
          reference: { type: "string" },
          source: { type: "string" },
          notes: { type: "string" },
        },
      },
    },
  }, async (request, reply) => {
    const result = await membershipsService.create(app, request.context, request.body)
    reply.status(201).send({ data: result })
  })

  app.get("/", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          ...paginationQuery,
          planId: { type: "string" },
          status: { type: "string" },
          customerId: { type: "string" },
          ownerType: { type: "string", enum: ["person", "household"] },
          ownerId: { type: "string" },
          search: { type: "string" },
        },
      },
    },
  }, async (request) => {
    const result = await membershipsService.list(app, request.context, request.query)
    return { data: result.items, pagination: result.pagination }
  })

  app.get("/:id", {
    schema: {
      params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
  }, async (request) => {
    const result = await membershipsService.getById(app, request.context, request.params.id)
    return { data: result }
  })

  app.patch("/:id", {
    schema: {
      params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      body: {
        type: "object",
        properties: {
          planId: { type: "string" },
          customerId: { type: ["string", "null"] },
          householdId: { type: ["string", "null"] },
          startDate: { type: "string", format: "date" },
          endDate: { type: ["string", "null"], format: "date" },
          renewalDate: { type: ["string", "null"], format: "date" },
          autoRenew: { type: "boolean" },
          status: { type: "string" },
          paymentStatus: { type: "string" },
          reference: { type: ["string", "null"] },
          source: { type: ["string", "null"] },
          notes: { type: ["string", "null"] },
        },
      },
    },
  }, async (request) => {
    const result = await membershipsService.update(
      app,
      request.context,
      request.params.id,
      request.body
    )
    return { data: result }
  })

  app.delete("/:id", {
    schema: {
      params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
  }, async (request, reply) => {
    await membershipsService.remove(app, request.context, request.params.id)
    reply.status(204).send()
  })
}

module.exports = routes
