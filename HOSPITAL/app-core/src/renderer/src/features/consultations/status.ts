import type { StatusTone } from '@renderer/components/StatusBadge'
import type { ConsultationStatus } from './types'

export function consultationStatusTone(status: ConsultationStatus): StatusTone {
  if (status === 'Terminée') return 'success'
  if (status === 'En cours') return 'info'
  if (status === 'En attente') return 'warning'
  return 'danger'
}

export const STATUS_CHART_COLOR: Record<ConsultationStatus, string> = {
  Terminée: '#14b8a6',
  'En cours': '#3b82f6',
  'En attente': '#dea127',
  Annulée: '#ef4444'
}
