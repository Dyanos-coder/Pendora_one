import { logAudit } from './audit.service'
import { remoteLogin } from './remote-api.client'
import { setCurrentSession } from './session.store'
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

  await logAudit({
    userId: result.session.user.id,
    action: 'auth.login',
    entityType: 'User',
    entityId: result.session.user.id
  })

  return { ok: true, session: result.session }
}
