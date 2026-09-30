import { randomUUID } from 'crypto'
import { getCurrentToken } from './session.store'
import {
  createDepotItem,
  deleteDepotItem,
  exportDepotItems,
  listDepotItems,
  listDepots,
  NETWORK_ERROR_MESSAGE,
  updateDepotItem,
  listStockMovements,
  createStockMovement,
  updateStockMovement,
  deleteStockMovement,
  listStockTransfers,
  createStockTransfer,
  updateStockTransfer,
  deleteStockTransfer,
  listInventoryCounts,
  createInventoryCount,
  updateInventoryCount,
  deleteInventoryCount,
  listStockLosses,
  createStockLoss,
  updateStockLoss,
  deleteStockLoss,
  getStockAnalysis
} from './remote-api.client'
import { saveGeneratedDocument } from './file-export'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalDepotItem,
  getLocalDepotItemServerUpdatedAt,
  listLocalDepotItems,
  softDeleteLocalDepotItem,
  syncDownDepotItems,
  updateLocalDepotItem,
  upsertSyncedDepotItem,
  createLocalStockMovement,
  getLocalStockMovementServerUpdatedAt,
  listLocalStockMovements,
  softDeleteLocalStockMovement,
  syncDownStockMovements,
  updateLocalStockMovement,
  upsertSyncedStockMovement,
  createLocalStockTransfer,
  getLocalStockTransferServerUpdatedAt,
  listLocalStockTransfers,
  softDeleteLocalStockTransfer,
  syncDownStockTransfers,
  updateLocalStockTransfer,
  upsertSyncedStockTransfer,
  createLocalInventoryCount,
  getLocalInventoryCountServerUpdatedAt,
  listLocalInventoryCounts,
  softDeleteLocalInventoryCount,
  syncDownInventoryCounts,
  updateLocalInventoryCount,
  upsertSyncedInventoryCount,
  createLocalStockLoss,
  getLocalStockLossServerUpdatedAt,
  listLocalStockLosses,
  softDeleteLocalStockLoss,
  syncDownStockLosses,
  updateLocalStockLoss,
  upsertSyncedStockLoss
} from './stocks-local.service'
import type {
  CreateDepotItemInput,
  UpdateDepotItemInput,
  CreateStockMovementInput,
  UpdateStockMovementInput,
  CreateStockTransferInput,
  UpdateStockTransferInput,
  CreateInventoryCountInput,
  UpdateInventoryCountInput,
  CreateStockLossInput,
  UpdateStockLossInput
} from '../../shared/stocks-types'

// Mode hors-ligne — Phase 3 (DepotItem) + extension aux sous-onglets (Mouvements/Transferts/
// Inventaires/Pertes, voir Plan-Mode-Hors-Ligne-Synchronisation.md). `depots()` reste en ligne
// uniquement (référentiel `Depot`, non couvert par un miroir local).

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

function isNetworkError(error: string): boolean {
  return error === NETWORK_ERROR_MESSAGE
}

export function depots() {
  return listDepots(requireToken())
}

export async function items() {
  const remote = await listDepotItems(requireToken())
  if (remote.ok) {
    await syncDownDepotItems(remote.data.items)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { items: await listLocalDepotItems() } }
  }
  return remote
}

