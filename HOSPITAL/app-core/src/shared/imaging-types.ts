// Types partagés entre main, preload et renderer pour le domaine Imagerie médicale.

export type ApiImagingStatus = 'RESULTAT_VALIDE' | 'EN_COURS' | 'EN_ATTENTE_LECTURE' | 'ANNULE'
export type ApiImagingPriority = 'NORMAL' | 'URGENT'

export interface ApiImagingRequest {
  id: string
  requestedAt: string
  resultAt: string | null
  examType: string
  region: string | null
  service: string | null
  status: ApiImagingStatus
  priority: ApiImagingPriority
  expectedDurationMin: number | null
  patientId: string | null
  patientName: string | null
  patientCode: string | null
  age: number | null
  gender: 'M' | 'F' | null
  doctorId: string | null
  doctorName: string | null
}

export interface CreateImagingRequestInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: 'M' | 'F'
  requestedAt?: string
  examType: string
  region?: string
  service?: string
  doctorId?: string
  priority?: ApiImagingPriority
  status?: ApiImagingStatus
  expectedDurationMin?: number
}

export interface UpdateImagingRequestInput {
  patientId?: string | null
  doctorId?: string | null
  requestedAt?: string
  resultAt?: string | null
  examType?: string
  region?: string | null
  service?: string | null
  priority?: ApiImagingPriority
  status?: ApiImagingStatus
  expectedDurationMin?: number | null
}
