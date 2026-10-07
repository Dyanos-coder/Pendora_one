import type { StatusTone } from '@renderer/components/StatusBadge'
import type { ProcurementPriority, ProcurementStatus } from './types'

export function procurementStatusTone(status: ProcurementStatus): StatusTone {
  if (status === 'Reçu') return 'success'
  if (status === 'Commandé') return 'info'
  if (status === 'Validé') return 'neutral'
  if (status === 'À valider') return 'warning'
  return 'danger'
}

export function procurementPriorityTone(priority: ProcurementPriority): StatusTone {
  return priority === 'Urgente' ? 'risk' : 'neutral'
}

export const STATUS_CHART_COLOR: Record<ProcurementStatus, string> = {
  'À valider': '#dea127',
  Validé: '#9ca3af',
  Commandé: '#3b82f6',
  Reçu: '#14b8a6',
  Retard: '#ef4444'
}
