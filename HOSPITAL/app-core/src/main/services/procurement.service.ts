import { randomUUID } from 'crypto'
import { getCurrentToken } from './session.store'
import {
  createGoodsReception,
  createProcurementRequest,
  createPurchaseOrder,
  deleteGoodsReception,
  deleteProcurementRequest,
  deletePurchaseOrder,
  exportProcurementRequests,
  listGoodsReceptions,
  listProcurementRequests,
  listPurchaseOrders,
  listSuppliers,
  NETWORK_ERROR_MESSAGE,
  updateGoodsReception,
  updateProcurementRequest,
  updatePurchaseOrder
} from './remote-api.client'
import { saveGeneratedDocument } from './file-export'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalProcurementRequest,
  getLocalProcurementRequestServerUpdatedAt,
  listLocalProcurementRequests,
  softDeleteLocalProcurementRequest,
  syncDownProcurementRequests,
  updateLocalProcurementRequest,
  upsertSyncedProcurementRequest,
  createLocalPurchaseOrder,
  getLocalPurchaseOrderServerUpdatedAt,
  listLocalPurchaseOrders,
  softDeleteLocalPurchaseOrder,
  syncDownPurchaseOrders,
  updateLocalPurchaseOrder,
  upsertSyncedPurchaseOrder,
  createLocalGoodsReception,
  getLocalGoodsReceptionServerUpdatedAt,
  listLocalGoodsReceptions,
  softDeleteLocalGoodsReception,
  syncDownGoodsReceptions,
  updateLocalGoodsReception,
  upsertSyncedGoodsReception
} from './procurement-local.service'
import type {
  CreateGoodsReceptionInput,
  CreateProcurementRequestInput,
  CreatePurchaseOrderInput,
  UpdateGoodsReceptionInput,
  UpdateProcurementRequestInput,
  UpdatePurchaseOrderInput
} from '../../shared/procurement-types'

// Mode hors-ligne — Phase 3 : Approvisionnement, entité `ProcurementRequest` uniquement (voir
// Plan-Mode-Hors-Ligne-Synchronisation.md). `suppliers()` reste en ligne uniquement (référentiel
// non couvert). Les onglets « Besoins exprimés »/« Demandes d'achat » sont deux vues filtrées de
// ce même `list()` (voir ProcurementPage.tsx, item 13) — un seul dispatcher couvre les deux.

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

export async function list() {
  const remote = await listProcurementRequests(requireToken())
  if (remote.ok) {
    await syncDownProcurementRequests(remote.data.requests)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { requests: await listLocalProcurementRequests() } }
  }
  return remote
}

export function suppliers() {
  return listSuppliers(requireToken())
}

export async function create(input: CreateProcurementRequestInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createProcurementRequest(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedProcurementRequest(remote.data.request)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const request = await createLocalProcurementRequest(id, input)
  await enqueue('procurementRequest', id, 'CREATE', { ...input, id })
  return { ok: true, data: { request } }
}

export async function update(id: string, input: UpdateProcurementRequestInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateProcurementRequest(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedProcurementRequest(remote.data.request)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalProcurementRequestServerUpdatedAt(id)
  const request = await updateLocalProcurementRequest(id, input)
  await enqueue('procurementRequest', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { request } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteProcurementRequest(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalProcurementRequest(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalProcurementRequest(id)
  await enqueue('procurementRequest', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export async function exportExcel(): Promise<boolean> {
  const result = await exportProcurementRequests(requireToken())
  return saveGeneratedDocument(result, "Exporter les demandes d'approvisionnement")
}

registerSyncDispatcher('procurementRequest', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateProcurementRequestInput & { id: string }
    const result = await createProcurementRequest(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedProcurementRequest(result.data.request)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateProcurementRequestInput & { id: string }
    const result = await updateProcurementRequest(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedProcurementRequest(result.data.request)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteProcurementRequest(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Commandes ----------------------------------------------------------------------------------

export async function listOrders() {
  const remote = await listPurchaseOrders(requireToken())
  if (remote.ok) {
    await syncDownPurchaseOrders(remote.data.orders)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { orders: await listLocalPurchaseOrders() } }
  }
  return remote
}

export async function addOrder(input: CreatePurchaseOrderInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createPurchaseOrder(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedPurchaseOrder(remote.data.order)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const order = await createLocalPurchaseOrder(id, input)
  await enqueue('purchaseOrder', id, 'CREATE', { ...input, id })
  return { ok: true, data: { order } }
}

export async function updateOrder(id: string, input: UpdatePurchaseOrderInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updatePurchaseOrder(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedPurchaseOrder(remote.data.order)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalPurchaseOrderServerUpdatedAt(id)
  const order = await updateLocalPurchaseOrder(id, input)
  await enqueue('purchaseOrder', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { order } }
}

export async function removeOrder(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deletePurchaseOrder(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalPurchaseOrder(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalPurchaseOrder(id)
  await enqueue('purchaseOrder', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

registerSyncDispatcher('purchaseOrder', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreatePurchaseOrderInput & { id: string }
    const result = await createPurchaseOrder(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedPurchaseOrder(result.data.order)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdatePurchaseOrderInput & { id: string }
    const result = await updatePurchaseOrder(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedPurchaseOrder(result.data.order)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deletePurchaseOrder(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Réceptions -----------------------------------------------------------------------------------

export async function listReceptions() {
  const remote = await listGoodsReceptions(requireToken())
  if (remote.ok) {
    await syncDownGoodsReceptions(remote.data.receptions)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { receptions: await listLocalGoodsReceptions() } }
  }
  return remote
}

export async function addReception(input: CreateGoodsReceptionInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createGoodsReception(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedGoodsReception(remote.data.reception)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const reception = await createLocalGoodsReception(id, input)
  await enqueue('goodsReception', id, 'CREATE', { ...input, id })
  return { ok: true, data: { reception } }
}

export async function updateReception(id: string, input: UpdateGoodsReceptionInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateGoodsReception(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedGoodsReception(remote.data.reception)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalGoodsReceptionServerUpdatedAt(id)
  const reception = await updateLocalGoodsReception(id, input)
  await enqueue('goodsReception', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { reception } }
}

export async function removeReception(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteGoodsReception(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalGoodsReception(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalGoodsReception(id)
  await enqueue('goodsReception', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

registerSyncDispatcher('goodsReception', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateGoodsReceptionInput & { id: string }
    const result = await createGoodsReception(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedGoodsReception(result.data.reception)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateGoodsReceptionInput & { id: string }
    const result = await updateGoodsReception(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedGoodsReception(result.data.reception)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteGoodsReception(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
