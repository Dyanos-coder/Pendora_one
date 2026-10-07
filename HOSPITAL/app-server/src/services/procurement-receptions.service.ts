import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import type { GoodsReception, ReceptionCondition, PurchaseOrder } from '../generated/prisma/client'

export interface CreateGoodsReceptionInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué (sinon
   * une réception CONFORME rejouée repasserait la commande liée à LIVREE sans dégât, mais créerait
   * une réception en double). */
  id?: string
  orderId: string
  receivedAt?: string
  receivedQty: number
  condition?: ReceptionCondition
  receivedBy: string
  note?: string
}

export interface UpdateGoodsReceptionInput {
  receivedAt?: string
  receivedQty?: number
  condition?: ReceptionCondition
  receivedBy?: string
  note?: string | null
  /** Dernière version connue (`updatedAt`), pour détecter un conflit (voir §6.3). */
  expectedUpdatedAt?: string
}

type ReceptionWithOrder = GoodsReception & { order: PurchaseOrder }

function toDisplay(r: ReceptionWithOrder) {
  return {
    id: r.id,
    orderId: r.orderId,
    orderReference: r.order.reference,
    article: r.order.article,
    receivedAt: r.receivedAt.toISOString(),
    receivedQty: r.receivedQty,
    orderedQty: r.order.quantity,
    condition: r.condition,
    receivedBy: r.receivedBy,
    note: r.note,
    updatedAt: r.updatedAt.toISOString()
  }
}

export async function listGoodsReceptions() {
  const prisma = getPrismaClient()
  const receptions = await prisma.goodsReception.findMany({
    where: { deletedAt: null },
    include: { order: true },
    orderBy: { receivedAt: 'desc' }
  })
  return receptions.map(toDisplay)
}

export async function createGoodsReception(input: CreateGoodsReceptionInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.goodsReception.findUnique({ where: { id: input.id }, include: { order: true } })
    if (existing) return toDisplay(existing)
  }

  const reception = await prisma.goodsReception.create({
    data: {
      id: input.id ?? randomUUID(),
      orderId: input.orderId,
      receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
      receivedQty: input.receivedQty,
      condition: input.condition ?? 'CONFORME',
      receivedBy: input.receivedBy,
      note: input.note
    },
    include: { order: true }
  })

  // Une réception "conforme" fait automatiquement passer la commande liée à LIVREE — évite un
  // second clic manuel pour un cas qui sera l'immense majorité des réceptions.
  if (reception.condition === 'CONFORME') {
    await prisma.purchaseOrder.update({ where: { id: input.orderId }, data: { status: 'LIVREE' } })
  }

  return toDisplay(reception)
}

export async function updateGoodsReception(id: string, input: UpdateGoodsReceptionInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.goodsReception.findUnique({ where: { id }, include: { order: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const reception = await prisma.goodsReception.update({
    where: { id },
    data: {
      receivedAt: input.receivedAt !== undefined ? new Date(input.receivedAt) : undefined,
      receivedQty: input.receivedQty,
      condition: input.condition,
      receivedBy: input.receivedBy,
      note: input.note === undefined ? undefined : input.note
    },
    include: { order: true }
  })
  return toDisplay(reception)
}

export async function deleteGoodsReception(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.goodsReception.update({ where: { id }, data: { deletedAt: new Date() } })
}
