import { randomUUID } from 'crypto'
import { getCurrentToken } from './session.store'
import { app, dialog, shell } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { basename, extname, join } from 'path'
import {
  createPathologyRequest,
  deletePathologyRequest,
  exportPathologyRequests,
  getPathologyResultFile,
  listPathologyRequests,
  NETWORK_ERROR_MESSAGE,
  pathologyPatientsFollowed,
  updatePathologyRequest,
  uploadPathologyResultFile
} from './remote-api.client'
import { saveGeneratedDocument } from './file-export'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalPathologyRequest,
  getLocalPathologyRequestServerUpdatedAt,
  listLocalPathologyRequests,
  softDeleteLocalPathologyRequest,
  syncDownPathologyRequests,
  updateLocalPathologyRequest,
  upsertSyncedPathologyRequest
} from './pathology-local.service'
import type { CreatePathologyRequestInput, UpdatePathologyRequestInput } from '../../shared/pathology-types'

// Mode hors-ligne — Phase 2 : Anatomopathologie (voir Plan-Mode-Hors-Ligne-Synchronisation.md).
// Même pattern que patients.service.ts. `patientsFollowed()` reste en ligne uniquement (agrégat).

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
  const remote = await listPathologyRequests(requireToken())
  if (remote.ok) {
    await syncDownPathologyRequests(remote.data.requests)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { requests: await listLocalPathologyRequests() } }
  }
  return remote
}

export async function create(input: CreatePathologyRequestInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createPathologyRequest(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedPathologyRequest(remote.data.request)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const request = await createLocalPathologyRequest(id, input)
  await enqueue('pathologyRequest', id, 'CREATE', { ...input, id })
  return { ok: true, data: { request } }
}

export async function update(id: string, input: UpdatePathologyRequestInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updatePathologyRequest(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedPathologyRequest(remote.data.request)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalPathologyRequestServerUpdatedAt(id)
  const request = await updateLocalPathologyRequest(id, input)
  await enqueue('pathologyRequest', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { request } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deletePathologyRequest(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalPathologyRequest(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalPathologyRequest(id)
  await enqueue('pathologyRequest', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export function patientsFollowed() {
  return pathologyPatientsFollowed(requireToken())
}

export async function exportExcel(): Promise<boolean> {
  const result = await exportPathologyRequests(requireToken())
  return saveGeneratedDocument(result, 'Exporter les demandes d’anatomopathologie')
}

// --- Fichier de résultat — en ligne uniquement, comme Laboratoire/Imagerie/Cardiologie : pas de
// miroir local du contenu, juste ses métadonnées.

const MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
}

export async function uploadResultFile(id: string) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choisir un fichier de résultat',
    properties: ['openFile'],
    filters: [{ name: 'Images et documents', extensions: ['png', 'jpg', 'jpeg', 'pdf', 'doc', 'docx'] }]
  })
  if (canceled || filePaths.length === 0) return null

  const filePath = filePaths[0]
  const mimeType = MIME_BY_EXTENSION[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  const result = await uploadPathologyResultFile(requireToken(), id, basename(filePath), mimeType, readFileSync(filePath))
  if (result.ok) await upsertSyncedPathologyRequest(result.data.request)
  return result
}

export async function viewResultFile(id: string): Promise<void> {
  const result = await getPathologyResultFile(requireToken(), id)
  if (!result.ok) throw new Error(result.error)
  const filePath = join(app.getPath('temp'), result.data.document.filename)
  writeFileSync(filePath, Buffer.from(result.data.document.contentBase64, 'base64'))
  await shell.openPath(filePath)
}

registerSyncDispatcher('pathologyRequest', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreatePathologyRequestInput & { id: string }
    const result = await createPathologyRequest(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedPathologyRequest(result.data.request)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdatePathologyRequestInput & { id: string }
    const result = await updatePathologyRequest(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedPathologyRequest(result.data.request)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deletePathologyRequest(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
