import type { StatusTone } from '@renderer/components/StatusBadge'
import type { EmergencyStatus, Severity } from './types'

export function severityTone(severity: Severity): StatusTone {
  if (severity === 'Critique') return 'danger'
  if (severity === 'Élevé') return 'risk'
  if (severity === 'Moyen') return 'warning'
  return 'success'
}

export const SEVERITY_CHART_COLOR: Record<Severity, string> = {
  Critique: '#ef4444',
  Élevé: '#f97316',
  Moyen: '#dea127',
  Faible: '#14b8a6'
}

export function emergencyStatusTone(status: EmergencyStatus): StatusTone {
  if (status === 'En cours') return 'info'
  if (status === 'En observation') return 'warning'
  if (status === 'En attente de triage') return 'risk'
  if (status === 'Sorti') return 'success'
  if (status === 'Transféré') return 'neutral'
  return 'danger'
}
