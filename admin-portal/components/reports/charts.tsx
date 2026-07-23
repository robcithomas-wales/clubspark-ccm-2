'use client'

// Re-exports all chart components with ssr: false so they are never server-rendered.
// This prevents hydration mismatches caused by floating-point SVG path differences
// between the Node.js SSR pass and the browser.
import dynamic from 'next/dynamic'

export const HBarChart = dynamic(
  () => import('./charts-impl').then((m) => ({ default: m.HBarChart })),
  { ssr: false },
)

export const VBarChart = dynamic(
  () => import('./charts-impl').then((m) => ({ default: m.VBarChart })),
  { ssr: false },
)

export const DonutChart = dynamic(
  () => import('./charts-impl').then((m) => ({ default: m.DonutChart })),
  { ssr: false },
)

export const DualVBarChart = dynamic(
  () => import('./charts-impl').then((m) => ({ default: m.DualVBarChart })),
  { ssr: false },
)

export const DowHeatmap = dynamic(
  () => import('./charts-impl').then((m) => ({ default: m.DowHeatmap })),
  { ssr: false },
)
