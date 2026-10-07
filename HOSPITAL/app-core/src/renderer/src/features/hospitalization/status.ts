import type { StatusTone } from '@renderer/components/StatusBadge'
import type { HospitalizationStatus } from './types'

export function hospitalizationStatusTone(status: HospitalizationStatus): StatusTone {
  if (status === 'Hospitalisé') return 'success'
  if (status === 'En attente') return 'warning'
  return 'neutral'
}

export const BED_CHART_COLOR = {
  occupied: '#14b8a6',
  available: '#3b82f6',
  cleaning: '#dea127',
  maintenance: '#ef4444'
} as const
