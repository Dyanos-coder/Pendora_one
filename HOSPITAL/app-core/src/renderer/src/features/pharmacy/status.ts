import type { StatusTone } from '@renderer/components/StatusBadge'
import type { StockState } from './types'

export function stockStateTone(state: StockState): StatusTone {
  if (state === 'Rupture') return 'danger'
  if (state === 'Stock faible') return 'warning'
  return 'success'
}

export const CATEGORY_CHART_COLOR: Record<string, string> = {
  Antibiotiques: '#3b82f6',
  Analgésiques: '#12a04a',
  Cardiovasculaire: '#14b8a6',
  Antidiabétiques: '#dea127',
  Autres: '#ef4444'
}
