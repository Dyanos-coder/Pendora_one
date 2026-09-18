// Vue affichable d'une demande d'analyse anatomopathologique, dérivée de la réponse réelle de
// l'API (voir @shared/pathology-types).

export type PathologyStatus = 'Résultat validé' | 'En cours' | 'En attente de prélèvement' | 'Annulée'
export type PathologyPriority = 'Normale' | 'Urgent'

export interface PathologyRequest {
  id: string
  patientId: string | null
  patientCode: string
  patientName: string
  age: number | null
  gender: 'M' | 'F'
  requestedAt: Date
  resultAt: Date | null
  sampleType: string
  location: string
  service: string
  doctor: string
  doctorId: string | null
  status: PathologyStatus
  priority: PathologyPriority
  expectedDurationMin: number | null
}
