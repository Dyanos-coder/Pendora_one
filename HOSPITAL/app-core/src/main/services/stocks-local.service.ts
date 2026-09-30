import { getPrismaClient } from '../db/client'
import type {
  ApiDepotItem,
  ApiInventoryCount,
  ApiItemState,
  ApiStockLoss,
  ApiStockMovement,
  ApiStockTransfer,
  CreateDepotItemInput,
  CreateInventoryCountInput,
  CreateStockLossInput,
  CreateStockMovementInput,
  CreateStockTransferInput,
  UpdateDepotItemInput,
  UpdateInventoryCountInput,
  UpdateStockLossInput,
  UpdateStockMovementInput,
  UpdateStockTransferInput
} from '../../shared/stocks-types'
import type {
  DepotItem as LocalDepotItemRow,
  InventoryCount as LocalInventoryCountRow,
  StockLoss as LocalStockLossRow,
  StockMovement as LocalStockMovementRow,
  StockTransfer as LocalStockTransferRow
} from '../../generated/prisma/client'

// Mode hors-ligne — Phase 3 : Stocks, entité `DepotItem` uniquement (voir
// Plan-Mode-Hors-Ligne-Synchronisation.md). `depotName` est un instantané local (`Depot` est un
// référentiel en lecture seule côté serveur, pas de miroir dédié) — vide tant qu'aucune synchro
// n'a encore renvoyé le nom du dépôt pour un article créé hors-ligne.

function itemState(i: Pick<LocalDepotItemRow, 'available' | 'minThreshold'>): ApiItemState {
  if (i.available <= 0) return 'RUPTURE'
  if (i.available < i.minThreshold) return 'STOCK_FAIBLE'
  return 'DISPONIBLE'
}

function toDisplay(row: LocalDepotItemRow): ApiDepotItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    depotId: row.depotId,
    depot: row.depotName ?? '',
    available: row.available,
    minThreshold: row.minThreshold,
    state: itemState(row),
    lastMovementAt: row.lastMovementAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Version serveur connue (`serverUpdatedAt`) de la fiche, si déjà synchronisée — `undefined` si
 * la fiche n'a jamais été confirmée par le serveur (création encore PENDING) ou n'existe pas
 * localement, auquel cas aucune vérification de conflit n'est possible ni nécessaire (voir
 * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). */
export async function getLocalDepotItemServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.depotItem.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalDepotItems(): Promise<ApiDepotItem[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.depotItem.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } })
  return rows.map(toDisplay)
}

