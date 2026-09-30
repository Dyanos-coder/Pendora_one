import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@shared/auth-types'

// Pointeuse automatique à la connexion (item 14 PETITES MODIFS) — best-effort : ne bloque jamais
// la connexion et n'affiche aucune erreur. La position est prise côté processus principal par le
// service de localisation de Windows (hr.service.ts / location.service.ts) ; sans position, seule
// l'heure est enregistrée (hr-attendance.service.ts ignore les comptes sans fiche employé).
function checkInAttendance(): Promise<void> {
  return window.api.hr.attendance
    .checkIn({})
    .then(() => undefined)
    .catch(() => undefined)
}

interface UseAuthResult {
  session: Session | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

export function useAuth(): UseAuthResult {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.auth
      .getSession()
      .then(setSession)
      .finally(() => setLoading(false))
  }, [])

  // Jeton refusé par le backend (expiré, révoqué…) : retour à l'écran de connexion.
  useEffect(() => {
    return window.api.auth.onSessionExpired(() => {
      setSession(null)
      setError('Votre session a expiré, veuillez vous reconnecter.')
    })
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null)
    try {
      const result = await window.api.auth.login(email, password)
      if (result.ok) {
        setSession(result.session)
        void checkInAttendance()
        return true
      }
      setError(result.error)
      return false
    } catch {
      setError('Une erreur inattendue est survenue. Réessayez.')
      return false
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    await window.api.auth.logout()
    setSession(null)
  }, [])

  return { session, loading, error, login, logout }
}
