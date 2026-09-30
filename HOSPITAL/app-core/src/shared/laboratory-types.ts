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
  /** Médecin demandeur — facultatif, purement informatif (item 11 PETITES MODIFS). */
  requestingDoctorId: string | null
  requestingDoctorName: string | null
  resultFileName: string | null
  /** Couvert par un reçu de caisse payé (liste en ligne uniquement). */
  paid?: boolean
  resultMimeType: string | null
  resultFileSize: number | null
  updatedAt: string
}

export interface CreateLabRequestInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
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
  requestingDoctorId?: string
  status?: ApiLabStatus
}

export interface UpdateLabRequestInput {
  patientId?: string | null
  technicianId?: string | null
  requestingDoctorId?: string | null
  requestedAt?: string
  resultAt?: string | null
  service?: string | null
  analysisType?: string
  priority?: ApiLabPriority
  sample?: string | null
  status?: ApiLabStatus
  /** Posé en interne par laboratory.service.ts (main) en mode hors-ligne, jamais fourni par le
   * renderer — voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3. */
  expectedUpdatedAt?: string
}
