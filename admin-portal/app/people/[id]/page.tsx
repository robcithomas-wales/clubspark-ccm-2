import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Mail, Phone, CalendarDays, Hash, ShieldCheck } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { getCustomerById, getTags } from "@/lib/api"
import { EditCustomerPanel } from "@/components/edit-customer-panel"
import { LifecyclePanel } from "@/components/lifecycle-panel"
import { PersonTagsPanel } from "@/components/person-tags-panel"

function formatDate(value?: string | null) {
  if (!value) return "n/a"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getPersonName(p: any) {
  return `${p.firstName?.trim() ?? ""} ${p.lastName?.trim() ?? ""}`.trim() || "Unnamed"
}

function getInitials(p: any) {
  const f = p.firstName?.trim()?.[0] ?? ""
  const l = p.lastName?.trim()?.[0] ?? ""
  return `${f}${l}`.toUpperCase() || "?"
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let person: any
  try {
    const result = await getCustomerById(id)
    person = result.data
  } catch {
    notFound()
  }
  if (!person) notFound()

  let catalogueTags: any[] = []
  try {
    const tagsResult = await getTags()
    catalogueTags = tagsResult.data ?? []
  } catch {
    // non-fatal — tags panel will show empty catalogue
  }

  return (
    <PortalLayout title={getPersonName(person)} description="Person record">
      <div className="space-y-6">
        <div>
          <Link
            href="/people"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to people
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          <div className="flex items-center gap-5 border-b border-slate-200 px-6 py-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#1857E0] text-xl font-bold text-white">
              {getInitials(person)}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{getPersonName(person)}</h2>
              <p className="mt-1 text-sm text-slate-500 capitalize">{person.lifecycleState ?? "active"}</p>
            </div>
          </div>

          <div className="grid gap-px bg-slate-200 md:grid-cols-2">
            <div className="flex items-center gap-3 bg-white px-6 py-5">
              <Mail className="h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Email</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{person.email || "Not provided"}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-6 py-5">
              <Phone className="h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Phone</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{person.phone || "Not provided"}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-6 py-5">
              <ShieldCheck className="h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Marketing consent</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                    person.marketingConsent
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                      : "bg-slate-100 text-slate-600 ring-slate-500/20"
                  }`}>
                    {person.marketingConsent ? "Opted in" : "Not given"}
                  </span>
                  {person.consentRecordedAt && (
                    <span className="text-xs text-slate-400">{formatDate(person.consentRecordedAt)}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-6 py-5">
              <CalendarDays className="h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Created</div>
                <div className="mt-1 text-sm font-medium text-slate-900">{formatDate(person.createdAt)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white px-6 py-5 md:col-span-2">
              <Hash className="h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">ID</div>
                <div className="mt-1 font-mono text-xs text-slate-500">{person.id}</div>
              </div>
            </div>
          </div>
        </div>

        <LifecyclePanel
          customerId={person.id}
          currentState={person.lifecycleState ?? "active"}
        />

        <PersonTagsPanel
          customerId={person.id}
          personTags={person.personTags ?? []}
          catalogueTags={catalogueTags}
        />

        <EditCustomerPanel
          customerId={person.id}
          firstName={person.firstName ?? ""}
          lastName={person.lastName ?? ""}
          email={person.email ?? ""}
          phone={person.phone ?? ""}
          marketingConsent={person.marketingConsent ?? false}
        />

        <div className="flex gap-3">
          <Link
            href={`/create-booking?customerId=${person.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium !text-white shadow-sm transition hover:bg-[#174ED0]"
          >
            Create booking for this person
          </Link>
        </div>
      </div>
    </PortalLayout>
  )
}
