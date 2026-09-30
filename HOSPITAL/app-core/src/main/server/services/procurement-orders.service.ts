import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { ConflictError } from '../lib/conflict-error'
import type { PurchaseOrder, PurchaseOrderStatus, ProcurementRequest, Supplier } from '../generated/prisma/client'

export interface CreatePurchaseOrderInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  requestId?: string
  supplierId?: string
  article: string
  quantity: number
  unitPrice?: number
  orderedAt?: string
  expectedDeliveryAt?: string
  status?: PurchaseOrderStatus
}

export interface UpdatePurchaseOrderInput {
  supplierId?: string | null
  article?: string
  quantity?: number
  unitPrice?: number | null
  orderedAt?: string
  expectedDeliveryAt?: string | null
  status?: PurchaseOrderStatus
  /** Dernière version connue (`updatedAt`), pour détecter un conflit (voir §6.3). */
  expectedUpdatedAt?: string
}

type OrderWithRelations = PurchaseOrder & { request: ProcurementRequest | null; supplier: Supplier | null }

function toDisplay(o: OrderWithRelations) {
  return {
    id: o.id,
    reference: o.reference,
    requestId: o.requestId,
    requestReference: o.request?.reference ?? null,
    supplierId: o.supplierId,
    supplierName: o.supplier?.name ?? null,
    article: o.article,
    quantity: o.quantity,
    unitPrice: o.unitPrice,
    totalAmount: o.unitPrice ? o.unitPrice * o.quantity : null,
    orderedAt: o.orderedAt.toISOString(),
    expectedDeliveryAt: o.expectedDeliveryAt?.toISOString() ?? null,
    status: o.status,
    updatedAt: o.updatedAt.toISOString()
  }
}

export async function listPurchaseOrders() {
  const prisma = getPrismaClient()
  const orders = await prisma.purchaseOrder.findMany({
    where: { deletedAt: null },
    include: { request: true, supplier: true },
    orderBy: { orderedAt: 'desc' }
  })
  return orders.map(toDisplay)
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: input.id }, include: { request: true, supplier: true } })
    if (existing) return toDisplay(existing)
  }

  const reference = await nextCode('PURCHASE_ORDER', 'CMD', 4)

  const order = await prisma.purchaseOrder.create({
    data: {
      id: input.id ?? randomUUID(),
      reference,
      requestId: input.requestId,
      supplierId: input.supplierId,
      article: input.article,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      orderedAt: input.orderedAt ? new Date(input.orderedAt) : new Date(),
      expectedDeliveryAt: input.expectedDeliveryAt ? new Date(input.expectedDeliveryAt) : undefined,
      status: input.status ?? 'EN_PREPARATION'
    },
    include: { request: true, supplier: true }
  })
  return toDisplay(order)
}

export async function updatePurchaseOrder(id: string, input: UpdatePurchaseOrderInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.purchaseOrder.findUnique({ where: { id }, include: { request: true, supplier: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const order = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      supplierId: input.supplierId === undefined ? undefined : input.supplierId,
      article: input.article,
      quantity: input.quantity,
      unitPrice: input.unitPrice === undefined ? undefined : input.unitPrice,
      orderedAt: input.orderedAt !== undefined ? new Date(input.orderedAt) : undefined,
      expectedDeliveryAt:
        input.expectedDeliveryAt !== undefined ? (input.expectedDeliveryAt ? new Date(input.expectedDeliveryAt) : null) : undefined,
      status: input.status
    },
    include: { request: true, supplier: true }
  })
  return toDisplay(order)
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: new Date() } })
}
