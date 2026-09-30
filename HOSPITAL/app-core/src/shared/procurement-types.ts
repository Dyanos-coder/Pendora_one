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
  updatedAt: string
}

export interface CreateProcurementRequestInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
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
  /** Posé en interne par procurement.service.ts (main) en mode hors-ligne, jamais fourni par le
   * renderer — voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3. */
  expectedUpdatedAt?: string
}

export interface ApiSupplier {
  id: string
  name: string
  orders: number
  onTimePercent: number
  quality: number
  rating: number
}

// --- Commandes (item 13) -------------------------------------------------------------------------

export type ApiPurchaseOrderStatus = 'EN_PREPARATION' | 'ENVOYEE' | 'CONFIRMEE' | 'LIVREE' | 'ANNULEE'

export interface ApiPurchaseOrder {
  id: string
  reference: string
  requestId: string | null
  requestReference: string | null
  supplierId: string | null
  supplierName: string | null
  article: string
  quantity: number
  unitPrice: number | null
  totalAmount: number | null
  orderedAt: string
  expectedDeliveryAt: string | null
  status: ApiPurchaseOrderStatus
  updatedAt: string
}

export interface CreatePurchaseOrderInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  requestId?: string
  supplierId?: string
  article: string
  quantity: number
  unitPrice?: number
  orderedAt?: string
  expectedDeliveryAt?: string
  status?: ApiPurchaseOrderStatus
}

export interface UpdatePurchaseOrderInput {
  supplierId?: string | null
  article?: string
  quantity?: number
  unitPrice?: number | null
  orderedAt?: string
  expectedDeliveryAt?: string | null
  status?: ApiPurchaseOrderStatus
  /** Posé en interne par procurement.service.ts (main) en mode hors-ligne — voir §6.3. */
  expectedUpdatedAt?: string
}

// --- Réceptions (item 13) ------------------------------------------------------------------------

export type ApiReceptionCondition = 'CONFORME' | 'PARTIELLE' | 'ENDOMMAGEE'

export interface ApiGoodsReception {
  id: string
  orderId: string
  orderReference: string
  article: string
  receivedAt: string
  receivedQty: number
  orderedQty: number
  condition: ApiReceptionCondition
  receivedBy: string
  note: string | null
  updatedAt: string
}

export interface CreateGoodsReceptionInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  orderId: string
  receivedAt?: string
  receivedQty: number
  condition?: ApiReceptionCondition
  receivedBy: string
  note?: string
}

export interface UpdateGoodsReceptionInput {
  receivedAt?: string
  receivedQty?: number
  condition?: ApiReceptionCondition
  receivedBy?: string
  note?: string | null
  /** Posé en interne par procurement.service.ts (main) en mode hors-ligne — voir §6.3. */
  expectedUpdatedAt?: string
}
