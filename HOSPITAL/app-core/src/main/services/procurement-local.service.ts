import { getPrismaClient } from '../db/client'
import type {
  ApiGoodsReception,
  ApiProcurementPriority,
  ApiProcurementRequest,
  ApiProcurementStatus,
  ApiPurchaseOrder,
  ApiPurchaseOrderStatus,
  ApiReceptionCondition,
  CreateGoodsReceptionInput,
  CreateProcurementRequestInput,
  CreatePurchaseOrderInput,
  UpdateGoodsReceptionInput,
  UpdateProcurementRequestInput,
  UpdatePurchaseOrderInput
} from '../../shared/procurement-types'
import type {
  GoodsReception as LocalGoodsReceptionRow,
  ProcurementRequest as LocalProcurementRequestRow,
  PurchaseOrder as LocalPurchaseOrderRow
} from '../../generated/prisma/client'

// Mode hors-ligne — Phase 3 : Approvisionnement, entité `ProcurementRequest` uniquement (voir
// Plan-Mode-Hors-Ligne-Synchronisation.md). Aucune relation à répliquer — fonction pure comme
// Pharmacie/Banque de sang. Code lisible (`reference`) → provisoire `BES-LOCAL-xxxx`.

function toDisplay(row: LocalProcurementRequestRow): ApiProcurementRequest {
  return {
    id: row.id,
    reference: row.reference,
    requestedAt: row.requestedAt.toISOString(),
    article: row.article,
    category: row.category,
    quantity: row.quantity,
    priority: row.priority as ApiProcurementPriority,
    status: row.status as ApiProcurementStatus,
    requester: row.requester,
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Version serveur connue (`serverUpdatedAt`) de la demande, si déjà synchronisée — `undefined` si
 * elle n'a jamais été confirmée par le serveur (création encore PENDING) ou n'existe pas
 * localement, auquel cas aucune vérification de conflit n'est possible ni nécessaire (voir
 * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). */
export async function getLocalProcurementRequestServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.procurementRequest.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalProcurementRequests(): Promise<ApiProcurementRequest[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.procurementRequest.findMany({ where: { deletedAt: null }, orderBy: { requestedAt: 'desc' } })
  return rows.map(toDisplay)
}

export async function createLocalProcurementRequest(id: string, input: CreateProcurementRequestInput): Promise<ApiProcurementRequest> {
  const prisma = getPrismaClient()
  const provisionalReference = `BES-LOCAL-${id.slice(0, 4).toUpperCase()}`
  const row = await prisma.procurementRequest.create({
    data: {
      id,
      reference: provisionalReference,
      requestedAt: new Date(),
      article: input.article,
      category: input.category,
      quantity: input.quantity,
      priority: input.priority ?? 'NORMALE',
      status: 'A_VALIDER',
      requester: input.requester,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalProcurementRequest(id: string, input: UpdateProcurementRequestInput): Promise<ApiProcurementRequest> {
  const prisma = getPrismaClient()
  const row = await prisma.procurementRequest.update({
    where: { id },
    data: {
      article: input.article,
      category: input.category,
      quantity: input.quantity,
      priority: input.priority,
      status: input.status,
      requester: input.requester,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalProcurementRequest(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.procurementRequest.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedProcurementRequest(r: ApiProcurementRequest): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    reference: r.reference,
    requestedAt: new Date(r.requestedAt),
    article: r.article,
    category: r.category,
    quantity: r.quantity,
    priority: r.priority,
    status: r.status,
    requester: r.requester,
    serverUpdatedAt: new Date(r.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.procurementRequest.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } })
}

export async function syncDownProcurementRequests(items: ApiProcurementRequest[]): Promise<void> {
  for (const r of items) {
    await upsertSyncedProcurementRequest(r)
  }
}

// --- Commandes (item 13, Phase 5) -----------------------------------------------------------

// `supplierName` n'a pas de miroir local (`Supplier` est un référentiel en lecture seule, pas
// couvert — même principe que `Depot`/`Bed`/`OperatingRoom` ailleurs) : reste vide tant qu'une
// synchro n'a pas renvoyé le nom. `requestReference`, lui, est retrouvé dans le miroir local
// `ProcurementRequest` (Phase 3) quand la commande est liée à une demande déjà connue.

function toDisplayOrder(row: LocalPurchaseOrderRow): ApiPurchaseOrder {
  return {
    id: row.id,
    reference: row.reference,
    requestId: row.requestId,
    requestReference: row.requestReference,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    article: row.article,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    totalAmount: row.unitPrice ? row.unitPrice * row.quantity : null,
    orderedAt: row.orderedAt.toISOString(),
    expectedDeliveryAt: row.expectedDeliveryAt?.toISOString() ?? null,
    status: row.status as ApiPurchaseOrderStatus,
    updatedAt: row.updatedAt.toISOString()
  }
}

export async function getLocalPurchaseOrderServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.purchaseOrder.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalPurchaseOrders(): Promise<ApiPurchaseOrder[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.purchaseOrder.findMany({ where: { deletedAt: null }, orderBy: { orderedAt: 'desc' } })
  return rows.map(toDisplayOrder)
}

export async function createLocalPurchaseOrder(id: string, input: CreatePurchaseOrderInput): Promise<ApiPurchaseOrder> {
  const prisma = getPrismaClient()
  const request = input.requestId ? await prisma.procurementRequest.findUnique({ where: { id: input.requestId } }) : null

  const row = await prisma.purchaseOrder.create({
    data: {
      id,
      reference: `CMD-LOCAL-${id.slice(0, 4).toUpperCase()}`,
      requestId: input.requestId,
      requestReference: request?.reference ?? null,
      supplierId: input.supplierId,
      supplierName: null,
      article: input.article,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      orderedAt: input.orderedAt ? new Date(input.orderedAt) : new Date(),
      expectedDeliveryAt: input.expectedDeliveryAt ? new Date(input.expectedDeliveryAt) : null,
      status: input.status ?? 'EN_PREPARATION',
      syncStatus: 'PENDING'
    }
  })
  return toDisplayOrder(row)
}

export async function updateLocalPurchaseOrder(id: string, input: UpdatePurchaseOrderInput): Promise<ApiPurchaseOrder> {
  const prisma = getPrismaClient()
  const row = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      supplierId: input.supplierId === undefined ? undefined : input.supplierId,
      article: input.article,
      quantity: input.quantity,
      unitPrice: input.unitPrice === undefined ? undefined : input.unitPrice,
      orderedAt: input.orderedAt !== undefined ? new Date(input.orderedAt) : undefined,
      expectedDeliveryAt:
        input.expectedDeliveryAt !== undefined ? (input.expectedDeliveryAt ? new Date(input.expectedDeliveryAt) : null) : undefined,
      status: input.status,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayOrder(row)
}

export async function softDeleteLocalPurchaseOrder(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedPurchaseOrder(o: ApiPurchaseOrder): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    reference: o.reference,
    requestId: o.requestId,
    requestReference: o.requestReference,
    supplierId: o.supplierId,
    supplierName: o.supplierName,
    article: o.article,
    quantity: o.quantity,
    unitPrice: o.unitPrice,
    orderedAt: new Date(o.orderedAt),
    expectedDeliveryAt: o.expectedDeliveryAt ? new Date(o.expectedDeliveryAt) : null,
    status: o.status,
    serverUpdatedAt: new Date(o.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.purchaseOrder.upsert({ where: { id: o.id }, update: data, create: { id: o.id, ...data } })
}

export async function syncDownPurchaseOrders(items: ApiPurchaseOrder[]): Promise<void> {
  for (const o of items) await upsertSyncedPurchaseOrder(o)
}

// --- Réceptions (item 13, Phase 5) ----------------------------------------------------------

function toDisplayReception(row: LocalGoodsReceptionRow): ApiGoodsReception {
  return {
    id: row.id,
    orderId: row.orderId,
    orderReference: row.orderReference ?? '',
    article: row.article ?? '',
    receivedAt: row.receivedAt.toISOString(),
    receivedQty: row.receivedQty,
    orderedQty: row.orderedQty ?? 0,
    condition: row.condition as ApiReceptionCondition,
    receivedBy: row.receivedBy,
    note: row.note,
    updatedAt: row.updatedAt.toISOString()
  }
}

export async function getLocalGoodsReceptionServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.goodsReception.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalGoodsReceptions(): Promise<ApiGoodsReception[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.goodsReception.findMany({ where: { deletedAt: null }, orderBy: { receivedAt: 'desc' } })
  return rows.map(toDisplayReception)
}

// Réplique l'effet de bord serveur : une réception CONFORME fait passer la commande liée à
// LIVREE — retour visuel immédiat hors-ligne, écrasé par la valeur serveur à la prochaine synchro
// descendante de `PurchaseOrder` (comme `DepotItem.available` en Phase 5/Stocks).
export async function createLocalGoodsReception(id: string, input: CreateGoodsReceptionInput): Promise<ApiGoodsReception> {
  const prisma = getPrismaClient()
  const order = await prisma.purchaseOrder.findUnique({ where: { id: input.orderId } })
  const condition = input.condition ?? 'CONFORME'

  const row = await prisma.goodsReception.create({
    data: {
      id,
      orderId: input.orderId,
      orderReference: order?.reference ?? null,
      article: order?.article ?? null,
      receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
      receivedQty: input.receivedQty,
      orderedQty: order?.quantity ?? null,
      condition,
      receivedBy: input.receivedBy,
      note: input.note,
      syncStatus: 'PENDING'
    }
  })

  if (order && condition === 'CONFORME') {
    await prisma.purchaseOrder.update({ where: { id: input.orderId }, data: { status: 'LIVREE' } })
  }

  return toDisplayReception(row)
}

export async function updateLocalGoodsReception(id: string, input: UpdateGoodsReceptionInput): Promise<ApiGoodsReception> {
  const prisma = getPrismaClient()
  const row = await prisma.goodsReception.update({
    where: { id },
    data: {
      receivedAt: input.receivedAt !== undefined ? new Date(input.receivedAt) : undefined,
      receivedQty: input.receivedQty,
      condition: input.condition,
      receivedBy: input.receivedBy,
      note: input.note === undefined ? undefined : input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayReception(row)
}

export async function softDeleteLocalGoodsReception(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.goodsReception.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedGoodsReception(r: ApiGoodsReception): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    orderId: r.orderId,
    orderReference: r.orderReference,
    article: r.article,
    receivedAt: new Date(r.receivedAt),
    receivedQty: r.receivedQty,
    orderedQty: r.orderedQty,
    condition: r.condition,
    receivedBy: r.receivedBy,
    note: r.note,
    serverUpdatedAt: new Date(r.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.goodsReception.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } })
}

export async function syncDownGoodsReceptions(items: ApiGoodsReception[]): Promise<void> {
  for (const r of items) await upsertSyncedGoodsReception(r)
}
