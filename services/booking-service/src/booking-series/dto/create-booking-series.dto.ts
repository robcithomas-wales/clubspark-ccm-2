import { IsDateString, IsOptional, IsString, IsNotEmpty, IsIn } from 'class-validator'
import { PAYMENT_STATUSES } from '../../bookings/dto/update-payment-status.dto.js'

export class CreateBookingSeriesDto {
  @IsString()
  @IsNotEmpty()
  venueId!: string

  @IsString()
  @IsNotEmpty()
  resourceId!: string

  @IsString()
  @IsNotEmpty()
  bookableUnitId!: string

  @IsOptional()
  @IsString()
  customerId?: string

  @IsOptional()
  @IsString()
  bookingSource?: string

  /** ISO datetime of first occurrence start — date + time */
  @IsDateString()
  startsAt!: string

  /** ISO datetime of first occurrence end — same date, later time */
  @IsDateString()
  endsAt!: string

  /** iCal RRULE without the "RRULE:" prefix, e.g. "FREQ=WEEKLY;BYDAY=MO;COUNT=10" */
  @IsString()
  rrule!: string

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: string

  @IsOptional()
  @IsString()
  notes?: string
}
