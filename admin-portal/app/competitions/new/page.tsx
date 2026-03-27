import { PortalLayout } from "@/components/portal-layout"
import { NewCompetitionForm } from "@/components/new-competition-form"

export default function NewCompetitionPage() {
  return (
    <PortalLayout
      title="New Competition"
      description="Set up a new competition — choose the sport, format, entry type and registration settings."
    >
      <NewCompetitionForm />
    </PortalLayout>
  )
}
