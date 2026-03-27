import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaClient } from '../generated/prisma/index.js'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    const url = `${process.env.DATABASE_URL ?? ''}?connection_limit=2&pool_timeout=10`
    super({ datasourceUrl: url })
  }

  async onModuleInit(): Promise<void> {
    await this.$connect()
    this.logger.log('Database connections established')
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect()
  }
}
