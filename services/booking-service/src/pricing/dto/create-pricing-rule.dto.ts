import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsBoolean, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePricingRuleDto {
  @ApiProperty({ example: 'Peak hours — weekday evenings' })
  @IsString() @IsNotEmpty()
  name!: string

  @ApiPropertyOptional({ example: 'Peak' })
  @IsOptional() @IsString()
  label?: string

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string

  @ApiProperty({ enum: ['organisation', 'venue', 'resource_group', 'resource', 'bookable_unit'], default: 'organisation' })
  @IsString() @IsNotEmpty()
  scopeType!: string

  @ApiPropertyOptional({ description: 'UUID of venue / resource / resource_group / bookable_unit' })
  @IsOptional() @IsString()
  scopeId?: string

  @ApiProperty({ type: [Number], example: [1, 2, 3, 4, 5], description: '0=Sun … 6=Sat. Empty = all days.' })
  @IsArray() @IsNumber({}, { each: true })
  daysOfWeek!: number[]

  @ApiPropertyOptional({ example: '17:00', description: 'Start of pricing window (HH:MM). Null = all hours.' })
  @IsOptional() @IsString()
  timeFrom?: string

  @ApiPropertyOptional({ example: '22:00' })
  @IsOptional() @IsString()
  timeTo?: string

  @ApiProperty({ example: 15.00, description: 'Rate per hour (GBP)' })
  @IsNumber() @Min(0)
  ratePerHour!: number

  @ApiPropertyOptional({ example: 'GBP', default: 'GBP' })
  @IsOptional() @IsString()
  currency?: string

  @ApiPropertyOptional({ example: 5.00, description: 'Added per hour when resource has lighting. Null = no surcharge.' })
  @IsOptional() @IsNumber() @Min(0)
  lightingSurchargePerHour?: number

  @ApiPropertyOptional({ example: 10, description: 'Override member discount %. Null = use membership-service value.' })
  @IsOptional() @IsNumber() @Min(0)
  memberDiscountPct?: number

  @ApiPropertyOptional({ example: 10, description: 'Higher priority wins when multiple rules match.' })
  @IsOptional() @IsNumber()
  priority?: number

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean
}
