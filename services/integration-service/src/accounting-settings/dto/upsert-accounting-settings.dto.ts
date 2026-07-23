import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UpsertAccountingSettingsDto {
  @ApiProperty({ enum: ['xero', 'quickbooks'] })
  @IsString()
  @IsIn(['xero', 'quickbooks'])
  provider!: string

  @ApiProperty({ description: 'Revenue account code from the connected provider' })
  @IsString()
  @IsNotEmpty()
  revenueAccountCode!: string

  @ApiPropertyOptional({ description: 'Tax rate / code from the connected provider' })
  @IsOptional()
  @IsString()
  taxRateId?: string

  @ApiPropertyOptional({ enum: ['DRAFT', 'AUTHORISED'], default: 'AUTHORISED' })
  @IsOptional()
  @IsIn(['DRAFT', 'AUTHORISED'])
  invoiceMode?: string

  @ApiPropertyOptional({ default: 'GBP' })
  @IsOptional()
  @IsString()
  currencyCode?: string
}
