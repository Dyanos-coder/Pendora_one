import type { StatusTone } from '@renderer/components/StatusBadge'
import type { ItemState } from './types'

export function itemStateTone(state: ItemState): StatusTone {
  if (state === 'Rupture') return 'danger'
  if (state === 'Stock faible') return 'warning'
  return 'success'
}

export const CATEGORY_CHART_COLOR: Record<string, string> = {
  Hôtellerie: '#3b82f6',
  Hygiène: '#10b981',
  Entretien: '#f59e0b',
  Maintenance: '#8b5cf6',
  Autres: '#9ca3af'
}

export const DEPOT_CHART_COLOR: Record<string, string> = {
  'Dépôt Central': '#3b82f6',
  'Dépôt Hygiène': '#10b981',
  'Dépôt Maintenance': '#8b5cf6',
  'Dépôt Linge': '#f59e0b',
  'Dépôt Cuisine': '#ef4444'
}
