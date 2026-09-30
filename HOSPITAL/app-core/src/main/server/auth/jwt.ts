import jwt from 'jsonwebtoken'
import type { AuthTokenPayload } from '../types'

const EXPIRES_IN = '30d' // cohérent avec la durée du cache de session côté app-core

// Secret propre à ce poste (généré au premier lancement, voir db-config.service.ts) : les jetons
// ne circulent qu'entre l'interface et le backend embarqué du même poste.
let secret: string | null = null

export function setJwtSecret(value: string): void {
  secret = value
}

function getSecret(): string {
  if (!secret) {
    throw new Error('Secret JWT non initialisé.')
  }
  return secret
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: EXPIRES_IN })
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getSecret()) as AuthTokenPayload
}
