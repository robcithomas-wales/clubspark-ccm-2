"use client"

import { useState } from "react"

interface Props {
  templateKey: string
  isActive: boolean
  customFooter: string
  replyTo: string
}

export function NotificationSettingsForm({ templateKey, isActive, customFooter, replyTo }: Props) {
  const [active, setActive] = useState(isActive)
  const [footer, setFooter] = useState(customFooter)
  const [reply, setReply] = useState(replyTo)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/comms/templates/${encodeURIComponent(templateKey)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: active, customFooter: footer, replyTo: reply }),
      })
      if (!res.ok) throw new Error("Save failed")
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${active ? "bg-[#1857E0]" : "bg-slate-200"}`}
        >
          <span
            className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : "translate-x-0.5"}`}
          />
        </button>
        <span className="text-sm text-slate-700">
          {active ? "Enabled — this notification will be sent" : "Disabled — this notification will not be sent"}
        </span>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          Custom footer (appended to email body)
        </label>
        <textarea
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          rows={2}
          placeholder="e.g. Questions? Contact us at info@yourclub.com"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          Reply-to address
        </label>
        <input
          type="email"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="e.g. membership@yourclub.com"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Saved</span>}
      </div>
    </div>
  )
}
