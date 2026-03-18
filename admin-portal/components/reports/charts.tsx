// Pure SVG chart components — server-renderable, no dependencies.

const CHART_W = 560
const CHART_H = 100
const LABEL_H = 20

/** Horizontal bar chart: rows with a label, value bar and figure. */
export function HBarChart({
  rows,
  colour = "#1857E0",
}: {
  rows: { label: string; value: number }[]
  colour?: string
}) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">No data</p>
  const max = Math.max(...rows.map((r) => r.value), 1)
  const rowH = 28
  const labelW = 140
  const barAreaW = CHART_W - labelW - 60
  const h = rows.length * rowH

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${CHART_W} ${h}`} className="w-full">
        {rows.map((row, i) => {
          const barW = Math.max(4, Math.round((row.value / max) * barAreaW))
          const y = i * rowH
          return (
            <g key={row.label}>
              <text x={labelW - 8} y={y + rowH / 2 + 4} textAnchor="end" fontSize={11} fill="#64748b">
                {row.label}
              </text>
              <rect x={labelW} y={y + 4} width={barW} height={rowH - 10} rx={3} fill={colour} opacity={0.82} />
              <text x={labelW + barW + 6} y={y + rowH / 2 + 4} fontSize={11} fill="#334155" fontWeight="600">
                {row.value}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Vertical bar chart: columns with an x-label, useful for time series. */
export function VBarChart({
  rows,
  colour = "#1857E0",
  formatValue,
}: {
  rows: { label: string; value: number }[]
  colour?: string
  formatValue?: (v: number) => string
}) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">No data</p>
  const max = Math.max(...rows.map((r) => r.value), 1)
  const barW = Math.max(4, Math.floor((CHART_W / rows.length) - 2))

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H + LABEL_H}`} className="w-full">
        {rows.map((row, i) => {
          const barH = Math.max(4, Math.round((row.value / max) * CHART_H))
          const x = i * (barW + 2)
          const y = CHART_H - barH
          return (
            <g key={row.label}>
              <rect x={x} y={y} width={barW} height={barH} rx={3} fill={colour} opacity={0.82} />
              <title>{row.label}: {formatValue ? formatValue(row.value) : row.value}</title>
              {barW >= 18 && (
                <text x={x + barW / 2} y={CHART_H + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">
                  {row.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Simple donut chart for status/category breakdowns. */
export function DonutChart({
  slices,
  colours,
}: {
  slices: { label: string; value: number }[]
  colours?: string[]
}) {
  const DEFAULT_COLOURS = ["#1857E0", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#64748b"]
  const palette = colours ?? DEFAULT_COLOURS

  const total = slices.reduce((s, r) => s + r.value, 0)
  if (total === 0) return <p className="text-sm text-slate-400">No data</p>

  const cx = 80
  const cy = 80
  const r = 60
  const inner = 36
  let cumAngle = -Math.PI / 2

  const paths = slices.map((slice, i) => {
    const angle = (slice.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = cx + r * Math.cos(cumAngle)
    const y2 = cy + r * Math.sin(cumAngle)
    const xi1 = cx + inner * Math.cos(cumAngle - angle)
    const yi1 = cy + inner * Math.sin(cumAngle - angle)
    const xi2 = cx + inner * Math.cos(cumAngle)
    const yi2 = cy + inner * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    return {
      d: `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`,
      colour: palette[i % palette.length],
      label: slice.label,
      value: slice.value,
      pct: Math.round((slice.value / total) * 100),
    }
  })

  const legendX = 175

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${CHART_W} 165`} className="w-full max-w-lg">
        {paths.map((p) => (
          <path key={p.label} d={p.d} fill={p.colour} opacity={0.9}>
            <title>{p.label}: {p.value} ({p.pct}%)</title>
          </path>
        ))}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={14} fontWeight="700" fill="#0f172a">
          {total}
        </text>
        {paths.map((p, i) => (
          <g key={p.label}>
            <rect x={legendX} y={10 + i * 22} width={12} height={12} rx={3} fill={p.colour} />
            <text x={legendX + 18} y={21 + i * 22} fontSize={11} fill="#475569">
              {p.label} — {p.value} ({p.pct}%)
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

/** Day-of-week × hour heatmap. dow 0=Sun … 6=Sat, hour 0–23. */
export function DowHeatmap({ rows }: { rows: { dow: number; hour: number; count: number }[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">No data</p>

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  // We only show 06:00–21:00 to avoid mostly-empty early morning rows
  const HOURS = Array.from({ length: 16 }, (_, i) => i + 6)

  const map = new Map<string, number>()
  rows.forEach((r) => map.set(`${r.dow}-${r.hour}`, r.count))
  const maxCount = Math.max(...rows.map((r) => r.count), 1)

  const cellW = 28
  const cellH = 18
  const labelW = 30
  const labelH = 24
  const svgW = labelW + HOURS.length * cellW + 10
  const svgH = labelH + DOW.length * cellH + 10

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full">
        {HOURS.map((h, hi) => (
          <text key={h} x={labelW + hi * cellW + cellW / 2} y={14} textAnchor="middle" fontSize={8} fill="#94a3b8">
            {String(h).padStart(2, "0")}
          </text>
        ))}
        {DOW.map((day, di) => (
          <text key={day} x={labelW - 4} y={labelH + di * cellH + cellH / 2 + 4} textAnchor="end" fontSize={9} fill="#64748b">
            {day}
          </text>
        ))}
        {DOW.map((_, di) =>
          HOURS.map((h, hi) => {
            const count = map.get(`${di}-${h}`) ?? 0
            const opacity = count === 0 ? 0.06 : 0.15 + (count / maxCount) * 0.82
            return (
              <rect
                key={`${di}-${h}`}
                x={labelW + hi * cellW + 1}
                y={labelH + di * cellH + 1}
                width={cellW - 2}
                height={cellH - 2}
                rx={2}
                fill="#1857E0"
                opacity={opacity}
              >
                <title>{DOW[di]} {String(h).padStart(2, "0")}:00 — {count} bookings</title>
              </rect>
            )
          }),
        )}
      </svg>
    </div>
  )
}
