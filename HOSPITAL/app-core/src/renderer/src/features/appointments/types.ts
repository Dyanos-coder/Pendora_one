// Modèle "Rendez-vous" pour cette itération front-end (v1, données locales — voir la note
// équivalente dans features/patients/types.ts : le contrat partagé main/preload/renderer
// viendra une fois la spécification du module Rendez-vous validée sur cet écran).

export type AppointmentType = 'Consultation' | 'Suivi' | 'Examen' | 'Résultat' | 'Chirurgie' | 'Campagne' | 'Autre'
export type AppointmentStatus = 'Confirmé' | 'En attente' | 'Annulé' | 'Terminé'

export interface Appointment {
  id: string
  patientId: string | null
  patientName: string
  age: number
  /** Index (0 = Lundi ... 6 = Dimanche) dans WEEK_DAYS, pour le placement dans le calendrier. */
  dayIndex: number
  time: string
  durationMin: number
  service: string
  doctor: string
  room: string
  type: AppointmentType
  motive: string
  status: AppointmentStatus
  reminder?: string
}
