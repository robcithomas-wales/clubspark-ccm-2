import { Module } from '@nestjs/common'
import { AccountingSettingsController } from './accounting-settings.controller.js'
import { AccountingSettingsService } from './accounting-settings.service.js'
import { AccountingSettingsRepository } from './accounting-settings.repository.js'
import { OAuthConnectionsModule } from '../oauth-connections/oauth-connections.module.js'
import { XeroClientService } from '../accounting/xero-client.service.js'
import { QuickBooksClientService } from '../accounting/quickbooks-client.service.js'

@Module({
  imports: [OAuthConnectionsModule],
  controllers: [AccountingSettingsController],
  providers: [AccountingSettingsService, AccountingSettingsRepository, XeroClientService, QuickBooksClientService],
  exports: [AccountingSettingsService, AccountingSettingsRepository],
})
export class AccountingSettingsModule {}
