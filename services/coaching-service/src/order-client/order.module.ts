import { Global, Module } from '@nestjs/common'
import { OrderClient } from './order.client.js'

@Global()
@Module({ providers: [OrderClient], exports: [OrderClient] })
export class OrderModule {}
