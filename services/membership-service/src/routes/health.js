async function routes(app) {
  app.get("/health", async () => {
    return {
      data: {
        status: "ok",
        service: "membership-service",
      },
    }
  })

  app.get("/health/db", async (request, reply) => {
    const result = await app.pg.query("select now() as database_time")

    return {
      data: {
        status: "ok",
        service: "membership-service",
        database: "connected",
        databaseTime: result.rows[0].database_time,
      },
    }
  })
}

module.exports = routes