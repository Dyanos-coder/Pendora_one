import type { StatusTone } from '@renderer/components/StatusBadge'
import type { ItemState } from './types'

export function itemStateTone(state: ItemState): StatusTone {
  if (state === 'Rupture') return 'danger'
  if (state === 'Stock faible') return 'warning'
  return 'success'
}

export const CATEGORY_CHART_COLOR: Record<string, string> = {
  Hôtellerie: '#3b82f6',
  Hygiène: '#14b8a6',
  Entretien: '#dea127',
  Maintenance: '#12a04a',
  Autres: '#9ca3af'
}

export const DEPOT_CHART_COLOR: Record<string, string> = {
  'Dépôt Central': '#3b82f6',
  'Dépôt Hygiène': '#14b8a6',
  'Dépôt Maintenance': '#12a04a',
  'Dépôt Linge': '#dea127',
  'Dépôt Cuisine': '#ef4444'
}
