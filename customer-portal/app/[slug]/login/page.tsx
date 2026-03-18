"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { registerCustomer } from "@/lib/api"
import { useOrg } from "@/lib/org-context"

type Mode = "signin" | "register"

export default function LoginPage() {
  const org = useOrg()
  const router = useRouter()
  const primary = org.primaryColour
  const slug = org.slug

  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (mode === "signin") {
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message)
        router.push(`/${slug}/account`)
      } else {
        await registerCustomer({ tenantId: org.tenantId, email, password, firstName, lastName })
        // Auto sign in after registration
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message)
        router.push(`/${slug}/account`)
      }
    } catch (e: any) {
      setError(e.message ?? "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[--primary] focus:bg-white focus:ring-2 focus:ring-[--primary]/20"

  return (
    <div className="flex min-h-screen">
      {/* Left — branding panel */}
      <div
        className="hidden flex-col justify-between p-12 lg:flex lg:w-1/2"
        style={{ backgroundColor: primary }}
      >
        {/* Court pattern background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="court2" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                <rect x="10" y="10" width="100" height="100" fill="none" stroke="white" strokeWidth="1.5"/>
                <circle cx="60" cy="60" r="20" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#court2)"/>
          </svg>
        </div>

        <Link href={`/${slug}`} className="relative flex items-center gap-2 text-white/80 text-sm transition hover:text-white">
          <ArrowLeft size={16} /> Back to site
        </Link>

        <div className="relative">
          <div className="text-5xl font-extrabold leading-tight text-white">
            {org.name}
          </div>
          <p className="mt-4 text-lg text-white/70">
            {org.about ?? "Book courts, manage your membership and more."}
          </p>
        </div>

        <div className="relative text-sm text-white/40">
          © {new Date().getFullYear()} {org.name}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 lg:px-16">
        <div className="w-full max-w-md">
          {/* Mobile back link */}
          <Link href={`/${slug}`} className="mb-8 flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-900 lg:hidden">
            <ArrowLeft size={15} /> Back
          </Link>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "signin"
              ? `Sign in to your ${org.name} account`
              : `Join ${org.name} today`}
          </p>

          {/* Mode toggle */}
          <div className="mt-8 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(["signin", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError("") }}
                className={[
                  "flex-1 rounded-lg py-2 text-sm font-medium transition",
                  mode === m ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                {m === "signin" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">First name</label>
                  <input className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Rob" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Last name</label>
                  <input className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Thomas" />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Email</label>
              <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className={`${inputCls} pr-10`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={8}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60"
              style={{ backgroundColor: primary }}
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
