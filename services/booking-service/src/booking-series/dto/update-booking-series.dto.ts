import { IsIn, IsOptional, IsDateString, IsString, IsNotEmpty, IsIn as IsInValidator } from 'class-validator'
import { PAYMENT_STATUSES } from '../../bookings/dto/update-payment-status.dto.js'

export type EditSeriesMode = 'all' | 'from_date' | 'single'

export class UpdateBookingSeriesDto {
  @IsIn(['all', 'from_date', 'single'])
  mode!: EditSeriesMode

  /** Required when mode = from_date. ISO date string e.g. "2026-06-01" */
  @IsOptional()
  @IsDateString()
  fromDate?: string

  /** Required when mode = single */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bookingId?: string

  // ─── Fields to update ───────────────────────────────────────────────────────

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerId?: string

  @IsOptional()
  @IsString()
  bookingSource?: string

  @IsOptional()
  @IsInValidator(PAYMENT_STATUSES)
  paymentStatus?: string
}
