import type { StatusTone } from '@renderer/components/StatusBadge'
import type { HospitalizationStatus } from './types'

export function hospitalizationStatusTone(status: HospitalizationStatus): StatusTone {
  if (status === 'Hospitalisé') return 'success'
  if (status === 'En attente') return 'warning'
  return 'neutral'
}

export const BED_CHART_COLOR = {
  occupied: '#10b981',
  available: '#3b82f6',
  cleaning: '#f59e0b',
  maintenance: '#ef4444'
} as const
