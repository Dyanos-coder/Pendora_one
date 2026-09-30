import { useEffect, useState } from 'react'
import type { UpdateInfo } from '@shared/update-types'

/** État de la mise à jour automatique, tenu à jour en direct (événement `updater:status`). */
export function useUpdateInfo(): UpdateInfo | null {
  const [info, setInfo] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.updater.getInfo().then((initial) => {
      if (!cancelled) setInfo(initial)
    })
    const unsubscribe = window.api.updater.onStatus((status) => {
      setInfo((prev) => (prev ? { ...prev, status } : prev))
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return info
}
