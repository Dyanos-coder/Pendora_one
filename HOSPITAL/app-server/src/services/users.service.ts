import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { Role } from '../types'
import type { User } from '../generated/prisma/client'

export interface CreateUserInput {
  email: string
  password: string
  name: string
  role: Role
}

export interface UpdateUserInput {
  name?: string
  role?: Role
  isActive?: boolean
}

function toDisplay(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString()
  }
}

export async function listUsers() {
  const prisma = getPrismaClient()
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
  return users.map(toDisplay)
}

export async function createUser(input: CreateUserInput) {
  const prisma = getPrismaClient()
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: input.email,
      passwordHash: bcrypt.hashSync(input.password, 10),
      name: input.name,
      role: input.role
    }
  })
  return toDisplay(user)
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const prisma = getPrismaClient()
  const user = await prisma.user.update({
    where: { id },
    data: { name: input.name, role: input.role, isActive: input.isActive }
  })
  return toDisplay(user)
}

/** Réinitialisation par un DIRIGEANT (mot de passe oublié, compte compromis...) — révoque aussi
 * toutes les sessions déjà ouvertes de ce compte, comme après un logout. */
export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.user.update({
    where: { id },
    data: { passwordHash: bcrypt.hashSync(newPassword, 10), sessionVersion: { increment: 1 } }
  })
}

export type ChangeOwnPasswordResult = { ok: true } | { ok: false; error: string }

/** Changement de mot de passe par l'utilisateur lui-même — ouvert à tous les rôles (ne passe pas
 * par la matrice RBAC, voir permissions.ts). Révoque aussi la session courante par cohérence avec
 * resetUserPassword : le client doit se reconnecter juste après avec le nouveau mot de passe. */
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<ChangeOwnPasswordResult> {
  const prisma = getPrismaClient()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
    return { ok: false, error: 'Mot de passe actuel incorrect.' }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: bcrypt.hashSync(newPassword, 10), sessionVersion: { increment: 1 } }
  })
  return { ok: true }
}
