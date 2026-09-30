import { randomUUID } from 'crypto'
import { getCurrentToken } from './session.store'
import {
  createSurgery,
  deleteSurgery,
  exportSurgeries,
  listOperatingRooms,
  listSurgeries,
  NETWORK_ERROR_MESSAGE,
  updateSurgery
} from './remote-api.client'
import { saveGeneratedDocument } from './file-export'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalSurgery,
  getLocalSurgeryServerUpdatedAt,
  listLocalSurgeries,
  softDeleteLocalSurgery,
  syncDownSurgeries,
  updateLocalSurgery,
  upsertSyncedSurgery
} from './operating-room-local.service'
import type { CreateSurgeryInput, UpdateSurgeryInput } from '../../shared/operating-room-types'

// Mode hors-ligne — Phase 2 : Bloc opératoire (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Même
// pattern que patients.service.ts. `rooms()` reste en ligne uniquement (référentiel non couvert).

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
  const remote = await listSurgeries(requireToken())
  if (remote.ok) {
    await syncDownSurgeries(remote.data.surgeries)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { surgeries: await listLocalSurgeries() } }
  }
  return remote
}

export async function create(input: CreateSurgeryInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createSurgery(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedSurgery(remote.data.surgery)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const surgery = await createLocalSurgery(id, input)
  await enqueue('surgery', id, 'CREATE', { ...input, id })
  return { ok: true, data: { surgery } }
}

export async function update(id: string, input: UpdateSurgeryInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateSurgery(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedSurgery(remote.data.surgery)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalSurgeryServerUpdatedAt(id)
  const surgery = await updateLocalSurgery(id, input)
  await enqueue('surgery', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { surgery } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteSurgery(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalSurgery(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalSurgery(id)
  await enqueue('surgery', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export function rooms() {
  return listOperatingRooms(requireToken())
}

export async function exportExcel(): Promise<boolean> {
  const result = await exportSurgeries(requireToken())
  return saveGeneratedDocument(result, 'Exporter les interventions chirurgicales')
}

registerSyncDispatcher('surgery', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateSurgeryInput & { id: string }
    const result = await createSurgery(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedSurgery(result.data.surgery)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateSurgeryInput & { id: string }
    const result = await updateSurgery(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedSurgery(result.data.surgery)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteSurgery(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
