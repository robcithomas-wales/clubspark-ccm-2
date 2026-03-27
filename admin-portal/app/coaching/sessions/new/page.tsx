import { PortalLayout } from "@/components/portal-layout"
import { NewSessionForm } from "@/components/new-session-form"

export default function NewSessionPage() {
  return (
    <PortalLayout title="Book Session" description="Schedule a new coaching session.">
      <NewSessionForm />
    </PortalLayout>
  )
}
