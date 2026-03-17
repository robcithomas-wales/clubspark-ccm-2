import { ReactNode } from "react"

export function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={[
        "rounded-3xl border border-clubspark-lightGray bg-white shadow-soft",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  )
}