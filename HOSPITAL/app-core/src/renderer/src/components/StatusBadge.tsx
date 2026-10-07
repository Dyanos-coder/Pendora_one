import { AlertTriangle, Check, CircleAlert } from 'lucide-react'

export type StatusTone = 'success' | 'info' | 'warning' | 'risk' | 'danger' | 'opportunity' | 'neutral' | 'gold'

interface StatusBadgeProps {
  label: string
  tone: StatusTone
  /** Pastille pleine (utilisée dans les listes denses) plutôt que le badge à fond coloré. */
  variant?: 'badge' | 'dot'
}

// Couleurs d'état distinctes du vert de marque (Plan-Refonte-Graphique.md §3.2) : « succès » en
// turquoise, pour ne jamais confondre un état avec un bouton. Les états importants portent aussi
// une icône (jamais la couleur seule).
const TONE_STYLES: Record<StatusTone, { badge: string; dot: string }> = {
  success: { badge: 'bg-teal-50 text-teal-700 ring-teal-600/15', dot: 'bg-teal-500' },
  info: { badge: 'bg-blue-50 text-blue-700 ring-blue-600/15', dot: 'bg-blue-500' },
  warning: { badge: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  risk: { badge: 'bg-orange-50 text-orange-700 ring-orange-600/20', dot: 'bg-orange-500' },
  danger: { badge: 'bg-red-50 text-red-700 ring-red-600/15', dot: 'bg-red-500' },
  opportunity: { badge: 'bg-violet-50 text-violet-700 ring-violet-600/15', dot: 'bg-violet-500' },
  neutral: { badge: 'bg-gray-100 text-gray-600 ring-gray-500/10', dot: 'bg-gray-400' },
  gold: { badge: 'bg-gold-100 text-gold-700 ring-gold-600/20', dot: 'bg-gold-500' }
}

const TONE_ICON: Partial<Record<StatusTone, typeof Check>> = {
  success: Check,
  warning: AlertTriangle,
  danger: CircleAlert
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

  const Icon = TONE_ICON[tone]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs leading-none font-semibold whitespace-nowrap ring-1 ring-inset ${styles.badge}`}
    >
      {Icon && <Icon className="h-3 w-3" strokeWidth={2.6} />}
      {label}
    </span>
  )
}