export async function createLocalDepotItem(id: string, input: CreateDepotItemInput): Promise<ApiDepotItem> {
  const prisma = getPrismaClient()
  const row = await prisma.depotItem.create({
    data: {
      id,
      name: input.name,
      category: input.category,
      depotId: input.depotId,
      available: input.available,
      minThreshold: input.minThreshold,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalDepotItem(id: string, input: UpdateDepotItemInput): Promise<ApiDepotItem> {
  const prisma = getPrismaClient()
  const row = await prisma.depotItem.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      depotId: input.depotId,
      available: input.available,
      minThreshold: input.minThreshold,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalDepotItem(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.depotItem.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedDepotItem(item: ApiDepotItem): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    name: item.name,
    category: item.category,
    depotId: item.depotId,
    depotName: item.depot,
    available: item.available,
    minThreshold: item.minThreshold,
    lastMovementAt: item.lastMovementAt ? new Date(item.lastMovementAt) : null,
    serverUpdatedAt: new Date(item.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.depotItem.upsert({ where: { id: item.id }, update: data, create: { id: item.id, ...data } })
}

export async function syncDownDepotItems(items: ApiDepotItem[]): Promise<void> {
  for (const item of items) {
    await upsertSyncedDepotItem(item)
  }
}

// --- Mouvements ------------------------------------------------------------------------------

function toDisplayMovement(row: LocalStockMovementRow): ApiStockMovement {
  return {
    id: row.id,
    reference: row.reference,
    itemId: row.itemId,
    itemName: row.itemName ?? '',
    type: row.type as ApiStockMovement['type'],
    quantity: row.quantity,
    movementDate: row.movementDate.toISOString(),
    reason: row.reason,
    performedBy: row.performedBy,
    note: row.note,
    updatedAt: row.updatedAt.toISOString()
  }
}

export async function getLocalStockMovementServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.stockMovement.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalStockMovements(): Promise<ApiStockMovement[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.stockMovement.findMany({ where: { deletedAt: null }, orderBy: { movementDate: 'desc' } })
  return rows.map(toDisplayMovement)
}

// Réplique le delta appliqué côté serveur sur `DepotItem.available` (+ entrée, - sortie), pour un
// retour visuel immédiat hors-ligne — remplacé par la valeur serveur faisant autorité dès la
// prochaine synchro descendante (voir `syncDownDepotItems`), donc pas besoin d'être parfait.
export async function createLocalStockMovement(id: string, input: CreateStockMovementInput): Promise<ApiStockMovement> {
  const prisma = getPrismaClient()
  const item = await prisma.depotItem.findUnique({ where: { id: input.itemId } })
  const movementDate = input.movementDate ? new Date(input.movementDate) : new Date()

  const row = await prisma.stockMovement.create({
    data: {
      id,
      reference: `MVT-LOCAL-${id.slice(0, 4).toUpperCase()}`,
      itemId: input.itemId,
      itemName: item?.name ?? null,
      type: input.type,
      quantity: input.quantity,
      movementDate,
      reason: input.reason,
      performedBy: input.performedBy,
      note: input.note,
      syncStatus: 'PENDING'
    }
  })

  if (item) {
    const delta = input.type === 'ENTREE' ? input.quantity : -input.quantity
    await prisma.depotItem.update({
      where: { id: input.itemId },
      data: { available: { increment: delta }, lastMovementAt: movementDate }
    })
  }

  return toDisplayMovement(row)
}

export async function updateLocalStockMovement(id: string, input: UpdateStockMovementInput): Promise<ApiStockMovement> {
  const prisma = getPrismaClient()
  const row = await prisma.stockMovement.update({
    where: { id },
    data: {
      movementDate: input.movementDate !== undefined ? new Date(input.movementDate) : undefined,
      reason: input.reason === undefined ? undefined : input.reason,
      performedBy: input.performedBy,
      note: input.note === undefined ? undefined : input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayMovement(row)
}

export async function softDeleteLocalStockMovement(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.stockMovement.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedStockMovement(m: ApiStockMovement): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    reference: m.reference,
    itemId: m.itemId,
    itemName: m.itemName,
    type: m.type,
    quantity: m.quantity,
    movementDate: new Date(m.movementDate),
    reason: m.reason,
    performedBy: m.performedBy,
    note: m.note,
    serverUpdatedAt: new Date(m.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.stockMovement.upsert({ where: { id: m.id }, update: data, create: { id: m.id, ...data } })
}

export async function syncDownStockMovements(items: ApiStockMovement[]): Promise<void> {
  for (const item of items) await upsertSyncedStockMovement(item)
}

// --- Transferts ------------------------------------------------------------------------------

function toDisplayTransfer(row: LocalStockTransferRow): ApiStockTransfer {
  return {
    id: row.id,
    reference: row.reference,
    fromItemId: row.fromItemId,
    fromItemName: row.fromItemName ?? '',
    toDepotId: row.toDepotId,
    toDepotName: row.toDepotName ?? '',
    quantity: row.quantity,
    transferDate: row.transferDate.toISOString(),
    performedBy: row.performedBy,
    note: row.note,
    updatedAt: row.updatedAt.toISOString()
  }
}

export async function getLocalStockTransferServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.stockTransfer.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalStockTransfers(): Promise<ApiStockTransfer[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.stockTransfer.findMany({ where: { deletedAt: null }, orderBy: { transferDate: 'desc' } })
  return rows.map(toDisplayTransfer)
}

export async function createLocalStockTransfer(id: string, input: CreateStockTransferInput): Promise<ApiStockTransfer> {
  const prisma = getPrismaClient()
  const fromItem = await prisma.depotItem.findUnique({ where: { id: input.fromItemId } })
  const transferDate = input.transferDate ? new Date(input.transferDate) : new Date()

  const row = await prisma.stockTransfer.create({
    data: {
      id,
      reference: `TRS-LOCAL-${id.slice(0, 4).toUpperCase()}`,
      fromItemId: input.fromItemId,
      fromItemName: fromItem?.name ?? null,
      toDepotId: input.toDepotId,
      toDepotName: null,
      quantity: input.quantity,
      transferDate,
      performedBy: input.performedBy,
      note: input.note,
      syncStatus: 'PENDING'
    }
  })

  if (fromItem) {
    await prisma.depotItem.update({
      where: { id: input.fromItemId },
      data: { available: { decrement: input.quantity }, lastMovementAt: transferDate }
    })

    // Article de destination : mis à jour seulement s'il existe déjà localement (déjà consulté en
    // ligne avant la coupure) — pas de création locale d'un doublon qui resterait orphelin après
    // la synchro : le serveur crée l'article de destination avec son propre id à la synchro
    // montante, la prochaine liste en ligne le fera apparaître normalement.
    const destinationItem = await prisma.depotItem.findFirst({
      where: { depotId: input.toDepotId, name: fromItem.name, deletedAt: null }
    })
    if (destinationItem) {
      await prisma.depotItem.update({
        where: { id: destinationItem.id },
        data: { available: { increment: input.quantity }, lastMovementAt: transferDate }
      })
    }
  }

  return toDisplayTransfer(row)
}

export async function updateLocalStockTransfer(id: string, input: UpdateStockTransferInput): Promise<ApiStockTransfer> {
  const prisma = getPrismaClient()
  const row = await prisma.stockTransfer.update({
    where: { id },
    data: {
      transferDate: input.transferDate !== undefined ? new Date(input.transferDate) : undefined,
      performedBy: input.performedBy,
      note: input.note === undefined ? undefined : input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayTransfer(row)
}

export async function softDeleteLocalStockTransfer(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.stockTransfer.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedStockTransfer(t: ApiStockTransfer): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    reference: t.reference,
    fromItemId: t.fromItemId,
    fromItemName: t.fromItemName,
    toDepotId: t.toDepotId,
    toDepotName: t.toDepotName,
    quantity: t.quantity,
    transferDate: new Date(t.transferDate),
    performedBy: t.performedBy,
    note: t.note,
    serverUpdatedAt: new Date(t.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.stockTransfer.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } })
}

export async function syncDownStockTransfers(items: ApiStockTransfer[]): Promise<void> {
  for (const item of items) await upsertSyncedStockTransfer(item)
}

// --- Inventaires -----------------------------------------------------------------------------

function toDisplayInventoryCount(row: LocalInventoryCountRow): ApiInventoryCount {
  return {
    id: row.id,
    reference: row.reference,
    itemId: row.itemId,
    itemName: row.itemName ?? '',
    expectedQuantity: row.expectedQuantity,
    countedQuantity: row.countedQuantity,
    discrepancy: row.countedQuantity - row.expectedQuantity,
    conductedBy: row.conductedBy,
    conductedAt: row.conductedAt.toISOString(),
    note: row.note,
    updatedAt: row.updatedAt.toISOString()
  }
}

export async function getLocalInventoryCountServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.inventoryCount.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalInventoryCounts(): Promise<ApiInventoryCount[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.inventoryCount.findMany({ where: { deletedAt: null }, orderBy: { conductedAt: 'desc' } })
  return rows.map(toDisplayInventoryCount)
}

export async function createLocalInventoryCount(id: string, input: CreateInventoryCountInput): Promise<ApiInventoryCount> {
  const prisma = getPrismaClient()
  const item = await prisma.depotItem.findUnique({ where: { id: input.itemId } })
  const conductedAt = input.conductedAt ? new Date(input.conductedAt) : new Date()
  const expectedQuantity = item?.available ?? 0

  const row = await prisma.inventoryCount.create({
    data: {
      id,
      reference: `INV-LOCAL-${id.slice(0, 4).toUpperCase()}`,
      itemId: input.itemId,
      itemName: item?.name ?? null,
      expectedQuantity,
      countedQuantity: input.countedQuantity,
      conductedBy: input.conductedBy,
      conductedAt,
      note: input.note,
      syncStatus: 'PENDING'
    }
  })

  if (item && input.countedQuantity !== expectedQuantity) {
    await prisma.depotItem.update({
      where: { id: input.itemId },
      data: { available: input.countedQuantity, lastMovementAt: conductedAt }
    })
  }

  return toDisplayInventoryCount(row)
}

export async function updateLocalInventoryCount(id: string, input: UpdateInventoryCountInput): Promise<ApiInventoryCount> {
  const prisma = getPrismaClient()
  const row = await prisma.inventoryCount.update({
    where: { id },
    data: {
      conductedBy: input.conductedBy,
      conductedAt: input.conductedAt !== undefined ? new Date(input.conductedAt) : undefined,
      note: input.note === undefined ? undefined : input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayInventoryCount(row)
}

export async function softDeleteLocalInventoryCount(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.inventoryCount.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedInventoryCount(c: ApiInventoryCount): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    reference: c.reference,
    itemId: c.itemId,
    itemName: c.itemName,
    expectedQuantity: c.expectedQuantity,
    countedQuantity: c.countedQuantity,
    conductedBy: c.conductedBy,
    conductedAt: new Date(c.conductedAt),
    note: c.note,
    serverUpdatedAt: new Date(c.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.inventoryCount.upsert({ where: { id: c.id }, update: data, create: { id: c.id, ...data } })
}

export async function syncDownInventoryCounts(items: ApiInventoryCount[]): Promise<void> {
  for (const item of items) await upsertSyncedInventoryCount(item)
}

// --- Pertes / Retour ---------------------------------------------------------------------------

function toDisplayLoss(row: LocalStockLossRow): ApiStockLoss {
  return {
    id: row.id,
    reference: row.reference,
    itemId: row.itemId,
    itemName: row.itemName ?? '',
    type: row.type as ApiStockLoss['type'],
    quantity: row.quantity,
    reason: row.reason,
    occurredAt: row.occurredAt.toISOString(),
    reportedBy: row.reportedBy,
    note: row.note,
    updatedAt: row.updatedAt.toISOString()
  }
}

export async function getLocalStockLossServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.stockLoss.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalStockLosses(): Promise<ApiStockLoss[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.stockLoss.findMany({ where: { deletedAt: null }, orderBy: { occurredAt: 'desc' } })
  return rows.map(toDisplayLoss)
}

export async function createLocalStockLoss(id: string, input: CreateStockLossInput): Promise<ApiStockLoss> {
  const prisma = getPrismaClient()
  const item = await prisma.depotItem.findUnique({ where: { id: input.itemId } })
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()

  const row = await prisma.stockLoss.create({
    data: {
      id,
      reference: `PRT-LOCAL-${id.slice(0, 4).toUpperCase()}`,
      itemId: input.itemId,
      itemName: item?.name ?? null,
      type: input.type,
      quantity: input.quantity,
      reason: input.reason,
      occurredAt,
      reportedBy: input.reportedBy,
      note: input.note,
      syncStatus: 'PENDING'
    }
  })

  if (item) {
    const delta = input.type === 'RETOUR' ? input.quantity : -input.quantity
    await prisma.depotItem.update({
      where: { id: input.itemId },
      data: { available: { increment: delta }, lastMovementAt: occurredAt }
    })
  }

  return toDisplayLoss(row)
}

export async function updateLocalStockLoss(id: string, input: UpdateStockLossInput): Promise<ApiStockLoss> {
  const prisma = getPrismaClient()
  const row = await prisma.stockLoss.update({
    where: { id },
    data: {
      reason: input.reason,
      occurredAt: input.occurredAt !== undefined ? new Date(input.occurredAt) : undefined,
      reportedBy: input.reportedBy,
      note: input.note === undefined ? undefined : input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayLoss(row)
}

export async function softDeleteLocalStockLoss(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.stockLoss.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedStockLoss(l: ApiStockLoss): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    reference: l.reference,
    itemId: l.itemId,
    itemName: l.itemName,
    type: l.type,
    quantity: l.quantity,
    reason: l.reason,
    occurredAt: new Date(l.occurredAt),
    reportedBy: l.reportedBy,
    note: l.note,
    serverUpdatedAt: new Date(l.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.stockLoss.upsert({ where: { id: l.id }, update: data, create: { id: l.id, ...data } })
}

export async function syncDownStockLosses(items: ApiStockLoss[]): Promise<void> {
  for (const item of items) await upsertSyncedStockLoss(item)
}
