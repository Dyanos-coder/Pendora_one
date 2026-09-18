// Types partagés entre main, preload et renderer pour le domaine Laboratoire.

export type ApiLabStatus = 'RESULTAT_VALIDE' | 'EN_COURS' | 'EN_ATTENTE_PRELEVEMENT' | 'ANNULEE'
export type ApiLabPriority = 'NORMALE' | 'ELEVEE' | 'CRITIQUE'

export interface ApiLabRequest {
  id: string
  requestNumber: string
  requestedAt: string
  resultAt: string | null
  service: string | null
  analysisType: string
  status: ApiLabStatus
  priority: ApiLabPriority
  sample: string | null
  patientId: string | null
  patientName: string | null
  patientCode: string | null
  age: number | null
  gender: 'M' | 'F' | null
  technicianId: string | null
  technicianName: string | null
}

export interface CreateLabRequestInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: 'M' | 'F'
  requestedAt?: string
  service?: string
  analysisType: string
  priority?: ApiLabPriority
  sample?: string
  technicianId?: string
  status?: ApiLabStatus
}

export interface UpdateLabRequestInput {
  patientId?: string | null
  technicianId?: string | null
  requestedAt?: string
  resultAt?: string | null
  service?: string | null
  analysisType?: string
  priority?: ApiLabPriority
  sample?: string | null
  status?: ApiLabStatus
}
