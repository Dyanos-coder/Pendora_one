import { randomUUID } from 'crypto'
import { getCurrentToken } from './session.store'
import {
  bedOccupancy,
  createHospitalization,
  deleteHospitalization,
  exportHospitalizations,
  listBeds,
  listHospitalizations,
  NETWORK_ERROR_MESSAGE,
  updateHospitalization
} from './remote-api.client'
import { saveGeneratedDocument } from './file-export'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalHospitalization,
  getLocalHospitalizationServerUpdatedAt,
  listLocalHospitalizations,
  softDeleteLocalHospitalization,
  syncDownHospitalizations,
  updateLocalHospitalization,
  upsertSyncedHospitalization
} from './hospitalizations-local.service'
import type { CreateHospitalizationInput, UpdateHospitalizationInput } from '../../shared/hospitalization-types'

// Mode hors-ligne — Phase 2 : Hospitalisation (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Même
// pattern que patients.service.ts. `beds()`/`occupancy()` restent en ligne uniquement (référentiel
// `Bed`, non couvert par un miroir local — voir le plan).

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
  const remote = await listHospitalizations(requireToken())
  if (remote.ok) {
    await syncDownHospitalizations(remote.data.hospitalizations)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { hospitalizations: await listLocalHospitalizations() } }
  }
  return remote
}

export async function create(input: CreateHospitalizationInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createHospitalization(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedHospitalization(remote.data.hospitalization)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const hospitalization = await createLocalHospitalization(id, input)
  await enqueue('hospitalization', id, 'CREATE', { ...input, id })
  return { ok: true, data: { hospitalization } }
}

export async function update(id: string, input: UpdateHospitalizationInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateHospitalization(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedHospitalization(remote.data.hospitalization)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalHospitalizationServerUpdatedAt(id)
  const hospitalization = await updateLocalHospitalization(id, input)
  await enqueue('hospitalization', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { hospitalization } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteHospitalization(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalHospitalization(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalHospitalization(id)
  await enqueue('hospitalization', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export function beds() {
  return listBeds(requireToken())
}

export function occupancy() {
  return bedOccupancy(requireToken())
}

export async function exportExcel(): Promise<boolean> {
  const result = await exportHospitalizations(requireToken())
  return saveGeneratedDocument(result, 'Exporter les hospitalisations')
}

registerSyncDispatcher('hospitalization', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateHospitalizationInput & { id: string }
    const result = await createHospitalization(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedHospitalization(result.data.hospitalization)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateHospitalizationInput & { id: string }
    const result = await updateHospitalization(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedHospitalization(result.data.hospitalization)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteHospitalization(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
