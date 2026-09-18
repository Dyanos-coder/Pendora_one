import { logAudit } from './audit.service'
import { remoteLogin, remoteLogout } from './remote-api.client'
import { clearCurrentSession, getCurrentToken, setCurrentSession } from './session.store'
import type { LoginResult } from '../../shared/auth-types'

// La vérification des identifiants a lieu côté backend distant (app-server + MySQL, source de
// vérité). Le jeton renvoyé est stocké ici (session.store.ts) — jamais transmis au renderer,
// voir remote-api.client.ts.
export async function login(email: string, password: string): Promise<LoginResult> {
  const result = await remoteLogin(email, password)

  if (!result.ok) {
    return result
  }

  setCurrentSession(result.session, result.token)

  // L'audit local est un effet de bord append-only : son échec (DB locale absente/non
  // migrée, disque plein, etc.) ne doit jamais faire échouer ni bloquer la connexion.
  try {
    await logAudit({
      userId: result.session.user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: result.session.user.id
    })
  } catch (error) {
    console.error("Échec de l'écriture du journal d'audit local (connexion non affectée) :", error)
  }

  return { ok: true, session: result.session }
}

/** Révoque le jeton côté serveur (best-effort, voir remoteLogout) puis efface la session locale
 * — dans cet ordre, pour que l'appel réseau dispose encore du jeton à révoquer. */
export async function logout(): Promise<void> {
  const token = getCurrentToken()
  if (token) {
    await remoteLogout(token)
  }
  clearCurrentSession()
}
