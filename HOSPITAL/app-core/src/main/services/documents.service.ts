import { app, dialog, shell } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { basename, extname, join } from 'path'
import { getCurrentToken } from './session.store'
import {
  createProtocolDocument,
  deleteProtocolDocument,
  getProtocolDocumentFile,
  listProtocolDocuments,
  updateProtocolDocument,
  uploadProtocolDocumentFile,
  createSignatureRequest,
  createSignatureRequestWithFile,
  deleteMySignature,
  getMySignature,
  listSignatureRequests,
  refuseSignatureRequest,
  signSignatureRequest,
  uploadMySignature
} from './remote-api.client'
import type { CreateProtocolDocumentInput, UpdateProtocolDocumentInput } from '../../shared/documents-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listProtocolDocuments(requireToken())
}

export function create(input: CreateProtocolDocumentInput) {
  return createProtocolDocument(requireToken(), input)
}

export function update(id: string, input: UpdateProtocolDocumentInput) {
  return updateProtocolDocument(requireToken(), id, input)
}

export function remove(id: string) {
  return deleteProtocolDocument(requireToken(), id)
}

// Correspondance minimale extension → type MIME — juste assez pour les formats de documents
// hospitaliers courants ; `application/octet-stream` en repli n'empêche rien (l'ouverture via
// shell.openPath se base sur l'extension du fichier, pas sur ce type MIME transmis au serveur).
const MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.txt': 'text/plain'
}

/** Ouvre un sélecteur de fichier natif, lit le fichier choisi et l'envoie au serveur (stocké en
 * BLOB, voir documents.service.ts côté app-server) — remplace le fichier existant s'il y en
 * avait déjà un. Renvoie null si l'utilisateur annule. */
export async function uploadFile(id: string) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choisir un fichier à téléverser',
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return null

  const filePath = filePaths[0]
  const fileName = basename(filePath)
  const mimeType = MIME_BY_EXTENSION[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  const content = readFileSync(filePath)

  return uploadProtocolDocumentFile(requireToken(), id, fileName, mimeType, content)
}

/** Récupère le fichier stocké en base et l'ouvre avec la visionneuse par défaut de l'OS — même
 * logique que patients.service.ts::print (fichier temporaire + shell.openPath). */
export async function viewFile(id: string): Promise<void> {
  const token = requireToken()
  const result = await getProtocolDocumentFile(token, id)
  if (!result.ok) {
    throw new Error(result.error)
  }

  const filePath = join(app.getPath('temp'), result.data.document.filename)
  writeFileSync(filePath, Buffer.from(result.data.document.contentBase64, 'base64'))
  await shell.openPath(filePath)
}

// --- Signature électronique -------------------------------------------------------------------

export const mySignature = () => getMySignature(requireToken())
export const removeMySignature = () => deleteMySignature(requireToken())
export const signatureRequests = () => listSignatureRequests(requireToken())
export const requestSignature = (documentId: string, message: string | null) =>
  createSignatureRequest(requireToken(), documentId, message)
export const signRequest = (id: string) => signSignatureRequest(requireToken(), id)
export const refuseRequest = (id: string, reason: string) => refuseSignatureRequest(requireToken(), id, reason)

/** Le dirigeant choisit l'image de sa signature (PNG sur fond transparent de préférence). */
export async function uploadSignature() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Choisir l'image de votre signature",
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }]
  })
  if (canceled || filePaths.length === 0) return null
  const filePath = filePaths[0]
  const mimeType = extname(filePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg'
  return uploadMySignature(requireToken(), basename(filePath), mimeType, readFileSync(filePath))
}

/** Choisit un PDF sur le poste puis envoie la demande de signature. `null` si annulé. */
export async function requestSignatureWithFile(title: string, message: string | null) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choisir le document PDF à faire signer',
    properties: ['openFile'],
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  })
  if (canceled || filePaths.length === 0) return null
  const filePath = filePaths[0]
  return createSignatureRequestWithFile(requireToken(), title, message, basename(filePath), readFileSync(filePath))
}
