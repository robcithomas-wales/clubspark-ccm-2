import { IsString, IsNotEmpty, IsInt, IsPositive, IsOptional, IsObject } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePaymentDto {
  @ApiProperty({ example: 'booking', description: "What this payment is for: 'booking' | 'membership' | 'charge_run_item'" })
  @IsString()
  @IsNotEmpty()
  subjectType!: string

  @ApiProperty({ example: 'uuid' })
  @IsString()
  @IsNotEmpty()
  subjectId!: string

  @ApiPropertyOptional({ example: 'uuid' })
  @IsString()
  @IsOptional()
  customerId?: string

  @ApiProperty({ example: 2500, description: 'Amount in smallest currency unit (pence for GBP)' })
  @IsInt()
  @IsPositive()
  amount!: number

  @ApiPropertyOptional({ example: 'GBP' })
  @IsString()
  @IsOptional()
  currency?: string

  @ApiProperty({
    example: 'booking:uuid:attempt:1',
    description: 'Stable key — duplicate submissions with the same key return the existing payment',
  })
  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string

  @ApiPropertyOptional({ example: { venueId: 'uuid', bookingReference: 'BK-XXXXX' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>
}
