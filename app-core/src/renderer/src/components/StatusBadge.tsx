export type StatusTone = 'success' | 'info' | 'warning' | 'risk' | 'danger' | 'opportunity' | 'neutral'

interface StatusBadgeProps {
  label: string
  tone: StatusTone
  /** Pastille pleine (utilisée dans les listes denses) plutôt que le badge à fond coloré. */
  variant?: 'badge' | 'dot'
}

const TONE_STYLES: Record<StatusTone, { badge: string; dot: string }> = {
  success: { badge: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  info: { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  warning: { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  risk: { badge: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  danger: { badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  opportunity: { badge: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
  neutral: { badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
}

export function StatusBadge({ label, tone, variant = 'badge' }: StatusBadgeProps): JSX.Element {
  const styles = TONE_STYLES[tone]

  if (variant === 'dot') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
        {label}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles.badge}`}>
      {label}
    </span>
  )
}
