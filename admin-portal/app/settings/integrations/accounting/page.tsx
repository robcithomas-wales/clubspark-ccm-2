import { getOAuthConnections, getAccountingSettings, getAccountingSyncLog } from '@/lib/api'
import { AccountingClient } from './accounting-client'

export default async function AccountingPage() {
  const [connectionsRes, settings, syncLog] = await Promise.allSettled([
    getOAuthConnections(),
    getAccountingSettings(),
    getAccountingSyncLog(1),
  ])

  const connections = connectionsRes.status === 'fulfilled' ? connectionsRes.value.data : []
  const initialSettings = settings.status === 'fulfilled' ? settings.value : null
  const initialSyncLog = syncLog.status === 'fulfilled' ? syncLog.value : { data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 1 } }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Accounting Integration</h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect Xero or QuickBooks to automatically push invoices, payments, and credit notes when financial events occur.
        </p>
      </div>
      <AccountingClient
        initialConnections={connections}
        initialSettings={initialSettings}
        initialSyncLog={initialSyncLog}
      />
    </div>
  )
}
