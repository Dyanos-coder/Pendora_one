// Mode hors-ligne — Phase 0 (voir Plan-Mode-Hors-Ligne-Synchronisation.md §3.3). Réutilise
// l'endpoint GET /health déjà exposé par app-server (jusqu'ici jamais appelé par app-core) comme
// sonde de connectivité : un ping périodique fait foi, plutôt que le seul événement online/offline
// du renderer (qui ne détecte que l'état de la carte réseau, pas la joignabilité réelle du serveur).

import { getApiUrl } from './remote-api.client'

const PING_INTERVAL_MS = 20_000
const PING_TIMEOUT_MS = 5_000

export type ConnectivityStatus = 'ONLINE' | 'OFFLINE'

let currentStatus: ConnectivityStatus = 'OFFLINE'
let intervalHandle: ReturnType<typeof setInterval> | null = null
const listeners = new Set<(status: ConnectivityStatus) => void>()

export function getConnectivityStatus(): ConnectivityStatus {
  return currentStatus
}

export function onConnectivityChange(listener: (status: ConnectivityStatus) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

async function pingHealth(): Promise<ConnectivityStatus> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)
  try {
    const response = await fetch(`${getApiUrl()}/health`, { signal: controller.signal })
    return response.ok ? 'ONLINE' : 'OFFLINE'
  } catch {
    return 'OFFLINE'
  } finally {
    clearTimeout(timeout)
  }
}

export async function checkConnectivityNow(): Promise<ConnectivityStatus> {
  const status = await pingHealth()
  if (status !== currentStatus) {
    currentStatus = status
    for (const listener of listeners) listener(status)
  }
  return currentStatus
}

/** À appeler une seule fois au démarrage de l'app (après app.whenReady()). */
export function startConnectivityMonitor(): void {
  if (intervalHandle) return
  void checkConnectivityNow()
  intervalHandle = setInterval(() => {
    void checkConnectivityNow()
  }, PING_INTERVAL_MS)
}

export function stopConnectivityMonitor(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}
