import type { StatusTone } from '@renderer/components/StatusBadge'
import type { IndicatorStatus } from './types'

export function indicatorStatusTone(status: IndicatorStatus): StatusTone {
  if (status === 'Conforme') return 'success'
  if (status === 'À surveiller') return 'warning'
  return 'danger'
}

export const CATEGORY_CHART_COLOR: Record<string, string> = {
  'Sécurité patient': '#ef4444',
  Hygiène: '#14b8a6',
  'Satisfaction patient': '#3b82f6',
  'Processus clinique': '#12a04a'
}
