import jwt from 'jsonwebtoken'
import type { AuthTokenPayload } from '../types'

const EXPIRES_IN = '30d' // cohérent avec la durée du cache de session côté app-core

function getSecret(): string {
  const secret = process.env['JWT_SECRET']
  if (!secret) {
    throw new Error('JWT_SECRET manquant (voir .env.example)')
  }
  return secret
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: EXPIRES_IN })
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getSecret()) as AuthTokenPayload
}
