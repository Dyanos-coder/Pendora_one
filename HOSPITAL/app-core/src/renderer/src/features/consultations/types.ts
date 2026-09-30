// Vue affichable d'une consultation, dérivée de la réponse réelle de l'API (voir
// @shared/consultation-types).

export type ConsultationStatus = 'Terminée' | 'En cours' | 'En attente' | 'Annulée'

export interface ConsultationRecord {
  id: string
  patientId: string | null
  patientCode: string
  patientName: string
  age: number
  gender: 'M' | 'F'
  date: Date
  service: string
  doctor: string
  doctorId: string | null
  motive: string
  status: ConsultationStatus
  dossier: string
  documentFileName: string | null
}
