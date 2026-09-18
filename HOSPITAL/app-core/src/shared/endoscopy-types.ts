// Types partagés entre main, preload et renderer pour le domaine Endoscopie.

export type ApiEndoscopyStatus = 'REALISE' | 'EN_COURS' | 'EN_ATTENTE' | 'PROGRAMME' | 'ANNULE'
export type ApiEndoscopyPriority = 'NORMALE' | 'URGENT'

export interface ApiEndoscopyProcedure {
  id: string
  requestedAt: string
  resultAt: string | null
  procedureType: string
  indication: string | null
  room: string | null
  status: ApiEndoscopyStatus
  priority: ApiEndoscopyPriority
  expectedDurationMin: number | null
  patientId: string | null
  patientName: string | null
  patientCode: string | null
  age: number | null
  gender: 'M' | 'F' | null
  endoscopistId: string | null
  endoscopistName: string | null
}

export interface CreateEndoscopyProcedureInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: 'M' | 'F'
  requestedAt?: string
  procedureType: string
  indication?: string
  service?: string
  endoscopistId?: string
  priority?: ApiEndoscopyPriority
  status?: ApiEndoscopyStatus
  expectedDurationMin?: number
  room?: string
}

export interface UpdateEndoscopyProcedureInput {
  patientId?: string | null
  endoscopistId?: string | null
  requestedAt?: string
  resultAt?: string | null
  procedureType?: string
  indication?: string | null
  service?: string | null
  priority?: ApiEndoscopyPriority
  status?: ApiEndoscopyStatus
  expectedDurationMin?: number | null
  room?: string | null
}
