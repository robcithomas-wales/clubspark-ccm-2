const fp = require("fastify-plugin")
const fastifyPostgres = require("@fastify/postgres")

async function dbPlugin(app) {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    const error = new Error("DATABASE_URL is not set")
    error.statusCode = 500
    error.code = "DATABASE_URL_MISSING"
    throw error
  }

  app.register(fastifyPostgres, {
    connectionString,
  })
}

module.exports = fp(dbPlugin)