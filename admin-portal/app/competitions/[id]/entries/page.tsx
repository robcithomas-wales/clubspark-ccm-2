import { notFound } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { getCompetitionById, getCompetitionEntries } from "@/lib/api"
import { CompetitionEntriesPanel } from "@/components/competition-entries-panel"

export default async function CompetitionEntriesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [competition, entries] = await Promise.allSettled([
    getCompetitionById(id),
    getCompetitionEntries(id),
  ])

  const comp = competition.status === "fulfilled" ? competition.value : null
  if (!comp) notFound()

  const allEntries: any[] = entries.status === "fulfilled" ? entries.value : []

  return (
    <PortalLayout
      title={`${comp.name} — Entries`}
      description="Manage competition entries: confirm registrations, assign seeds, and allocate to divisions."
    >
      <CompetitionEntriesPanel
        competitionId={id}
        competition={comp}
        initialEntries={allEntries}
      />
    </PortalLayout>
  )
}
