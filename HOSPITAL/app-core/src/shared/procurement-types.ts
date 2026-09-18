// Types partagés entre main, preload et renderer pour le domaine Approvisionnement.

export type ApiProcurementPriority = 'NORMALE' | 'URGENTE'
export type ApiProcurementStatus = 'A_VALIDER' | 'VALIDE' | 'COMMANDE' | 'RECU' | 'RETARD'

export interface ApiProcurementRequest {
  id: string
  reference: string
  requestedAt: string
  article: string
  category: string
  quantity: number
  priority: ApiProcurementPriority
  status: ApiProcurementStatus
  requester: string
}

export interface CreateProcurementRequestInput {
  article: string
  category: string
  quantity: number
  priority?: ApiProcurementPriority
  requester: string
}

export interface UpdateProcurementRequestInput {
  article?: string
  category?: string
  quantity?: number
  priority?: ApiProcurementPriority
  status?: ApiProcurementStatus
  requester?: string
}

export interface ApiSupplier {
  id: string
  name: string
  orders: number
  onTimePercent: number
  quality: number
  rating: number
}
