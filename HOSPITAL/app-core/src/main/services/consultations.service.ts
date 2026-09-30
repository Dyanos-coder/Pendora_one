import { randomUUID } from 'crypto'
import { app, dialog, shell } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { basename, extname, join } from 'path'
import { getCurrentToken } from './session.store'
import {
  createConsultation,
  deleteConsultation,
  exportConsultations,
  getConsultationDocument,
  listConsultations,
  NETWORK_ERROR_MESSAGE,
  updateConsultation,
  uploadConsultationDocument
} from './remote-api.client'
import { saveGeneratedDocument } from './file-export'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalConsultation,
  getLocalConsultationServerUpdatedAt,
  listLocalConsultations,
  softDeleteLocalConsultation,
  syncDownConsultations,
  updateLocalConsultation,
  upsertSyncedConsultation
} from './consultations-local.service'
import type { CreateConsultationInput, UpdateConsultationInput } from '../../shared/consultation-types'

// Mode hors-ligne — Phase 1 : Consultations (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Même
// pattern que patients.service.ts — voir ses commentaires pour le détail du raisonnement.

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
  const remote = await listConsultations(requireToken())
  if (remote.ok) {
    await syncDownConsultations(remote.data.consultations)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { consultations: await listLocalConsultations() } }
  }
  return remote
}

export async function create(input: CreateConsultationInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createConsultation(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedConsultation(remote.data.consultation)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const consultation = await createLocalConsultation(id, input)
  await enqueue('consultation', id, 'CREATE', { ...input, id })
  return { ok: true, data: { consultation } }
}

export async function update(id: string, input: UpdateConsultationInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateConsultation(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedConsultation(remote.data.consultation)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalConsultationServerUpdatedAt(id)
  const consultation = await updateLocalConsultation(id, input)
  await enqueue('consultation', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { consultation } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteConsultation(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalConsultation(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalConsultation(id)
  await enqueue('consultation', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export async function exportExcel(): Promise<boolean> {
  const result = await exportConsultations(requireToken())
  return saveGeneratedDocument(result, 'Exporter les consultations')
}

// --- Document (item 1 PETITES MODIFS) — en ligne uniquement, comme les documents patient/le
// résultat d'Imagerie : pas de miroir local du contenu.

const MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
}

export async function uploadDocument(id: string) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choisir un document (diagnostic, résultats...)',
    properties: ['openFile'],
    filters: [{ name: 'Images et documents', extensions: ['png', 'jpg', 'jpeg', 'pdf', 'doc', 'docx'] }]
  })
  if (canceled || filePaths.length === 0) return null

  const filePath = filePaths[0]
  const fileName = basename(filePath)
  const mimeType = MIME_BY_EXTENSION[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  const content = readFileSync(filePath)

  const result = await uploadConsultationDocument(requireToken(), id, fileName, mimeType, content)
  if (result.ok) await upsertSyncedConsultation(result.data.consultation)
  return result
}

export async function viewDocument(id: string): Promise<void> {
  const result = await getConsultationDocument(requireToken(), id)
  if (!result.ok) {
    throw new Error(result.error)
  }
  const filePath = join(app.getPath('temp'), result.data.document.filename)
  writeFileSync(filePath, Buffer.from(result.data.document.contentBase64, 'base64'))
  await shell.openPath(filePath)
}

registerSyncDispatcher('consultation', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateConsultationInput & { id: string }
    const result = await createConsultation(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedConsultation(result.data.consultation)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateConsultationInput & { id: string }
    const result = await updateConsultation(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedConsultation(result.data.consultation)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteConsultation(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
