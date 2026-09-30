import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { nextCode } from './counter.service'
import { computeAge } from './date-utils'
import { ensurePicklistValue, PICKLIST_KEYS } from './picklist.service'
import { buildXlsxDocument } from './xlsx-export'
import { withPaidFlag } from './exam-payment.service'
import type { Employee, Gender, LabPriority, LabRequest, LabStatus, Patient } from '../generated/prisma/client'

export interface CreateLabRequestInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  requestedAt?: string
  service?: string
  analysisType: string
  priority?: LabPriority
  sample?: string
  technicianId?: string
  /** Médecin demandeur — facultatif, purement informatif (item 11 PETITES MODIFS). */
  requestingDoctorId?: string
  status?: LabStatus
}

export interface UpdateLabRequestInput {
  patientId?: string | null
  technicianId?: string | null
  requestingDoctorId?: string | null
  requestedAt?: string
  resultAt?: string | null
  service?: string | null
  analysisType?: string
  priority?: LabPriority
  sample?: string | null
  status?: LabStatus
  /** Dernière version connue (`updatedAt`) de la fiche, pour détecter un conflit si elle a été
   * modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
}

type LabRequestWithRelations = LabRequest & {
  patient: Patient | null
  technician: Employee | null
  requestingDoctor: Employee | null
}

function technicianDisplayName(technician: Employee | null): string | null {
  return technician ? `${technician.firstName}. ${technician.lastName}` : null
}

function toDisplay(r: LabRequestWithRelations) {
  return {
    id: r.id,
    requestNumber: r.requestNumber,
    requestedAt: r.requestedAt.toISOString(),
    resultAt: r.resultAt?.toISOString() ?? null,
    service: r.service,
    analysisType: r.analysisType,
    status: r.status,
    priority: r.priority,
    sample: r.sample,
    patientId: r.patientId,
    patientName: r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : r.patientName,
    patientCode: r.patient?.code ?? r.patientCode,
    age: r.patient ? computeAge(r.patient.birthDate) : r.patientAge,
    gender: r.patient?.gender ?? r.patientGender,
    technicianId: r.technicianId,
    technicianName: technicianDisplayName(r.technician),
    requestingDoctorId: r.requestingDoctorId,
    requestingDoctorName: technicianDisplayName(r.requestingDoctor),
    resultFileName: r.resultFileName,
    resultMimeType: r.resultMimeType,
    resultFileSize: r.resultFileSize,
    updatedAt: r.updatedAt.toISOString()
  }
}

export interface UploadedFile {
  fileName: string
  mimeType: string
  content: Buffer
}

// Un seul fichier de résultat par demande — même principe qu'Imagerie/Cardiologie.
export async function uploadLabResultFile(id: string, file: UploadedFile) {
  const prisma = getPrismaClient()
  const request = await prisma.labRequest.update({
    where: { id },
    data: {
      resultFileName: file.fileName,
      resultMimeType: file.mimeType,
      resultFileSize: file.content.length,
      resultContent: new Uint8Array(file.content)
    },
    include: { patient: true, technician: true, requestingDoctor: true }
  })
  return toDisplay(request)
}

export async function getLabResultFile(id: string) {
  const prisma = getPrismaClient()
  const request = await prisma.labRequest.findUnique({ where: { id } })
  if (!request || request.deletedAt || !request.resultContent || !request.resultFileName) return null
  return { filename: request.resultFileName, contentBase64: Buffer.from(request.resultContent).toString('base64') }
}

export async function listLabRequests() {
  const prisma = getPrismaClient()
  const requests = await prisma.labRequest.findMany({
    where: { deletedAt: null },
    include: { patient: true, technician: true, requestingDoctor: true },
    orderBy: { requestedAt: 'desc' }
  })
  return withPaidFlag('LAB', requests.map(toDisplay))
}

// Premier domaine du rollout "Export Excel" (item 10, voir aussi xlsx-export.ts) — réutilise
// listLabRequests() plutôt que de dupliquer la requête Prisma.
export async function exportLabRequests() {
  const requests = await listLabRequests()
  return buildXlsxDocument(
    'Laboratoire',
    'Demandes d’analyses',
    [
      { header: 'N° demande', key: 'requestNumber', width: 16 },
      { header: 'Date demande', key: 'requestedAt', width: 18 },
      { header: 'Date résultat', key: 'resultAt', width: 18 },
      { header: 'Patient', key: 'patientName', width: 24 },
      { header: 'Code patient', key: 'patientCode', width: 16 },
      { header: 'Âge', key: 'age', width: 8 },
      { header: 'Sexe', key: 'gender', width: 8 },
      { header: 'Service', key: 'service', width: 18 },
      { header: "Type d'analyse", key: 'analysisType', width: 22 },
      { header: 'Priorité', key: 'priority', width: 12 },
      { header: 'Échantillon', key: 'sample', width: 16 },
      { header: 'Statut', key: 'status', width: 22 },
      { header: 'Technicien', key: 'technicianName', width: 20 }
    ],
    requests.map((r) => ({
      ...r,
      requestedAt: new Date(r.requestedAt).toLocaleString('fr-FR'),
      resultAt: r.resultAt ? new Date(r.resultAt).toLocaleString('fr-FR') : ''
    }))
  )
}

export async function deleteLabRequest(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.labRequest.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createLabRequest(input: CreateLabRequestInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.labRequest.findUnique({ where: { id: input.id }, include: { patient: true, technician: true, requestingDoctor: true } })
    if (existing) return toDisplay(existing)
  }

  const requestNumber = await nextCode('LAB', 'LAB', 5)

  const request = await prisma.labRequest.create({
    data: {
      id: input.id ?? randomUUID(),
      requestNumber,
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      requestedAt: input.requestedAt ? new Date(input.requestedAt) : new Date(),
      service: input.service,
      analysisType: input.analysisType,
      priority: input.priority ?? 'NORMALE',
      sample: input.sample,
      technicianId: input.technicianId,
      requestingDoctorId: input.requestingDoctorId,
      status: input.status ?? 'EN_ATTENTE_PRELEVEMENT'
    },
    include: { patient: true, technician: true, requestingDoctor: true }
  })
  await ensurePicklistValue(PICKLIST_KEYS.LABORATORY_ANALYSIS_TYPE, input.analysisType)
  return toDisplay(request)
}

export async function updateLabRequest(id: string, input: UpdateLabRequestInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.labRequest.findUnique({ where: { id }, include: { patient: true, technician: true, requestingDoctor: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const request = await prisma.labRequest.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      technicianId: input.technicianId === undefined ? undefined : input.technicianId,
      requestingDoctorId: input.requestingDoctorId === undefined ? undefined : input.requestingDoctorId,
      requestedAt: input.requestedAt !== undefined ? new Date(input.requestedAt) : undefined,
      resultAt: input.resultAt !== undefined ? (input.resultAt ? new Date(input.resultAt) : null) : undefined,
      service: input.service === undefined ? undefined : input.service,
      analysisType: input.analysisType,
      priority: input.priority,
      sample: input.sample === undefined ? undefined : input.sample,
      status: input.status
    },
    include: { patient: true, technician: true, requestingDoctor: true }
  })
  await ensurePicklistValue(PICKLIST_KEYS.LABORATORY_ANALYSIS_TYPE, input.analysisType)
  return toDisplay(request)
}
