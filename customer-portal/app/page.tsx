import { redirect } from "next/navigation"

/**
 * Root page — fetches the first published organisation and redirects to its
 * slug. Useful in local development where there is only one org.
 */
export default async function RootPage() {
  try {
    const venueUrl = process.env.NEXT_PUBLIC_VENUE_SERVICE_URL ?? "http://127.0.0.1:4003"
    const res = await fetch(`${venueUrl}/organisations/public/first`, { cache: "no-store" })
    if (res.ok) {
      const json = await res.json()
      const slug = json?.data?.slug
      if (slug) redirect(`/${slug}`)
    }
  } catch {
    // fall through to the prompt below
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Customer Portal</h1>
        <p className="mt-3 text-sm text-slate-500">
          Navigate to your club's portal at:
        </p>
        <code className="mt-3 block rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
          localhost:3001/<span className="font-bold">your-slug</span>
        </code>
        <p className="mt-3 text-xs text-slate-400">
          Find your slug in Admin Portal → Settings → Organisation.
        </p>
      </div>
    </div>
  )
}
