import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service.js'

/**
 * Global module — PrismaService is available in every module
 * without needing to import PrismaModule explicitly.
 *
 * ASP.NET equivalent: registering DbContext as a scoped service
 * in Program.cs so it's available via DI everywhere.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
