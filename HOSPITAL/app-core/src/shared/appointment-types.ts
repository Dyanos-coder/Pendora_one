// Types partagés entre main, preload et renderer pour le domaine Rendez-vous.

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

export type ApiAppointmentType = 'CONSULTATION' | 'SUIVI' | 'EXAMEN' | 'RESULTAT' | 'CHIRURGIE' | 'CAMPAGNE' | 'AUTRE'
export type ApiAppointmentStatus = 'CONFIRME' | 'EN_ATTENTE' | 'ANNULE' | 'TERMINE'

export interface ApiAppointment {
  id: string
  date: string
  durationMin: number
  service: string | null
  room: string | null
  type: ApiAppointmentType
  motive: string | null
  status: ApiAppointmentStatus
  reminder: string | null
  patientId: string | null
  patientName: string | null
  patientCode: string | null
  patientPhone: string | null
  age: number | null
  doctorId: string | null
  doctorName: string | null
}

export interface CreateAppointmentInput {
  patientId?: string
  patientName?: string
  patientAge?: number
  doctorId?: string
  date: string
  durationMin?: number
  service?: string
  room?: string
  type?: ApiAppointmentType
  motive?: string
  status?: ApiAppointmentStatus
  reminder?: string
}

export interface UpdateAppointmentInput {
  patientId?: string | null
  doctorId?: string | null
  date?: string
  durationMin?: number
  service?: string | null
  room?: string | null
  type?: ApiAppointmentType
  motive?: string | null
  status?: ApiAppointmentStatus
  reminder?: string | null
}

export interface ApiEmployee {
  id: string
  firstName: string
  lastName: string
  role: string
  specialty: string | null
  department: string | null
}
