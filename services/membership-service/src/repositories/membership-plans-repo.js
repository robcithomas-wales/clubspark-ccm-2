async function create(app, input) {
  const { rows } = await app.pg.query(
    `
      insert into membership.membership_plans (
        tenant_id,
        organisation_id,
        scheme_id,
        name,
        code,
        description,
        ownership_type,
        duration_type,
        visibility,
        status,
        sort_order
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      returning
        id,
        scheme_id as "schemeId",
        name,
        code,
        description,
        ownership_type as "ownershipType",
        duration_type as "durationType",
        visibility,
        status,
        sort_order as "sortOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [
      input.tenantId,
      input.organisationId,
      input.schemeId,
      input.name,
      input.code,
      input.description,
      input.ownershipType,
      input.durationType,
      input.visibility,
      input.status,
      input.sortOrder,
    ]
  )

  return rows[0]
}

async function getById(app, input) {
  const { rows } = await app.pg.query(
    `
      select
        p.id,
        p.scheme_id as "schemeId",
        s.name as "schemeName",
        p.name,
        p.code,
        p.description,
        p.ownership_type as "ownershipType",
        p.duration_type as "durationType",
        p.visibility,
        p.status,
        p.sort_order as "sortOrder",
        p.created_at as "createdAt",
        p.updated_at as "updatedAt"
      from membership.membership_plans p
      join membership.membership_schemes s
        on s.id = p.scheme_id
      where p.tenant_id = $1
        and p.organisation_id = $2
        and p.id = $3
      limit 1
    `,
    [
      input.tenantId,
      input.organisationId,
      input.id,
    ]
  )

  return rows[0] || null
}

async function update(app, input) {
  const { rows } = await app.pg.query(
    `
      update membership.membership_plans
      set
        scheme_id = $4,
        name = $5,
        code = $6,
        description = $7,
        ownership_type = $8,
        duration_type = $9,
        visibility = $10,
        status = $11,
        sort_order = $12
      where tenant_id = $1
        and organisation_id = $2
        and id = $3
      returning
        id,
        scheme_id as "schemeId",
        name,
        code,
        description,
        ownership_type as "ownershipType",
        duration_type as "durationType",
        visibility,
        status,
        sort_order as "sortOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [
      input.tenantId,
      input.organisationId,
      input.id,
      input.schemeId,
      input.name,
      input.code,
      input.description,
      input.ownershipType,
      input.durationType,
      input.visibility,
      input.status,
      input.sortOrder,
    ]
  )

  return rows[0] || null
}

async function list(app, input) {
  const conditions = ["p.tenant_id = $1", "p.organisation_id = $2"]
  const values = [input.tenantId, input.organisationId]

  if (input.schemeId) {
    values.push(input.schemeId)
    conditions.push(`p.scheme_id = $${values.length}`)
  }

  if (input.status) {
    values.push(input.status)
    conditions.push(`p.status = $${values.length}`)
  }

  if (input.search) {
    values.push(`%${input.search}%`)
    conditions.push(`(p.name ilike $${values.length} or p.code ilike $${values.length})`)
  }

  const limit = input.limit ?? 50
  const offset = input.offset ?? 0

  const { rows } = await app.pg.query(
    `
      select
        p.id,
        p.scheme_id as "schemeId",
        s.name as "schemeName",
        p.name,
        p.code,
        p.description,
        p.ownership_type as "ownershipType",
        p.duration_type as "durationType",
        p.visibility,
        p.status,
        p.sort_order as "sortOrder",
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        count(*) over()::int as "totalCount"
      from membership.membership_plans p
      join membership.membership_schemes s
        on s.id = p.scheme_id
      where ${conditions.join(" and ")}
      order by p.sort_order asc, p.name asc
      limit $${values.length + 1} offset $${values.length + 2}
    `,
    [...values, limit, offset]
  )

  return {
    rows,
    total: rows[0]?.totalCount ?? 0,
  }
}

module.exports = {
  create,
  getById,
  update,
  list,
}