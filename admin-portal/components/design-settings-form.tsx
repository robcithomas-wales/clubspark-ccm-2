"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Info } from "lucide-react"

type DesignData = {
  primaryColour: string
  secondaryColour: string
  logoUrl: string
  faviconUrl: string
  headingFont: string
  bodyFont: string
  navLayout: string
  portalTemplate: string
  name: string
}

// ─── WCAG helpers ─────────────────────────────────────────────────────────────

function hexToLinear(c: number) {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}
function luminance(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16)
  return 0.2126 * hexToLinear((n >> 16) & 0xff)
       + 0.7152 * hexToLinear((n >> 8)  & 0xff)
       + 0.0722 * hexToLinear( n        & 0xff)
}
function contrastRatio(a: string, b: string) {
  const l1 = luminance(a), l2 = luminance(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

// ─── Options ──────────────────────────────────────────────────────────────────

const HEADING_FONTS = ["Inter", "Playfair Display", "Montserrat", "Roboto Slab", "Oswald"]
const BODY_FONTS    = ["Inter", "Open Sans", "Lato", "Georgia", "Merriweather"]

const NAV_LAYOUTS: Array<{ value: string; label: string; desc: string }> = [
  { value: "dark-inline",  label: "Dark inline",   desc: "Primary colour, logo left, links right" },
  { value: "light-inline", label: "Light inline",  desc: "White background, logo left, links right" },
  { value: "dark-below",   label: "Dark stacked",  desc: "Primary colour, logo centred, links below" },
  { value: "light-below",  label: "Light stacked", desc: "White background, logo centred, links below" },
  { value: "dark-hidden",  label: "Dark logo-only", desc: "Primary colour, logo only — no nav links" },
  { value: "light-hidden", label: "Light logo-only", desc: "White background, logo only — no nav links" },
]

function normalise(data: any): DesignData {
  return {
    primaryColour:   data?.primaryColour   ?? "#1857E0",
    secondaryColour: data?.secondaryColour ?? "#E05518",
    logoUrl:         data?.logoUrl         ?? "",
    faviconUrl:      data?.faviconUrl      ?? "",
    headingFont:     data?.headingFont     ?? "Inter",
    bodyFont:        data?.bodyFont        ?? "Inter",
    navLayout:       data?.navLayout       ?? "dark-inline",
    portalTemplate:  data?.portalTemplate  ?? "bold",
    name:            data?.name            ?? "",
  }
}

export function DesignSettingsForm({ initial }: { initial: any }) {
  const [form, setForm] = useState<DesignData>(normalise(initial))
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const router = useRouter()

  function set(field: keyof DesignData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setStatus("idle")
  }

  async function handleSave() {
    setStatus("saving")
    setErrorMsg("")
    try {
      const res = await fetch("/api/website/design", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryColour:   form.primaryColour   || null,
          secondaryColour: form.secondaryColour || null,
          logoUrl:         form.logoUrl         || null,
          faviconUrl:      form.faviconUrl      || null,
          headingFont:     form.headingFont     || null,
          bodyFont:        form.bodyFont        || null,
          navLayout:       form.navLayout       || "dark-inline",
          portalTemplate:  form.portalTemplate  || "bold",
        }),
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

  const validHex = (h: string) => /^#[0-9a-fA-F]{6}$/.test(h)

  return (
    <div className="space-y-6">

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
        <p>Colours and logo apply to both the <strong>customer portal</strong> and <strong>mobile app</strong>. Fonts and nav layout are portal-only.</p>
      </div>

      {/* Logo & Favicon */}
      <Section title="Logo & Favicon">
        <Field label="Logo URL" hint="Used in the customer portal navigation and mobile app header.">
          <input
            className={input}
            value={form.logoUrl}
            onChange={(e) => set("logoUrl", e.target.value)}
            placeholder="https://..."
          />
          {form.logoUrl && (
            <img
              src={form.logoUrl}
              alt="Logo preview"
              className="mt-2 h-12 rounded border border-slate-200 object-contain"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          )}
        </Field>
        <Field label="Favicon URL" hint="Small icon shown in browser tabs (portal only). Use a square image, ideally 32×32px.">
          <input
            className={input}
            value={form.faviconUrl}
            onChange={(e) => set("faviconUrl", e.target.value)}
            placeholder="https://..."
          />
        </Field>
      </Section>

      {/* Colours */}
      <Section title="Colours">
        <Field label="Primary colour" hint="Main brand colour — used throughout the portal and mobile app.">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primaryColour}
              onChange={(e) => set("primaryColour", e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 p-1"
            />
            <input
              className={`${input} w-32 font-mono uppercase`}
              value={form.primaryColour}
              onChange={(e) => set("primaryColour", e.target.value)}
              placeholder="#1857E0"
              maxLength={7}
            />
            <span className="h-10 w-10 rounded-lg border border-slate-200 shadow-sm" style={{ backgroundColor: form.primaryColour }} />
          </div>
          {validHex(form.primaryColour) && (() => {
            const ratio = contrastRatio(form.primaryColour, "#ffffff")
            const passNormal = ratio >= 4.5
            const passLarge  = ratio >= 3.0
            return (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                <span className="text-slate-400">vs white text —</span>
                <span className="font-mono font-semibold text-slate-700">{ratio.toFixed(2)}:1</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${passNormal ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  AA normal {passNormal ? "✓" : "✗"}
                </span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${passLarge ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  AA large {passLarge ? "✓" : "✗"}
                </span>
              </div>
            )
          })()}
        </Field>

        <Field label="Secondary colour" hint="Used for accents and highlights. Also available in the mobile app.">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.secondaryColour}
              onChange={(e) => set("secondaryColour", e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 p-1"
            />
            <input
              className={`${input} w-32 font-mono uppercase`}
              value={form.secondaryColour}
              onChange={(e) => set("secondaryColour", e.target.value)}
              placeholder="#E05518"
              maxLength={7}
            />
            <span className="h-10 w-10 rounded-lg border border-slate-200 shadow-sm" style={{ backgroundColor: form.secondaryColour }} />
          </div>
        </Field>
      </Section>

      {/* Typography — portal only */}
      <Section title="Typography (portal only)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Heading font">
            <select className={input} value={form.headingFont} onChange={(e) => set("headingFont", e.target.value)}>
              {HEADING_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Body font">
            <select className={input} value={form.bodyFont} onChange={(e) => set("bodyFont", e.target.value)}>
              {BODY_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">Preview</p>
          <p style={{ fontFamily: `'${form.headingFont}', system-ui, sans-serif`, fontSize: "1.25rem", fontWeight: 700, color: form.primaryColour }}>
            Welcome to {form.name || "Your Club"}
          </p>
          <p style={{ fontFamily: `'${form.bodyFont}', system-ui, sans-serif`, fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>
            Book courts, join classes and manage your membership.
          </p>
        </div>
      </Section>

      {/* Portal template */}
      <Section title="Portal template">
        <p className="text-xs text-slate-500 -mt-2 mb-2">Choose the overall layout of your customer-facing website.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Bold template */}
          <label className={[
            "cursor-pointer rounded-2xl border-2 overflow-hidden transition",
            form.portalTemplate === "bold"
              ? "border-[#1857E0] shadow-md"
              : "border-slate-200 hover:border-slate-300",
          ].join(" ")}>
            <input
              type="radio"
              name="portalTemplate"
              value="bold"
              checked={form.portalTemplate === "bold"}
              onChange={() => set("portalTemplate", "bold")}
              className="sr-only"
            />
            {/* Thumbnail */}
            <div className="h-36 bg-slate-800 relative overflow-hidden">
              {/* Top nav bar */}
              <div className="absolute inset-x-0 top-0 h-6 bg-slate-700 flex items-center px-3 gap-2">
                <div className="w-8 h-2 rounded bg-white/40" />
                <div className="flex-1" />
                <div className="w-4 h-1.5 rounded bg-white/20" />
                <div className="w-4 h-1.5 rounded bg-white/20" />
                <div className="w-4 h-1.5 rounded bg-white/20" />
              </div>
              {/* Hero area */}
              <div className="absolute inset-x-0 top-6 bottom-0 flex flex-col items-start justify-center px-4"
                style={{ backgroundColor: form.primaryColour + "cc" }}>
                <div className="w-24 h-3 rounded bg-white/80 mb-1.5" />
                <div className="w-16 h-2 rounded bg-white/40" />
                <div className="mt-3 flex gap-1.5">
                  <div className="w-10 h-3.5 rounded bg-white" />
                  <div className="w-10 h-3.5 rounded bg-white/30" />
                </div>
              </div>
            </div>
            <div className="p-3 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Bold</div>
                  <div className="text-xs text-slate-500">Full-screen hero, top navigation</div>
                </div>
                {form.portalTemplate === "bold" && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1857E0]">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </div>
            </div>
          </label>

          {/* Club template */}
          <label className={[
            "cursor-pointer rounded-2xl border-2 overflow-hidden transition",
            form.portalTemplate === "club"
              ? "border-[#1857E0] shadow-md"
              : "border-slate-200 hover:border-slate-300",
          ].join(" ")}>
            <input
              type="radio"
              name="portalTemplate"
              value="club"
              checked={form.portalTemplate === "club"}
              onChange={() => set("portalTemplate", "club")}
              className="sr-only"
            />
            {/* Thumbnail */}
            <div className="h-36 bg-white relative overflow-hidden flex">
              {/* Sidebar */}
              <div className="w-14 h-full flex flex-col pt-3 px-2 gap-1.5"
                style={{ backgroundColor: form.primaryColour }}>
                <div className="w-8 h-2 rounded bg-white/60 mb-1" />
                <div className="w-full h-1.5 rounded bg-white/40" />
                <div className="w-full h-1.5 rounded bg-white/40" />
                <div className="w-full h-1.5 rounded bg-white/40" />
                <div className="w-full h-1.5 rounded bg-white/40" />
                <div className="w-full h-1.5 rounded bg-white/20" />
              </div>
              {/* Content area */}
              <div className="flex-1 p-3">
                {/* Welcome strip */}
                <div className="rounded-lg h-10 mb-2 flex items-center px-2"
                  style={{ backgroundColor: form.primaryColour + "20" }}>
                  <div className="w-16 h-2 rounded" style={{ backgroundColor: form.primaryColour + "80" }} />
                </div>
                {/* Cards */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="rounded bg-slate-100 h-7" />
                  ))}
                </div>
              </div>
            </div>
            <div className="p-3 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Club</div>
                  <div className="text-xs text-slate-500">Sidebar navigation, dashboard layout</div>
                </div>
                {form.portalTemplate === "club" && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1857E0]">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </div>
            </div>
          </label>
        </div>
      </Section>

      {/* Navigation layout — portal only */}
      <Section title="Navigation layout (portal only)">
        <div className="grid gap-2 sm:grid-cols-2">
          {NAV_LAYOUTS.map((opt) => (
            <label
              key={opt.value}
              className={[
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                form.navLayout === opt.value
                  ? "border-[#1857E0] bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300",
              ].join(" ")}
            >
              <input
                type="radio"
                name="navLayout"
                value={opt.value}
                checked={form.navLayout === opt.value}
                onChange={() => set("navLayout", opt.value)}
                className="mt-0.5 accent-[#1857E0]"
              />
              <div>
                <div className="text-sm font-medium text-slate-900">{opt.label}</div>
                <div className="text-xs text-slate-500">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
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

const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1857E0] focus:bg-white focus:ring-2 focus:ring-[#1857E0]/20"
