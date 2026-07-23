import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

export interface ActivityRow {
  id: string
  tenantId: string
  personId: string
  eventType: string
  title: string
  meta: Record<string, unknown>
  sourceId: string | null
  occurredAt: Date
  createdAt: Date
}

@Injectable()
export class ActivitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForPerson(tenantId: string, personId: string, limit = 50): Promise<ActivityRow[]> {
    const rows = await this.prisma.$queryRaw<ActivityRow[]>`
      SELECT
        id,
        tenant_id   AS "tenantId",
        person_id   AS "personId",
        event_type  AS "eventType",
        title,
        meta,
        source_id   AS "sourceId",
        occurred_at AS "occurredAt",
        created_at  AS "createdAt"
      FROM people.person_activities
      WHERE tenant_id = ${tenantId}::uuid
        AND person_id = ${personId}::uuid
      ORDER BY occurred_at DESC
      LIMIT ${limit}
    `
    return rows
  }

  async record(activity: {
    tenantId: string
    personId: string
    eventType: string
    title: string
    meta?: Record<string, unknown>
    sourceId?: string
    occurredAt: Date
  }): Promise<ActivityRow | null> {
    const rows = await this.prisma.$queryRaw<ActivityRow[]>`
      INSERT INTO people.person_activities
        (tenant_id, person_id, event_type, title, meta, source_id, occurred_at)
      VALUES (
        ${activity.tenantId}::uuid,
        ${activity.personId}::uuid,
        ${activity.eventType},
        ${activity.title},
        ${JSON.stringify(activity.meta ?? {})}::jsonb,
        ${activity.sourceId ?? null},
        ${activity.occurredAt.toISOString()}::timestamptz
      )
      RETURNING
        id,
        tenant_id   AS "tenantId",
        person_id   AS "personId",
        event_type  AS "eventType",
        title,
        meta,
        source_id   AS "sourceId",
        occurred_at AS "occurredAt",
        created_at  AS "createdAt"
    `
    return rows[0] ?? null
  }

  /** Update last_activity_at on the person when an activity is recorded. */
  async touchLastActivity(tenantId: string, personId: string, at: Date): Promise<void> {
    await this.prisma.$queryRaw`
      UPDATE people.persons
      SET last_activity_at = ${at.toISOString()}::timestamptz,
          updated_at       = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND id        = ${personId}::uuid
        AND (last_activity_at IS NULL OR last_activity_at < ${at.toISOString()}::timestamptz)
    `
  }

  /** Find a person by customer_id (same UUID namespace). */
  async findPersonIdByCustomerId(tenantId: string, customerId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM people.persons
      WHERE tenant_id = ${tenantId}::uuid AND id = ${customerId}::uuid
      LIMIT 1
    `
    return rows[0]?.id ?? null
  }
}
