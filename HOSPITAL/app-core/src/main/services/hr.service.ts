import { getCurrentLocation } from './location.service'
import { randomUUID } from 'crypto'
import { app, dialog, shell } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { basename, extname, join } from 'path'
import { getCurrentToken } from './session.store'
import {
  checkInAttendance,
  createAttendance,
  createContract,
  createEmployeeDocument,
  createHrEmployee,
  createPayrollEntry,
  createPerformanceReview,
  createTraining,
  deleteAttendance,
  deleteContract,
  deleteEmployeeDocument,
  deleteHrEmployee,
  deletePayrollEntry,
  deletePerformanceReview,
  deleteTraining,
  exportHrEmployees,
  getEmployeeDocumentFile,
  listAttendances,
  listContracts,
  listEmployeeDocuments,
  listHrEmployees,
  listPayrollEntries,
  listPerformanceReviews,
  listTrainings,
  NETWORK_ERROR_MESSAGE,
  updateAttendance,
  updateContract,
  updateHrEmployee,
  updatePayrollEntry,
  updatePerformanceReview,
  updateTraining,
  uploadEmployeeDocumentFile
} from './remote-api.client'
import { saveGeneratedDocument } from './file-export'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalHrEmployee,
  getLocalHrEmployeeServerUpdatedAt,
  listLocalHrEmployees,
  softDeleteLocalHrEmployee,
  syncDownHrEmployees,
  updateLocalHrEmployee,
  upsertSyncedHrEmployee
} from './hr-local.service'
import type {
  CheckInAttendanceInput,
  CreateAttendanceInput,
  CreateContractInput,
  CreateEmployeeDocumentInput,
  CreateHrEmployeeInput,
  CreatePayrollEntryInput,
  CreatePerformanceReviewInput,
  CreateTrainingInput,
  UpdateAttendanceInput,
  UpdateContractInput,
  UpdateHrEmployeeInput,
  UpdatePayrollEntryInput,
  UpdatePerformanceReviewInput,
  UpdateTrainingInput
} from '../../shared/hr-types'

// Mode hors-ligne — Phase 3 : RH, entité `Employee` uniquement (voir
// Plan-Mode-Hors-Ligne-Synchronisation.md). Les sous-domaines de l'item 12 plus bas (Présences,
// Contrats, Performances, Formations, Paie, Documents) restent VOLONTAIREMENT INCHANGÉS.

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
  const remote = await listHrEmployees(requireToken())
  if (remote.ok) {
    await syncDownHrEmployees(remote.data.employees)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { employees: await listLocalHrEmployees() } }
  }
  return remote
}

