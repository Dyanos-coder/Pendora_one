import type { Session } from '../../shared/auth-types'
import { clearSessionCache, loadSessionCache, saveSessionCache } from '../security/session-cache'

// Session + jeton d'API en mémoire du process main, doublés d'un cache chiffré sur disque (voir
// security/session-cache.ts) pour survivre au redémarrage de l'app et permettre la
// reconnexion automatique hors-ligne (§6, §4.2 étapes 5-6). Le jeton n'est jamais exposé au
// renderer — seul le process main l'utilise pour appeler le backend distant (finance, etc.).
let currentSession: Session | null = null
let currentToken: string | null = null

export function setCurrentSession(session: Session, token: string): void {
  currentSession = session
  currentToken = token
  saveSessionCache({ session, token })
}

export function getCurrentSession(): Session | null {
  return currentSession
}

export function getCurrentToken(): string | null {
  return currentToken
}

/** À appeler quand `currentSession` est vide (ex. juste après le démarrage de l'app). */
export function restoreSessionFromCache(): Session | null {
  if (currentSession) {
    return currentSession
  }
  const cached = loadSessionCache()
  if (cached) {
    currentSession = cached.session
    currentToken = cached.token
  }
  return currentSession
}

export function clearCurrentSession(): void {
  currentSession = null
  currentToken = null
  clearSessionCache()
}
