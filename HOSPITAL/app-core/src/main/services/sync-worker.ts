import { getConnectivityStatus, onConnectivityChange } from './connectivity.service'
import { listPending, markFailed, markSending, markSent } from './sync-outbox.service'
import type { SyncConflictNotification, SyncOperation } from '../../shared/sync-types'

// Mode hors-ligne — Phase 0/1 (voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.1). Vide l'outbox
// vers app-server dès que la connexion est disponible, en délèguant à un « dispatcher » par
// domaine métier plutôt qu'en connaissant elle-même les 28 domaines. Depuis la Phase 1,
// `patients.service.ts` enregistre `registerSyncDispatcher('patient', ...)` à l'import (voir
// son import dans main/index.ts) ; les autres domaines restent sans dispatcher pour l'instant.

export interface DispatchResult {
  ok: boolean
  error?: string
  /** Si true, l'entrée reste PENDING pour un nouvel essai (erreur réseau). Si false, elle passe
   * en FAILED et attend une action humaine (erreur métier/conflit, voir §6.3 du plan). */
  retryable?: boolean
  /** Si true, l'échec vient d'un vrai conflit (409 — voir conflict-error.ts côté serveur) : la
   * fiche a été modifiée entre-temps par quelqu'un d'autre. Déclenche une notification active
   * plutôt qu'un simple statut FAILED silencieux dans la file. */
  conflict?: boolean
}

export type SyncDispatcher = (operation: SyncOperation, payload: unknown) => Promise<DispatchResult>

const dispatchers = new Map<string, SyncDispatcher>()

export function registerSyncDispatcher(entityType: string, dispatcher: SyncDispatcher): void {
  dispatchers.set(entityType, dispatcher)
}

const conflictListeners = new Set<(notification: SyncConflictNotification) => void>()

/** Abonnement à la notification active de conflit (voir §6.3 du plan hors-ligne), poussée ensuite
 * au renderer via IPC — mirroring `onConnectivityChange`. */
export function onSyncConflict(listener: (notification: SyncConflictNotification) => void): () => void {
  conflictListeners.add(listener)
  return () => conflictListeners.delete(listener)
}

function notifySyncConflict(notification: SyncConflictNotification): void {
  for (const listener of conflictListeners) listener(notification)
}

let processing = false

export async function processOutbox(): Promise<void> {
  if (processing) return
  if (getConnectivityStatus() !== 'ONLINE') return
  processing = true
  try {
    const pending = await listPending()
    for (const entry of pending) {
      if (getConnectivityStatus() !== 'ONLINE') break
      const dispatcher = dispatchers.get(entry.entityType)
      if (!dispatcher) continue

      await markSending(entry.id)
      try {
        const result = await dispatcher(entry.operation, entry.payload)
        if (result.ok) {
          await markSent(entry.id)
        } else {
          const message = result.error ?? 'Erreur inconnue.'
          await markFailed(entry.id, message, result.retryable ?? false, result.conflict ?? false)
          if (result.conflict) {
            notifySyncConflict({ entityType: entry.entityType, entityId: entry.entityId, message })
          }
        }
      } catch (error) {
        // Un dispatcher qui lève ne doit jamais interrompre le traitement des entrées suivantes.
        await markFailed(entry.id, error instanceof Error ? error.message : String(error), true)
      }
    }
  } finally {
    processing = false
  }
}

const SYNC_POLL_INTERVAL_MS = 30_000
let pollHandle: ReturnType<typeof setInterval> | null = null

/** À appeler une seule fois au démarrage de l'app (après app.whenReady()). */
export function startSyncWorker(): void {
  onConnectivityChange((status) => {
    if (status === 'ONLINE') void processOutbox()
  })
  if (!pollHandle) {
    pollHandle = setInterval(() => void processOutbox(), SYNC_POLL_INTERVAL_MS)
  }
}
