import { notFound } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { getCompetitionById, getCompetitionMatches, getCompetitionEntries } from "@/lib/api"
import { DrawPanel } from "@/components/draw-panel"

export default async function CompetitionDrawPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ divisionId?: string }>
}) {
  const { id } = await params
  const sp = await searchParams

  const competition = await getCompetitionById(id).catch(() => null)
  if (!competition) notFound()

  const division = sp.divisionId
    ? competition.divisions?.find((d: any) => d.id === sp.divisionId)
    : competition.divisions?.[0]

  const [matchesRes, entriesRes] = await Promise.allSettled([
    getCompetitionMatches(id, division?.id),
    getCompetitionEntries(id, division?.id),
  ])

  const matches: any[] = matchesRes.status === "fulfilled" ? matchesRes.value : []
  const entries: any[] = entriesRes.status === "fulfilled" ? entriesRes.value : []

  return (
    <PortalLayout
      title={`${competition.name} — Draw`}
      description="Generate the draw, view the bracket or schedule, and manage fixtures."
    >
      <DrawPanel
        competitionId={id}
        competition={competition}
        division={division}
        initialMatches={matches}
        entries={entries}
      />
    </PortalLayout>
  )
}
