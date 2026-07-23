"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Check, X, Mail, MessageSquare, ChevronDown, ChevronUp } from "lucide-react"

interface Template {
  id: string
  key: string
  name: string
  channel: string
  isSystem: boolean
  isActive: boolean
  subjectTemplate?: string
  bodyTemplate?: string
  smsTemplate?: string
  customFooter?: string
  replyTo?: string
  variables: string[]
}

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"

function TemplateRow({ template }: { template: Template }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [customFooter, setCustomFooter] = useState(template.customFooter ?? "")
  const [replyTo, setReplyTo] = useState(template.replyTo ?? "")
  const [isActive, setIsActive] = useState(template.isActive)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/comms/templates/${encodeURIComponent(template.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customFooter: customFooter || undefined, replyTo: replyTo || undefined, isActive }),
      })
      if (!res.ok) throw new Error("Failed to save")
      setEditing(false)
      router.refresh()
    } catch {
      setError("Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-4 bg-white">
        <div className="shrink-0 text-slate-400">
          {template.channel === "email" ? (
            <Mail className="h-4 w-4" />
          ) : (
            <MessageSquare className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{template.name}</span>
            <code className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
              {template.key}
            </code>
            {!isActive && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                disabled
              </span>
            )}
          </div>
          {template.variables.length > 0 && (
            <div className="mt-1 flex items-center gap-1 flex-wrap">
              <span className="text-xs text-slate-400">Variables:</span>
              {template.variables.map((v) => (
                <code key={v} className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setEditing(!editing); setExpanded(true) }}
            className="p-1.5 text-slate-400 hover:text-[#1857E0] transition rounded-lg hover:bg-slate-100"
            title="Edit customisations"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-slate-400 hover:text-slate-700 transition rounded-lg hover:bg-slate-100"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded body preview */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-3">
          {template.channel === "email" && template.subjectTemplate && (
            <div>
              <div className="text-xs text-slate-500 mb-1 font-medium">Subject template</div>
              <div className="text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono">
                {template.subjectTemplate}
              </div>
            </div>
          )}
          {template.channel === "email" && template.bodyTemplate && (
            <div>
              <div className="text-xs text-slate-500 mb-1 font-medium">Body template (HTML)</div>
              <pre className="text-xs text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 overflow-x-auto max-h-40 whitespace-pre-wrap">
                {template.bodyTemplate}
              </pre>
            </div>
          )}
          {template.channel === "sms" && template.smsTemplate && (
            <div>
              <div className="text-xs text-slate-500 mb-1 font-medium">SMS template</div>
              <div className="text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 font-mono">
                {template.smsTemplate}
              </div>
            </div>
          )}

          {/* Editing customisations */}
          {editing && (
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Customise
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded"
                  />
                  Template active
                </label>
              </div>

              {template.channel === "email" && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Custom footer (appended to email)</label>
                    <textarea
                      value={customFooter}
                      onChange={(e) => setCustomFooter(e.target.value)}
                      rows={3}
                      placeholder="e.g. Questions? Contact us at support@yourclub.com"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Reply-to address (optional)</label>
                    <input
                      type="email"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      placeholder="e.g. noreply@yourclub.com"
                      className={inputCls}
                    />
                  </div>
                </>
              )}

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex items-center gap-2">
                <button
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => { setEditing(false); setCustomFooter(template.customFooter ?? ""); setReplyTo(template.replyTo ?? "") }}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function TemplatesClient({ templates }: { templates: Template[] }) {
  const emailTemplates = templates.filter((t) => t.channel === "email")
  const smsTemplates = templates.filter((t) => t.channel === "sms")

  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
        No templates found. Templates are seeded on service startup.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {emailTemplates.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Email templates ({emailTemplates.length})
          </h3>
          <div className="space-y-3">
            {emailTemplates.map((t) => (
              <TemplateRow key={t.id} template={t} />
            ))}
          </div>
        </section>
      )}

      {smsTemplates.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            SMS templates ({smsTemplates.length})
          </h3>
          <div className="space-y-3">
            {smsTemplates.map((t) => (
              <TemplateRow key={t.id} template={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
