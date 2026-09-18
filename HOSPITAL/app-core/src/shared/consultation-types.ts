// Types partagés entre main, preload et renderer pour le domaine Consultations.

export type ApiConsultationStatus = 'TERMINEE' | 'EN_COURS' | 'EN_ATTENTE' | 'ANNULEE'

export interface ApiConsultation {
  id: string
  dossier: string
  date: string
  service: string | null
  motive: string | null
  status: ApiConsultationStatus
  patientId: string | null
  patientName: string | null
  patientCode: string | null
  age: number | null
  gender: 'M' | 'F' | null
  doctorId: string | null
  doctorName: string | null
}

export interface CreateConsultationInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: 'M' | 'F'
  doctorId?: string
  date: string
  service?: string
  motive?: string
  status?: ApiConsultationStatus
}

export interface UpdateConsultationInput {
  patientId?: string | null
  doctorId?: string | null
  date?: string
  service?: string | null
  motive?: string | null
  status?: ApiConsultationStatus
}
