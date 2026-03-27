import { IsInt, IsPositive, IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class RefundPaymentDto {
  @ApiPropertyOptional({
    example: 1250,
    description: 'Amount to refund in smallest currency unit. Omit for full refund.',
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  amount?: number

  @ApiPropertyOptional({ example: 'Customer requested cancellation' })
  @IsString()
  @IsOptional()
  reason?: string
}
