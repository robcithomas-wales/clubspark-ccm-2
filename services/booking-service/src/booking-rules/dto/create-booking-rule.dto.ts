import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsIn,
  IsArray,
  Min,
  Max,
  ValidateNested,
  IsPositive,
} from 'class-validator'
import { Type } from 'class-transformer'

export const SUBJECT_TYPES = ['everyone', 'role', 'membership_plan', 'membership_scheme'] as const
export const SCOPE_TYPES = ['organisation', 'resource_group', 'resource'] as const

export class PurposePriceDto {
  @IsString()
  @IsNotEmpty()
  purpose!: string

  @IsNumber()
  @Min(0)
  price!: number

  @IsString()
  @IsNotEmpty()
  currency!: string
}

export class CreateBookingRuleDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsIn(SUBJECT_TYPES)
  subjectType!: string

  @IsOptional()
  @IsString()
  subjectRef?: string

  @IsIn(SCOPE_TYPES)
  scopeType!: string

  @IsOptional()
  @IsString()
  scopeId?: string

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[]

  @IsOptional()
  @IsString()
  timeFrom?: string

  @IsOptional()
  @IsString()
  timeTo?: string

  @IsBoolean()
  canBook!: boolean

  @IsBoolean()
  requiresApproval!: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  advanceDays?: number

  @IsOptional()
  @IsInt()
  @IsPositive()
  minSlotMinutes?: number

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxSlotMinutes?: number

  @IsOptional()
  @IsInt()
  @IsPositive()
  bookingPeriodDays?: number

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxBookingsPerPeriod?: number

  @IsBoolean()
  allowSeries!: boolean

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerSlot?: number

  @IsOptional()
  @IsString()
  priceCurrency?: string

  @IsOptional()
  @IsInt()
  @IsPositive()
  minParticipants?: number

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxParticipants?: number

  @IsInt()
  @Min(0)
  priority!: number

  @IsBoolean()
  isActive!: boolean

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurposePriceDto)
  purposePrices?: PurposePriceDto[]
}
