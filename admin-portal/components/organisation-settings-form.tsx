"use client"

import { useState, useEffect } from "react"

type OrgData = {
  id?: string
  name: string
  slug: string
  customDomain: string
  about: string
  address: string
  phone: string
  email: string
  mapsEmbedUrl: string
  isPublished: boolean
  appName: string
  clubCode: string
}

// Design fields we don't edit here but must preserve on save
type DesignPassthrough = {
  primaryColour?: string
  secondaryColour?: string | null
  logoUrl?: string | null
  faviconUrl?: string | null
  headingFont?: string | null
  bodyFont?: string | null
  navLayout?: string
  homePageContent?: any
}

const EMPTY: OrgData = {
  name: "",
  slug: "",
  customDomain: "",
  about: "",
  address: "",
  phone: "",
  email: "",
  mapsEmbedUrl: "",
  isPublished: false,
  appName: "",
  clubCode: "",
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function normalise(data: any): OrgData {
  return {
    ...EMPTY,
    ...data,
    customDomain: data?.customDomain ?? "",
    about:        data?.about        ?? "",
    address:      data?.address      ?? "",
    phone:        data?.phone        ?? "",
    email:        data?.email        ?? "",
    mapsEmbedUrl: data?.mapsEmbedUrl ?? "",
    appName:      data?.appName      ?? "",
    clubCode:     data?.clubCode     ?? "",
  }
}

function extractDesign(data: any): DesignPassthrough {
  return {
    primaryColour:   data?.primaryColour,
    secondaryColour: data?.secondaryColour,
    logoUrl:         data?.logoUrl,
    faviconUrl:      data?.faviconUrl,
    headingFont:     data?.headingFont,
    bodyFont:        data?.bodyFont,
    navLayout:       data?.navLayout,
    homePageContent: data?.homePageContent,
  }
}

export function OrganisationSettingsForm({ initial }: { initial: any | null }) {
  const [form, setForm] = useState<OrgData>(normalise(initial))
  const [design] = useState<DesignPassthrough>(extractDesign(initial))
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initial?.slug)
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!slugManuallyEdited) {
      setForm((f) => ({ ...f, slug: slugify(f.name) }))
    }
  }, [form.name, slugManuallyEdited])

  function set(field: keyof OrgData, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    setStatus("saving")
    setErrorMsg("")
    try {
      const res = await fetch("/api/organisations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...design, // preserve design fields unchanged
          customDomain: form.customDomain || null,
          about:        form.about        || null,
          address:      form.address      || null,
          phone:        form.phone        || null,
          email:        form.email        || null,
          mapsEmbedUrl: form.mapsEmbedUrl || null,
          appName:      form.appName      || null,
          clubCode:     form.clubCode     || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        const msg = json?.message ?? json?.error ?? "Save failed"
        throw new Error(Array.isArray(msg) ? msg.join(", ") : msg)
      }
      setStatus("saved")
      setTimeout(() => setStatus("idle"), 3000)
    } catch (e: any) {
      setErrorMsg(e.message ?? "An error occurred")
      setStatus("error")
    }
  }

  return (
    <div className="space-y-6">

      {/* Identity */}
      <Section title="Identity">
        <Field label="Organisation name" required>
          <input
            className={input}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Dom's Sports Club"
          />
        </Field>
        <Field
          label="URL slug"
          hint="Used as your subdomain, e.g. doms-sports-club.yourplatform.com — lowercase letters, numbers and hyphens only."
          required
        >
          <input
            className={input}
            value={form.slug}
            onChange={(e) => {
              setSlugManuallyEdited(true)
              set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }}
            placeholder="doms-sports-club"
          />
        </Field>
        <Field label="Custom domain" hint="Optional. Point your domain's CNAME here once you're ready to go live.">
          <input
            className={input}
            value={form.customDomain}
            onChange={(e) => set("customDomain", e.target.value)}
            placeholder="www.domssportsclub.com"
          />
        </Field>
      </Section>

      {/* About */}
      <Section title="About">
        <Field label="About text" hint="Shown in the footer of your customer portal and mobile app.">
          <textarea
            className={`${input} min-h-[100px] resize-y`}
            value={form.about}
            onChange={(e) => set("about", e.target.value)}
            placeholder="Tell customers about your club..."
          />
        </Field>
      </Section>

      {/* Contact */}
      <Section title="Contact details">
        <Field label="Address">
          <textarea
            className={`${input} min-h-[72px] resize-none`}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="123 Court Lane, London, SW1A 1AA"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <input
              className={input}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+44 20 1234 5678"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={input}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="hello@domssportsclub.com"
            />
          </Field>
        </div>
        <Field label="Google Maps embed URL" hint="Paste the src URL from a Google Maps embed iframe.">
          <input
            className={input}
            value={form.mapsEmbedUrl}
            onChange={(e) => set("mapsEmbedUrl", e.target.value)}
            placeholder="https://www.google.com/maps/embed?pb=..."
          />
        </Field>
      </Section>

      {/* Mobile app */}
      <Section title="Mobile app">
        <Field label="Club code" hint="Short unique code customers type to find your club in the mobile app (e.g. caerphilly). Lowercase letters, numbers and hyphens only.">
          <input
            className={`${input} font-mono`}
            value={form.clubCode}
            onChange={(e) => set("clubCode", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="e.g. caerphilly"
          />
        </Field>
        <Field label="App display name" hint="Name shown in the mobile app header. Defaults to the organisation name if left blank.">
          <input
            className={input}
            value={form.appName}
            onChange={(e) => set("appName", e.target.value)}
            placeholder={form.name || "e.g. Caerphilly Leisure"}
          />
        </Field>
      </Section>

      {/* Website status */}
      <Section title="Website">
        <label className="flex cursor-pointer items-center gap-3">
          <div
            onClick={() => set("isPublished", !form.isPublished)}
            className={[
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              form.isPublished ? "bg-emerald-500" : "bg-slate-300",
            ].join(" ")}
          >
            <span
              className={[
                "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                form.isPublished ? "translate-x-6" : "translate-x-1",
              ].join(" ")}
            />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900">
              {form.isPublished ? "Site is published" : "Site is unpublished"}
            </div>
            <div className="text-xs text-slate-500">
              {form.isPublished
                ? "Your customer-facing website is live."
                : "Your website is hidden from the public."}
            </div>
          </div>
        </label>
      </Section>

      {/* Save bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm">
          {status === "saved" && <span className="font-medium text-emerald-600">Saved successfully</span>}
          {status === "error" && <span className="text-red-600">{errorMsg}</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={status === "saving" || !form.name || !form.slug}
          className="inline-flex h-10 items-center rounded-xl bg-[#1857E0] px-6 text-sm font-semibold text-white transition hover:bg-[#1245b8] disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1857E0] focus:bg-white focus:ring-2 focus:ring-[#1857E0]/20"
