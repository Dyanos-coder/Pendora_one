import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../auth/jwt'
import { getPrismaClient } from '../db/client'
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
 *
 * Revérifie aussi en base à chaque requête que le compte existe toujours et n'est pas suspendu
 * (isActive) — un JWT étant valable 30 jours, c'est le seul moyen de faire prendre effet une
 * suspension immédiatement plutôt qu'à la prochaine connexion.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined

  if (!token) {
    res.status(401).json({ ok: false, error: 'Authentification requise.' })
    return
  }

  let payload: AuthTokenPayload
  try {
    payload = verifyToken(token)
  } catch {
    res.status(401).json({ ok: false, error: 'Jeton invalide ou expiré.' })
    return
  }

  const prisma = getPrismaClient()
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true, isActive: true }
  })

  if (!user) {
    res.status(401).json({ ok: false, error: 'Compte introuvable.' })
    return
  }

  if (!user.isActive) {
    res.status(403).json({ ok: false, error: 'Ce compte a été suspendu.' })
    return
  }

  req.auth = { userId: payload.userId, role: user.role }
  next()
}

export function requireDirigeant(req: Request, res: Response, next: NextFunction): void {
  if (req.auth?.role !== 'DIRIGEANT') {
    res.status(403).json({ ok: false, error: 'Réservé au dirigeant.' })
    return
  }
  next()
}
