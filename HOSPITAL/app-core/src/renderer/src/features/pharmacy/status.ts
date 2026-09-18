import type { StatusTone } from '@renderer/components/StatusBadge'
import type { StockState } from './types'

export function stockStateTone(state: StockState): StatusTone {
  if (state === 'Rupture') return 'danger'
  if (state === 'Stock faible') return 'warning'
  return 'success'
}

export const CATEGORY_CHART_COLOR: Record<string, string> = {
  Antibiotiques: '#3b82f6',
  Analgésiques: '#8b5cf6',
  Cardiovasculaire: '#10b981',
  Antidiabétiques: '#f59e0b',
  Autres: '#ef4444'
}
