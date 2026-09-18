import { getPrismaClient } from '../db/client'

const PAGE_SIZE = 20

export function logAudit(userId: string, action: string, entityType: string, entityId?: string): Promise<unknown> {
  const prisma = getPrismaClient()
  return prisma.auditLog.create({ data: { userId, action, entityType, entityId } })
}

export async function listUserActivity(userId: string, page: number) {
  const prisma = getPrismaClient()
  const skip = Math.max(0, page - 1) * PAGE_SIZE

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE
    }),
    prisma.auditLog.count({ where: { userId } })
  ])

  return { items, total, page, pageSize: PAGE_SIZE }
}
