// Vue affichable d'un rendez-vous, dérivée de la réponse réelle de l'API (voir
// @shared/appointment-types) — date/heure réelles plutôt qu'un dayIndex relatif à une semaine
// figée, contrairement à l'ancienne v1 mock.

export type AppointmentType = 'Consultation' | 'Suivi' | 'Examen' | 'Résultat' | 'Chirurgie' | 'Campagne' | 'Autre'
export type AppointmentStatus = 'Confirmé' | 'En attente' | 'Annulé' | 'Terminé'

export interface Appointment {
  id: string
  patientId: string | null
  patientName: string
  patientCode: string | null
  patientPhone: string | null
  age: number | null
  date: Date
  durationMin: number
  service: string
  doctorId: string | null
  doctorName: string
  room: string
  type: AppointmentType
  motive: string
  status: AppointmentStatus
  reminder?: string | null
}
