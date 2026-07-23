import { getWebhookSubscriptions } from '@/lib/api'
import { PortalLayout } from '@/components/portal-layout'
import { WebhooksClient } from './webhooks-client'

export default async function WebhooksPage() {
  const { data: initialSubscriptions } = await getWebhookSubscriptions()

  return (
    <PortalLayout
      title="Webhook Subscriptions"
      description="Push domain events to external endpoints when things happen on the platform."
    >
      <WebhooksClient initialSubscriptions={initialSubscriptions} />
    </PortalLayout>
  )
}
