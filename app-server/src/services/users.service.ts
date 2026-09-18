import { getPrismaClient } from '../db/client'

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true
} as const

export function listUsers() {
  const prisma = getPrismaClient()
  return prisma.user.findMany({ select: USER_SELECT, orderBy: { createdAt: 'asc' } })
}

export class CannotSuspendSelfError extends Error {}

export async function setUserActive(id: string, isActive: boolean, requesterId: string) {
  if (id === requesterId && !isActive) {
    throw new CannotSuspendSelfError('Vous ne pouvez pas suspendre votre propre compte.')
  }

  const prisma = getPrismaClient()
  return prisma.user.update({ where: { id }, data: { isActive }, select: USER_SELECT })
}
