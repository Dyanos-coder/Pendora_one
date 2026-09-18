// Types partagés entre main, preload et renderer pour le domaine Urgences.

export type ApiSeverity = 'CRITIQUE' | 'ELEVE' | 'MOYEN' | 'FAIBLE'
export type ApiEmergencyStatus = 'EN_COURS' | 'EN_OBSERVATION' | 'EN_ATTENTE_TRIAGE' | 'SORTI' | 'TRANSFERE' | 'ANNULE'

export interface ApiEmergencyVisit {
  id: string
  arrivalTime: string
  dischargeTime: string | null
  motive: string | null
  detail: string | null
  severity: ApiSeverity
  zone: string | null
  status: ApiEmergencyStatus
  outcome: string | null
  duration: string
  patientId: string | null
  patientName: string | null
  patientCode: string | null
  age: number | null
  gender: 'M' | 'F' | null
  doctorId: string | null
  doctorName: string | null
}

export interface CreateEmergencyVisitInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: 'M' | 'F'
  arrivalTime?: string
  motive?: string
  detail?: string
  severity: ApiSeverity
  zone?: string
  doctorId?: string
  status?: ApiEmergencyStatus
}

export interface UpdateEmergencyVisitInput {
  patientId?: string | null
  doctorId?: string | null
  arrivalTime?: string
  dischargeTime?: string | null
  motive?: string | null
  detail?: string | null
  severity?: ApiSeverity
  zone?: string | null
  status?: ApiEmergencyStatus
  outcome?: string | null
}
