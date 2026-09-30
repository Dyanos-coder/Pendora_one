import { randomUUID } from 'crypto'
import { app, dialog, shell } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { basename, extname, join } from 'path'
import { getCurrentToken } from './session.store'
import {
  cardioPatientsFollowed,
  createCardioExam,
  deleteCardioExam,
  exportCardioExams,
  getCardioExamResultFile,
  listCardioExams,
  NETWORK_ERROR_MESSAGE,
  updateCardioExam,
  uploadCardioExamResultFile
} from './remote-api.client'
import { saveGeneratedDocument } from './file-export'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalCardioExam,
  getLocalCardioExamServerUpdatedAt,
  listLocalCardioExams,
  softDeleteLocalCardioExam,
  syncDownCardioExams,
  updateLocalCardioExam,
  upsertSyncedCardioExam
} from './cardiology-local.service'
import type { CreateCardioExamInput, UpdateCardioExamInput } from '../../shared/cardiology-types'

// Mode hors-ligne — Phase 2 : Cardiologie (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Même
// pattern que patients.service.ts. `patientsFollowed()` reste en ligne uniquement (agrégat).

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
  const remote = await listCardioExams(requireToken())
  if (remote.ok) {
    await syncDownCardioExams(remote.data.exams)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { exams: await listLocalCardioExams() } }
  }
  return remote
}

export async function create(input: CreateCardioExamInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createCardioExam(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedCardioExam(remote.data.exam)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const exam = await createLocalCardioExam(id, input)
  await enqueue('cardioExam', id, 'CREATE', { ...input, id })
  return { ok: true, data: { exam } }
}

export async function update(id: string, input: UpdateCardioExamInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateCardioExam(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedCardioExam(remote.data.exam)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalCardioExamServerUpdatedAt(id)
  const exam = await updateLocalCardioExam(id, input)
  await enqueue('cardioExam', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { exam } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteCardioExam(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalCardioExam(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalCardioExam(id)
  await enqueue('cardioExam', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export function patientsFollowed() {
  return cardioPatientsFollowed(requireToken())
}

export async function exportExcel(): Promise<boolean> {
  const result = await exportCardioExams(requireToken())
  return saveGeneratedDocument(result, 'Exporter les examens de cardiologie')
}

// --- Fichier de résultat (item 10 PETITES MODIFS) — en ligne uniquement, même principe qu'Imagerie.

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

  const result = await uploadCardioExamResultFile(requireToken(), id, fileName, mimeType, content)
  if (result.ok) await upsertSyncedCardioExam(result.data.exam)
  return result
}

export async function viewResultFile(id: string): Promise<void> {
  const result = await getCardioExamResultFile(requireToken(), id)
  if (!result.ok) {
    throw new Error(result.error)
  }
  const filePath = join(app.getPath('temp'), result.data.document.filename)
  writeFileSync(filePath, Buffer.from(result.data.document.contentBase64, 'base64'))
  await shell.openPath(filePath)
}

registerSyncDispatcher('cardioExam', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateCardioExamInput & { id: string }
    const result = await createCardioExam(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedCardioExam(result.data.exam)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateCardioExamInput & { id: string }
    const result = await updateCardioExam(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedCardioExam(result.data.exam)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteCardioExam(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
