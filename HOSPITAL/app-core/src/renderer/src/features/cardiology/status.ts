import type { StatusTone } from '@renderer/components/StatusBadge'
import type { CardioPriority, CardioStatus } from './types'

export function cardioStatusTone(status: CardioStatus): StatusTone {
  if (status === 'Résultat validé') return 'success'
  if (status === 'En cours') return 'info'
  if (status === 'En attente') return 'warning'
  if (status === 'Programmé') return 'neutral'
  return 'danger'
}

export function cardioPriorityTone(priority: CardioPriority): StatusTone {
  return priority === 'Urgent' ? 'risk' : 'neutral'
}

export const EXAM_TYPE_CHART_COLOR: Record<string, string> = {
  Échocardiographie: '#3b82f6',
  ECG: '#14b8a6',
  'Holter ECG 24h': '#dea127',
  "Épreuve d'effort": '#12a04a',
  Coronarographie: '#ef4444',
  Autres: '#9ca3af'
}
