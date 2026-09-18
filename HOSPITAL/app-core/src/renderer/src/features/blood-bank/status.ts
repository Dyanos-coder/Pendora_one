import type { StatusTone } from '@renderer/components/StatusBadge'
import type { PouchStatus } from './types'

export function pouchStatusTone(status: PouchStatus): StatusTone {
  if (status === 'Disponible') return 'success'
  if (status === 'En attente analyse') return 'info'
  if (status === 'Réservée') return 'neutral'
  if (status === 'Transfusée') return 'opportunity'
  return 'danger'
}

export const POUCH_TYPE_CHART_COLOR: Record<string, string> = {
  'Globules rouges': '#ef4444',
  Plasma: '#3b82f6',
  Plaquettes: '#f59e0b',
  Autres: '#9ca3af'
}
