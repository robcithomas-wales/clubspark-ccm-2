"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO, isAfter } from "date-fns"
import { Mail, Phone, Star, Calendar, Clock, LogOut, X, AlertCircle, ChevronDown, ChevronUp, BadgeCheck, MapPin, Layers } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchMyProfile, fetchMyBookings, fetchMyMembership, cancelBooking, type CustomerProfile, type Booking, type Membership } from "@/lib/api"
import { useOrg } from "@/lib/org-context"
import Link from "next/link"

export default function AccountPage() {
  const org = useOrg()
  const router = useRouter()
  const primary = org.primaryColour

  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null)
  const [membershipExpanded, setMembershipExpanded] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push(`/${org.slug}/login`); return }
      setUser(data.user)
      const [p, m, b] = await Promise.allSettled([
        fetchMyProfile(org.tenantId, data.user.id),
        fetchMyMembership(org.tenantId, data.user.id),
        fetchMyBookings(org.tenantId, data.user.id),
      ])
      if (p.status === "fulfilled") setProfile(p.value)
      if (m.status === "fulfilled") setMembership(m.value)
      if (b.status === "fulfilled") setBookings(b.value.filter((bk) => bk.status === "active"))
      setLoading(false)
    })
  }, [org.tenantId, org.slug, router])

  async function handleCancel(bookingId: string) {
    setCancellingId(bookingId)
    setCancelError(null)
    try {
      await cancelBooking(org.tenantId, bookingId)
      setBookings((prev) => prev.filter((b) => b.id !== bookingId))
      setConfirmCancelId(null)
      setExpandedBookingId(null)
    } catch (e: any) {
      setCancelError(e.message ?? "Could not cancel booking. Please try again.")
    } finally {
      setCancellingId(null)
    }
  }

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push(`/${org.slug}/login`)
  }

  const upcomingBookings = bookings.filter((b) => isAfter(parseISO(b.startsAt), new Date()))
  const pastBookings = bookings.filter((b) => !isAfter(parseISO(b.startsAt), new Date()))
  const firstName = profile?.firstName ?? user?.user_metadata?.firstName ?? "Account"

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200" style={{ borderTopColor: primary }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="pt-24 pb-20" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 md:px-8">
          <div>
            <div className="text-sm font-medium text-white/60">My account</div>
            <div className="mt-1 text-3xl font-extrabold text-white">{firstName}</div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-extrabold text-white" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
            {firstName[0].toUpperCase()}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-20 md:px-8 -mt-6 space-y-5">

        {/* Profile card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <SectionTitle>Personal details</SectionTitle>
          {profile ? (
            <div className="space-y-3 mt-4">
              {profile.email && <Detail icon={<Mail size={15} className="text-slate-400" />} value={profile.email} />}
              {profile.phone && <Detail icon={<Phone size={15} className="text-slate-400" />} value={profile.phone} />}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
              <AlertCircle size={15} /> Profile details unavailable
            </div>
          )}
        </div>

        {/* Membership card */}
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <button
            className="w-full px-6 py-5 text-left"
            onClick={() => membership && setMembershipExpanded((v) => !v)}
          >
            <div className="flex items-center justify-between">
              <SectionTitle>Membership</SectionTitle>
              {membership && (membershipExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />)}
            </div>
            {membership ? (
              <div className="mt-3 flex items-center gap-2.5">
                <Star size={18} fill={primary} style={{ color: primary }} />
                <span className="font-bold text-slate-900">{membership.planName}</span>
                <span className="ml-auto rounded-full px-3 py-1 text-xs font-bold capitalize" style={{ backgroundColor: primary + "15", color: primary }}>
                  {membership.status}
                </span>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-slate-400">No active membership.</p>
                <Link href={`/${org.slug}/memberships`} className="mt-1 inline-block text-sm font-semibold" style={{ color: primary }}
                  onClick={(e) => e.stopPropagation()}>
                  View membership plans →
                </Link>
              </div>
            )}
          </button>

          {membership && membershipExpanded && (
            <div className="border-t border-slate-100 px-6 py-4 bg-slate-50">
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <Stat label="Plan" value={membership.planName} />
                <Stat label="Status" value={membership.status} />
                <Stat label="Started" value={format(parseISO(membership.startDate), "d MMM yyyy")} />
                {membership.endDate && <Stat label="Expires" value={format(parseISO(membership.endDate), "d MMM yyyy")} />}
                <Stat label="Price" value={`£${parseFloat(membership.price).toFixed(2)}`} />
              </dl>
            </div>
          )}
        </div>

        {/* Upcoming bookings */}
        <div>
          <div className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-slate-400">
            Upcoming bookings ({upcomingBookings.length})
          </div>
          {upcomingBookings.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm border border-slate-100">
              <Calendar size={28} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-400">No upcoming bookings.</p>
              <Link href={`/${org.slug}/book`} className="mt-2 inline-block text-sm font-semibold" style={{ color: primary }}>
                Book a session →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  primary={primary}
                  canCancel
                  cancelling={cancellingId === b.id}
                  confirmingCancel={confirmCancelId === b.id}
                  expanded={expandedBookingId === b.id}
                  cancelError={confirmCancelId === b.id ? cancelError : null}
                  onToggle={() => {
                    setExpandedBookingId((v) => v === b.id ? null : b.id)
                    setConfirmCancelId(null)
                    setCancelError(null)
                  }}
                  onCancelRequest={() => { setConfirmCancelId(b.id); setCancelError(null) }}
                  onCancelConfirm={() => handleCancel(b.id)}
                  onCancelDismiss={() => { setConfirmCancelId(null); setCancelError(null) }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Past bookings */}
        {pastBookings.length > 0 && (
          <div>
            <div className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-slate-400">Past bookings</div>
            <div className="space-y-3">
              {pastBookings.slice(0, 8).map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  primary={primary}
                  canCancel={false}
                  cancelling={false}
                  confirmingCancel={false}
                  expanded={expandedBookingId === b.id}
                  cancelError={null}
                  onToggle={() => setExpandedBookingId((v) => v === b.id ? null : b.id)}
                  onCancelRequest={() => {}}
                  onCancelConfirm={() => {}}
                  onCancelDismiss={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-sm border border-slate-100 text-sm font-semibold text-red-500 transition hover:bg-red-50"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{children}</div>
}

function Detail({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {icon}
      <span className="text-sm text-slate-700">{value}</span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-900">{value}</dd>
    </div>
  )
}

function BookingCard({
  booking, primary, canCancel, cancelling, confirmingCancel, expanded,
  cancelError, onToggle, onCancelRequest, onCancelConfirm, onCancelDismiss,
}: {
  booking: Booking
  primary: string
  canCancel: boolean
  cancelling: boolean
  confirmingCancel: boolean
  expanded: boolean
  cancelError: string | null
  onToggle: () => void
  onCancelRequest: () => void
  onCancelConfirm: () => void
  onCancelDismiss: () => void
}) {
  const start = parseISO(booking.startsAt)
  const end = parseISO(booking.endsAt)
  const upcoming = isAfter(start, new Date())

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden" style={{ opacity: upcoming ? 1 : 0.65 }}>
      {/* Summary row — always visible, clickable */}
      <button className="w-full px-5 py-4 text-left" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900">{booking.resourceName ?? "Booking"}</div>
            {booking.unitName && <div className="mt-0.5 text-xs text-slate-400">{booking.unitName}</div>}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-slate-500">
              <div className="font-medium">{format(start, "EEE d MMM")}</div>
              <div>{format(start, "HH:mm")} – {format(end, "HH:mm")}</div>
            </div>
            {expanded ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {booking.venueName && <Stat label="Venue" value={booking.venueName} />}
            {booking.resourceName && <Stat label="Facility" value={booking.resourceName} />}
            {booking.unitName && <Stat label="Court / Unit" value={booking.unitName} />}
            <Stat label="Date" value={format(start, "EEEE d MMMM yyyy")} />
            <Stat label="Time" value={`${format(start, "HH:mm")} – ${format(end, "HH:mm")}`} />
            <Stat label="Status" value={booking.status} />
          </dl>

          {canCancel && !confirmingCancel && (
            <button
              onClick={onCancelRequest}
              className="flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-700 transition"
            >
              <X size={14} /> Cancel this booking
            </button>
          )}

          {canCancel && confirmingCancel && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">Are you sure you want to cancel?</p>
              <p className="mt-0.5 text-xs text-red-500">This action cannot be undone.</p>
              {cancelError && <p className="mt-2 text-xs text-red-600">{cancelError}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onCancelConfirm}
                  disabled={cancelling}
                  className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-600 disabled:opacity-50"
                >
                  {cancelling ? "Cancelling…" : "Yes, cancel"}
                </button>
                <button
                  onClick={onCancelDismiss}
                  disabled={cancelling}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Keep it
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
