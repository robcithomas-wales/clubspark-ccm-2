const fp = require("fastify-plugin")

async function authContextPlugin(app) {
  app.decorateRequest("context", null)

  app.addHook("preHandler", async (request) => {
    const tenantId = request.headers["x-tenant-id"]
    const organisationId = request.headers["x-organisation-id"]

    if (!tenantId) {
      const error = new Error("Missing x-tenant-id header")
      error.statusCode = 400
      error.code = "TENANT_CONTEXT_MISSING"
      throw error
    }

    if (!organisationId) {
      const error = new Error("Missing x-organisation-id header")
      error.statusCode = 400
      error.code = "ORGANISATION_CONTEXT_MISSING"
      throw error
    }

    request.context = {
      tenantId,
      organisationId,
    }
  })
}

module.exports = fp(authContextPlugin)