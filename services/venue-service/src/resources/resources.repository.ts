import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { CreateResourceDto } from './dto/create-resource.dto.js'
import { UpdateResourceDto } from './dto/update-resource.dto.js'
import { randomUUID } from 'node:crypto'
import { OutboxRepository } from '../outbox/outbox.repository.js'
import type { VenueProjectionEvent } from '../event-bus/event-bus.service.js'

const RESOURCE_SELECT = {
  id: true,
  tenantId: true,
  venueId: true,
  groupId: true,
  name: true,
  resourceType: true,
  sport: true,
  surface: true,
  isIndoor: true,
  hasLighting: true,
  bookingPurposes: true,
  description: true,
  colour: true,
  publicAttributes: true,
  visibleAttributes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

@Injectable()
export class ResourcesRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
  ) {}

  findAll(tenantId: string, venueId?: string, groupId?: string, isActive?: boolean) {
    return this.prisma.read.resource.findMany({
      where: {
        tenantId,
        ...(venueId ? { venueId } : {}),
        ...(groupId ? { groupId } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      select: RESOURCE_SELECT,
      orderBy: { name: 'asc' },
    })
  }

  findById(tenantId: string, id: string) {
    return this.prisma.read.resource.findFirst({
      where: { id, tenantId },
      select: RESOURCE_SELECT,
    })
  }

  create(tenantId: string, dto: CreateResourceDto) {
    return this.prisma.write.$transaction(async (tx) => {
      const resource = await tx.resource.create({
        data: {
          id: randomUUID(),
          tenantId,
          venueId: dto.venueId,
          groupId: dto.groupId ?? null,
          name: dto.name,
          resourceType: dto.resourceType,
          sport: dto.sport ?? null,
          surface: dto.surface ?? null,
          isIndoor: dto.isIndoor ?? null,
          hasLighting: dto.hasLighting ?? null,
          bookingPurposes: dto.bookingPurposes ?? [],
          description: dto.description ?? null,
          colour: dto.colour ?? null,
          isActive: dto.isActive ?? true,
        },
        select: RESOURCE_SELECT,
      })
      await this.outbox.enqueue(tx, this.upsertEvent(resource))
      return resource
    })
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.read.resource.findFirst({ where: { id, tenantId } })
    if (!existing) return null
    return this.prisma.write.$transaction(async (tx) => {
      const deleted = await tx.resource.delete({ where: { id } })
      const now = new Date().toISOString()
      await this.outbox.enqueue(tx, {
        eventId: randomUUID(),
        type: 'venue.resource.deleted.v1',
        tenantId,
        occurredAt: now,
        sourceUpdatedAt: now,
        data: { id },
      })
      return deleted
    })
  }

  async update(tenantId: string, id: string, dto: UpdateResourceDto) {
    const existing = await this.prisma.read.resource.findFirst({ where: { id, tenantId } })
    if (!existing) return null

    return this.prisma.write.$transaction(async (tx) => {
      const resource = await tx.resource.update({
        where: { id },
        data: {
          groupId: dto.groupId !== undefined ? dto.groupId : existing.groupId,
          name: dto.name ?? existing.name,
          resourceType: dto.resourceType ?? existing.resourceType,
          sport: dto.sport !== undefined ? dto.sport : existing.sport,
          surface: dto.surface !== undefined ? dto.surface : existing.surface,
          isIndoor: dto.isIndoor !== undefined ? dto.isIndoor : existing.isIndoor,
          hasLighting: dto.hasLighting !== undefined ? dto.hasLighting : existing.hasLighting,
          bookingPurposes:
            dto.bookingPurposes !== undefined ? dto.bookingPurposes : existing.bookingPurposes,
          description: dto.description !== undefined ? dto.description : existing.description,
          colour: dto.colour !== undefined ? dto.colour : existing.colour,
          isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
          publicAttributes:
            dto.publicAttributes !== undefined
              ? (dto.publicAttributes as object)
              : ((existing.publicAttributes as object) ?? {}),
          visibleAttributes:
            dto.visibleAttributes !== undefined
              ? dto.visibleAttributes
              : existing.visibleAttributes,
        },
        select: RESOURCE_SELECT,
      })
      await this.outbox.enqueue(tx, this.upsertEvent(resource))
      return resource
    })
  }

  private upsertEvent(resource: {
    id: string
    tenantId: string
    venueId: string
    groupId: string | null
    hasLighting: boolean | null
    isActive: boolean
    updatedAt: Date
  }): VenueProjectionEvent {
    return {
      eventId: randomUUID(),
      type: 'venue.resource.upserted.v1',
      tenantId: resource.tenantId,
      occurredAt: new Date().toISOString(),
      sourceUpdatedAt: resource.updatedAt.toISOString(),
      data: {
        id: resource.id,
        venueId: resource.venueId,
        groupId: resource.groupId,
        hasLighting: resource.hasLighting,
        isActive: resource.isActive,
      },
    }
  }
}
