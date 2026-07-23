import { IsString, IsOptional, IsArray, IsUrl, IsIn, IsBoolean } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { DOMAIN_EVENT_TYPES } from './create-webhook-subscription.dto.js'

export class UpdateWebhookSubscriptionDto {
  @ApiPropertyOptional({ example: 'Updated Name' })
  @IsString()
  @IsOptional()
  name?: string

  @ApiPropertyOptional({ example: 'https://ngb.example.com/webhooks/v2' })
  @IsUrl({ require_tld: false })
  @IsOptional()
  endpointUrl?: string

  @ApiPropertyOptional({ type: [String], enum: DOMAIN_EVENT_TYPES })
  @IsArray()
  @IsIn(DOMAIN_EVENT_TYPES, { each: true })
  @IsOptional()
  eventTypes?: string[]

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
