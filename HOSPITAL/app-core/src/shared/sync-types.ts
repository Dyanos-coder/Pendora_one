// Types partagés entre main, preload et renderer pour le mode hors-ligne (voir
// Plan-Mode-Hors-Ligne-Synchronisation.md).

export type ConnectivityStatus = 'ONLINE' | 'OFFLINE'

export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE'
export type SyncStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED'

export interface SyncOutboxEntry {
  id: string
  entityType: string
  entityId: string
  operation: SyncOperation
  status: SyncStatus
  retryCount: number
  lastError: string | null
  /** true si l'échec vient d'un vrai conflit (409, quelqu'un d'autre a modifié la fiche
   * entre-temps) plutôt que d'une coupure réseau ou d'une erreur de validation. */
  conflict: boolean
  createdAt: string
}

/** Poussé du process main vers le renderer dès qu'un conflit est détecté à la synchro (voir
 * sync-worker.ts) — alimente une notification active, pas seulement le badge de la file. */
export interface SyncConflictNotification {
  entityType: string
  entityId: string
  message: string
}
