import { IsIn, IsOptional, IsDateString, IsUUID, IsString, IsIn as IsInValidator } from 'class-validator'
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
  @IsUUID()
  bookingId?: string

  // ─── Fields to update ───────────────────────────────────────────────────────

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsUUID()
  customerId?: string

  @IsOptional()
  @IsString()
  bookingSource?: string

  @IsOptional()
  @IsInValidator(PAYMENT_STATUSES)
  paymentStatus?: string
}
