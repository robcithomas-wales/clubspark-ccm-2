async function list(app, input) {
  const conditions = ["tenant_id = $1", "organisation_id = $2"]
  const values = [input.tenantId, input.organisationId]

  const limit = input.limit ?? 50
  const offset = input.offset ?? 0

  const { rows } = await app.pg.query(
    `
      select
        id,
        name,
        policy_type as "policyType",
        description,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt",
        count(*) over()::int as "totalCount"
      from membership.entitlement_policies
      where ${conditions.join(" and ")}
      order by name asc
      limit $3 offset $4
    `,
    [...values, limit, offset]
  )

  return {
    rows,
    total: rows[0]?.totalCount ?? 0,
  }
}

async function getById(app, input) {
  const { rows } = await app.pg.query(
    `
      select
        id,
        name,
        policy_type as "policyType",
        description,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      from membership.entitlement_policies
      where tenant_id = $1
        and organisation_id = $2
        and id = $3
    `,
    [input.tenantId, input.organisationId, input.id]
  )

  return rows[0] || null
}

module.exports = {
  list,
  getById,
}
