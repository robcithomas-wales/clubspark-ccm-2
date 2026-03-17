import { ReactNode } from "react"
import { SurfaceCard } from "./surface-card"

export function PageSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <SurfaceCard className="p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[#0F1B3D]">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm text-clubspark-gray">
            {description}
          </p>
        )}
      </div>

      {children}
    </SurfaceCard>
  )
}