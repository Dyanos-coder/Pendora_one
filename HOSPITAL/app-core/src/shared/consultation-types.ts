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
  documentFileName: string | null
  documentMimeType: string | null
  documentFileSize: number | null
  updatedAt: string
}

export interface CreateConsultationInput {
  /** Optionnel : id généré côté client pour une création hors-ligne — jamais fourni par le
   * renderer, posé en interne par consultations.service.ts (main). */
  id?: string
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
  /** Posé en interne par consultations.service.ts (main) en mode hors-ligne, jamais fourni par le
   * renderer — voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3. */
  expectedUpdatedAt?: string
}
