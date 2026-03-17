import { IsDateString, IsOptional, IsString, IsNotEmpty, IsIn } from 'class-validator'
import { PAYMENT_STATUSES } from './update-payment-status.dto.js'

export class CreateBookingDto {
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

  @IsDateString()
  startsAt!: string

  @IsDateString()
  endsAt!: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: string
}
