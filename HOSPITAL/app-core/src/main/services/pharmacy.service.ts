import { randomUUID } from 'crypto'
import { getCurrentToken } from './session.store'
import { createMedication, deleteMedication, listMedications, NETWORK_ERROR_MESSAGE, updateMedication } from './remote-api.client'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalMedication,
  getLocalMedicationServerUpdatedAt,
  listLocalMedications,
  softDeleteLocalMedication,
  syncDownMedications,
  updateLocalMedication,
  upsertSyncedMedication
} from './pharmacy-local.service'
import type { CreateMedicationInput, UpdateMedicationInput } from '../../shared/pharmacy-types'

// Mode hors-ligne — Phase 2 : Pharmacie (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Même
// pattern que patients.service.ts — le plus simple des 9 domaines (pas de patientId, pas de code).

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
  const remote = await listMedications(requireToken())
  if (remote.ok) {
    await syncDownMedications(remote.data.medications)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { medications: await listLocalMedications() } }
  }
  return remote
}

export async function create(input: CreateMedicationInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createMedication(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedMedication(remote.data.medication)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const medication = await createLocalMedication(id, input)
  await enqueue('medication', id, 'CREATE', { ...input, id })
  return { ok: true, data: { medication } }
}

export async function update(id: string, input: UpdateMedicationInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateMedication(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedMedication(remote.data.medication)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalMedicationServerUpdatedAt(id)
  const medication = await updateLocalMedication(id, input)
  await enqueue('medication', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { medication } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteMedication(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalMedication(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalMedication(id)
  await enqueue('medication', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

registerSyncDispatcher('medication', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateMedicationInput & { id: string }
    const result = await createMedication(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedMedication(result.data.medication)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateMedicationInput & { id: string }
    const result = await updateMedication(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedMedication(result.data.medication)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteMedication(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
