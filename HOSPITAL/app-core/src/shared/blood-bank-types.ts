// Types partagés entre main, preload et renderer pour le domaine Banque de sang.

export type ApiBloodPouchStatus = 'DISPONIBLE' | 'EN_ATTENTE_ANALYSE' | 'RESERVEE' | 'TRANSFUSEE' | 'PERIMEE' | 'ECARTEE'

export interface ApiBloodPouch {
  id: string
  pouchNumber: string
  bloodGroup: string
  component: string
  volumeMl: number | null
  status: ApiBloodPouchStatus
  collectionDate: string
  expiryDate: string
  donorName: string
  patientId: string | null
  updatedAt: string
}

export interface CreateBloodPouchInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  bloodGroup: string
  component: string
  volumeMl?: number
  collectionDate: string
  expiryDate: string
  donorName: string
  patientId?: string
}

export interface UpdateBloodPouchInput {
  bloodGroup?: string
  component?: string
  volumeMl?: number | null
  status?: ApiBloodPouchStatus
  collectionDate?: string
  expiryDate?: string
  donorName?: string
  patientId?: string | null
  /** Posé en interne par blood-bank.service.ts (main) en mode hors-ligne, jamais fourni par le
   * renderer — voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3. */
  expectedUpdatedAt?: string
}

// --- Dons (item 15) --------------------------------------------------------------------------------

export type ApiDonationStatus = 'PLANIFIE' | 'COLLECTE' | 'AJOURNE'

export interface ApiDonation {
  id: string
  reference: string
  patientId: string | null
  donorName: string
  donorPhone: string | null
  bloodGroup: string
  donationDate: string
  volumeMl: number | null
  status: ApiDonationStatus
  pouchId: string | null
  pouchNumber: string | null
  note: string | null
  updatedAt: string
}

export interface CreateDonationInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  /** Donneur = patient existant (item 13 PETITES MODIFS) — sinon donneur externe via `donorName`. */
  patientId?: string
  donorName: string
  donorPhone?: string
  bloodGroup: string
  donationDate?: string
  volumeMl?: number
  status?: ApiDonationStatus
  pouchId?: string
  note?: string
}

export interface UpdateDonationInput {
  patientId?: string | null
  donorName?: string
  donorPhone?: string | null
  bloodGroup?: string
  donationDate?: string
  volumeMl?: number | null
  status?: ApiDonationStatus
  pouchId?: string | null
  note?: string | null
  /** Posé en interne par blood-bank.service.ts (main) en mode hors-ligne — voir §6.3. */
  expectedUpdatedAt?: string
}

// --- Demandes transfusionnelles (item 15) ----------------------------------------------------------

export type ApiTransfusionRequestUrgency = 'NORMALE' | 'URGENTE'
export type ApiTransfusionRequestStatus = 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE' | 'HONOREE'

export interface ApiTransfusionRequest {
  id: string
  reference: string
  patientId: string
  patientName: string
  bloodGroup: string
  component: string
  quantityUnits: number
  urgency: ApiTransfusionRequestUrgency
  status: ApiTransfusionRequestStatus
  requestedBy: string
  requestedAt: string
  note: string | null
}

export interface CreateTransfusionRequestInput {
  patientId: string
  bloodGroup: string
  component: string
  quantityUnits: number
  urgency?: ApiTransfusionRequestUrgency
  status?: ApiTransfusionRequestStatus
  requestedBy: string
  requestedAt?: string
  note?: string
}

export interface UpdateTransfusionRequestInput {
  bloodGroup?: string
  component?: string
  quantityUnits?: number
  urgency?: ApiTransfusionRequestUrgency
  status?: ApiTransfusionRequestStatus
  requestedBy?: string
  requestedAt?: string
  note?: string | null
}

// --- Transfusions (item 15) -------------------------------------------------------------------------
// Réalisée avec une poche disponible/réservée : la création marque automatiquement la poche
// « Transfusée » et, si liée à une demande, passe celle-ci au statut « Honorée » (côté serveur).

export interface ApiTransfusion {
  id: string
  reference: string
  patientId: string
  patientName: string
  pouchId: string
  pouchNumber: string
  requestId: string | null
  requestReference: string | null
  transfusedAt: string
  administeredBy: string
  reaction: string | null
}

export interface CreateTransfusionInput {
  patientId: string
  pouchId: string
  requestId?: string
  transfusedAt?: string
  administeredBy: string
  reaction?: string
}

export interface UpdateTransfusionInput {
  transfusedAt?: string
  administeredBy?: string
  reaction?: string | null
}

// --- Analyses (item 15) --------------------------------------------------------------------------
// Un résultat POSITIF écarte la poche liée, un résultat NEGATIF sur une poche en attente la rend
// disponible (effet de bord côté serveur).

export type ApiBloodAnalysisResult = 'EN_ATTENTE' | 'NEGATIF' | 'POSITIF'

export interface ApiBloodAnalysis {
  id: string
  reference: string
  pouchId: string
  pouchNumber: string
  testType: string
  result: ApiBloodAnalysisResult
  performedBy: string
  performedAt: string
  note: string | null
}

export interface CreateBloodAnalysisInput {
  pouchId: string
  testType: string
  result?: ApiBloodAnalysisResult
  performedBy: string
  performedAt?: string
  note?: string
}

export interface UpdateBloodAnalysisInput {
  testType?: string
  result?: ApiBloodAnalysisResult
  performedBy?: string
  performedAt?: string
  note?: string | null
}
