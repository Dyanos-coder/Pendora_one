// Modèle "Hospitalisation" pour cette itération front-end (v1, données locales — voir la note
// équivalente dans features/patients/types.ts).

export type HospitalizationStatus = 'Hospitalisé' | 'En attente' | 'Sorti'

export interface HospitalizationRecord {
  id: string
  patientId: string | null
  patientCode: string
  patientName: string
  admissionDate: string
  admissionTime: string
  service: string
  room: string
  bed: string
  doctor: string
  motive: string
  status: HospitalizationStatus
  stayDuration: string
}
