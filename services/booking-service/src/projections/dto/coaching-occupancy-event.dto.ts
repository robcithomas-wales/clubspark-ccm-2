import { IsISO8601, IsIn, IsNotEmpty, IsObject, IsString } from 'class-validator'

export class CoachingOccupancyEventDto {
  @IsString() @IsNotEmpty() eventId!: string
  @IsIn(['coaching.occupancy.upserted.v1', 'coaching.occupancy.deleted.v1'])
  type!: 'coaching.occupancy.upserted.v1' | 'coaching.occupancy.deleted.v1'
  @IsString() @IsNotEmpty() tenantId!: string
  @IsISO8601() occurredAt!: string
  @IsISO8601() sourceUpdatedAt!: string
  @IsObject() data!: Record<string, unknown>
}
