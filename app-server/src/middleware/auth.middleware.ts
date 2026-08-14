import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../auth/jwt'
import type { AuthTokenPayload } from '../types'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload
    }
  }
}

/**
 * Vérifie le Bearer token et attache req.auth (userId, role) — utilisé par les routes qui ont
 * besoin de savoir qui fait la requête (ex: auteur d'une action pour l'audit log).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined

  if (!token) {
    res.status(401).json({ ok: false, error: 'Authentification requise.' })
    return
  }

  try {
    req.auth = verifyToken(token)
    next()
  } catch {
    res.status(401).json({ ok: false, error: 'Jeton invalide ou expiré.' })
  }
}
