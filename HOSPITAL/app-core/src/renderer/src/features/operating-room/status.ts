import type { StatusTone } from '@renderer/components/StatusBadge'
import type { SurgeryStatus } from './types'

export function surgeryStatusTone(status: SurgeryStatus): StatusTone {
  if (status === 'Terminée') return 'success'
  if (status === 'En cours') return 'info'
  if (status === 'En attente') return 'warning'
  return 'danger'
}

export const SPECIALTY_CHART_COLOR: Record<string, string> = {
  'Chirurgie générale': '#10b981',
  Gynécologie: '#3b82f6',
  Orthopédie: '#8b5cf6',
  Urologie: '#f59e0b',
  ORL: '#ef4444',
  Autres: '#9ca3af'
}
