"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Pencil, Trash2, Users, Mail } from "lucide-react"

interface SavedAudience {
  id: string
  name: string
  description?: string
  rulesJson: string
  estimatedCount: number
  createdAt: string
}

function parseRules(json: string) {
  try {
    return JSON.parse(json) as { logic: string; rules: { field: string; operator: string; value: string }[] }
  } catch {
    return null
  }
}

export function AudiencesClient({ audiences }: { audiences: SavedAudience[] }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  async function deleteAudience(id: string) {
    if (!confirm("Delete this saved audience?")) return
    setDeleting(id)
    try {
      await fetch(`/api/comms/audiences/${id}`, { method: "DELETE" })
      router.refresh()
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="divide-y divide-slate-100">
        {audiences.map((a) => {
          const rules = parseRules(a.rulesJson)
          return (
            <div key={a.id} className="flex items-start gap-4 px-5 py-4">
              <div className="shrink-0 mt-0.5 text-slate-400">
                <Users className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{a.name}</span>
                  {a.estimatedCount > 0 && (
                    <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                      ~{a.estimatedCount} members
                    </span>
                  )}
                </div>
                {a.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{a.description}</p>
                )}
                {rules && rules.rules.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400">
                      {rules.logic === "and" ? "ALL of:" : "ANY of:"}
                    </span>
                    {rules.rules.map((r, i) => (
                      <span key={i} className="text-xs bg-slate-100 text-slate-600 rounded-lg px-2 py-0.5">
                        {r.field} {r.operator} {r.value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/communications/compose?audienceId=${a.id}`}
                  className="p-1.5 text-slate-400 hover:text-[#1857E0] transition rounded-lg hover:bg-slate-100"
                  title="Use in campaign"
                >
                  <Mail className="h-4 w-4" />
                </Link>
                <Link
                  href={`/communications/audiences/${a.id}/edit`}
                  className="p-1.5 text-slate-400 hover:text-[#1857E0] transition rounded-lg hover:bg-slate-100"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => deleteAudience(a.id)}
                  disabled={deleting === a.id}
                  className="p-1.5 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-red-50 disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
