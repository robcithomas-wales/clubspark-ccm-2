const fastify = require("fastify")
const membershipsRoutes = require("./routes/memberships")

function buildApp() {
  const app = fastify({
    logger: true,
  })

  app.register(require("./plugins/db"))
  app.register(require("./plugins/auth-context"))

  app.register(require("./routes/health"))
  app.register(require("./routes/membership-schemes"), {
    prefix: "/membership-schemes",
  })
  app.register(require("./routes/membership-plans"), {
    prefix: "/membership-plans",
  })

  app.register(require("./routes/entitlement-policies"), {
    prefix: "/entitlement-policies"
  })

  app.register(membershipsRoutes, { prefix: "/memberships" })

  return app
}

module.exports = buildApp