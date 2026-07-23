interface DayStats {
  date: string
  bookingCount: number
  bookedHours: number
  revenue: number
  addOnRevenue: number
}

interface Props {
  data: DayStats[]
  valueKey: "bookingCount" | "revenue"
  color?: string
  label?: string
  formatValue?: (v: number) => string
}

/**
 * Pure-SVG bar chart — no external chart library.
 * Renders a 30-day trend suitable for a server component.
 */
export function DashboardTrendChart({
  data,
  valueKey,
  color = "#1857E0",
  formatValue = (v) => String(v),
}: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-20 items-center justify-center text-xs text-slate-400">
        No data yet
      </div>
    )
  }

  const values = data.map((d) => Number(d[valueKey]) || 0)
  const max = Math.max(...values, 1)
  const W = 600
  const H = 80
  const barGap = 2
  const barW = Math.max(4, Math.floor(W / data.length) - barGap)
  const step = Math.floor(W / data.length)

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H + 20}`}
        className="w-full"
        aria-hidden="true"
        style={{ height: "100px" }}
      >
        {data.map((d, i) => {
          const val = Number(d[valueKey]) || 0
          const barH = Math.max(2, Math.round((val / max) * H))
          const x = i * step + (step - barW) / 2
          const y = H - barH
          const showLabel =
            i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)
          const dateLabel = d.date ? d.date.slice(5) : "" // MM-DD

          return (
            <g key={d.date ?? i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={2}
                fill={color}
                opacity={0.85}
              />
              {showLabel && (
                <text
                  x={x + barW / 2}
                  y={H + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#94a3b8"
                >
                  {dateLabel}
                </text>
              )}
            </g>
          )
        })}
        {/* zero line */}
        <line x1={0} y1={H} x2={W} y2={H} stroke="#e2e8f0" strokeWidth={1} />
      </svg>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span>{data[0]?.date?.slice(5) ?? ""}</span>
        <span className="font-medium text-slate-700">
          Total: {formatValue(values.reduce((a, b) => a + b, 0))}
        </span>
        <span>{data[data.length - 1]?.date?.slice(5) ?? ""}</span>
      </div>
    </div>
  )
}
