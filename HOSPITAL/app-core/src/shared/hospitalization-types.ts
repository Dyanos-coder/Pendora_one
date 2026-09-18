// Types partagés entre main, preload et renderer pour le domaine Hospitalisation.

export type ApiHospitalizationStatus = 'HOSPITALISE' | 'EN_ATTENTE' | 'SORTI'
export type ApiBedStatus = 'OCCUPIED' | 'AVAILABLE' | 'CLEANING' | 'MAINTENANCE'

export interface ApiHospitalization {
  id: string
  admissionDate: string
  dischargeDate: string | null
  service: string | null
  motive: string | null
  status: ApiHospitalizationStatus
  stayDuration: string
  patientId: string | null
  patientName: string | null
  patientCode: string | null
  room: string | null
  bed: string | null
  bedId: string | null
  doctorId: string | null
  doctorName: string | null
}

export interface ApiBed {
  id: string
  room: string
  label: string
  service: string | null
  status: ApiBedStatus
}

export interface ApiBedOccupancy {
  total: number
  OCCUPIED: number
  AVAILABLE: number
  CLEANING: number
  MAINTENANCE: number
}

export interface CreateHospitalizationInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  bedId?: string
  doctorId?: string
  admissionDate: string
  service?: string
  motive?: string
  status?: ApiHospitalizationStatus
}

export interface UpdateHospitalizationInput {
  patientId?: string | null
  doctorId?: string | null
  bedId?: string | null
  admissionDate?: string
  dischargeDate?: string | null
  service?: string | null
  motive?: string | null
  status?: ApiHospitalizationStatus
}
