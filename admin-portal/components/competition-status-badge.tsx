const STATUS_COLOURS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-500/20",
  REGISTRATION_OPEN: "bg-blue-50 text-blue-700 ring-blue-600/20",
  IN_PROGRESS: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  COMPLETED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  ARCHIVED: "bg-slate-100 text-slate-500 ring-slate-400/20",
}

export function CompetitionStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_COLOURS[status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20"}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}
