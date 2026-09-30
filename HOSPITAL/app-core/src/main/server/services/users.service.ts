import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { Role } from '../types'
import type { User, Employee } from '../generated/prisma/client'

export interface CreateUserInput {
  email: string
  password: string
  name: string
  role: Role
  /** Fiche employé (`Employee.id`) à rattacher à ce nouveau compte, optionnel — condition pour
   * qu'un médecin puisse être restreint à ses propres rendez-vous (voir §RDV). Doit être une
   * fiche pas encore liée à un autre compte (voir listUnlinkedEmployees, employees.service.ts). */
  employeeId?: string
}

export interface UpdateUserInput {
  name?: string
  email?: string
  role?: Role
  isActive?: boolean
}

function toDisplay(u: User & { employee: Employee | null }) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    isActive: u.isActive,
    employeeId: u.employee?.id ?? null,
    createdAt: u.createdAt.toISOString()
  }
}

export async function listUsers() {
  const prisma = getPrismaClient()
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' }, include: { employee: true } })
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
      role: input.role,
      // Écriture imbriquée Prisma côté relation inverse : pose `Employee.userId` sur la fiche
      // ciblée. La validation (fiche existante et pas déjà liée à un autre compte) est faite en
      // amont côté route pour renvoyer une erreur claire plutôt que l'erreur Prisma brute.
      employee: input.employeeId ? { connect: { id: input.employeeId } } : undefined
    },
    include: { employee: true }
  })
  return toDisplay(user)
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const prisma = getPrismaClient()
  const user = await prisma.user.update({
    where: { id },
    data: { name: input.name, email: input.email, role: input.role, isActive: input.isActive },
    include: { employee: true }
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
