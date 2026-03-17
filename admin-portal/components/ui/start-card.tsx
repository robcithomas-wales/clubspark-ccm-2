import { ReactNode } from "react"

export function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-clubspark-lightGray bg-white p-5 shadow-soft">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-clubspark-gray">
        {icon}
        {label}
      </div>

      <div className="mt-3 text-3xl font-semibold text-[#0F1B3D]">
        {value}
      </div>
    </div>
  )
}