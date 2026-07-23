"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Shield } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError(authError.message); return }
      router.push("/accounts")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ClubSpark Internal</h1>
          <p className="mt-1 text-sm text-slate-400">Staff access only</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none focus:border-orange-400 placeholder:text-slate-500"
              placeholder="you@clubspark.net"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-600 bg-slate-800 px-3 text-sm text-white outline-none focus:border-orange-400"
            />
          </div>
          {error && <p className="rounded-xl border border-red-800 bg-red-900/40 px-3 py-2 text-sm text-red-300">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="h-11 w-full rounded-xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 transition"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  )
}
