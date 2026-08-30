"use client"

import { useState } from "react"

interface TrendPoint {
  label: string
  count: number
}

export function UsageTrendChart({ data }: { data: TrendPoint[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((point) => point.count))

  return (
    <div>
      <div className="flex h-40 items-end gap-3">
        {data.map((point, index) => {
          const heightPct = point.count > 0 ? Math.max((point.count / max) * 100, 4) : 1

          return (
            <div key={point.label} className="relative flex flex-1 flex-col items-center gap-2">
              {activeIndex === index ? (
                <div className="absolute -top-8 rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium whitespace-nowrap text-popover-foreground shadow-sm">
                  {point.count.toLocaleString()}
                </div>
              ) : null}
              <div
                className="flex w-full flex-1 items-end"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="w-full rounded-t-md bg-primary" style={{ height: `${heightPct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{point.label}</span>
            </div>
          )
        })}
      </div>
      <table className="sr-only">
        <caption>Monthly AI generations</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Generations</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.label}>
              <td>{point.label}</td>
              <td>{point.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
