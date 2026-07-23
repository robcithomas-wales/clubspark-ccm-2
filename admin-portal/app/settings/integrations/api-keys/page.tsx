import { getApiKeys } from '@/lib/api'
import { PortalLayout } from '@/components/portal-layout'
import { ApiKeysClient } from './api-keys-client'

export default async function ApiKeysPage() {
  const { data: initialKeys } = await getApiKeys().catch(() => ({ data: [] }))

  return (
    <PortalLayout
      title="API Keys"
      description="Issue and manage long-lived API credentials for third-party integrations."
    >
      <ApiKeysClient initialKeys={initialKeys} />
    </PortalLayout>
  )
}
