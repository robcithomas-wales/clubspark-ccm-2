const repo = require("../repositories/membership-schemes-repo")

async function create(app, context, input) {
  const name = input.name?.trim()

  if (!name) {
    const error = new Error("Membership scheme name is required")
    error.statusCode = 400
    error.code = "INVALID_REQUEST"
    throw error
  }

  app.log.info({ organisationId: context.organisationId, name }, "Creating membership scheme")

  return repo.create(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    name,
    description: input.description?.trim() || null,
    status: input.status || "active",
  })
}

async function getById(app, context, id) {
  const scheme = await repo.getById(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id,
  })

  if (!scheme) {
    const error = new Error("Membership scheme not found")
    error.statusCode = 404
    error.code = "MEMBERSHIP_SCHEME_NOT_FOUND"
    throw error
  }

  return scheme
}

async function update(app, context, id, input) {
  const existing = await repo.getById(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id,
  })

  if (!existing) {
    const error = new Error("Membership scheme not found")
    error.statusCode = 404
    error.code = "MEMBERSHIP_SCHEME_NOT_FOUND"
    throw error
  }

  const name = input.name?.trim() || existing.name
  const description =
    input.description !== undefined ? input.description?.trim() : existing.description
  const status = input.status || existing.status

  app.log.info({ id, organisationId: context.organisationId }, "Updating membership scheme")

  return repo.update(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id,
    name,
    description,
    status,
  })
}

async function list(app, context, query) {
  const limit = Math.min(Number(query.limit) || 50, 100)
  const offset = Number(query.offset) || 0

  const { rows, total } = await repo.list(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    status: query.status || null,
    search: query.search || null,
    limit,
    offset,
  })

  return { items: rows, pagination: { total, limit, offset } }
}

module.exports = {
  create,
  getById,
  update,
  list,
}