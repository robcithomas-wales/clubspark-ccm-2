const repo = require("../repositories/membership-plan-entitlements-repo")

async function listByPlanId(app, context, planId) {
  return repo.listByPlanId(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    planId,
  })
}

async function replaceForPlan(app, context, planId, body) {
  const entitlements = Array.isArray(body?.entitlements) ? body.entitlements : []

  app.log.info({ planId, count: entitlements.length }, "Replacing plan entitlements")

  return repo.replaceForPlan(app, {
    tenantId: context.tenantId,
    organisationId: context.organisationId,
    planId,
    entitlements,
  })
}

module.exports = {
  listByPlanId,
  replaceForPlan,
}
