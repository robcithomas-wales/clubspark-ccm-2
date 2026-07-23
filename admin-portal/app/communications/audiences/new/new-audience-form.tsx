"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AudienceRuleBuilder, type AudienceRulesJson } from "@/components/audience-rule-builder"

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"

export function NewAudienceForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [rulesJson, setRulesJson] = useState<AudienceRulesJson>({ logic: "and", rules: [] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!name.trim()) { setError("Name is required"); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/comms/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, rulesJson }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.message ?? "Failed to save")
      }
      router.push("/communications/audiences")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          Audience name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Active members under 18"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          Description <span className="font-normal normal-case text-slate-400">(optional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of who this targets"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
          Audience rules
        </label>
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          <AudienceRuleBuilder value={rulesJson} onChange={setRulesJson} />
        </div>
        <p className="text-xs text-slate-400 mt-1.5">
          Rules are applied when the campaign is sent. An empty rule set targets all members.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving || !name.trim()}
          className="rounded-xl bg-[#1857E0] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save audience"}
        </button>
        <a
          href="/communications/audiences"
          className="text-sm text-slate-500 hover:text-slate-700 transition"
        >
          Cancel
        </a>
      </div>
    </div>
  )
}
