import type { StatusTone } from '@renderer/components/StatusBadge'
import type { Patient } from './types'
import type { ApiExamResultStatus } from '@shared/patient-types'
import type { ApiConsultationStatus } from '@shared/consultation-types'
import type { ApiAppointmentStatus } from '@shared/appointment-types'

export function statusInfo(patient: Pick<Patient, 'status'>): { label: string; tone: StatusTone } {
  return patient.status === 'active' ? { label: 'Actif', tone: 'success' } : { label: 'Inactif', tone: 'neutral' }
}

export const CONSULTATION_STATUS_LABEL: Record<ApiConsultationStatus, string> = {
  TERMINEE: 'Terminée',
  EN_COURS: 'En cours',
  EN_ATTENTE: 'En attente',
  ANNULEE: 'Annulée'
}

export function consultationTone(status: ApiConsultationStatus): StatusTone {
  if (status === 'TERMINEE') return 'success'
  if (status === 'EN_COURS') return 'info'
  if (status === 'EN_ATTENTE') return 'warning'
  return 'neutral'
}

export const APPOINTMENT_STATUS_LABEL: Record<ApiAppointmentStatus, string> = {
  CONFIRME: 'Confirmé',
  EN_ATTENTE: 'En attente',
  ANNULE: 'Annulé',
  TERMINE: 'Terminé'
}

export function appointmentTone(status: ApiAppointmentStatus): StatusTone {
  if (status === 'CONFIRME') return 'success'
  if (status === 'EN_ATTENTE') return 'warning'
  return 'neutral'
}

export const RESULT_STATUS_LABEL: Record<ApiExamResultStatus, string> = {
  DISPONIBLE: 'Disponible',
  EN_ATTENTE: 'En attente',
  ANNULE: 'Annulé'
}

export function resultTone(status: ApiExamResultStatus): StatusTone {
  if (status === 'DISPONIBLE') return 'success'
  if (status === 'EN_ATTENTE') return 'warning'
  return 'neutral'
}
