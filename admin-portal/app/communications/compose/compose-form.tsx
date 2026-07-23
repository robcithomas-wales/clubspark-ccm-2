"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Users, AlertCircle, Loader2 } from "lucide-react"
import { RichTextEditor } from "@/components/rich-text-editor"

type Channel = "email" | "sms"
type AudienceType = "all_active_members" | "manual" | "segment" | "dynamic"

interface Segment { id: string; name: string; type: string; memberCount: number }

interface RecipientPreview {
  total: number
  excluded: number
  eligible: number
}

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0]"

export function ComposeForm({ initialDraftId }: { initialDraftId?: string }) {
  const router = useRouter()

  const [channel, setChannel] = useState<Channel>("email")
  const [audienceType, setAudienceType] = useState<AudienceType>("all_active_members")
  const [manualEmails, setManualEmails] = useState("")
  const [segments, setSegments] = useState<Segment[]>([])
  const [segmentId, setSegmentId] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [replyTo, setReplyTo] = useState("")
  const [scheduledAt, setScheduledAt] = useState("")
  const [draftId, setDraftId] = useState(initialDraftId ?? "")
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Recipient preview
  const [preview, setPreview] = useState<RecipientPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (audienceType === "segment" && segments.length === 0) {
      fetch("/api/segments")
        .then((r) => r.json())
        .then((json) => {
          const list: Segment[] = json.data ?? []
          setSegments(list)
          if (list.length > 0 && !segmentId) setSegmentId(list[0].id)
        })
        .catch(() => {})
    }
  }, [audienceType]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset preview when audience changes
  useEffect(() => {
    setPreview(null)
  }, [audienceType, segmentId, manualEmails])

  async function fetchRecipientPreview() {
    setPreviewLoading(true)
    setPreview(null)
    try {
      const params = new URLSearchParams({ audienceType })
      if (audienceType === "segment" && segmentId) params.set("segmentId", segmentId)
      if (audienceType === "manual") {
        const emails = manualEmails
          .split(/[\n,]+/)
          .map((e) => e.trim())
          .filter(Boolean)
        params.set("manualCount", String(emails.length))
      }
      const res = await fetch(`/api/comms/recipient-preview?${params}`)
      if (res.ok) {
        const json = await res.json()
        setPreview(json.data)
      }
    } catch {
      // preview is best-effort
    } finally {
      setPreviewLoading(false)
    }
  }

  function buildPayload(status: "draft" | "scheduled" | "sent") {
    const recipients =
      audienceType === "manual"
        ? manualEmails
            .split(/[\n,]+/)
            .map((e) => e.trim())
            .filter(Boolean)
            .map((email) => ({ email }))
        : undefined

    return {
      name: subject || `Campaign ${new Date().toISOString()}`,
      channel,
      audienceType,
      subject: channel === "email" ? subject : undefined,
      body,
      replyTo: replyTo || undefined,
      recipients,
      segmentId: audienceType === "segment" ? segmentId : undefined,
      scheduledAt: scheduledAt || undefined,
      status,
    }
  }

  async function saveDraft() {
    if (!body.trim() && !subject.trim()) return
    setSaving(true)
    setError(null)
    try {
      const method = draftId ? "PATCH" : "POST"
      const url = draftId
        ? `/api/comms/campaigns/${draftId}`
        : "/api/comms/campaigns"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload("draft")),
      })
      if (!res.ok) throw new Error("Failed to save draft")
      const json = await res.json()
      const id = json.data?.id ?? json.id
      if (id) setDraftId(id)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save draft")
    } finally {
      setSaving(false)
    }
  }

  async function send() {
    setError(null)
    setSending(true)
    try {
      const status = scheduledAt ? "scheduled" : "sent"
      const method = draftId ? "PATCH" : "POST"
      const url = draftId
        ? `/api/comms/campaigns/${draftId}`
        : "/api/comms/campaigns"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(status)),
      })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || "Failed to send")
      }
      router.push("/communications/log")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred")
    } finally {
      setSending(false)
    }
  }

  const bodyIsEmpty = !body.replace(/<[^>]*>/g, "").trim()
  const canSend = !bodyIsEmpty && (channel !== "email" || subject.trim())

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      {/* Channel */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Channel
        </label>
        <div className="flex gap-2">
          {(["email", "sms"] as Channel[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition border ${
                channel === c
                  ? "bg-[#1857E0] text-white border-[#1857E0]"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
              }`}
            >
              {c === "email" ? "Email" : "SMS"}
            </button>
          ))}
        </div>
      </div>

      {/* Audience */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
          Audience
        </label>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              { value: "all_active_members", label: "All active members" },
              { value: "segment", label: "Segment" },
              { value: "dynamic", label: "Saved audience" },
              { value: "manual", label: "Manual list" },
            ] as { value: AudienceType; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAudienceType(value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition border ${
                audienceType === value
                  ? "bg-[#1857E0] text-white border-[#1857E0]"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {audienceType === "segment" && (
          <div className="mt-3">
            <label className="block text-xs text-slate-500 mb-1">Select segment</label>
            {segments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Loading segments…</p>
            ) : (
              <select
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
                className={inputCls}
              >
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.memberCount} member{s.memberCount !== 1 ? "s" : ""}) · {s.type}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {audienceType === "dynamic" && (
          <div className="mt-3">
            <DynamicAudiencePicker onChange={() => setPreview(null)} />
          </div>
        )}

        {audienceType === "manual" && (
          <div className="mt-3">
            <label className="block text-xs text-slate-500 mb-1">
              Email addresses (one per line or comma-separated)
            </label>
            <textarea
              value={manualEmails}
              onChange={(e) => setManualEmails(e.target.value)}
              rows={4}
              placeholder={"alice@example.com\nbob@example.com"}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0] font-mono"
            />
          </div>
        )}

        {/* Recipient preview */}
        <div className="mt-3">
          <button
            type="button"
            onClick={fetchRecipientPreview}
            disabled={previewLoading}
            className="inline-flex items-center gap-1.5 text-xs text-[#1857E0] hover:text-[#1832A8] transition"
          >
            {previewLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Users className="h-3.5 w-3.5" />
            )}
            Preview recipients
          </button>
          {preview && (
            <div className="mt-2 inline-flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs">
              <span className="font-semibold text-blue-800">{preview.eligible} eligible</span>
              <span className="text-blue-500">of {preview.total} total</span>
              {preview.excluded > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <AlertCircle className="h-3 w-3" />
                  {preview.excluded} excluded (suppressed / no email)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subject (email only) */}
      {channel === "email" && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Important update from your club"
            className={inputCls}
          />
        </div>
      )}

      {/* Body */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          Message body
        </label>
        {channel === "email" ? (
          <RichTextEditor
            value={body}
            onChange={setBody}
            placeholder="Write your email content here…"
            minHeight="200px"
          />
        ) : (
          <>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="Write your SMS message here (max 160 characters for a single SMS)…"
              className={inputCls}
            />
            <p className={`mt-1 text-xs ${body.length > 160 ? "text-amber-600" : "text-slate-400"}`}>
              {body.length} / 160 characters
            </p>
          </>
        )}
      </div>

      {/* Reply-to (email only) */}
      {channel === "email" && (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Reply-to address{" "}
            <span className="font-normal normal-case text-slate-400">(optional)</span>
          </label>
          <input
            type="email"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="e.g. membership@yourclub.com"
            className={inputCls}
          />
        </div>
      )}

      {/* Schedule */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
          Schedule for later{" "}
          <span className="font-normal normal-case text-slate-400">
            (optional — leave blank to send now)
          </span>
        </label>
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className={inputCls}
        />
      </div>

      {draftId && (
        <p className="text-xs text-slate-400">
          Draft saved · ID {draftId.slice(0, 8)}…
        </p>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={send}
          disabled={sending || !canSend}
          className="rounded-xl bg-[#1857E0] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#1832A8] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? "Sending…" : scheduledAt ? "Schedule" : "Send now"}
        </button>
        <button
          type="button"
          onClick={saveDraft}
          disabled={saving || (!subject.trim() && bodyIsEmpty)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save draft"}
        </button>
        <a
          href="/communications/log"
          className="text-sm text-slate-500 hover:text-slate-700 transition"
        >
          Cancel
        </a>
      </div>
    </div>
  )
}

// Inline picker for saved dynamic audiences
function DynamicAudiencePicker({ onChange }: { onChange: () => void }) {
  const [audiences, setAudiences] = useState<{ id: string; name: string; estimatedCount: number }[]>([])

  useEffect(() => {
    fetch("/api/comms/audiences")
      .then((r) => r.json())
      .then((json) => setAudiences(json.data ?? []))
      .catch(() => {})
  }, [])

  if (audiences.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic">
        No saved audiences yet.{" "}
        <a href="/communications/audiences/new" className="text-[#1857E0] hover:underline">
          Create one
        </a>
      </p>
    )
  }

  return (
    <select
      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1857E0] focus:ring-1 focus:ring-[#1857E0] bg-white"
      onChange={onChange}
    >
      {audiences.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name} (~{a.estimatedCount} members)
        </option>
      ))}
    </select>
  )
}
