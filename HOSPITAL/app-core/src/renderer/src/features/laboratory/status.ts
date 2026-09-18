import type { StatusTone } from '@renderer/components/StatusBadge'
import type { LabPriority, LabStatus } from './types'

export function labStatusTone(status: LabStatus): StatusTone {
  if (status === 'Résultat validé') return 'success'
  if (status === 'En cours') return 'info'
  if (status === 'En attente prélèvement') return 'warning'
  return 'danger'
}

export function labPriorityTone(priority: LabPriority): StatusTone {
  if (priority === 'Critique') return 'danger'
  if (priority === 'Élevée') return 'warning'
  return 'neutral'
}

export const SAMPLE_CHART_COLOR: Record<string, string> = {
  'Sang (EDTA)': '#8b5cf6',
  'Sang (Sérum)': '#3b82f6',
  'Sang (Héparine)': '#10b981',
  Urines: '#f59e0b',
  Autres: '#9ca3af'
}
