import { Global, Module } from '@nestjs/common'
import { GatewayFactory } from './gateway.factory.js'

@Global()
@Module({
  providers: [GatewayFactory],
  exports: [GatewayFactory],
})
export class GatewayModule {}
