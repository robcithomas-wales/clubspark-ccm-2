import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsPositive,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsObject,
} from 'class-validator'

export class CreateOrderItemDto {
  @ApiProperty({ description: "Product type: 'booking_slot' | 'membership_plan' | 'competition_entry' | 'coach_session' | 'add_on' | 'match_fee'" })
  @IsString()
  @IsNotEmpty()
  productType!: string

  @ApiPropertyOptional({ description: 'Cross-service product ID (no hard FK)' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  productId?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string

  @ApiProperty({ description: 'Unit amount in smallest currency unit (pence for GBP)' })
  @IsInt()
  @IsPositive()
  unitAmount!: number

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Person ID placing the order (cross-service reference)' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  personId?: string

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  currency?: string

  @ApiPropertyOptional({ description: "Subject type: 'booking' | 'membership' | 'competition_entry' | 'charge_run' | 'coach_session'" })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  subjectType?: string

  @ApiPropertyOptional({ description: 'Cross-service subject ID (no hard FK)' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  subjectId?: string

  @ApiPropertyOptional({ description: 'Idempotency key — identical keys return the existing order' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  idempotencyKey?: string

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[]
}
