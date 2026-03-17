const repo = require("../repositories/entitlement-policies-repo")

async function list(app, context, query) {
  const limit = Math.min(Number(query.limit) || 50, 100)
  const offset = Number(query.offset) || 0

  const { rows, total } = await repo.list(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    limit,
    offset,
  })

  return { items: rows, pagination: { total, limit, offset } }
}

async function getById(app, context, id) {
  const policy = await repo.getById(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id,
  })

  if (!policy) {
    const error = new Error("Entitlement policy not found")
    error.statusCode = 404
    error.code = "ENTITLEMENT_POLICY_NOT_FOUND"
    throw error
  }

  return policy
}

module.exports = {
  list,
  getById,
}
