import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

// Disposition personnalisable des pages (item 15 PETITES MODIFS) — mode édition global activé
// depuis l'en-tête (AppShell), ordre des blocs mémorisé par utilisateur sur ce poste.

const STORAGE_PREFIX = 'pandora.layout.'

interface LayoutContextValue {
  editing: boolean
  setEditing: (editing: boolean) => void
  storageKey: (groupId: string) => string
  /** Incrémenté à chaque réinitialisation pour que les groupes relisent l'ordre par défaut. */
  version: number
  resetAll: () => void
}

const LayoutContext = createContext<LayoutContextValue>({
  editing: false,
  setEditing: () => undefined,
  storageKey: (groupId) => `${STORAGE_PREFIX}anonymous.${groupId}`,
  version: 0,
  resetAll: () => undefined
})

export function LayoutProvider({ userId, children }: { userId: string; children: ReactNode }): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [version, setVersion] = useState(0)

  const storageKey = useCallback((groupId: string) => `${STORAGE_PREFIX}${userId}.${groupId}`, [userId])

  const resetAll = useCallback(() => {
    try {
      const prefix = `${STORAGE_PREFIX}${userId}.`
      Object.keys(localStorage)
        .filter((key) => key.startsWith(prefix))
        .forEach((key) => localStorage.removeItem(key))
    } catch {
      // Stockage indisponible : rien à effacer, la disposition par défaut s'applique déjà.
    }
    setVersion((v) => v + 1)
  }, [userId])

  const value = useMemo(
    () => ({ editing, setEditing, storageKey, version, resetAll }),
    [editing, storageKey, version, resetAll]
  )
  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout(): LayoutContextValue {
  return useContext(LayoutContext)
}

export function readStoredOrder(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : []
  } catch {
    return []
  }
}

export function writeStoredOrder(key: string, order: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(order))
  } catch {
    // Stockage indisponible : l'ordre reste valable pour la session en cours seulement.
  }
}
