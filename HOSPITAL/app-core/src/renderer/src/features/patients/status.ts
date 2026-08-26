import type { StatusTone } from '@renderer/components/StatusBadge'
import type { Consultation, ExamResult, Patient } from './types'

export function statusInfo(patient: Pick<Patient, 'status'>): { label: string; tone: StatusTone } {
  return patient.status === 'active' ? { label: 'Actif', tone: 'success' } : { label: 'Inactif', tone: 'neutral' }
}

export function resultTone(status: ExamResult['status']): StatusTone {
  if (status === 'Critique') return 'danger'
  if (status === 'Anormal') return 'warning'
  return 'success'
}

export function consultationTone(status: Consultation['status']): StatusTone {
  if (status === 'Terminée') return 'success'
  if (status === 'Planifiée') return 'info'
  return 'neutral'
}
