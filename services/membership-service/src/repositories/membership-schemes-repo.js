async function create(app, input) {
  const { rows } = await app.pg.query(
    `
      insert into membership.membership_schemes (
        tenant_id,
        organisation_id,
        name,
        description,
        status
      )
      values ($1, $2, $3, $4, $5)
      returning
        id,
        name,
        description,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [
      input.tenantId,
      input.organisationId,
      input.name,
      input.description,
      input.status,
    ]
  )

  return rows[0]
}

async function getById(app, input) {
  const { rows } = await app.pg.query(
    `
      select
        id,
        name,
        description,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      from membership.membership_schemes
      where tenant_id = $1
        and organisation_id = $2
        and id = $3
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
      update membership.membership_schemes
      set
        name = $4,
        description = $5,
        status = $6
      where tenant_id = $1
        and organisation_id = $2
        and id = $3
      returning
        id,
        name,
        description,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [
      input.tenantId,
      input.organisationId,
      input.id,
      input.name,
      input.description,
      input.status,
    ]
  )

  return rows[0] || null
}

async function list(app, input) {
  const conditions = ["tenant_id = $1", "organisation_id = $2"]
  const values = [input.tenantId, input.organisationId]

  if (input.status) {
    values.push(input.status)
    conditions.push(`status = $${values.length}`)
  }

  if (input.search) {
    values.push(`%${input.search}%`)
    conditions.push(`name ilike $${values.length}`)
  }

  const limit = input.limit ?? 50
  const offset = input.offset ?? 0

  const { rows } = await app.pg.query(
    `
      select
        id,
        name,
        description,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt",
        count(*) over()::int as "totalCount"
      from membership.membership_schemes
      where ${conditions.join(" and ")}
      order by name asc
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