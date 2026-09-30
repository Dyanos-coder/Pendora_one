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
  updatedAt: string
}

export interface CreateDepotItemInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
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
  /** Posé en interne par stocks.service.ts (main) en mode hors-ligne, jamais fourni par le
   * renderer — voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3. */
  expectedUpdatedAt?: string
}

// --- Mouvements (item 16) ---------------------------------------------------------------------------
// Chaque mouvement met à jour `DepotItem.available` côté serveur (+ entrée, - sortie) : itemId/type/
// quantity ne sont donc pas modifiables après coup, seuls les champs descriptifs le sont.

export type ApiStockMovementType = 'ENTREE' | 'SORTIE'

export interface ApiStockMovement {
  id: string
  reference: string
  itemId: string
  itemName: string
  type: ApiStockMovementType
  quantity: number
  movementDate: string
  reason: string | null
  performedBy: string
  note: string | null
  updatedAt: string
}

export interface CreateStockMovementInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  itemId: string
  type: ApiStockMovementType
  quantity: number
  movementDate?: string
  reason?: string
  performedBy: string
  note?: string
}

export interface UpdateStockMovementInput {
  movementDate?: string
  reason?: string | null
  performedBy?: string
  note?: string | null
  /** Posé en interne par stocks.service.ts (main) en mode hors-ligne — voir §6.3. */
  expectedUpdatedAt?: string
}

// --- Transferts (item 16) ---------------------------------------------------------------------------
// Débite l'article source et crédite (ou crée) l'article de même nom dans le dépôt de destination.

export interface ApiStockTransfer {
  id: string
  reference: string
  fromItemId: string
  fromItemName: string
  toDepotId: string
  toDepotName: string
  quantity: number
  transferDate: string
  performedBy: string
  note: string | null
  updatedAt: string
}

export interface CreateStockTransferInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  fromItemId: string
  toDepotId: string
  quantity: number
  transferDate?: string
  performedBy: string
  note?: string
}

export interface UpdateStockTransferInput {
  transferDate?: string
  performedBy?: string
  note?: string | null
  /** Posé en interne par stocks.service.ts (main) en mode hors-ligne — voir §6.3. */
  expectedUpdatedAt?: string
}

// --- Inventaires (item 16) --------------------------------------------------------------------------
// `discrepancy` est calculé côté serveur (countedQuantity - expectedQuantity), jamais stocké ; en
// cas d'écart, `DepotItem.available` est corrigé sur la quantité comptée.

export interface ApiInventoryCount {
  id: string
  reference: string
  itemId: string
  itemName: string
  expectedQuantity: number
  countedQuantity: number
  discrepancy: number
  conductedBy: string
  conductedAt: string
  note: string | null
  updatedAt: string
}

export interface CreateInventoryCountInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  itemId: string
  countedQuantity: number
  conductedBy: string
  conductedAt?: string
  note?: string
}

export interface UpdateInventoryCountInput {
  conductedBy?: string
  conductedAt?: string
  note?: string | null
  /** Posé en interne par stocks.service.ts (main) en mode hors-ligne — voir §6.3. */
  expectedUpdatedAt?: string
}

// --- Pertes / Retour (item 16) -----------------------------------------------------------------------

export type ApiStockLossType = 'PERTE' | 'RETOUR'

export interface ApiStockLoss {
  id: string
  reference: string
  itemId: string
  itemName: string
  type: ApiStockLossType
  quantity: number
  reason: string
  occurredAt: string
  reportedBy: string
  note: string | null
  updatedAt: string
}

export interface CreateStockLossInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  itemId: string
  type: ApiStockLossType
  quantity: number
  reason: string
  occurredAt?: string
  reportedBy: string
  note?: string
}

export interface UpdateStockLossInput {
  reason?: string
  occurredAt?: string
  reportedBy?: string
  note?: string | null
  /** Posé en interne par stocks.service.ts (main) en mode hors-ligne — voir §6.3. */
  expectedUpdatedAt?: string
}

// --- Analyse (item 16, lecture seule) -----------------------------------------------------------------

export interface ApiStockAnalysis {
  totalEntries: number
  totalExits: number
  totalLosses: number
  totalReturns: number
  itemsBelowThreshold: number
  topMovedItems: { itemId: string; itemName: string; totalQuantity: number }[]
}
