async function listByPlanId(app, input) {
  const { rows } = await app.pg.query(
    `
      select
        mpe.id,
        mpe.plan_id as "planId",
        mpe.entitlement_policy_id as "entitlementPolicyId",
        ep.name as "policyName",
        ep.policy_type as "policyType",
        mpe.scope_type as "scopeType",
        mpe.scope_id as "scopeId",
        mpe.configuration,
        mpe.priority,
        mpe.created_at as "createdAt",
        mpe.updated_at as "updatedAt"
      from membership.membership_plan_entitlements mpe
      join membership.entitlement_policies ep
        on ep.id = mpe.entitlement_policy_id
      where mpe.tenant_id = $1
        and ep.organisation_id = $2
        and mpe.plan_id = $3
      order by mpe.priority desc, ep.name asc
    `,
    [input.tenantId, input.organisationId, input.planId]
  )

  return rows
}

async function replaceForPlan(app, input) {
  const client = await app.pg.connect()

  try {
    await client.query("BEGIN")

    await client.query(
      `
        delete from membership.membership_plan_entitlements
        where tenant_id = $1
          and plan_id = $2
      `,
      [input.tenantId, input.planId]
    )

    for (const entitlement of input.entitlements) {
      await client.query(
        `
          insert into membership.membership_plan_entitlements (
            tenant_id,
            plan_id,
            entitlement_policy_id,
            scope_type,
            scope_id,
            configuration,
            priority
          )
          values ($1, $2, $3, $4, $5, $6::jsonb, $7)
        `,
        [
          input.tenantId,
          input.planId,
          entitlement.entitlementPolicyId,
          entitlement.scopeType,
          entitlement.scopeId ?? null,
          JSON.stringify(entitlement.configuration || {}),
          entitlement.priority ?? 100,
        ]
      )
    }

    await client.query("COMMIT")
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }

  return listByPlanId(app, input)
}

module.exports = {
  listByPlanId,
  replaceForPlan,
}
