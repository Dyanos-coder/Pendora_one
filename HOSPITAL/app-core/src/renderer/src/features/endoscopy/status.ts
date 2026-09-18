import type { StatusTone } from '@renderer/components/StatusBadge'
import type { EndoscopyPriority, EndoscopyStatus } from './types'

export function endoscopyStatusTone(status: EndoscopyStatus): StatusTone {
  if (status === 'Réalisé') return 'success'
  if (status === 'En cours') return 'info'
  if (status === 'En attente') return 'warning'
  if (status === 'Programmé') return 'neutral'
  return 'danger'
}

export function endoscopyPriorityTone(priority: EndoscopyPriority): StatusTone {
  return priority === 'Urgent' ? 'risk' : 'neutral'
}

export const PROCEDURE_TYPE_CHART_COLOR: Record<string, string> = {
  'Fibroscopie haute': '#3b82f6',
  Coloscopie: '#10b981',
  CPRE: '#8b5cf6',
  Bronchoscopie: '#f59e0b',
  Rectosigmoïdoscopie: '#ef4444',
  Autres: '#9ca3af'
}
