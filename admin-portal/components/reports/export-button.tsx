"use client"

import { Download } from "lucide-react"

type Column = { key: string; header: string }

export function ExportButton({
  data,
  filename,
  columns,
}: {
  data: Record<string, unknown>[]
  filename: string
  columns: Column[]
}) {
  const handleExport = () => {
    const header = columns.map((c) => `"${c.header}"`).join(",")
    const rows = data.map((row) =>
      columns
        .map((c) => {
          const val = row[c.key]
          if (val === null || val === undefined) return '""'
          return `"${String(val).replace(/"/g, '""')}"`
        })
        .join(","),
    )
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-[#1857E0]/30 hover:bg-blue-50 hover:text-[#1857E0]"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  )
}
