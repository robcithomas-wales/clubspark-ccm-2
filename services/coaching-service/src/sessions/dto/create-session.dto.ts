import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsISO8601,
  IsNumber,
  IsPositive,
} from 'class-validator'

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  coachId!: string

  @IsString()
  @IsNotEmpty()
  lessonTypeId!: string

  @IsOptional()
  @IsString()
  customerId?: string

  @IsISO8601()
  startsAt!: string

  @IsISO8601()
  endsAt!: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsString()
  paymentStatus?: string

  @IsOptional()
  @IsNumber()
  @IsPositive()
  priceCharged?: number

  /**
   * Optional link to a venue bookable unit.
   * When provided, the booking-service availability check will include this
   * coaching session in its conflict detection, preventing double-bookings
   * of the same court slot.
   */
  @IsOptional()
  @IsString()
  bookableUnitId?: string
}
