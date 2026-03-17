import { PortalLayout } from "@/components/portal-layout"

async function getResources() {
  const res = await fetch("http://localhost:4003/resources", {
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error("Failed to load resources")
  }

  return res.json()
}

export default async function ResourcesPage() {
  const resources = await getResources()

  return (
    <PortalLayout
      title="Resources"
      description="Physical facilities such as courts and pitches."
    >
      <div className="space-y-4">
        {resources.map((resource: any) => (
          <div
            key={resource.id}
            className="card p-5"
          >
            <div className="font-semibold text-[var(--text)]">{resource.name}</div>
            <div className="mt-2 text-sm text-[var(--text-muted)]">
              Type: {resource.resourceType}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              Sport: {resource.sport || "Not set"}
            </div>
          </div>
        ))}
      </div>
    </PortalLayout>
  )
}