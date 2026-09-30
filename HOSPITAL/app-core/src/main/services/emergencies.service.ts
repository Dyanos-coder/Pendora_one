import { randomUUID } from 'crypto'
import { getCurrentToken } from './session.store'
import {
  createEmergencyVisit,
  deleteEmergencyVisit,
  exportEmergencyVisits,
  listEmergencyVisits,
  NETWORK_ERROR_MESSAGE,
  updateEmergencyVisit
} from './remote-api.client'
import { saveGeneratedDocument } from './file-export'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalEmergencyVisit,
  getLocalEmergencyVisitServerUpdatedAt,
  listLocalEmergencyVisits,
  softDeleteLocalEmergencyVisit,
  syncDownEmergencyVisits,
  updateLocalEmergencyVisit,
  upsertSyncedEmergencyVisit
} from './emergencies-local.service'
import type { CreateEmergencyVisitInput, UpdateEmergencyVisitInput } from '../../shared/emergency-types'

// Mode hors-ligne — Phase 1 : Urgences (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Même
// pattern que patients.service.ts.

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
  const remote = await listEmergencyVisits(requireToken())
  if (remote.ok) {
    await syncDownEmergencyVisits(remote.data.visits)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { visits: await listLocalEmergencyVisits() } }
  }
  return remote
}

export async function create(input: CreateEmergencyVisitInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createEmergencyVisit(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedEmergencyVisit(remote.data.visit)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const visit = await createLocalEmergencyVisit(id, input)
  await enqueue('emergencyVisit', id, 'CREATE', { ...input, id })
  return { ok: true, data: { visit } }
}

export async function update(id: string, input: UpdateEmergencyVisitInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateEmergencyVisit(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedEmergencyVisit(remote.data.visit)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalEmergencyVisitServerUpdatedAt(id)
  const visit = await updateLocalEmergencyVisit(id, input)
  await enqueue('emergencyVisit', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { visit } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteEmergencyVisit(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalEmergencyVisit(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalEmergencyVisit(id)
  await enqueue('emergencyVisit', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export async function exportExcel(): Promise<boolean> {
  const result = await exportEmergencyVisits(requireToken())
  return saveGeneratedDocument(result, 'Exporter les passages aux urgences')
}

registerSyncDispatcher('emergencyVisit', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateEmergencyVisitInput & { id: string }
    const result = await createEmergencyVisit(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedEmergencyVisit(result.data.visit)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateEmergencyVisitInput & { id: string }
    const result = await updateEmergencyVisit(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedEmergencyVisit(result.data.visit)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteEmergencyVisit(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
