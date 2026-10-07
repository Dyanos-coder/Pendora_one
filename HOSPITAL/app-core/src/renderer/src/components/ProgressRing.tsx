interface ProgressRingProps {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: string
}

export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 8,
  color = 'var(--color-accent-500)',
  trackColor = 'var(--color-gray-200)',
  label
}: ProgressRingProps): JSX.Element {
  const radius = (size - strokeWidth) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" style={{ stroke: trackColor }} strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          style={{ stroke: color }}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute flex flex-col items-center text-sm font-bold text-gray-900">
        {label ?? `${value}%`}
      </span>
    </div>
  )
}
