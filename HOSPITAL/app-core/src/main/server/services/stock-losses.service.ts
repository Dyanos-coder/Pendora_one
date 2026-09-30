import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { ConflictError } from '../lib/conflict-error'
import type { StockLoss, StockLossType, DepotItem } from '../generated/prisma/client'

export interface CreateStockLossInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  itemId: string
  type: StockLossType
  quantity: number
  reason: string
  occurredAt?: string
  reportedBy: string
  note?: string
}

export interface UpdateStockLossInput {
  reason?: string
  occurredAt?: string
  reportedBy?: string
  note?: string | null
  /** Dernière version connue (`updatedAt`), pour détecter un conflit (voir §6.3). */
  expectedUpdatedAt?: string
}

type LossWithRelations = StockLoss & { item: DepotItem }

function toDisplay(l: LossWithRelations) {
  return {
    id: l.id,
    reference: l.reference,
    itemId: l.itemId,
    itemName: l.item.name,
    type: l.type,
    quantity: l.quantity,
    reason: l.reason,
    occurredAt: l.occurredAt.toISOString(),
    reportedBy: l.reportedBy,
    note: l.note,
    updatedAt: l.updatedAt.toISOString()
  }
}

export async function listStockLosses() {
  const prisma = getPrismaClient()
  const losses = await prisma.stockLoss.findMany({
    where: { deletedAt: null },
    include: { item: true },
    orderBy: { occurredAt: 'desc' }
  })
  return losses.map(toDisplay)
}

// Une perte décrémente le stock disponible, un retour le recrédite — même mécanique que les
// mouvements d'entrée/sortie (item 16), avec un motif obligatoire propre aux pertes/retours.
export async function createStockLoss(input: CreateStockLossInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.stockLoss.findUnique({ where: { id: input.id }, include: { item: true } })
    if (existing) return toDisplay(existing)
  }

  const reference = await nextCode('STOCK_LOSS', 'PRT', 4)
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()

  const loss = await prisma.stockLoss.create({
    data: {
      id: input.id ?? randomUUID(),
      reference,
      itemId: input.itemId,
      type: input.type,
      quantity: input.quantity,
      reason: input.reason,
      occurredAt,
      reportedBy: input.reportedBy,
      note: input.note
    },
    include: { item: true }
  })

  const delta = input.type === 'RETOUR' ? input.quantity : -input.quantity
  await prisma.depotItem.update({
    where: { id: input.itemId },
    data: { available: { increment: delta }, lastMovementAt: occurredAt }
  })

  return toDisplay(loss)
}

export async function updateStockLoss(id: string, input: UpdateStockLossInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.stockLoss.findUnique({ where: { id }, include: { item: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const loss = await prisma.stockLoss.update({
    where: { id },
    data: {
      reason: input.reason,
      occurredAt: input.occurredAt !== undefined ? new Date(input.occurredAt) : undefined,
      reportedBy: input.reportedBy,
      note: input.note === undefined ? undefined : input.note
    },
    include: { item: true }
  })
  return toDisplay(loss)
}

export async function deleteStockLoss(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.stockLoss.update({ where: { id }, data: { deletedAt: new Date() } })
}
