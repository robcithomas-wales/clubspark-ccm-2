"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2 } from "lucide-react"

type HomePageContent = {
  heroImageUrl: string
  heroGradient: boolean
  headline: string
  subheadline: string
  bannerEnabled: boolean
  bannerText: string
  introHeading: string
  introText: string
  gallery: string[]
  seoTitle: string
  seoDescription: string
}

const EMPTY: HomePageContent = {
  heroImageUrl: "",
  heroGradient: true,
  headline: "",
  subheadline: "",
  bannerEnabled: false,
  bannerText: "",
  introHeading: "",
  introText: "",
  gallery: [],
  seoTitle: "",
  seoDescription: "",
}

function normalise(data: any): HomePageContent {
  return {
    ...EMPTY,
    ...data,
    heroImageUrl:  data?.heroImageUrl  ?? "",
    headline:      data?.headline      ?? "",
    subheadline:   data?.subheadline   ?? "",
    bannerText:    data?.bannerText    ?? "",
    introHeading:  data?.introHeading  ?? "",
    introText:     data?.introText     ?? "",
    seoTitle:      data?.seoTitle      ?? "",
    seoDescription: data?.seoDescription ?? "",
    gallery:       Array.isArray(data?.gallery) ? data.gallery : [],
    heroGradient:  data?.heroGradient  ?? true,
    bannerEnabled: data?.bannerEnabled ?? false,
  }
}

export function HomePageEditor({ initial }: { initial: any }) {
  const [form, setForm] = useState<HomePageContent>(normalise(initial))
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const router = useRouter()

  function set<K extends keyof HomePageContent>(field: K, value: HomePageContent[K]) {
    setForm((f) => ({ ...f, [field]: value }))
    setStatus("idle")
  }

  function setGallery(index: number, value: string) {
    const next = [...form.gallery]
    next[index] = value
    set("gallery", next)
  }

  function addGallerySlot() {
    if (form.gallery.length < 5) set("gallery", [...form.gallery, ""])
  }

  function removeGallerySlot(index: number) {
    set("gallery", form.gallery.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setStatus("saving")
    setErrorMsg("")
    try {
      const payload = {
        ...form,
        heroImageUrl:   form.heroImageUrl   || null,
        headline:       form.headline       || null,
        subheadline:    form.subheadline    || null,
        bannerText:     form.bannerText     || null,
        introHeading:   form.introHeading   || null,
        introText:      form.introText      || null,
        seoTitle:       form.seoTitle       || null,
        seoDescription: form.seoDescription || null,
        gallery: form.gallery.filter(Boolean),
      }
      const res = await fetch("/api/website/home", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        const msg = json?.message ?? json?.error ?? "Save failed"
        throw new Error(Array.isArray(msg) ? msg.join(", ") : msg)
      }
      setStatus("saved")
      router.refresh()
      setTimeout(() => setStatus("idle"), 3000)
    } catch (e: any) {
      setErrorMsg(e.message ?? "An error occurred")
      setStatus("error")
    }
  }

  return (
    <div className="space-y-6">

      {/* Hero */}
      <Section title="Hero">
        <Field label="Hero image URL" hint="Full-width background image for the top of the home page.">
          <input
            className={input}
            value={form.heroImageUrl}
            onChange={(e) => set("heroImageUrl", e.target.value)}
            placeholder="https://..."
          />
          {form.heroImageUrl && (
            <img
              src={form.heroImageUrl}
              alt="Hero preview"
              className="mt-2 h-32 w-full rounded-xl border border-slate-200 object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          )}
        </Field>
        <Toggle
          label="Dark gradient overlay"
          description="Adds a dark gradient over the hero image to keep text readable."
          checked={form.heroGradient}
          onChange={(v) => set("heroGradient", v)}
        />
        <Field label="Headline">
          <input
            className={input}
            value={form.headline}
            onChange={(e) => set("headline", e.target.value)}
            placeholder="Play. Book. Compete."
          />
        </Field>
        <Field label="Sub-headline">
          <input
            className={input}
            value={form.subheadline}
            onChange={(e) => set("subheadline", e.target.value)}
            placeholder="Book courts, join classes and manage your membership."
          />
        </Field>
      </Section>

      {/* Announcement banner */}
      <Section title="Announcement banner">
        <Toggle
          label="Show banner"
          description="Displays a prominent announcement strip below the hero."
          checked={form.bannerEnabled}
          onChange={(v) => set("bannerEnabled", v)}
        />
        {form.bannerEnabled && (
          <Field label="Banner text">
            <input
              className={input}
              value={form.bannerText}
              onChange={(e) => set("bannerText", e.target.value)}
              placeholder="Summer season bookings now open!"
            />
          </Field>
        )}
      </Section>

      {/* Introduction */}
      <Section title="Introduction">
        <Field label="Heading">
          <input
            className={input}
            value={form.introHeading}
            onChange={(e) => set("introHeading", e.target.value)}
            placeholder="Welcome to our club"
          />
        </Field>
        <Field label="Body text">
          <textarea
            className={`${input} min-h-[120px] resize-y`}
            value={form.introText}
            onChange={(e) => set("introText", e.target.value)}
            placeholder="Tell visitors a bit more about your club, facilities and what makes you unique..."
          />
        </Field>
      </Section>

      {/* Gallery */}
      <Section title="Gallery">
        <p className="text-xs text-slate-400">Up to 5 images shown as a photo strip on the home page.</p>
        <div className="space-y-2">
          {form.gallery.map((url, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className={`${input} flex-1`}
                value={url}
                onChange={(e) => setGallery(i, e.target.value)}
                placeholder={`Image ${i + 1} URL`}
              />
              {url && (
                <img
                  src={url}
                  alt=""
                  className="h-10 w-16 rounded-lg border border-slate-200 object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              )}
              <button
                onClick={() => removeGallerySlot(i)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:text-red-500"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {form.gallery.length < 5 && (
            <button
              onClick={addGallerySlot}
              className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
            >
              <Plus size={15} />
              Add image
            </button>
          )}
        </div>
      </Section>

      {/* SEO */}
      <Section title="SEO">
        <Field label="Page title" hint="Shown in browser tab and search results. Defaults to your organisation name.">
          <input
            className={input}
            value={form.seoTitle}
            onChange={(e) => set("seoTitle", e.target.value)}
            placeholder="Dom's Sports Club — Book courts online"
          />
        </Field>
        <Field label="Meta description" hint="Short description shown in search results (max ~160 characters).">
          <textarea
            className={`${input} min-h-[72px] resize-none`}
            value={form.seoDescription}
            onChange={(e) => set("seoDescription", e.target.value)}
            maxLength={160}
            placeholder="Book courts, join classes and manage your membership at Dom's Sports Club."
          />
          <p className="mt-1 text-right text-xs text-slate-400">{form.seoDescription.length}/160</p>
        </Field>
      </Section>

      {/* Save bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm">
          {status === "saved" && <span className="font-medium text-emerald-600">Saved successfully</span>}
          {status === "error" && <span className="text-red-600">{errorMsg}</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          className="inline-flex h-10 items-center rounded-xl bg-[#1857E0] px-6 text-sm font-semibold text-white transition hover:bg-[#1245b8] disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4">
      <div className="mt-0.5 shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1857E0] focus:ring-offset-2 ${
            checked ? "bg-[#1857E0]" : "bg-slate-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      <div>
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="mt-0.5 text-xs text-slate-500">{description}</div>
      </div>
    </label>
  )
}

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1857E0] focus:bg-white focus:ring-2 focus:ring-[#1857E0]/20"
