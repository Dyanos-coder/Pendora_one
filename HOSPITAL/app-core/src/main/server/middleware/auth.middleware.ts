import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../auth/jwt'
import { getPrismaClient } from '../db/client'
import type { AuthTokenPayload } from '../types'
import { DOMAIN_PERMISSIONS, hasAccess, type AccessLevel, type Domain } from '../config/permissions'

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
    select: { role: true, isActive: true, sessionVersion: true }
  })

  if (!user) {
    res.status(401).json({ ok: false, error: 'Compte introuvable.' })
    return
  }

  if (!user.isActive) {
    res.status(403).json({ ok: false, error: 'Ce compte a été suspendu.' })
    return
  }

  if (user.sessionVersion !== payload.sessionVersion) {
    res.status(401).json({ ok: false, error: 'Session expirée, veuillez vous reconnecter.' })
    return
  }

  req.auth = { userId: payload.userId, role: user.role, sessionVersion: user.sessionVersion }
  next()
}

/**
 * RBAC par domaine — voir HOSPITAL/Audit-Fonctionnalites-Manquantes.md §2 pour la matrice de
 * référence. À poser après `requireAuth` (qui remplit req.auth). Utilisation typique : un
 * `router.use(requireAccess('patients', 'read'))` en tête de fichier de routes pour bloquer les
 * rôles sans aucun accès au domaine, puis `requireAccess('patients', 'write')` en plus sur les
 * routes POST/PATCH qui doivent être plus restrictives que le minimum du router.
 */
export function requireAccess(domain: Domain, minLevel: AccessLevel) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.auth?.role
    const granted = role ? DOMAIN_PERMISSIONS[domain][role] : 'none'
    if (!hasAccess(granted, minLevel)) {
      res.status(403).json({ ok: false, error: 'Accès non autorisé pour votre rôle.' })
      return
    }
    next()
  }
}

/** Variante « l'un OU l'autre » : ex. les journaux de caisse, lus depuis la Caisse (cashier) comme
 * depuis la Comptabilité (finance). */
export function requireAnyAccess(requirements: [Domain, AccessLevel][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.auth?.role
    const allowed = role
      ? requirements.some(([domain, level]) => hasAccess(DOMAIN_PERMISSIONS[domain][role], level))
      : false
    if (!allowed) {
      res.status(403).json({ ok: false, error: 'Accès non autorisé pour votre rôle.' })
      return
    }
    next()
  }
}
