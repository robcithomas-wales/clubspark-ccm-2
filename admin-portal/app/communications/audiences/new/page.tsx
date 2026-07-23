import { PortalLayout } from "@/components/portal-layout"
import { NewAudienceForm } from "./new-audience-form"

export default function NewAudiencePage() {
  return (
    <PortalLayout
      title="New saved audience"
      description="Define audience rules. They will be resolved when you send a campaign."
    >
      <div className="max-w-2xl">
        <NewAudienceForm />
      </div>
    </PortalLayout>
  )
}
