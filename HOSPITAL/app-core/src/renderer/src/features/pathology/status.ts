import type { StatusTone } from '@renderer/components/StatusBadge'
import type { PathologyPriority, PathologyStatus } from './types'

export function pathologyStatusTone(status: PathologyStatus): StatusTone {
  if (status === 'Résultat validé') return 'success'
  if (status === 'En cours') return 'info'
  if (status === 'En attente de prélèvement') return 'warning'
  return 'danger'
}

export function pathologyPriorityTone(priority: PathologyPriority): StatusTone {
  return priority === 'Urgent' ? 'risk' : 'neutral'
}

export const SAMPLE_TYPE_CHART_COLOR: Record<string, string> = {
  Biopsie: '#3b82f6',
  'Pièce opératoire': '#12a04a',
  Ponction: '#dea127',
  'Exérèse / Curetage': '#14b8a6',
  Autres: '#9ca3af'
}