export async function create(input: CreateDepotItemInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createDepotItem(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedDepotItem(remote.data.item)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const item = await createLocalDepotItem(id, input)
  await enqueue('depotItem', id, 'CREATE', { ...input, id })
  return { ok: true, data: { item } }
}

export async function update(id: string, input: UpdateDepotItemInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateDepotItem(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedDepotItem(remote.data.item)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalDepotItemServerUpdatedAt(id)
  const item = await updateLocalDepotItem(id, input)
  await enqueue('depotItem', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { item } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteDepotItem(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalDepotItem(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalDepotItem(id)
  await enqueue('depotItem', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export async function exportExcel(): Promise<boolean> {
  const result = await exportDepotItems(requireToken())
  return saveGeneratedDocument(result, 'Exporter les articles de dépôt')
}

registerSyncDispatcher('depotItem', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateDepotItemInput & { id: string }
    const result = await createDepotItem(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedDepotItem(result.data.item)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateDepotItemInput & { id: string }
    const result = await updateDepotItem(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedDepotItem(result.data.item)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteDepotItem(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Mouvements ---------------------------------------------------------------------------------

export async function listMovements() {
  const remote = await listStockMovements(requireToken())
  if (remote.ok) {
    await syncDownStockMovements(remote.data.movements)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { movements: await listLocalStockMovements() } }
  }
  return remote
}

export async function addMovement(input: CreateStockMovementInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createStockMovement(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedStockMovement(remote.data.movement)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const movement = await createLocalStockMovement(id, input)
  await enqueue('stockMovement', id, 'CREATE', { ...input, id })
  return { ok: true, data: { movement } }
}

export async function updateMovement(id: string, input: UpdateStockMovementInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateStockMovement(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedStockMovement(remote.data.movement)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalStockMovementServerUpdatedAt(id)
  const movement = await updateLocalStockMovement(id, input)
  await enqueue('stockMovement', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { movement } }
}

export async function removeMovement(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteStockMovement(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalStockMovement(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalStockMovement(id)
  await enqueue('stockMovement', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

registerSyncDispatcher('stockMovement', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateStockMovementInput & { id: string }
    const result = await createStockMovement(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedStockMovement(result.data.movement)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateStockMovementInput & { id: string }
    const result = await updateStockMovement(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedStockMovement(result.data.movement)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteStockMovement(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Transferts -----------------------------------------------------------------------------------

export async function listTransfers() {
  const remote = await listStockTransfers(requireToken())
  if (remote.ok) {
    await syncDownStockTransfers(remote.data.transfers)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { transfers: await listLocalStockTransfers() } }
  }
  return remote
}

export async function addTransfer(input: CreateStockTransferInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createStockTransfer(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedStockTransfer(remote.data.transfer)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const transfer = await createLocalStockTransfer(id, input)
  await enqueue('stockTransfer', id, 'CREATE', { ...input, id })
  return { ok: true, data: { transfer } }
}

export async function updateTransfer(id: string, input: UpdateStockTransferInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateStockTransfer(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedStockTransfer(remote.data.transfer)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalStockTransferServerUpdatedAt(id)
  const transfer = await updateLocalStockTransfer(id, input)
  await enqueue('stockTransfer', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { transfer } }
}

export async function removeTransfer(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteStockTransfer(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalStockTransfer(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalStockTransfer(id)
  await enqueue('stockTransfer', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

registerSyncDispatcher('stockTransfer', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateStockTransferInput & { id: string }
    const result = await createStockTransfer(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedStockTransfer(result.data.transfer)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateStockTransferInput & { id: string }
    const result = await updateStockTransfer(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedStockTransfer(result.data.transfer)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteStockTransfer(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Inventaires ----------------------------------------------------------------------------------

export async function listInventory() {
  const remote = await listInventoryCounts(requireToken())
  if (remote.ok) {
    await syncDownInventoryCounts(remote.data.counts)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { counts: await listLocalInventoryCounts() } }
  }
  return remote
}

export async function addInventoryCount(input: CreateInventoryCountInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createInventoryCount(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedInventoryCount(remote.data.count)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const count = await createLocalInventoryCount(id, input)
  await enqueue('inventoryCount', id, 'CREATE', { ...input, id })
  return { ok: true, data: { count } }
}

export async function updateInventory(id: string, input: UpdateInventoryCountInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateInventoryCount(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedInventoryCount(remote.data.count)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalInventoryCountServerUpdatedAt(id)
  const count = await updateLocalInventoryCount(id, input)
  await enqueue('inventoryCount', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { count } }
}

export async function removeInventoryCount(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteInventoryCount(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalInventoryCount(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalInventoryCount(id)
  await enqueue('inventoryCount', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

registerSyncDispatcher('inventoryCount', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateInventoryCountInput & { id: string }
    const result = await createInventoryCount(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedInventoryCount(result.data.count)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateInventoryCountInput & { id: string }
    const result = await updateInventoryCount(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedInventoryCount(result.data.count)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteInventoryCount(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Pertes / Retour --------------------------------------------------------------------------------

export async function listLosses() {
  const remote = await listStockLosses(requireToken())
  if (remote.ok) {
    await syncDownStockLosses(remote.data.losses)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { losses: await listLocalStockLosses() } }
  }
  return remote
}

export async function addLoss(input: CreateStockLossInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createStockLoss(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedStockLoss(remote.data.loss)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const loss = await createLocalStockLoss(id, input)
  await enqueue('stockLoss', id, 'CREATE', { ...input, id })
  return { ok: true, data: { loss } }
}

export async function updateLoss(id: string, input: UpdateStockLossInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateStockLoss(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedStockLoss(remote.data.loss)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalStockLossServerUpdatedAt(id)
  const loss = await updateLocalStockLoss(id, input)
  await enqueue('stockLoss', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { loss } }
}

export async function removeLoss(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteStockLoss(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalStockLoss(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalStockLoss(id)
  await enqueue('stockLoss', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

registerSyncDispatcher('stockLoss', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateStockLossInput & { id: string }
    const result = await createStockLoss(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedStockLoss(result.data.loss)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateStockLossInput & { id: string }
    const result = await updateStockLoss(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedStockLoss(result.data.loss)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteStockLoss(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Analyse (lecture seule) -------------------------------------------------------------------------

export function analysis() {
  return getStockAnalysis(requireToken())
}
