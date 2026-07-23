import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaClient } from '../generated/prisma/index.js'

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  private readonly _client: PrismaClient
  readonly write: PrismaClient
  readonly read: PrismaClient

  constructor() {
    const databaseUrl = process.env.DATABASE_URL ?? ''
    const separator = databaseUrl.includes('?') ? '&' : '?'
    const url = `${databaseUrl}${separator}pgbouncer=true&connection_limit=1&pool_timeout=10`
    this._client = new PrismaClient({ datasourceUrl: url })
    this.write = this._client
    this.read = this._client
  }

  async onModuleInit(): Promise<void> {
    await this._client.$connect()
    this.logger.log('Database connections established')
  }

  async onModuleDestroy(): Promise<void> {
    await this._client.$disconnect()
  }
}
