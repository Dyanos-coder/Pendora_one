// Modèle "Stocks & Dépôts" (stocks généraux, non pharmaceutiques / non sanguins) pour cette
// itération front-end (v1, données locales — voir la note équivalente dans
// features/patients/types.ts).

export type ItemState = 'Disponible' | 'Stock faible' | 'Rupture'

export interface DepotItem {
  id: string
  name: string
  category: string
  depotId: string
  depot: string
  available: number
  minThreshold: number
  state: ItemState
  lastMovement: string
}

export interface Depot {
  id: string
  name: string
  refs: number
  totalUnits: number
  availability: number
}
