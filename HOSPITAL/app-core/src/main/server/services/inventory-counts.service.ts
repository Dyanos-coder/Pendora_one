import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { ConflictError } from '../lib/conflict-error'
import type { InventoryCount, DepotItem } from '../generated/prisma/client'

export interface CreateInventoryCountInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  itemId: string
  countedQuantity: number
  conductedBy: string
  conductedAt?: string
  note?: string
}

export interface UpdateInventoryCountInput {
  conductedBy?: string
  conductedAt?: string
  note?: string | null
  /** Dernière version connue (`updatedAt`), pour détecter un conflit (voir §6.3). */
  expectedUpdatedAt?: string
}

type CountWithRelations = InventoryCount & { item: DepotItem }

function toDisplay(c: CountWithRelations) {
  return {
    id: c.id,
    reference: c.reference,
    itemId: c.itemId,
    itemName: c.item.name,
    expectedQuantity: c.expectedQuantity,
    countedQuantity: c.countedQuantity,
    discrepancy: c.countedQuantity - c.expectedQuantity,
    conductedBy: c.conductedBy,
    conductedAt: c.conductedAt.toISOString(),
    note: c.note,
    updatedAt: c.updatedAt.toISOString()
  }
}

export async function listInventoryCounts() {
  const prisma = getPrismaClient()
  const counts = await prisma.inventoryCount.findMany({
    where: { deletedAt: null },
    include: { item: true },
    orderBy: { conductedAt: 'desc' }
  })
  return counts.map(toDisplay)
}

// `expectedQuantity` est figé au moment du comptage (snapshot de `DepotItem.available`). En cas
// d'écart, le comptage physique fait foi : `DepotItem.available` est corrigé sur la quantité
// comptée, même logique de resynchronisation que les mouvements/transferts.
export async function createInventoryCount(input: CreateInventoryCountInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.inventoryCount.findUnique({ where: { id: input.id }, include: { item: true } })
    if (existing) return toDisplay(existing)
  }

  const reference = await nextCode('INVENTORY_COUNT', 'INV', 4)
  const conductedAt = input.conductedAt ? new Date(input.conductedAt) : new Date()

  const item = await prisma.depotItem.findUniqueOrThrow({ where: { id: input.itemId } })

  const count = await prisma.inventoryCount.create({
    data: {
      id: input.id ?? randomUUID(),
      reference,
      itemId: input.itemId,
      expectedQuantity: item.available,
      countedQuantity: input.countedQuantity,
      conductedBy: input.conductedBy,
      conductedAt,
      note: input.note
    },
    include: { item: true }
  })

  if (input.countedQuantity !== item.available) {
    await prisma.depotItem.update({
      where: { id: input.itemId },
      data: { available: input.countedQuantity, lastMovementAt: conductedAt }
    })
  }

  return toDisplay(count)
}

export async function updateInventoryCount(id: string, input: UpdateInventoryCountInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.inventoryCount.findUnique({ where: { id }, include: { item: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const count = await prisma.inventoryCount.update({
    where: { id },
    data: {
      conductedBy: input.conductedBy,
      conductedAt: input.conductedAt !== undefined ? new Date(input.conductedAt) : undefined,
      note: input.note === undefined ? undefined : input.note
    },
    include: { item: true }
  })
  return toDisplay(count)
}

export async function deleteInventoryCount(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.inventoryCount.update({ where: { id }, data: { deletedAt: new Date() } })
}
