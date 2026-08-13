import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaClient } from '../generated/prisma/index.js'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  constructor() {
    // Pooler flags are applied here and nowhere else: setup-env.mjs deliberately
    // leaves DATABASE_URL clean, because appending them in two places produced a
    // doubled query string where the last duplicate silently won.
    // `connection_limit` defaults to 1 (Supabase transaction pooler, shared by 15
    // services); raise it via DB_CONNECTION_LIMIT in the root .env.
    const databaseUrl = process.env.DATABASE_URL ?? ''
    const limit = process.env.DB_CONNECTION_LIMIT ?? '1'
    const separator = databaseUrl.includes('?') ? '&' : '?'
    const url = `${databaseUrl}${separator}pgbouncer=true&connection_limit=${limit}&pool_timeout=10`
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
