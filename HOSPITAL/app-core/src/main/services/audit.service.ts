import { getPrismaClient } from '../db/client'

interface LogAuditInput {
  userId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  before?: unknown
  after?: unknown
}

/**
 * Journal append-only (§3.8 du cahier des charges) : ce module n'expose volontairement
 * aucune méthode update/delete sur AuditLog, uniquement la création d'entrées.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before !== undefined ? JSON.stringify(input.before) : null,
      after: input.after !== undefined ? JSON.stringify(input.after) : null
    }
  })
}
