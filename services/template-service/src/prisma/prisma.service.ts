import { Injectable, type OnModuleInit, type OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaClient } from '@prisma/client'
import type { AppConfig } from '../config/configuration.js'

/**
 * Wraps two Prisma clients: one for writes (primary) and one for reads (replica).
 * Route read-heavy queries (listings, reporting) through this.read to keep
 * write throughput on the primary database.
 *
 * Usage in a repository:
 *   const rows = await this.prisma.read.booking.findMany(...)
 *   const created = await this.prisma.write.booking.create(...)
 *
 * ASP.NET equivalent: two registered DbContext instances with different
 * connection strings, injected by name.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  readonly write: PrismaClient
  readonly read: PrismaClient

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const writeUrl = this.config.get('database.url', { infer: true })
    const readUrl = this.config.get('database.readUrl', { infer: true })

    this.write = new PrismaClient({
      datasources: { db: { url: writeUrl } },
      log: ['warn', 'error'],
    })

    // If no separate read URL configured, read client points to primary
    this.read = new PrismaClient({
      datasources: { db: { url: readUrl } },
      log: ['warn', 'error'],
    })
  }

  async onModuleInit(): Promise<void> {
    await this.write.$connect()
    if (this.read !== this.write) {
      await this.read.$connect()
    }
    this.logger.log('Database connections established')
  }

  async onModuleDestroy(): Promise<void> {
    await this.write.$disconnect()
    if (this.read !== this.write) {
      await this.read.$disconnect()
    }
  }
}
