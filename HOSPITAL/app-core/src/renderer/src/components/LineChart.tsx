interface Series {
  label: string
  color: string
  values: number[]
}

interface LineChartProps {
  categories: string[]
  series: Series[]
  height?: number
}

const VIEW_WIDTH = 300

export function LineChart({ categories, series, height = 90 }: LineChartProps): JSX.Element {
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  const stepX = VIEW_WIDTH / (categories.length - 1)

  function pointsFor(values: number[]): string {
    return values.map((v, i) => `${i * stepX},${height - (v / max) * height}`).join(' ')
  }

  return (
    <div>
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${height}`} className="w-full overflow-visible" preserveAspectRatio="none">
        {series.map((s) => (
          <polyline
            key={s.label}
            points={pointsFor(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
        {categories.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
    </div>
  )
}
