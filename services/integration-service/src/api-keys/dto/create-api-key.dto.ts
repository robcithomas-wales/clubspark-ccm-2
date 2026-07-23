import { IsString, IsNotEmpty, IsArray, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export const API_KEY_SCOPES = [
  'bookings:read',
  'members:read',
  'competitions:read',
  'teams:read',
  'webhooks:manage',
] as const

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number]

export class CreateApiKeyDto {
  @ApiProperty({ example: 'My NGB Integration' })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({
    type: [String],
    enum: API_KEY_SCOPES,
    example: ['bookings:read', 'members:read'],
  })
  @IsArray()
  @IsIn(API_KEY_SCOPES, { each: true })
  scopes!: string[]
}
