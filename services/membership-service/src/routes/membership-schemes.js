const membershipSchemesService = require("../services/membership-schemes-service")

const paginationQuery = {
  limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
  offset: { type: "integer", minimum: 0, default: 0 },
}

async function routes(app) {
  app.post("/", {
    schema: {
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1 },
          description: { type: "string" },
          status: { type: "string", enum: ["active", "inactive"] },
        },
      },
    },
  }, async (request, reply) => {
    const result = await membershipSchemesService.create(app, request.context, request.body)
    reply.status(201).send({ data: result })
  })

  app.get("/", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          ...paginationQuery,
          status: { type: "string", enum: ["active", "inactive"] },
          search: { type: "string" },
        },
      },
    },
  }, async (request) => {
    const result = await membershipSchemesService.list(app, request.context, request.query)
    return { data: result.items, pagination: result.pagination }
  })

  app.get("/:id", {
    schema: {
      params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
  }, async (request) => {
    const result = await membershipSchemesService.getById(app, request.context, request.params.id)
    return { data: result }
  })

  app.patch("/:id", {
    schema: {
      params: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      body: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          description: { type: ["string", "null"] },
          status: { type: "string", enum: ["active", "inactive"] },
        },
      },
    },
  }, async (request) => {
    const result = await membershipSchemesService.update(
      app,
      request.context,
      request.params.id,
      request.body
    )
    return { data: result }
  })
}

module.exports = routes
