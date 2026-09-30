import { randomUUID } from 'crypto'
import { getCurrentToken } from './session.store'
import {
  createBloodPouch,
  deleteBloodPouch,
  exportBloodPouches,
  listBloodPouches,
  NETWORK_ERROR_MESSAGE,
  updateBloodPouch,
  listDonations,
  createDonation,
  updateDonation,
  deleteDonation,
  listTransfusionRequests,
  createTransfusionRequest,
  updateTransfusionRequest,
  deleteTransfusionRequest,
  listTransfusions,
  createTransfusion,
  updateTransfusion,
  deleteTransfusion,
  listBloodAnalyses,
  createBloodAnalysis,
  updateBloodAnalysis,
  deleteBloodAnalysis
} from './remote-api.client'
import { saveGeneratedDocument } from './file-export'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalBloodPouch,
  getLocalBloodPouchServerUpdatedAt,
  listLocalBloodPouches,
  softDeleteLocalBloodPouch,
  syncDownBloodPouches,
  updateLocalBloodPouch,
  upsertSyncedBloodPouch
} from './blood-bank-local.service'
import type {
  CreateBloodPouchInput,
  UpdateBloodPouchInput,
  CreateDonationInput,
  UpdateDonationInput,
  CreateTransfusionRequestInput,
  UpdateTransfusionRequestInput,
  CreateTransfusionInput,
  UpdateTransfusionInput,
  CreateBloodAnalysisInput,
  UpdateBloodAnalysisInput
} from '../../shared/blood-bank-types'

// Mode hors-ligne — Phase 2 : Banque de sang, CRUD de base des poches uniquement (voir
// Plan-Mode-Hors-Ligne-Synchronisation.md). Les sous-domaines de l'item 15 plus bas (Dons,
// Demandes, Transfusions, Analyses) restent VOLONTAIREMENT INCHANGÉS — hors périmètre.

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
  const remote = await listBloodPouches(requireToken())
  if (remote.ok) {
    await syncDownBloodPouches(remote.data.pouches)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { pouches: await listLocalBloodPouches() } }
  }
  return remote
}

export async function create(input: CreateBloodPouchInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createBloodPouch(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedBloodPouch(remote.data.pouch)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const pouch = await createLocalBloodPouch(id, input)
  await enqueue('bloodPouch', id, 'CREATE', { ...input, id })
  return { ok: true, data: { pouch } }
}

export async function update(id: string, input: UpdateBloodPouchInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateBloodPouch(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedBloodPouch(remote.data.pouch)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalBloodPouchServerUpdatedAt(id)
  const pouch = await updateLocalBloodPouch(id, input)
  await enqueue('bloodPouch', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { pouch } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteBloodPouch(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalBloodPouch(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalBloodPouch(id)
  await enqueue('bloodPouch', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export async function exportExcel(): Promise<boolean> {
  const result = await exportBloodPouches(requireToken())
  return saveGeneratedDocument(result, 'Exporter les poches de sang')
}

registerSyncDispatcher('bloodPouch', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateBloodPouchInput & { id: string }
    const result = await createBloodPouch(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedBloodPouch(result.data.pouch)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateBloodPouchInput & { id: string }
    const result = await updateBloodPouch(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedBloodPouch(result.data.pouch)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteBloodPouch(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Dons ---------------------------------------------------------------------------------------

export function listDonationsList() {
  return listDonations(requireToken())
}

export function addDonation(input: CreateDonationInput) {
  return createDonation(requireToken(), input)
}

export function updateDonationEntry(id: string, input: UpdateDonationInput) {
  return updateDonation(requireToken(), id, input)
}

export function removeDonation(id: string) {
  return deleteDonation(requireToken(), id)
}

// --- Demandes transfusionnelles --------------------------------------------------------------------

export function listRequests() {
  return listTransfusionRequests(requireToken())
}

export function addRequest(input: CreateTransfusionRequestInput) {
  return createTransfusionRequest(requireToken(), input)
}

export function updateRequest(id: string, input: UpdateTransfusionRequestInput) {
  return updateTransfusionRequest(requireToken(), id, input)
}

export function removeRequest(id: string) {
  return deleteTransfusionRequest(requireToken(), id)
}

// --- Transfusions ---------------------------------------------------------------------------------

export function listTransfusionsList() {
  return listTransfusions(requireToken())
}

export function addTransfusion(input: CreateTransfusionInput) {
  return createTransfusion(requireToken(), input)
}

export function updateTransfusionEntry(id: string, input: UpdateTransfusionInput) {
  return updateTransfusion(requireToken(), id, input)
}

export function removeTransfusion(id: string) {
  return deleteTransfusion(requireToken(), id)
}

// --- Analyses --------------------------------------------------------------------------------------

export function listAnalyses() {
  return listBloodAnalyses(requireToken())
}

export function addAnalysis(input: CreateBloodAnalysisInput) {
  return createBloodAnalysis(requireToken(), input)
}

export function updateAnalysis(id: string, input: UpdateBloodAnalysisInput) {
  return updateBloodAnalysis(requireToken(), id, input)
}

export function removeAnalysis(id: string) {
  return deleteBloodAnalysis(requireToken(), id)
}
