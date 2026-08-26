import type { Session } from '../../shared/auth-types'

// URL du backend distant (HOSPITAL/app-server). En dev, pointe sur le serveur lancé en local
// (npm run dev dans HOSPITAL/app-server, sur un port distinct de app-server — voir .env.example)
// ; en prod, sur l'URL réelle une fois déployé.
const API_URL = process.env['PANDORA_HEALTH_API_URL'] ?? 'http://localhost:3001'

// Forme brute renvoyée par /auth/login (avec le jeton) — usage interne à ce module et à
// auth.service.ts uniquement. Le renderer ne voit jamais le jeton (voir session.store.ts).
export type RemoteLoginResponse =
  | { ok: true; session: Session; token: string }
  | { ok: false; error: string }

export async function remoteLogin(email: string, password: string): Promise<RemoteLoginResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    return (await response.json()) as RemoteLoginResponse
  } catch {
    return { ok: false, error: 'Impossible de contacter le serveur. Vérifiez votre connexion.' }
  }
}
