import { PortalLayout } from "@/components/portal-layout"
import { ComposeForm } from "./compose-form"

export default function ComposePage() {
  return (
    <PortalLayout
      title="Compose"
      description="Send an email to a group of members or contacts."
    >
      <div className="max-w-2xl">
        <ComposeForm />
      </div>
    </PortalLayout>
  )
}
