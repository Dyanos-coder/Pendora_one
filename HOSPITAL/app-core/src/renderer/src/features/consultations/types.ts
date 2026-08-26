// Modèle "Consultation" pour cette itération front-end (v1, données locales — voir la note
// équivalente dans features/patients/types.ts).

export type ConsultationStatus = 'Terminée' | 'En cours' | 'En attente' | 'Annulée'

export interface ConsultationRecord {
  id: string
  patientId: string | null
  patientCode: string
  patientName: string
  age: number
  gender: 'M' | 'F'
  time: string
  service: string
  doctor: string
  motive: string
  status: ConsultationStatus
  dossier: string
}