export async function create(input: CreateHrEmployeeInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createHrEmployee(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedHrEmployee(remote.data.employee)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const employee = await createLocalHrEmployee(id, input)
  await enqueue('hrEmployee', id, 'CREATE', { ...input, id })
  return { ok: true, data: { employee } }
}

export async function update(id: string, input: UpdateHrEmployeeInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateHrEmployee(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedHrEmployee(remote.data.employee)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalHrEmployeeServerUpdatedAt(id)
  const employee = await updateLocalHrEmployee(id, input)
  await enqueue('hrEmployee', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { employee } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteHrEmployee(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalHrEmployee(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalHrEmployee(id)
  await enqueue('hrEmployee', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export async function exportExcel(): Promise<boolean> {
  const result = await exportHrEmployees(requireToken())
  return saveGeneratedDocument(result, 'Exporter les employés')
}

registerSyncDispatcher('hrEmployee', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateHrEmployeeInput & { id: string }
    const result = await createHrEmployee(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedHrEmployee(result.data.employee)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateHrEmployeeInput & { id: string }
    const result = await updateHrEmployee(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedHrEmployee(result.data.employee)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteHrEmployee(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Présences & Absences -----------------------------------------------------------------------

export function listAttendanceRecords() {
  return listAttendances(requireToken())
}

export function addAttendance(input: CreateAttendanceInput) {
  return createAttendance(requireToken(), input)
}

export function updateAttendanceRecord(id: string, input: UpdateAttendanceInput) {
  return updateAttendance(requireToken(), id, input)
}

export function removeAttendance(id: string) {
  return deleteAttendance(requireToken(), id)
}

/** Pointage automatique à la connexion : la position est prise ici par le service de localisation
 * de Windows (voir location.service.ts) — best-effort, l'heure est enregistrée même sans position. */
export async function checkIn(input: CheckInAttendanceInput) {
  const token = requireToken()
  let coords = input
  if (input.latitude === undefined || input.longitude === undefined) {
    const location = await getCurrentLocation()
    if (location.ok) coords = { latitude: location.latitude, longitude: location.longitude }
  }
  return checkInAttendance(token, coords)
}

// --- Contrats ---------------------------------------------------------------------------------

export function listEmployeeContracts() {
  return listContracts(requireToken())
}

export function addContract(input: CreateContractInput) {
  return createContract(requireToken(), input)
}

export function updateEmployeeContract(id: string, input: UpdateContractInput) {
  return updateContract(requireToken(), id, input)
}

export function removeContract(id: string) {
  return deleteContract(requireToken(), id)
}

// --- Performances -------------------------------------------------------------------------------

export function listReviews() {
  return listPerformanceReviews(requireToken())
}

export function addReview(input: CreatePerformanceReviewInput) {
  return createPerformanceReview(requireToken(), input)
}

export function updateReview(id: string, input: UpdatePerformanceReviewInput) {
  return updatePerformanceReview(requireToken(), id, input)
}

export function removeReview(id: string) {
  return deletePerformanceReview(requireToken(), id)
}

// --- Formations -----------------------------------------------------------------------------------

export function listEmployeeTrainings() {
  return listTrainings(requireToken())
}

export function addTraining(input: CreateTrainingInput) {
  return createTraining(requireToken(), input)
}

export function updateEmployeeTraining(id: string, input: UpdateTrainingInput) {
  return updateTraining(requireToken(), id, input)
}

export function removeTraining(id: string) {
  return deleteTraining(requireToken(), id)
}

// --- Paie -------------------------------------------------------------------------------------------

export function listPayroll() {
  return listPayrollEntries(requireToken())
}

export function addPayrollEntry(input: CreatePayrollEntryInput) {
  return createPayrollEntry(requireToken(), input)
}

export function updatePayroll(id: string, input: UpdatePayrollEntryInput) {
  return updatePayrollEntry(requireToken(), id, input)
}

export function removePayrollEntry(id: string) {
  return deletePayrollEntry(requireToken(), id)
}

// --- Documents employé (même logique que patients.service.ts::print et documents.service.ts) ------

export function listDocuments() {
  return listEmployeeDocuments(requireToken())
}

export function addDocument(input: CreateEmployeeDocumentInput) {
  return createEmployeeDocument(requireToken(), input)
}

export function removeDocument(id: string) {
  return deleteEmployeeDocument(requireToken(), id)
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

export async function uploadDocumentFile(id: string) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choisir un fichier à téléverser',
    properties: ['openFile']
  })
  if (canceled || filePaths.length === 0) return null

  const filePath = filePaths[0]
  const fileName = basename(filePath)
  const mimeType = MIME_BY_EXTENSION[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  const content = readFileSync(filePath)

  return uploadEmployeeDocumentFile(requireToken(), id, fileName, mimeType, content)
}

export async function viewDocumentFile(id: string): Promise<void> {
  const token = requireToken()
  const result = await getEmployeeDocumentFile(token, id)
  if (!result.ok) {
    throw new Error(result.error)
  }

  const filePath = join(app.getPath('temp'), result.data.document.filename)
  writeFileSync(filePath, Buffer.from(result.data.document.contentBase64, 'base64'))
  await shell.openPath(filePath)
}
