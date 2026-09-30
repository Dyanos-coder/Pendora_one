import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { SyncOperation, SyncOutboxEntry, SyncStatus } from '../../shared/sync-types'

// Mode hors-ligne — Phase 0 (voir Plan-Mode-Hors-Ligne-Synchronisation.md §3.1/§6.1). Fondations
// génériques uniquement : aucun domaine métier n'appelle encore `enqueue()` à ce stade (Phase 1).

interface OutboxRow {
  id: string
  entityType: string
  entityId: string
  operation: string
  status: string
  retryCount: number
  lastError: string | null
  conflict: boolean
  createdAt: Date
}

function toDisplay(row: OutboxRow): SyncOutboxEntry {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    operation: row.operation as SyncOperation,
    status: row.status as SyncStatus,
    retryCount: row.retryCount,
    lastError: row.lastError,
    conflict: row.conflict,
    createdAt: row.createdAt.toISOString()
  }
}

export async function enqueue(entityType: string, entityId: string, operation: SyncOperation, payload: unknown): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.syncOutbox.create({
    data: {
      id: randomUUID(),
      entityType,
      entityId,
      operation,
      payload: JSON.stringify(payload),
      status: 'PENDING'
    }
  })
}

export async function listOutbox(): Promise<SyncOutboxEntry[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.syncOutbox.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
  return rows.map(toDisplay)
}

export async function listPending(): Promise<{ id: string; entityType: string; entityId: string; operation: SyncOperation; payload: unknown; retryCount: number }[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.syncOutbox.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' } })
  return rows.map((r) => ({
    id: r.id,
    entityType: r.entityType,
    entityId: r.entityId,
    operation: r.operation as SyncOperation,
    payload: JSON.parse(r.payload) as unknown,
    retryCount: r.retryCount
  }))
}

export async function markSending(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.syncOutbox.update({ where: { id }, data: { status: 'SENDING' } })
}

export async function markSent(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.syncOutbox.update({ where: { id }, data: { status: 'SENT' } })
}

export async function markFailed(id: string, error: string, retryable: boolean, conflict = false): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.syncOutbox.update({
    where: { id },
    data: {
      status: retryable ? 'PENDING' : 'FAILED',
      retryCount: { increment: 1 },
      lastError: error,
      conflict
    }
  })
}
