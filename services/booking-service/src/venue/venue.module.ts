import { Module } from '@nestjs/common'
import { VenueClient } from './venue.client.js'

@Module({
  providers: [VenueClient],
  exports: [VenueClient],
})
export class VenueModule {}
