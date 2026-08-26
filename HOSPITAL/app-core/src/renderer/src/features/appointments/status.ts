import type { StatusTone } from '@renderer/components/StatusBadge'
import type { AppointmentStatus, AppointmentType } from './types'

export function appointmentStatusTone(status: AppointmentStatus): StatusTone {
  if (status === 'Confirmé') return 'success'
  if (status === 'En attente') return 'warning'
  if (status === 'Annulé') return 'danger'
  return 'neutral'
}

interface TypeStyle {
  dot: string
  block: string
}

const TYPE_STYLES: Record<AppointmentType, TypeStyle> = {
  Consultation: { dot: 'bg-emerald-500', block: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  Suivi: { dot: 'bg-blue-500', block: 'border-blue-200 bg-blue-50 text-blue-800' },
  Examen: { dot: 'bg-amber-500', block: 'border-amber-200 bg-amber-50 text-amber-800' },
  Résultat: { dot: 'bg-violet-500', block: 'border-violet-200 bg-violet-50 text-violet-800' },
  Chirurgie: { dot: 'bg-red-500', block: 'border-red-200 bg-red-50 text-red-800' },
  Campagne: { dot: 'bg-cyan-500', block: 'border-cyan-200 bg-cyan-50 text-cyan-800' },
  Autre: { dot: 'bg-gray-400', block: 'border-gray-200 bg-gray-50 text-gray-700' }
}

export function appointmentTypeStyle(type: AppointmentType): TypeStyle {
  return TYPE_STYLES[type]
}

export const APPOINTMENT_TYPES: AppointmentType[] = [
  'Consultation',
  'Suivi',
  'Examen',
  'Résultat',
  'Chirurgie',
  'Campagne',
  'Autre'
]
