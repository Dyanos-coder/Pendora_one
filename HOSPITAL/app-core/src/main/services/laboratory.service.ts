import { randomUUID } from 'crypto'
import { getCurrentToken } from './session.store'
import { app, dialog, shell } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { basename, extname, join } from 'path'
import {
  createLabRequest,
  deleteLabRequest,
  exportLabRequests,
  getLabResultFile,
  listLabRequests,
  NETWORK_ERROR_MESSAGE,
  updateLabRequest,
  uploadLabResultFile
} from './remote-api.client'
import { saveGeneratedDocument } from './file-export'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalLabRequest,
  getLocalLabRequestServerUpdatedAt,
  listLocalLabRequests,
  softDeleteLocalLabRequest,
  syncDownLabRequests,
  updateLocalLabRequest,
  upsertSyncedLabRequest
} from './laboratory-local.service'
import type { CreateLabRequestInput, UpdateLabRequestInput } from '../../shared/laboratory-types'

// Mode hors-ligne — Phase 2 : Laboratoire (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Même
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
  const remote = await listLabRequests(requireToken())
  if (remote.ok) {
    await syncDownLabRequests(remote.data.requests)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { requests: await listLocalLabRequests() } }
  }
  return remote
}

export async function create(input: CreateLabRequestInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createLabRequest(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedLabRequest(remote.data.request)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const request = await createLocalLabRequest(id, input)
  await enqueue('labRequest', id, 'CREATE', { ...input, id })
  return { ok: true, data: { request } }
}

export async function update(id: string, input: UpdateLabRequestInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateLabRequest(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedLabRequest(remote.data.request)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalLabRequestServerUpdatedAt(id)
  const request = await updateLocalLabRequest(id, input)
  await enqueue('labRequest', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { request } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteLabRequest(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalLabRequest(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalLabRequest(id)
  await enqueue('labRequest', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export async function exportExcel(): Promise<boolean> {
  const result = await exportLabRequests(requireToken())
  return saveGeneratedDocument(result, 'Exporter les demandes d’analyses')
}

// --- Fichier de résultat — en ligne uniquement, comme Imagerie/Cardiologie : pas de miroir local
// du contenu, juste ses métadonnées (voir laboratory-local.service.ts).

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
  const result = await uploadLabResultFile(requireToken(), id, basename(filePath), mimeType, readFileSync(filePath))
  if (result.ok) await upsertSyncedLabRequest(result.data.request)
  return result
}

export async function viewResultFile(id: string): Promise<void> {
  const result = await getLabResultFile(requireToken(), id)
  if (!result.ok) throw new Error(result.error)
  const filePath = join(app.getPath('temp'), result.data.document.filename)
  writeFileSync(filePath, Buffer.from(result.data.document.contentBase64, 'base64'))
  await shell.openPath(filePath)
}

registerSyncDispatcher('labRequest', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateLabRequestInput & { id: string }
    const result = await createLabRequest(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedLabRequest(result.data.request)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateLabRequestInput & { id: string }
    const result = await updateLabRequest(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedLabRequest(result.data.request)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteLabRequest(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
