"use client"

import { useState, useRef, useEffect, FormEvent } from "react"
import { MessageCircle, X, Send, Loader2, Mic, MicOff } from "lucide-react"

type Message = { role: "user" | "assistant"; content: string }

const WELCOME: Message = {
  role: "assistant",
  content: "Hi! I'm the ClubSpark support assistant. Ask me anything about how to use the admin portal.",
}

export function SupportChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  const speechSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognition.lang = "en-GB"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setInput((prev) => (prev ? prev + " " + transcript : transcript))
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognition.start()
    setListening(true)
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  async function send(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput("")
    const next: Message[] = [...messages, { role: "user", content: text }]
    setMessages(next)
    setLoading(true)
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setMessages([...next, { role: "assistant", content: data.message ?? data.error ?? "Sorry, something went wrong." }])
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry, I couldn't connect. Please try again." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[360px] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #0c1738 0%, #1832A8 60%, #1857E0 100%)" }}>
            <div>
              <p className="text-white font-semibold text-sm">ClubSpark Support</p>
              <p className="text-white/70 text-xs">Ask us anything</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={[
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap",
                  m.role === "user" ? "text-white" : "bg-slate-100 text-slate-800",
                ].join(" ")}
                  style={m.role === "user" ? { background: "linear-gradient(135deg, #1832A8, #1857E0)" } : undefined}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl px-4 py-2.5">
                  <Loader2 className="w-4 h-4 text-[#1857E0] animate-spin" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="flex gap-2 p-3 border-t border-slate-200">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "Listening..." : "Ask a question..."}
              disabled={loading}
              autoComplete="off"
              className={["flex-1 text-sm border rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#1857E0]/30 disabled:opacity-50", listening ? "border-red-400 ring-2 ring-red-300" : "border-slate-200"].join(" ")}
            />
            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                title={listening ? "Stop recording" : "Speak your question"}
                className={["rounded-xl px-3 py-2 transition-colors", listening ? "bg-red-500 hover:bg-red-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"].join(" ")}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="disabled:opacity-40 text-white rounded-xl px-3 py-2 transition-colors"
              style={{ background: "linear-gradient(135deg, #1832A8, #1857E0)" }}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-all hover:scale-105"
        style={{ background: "linear-gradient(135deg, #0c1738, #1857E0)" }}
        aria-label="Open support chat"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  )
}
