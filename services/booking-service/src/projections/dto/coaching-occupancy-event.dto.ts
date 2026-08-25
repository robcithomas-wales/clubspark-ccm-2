import { IsISO8601, IsIn, IsObject, IsUUID } from 'class-validator'

export class CoachingOccupancyEventDto {
  @IsUUID() eventId!: string
  @IsIn(['coaching.occupancy.upserted.v1', 'coaching.occupancy.deleted.v1'])
  type!: 'coaching.occupancy.upserted.v1' | 'coaching.occupancy.deleted.v1'
  @IsUUID() tenantId!: string
  @IsISO8601() occurredAt!: string
  @IsISO8601() sourceUpdatedAt!: string
  @IsObject() data!: Record<string, unknown>
}
