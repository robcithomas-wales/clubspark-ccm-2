import { Injectable, NotFoundException } from '@nestjs/common'
import { AvailabilityConfigsRepository } from './availability-configs.repository.js'
import { CreateAvailabilityConfigDto } from './dto/create-availability-config.dto.js'
import { UpdateAvailabilityConfigDto } from './dto/update-availability-config.dto.js'

// Scope priority: resource (most specific) > resource_group > venue (least specific)
const SCOPE_PRIORITY: Record<string, number> = {
  resource: 0,
  resource_group: 1,
  venue: 2,
}

type RawConfig = {
  scopeType: string
  dayOfWeek: number | null
  opensAt: string | null
  closesAt: string | null
  slotDurationMinutes: number | null
  bookingIntervalMinutes: number | null
  newDayReleaseTime: string | null
}

function mergeConfigs(configs: RawConfig[], dayOfWeek: number) {
  // For a given day, resolve each field by taking the value from the most
  // specific scope that defines it. Day-specific configs override catch-all
  // (dayOfWeek = null) configs at the same scope level.
  const fields = [
    'opensAt', 'closesAt', 'slotDurationMinutes',
    'bookingIntervalMinutes', 'newDayReleaseTime',
  ] as const

  // Sort: lower priority number = more specific = wins
  // Within same scope, day-specific (not null) beats catch-all (null)
  const sorted = [...configs].sort((a, b) => {
    const pa = SCOPE_PRIORITY[a.scopeType] ?? 99
    const pb = SCOPE_PRIORITY[b.scopeType] ?? 99
    if (pa !== pb) return pa - pb
    // same scope: day-specific wins over catch-all
    const aSpecific = a.dayOfWeek !== null && a.dayOfWeek === dayOfWeek ? 0 : 1
    const bSpecific = b.dayOfWeek !== null && b.dayOfWeek === dayOfWeek ? 0 : 1
    return aSpecific - bSpecific
  })

  // Only consider configs that apply to this day (day-specific match OR catch-all)
  const applicable = sorted.filter(
    (c) => c.dayOfWeek === null || c.dayOfWeek === dayOfWeek,
  )

  const result: Record<string, unknown> = {}
  for (const field of fields) {
    for (const config of applicable) {
      if (config[field] !== null && config[field] !== undefined) {
        result[field] = config[field]
        break
      }
    }
  }

  return result
}

@Injectable()
export class AvailabilityConfigsService {
  constructor(private readonly repo: AvailabilityConfigsRepository) {}

  async list(tenantId: string, scopeType?: string, scopeId?: string) {
    const configs = await this.repo.findAll(tenantId, scopeType, scopeId)
    return { data: configs }
  }

  async getById(tenantId: string, id: string) {
    const config = await this.repo.findById(tenantId, id)
    if (!config) throw new NotFoundException('Availability config not found')
    return { data: config }
  }

  async create(tenantId: string, dto: CreateAvailabilityConfigDto) {
    const config = await this.repo.create(tenantId, dto)
    return { data: config }
  }

  async update(tenantId: string, id: string, dto: UpdateAvailabilityConfigDto) {
    const config = await this.repo.update(tenantId, id, dto)
    if (!config) throw new NotFoundException('Availability config not found')
    return { data: config }
  }

  async remove(tenantId: string, id: string) {
    const result = await this.repo.delete(tenantId, id)
    if (!result) throw new NotFoundException('Availability config not found')
  }

  /**
   * Returns the effective (merged) availability config for a given resource
   * and day of the week. Walks venue → resource_group → resource, with
   * more-specific scopes overriding less-specific ones.
   */
  async getEffective(
    tenantId: string,
    resourceId: string,
    groupId: string | null,
    venueId: string,
    dayOfWeek: number,
  ) {
    const configs = await this.repo.findForResource(tenantId, resourceId, groupId, venueId)
    const merged = mergeConfigs(configs, dayOfWeek)
    return {
      data: {
        resourceId,
        venueId,
        groupId,
        dayOfWeek,
        ...merged,
      },
    }
  }
}
