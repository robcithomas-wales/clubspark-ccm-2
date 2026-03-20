import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { PeopleImportForm } from "@/components/people-import-form"

export default function PeopleImportPage() {
  return (
    <PortalLayout
      title="Import Contacts"
      description="Upload a CSV file to bulk-import contact records."
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href="/people"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to people
          </Link>
        </div>
        <PeopleImportForm />
      </div>
    </PortalLayout>
  )
}
