// Types partagés entre main, preload et renderer pour le domaine Cardiologie.

export type ApiCardioStatus = 'RESULTAT_VALIDE' | 'EN_COURS' | 'EN_ATTENTE' | 'PROGRAMME' | 'ANNULE'
export type ApiCardioPriority = 'NORMALE' | 'URGENT'

export interface ApiCardioExam {
  id: string
  requestedAt: string
  resultAt: string | null
  examType: string
  indication: string | null
  room: string | null
  status: ApiCardioStatus
  priority: ApiCardioPriority
  expectedDurationMin: number | null
  patientId: string | null
  patientName: string | null
  patientCode: string | null
  age: number | null
  gender: 'M' | 'F' | null
  doctorId: string | null
  doctorName: string | null
  resultFileName: string | null
  /** Couvert par un reçu de caisse payé (liste en ligne uniquement). */
  paid?: boolean
  resultMimeType: string | null
  resultFileSize: number | null
  updatedAt: string
}

export interface CreateCardioExamInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: 'M' | 'F'
  requestedAt?: string
  examType: string
  indication?: string
  doctorId?: string
  priority?: ApiCardioPriority
  status?: ApiCardioStatus
  expectedDurationMin?: number
  room?: string
}

export interface UpdateCardioExamInput {
  patientId?: string | null
  doctorId?: string | null
  requestedAt?: string
  resultAt?: string | null
  examType?: string
  indication?: string | null
  priority?: ApiCardioPriority
  status?: ApiCardioStatus
  expectedDurationMin?: number | null
  room?: string | null
  /** Posé en interne par cardiology.service.ts (main) en mode hors-ligne, jamais fourni par le
   * renderer — voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3. */
  expectedUpdatedAt?: string
}
