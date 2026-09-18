// Vue affichable d'une hospitalisation, dérivée de la réponse réelle de l'API (voir
// @shared/hospitalization-types).

export type HospitalizationStatus = 'Hospitalisé' | 'En attente' | 'Sorti'

export interface HospitalizationRecord {
  id: string
  patientId: string | null
  patientCode: string
  patientName: string
  admissionDate: Date
  service: string
  room: string | null
  bed: string | null
  bedId: string | null
  doctor: string
  doctorId: string | null
  motive: string
  status: HospitalizationStatus
  stayDuration: string
}
