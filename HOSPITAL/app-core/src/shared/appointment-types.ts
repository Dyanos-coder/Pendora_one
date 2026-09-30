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
  updatedAt: string
}

export interface CreateAppointmentInput {
  /** Optionnel : id généré côté client pour une création hors-ligne — jamais fourni par le
   * renderer, posé en interne par appointments.service.ts (main). */
  id?: string
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
  /** Posé en interne par appointments.service.ts (main) en mode hors-ligne, jamais fourni par le
   * renderer — voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3. */
  expectedUpdatedAt?: string
}

export interface ApiEmployee {
  id: string
  firstName: string
  lastName: string
  role: string
  specialty: string | null
  department: string | null
}
