import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UpsertProviderConfigDto {
  @ApiProperty({ example: 'stripe', description: "'stripe' | 'gocardless' | 'worldpay'" })
  @IsString()
  @IsNotEmpty()
  provider!: string

  @ApiPropertyOptional({ example: 'GBP' })
  @IsString()
  @IsOptional()
  currency?: string

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean

  @ApiProperty({
    example: { secretKey: 'sk_live_...', webhookSecret: 'whsec_...', publishableKey: 'pk_live_...' },
    description: 'Provider-specific credentials. Store secrets in Azure Key Vault in production.',
  })
  @IsObject()
  credentials!: Record<string, string>
}
