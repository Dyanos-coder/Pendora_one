import { useEffect, useRef, useState } from 'react'
import { Wifi, WifiOff, Loader2, RefreshCw } from 'lucide-react'
import type { ConnectivityStatus, SyncOutboxEntry } from '@shared/sync-types'

const OPERATION_LABEL: Record<SyncOutboxEntry['operation'], string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression'
}

const STATUS_LABEL: Record<SyncOutboxEntry['status'], string> = {
  PENDING: 'En attente',
  SENDING: 'Envoi en cours',
  SENT: 'Envoyée',
  FAILED: 'Échec'
}

const STATUS_COLOR: Record<SyncOutboxEntry['status'], string> = {
  PENDING: 'text-amber-600',
  SENDING: 'text-blue-600',
  SENT: 'text-emerald-600',
  FAILED: 'text-red-600'
}

// Mode hors-ligne — Phase 0 (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Aucun domaine métier
// n'écrit encore dans la file d'attente à ce stade (Phase 1) : cet indicateur affiche donc
// « à jour » tant qu'aucune action locale n'attend d'être synchronisée, ce qui est le cas normal
// pour l'instant.
export function ConnectivityIndicator(): JSX.Element {
  const [status, setStatus] = useState<ConnectivityStatus | null>(null)
  const [outbox, setOutbox] = useState<SyncOutboxEntry[]>([])
  const [open, setOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    window.api.connectivity.status().then((s) => {
      if (!cancelled) setStatus(s)
    })
    const unsubscribe = window.api.connectivity.onChange((s) => {
      setStatus(s)
      void refreshOutbox()
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function refreshOutbox(): Promise<void> {
    const entries = await window.api.sync.listOutbox()
    setOutbox(entries)
  }

  async function handleToggle(): Promise<void> {
    const next = !open
    setOpen(next)
    if (next) await refreshOutbox()
  }

  async function handleSyncNow(): Promise<void> {
    setSyncing(true)
    await window.api.connectivity.checkNow()
    await window.api.sync.processNow()
    await refreshOutbox()
    setSyncing(false)
  }

  const pendingCount = outbox.filter((e) => e.status === 'PENDING' || e.status === 'SENDING').length

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleToggle}
        title={status === 'OFFLINE' ? 'Hors ligne' : 'En ligne'}
        className="relative flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
      >
        {status === null ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : status === 'ONLINE' ? (
          <Wifi className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-red-500" />
        )}
        <span className="hidden sm:inline">{status === 'OFFLINE' ? 'Hors ligne' : 'En ligne'}</span>
        {pendingCount > 0 && (
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-gray-100 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-900">File de synchronisation</h4>
            <button
              onClick={handleSyncNow}
              disabled={syncing || status === 'OFFLINE'}
              title="Synchroniser maintenant"
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {outbox.length === 0 ? (
            <p className="py-3 text-center text-xs text-gray-400">
              Aucune action en attente — tout est à jour.
            </p>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto text-xs">
              {outbox.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-2.5 py-1.5">
                  <div>
                    <p className="font-medium text-gray-800">
                      {entry.entityType} — {OPERATION_LABEL[entry.operation]}
                    </p>
                    {entry.lastError && <p className="text-[11px] text-red-500">{entry.lastError}</p>}
                  </div>
                  <span className={`text-[11px] font-medium ${entry.conflict ? 'text-red-600' : STATUS_COLOR[entry.status]}`}>
                    {entry.conflict ? 'Conflit' : STATUS_LABEL[entry.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
