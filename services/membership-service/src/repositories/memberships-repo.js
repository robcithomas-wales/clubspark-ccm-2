const { randomUUID } = require("crypto")

async function create(app, input) {
  const id = randomUUID()

  await app.pg.query(
    `
      insert into membership.memberships (
        id,
        tenant_id,
        organisation_id,
        plan_id,
        customer_id,
        owner_type,
        owner_id,
        status,
        start_date,
        end_date,
        renewal_date,
        auto_renew,
        payment_status,
        reference,
        source,
        notes
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
    `,
    [
      id,
      input.tenantId,
      input.organisationId,
      input.planId,
      input.customerId,
      input.ownerType,
      input.ownerId,
      input.status,
      input.startDate,
      input.endDate,
      input.renewalDate,
      input.autoRenew,
      input.paymentStatus,
      input.reference,
      input.source,
      input.notes,
    ]
  )

  return getById(app, {
    tenantId: input.tenantId,
    organisationId: input.organisationId,
    id,
  })
}

async function getById(app, input) {
  const result = await app.pg.query(
    `
      select
        m.id,
        m.plan_id as "planId",
        p.name as "planName",
        p.ownership_type as "ownershipType",
        m.customer_id as "customerId",
        m.owner_type as "ownerType",
        m.owner_id as "ownerId",
        case
          when m.owner_type = 'household' then m.owner_id
          else null
        end as "householdId",
        m.status,
        m.start_date as "startDate",
        m.end_date as "endDate",
        m.renewal_date as "renewalDate",
        m.auto_renew as "autoRenew",
        m.payment_status as "paymentStatus",
        m.reference,
        m.source,
        m.notes,
        m.created_at as "createdAt",
        m.updated_at as "updatedAt"
      from membership.memberships m
      inner join membership.membership_plans p
        on p.id = m.plan_id
      where m.tenant_id = $1
        and m.organisation_id = $2
        and m.id = $3
      limit 1
    `,
    [input.tenantId, input.organisationId, input.id]
  )

  return result.rows[0] || null
}

async function update(app, input) {
  await app.pg.query(
    `
      update membership.memberships
      set
        plan_id = $4,
        customer_id = $5,
        owner_type = $6,
        owner_id = $7,
        status = $8,
        start_date = $9,
        end_date = $10,
        renewal_date = $11,
        auto_renew = $12,
        payment_status = $13,
        reference = $14,
        source = $15,
        notes = $16,
        updated_at = now()
      where tenant_id = $1
        and organisation_id = $2
        and id = $3
    `,
    [
      input.tenantId,
      input.organisationId,
      input.id,
      input.planId,
      input.customerId,
      input.ownerType,
      input.ownerId,
      input.status,
      input.startDate,
      input.endDate,
      input.renewalDate,
      input.autoRenew,
      input.paymentStatus,
      input.reference,
      input.source,
      input.notes,
    ]
  )

  return getById(app, {
    tenantId: input.tenantId,
    organisationId: input.organisationId,
    id: input.id,
  })
}

async function remove(app, input) {
  await app.pg.query(
    `
      delete from membership.memberships
      where tenant_id = $1
        and organisation_id = $2
        and id = $3
    `,
    [input.tenantId, input.organisationId, input.id]
  )
}

async function list(app, input) {
  const conditions = [
    `m.tenant_id = $1`,
    `m.organisation_id = $2`,
  ]

  const values = [input.tenantId, input.organisationId]
  let index = values.length + 1

  if (input.planId) {
    conditions.push(`m.plan_id = $${index++}`)
    values.push(input.planId)
  }

  if (input.status) {
    conditions.push(`m.status = $${index++}`)
    values.push(input.status)
  }

  if (input.customerId) {
    conditions.push(`m.customer_id = $${index++}`)
    values.push(input.customerId)
  }

  if (input.ownerType) {
    conditions.push(`m.owner_type = $${index++}`)
    values.push(input.ownerType)
  }

  if (input.ownerId) {
    conditions.push(`m.owner_id = $${index++}`)
    values.push(input.ownerId)
  }

  if (input.search) {
    conditions.push(`(
      p.name ilike $${index}
      or cast(m.id as text) ilike $${index}
      or coalesce(m.reference, '') ilike $${index}
      or coalesce(m.source, '') ilike $${index}
    )`)
    values.push(`%${input.search}%`)
    index += 1
  }

  const limit = input.limit ?? 50
  const offset = input.offset ?? 0

  const result = await app.pg.query(
    `
      select
        m.id,
        m.plan_id as "planId",
        p.name as "planName",
        p.ownership_type as "ownershipType",
        m.customer_id as "customerId",
        m.owner_type as "ownerType",
        m.owner_id as "ownerId",
        case
          when m.owner_type = 'household' then m.owner_id
          else null
        end as "householdId",
        m.status,
        m.start_date as "startDate",
        m.end_date as "endDate",
        m.renewal_date as "renewalDate",
        m.auto_renew as "autoRenew",
        m.payment_status as "paymentStatus",
        m.reference,
        m.source,
        m.notes,
        m.created_at as "createdAt",
        m.updated_at as "updatedAt",
        count(*) over()::int as "totalCount"
      from membership.memberships m
      inner join membership.membership_plans p
        on p.id = m.plan_id
      where ${conditions.join(" and ")}
      order by m.created_at desc
      limit $${index} offset $${index + 1}
    `,
    [...values, limit, offset]
  )

  return {
    rows: result.rows,
    total: result.rows[0]?.totalCount ?? 0,
  }
}

module.exports = {
  create,
  getById,
  update,
  remove,
  list,
}