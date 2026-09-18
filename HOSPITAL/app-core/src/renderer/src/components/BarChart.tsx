interface BarChartProps {
  categories: string[]
  values: number[]
  color?: string
  height?: number
}

export function BarChart({ categories, values, color = '#8b5cf6', height = 110 }: BarChartProps): JSX.Element {
  const max = Math.max(1, ...values)

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {values.map((value, index) => (
        <div key={categories[index]} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-medium text-gray-500">{value}</span>
          <div
            className="w-full rounded-t-md"
            style={{ height: `${(value / max) * (height - 28)}px`, backgroundColor: color, minHeight: 2 }}
          />
          <span className="text-[9px] text-gray-400">{categories[index]}</span>
        </div>
      ))}
    </div>
  )
}
