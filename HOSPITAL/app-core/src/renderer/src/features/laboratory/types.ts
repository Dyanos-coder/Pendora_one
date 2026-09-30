// Vue affichable d'une demande d'analyse, dérivée de la réponse réelle de l'API (voir
// @shared/laboratory-types).

export type LabStatus = 'Résultat validé' | 'En cours' | 'En attente prélèvement' | 'Annulée'
export type LabPriority = 'Normale' | 'Élevée' | 'Critique'

export interface LabRequest {
  id: string
  requestNumber: string
  patientId: string | null
  patientCode: string
  patientName: string
  age: number | null
  gender: 'M' | 'F'
  requestedAt: Date
  resultAt: Date | null
  service: string
  analysisType: string
  status: LabStatus
  priority: LabPriority
  sample: string
  technician: string
  technicianId: string | null
  requestingDoctor: string
  requestingDoctorId: string | null
  resultFileName: string | null
  paid?: boolean
}
