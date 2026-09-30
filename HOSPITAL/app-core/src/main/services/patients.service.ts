import { randomUUID } from 'crypto'
import { app, dialog, shell } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { basename, extname, join } from 'path'
import { getCurrentToken } from './session.store'
import {
  createPatient,
  createPatientDocument,
  createPatientPrescription,
  createPatientVitals,
  deletePatient,
  deletePatientDocument,
  getPatient,
  getPatientDocumentFile,
  getPatientDossier,
  getPatientPrintDocument,
  listPatientDocuments,
  listPatients,
  getVitalsFile,
  NETWORK_ERROR_MESSAGE,
  updatePatient,
  updatePatientPrescription,
  uploadPatientDocumentFile,
  uploadVitalsFile
} from './remote-api.client'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalPatient,
  getLocalPatient,
  getLocalPatientServerUpdatedAt,
  listLocalPatients,
  softDeleteLocalPatient,
  syncDownSummaries,
  updateLocalPatient,
  upsertSyncedPatient
} from './patients-local.service'
import type {
  CreatePatientDocumentInput,
  CreatePatientInput,
  CreatePrescriptionInput,
  CreateVitalsInput,
  PatientApiResult,
  PatientDetail,
  PatientSummary,
  UpdatePatientInput,
  UpdatePrescriptionInput
} from '../../shared/patient-types'

// Mode hors-ligne — Phase 1 : Patients (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Ce fichier
// bascule entre le serveur et le miroir local SQLite plutôt que d'appeler `remote-api.client.ts`
// en direct — c'est le seul domaine, pour l'instant, à suivre ce pattern (les 27 autres restent
// inchangés, appel réseau direct). Portée volontairement limitée à la liste et à la
// création/modification/suppression de l'identité du patient : le dossier agrégé (consultations,
// vitaux, ordonnances, résultats, chronologie — `dossier()`/`addVitals()`/`addPrescription()`)
// reste en ligne uniquement, il agrège 5+ domaines cliniques qui n'ont pas leur propre miroir
// local, ce serait un chantier à part entière (Phase 2+).

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

export async function list(): Promise<PatientApiResult<{ patients: PatientSummary[] }>> {
  const remote = await listPatients(requireToken())
  if (remote.ok) {
    await syncDownSummaries(remote.data.patients)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { patients: await listLocalPatients() } }
  }
  return remote
}

export async function get(id: string): Promise<PatientApiResult<{ patient: PatientDetail }>> {
  const remote = await getPatient(requireToken(), id)
  if (remote.ok) {
    await upsertSyncedPatient(remote.data.patient)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    const local = await getLocalPatient(id)
    if (local) return { ok: true, data: { patient: local } }
  }
  return remote
}

export async function create(input: CreatePatientInput): Promise<PatientApiResult<{ patient: PatientDetail }>> {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createPatient(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedPatient(remote.data.patient)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
    // Coupure survenue entre le dernier ping et cet appel précis : on bascule quand même en local.
  }

  const id = randomUUID()
  const patient = await createLocalPatient(id, input)
  await enqueue('patient', id, 'CREATE', { ...input, id })
  return { ok: true, data: { patient } }
}

