import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { AvailabilityRepository } from './availability.repository.js'
import { CoachesRepository } from '../coaches/coaches.repository.js'
import type { SetAvailabilityDto } from './dto/set-availability.dto.js'
import type { CreateBlockDto } from './dto/create-block.dto.js'

export interface TimeSlot {
  startsAt: string // ISO datetime
  endsAt: string   // ISO datetime
  durationMinutes: number
}

function toMinutes(hhmm: string): number {
  const parts = hhmm.split(':').map(Number)
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
}

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly repo: AvailabilityRepository,
    private readonly coachesRepo: CoachesRepository,
  ) {}

  async getWindows(tenantId: string, coachId: string) {
    await this.assertCoachExists(tenantId, coachId)
    const windows = await this.repo.getWindows(tenantId, coachId)
    return { data: windows }
  }

  async setWindows(tenantId: string, coachId: string, dto: SetAvailabilityDto) {
    await this.assertCoachExists(tenantId, coachId)
    this.validateWindows(dto)
    const windows = await this.repo.setWindows(tenantId, coachId, dto.windows)
    return { data: windows }
  }

  async getSlots(
    tenantId: string,
    coachId: string,
    date: string,
    durationMinutes: number,
  ): Promise<{ data: TimeSlot[] }> {
    await this.assertCoachExists(tenantId, coachId)

    const targetDate = new Date(date)
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Invalid date format — use YYYY-MM-DD')
    }

    const dayOfWeek = targetDate.getDay() // 0 = Sunday

    // Get recurring availability for this day
    const windows = await this.repo.getWindows(tenantId, coachId)
    const dayWindows = windows.filter((w) => w.dayOfWeek === dayOfWeek)

    if (dayWindows.length === 0) return { data: [] }

    // Get blocks that overlap this day
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    const blocks = await this.repo.getBlocks(tenantId, coachId, dayStart, dayEnd)

    const slots: TimeSlot[] = []

    for (const window of dayWindows) {
      const windowStartMin = toMinutes(window.startTime)
      const windowEndMin = toMinutes(window.endTime)

      let cursor = windowStartMin
      while (cursor + durationMinutes <= windowEndMin) {
        const slotStart = new Date(targetDate)
        slotStart.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0)

        const slotEnd = new Date(slotStart)
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes)

        // Check if this slot overlaps any block
        const isBlocked = blocks.some(
          (b: { startsAt: Date; endsAt: Date }) => b.startsAt < slotEnd && b.endsAt > slotStart,
        )

        if (!isBlocked) {
          slots.push({
            startsAt: slotStart.toISOString(),
            endsAt: slotEnd.toISOString(),
            durationMinutes,
          })
        }

        cursor += durationMinutes
      }
    }

    return { data: slots }
  }

  async getBlocks(tenantId: string, coachId: string, from: string, to: string) {
    await this.assertCoachExists(tenantId, coachId)
    const blocks = await this.repo.getBlocks(tenantId, coachId, new Date(from), new Date(to))
    return { data: blocks }
  }

  async createBlock(tenantId: string, coachId: string, dto: CreateBlockDto) {
    await this.assertCoachExists(tenantId, coachId)
    if (new Date(dto.startsAt) >= new Date(dto.endsAt)) {
      throw new BadRequestException('endsAt must be after startsAt')
    }
    const block = await this.repo.createBlock(tenantId, coachId, dto)
    return { data: block }
  }

  async deleteBlock(tenantId: string, coachId: string, blockId: string) {
    await this.assertCoachExists(tenantId, coachId)
    await this.repo.deleteBlock(tenantId, coachId, blockId)
    return { success: true }
  }

  private async assertCoachExists(tenantId: string, coachId: string) {
    const coach = await this.coachesRepo.findById(tenantId, coachId)
    if (!coach) throw new NotFoundException('Coach not found')
  }

  private validateWindows(dto: SetAvailabilityDto) {
    for (const w of dto.windows as Array<{ dayOfWeek: number; startTime: string; endTime: string }>) {
      if (toMinutes(w.startTime) >= toMinutes(w.endTime)) {
        throw new BadRequestException(`Window startTime must be before endTime (day ${w.dayOfWeek})`)
      }
    }
  }
}
