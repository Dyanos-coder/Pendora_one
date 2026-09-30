// Types partagés entre main, preload et renderer pour le domaine Anatomopathologie.

export type ApiPathologyStatus = 'RESULTAT_VALIDE' | 'EN_COURS' | 'EN_ATTENTE_PRELEVEMENT' | 'ANNULEE'
export type ApiPathologyPriority = 'NORMALE' | 'URGENT'

export interface ApiPathologyRequest {
  id: string
  requestedAt: string
  resultAt: string | null
  sampleType: string
  location: string | null
  service: string | null
  status: ApiPathologyStatus
  priority: ApiPathologyPriority
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

export interface CreatePathologyRequestInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: 'M' | 'F'
  requestedAt?: string
  sampleType: string
  location?: string
  service?: string
  doctorId?: string
  priority?: ApiPathologyPriority
  status?: ApiPathologyStatus
  expectedDurationMin?: number
}

export interface UpdatePathologyRequestInput {
  patientId?: string | null
  doctorId?: string | null
  requestedAt?: string
  resultAt?: string | null
  sampleType?: string
  location?: string | null
  service?: string | null
  priority?: ApiPathologyPriority
  status?: ApiPathologyStatus
  expectedDurationMin?: number | null
  /** Posé en interne par pathology.service.ts (main) en mode hors-ligne, jamais fourni par le
   * renderer — voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3. */
  expectedUpdatedAt?: string
}
