"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, X, Eye, EyeOff } from "lucide-react"

type NewsPost = {
  id: string
  title: string
  slug: string
  body: string | null
  coverImageUrl: string | null
  published: boolean
  publishedAt: string | null
  createdAt: string
}

type FormState = {
  title: string
  body: string
  coverImageUrl: string
  published: boolean
}

const EMPTY_FORM: FormState = {
  title: "",
  body: "",
  coverImageUrl: "",
  published: false,
}

export function NewsManager({ initial }: { initial: NewsPost[] }) {
  const router = useRouter()
  const [posts, setPosts] = useState<NewsPost[]>(initial)
  const [editing, setEditing] = useState<NewsPost | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError("")
    setCreating(true)
  }

  function openEdit(post: NewsPost) {
    setCreating(false)
    setForm({
      title: post.title,
      body: post.body ?? "",
      coverImageUrl: post.coverImageUrl ?? "",
      published: post.published,
    })
    setError("")
    setEditing(post)
  }

  function closePanel() {
    setCreating(false)
    setEditing(null)
    setError("")
  }

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.title.trim()) { setError("Title is required"); return }
    setSaving(true)
    setError("")
    try {
      const payload = {
        title: form.title,
        body: form.body || null,
        coverImageUrl: form.coverImageUrl || null,
        published: form.published,
      }
      let res: Response
      if (editing) {
        res = await fetch(`/api/website/news/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/website/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "Save failed")
      router.refresh()
      // Optimistically update local list
      if (editing) {
        setPosts((prev) => prev.map((p) => p.id === editing.id ? { ...p, ...json.data } : p))
      } else {
        setPosts((prev) => [json.data, ...prev])
      }
      closePanel()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(post: NewsPost) {
    setDeletingId(post.id)
    try {
      const res = await fetch(`/api/website/news/${post.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
      if (editing?.id === post.id) closePanel()
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  const panelOpen = creating || !!editing

  return (
    <div className="flex gap-6">
      {/* ── Post list ── */}
      <div className={`flex flex-col gap-4 ${panelOpen ? "w-1/2" : "w-full"} transition-all`}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{posts.length} post{posts.length !== 1 ? "s" : ""}</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1857E0] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1245b8]"
          >
            <Plus size={16} />
            New post
          </button>
        </div>

        {posts.length === 0 && !panelOpen && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-400">
            <p className="text-sm">No news posts yet. Create your first one.</p>
          </div>
        )}

        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className={[
                "flex items-start gap-4 rounded-2xl border bg-white p-4 shadow-sm transition",
                editing?.id === post.id ? "border-[#1857E0] ring-1 ring-[#1857E0]/20" : "border-slate-200",
              ].join(" ")}
            >
              {post.coverImageUrl && (
                <img
                  src={post.coverImageUrl}
                  alt=""
                  className="h-16 w-24 shrink-0 rounded-xl object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">{post.title}</div>
                    <div className="mt-0.5 font-mono text-xs text-slate-400">{post.slug}</div>
                  </div>
                  <span className={[
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    post.published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                  ].join(" ")}>
                    {post.published ? "Published" : "Draft"}
                  </span>
                </div>
                {post.body && (
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{post.body}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => openEdit(post)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-700"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(post)}
                  disabled={deletingId === post.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-red-200 hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Editor panel ── */}
      {panelOpen && (
        <div className="w-1/2 shrink-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                {creating ? "New post" : "Edit post"}
              </h2>
              <button onClick={closePanel} className="text-slate-400 transition hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Title" required>
                <input
                  className={input}
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Summer tournament results"
                  autoFocus
                />
              </Field>

              <Field label="Cover image URL">
                <input
                  className={input}
                  value={form.coverImageUrl}
                  onChange={(e) => set("coverImageUrl", e.target.value)}
                  placeholder="https://..."
                />
                {form.coverImageUrl && (
                  <img
                    src={form.coverImageUrl}
                    alt=""
                    className="mt-2 h-32 w-full rounded-xl border border-slate-200 object-cover"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                )}
              </Field>

              <Field label="Body">
                <textarea
                  className={`${input} min-h-[200px] resize-y`}
                  value={form.body}
                  onChange={(e) => set("body", e.target.value)}
                  placeholder="Write your news post here..."
                />
              </Field>

              <label className="flex cursor-pointer items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.published}
                  onClick={() => set("published", !form.published)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1857E0] focus:ring-offset-2 ${form.published ? "bg-[#1857E0]" : "bg-slate-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.published ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <div className="flex items-center gap-1.5 text-sm">
                  {form.published ? <Eye size={14} className="text-emerald-600" /> : <EyeOff size={14} className="text-slate-400" />}
                  <span className="font-medium text-slate-900">{form.published ? "Published" : "Draft"}</span>
                </div>
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-[#1857E0] text-sm font-semibold text-white transition hover:bg-[#1245b8] disabled:opacity-50"
                >
                  {saving ? "Saving…" : editing ? "Save changes" : "Create post"}
                </button>
                <button
                  onClick={closePanel}
                  className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const input = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#1857E0] focus:bg-white focus:ring-2 focus:ring-[#1857E0]/20"
