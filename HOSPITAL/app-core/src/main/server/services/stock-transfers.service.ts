import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { ConflictError } from '../lib/conflict-error'
import type { StockTransfer, DepotItem, Depot } from '../generated/prisma/client'

export interface CreateStockTransferInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  fromItemId: string
  toDepotId: string
  quantity: number
  transferDate?: string
  performedBy: string
  note?: string
}

export interface UpdateStockTransferInput {
  transferDate?: string
  performedBy?: string
  note?: string | null
  /** Dernière version connue (`updatedAt`), pour détecter un conflit (voir §6.3). */
  expectedUpdatedAt?: string
}

type TransferWithRelations = StockTransfer & { fromItem: DepotItem; toDepot: Depot }

function toDisplay(t: TransferWithRelations) {
  return {
    id: t.id,
    reference: t.reference,
    fromItemId: t.fromItemId,
    fromItemName: t.fromItem.name,
    toDepotId: t.toDepotId,
    toDepotName: t.toDepot.name,
    quantity: t.quantity,
    transferDate: t.transferDate.toISOString(),
    performedBy: t.performedBy,
    note: t.note,
    updatedAt: t.updatedAt.toISOString()
  }
}

export async function listStockTransfers() {
  const prisma = getPrismaClient()
  const transfers = await prisma.stockTransfer.findMany({
    where: { deletedAt: null },
    include: { fromItem: true, toDepot: true },
    orderBy: { transferDate: 'desc' }
  })
  return transfers.map(toDisplay)
}

// Un transfert débite l'article source et crédite l'article de même nom/catégorie dans le dépôt
// de destination, en le créant s'il n'existe pas encore là-bas — pas de DepotItem dupliqué par
// transfert, l'article de destination est retrouvé ou créé à la volée.
export async function createStockTransfer(input: CreateStockTransferInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.stockTransfer.findUnique({
      where: { id: input.id },
      include: { fromItem: true, toDepot: true }
    })
    if (existing) return toDisplay(existing)
  }

  const reference = await nextCode('STOCK_TRANSFER', 'TRS', 4)
  const transferDate = input.transferDate ? new Date(input.transferDate) : new Date()

  const fromItem = await prisma.depotItem.findUniqueOrThrow({ where: { id: input.fromItemId } })

  const transfer = await prisma.stockTransfer.create({
    data: {
      id: input.id ?? randomUUID(),
      reference,
      fromItemId: input.fromItemId,
      toDepotId: input.toDepotId,
      quantity: input.quantity,
      transferDate,
      performedBy: input.performedBy,
      note: input.note
    },
    include: { fromItem: true, toDepot: true }
  })

  await prisma.depotItem.update({
    where: { id: input.fromItemId },
    data: { available: { decrement: input.quantity }, lastMovementAt: transferDate }
  })

  const destinationItem = await prisma.depotItem.findFirst({
    where: { depotId: input.toDepotId, name: fromItem.name, deletedAt: null }
  })
  if (destinationItem) {
    await prisma.depotItem.update({
      where: { id: destinationItem.id },
      data: { available: { increment: input.quantity }, lastMovementAt: transferDate }
    })
  } else {
    await prisma.depotItem.create({
      data: {
        id: randomUUID(),
        name: fromItem.name,
        category: fromItem.category,
        depotId: input.toDepotId,
        available: input.quantity,
        minThreshold: fromItem.minThreshold,
        lastMovementAt: transferDate
      }
    })
  }

  return toDisplay(transfer)
}

export async function updateStockTransfer(id: string, input: UpdateStockTransferInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.stockTransfer.findUnique({ where: { id }, include: { fromItem: true, toDepot: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const transfer = await prisma.stockTransfer.update({
    where: { id },
    data: {
      transferDate: input.transferDate !== undefined ? new Date(input.transferDate) : undefined,
      performedBy: input.performedBy,
      note: input.note === undefined ? undefined : input.note
    },
    include: { fromItem: true, toDepot: true }
  })
  return toDisplay(transfer)
}

export async function deleteStockTransfer(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.stockTransfer.update({ where: { id }, data: { deletedAt: new Date() } })
}