export async function update(id: string, input: UpdatePatientInput): Promise<PatientApiResult<{ patient: PatientDetail }>> {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updatePatient(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedPatient(remote.data.patient)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalPatientServerUpdatedAt(id)
  const patient = await updateLocalPatient(id, input)
  await enqueue('patient', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { patient } }
}

export async function remove(id: string): Promise<PatientApiResult<Record<string, never>>> {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deletePatient(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalPatient(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalPatient(id)
  await enqueue('patient', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export function dossier(id: string) {
  return getPatientDossier(requireToken(), id)
}

export function addVitals(id: string, input: CreateVitalsInput) {
  return createPatientVitals(requireToken(), id, input)
}

// Alternative à la saisie manuelle des constantes (item 2 PETITES MODIFS) — en ligne uniquement.
export async function uploadVitalsDocument(patientId: string, vitalsId: string) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choisir un document de constantes',
    properties: ['openFile'],
    filters: [{ name: 'Images et documents', extensions: ['png', 'jpg', 'jpeg', 'pdf', 'doc', 'docx'] }]
  })
  if (canceled || filePaths.length === 0) return null

  const filePath = filePaths[0]
  const fileName = basename(filePath)
  const mimeType = MIME_BY_EXTENSION[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  return uploadVitalsFile(requireToken(), patientId, vitalsId, fileName, mimeType, readFileSync(filePath))
}

export async function viewVitalsDocument(patientId: string, vitalsId: string): Promise<void> {
  const result = await getVitalsFile(requireToken(), patientId, vitalsId)
  if (!result.ok) throw new Error(result.error)
  const filePath = join(app.getPath('temp'), result.data.document.filename)
  writeFileSync(filePath, Buffer.from(result.data.document.contentBase64, 'base64'))
  await shell.openPath(filePath)
}

export function addPrescription(id: string, input: CreatePrescriptionInput) {
  return createPatientPrescription(requireToken(), id, input)
}

export function updatePrescription(id: string, prescriptionId: string, input: UpdatePrescriptionInput) {
  return updatePatientPrescription(requireToken(), id, prescriptionId, input)
}

/** Récupère le PDF généré par app-server puis l'ouvre avec la visionneuse par défaut de l'OS
 * (prêt à imprimer via Ctrl+P côté visionneuse) — pas de boîte "Enregistrer sous" ici,
 * contrairement à reports.service.ts::download, car l'intention d'un clic sur "Imprimer" est
 * d'ouvrir le document tout de suite, pas de choisir où le classer. */
export async function print(id: string): Promise<void> {
  const token = requireToken()
  const result = await getPatientPrintDocument(token, id)
  if (!result.ok) {
    throw new Error(result.error)
  }

  const filePath = join(app.getPath('temp'), result.data.document.filename)
  writeFileSync(filePath, Buffer.from(result.data.document.contentBase64, 'base64'))
  await shell.openPath(filePath)
}

// --- Documents patient (item 11, même logique que hr.service.ts::listDocuments et suivants) -----
// Reste en ligne uniquement, comme le reste du dossier agrégé (voir commentaire en tête de fichier).

export function listDocuments(patientId: string) {
  return listPatientDocuments(requireToken(), patientId)
}

export function addDocument(input: CreatePatientDocumentInput) {
  return createPatientDocument(requireToken(), input)
}

export function removeDocument(patientId: string, documentId: string) {
  return deletePatientDocument(requireToken(), patientId, documentId)
}

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

export async function uploadDocumentFile(patientId: string, documentId: string) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choisir un fichier à téléverser',
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return null

  const filePath = filePaths[0]
  const fileName = basename(filePath)
  const mimeType = MIME_BY_EXTENSION[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  const content = readFileSync(filePath)

  return uploadPatientDocumentFile(requireToken(), patientId, documentId, fileName, mimeType, content)
}

export async function viewDocumentFile(patientId: string, documentId: string): Promise<void> {
  const token = requireToken()
  const result = await getPatientDocumentFile(token, patientId, documentId)
  if (!result.ok) {
    throw new Error(result.error)
  }

  const filePath = join(app.getPath('temp'), result.data.document.filename)
  writeFileSync(filePath, Buffer.from(result.data.document.contentBase64, 'base64'))
  await shell.openPath(filePath)
}

// --- Synchronisation (Phase 1) -----------------------------------------------------------------
// Enregistré une seule fois au chargement de ce module (avant que startSyncWorker() ne tourne,
// voir main/index.ts) — traite les entrées d'outbox de type "patient" en rejouant l'opération
// d'origine vers le serveur avec les mêmes fonctions remote-api.client.ts que le chemin en ligne.

registerSyncDispatcher('patient', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreatePatientInput & { id: string }
    const result = await createPatient(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedPatient(result.data.patient)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdatePatientInput & { id: string }
    const result = await updatePatient(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedPatient(result.data.patient)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deletePatient(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
