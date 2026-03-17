import { IsUUID, IsDateString, IsOptional, IsString } from 'class-validator'

export class CreateBookingDto {
  @IsUUID()
  venueId!: string

  @IsUUID()
  resourceId!: string

  @IsUUID()
  bookableUnitId!: string

  @IsOptional()
  @IsUUID()
  customerId?: string

  @IsOptional()
  @IsString()
  bookingSource?: string

  @IsDateString()
  startsAt!: string

  @IsDateString()
  endsAt!: string

  @IsOptional()
  @IsString()
  notes?: string
}
