import { Module } from '@nestjs/common'
import { SendRulesService } from './send-rules.service.js'

@Module({
  providers: [SendRulesService],
  exports: [SendRulesService],
})
export class SendRulesModule {}
