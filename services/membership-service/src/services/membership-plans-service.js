const schemesRepo = require("../repositories/membership-schemes-repo")
const repo = require("../repositories/membership-plans-repo")

async function create(app, context, input) {
  const name = input.name?.trim()
  const code = input.code?.trim()
  const schemeId = input.schemeId

  if (!schemeId) {
    const error = new Error("schemeId is required")
    error.statusCode = 400
    error.code = "INVALID_REQUEST"
    throw error
  }

  if (!name) {
    const error = new Error("Membership plan name is required")
    error.statusCode = 400
    error.code = "INVALID_REQUEST"
    throw error
  }

  if (!input.ownershipType) {
    const error = new Error("ownershipType is required")
    error.statusCode = 400
    error.code = "INVALID_REQUEST"
    throw error
  }

  if (!input.durationType) {
    const error = new Error("durationType is required")
    error.statusCode = 400
    error.code = "INVALID_REQUEST"
    throw error
  }

  const scheme = await schemesRepo.getById(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id: schemeId,
  })

  if (!scheme) {
    const error = new Error("Membership scheme not found")
    error.statusCode = 404
    error.code = "MEMBERSHIP_SCHEME_NOT_FOUND"
    throw error
  }

  app.log.info({ organisationId: context.organisationId, schemeId, name }, "Creating membership plan")

  return repo.create(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    schemeId,
    name,
    code: code || null,
    description: input.description?.trim() || null,
    ownershipType: input.ownershipType,
    durationType: input.durationType,
    visibility: input.visibility || "public",
    status: input.status || "active",
    sortOrder: Number.isInteger(input.sortOrder) ? input.sortOrder : 0,
  })
}

async function getById(app, context, id) {
  const plan = await repo.getById(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id,
  })

  if (!plan) {
    const error = new Error("Membership plan not found")
    error.statusCode = 404
    error.code = "MEMBERSHIP_PLAN_NOT_FOUND"
    throw error
  }

  return plan
}

async function update(app, context, id, input) {
  const existing = await repo.getById(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id,
  })

  if (!existing) {
    const error = new Error("Membership plan not found")
    error.statusCode = 404
    error.code = "MEMBERSHIP_PLAN_NOT_FOUND"
    throw error
  }

  const schemeId = input.schemeId || existing.schemeId
  const name = input.name?.trim() || existing.name
  const code = input.code !== undefined ? input.code?.trim() || null : existing.code
  const description =
    input.description !== undefined ? input.description?.trim() || null : existing.description
  const ownershipType = input.ownershipType || existing.ownershipType
  const durationType = input.durationType || existing.durationType
  const visibility = input.visibility || existing.visibility
  const status = input.status || existing.status
  const sortOrder =
    input.sortOrder !== undefined ? Number(input.sortOrder) : existing.sortOrder

  const scheme = await schemesRepo.getById(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id: schemeId,
  })

  if (!scheme) {
    const error = new Error("Membership scheme not found")
    error.statusCode = 404
    error.code = "MEMBERSHIP_SCHEME_NOT_FOUND"
    throw error
  }

  app.log.info({ id, organisationId: context.organisationId }, "Updating membership plan")

  return repo.update(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id,
    schemeId,
    name,
    code,
    description,
    ownershipType,
    durationType,
    visibility,
    status,
    sortOrder,
  })
}

async function list(app, context, query) {
  const limit = Math.min(Number(query.limit) || 50, 100)
  const offset = Number(query.offset) || 0

  const { rows, total } = await repo.list(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    schemeId: query.schemeId || null,
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