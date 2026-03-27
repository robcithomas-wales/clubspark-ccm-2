import { notFound } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { getCompetitionById, getCompetitionMatches } from "@/lib/api"
import { FixturesPanel } from "@/components/fixtures-panel"

export default async function FixturesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ matchId?: string; divisionId?: string }>
}) {
  const { id } = await params
  const sp = await searchParams

  const competition = await getCompetitionById(id).catch(() => null)
  if (!competition) notFound()

  const matches = await getCompetitionMatches(id, sp.divisionId).catch(() => [])

  return (
    <PortalLayout
      title={`${competition.name} — Results`}
      description="Enter and verify match results. Standings update automatically when a result is verified."
    >
      <FixturesPanel
        competitionId={id}
        competition={competition}
        initialMatches={matches}
        focusMatchId={sp.matchId}
      />
    </PortalLayout>
  )
}
