import { Module } from '@nestjs/common'
import { CoachingClient } from './coaching.client.js'

@Module({ providers: [CoachingClient], exports: [CoachingClient] })
export class CoachingModule {}
