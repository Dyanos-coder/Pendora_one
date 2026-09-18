import bcrypt from 'bcryptjs'
import { getPrismaClient } from '../db/client'
import { signToken } from '../auth/jwt'
import type { LoginResult, Session } from '../types'

// Même logique que app-core/src/main/services/auth.service.ts (avant le passage au backend
// distant), portée côté serveur : c'est désormais ici que la vérification des identifiants a
// lieu (source de vérité). Pas de notion de tenant : cette base appartient à une seule
// entreprise (voir modèle Company, une seule ligne).
export async function login(email: string, password: string): Promise<LoginResult> {
  const prisma = getPrismaClient()

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return { ok: false, error: 'Identifiants invalides.' }
  }

  if (!user.isActive) {
    return { ok: false, error: 'Ce compte a été suspendu.' }
  }

  const company = await prisma.company.findFirst()
  if (!company) {
    return { ok: false, error: "Aucune entreprise n'est configurée sur ce serveur." }
  }

  const session: Session = {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    company: { name: company.name, sector: company.sector }
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'auth.login',
      entityType: 'User',
      entityId: user.id
    }
  })

  const token = signToken({ userId: user.id, role: user.role, sessionVersion: user.sessionVersion })

  return { ok: true, session, token }
}

/** Révoque tous les jetons déjà émis pour cet utilisateur (déconnexion serveur) en faisant
 * avancer sessionVersion — le prochain requireAuth sur un ancien jeton le rejettera. */
export async function logout(userId: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } })
  await prisma.auditLog.create({
    data: { userId, action: 'auth.logout', entityType: 'User', entityId: userId }
  })
}
