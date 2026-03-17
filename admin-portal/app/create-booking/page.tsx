import { PortalLayout } from "@/components/portal-layout"
import { CreateBookingForm } from "@/components/create-booking-form"
import { getBookableUnits, getAddOnServices } from "@/lib/api"

export default async function CreateBookingPage() {
  const [units, addOns] = await Promise.all([
    getBookableUnits(),
    getAddOnServices().catch(() => []),
  ])

  return (
    <PortalLayout
      title="Create Booking"
      description="Create a new booking for a court, pitch or other facility unit."
    >
      <div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <CreateBookingForm units={units} addOns={addOns} />
        </div>
      </div>
    </PortalLayout>
  )
}