// Vue affichable d'une demande d'imagerie, dérivée de la réponse réelle de l'API (voir
// @shared/imaging-types).

export type ImagingStatus = 'Résultat validé' | 'En cours' | 'En attente lecture' | 'Annulé'
export type ImagingPriority = 'Normal' | 'Urgent'

export interface ImagingRequest {
  id: string
  patientId: string | null
  patientCode: string
  patientName: string
  age: number | null
  gender: 'M' | 'F'
  requestedAt: Date
  resultAt: Date | null
  examType: string
  region: string
  service: string
  doctor: string
  doctorId: string | null
  status: ImagingStatus
  priority: ImagingPriority
  expectedDurationMin: number | null
}
