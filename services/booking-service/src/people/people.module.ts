import { Module } from '@nestjs/common'
import { PeopleClient } from './people.client.js'

@Module({
  providers: [PeopleClient],
  exports: [PeopleClient],
})
export class PeopleModule {}
