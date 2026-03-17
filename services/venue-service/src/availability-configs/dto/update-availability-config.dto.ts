import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  Matches,
} from 'class-validator'

export class UpdateAvailabilityConfigDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number | null

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  opensAt?: string | null

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  closesAt?: string | null

  @IsOptional()
  @IsInt()
  @Min(1)
  slotDurationMinutes?: number | null

  @IsOptional()
  @IsInt()
  @Min(1)
  bookingIntervalMinutes?: number | null

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  newDayReleaseTime?: string | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
