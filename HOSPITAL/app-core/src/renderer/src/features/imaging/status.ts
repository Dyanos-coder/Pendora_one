import type { StatusTone } from '@renderer/components/StatusBadge'
import type { ImagingPriority, ImagingStatus } from './types'

export function imagingStatusTone(status: ImagingStatus): StatusTone {
  if (status === 'Résultat validé') return 'success'
  if (status === 'En cours') return 'info'
  if (status === 'En attente lecture') return 'warning'
  return 'danger'
}

export function imagingPriorityTone(priority: ImagingPriority): StatusTone {
  return priority === 'Urgent' ? 'risk' : 'neutral'
}

export const MODALITY_CHART_COLOR: Record<string, string> = {
  Échographie: '#3b82f6',
  Radiographie: '#f59e0b',
  'TDM / Scanner': '#8b5cf6',
  IRM: '#10b981',
  Mammographie: '#ec4899',
  Autres: '#9ca3af'
}
