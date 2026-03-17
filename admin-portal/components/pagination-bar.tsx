interface PaginationBarProps {
  page: number
  totalPages: number
  total: number
  limit: number
  basePath: string
}

export function PaginationBar({ page, totalPages, total, limit, basePath }: PaginationBarProps) {
  if (totalPages <= 1) return null

  function buildUrl(p: number) {
    return `${basePath}?page=${p}`
  }

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  const pages: (number | "…")[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push("…")
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push("…")
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-6">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{from}</span>–
        <span className="font-medium text-slate-700">{to}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span>
      </p>

      <nav className="flex items-center gap-1">
        {page > 1 ? (
          <a
            href={buildUrl(page - 1)}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ← Prev
          </a>
        ) : (
          <span className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 cursor-not-allowed">← Prev</span>
        )}

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-sm text-slate-400">…</span>
          ) : (
            <a
              key={p}
              href={buildUrl(p)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                p === page
                  ? "bg-[#1857E0] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p}
            </a>
          )
        )}

        {page < totalPages ? (
          <a
            href={buildUrl(page + 1)}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Next →
          </a>
        ) : (
          <span className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 cursor-not-allowed">Next →</span>
        )}
      </nav>
    </div>
  )
}
