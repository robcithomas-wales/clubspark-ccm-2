import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { CreateAvailabilityConfigDto } from './dto/create-availability-config.dto.js'
import { UpdateAvailabilityConfigDto } from './dto/update-availability-config.dto.js'

@Injectable()
export class AvailabilityConfigsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, scopeType?: string, scopeId?: string) {
    return this.prisma.read.availabilityConfig.findMany({
      where: {
        tenantId,
        ...(scopeType ? { scopeType } : {}),
        ...(scopeId ? { scopeId } : {}),
      },
      orderBy: [{ scopeType: 'asc' }, { dayOfWeek: 'asc' }],
    })
  }

  findById(tenantId: string, id: string) {
    return this.prisma.read.availabilityConfig.findFirst({ where: { id, tenantId } })
  }

  create(tenantId: string, dto: CreateAvailabilityConfigDto) {
    return this.prisma.write.availabilityConfig.create({
      data: {
        tenantId,
        scopeType: dto.scopeType,
        scopeId: dto.scopeId,
        dayOfWeek: dto.dayOfWeek ?? null,
        opensAt: dto.opensAt ?? null,
        closesAt: dto.closesAt ?? null,
        slotDurationMinutes: dto.slotDurationMinutes ?? null,
        bookingIntervalMinutes: dto.bookingIntervalMinutes ?? null,
        newDayReleaseTime: dto.newDayReleaseTime ?? null,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async update(tenantId: string, id: string, dto: UpdateAvailabilityConfigDto) {
    const existing = await this.prisma.read.availabilityConfig.findFirst({ where: { id, tenantId } })
    if (!existing) return null

    return this.prisma.write.availabilityConfig.update({
      where: { id },
      data: {
        dayOfWeek: dto.dayOfWeek !== undefined ? dto.dayOfWeek : existing.dayOfWeek,
        opensAt: dto.opensAt !== undefined ? dto.opensAt : existing.opensAt,
        closesAt: dto.closesAt !== undefined ? dto.closesAt : existing.closesAt,
        slotDurationMinutes: dto.slotDurationMinutes !== undefined ? dto.slotDurationMinutes : existing.slotDurationMinutes,
        bookingIntervalMinutes: dto.bookingIntervalMinutes !== undefined ? dto.bookingIntervalMinutes : existing.bookingIntervalMinutes,
        newDayReleaseTime: dto.newDayReleaseTime !== undefined ? dto.newDayReleaseTime : existing.newDayReleaseTime,
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
      },
    })
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.read.availabilityConfig.findFirst({ where: { id, tenantId } })
    if (!existing) return null
    return this.prisma.write.availabilityConfig.delete({ where: { id } })
  }

  /**
   * Returns all active configs that could apply to a given resource, across
   * all three scope levels. The service layer merges these into one effective config.
   */
  findForResource(tenantId: string, resourceId: string, groupId: string | null, venueId: string) {
    const scopeConditions = [
      { scopeType: 'resource', scopeId: resourceId },
      { scopeType: 'venue', scopeId: venueId },
      ...(groupId ? [{ scopeType: 'resource_group', scopeId: groupId }] : []),
    ]

    return this.prisma.read.availabilityConfig.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: scopeConditions,
      },
      orderBy: [{ scopeType: 'asc' }, { dayOfWeek: 'asc' }],
    })
  }
}
