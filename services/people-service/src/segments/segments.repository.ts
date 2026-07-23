import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'

export interface SegmentRow {
  id: string
  tenantId: string
  name: string
  description: string | null
  type: string
  conditions: unknown
  memberCount: number
  lastBuiltAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface MemberRow {
  id: string
  personId: string
  tenantId: string
  addedAt: Date
  addedBy: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
}

@Injectable()
export class SegmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<SegmentRow[]> {
    return this.prisma.$queryRaw<SegmentRow[]>`
      SELECT
        id,
        tenant_id    AS "tenantId",
        name,
        description,
        type,
        conditions,
        member_count AS "memberCount",
        last_built_at AS "lastBuiltAt",
        created_at   AS "createdAt",
        updated_at   AS "updatedAt"
      FROM people.segments
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY name
    `
  }

  async findById(tenantId: string, id: string): Promise<SegmentRow | null> {
    const rows = await this.prisma.$queryRaw<SegmentRow[]>`
      SELECT
        id,
        tenant_id    AS "tenantId",
        name,
        description,
        type,
        conditions,
        member_count AS "memberCount",
        last_built_at AS "lastBuiltAt",
        created_at   AS "createdAt",
        updated_at   AS "updatedAt"
      FROM people.segments
      WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
      LIMIT 1
    `
    return rows[0] ?? null
  }

  async create(tenantId: string, dto: {
    name: string
    description?: string
    type: string
    conditions?: Record<string, unknown>[]
  }): Promise<SegmentRow | null> {
    const rows = await this.prisma.$queryRaw<SegmentRow[]>`
      INSERT INTO people.segments (tenant_id, name, description, type, conditions)
      VALUES (
        ${tenantId}::uuid,
        ${dto.name},
        ${dto.description ?? null},
        ${dto.type},
        ${JSON.stringify(dto.conditions ?? [])}::jsonb
      )
      RETURNING
        id,
        tenant_id    AS "tenantId",
        name,
        description,
        type,
        conditions,
        member_count AS "memberCount",
        last_built_at AS "lastBuiltAt",
        created_at   AS "createdAt",
        updated_at   AS "updatedAt"
    `
    return rows[0] ?? null
  }

  async update(tenantId: string, id: string, dto: {
    name?: string
    description?: string
    type?: string
    conditions?: Record<string, unknown>[]
  }): Promise<SegmentRow | null> {
    const rows = await this.prisma.$queryRaw<SegmentRow[]>`
      UPDATE people.segments SET
        name        = COALESCE(${dto.name ?? null}, name),
        description = COALESCE(${dto.description ?? null}, description),
        type        = COALESCE(${dto.type ?? null}, type),
        conditions  = COALESCE(${dto.conditions != null ? JSON.stringify(dto.conditions) : null}::jsonb, conditions),
        updated_at  = now()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
      RETURNING
        id,
        tenant_id    AS "tenantId",
        name,
        description,
        type,
        conditions,
        member_count AS "memberCount",
        last_built_at AS "lastBuiltAt",
        created_at   AS "createdAt",
        updated_at   AS "updatedAt"
    `
    return rows[0] ?? null
  }

  async listMembers(tenantId: string, segmentId: string): Promise<MemberRow[]> {
    return this.prisma.$queryRaw<MemberRow[]>`
      SELECT
        m.id,
        m.person_id  AS "personId",
        m.tenant_id  AS "tenantId",
        m.added_at   AS "addedAt",
        m.added_by   AS "addedBy",
        p.first_name AS "firstName",
        p.last_name  AS "lastName",
        p.email
      FROM people.segment_memberships m
      JOIN people.persons p ON p.id = m.person_id
      WHERE m.tenant_id  = ${tenantId}::uuid
        AND m.segment_id = ${segmentId}::uuid
      ORDER BY m.added_at DESC
    `
  }

  async addMember(tenantId: string, segmentId: string, personId: string, addedBy = 'admin'): Promise<void> {
    await this.prisma.$queryRaw`
      INSERT INTO people.segment_memberships (tenant_id, segment_id, person_id, added_by)
      VALUES (${tenantId}::uuid, ${segmentId}::uuid, ${personId}::uuid, ${addedBy})
      ON CONFLICT (segment_id, person_id) DO NOTHING
    `
    await this.updateMemberCount(tenantId, segmentId)
  }

  async removeMember(tenantId: string, segmentId: string, personId: string): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      DELETE FROM people.segment_memberships
      WHERE tenant_id  = ${tenantId}::uuid
        AND segment_id = ${segmentId}::uuid
        AND person_id  = ${personId}::uuid
      RETURNING id
    `
    if (rows.length > 0) await this.updateMemberCount(tenantId, segmentId)
    return rows.length > 0
  }

  private async updateMemberCount(tenantId: string, segmentId: string) {
    await this.prisma.$queryRaw`
      UPDATE people.segments
      SET member_count  = (
        SELECT COUNT(*) FROM people.segment_memberships
        WHERE segment_id = ${segmentId}::uuid
      ),
      last_built_at = now(),
      updated_at    = now()
      WHERE tenant_id = ${tenantId}::uuid AND id = ${segmentId}::uuid
    `
  }

  /** Evaluate dynamic segment — rebuild membership from conditions. */
  async rebuildDynamic(tenantId: string, segmentId: string, conditions: Array<{
    field: string; op: string; value: unknown
  }>): Promise<number> {
    // Only a limited set of person fields are supported to avoid SQL injection.
    const ALLOWED_FIELDS: Record<string, string> = {
      lifecycleState: 'lifecycle_state',
      engagementBand: 'engagement_band',
      source: 'source',
      country: 'country',
    }

    const whereClauses: string[] = []
    for (const cond of conditions) {
      const col = ALLOWED_FIELDS[cond.field]
      if (!col) continue
      if (cond.op === 'eq' && typeof cond.value === 'string') {
        whereClauses.push(`${col} = '${cond.value.replace(/'/g, "''")}'`)
      } else if (cond.op === 'neq' && typeof cond.value === 'string') {
        whereClauses.push(`${col} != '${cond.value.replace(/'/g, "''")}'`)
      }
    }

    const whereStr = whereClauses.length > 0 ? `AND ${whereClauses.join(' AND ')}` : ''

    // Delete old system-added memberships, re-insert matching people
    await this.prisma.$executeRawUnsafe(`
      DELETE FROM people.segment_memberships
      WHERE segment_id = '${segmentId}' AND added_by = 'system'
    `)

    const inserted = await this.prisma.$executeRawUnsafe(`
      INSERT INTO people.segment_memberships (tenant_id, segment_id, person_id, added_by)
      SELECT tenant_id, '${segmentId}'::uuid, id, 'system'
      FROM people.persons
      WHERE tenant_id = '${tenantId}'::uuid ${whereStr}
      ON CONFLICT (segment_id, person_id) DO NOTHING
    `)

    await this.updateMemberCount(tenantId, segmentId)
    return inserted
  }
}
