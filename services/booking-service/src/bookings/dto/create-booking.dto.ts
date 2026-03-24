import { IsDateString, IsOptional, IsString, IsNotEmpty, IsIn, IsArray, IsBoolean, IsNumber, Min } from 'class-validator'
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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionalUnitIds?: string[]

  @IsOptional()
  @IsIn(['active', 'pending'])
  status?: 'active' | 'pending'

  @IsOptional()
  @IsBoolean()
  adminOverride?: boolean

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number

  @IsOptional()
  @IsString()
  currency?: string

  @IsOptional()
  @IsString()
  coachId?: string

  @IsOptional()
  @IsString()
  lessonTypeId?: string
}
