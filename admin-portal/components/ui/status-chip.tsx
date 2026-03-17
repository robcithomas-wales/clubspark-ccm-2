export function StatusChip({
  label,
}: {
  label: string
}) {
  return (
    <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-clubspark-softGreen">
      {label}
    </span>
  )
}