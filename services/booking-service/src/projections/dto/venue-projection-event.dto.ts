import { IsISO8601, IsIn, IsNotEmpty, IsObject, IsString } from 'class-validator'

export const VENUE_PROJECTION_EVENT_TYPES = [
  'venue.resource.upserted.v1',
  'venue.resource.deleted.v1',
  'venue.bookable-unit.upserted.v1',
  'venue.bookable-unit.deleted.v1',
  'venue.unit-conflicts.replaced.v1',
] as const

export type VenueProjectionEventType = (typeof VENUE_PROJECTION_EVENT_TYPES)[number]

export class VenueProjectionEventDto {
  @IsString()
  @IsNotEmpty()
  eventId!: string

  @IsIn(VENUE_PROJECTION_EVENT_TYPES)
  type!: VenueProjectionEventType

  @IsString()
  @IsNotEmpty()
  tenantId!: string

  @IsISO8601()
  occurredAt!: string

  @IsISO8601()
  sourceUpdatedAt!: string

  @IsObject()
  data!: Record<string, unknown>
}
