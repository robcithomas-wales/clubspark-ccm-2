import { Suspense } from "react"
import Link from "next/link"
import { Plus, Upload } from "lucide-react"
import { getCustomers } from "@/lib/api"
import { PortalLayout } from "@/components/portal-layout"
import { PaginationBar } from "@/components/pagination-bar"
import { LifecycleBadge } from "@/components/lifecycle-panel"
import { PeopleSearchBar } from "@/components/people-search-bar"

type Person = {
  id: string
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  lifecycleState?: string | null
  personTags?: Array<{ tagId: string; tag: { name: string; colour?: string | null } }>
  createdAt?: string | null
}

function getPersonName(p: Person) {
  const name = `${p.firstName?.trim() ?? ""} ${p.lastName?.trim() ?? ""}`.trim()
  return name || "Unnamed"
}

function StatCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition-shadow hover:shadow-lg">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</div>
      {helper ? <div className="mt-1 text-sm text-slate-500">{helper}</div> : null}
    </div>
  )
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; lifecycle?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  const result = await getCustomers(page, 25, {
    search: params.search,
    lifecycle: params.lifecycle,
  })
  const people: Person[] = result.data ?? []
  const pagination = result.pagination

  const activeCount = people.filter((p) => p.lifecycleState === "active").length
  const withEmail = people.filter((p) => !!p.email).length
  const latest = people[0]

  return (
    <PortalLayout
      title="People"
      description="Customer and member records for assisted bookings, memberships, and future self-service journeys."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total people" value={pagination?.total ?? 0} helper="Records in the platform" />
          <StatCard label="Active" value={activeCount} helper="On this page" />
          <StatCard label="With email" value={withEmail} helper="Useful for confirmations" />
          <StatCard
            label="Latest"
            value={latest ? getPersonName(latest) : "n/a"}
            helper={latest?.lifecycleState ?? undefined}
          />
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">People</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Records available for phone, admin, and future app bookings.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 md:block">
                  {pagination?.total ?? 0} records
                </div>
                <Link
                  href="/people/import"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Link>
                <Link
                  href="/people/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-[#1832A8]"
                >
                  <Plus className="h-4 w-4 !text-white" />
                  New person
                </Link>
              </div>
            </div>
            <Suspense>
              <PeopleSearchBar />
            </Suspense>
          </div>

          {people.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500">No people found.</div>
          ) : (
            <>
              <div className="hidden grid-cols-5 gap-4 border-b border-slate-200 bg-slate-100 px-6 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid">
                <div>Name</div>
                <div>Email</div>
                <div>Phone</div>
                <div>Status</div>
                <div>Tags</div>
              </div>

              <div className="divide-y divide-slate-200">
                {people.map((person) => (
                  <Link
                    key={person.id}
                    href={`/people/${person.id}`}
                    className="block px-6 py-5 transition hover:bg-blue-50/40"
                  >
                    <div className="grid gap-4 lg:grid-cols-5 lg:items-center">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">Name</div>
                        <div className="truncate font-semibold text-slate-900">{getPersonName(person)}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">Email</div>
                        <div className="truncate text-sm text-slate-700">{person.email || "No email"}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">Phone</div>
                        <div className="truncate text-sm text-slate-700">{person.phone || "No phone"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">Status</div>
                        <LifecycleBadge state={person.lifecycleState ?? "active"} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 lg:hidden">Tags</div>
                        <div className="text-sm text-slate-500">
                          {person.personTags && person.personTags.length > 0
                            ? `${person.personTags.length} tag${person.personTags.length !== 1 ? "s" : ""}`
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {pagination && (
                <PaginationBar
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  basePath="/people"
                />
              )}
            </>
          )}
        </section>
      </div>
    </PortalLayout>
  )
}
