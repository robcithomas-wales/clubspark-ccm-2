"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { PortalLayout } from "@/components/portal-layout"
import { Send, MessageSquare } from "lucide-react"

const AUDIENCE_LABELS: Record<string, string> = {
  ALL_ENTRANTS: "All entrants",
  CONFIRMED_ENTRANTS: "Confirmed entrants only",
  PENDING_ENTRANTS: "Pending entrants only",
  DIVISION: "Specific division",
}

export default function CompetitionMessagesPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [audience, setAudience] = useState("ALL_ENTRANTS")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/competitions/${id}/messages`)
      .then(r => r.json())
      .then(j => { setMessages(j.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) return
    setSending(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/competitions/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, audience }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? "Failed to send message")
      setMessages(prev => [json.data, ...prev])
      setSubject("")
      setBody("")
      setSuccess(`Message sent to ${json.data.recipientCount} recipient(s)`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <PortalLayout
      title="Competition Messages"
      description="Send messages to all entrants or a specific audience."
    >
      <div className="space-y-6">
        {/* Compose form */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Send a message</h3>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Audience</label>
                <select
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1857E0]/30"
                >
                  {Object.entries(AUDIENCE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Schedule update for Round 3"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1857E0]/30"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={5}
                placeholder="Write your message here..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1857E0]/30"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-600">{success}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1032A8] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {sending ? "Sending…" : "Send message"}
              </button>
            </div>
          </form>
        </div>

        {/* Message history */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Message history</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
              <MessageSquare className="h-8 w-8" />
              <p className="text-sm">No messages sent yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m: any) => (
                <div key={m.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{m.subject}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {AUDIENCE_LABELS[m.audience] ?? m.audience} · {m.recipientCount} recipient(s)
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {new Date(m.sentAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{m.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
