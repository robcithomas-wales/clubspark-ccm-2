import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsIn,
  Matches,
} from 'class-validator'

export class CreateAvailabilityConfigDto {
  @IsIn(['venue', 'resource_group', 'resource'])
  scopeType!: 'venue' | 'resource_group' | 'resource'

  @IsUUID()
  scopeId!: string

  /** 0 = Sunday … 6 = Saturday. Omit for a rule that applies every day. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number

  /** "HH:MM" 24-hour, e.g. "08:00" */
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  opensAt?: string

  /** "HH:MM" 24-hour, e.g. "22:00" */
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  closesAt?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  slotDurationMinutes?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  bookingIntervalMinutes?: number

  /** "HH:MM" — time of day when the next day's slots are released */
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  newDayReleaseTime?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
