import { IsIn, IsOptional, IsDateString, IsUUID } from 'class-validator'

export type CancelSeriesMode = 'all' | 'from_date' | 'single'

export class CancelBookingSeriesDto {
  @IsIn(['all', 'from_date', 'single'])
  mode!: CancelSeriesMode

  /** Required when mode = from_date. ISO date string e.g. "2026-06-01" */
  @IsOptional()
  @IsDateString()
  fromDate?: string

  /** Required when mode = single */
  @IsOptional()
  @IsUUID()
  bookingId?: string
}
