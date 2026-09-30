// Types partagés entre main, preload et renderer pour le domaine Pharmacie.

export type ApiStockState = 'RUPTURE' | 'STOCK_FAIBLE' | 'DISPONIBLE'

export interface ApiMedication {
  id: string
  name: string
  category: string
  location: string
  available: number
  minThreshold: number
  state: ApiStockState
  nearestExpiry: string | null
  updatedAt: string
}

export interface CreateMedicationInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  name: string
  category: string
  location: string
  available: number
  minThreshold: number
  nearestExpiry?: string
}

export interface UpdateMedicationInput {
  name?: string
  category?: string
  location?: string
  available?: number
  minThreshold?: number
  nearestExpiry?: string | null
  /** Posé en interne par pharmacy.service.ts (main) en mode hors-ligne, jamais fourni par le
   * renderer — voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3. */
  expectedUpdatedAt?: string
}
