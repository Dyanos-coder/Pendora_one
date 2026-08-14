import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@shared/auth-types'

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

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null)
    const result = await window.api.auth.login(email, password)
    if (result.ok) {
      setSession(result.session)
      return true
    }
    setError(result.error)
    return false
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    await window.api.auth.logout()
    setSession(null)
  }, [])

  return { session, loading, error, login, logout }
}
