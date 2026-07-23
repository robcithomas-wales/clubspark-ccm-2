import { Module } from '@nestjs/common'
import { AccountingSyncController } from './accounting-sync.controller.js'
import { AccountingSyncService } from './accounting-sync.service.js'
import { AccountingSyncRepository } from './accounting-sync.repository.js'
import { OAuthConnectionsModule } from '../oauth-connections/oauth-connections.module.js'
import { AccountingSettingsModule } from '../accounting-settings/accounting-settings.module.js'
import { XeroClientService } from '../accounting/xero-client.service.js'
import { QuickBooksClientService } from '../accounting/quickbooks-client.service.js'

@Module({
  imports: [OAuthConnectionsModule, AccountingSettingsModule],
  controllers: [AccountingSyncController],
  providers: [AccountingSyncService, AccountingSyncRepository, XeroClientService, QuickBooksClientService],
  exports: [AccountingSyncService],
})
export class AccountingSyncModule {}
