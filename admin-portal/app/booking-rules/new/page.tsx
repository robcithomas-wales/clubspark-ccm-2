import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { PortalLayout } from "@/components/portal-layout"
import { BookingRuleForm } from "../rule-form"

export default function NewBookingRulePage() {
  return (
    <PortalLayout title="New Booking Rule">
      <div className="px-8 py-8">
        <div className="mb-6">
          <Link
            href="/booking-rules"
            className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Booking rules
          </Link>
        </div>

        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Booking Setup
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">New booking rule</h1>
          <p className="mt-1 text-sm text-slate-500">
            Define who can book, what they pay, and what limits apply.
          </p>
        </div>

        <BookingRuleForm mode="create" />
      </div>
    </PortalLayout>
  )
}
