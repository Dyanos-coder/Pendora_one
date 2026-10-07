import type { StatusTone } from '@renderer/components/StatusBadge'
import type { SurgeryStatus } from './types'

export function surgeryStatusTone(status: SurgeryStatus): StatusTone {
  if (status === 'Terminée') return 'success'
  if (status === 'En cours') return 'info'
  if (status === 'En attente') return 'warning'
  return 'danger'
}

export const SPECIALTY_CHART_COLOR: Record<string, string> = {
  'Chirurgie générale': '#14b8a6',
  Gynécologie: '#3b82f6',
  Orthopédie: '#12a04a',
  Urologie: '#dea127',
  ORL: '#ef4444',
  Autres: '#9ca3af'
}
