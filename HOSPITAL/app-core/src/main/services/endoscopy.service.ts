import { randomUUID } from 'crypto'
import { getCurrentToken } from './session.store'
import { app, dialog, shell } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { basename, extname, join } from 'path'
import {
  createEndoscopyProcedure,
  deleteEndoscopyProcedure,
  endoscopyPatientsFollowed,
  getEndoscopyResultFile,
  listEndoscopyProcedures,
  NETWORK_ERROR_MESSAGE,
  updateEndoscopyProcedure,
  uploadEndoscopyResultFile
} from './remote-api.client'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalEndoscopyProcedure,
  getLocalEndoscopyProcedureServerUpdatedAt,
  listLocalEndoscopyProcedures,
  softDeleteLocalEndoscopyProcedure,
  syncDownEndoscopyProcedures,
  updateLocalEndoscopyProcedure,
  upsertSyncedEndoscopyProcedure
} from './endoscopy-local.service'
import type { CreateEndoscopyProcedureInput, UpdateEndoscopyProcedureInput } from '../../shared/endoscopy-types'

// Mode hors-ligne — Phase 2 : Endoscopie (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Même
// pattern que patients.service.ts. `patientsFollowed()` reste en ligne uniquement (agrégat).
// Pas d'export Excel pour ce domaine (déjà le cas avant cette réécriture).

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
  const remote = await listEndoscopyProcedures(requireToken())
  if (remote.ok) {
    await syncDownEndoscopyProcedures(remote.data.procedures)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { procedures: await listLocalEndoscopyProcedures() } }
  }
  return remote
}

export async function create(input: CreateEndoscopyProcedureInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createEndoscopyProcedure(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedEndoscopyProcedure(remote.data.procedure)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const procedure = await createLocalEndoscopyProcedure(id, input)
  await enqueue('endoscopyProcedure', id, 'CREATE', { ...input, id })
  return { ok: true, data: { procedure } }
}

export async function update(id: string, input: UpdateEndoscopyProcedureInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateEndoscopyProcedure(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedEndoscopyProcedure(remote.data.procedure)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalEndoscopyProcedureServerUpdatedAt(id)
  const procedure = await updateLocalEndoscopyProcedure(id, input)
  await enqueue('endoscopyProcedure', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { procedure } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteEndoscopyProcedure(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalEndoscopyProcedure(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalEndoscopyProcedure(id)
  await enqueue('endoscopyProcedure', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export function patientsFollowed() {
  return endoscopyPatientsFollowed(requireToken())
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
  const result = await uploadEndoscopyResultFile(requireToken(), id, basename(filePath), mimeType, readFileSync(filePath))
  if (result.ok) await upsertSyncedEndoscopyProcedure(result.data.procedure)
  return result
}

export async function viewResultFile(id: string): Promise<void> {
  const result = await getEndoscopyResultFile(requireToken(), id)
  if (!result.ok) throw new Error(result.error)
  const filePath = join(app.getPath('temp'), result.data.document.filename)
  writeFileSync(filePath, Buffer.from(result.data.document.contentBase64, 'base64'))
  await shell.openPath(filePath)
}

registerSyncDispatcher('endoscopyProcedure', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateEndoscopyProcedureInput & { id: string }
    const result = await createEndoscopyProcedure(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedEndoscopyProcedure(result.data.procedure)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateEndoscopyProcedureInput & { id: string }
    const result = await updateEndoscopyProcedure(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedEndoscopyProcedure(result.data.procedure)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteEndoscopyProcedure(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
