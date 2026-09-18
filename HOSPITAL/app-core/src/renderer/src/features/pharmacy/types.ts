// Modèle "Pharmacie" pour cette itération front-end (v1, données locales — voir la note
// équivalente dans features/patients/types.ts).

export type StockState = 'Rupture' | 'Stock faible' | 'Disponible'

export interface MedicationStock {
  id: string
  name: string
  category: string
  available: number
  minThreshold: number
  state: StockState
  nearestExpiry: string | null
  location: string
}
