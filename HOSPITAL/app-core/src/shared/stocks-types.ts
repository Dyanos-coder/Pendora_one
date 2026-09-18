// Types partagés entre main, preload et renderer pour le domaine Stocks & Dépôts.

export type ApiItemState = 'RUPTURE' | 'STOCK_FAIBLE' | 'DISPONIBLE'

export interface ApiDepot {
  id: string
  name: string
  refs: number
  totalUnits: number
}

export interface ApiDepotItem {
  id: string
  name: string
  category: string
  depotId: string
  depot: string
  available: number
  minThreshold: number
  state: ApiItemState
  lastMovementAt: string | null
}

export interface CreateDepotItemInput {
  name: string
  category: string
  depotId: string
  available: number
  minThreshold: number
}

export interface UpdateDepotItemInput {
  name?: string
  category?: string
  depotId?: string
  available?: number
  minThreshold?: number
}
