const plansRepo = require("../repositories/membership-plans-repo")
const repo = require("../repositories/memberships-repo")

async function create(app, context, input) {
  const planId = input.planId
  const customerId = input.customerId || null
  const householdId = input.householdId || null
  const startDate = input.startDate
  const endDate = input.endDate || null
  const renewalDate = input.renewalDate || null
  const autoRenew = input.autoRenew === true
  const status = input.status || "active"
  const paymentStatus = input.paymentStatus || "unpaid"
  const reference = input.reference?.trim() || null
  const source = input.source?.trim() || null
  const notes = input.notes?.trim() || null

  if (!planId) {
    const error = new Error("planId is required")
    error.statusCode = 400
    error.code = "INVALID_REQUEST"
    throw error
  }

  if (!customerId && !householdId) {
    const error = new Error("customerId or householdId is required")
    error.statusCode = 400
    error.code = "INVALID_REQUEST"
    throw error
  }

  if (!startDate) {
    const error = new Error("startDate is required")
    error.statusCode = 400
    error.code = "INVALID_REQUEST"
    throw error
  }

  const plan = await plansRepo.getById(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id: planId,
  })

  if (!plan) {
    const error = new Error("Membership plan not found")
    error.statusCode = 404
    error.code = "MEMBERSHIP_PLAN_NOT_FOUND"
    throw error
  }

  let ownerType = null
  let ownerId = null

  if (plan.ownershipType === "person") {
    if (!customerId) {
      const error = new Error("customerId is required for person plans")
      error.statusCode = 400
      error.code = "INVALID_REQUEST"
      throw error
    }

    ownerType = "person"
    ownerId = customerId
  }

  if (plan.ownershipType === "household") {
    if (!householdId) {
      const error = new Error("householdId is required for household plans")
      error.statusCode = 400
      error.code = "INVALID_REQUEST"
      throw error
    }

    ownerType = "household"
    ownerId = householdId
  }

  app.log.info({ organisationId: context.organisationId, planId, ownerType, ownerId }, "Creating membership")

  return repo.create(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    planId,
    customerId,
    ownerType,
    ownerId,
    status,
    startDate,
    endDate,
    renewalDate,
    autoRenew,
    paymentStatus,
    reference,
    source,
    notes,
  })
}

async function getById(app, context, id) {
  const membership = await repo.getById(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id,
  })

  if (!membership) {
    const error = new Error("Membership not found")
    error.statusCode = 404
    error.code = "MEMBERSHIP_NOT_FOUND"
    throw error
  }

  return membership
}

async function update(app, context, id, input) {
  const existing = await repo.getById(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id,
  })

  if (!existing) {
    const error = new Error("Membership not found")
    error.statusCode = 404
    error.code = "MEMBERSHIP_NOT_FOUND"
    throw error
  }

  const planId = input.planId || existing.planId
  const customerId =
    input.customerId !== undefined ? input.customerId || null : existing.customerId
  const householdId =
    input.householdId !== undefined ? input.householdId || null : existing.householdId
  const status = input.status || existing.status
  const startDate = input.startDate || existing.startDate
  const endDate =
    input.endDate !== undefined ? input.endDate || null : existing.endDate
  const renewalDate =
    input.renewalDate !== undefined
      ? input.renewalDate || null
      : existing.renewalDate
  const autoRenew =
    input.autoRenew !== undefined ? input.autoRenew === true : existing.autoRenew
  const paymentStatus = input.paymentStatus || existing.paymentStatus
  const reference =
    input.reference !== undefined ? input.reference?.trim() || null : existing.reference
  const source =
    input.source !== undefined ? input.source?.trim() || null : existing.source
  const notes =
    input.notes !== undefined ? input.notes?.trim() || null : existing.notes

  const plan = await plansRepo.getById(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id: planId,
  })

  if (!plan) {
    const error = new Error("Membership plan not found")
    error.statusCode = 404
    error.code = "MEMBERSHIP_PLAN_NOT_FOUND"
    throw error
  }

  let ownerType = existing.ownerType
  let ownerId = existing.ownerId

  if (plan.ownershipType === "person") {
    if (!customerId) {
      const error = new Error("customerId is required for person plans")
      error.statusCode = 400
      error.code = "INVALID_REQUEST"
      throw error
    }

    ownerType = "person"
    ownerId = customerId
  }

  if (plan.ownershipType === "household") {
    if (!householdId) {
      const error = new Error("householdId is required for household plans")
      error.statusCode = 400
      error.code = "INVALID_REQUEST"
      throw error
    }

    ownerType = "household"
    ownerId = householdId
  }

  app.log.info({ id, organisationId: context.organisationId }, "Updating membership")

  return repo.update(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id,
    planId,
    customerId,
    ownerType,
    ownerId,
    status,
    startDate,
    endDate,
    renewalDate,
    autoRenew,
    paymentStatus,
    reference,
    source,
    notes,
  })
}

async function list(app, context, query) {
  const limit = Math.min(Number(query.limit) || 50, 100)
  const offset = Number(query.offset) || 0

  const { rows, total } = await repo.list(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    planId: query.planId || null,
    status: query.status || null,
    customerId: query.customerId || null,
    ownerType: query.ownerType || null,
    ownerId: query.ownerId || null,
    search: query.search || null,
    limit,
    offset,
  })

  return { items: rows, pagination: { total, limit, offset } }
}

async function remove(app, context, id) {
  const existing = await repo.getById(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id,
  })

  if (!existing) {
    const error = new Error("Membership not found")
    error.statusCode = 404
    error.code = "MEMBERSHIP_NOT_FOUND"
    throw error
  }

  app.log.info({ id, organisationId: context.organisationId }, "Removing membership")

  await repo.remove(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    id,
  })
}

module.exports = {
  create,
  getById,
  update,
  list,
  remove,
}