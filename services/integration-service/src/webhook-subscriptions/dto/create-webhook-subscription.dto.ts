import { IsString, IsNotEmpty, IsArray, IsUrl, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export const DOMAIN_EVENT_TYPES = [
  'booking.confirmed',
  'booking.cancelled',
  'booking.reminder_due',
  'membership.activated',
  'membership.renewal_due',
  'membership.expired',
  'payment.succeeded',
  'payment.failed',
  'payment.refund_issued',
  'fixture.reminder_due',
] as const

export class CreateWebhookSubscriptionDto {
  @ApiProperty({ example: 'My NGB Booking Feed' })
  @IsString()
  @IsNotEmpty()
  name!: string

  @ApiProperty({ example: 'https://ngb.example.com/webhooks/clubspark' })
  @IsUrl({ require_tld: false })
  endpointUrl!: string

  @ApiProperty({
    type: [String],
    enum: DOMAIN_EVENT_TYPES,
    example: ['booking.confirmed', 'booking.cancelled'],
  })
  @IsArray()
  @IsIn(DOMAIN_EVENT_TYPES, { each: true })
  eventTypes!: string[]
}
