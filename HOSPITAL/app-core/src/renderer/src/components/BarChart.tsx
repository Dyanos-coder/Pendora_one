interface BarChartProps {
  categories: string[]
  values: number[]
  color?: string
  height?: number
}

export function BarChart({ categories, values, color = 'var(--color-accent-500)', height = 110 }: BarChartProps): JSX.Element {
  const max = Math.max(1, ...values)

  return (
    <div className="flex w-full min-w-0 items-end gap-2" style={{ height }}>
      {values.map((value, index) => (
        // min-w-0 + libellé tronqué : un libellé long (« Ophtalmologie ») ne doit pas élargir la
        // barre au point de faire déborder le graphique de sa carte. Libellé complet au survol.
        <div key={categories[index]} className="flex min-w-0 flex-1 flex-col items-center gap-1.5" title={`${categories[index]} : ${value}`}>
          <span className="text-[10px] font-medium text-gray-500 tabular-nums">{value}</span>
          <div
            className="w-full rounded-t-[6px] transition-opacity hover:opacity-80"
            style={{ height: `${(value / max) * (height - 28)}px`, backgroundColor: color, minHeight: 2 }}
          />
          <span className="w-full truncate text-center text-[9px] text-gray-400">{categories[index]}</span>
        </div>
      ))}
    </div>
  )
}
