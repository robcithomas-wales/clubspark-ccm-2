"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { Trash2, Plus } from "lucide-react"

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  booking_slot: "Booking slot",
  programme_enrolment: "Programme enrolment",
  membership: "Membership",
  add_on: "Add-on",
  competition_entry: "Competition entry",
  match_fee: "Match fee",
  coach_session: "Coach session",
}

type Price = {
  id: string
  amount: string
  currency: string
  memberAmount?: string | null
  priceType: string
  isActive: boolean
}

type Product = {
  id: string
  name: string
  description?: string | null
  productType: string
  isActive: boolean
  prices: Price[]
  createdAt: string
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [product, setProduct] = React.useState<Product | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [addingPrice, setAddingPrice] = React.useState(false)
  const [priceAmount, setPriceAmount] = React.useState("")
  const [priceMemberAmount, setPriceMemberAmount] = React.useState("")
  const [priceType, setPriceType] = React.useState("standard")

  React.useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(r => r.json())
      .then(j => { setProduct(j.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  async function handleToggleActive() {
    if (!product) return
    setSaving(true)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      })
      const j = await res.json()
      if (res.ok) setProduct(j.data)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddPrice(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        amount: Number(priceAmount),
        priceType,
      }
      if (priceMemberAmount) body.memberAmount = Number(priceMemberAmount)

      const res = await fetch(`/api/products/${id}/prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const j = await res.json()
      if (!res.ok) { setError(j?.message ?? "Failed to add price."); return }

      // Refresh product
      const productRes = await fetch(`/api/products/${id}`)
      const pj = await productRes.json()
      setProduct(pj.data)
      setPriceAmount("")
      setPriceMemberAmount("")
      setPriceType("standard")
      setAddingPrice(false)
    } catch {
      setError("Something went wrong.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePrice(priceId: string) {
    if (!confirm("Remove this price?")) return
    await fetch(`/api/products/${id}/prices/${priceId}`, { method: "DELETE" })
    const res = await fetch(`/api/products/${id}`)
    const j = await res.json()
    setProduct(j.data)
  }

  async function handleDelete() {
    if (!confirm("Delete this product? This cannot be undone.")) return
    await fetch(`/api/products/${id}`, { method: "DELETE" })
    router.push("/products")
    router.refresh()
  }

  if (loading) return <PortalLayout title="Product"><div className="py-16 text-center text-sm text-slate-400">Loading…</div></PortalLayout>
  if (!product) return <PortalLayout title="Product"><div className="py-16 text-center text-sm text-slate-500">Product not found.</div></PortalLayout>

  return (
    <PortalLayout title={product.name} description={`${PRODUCT_TYPE_LABELS[product.productType] ?? product.productType} · ${product.isActive ? "Active" : "Inactive"}`}>
      <div className="max-w-2xl space-y-6">
        {/* Details card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Details</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleActive}
                disabled={saving}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${product.isActive ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
              >
                {product.isActive ? "Deactivate" : "Activate"}
              </button>
              <button onClick={handleDelete} className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">Delete</button>
            </div>
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            <Row label="Name" value={product.name} />
            <Row label="Type" value={PRODUCT_TYPE_LABELS[product.productType] ?? product.productType} />
            <Row label="Status" value={product.isActive ? "Active" : "Inactive"} />
            {product.description && <Row label="Description" value={product.description} />}
          </div>
        </section>

        {/* Prices card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Prices</h2>
            <button
              onClick={() => setAddingPrice(v => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1832A8] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#142a8c]"
            >
              <Plus className="h-3.5 w-3.5" /> Add price
            </button>
          </div>

          {addingPrice && (
            <form onSubmit={handleAddPrice} className="border-b border-slate-100 bg-slate-50 px-6 py-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Amount (£) *</label>
                  <input
                    type="number" min={0} step={0.01} required
                    value={priceAmount} onChange={e => setPriceAmount(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Member price (£)</label>
                  <input
                    type="number" min={0} step={0.01}
                    value={priceMemberAmount} onChange={e => setPriceMemberAmount(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
                  <select value={priceType} onChange={e => setPriceType(e.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none">
                    <option value="standard">Standard</option>
                    <option value="member">Member</option>
                    <option value="tiered">Tiered</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="h-8 rounded-lg bg-[#1832A8] px-4 text-xs font-semibold text-white hover:bg-[#142a8c] disabled:opacity-60">Save price</button>
                <button type="button" onClick={() => setAddingPrice(false)} className="h-8 rounded-lg border border-slate-200 bg-white px-4 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              </div>
            </form>
          )}

          {product.prices.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-400">No prices yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {product.prices.map(p => (
                <div key={p.id} className="flex items-center justify-between px-6 py-3 text-sm">
                  <div>
                    <span className="font-semibold text-slate-900">£{Number(p.amount).toFixed(2)}</span>
                    {p.memberAmount && <span className="ml-2 text-xs text-slate-500">· member £{Number(p.memberAmount).toFixed(2)}</span>}
                    <span className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${p.isActive ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-slate-100 text-slate-500 ring-slate-400/20"}`}>
                      {p.priceType}
                    </span>
                  </div>
                  <button onClick={() => handleDeletePrice(p.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PortalLayout>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 px-6 py-3">
      <span className="w-32 shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  )
}
