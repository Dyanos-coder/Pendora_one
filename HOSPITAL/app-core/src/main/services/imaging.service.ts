import { randomUUID } from 'crypto'
import { app, dialog, shell } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { basename, extname, join } from 'path'
import { getCurrentToken } from './session.store'
import {
  createImagingRequest,
  deleteImagingRequest,
  exportImagingRequests,
  getImagingResultFile,
  listImagingRequests,
  NETWORK_ERROR_MESSAGE,
  updateImagingRequest,
  uploadImagingResultFile
} from './remote-api.client'
import { saveGeneratedDocument } from './file-export'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalImagingRequest,
  getLocalImagingRequestServerUpdatedAt,
  listLocalImagingRequests,
  softDeleteLocalImagingRequest,
  syncDownImagingRequests,
  updateLocalImagingRequest,
  upsertSyncedImagingRequest
} from './imaging-local.service'
import type { CreateImagingRequestInput, UpdateImagingRequestInput } from '../../shared/imaging-types'

// Mode hors-ligne — Phase 2 : Imagerie (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Même
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
  const remote = await listImagingRequests(requireToken())
  if (remote.ok) {
    await syncDownImagingRequests(remote.data.requests)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { requests: await listLocalImagingRequests() } }
  }
  return remote
}

export async function create(input: CreateImagingRequestInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createImagingRequest(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedImagingRequest(remote.data.request)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const request = await createLocalImagingRequest(id, input)
  await enqueue('imagingRequest', id, 'CREATE', { ...input, id })
  return { ok: true, data: { request } }
}

export async function update(id: string, input: UpdateImagingRequestInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateImagingRequest(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedImagingRequest(remote.data.request)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalImagingRequestServerUpdatedAt(id)
  const request = await updateLocalImagingRequest(id, input)
  await enqueue('imagingRequest', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { request } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteImagingRequest(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalImagingRequest(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalImagingRequest(id)
  await enqueue('imagingRequest', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export async function exportExcel(): Promise<boolean> {
  const result = await exportImagingRequests(requireToken())
  return saveGeneratedDocument(result, 'Exporter les demandes d’examens')
}

// --- Fichier de résultat (item 9 PETITES MODIFS) — en ligne uniquement, comme les documents
// patient : pas de miroir local du contenu, juste ses métadonnées (voir imaging-local.service.ts).

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
  const fileName = basename(filePath)
  const mimeType = MIME_BY_EXTENSION[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  const content = readFileSync(filePath)

  const result = await uploadImagingResultFile(requireToken(), id, fileName, mimeType, content)
  if (result.ok) await upsertSyncedImagingRequest(result.data.request)
  return result
}

export async function viewResultFile(id: string): Promise<void> {
  const result = await getImagingResultFile(requireToken(), id)
  if (!result.ok) {
    throw new Error(result.error)
  }
  const filePath = join(app.getPath('temp'), result.data.document.filename)
  writeFileSync(filePath, Buffer.from(result.data.document.contentBase64, 'base64'))
  await shell.openPath(filePath)
}

registerSyncDispatcher('imagingRequest', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateImagingRequestInput & { id: string }
    const result = await createImagingRequest(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedImagingRequest(result.data.request)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateImagingRequestInput & { id: string }
    const result = await updateImagingRequest(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedImagingRequest(result.data.request)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteImagingRequest(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
