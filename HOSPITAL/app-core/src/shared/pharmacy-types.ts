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
}

export interface CreateMedicationInput {
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
}
