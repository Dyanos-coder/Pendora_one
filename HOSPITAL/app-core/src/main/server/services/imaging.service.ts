import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { computeAge } from './date-utils'
import { buildXlsxDocument } from './xlsx-export'
import { withPaidFlag } from './exam-payment.service'
import type { Employee, Gender, ImagingPriority, ImagingRequest, ImagingStatus, Patient } from '../generated/prisma/client'

export interface CreateImagingRequestInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  requestedAt?: string
  examType: string
  region?: string
  service?: string
  doctorId?: string
  priority?: ImagingPriority
  status?: ImagingStatus
  expectedDurationMin?: number
}

export interface UpdateImagingRequestInput {
  patientId?: string | null
  doctorId?: string | null
  requestedAt?: string
  resultAt?: string | null
  examType?: string
  region?: string | null
  service?: string | null
  priority?: ImagingPriority
  status?: ImagingStatus
  expectedDurationMin?: number | null
  /** Dernière version connue (`updatedAt`) de la fiche, pour détecter un conflit si elle a été
   * modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
}

type ImagingRequestWithRelations = ImagingRequest & { patient: Patient | null; doctor: Employee | null }

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function toDisplay(r: ImagingRequestWithRelations) {
  return {
    id: r.id,
    requestedAt: r.requestedAt.toISOString(),
    resultAt: r.resultAt?.toISOString() ?? null,
    examType: r.examType,
    region: r.region,
    service: r.service,
    status: r.status,
    priority: r.priority,
    expectedDurationMin: r.expectedDurationMin,
    patientId: r.patientId,
    patientName: r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : r.patientName,
    patientCode: r.patient?.code ?? r.patientCode,
    age: r.patient ? computeAge(r.patient.birthDate) : r.patientAge,
    gender: r.patient?.gender ?? r.patientGender,
    doctorId: r.doctorId,
    doctorName: doctorDisplayName(r.doctor),
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

// Un seul fichier de résultat par examen (item 9 PETITES MODIFS) — remplace le précédent si on
// téléverse à nouveau, pas d'historique de versions (même choix que PatientDocument par fiche).
export async function uploadImagingResultFile(id: string, file: UploadedFile) {
  const prisma = getPrismaClient()
  const request = await prisma.imagingRequest.update({
    where: { id },
    data: {
      resultFileName: file.fileName,
      resultMimeType: file.mimeType,
      resultFileSize: file.content.length,
      resultContent: new Uint8Array(file.content)
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(request)
}

export async function getImagingResultFile(id: string) {
  const prisma = getPrismaClient()
  const request = await prisma.imagingRequest.findUnique({ where: { id } })
  if (!request || request.deletedAt || !request.resultContent || !request.resultFileName) return null
  return { filename: request.resultFileName, contentBase64: Buffer.from(request.resultContent).toString('base64') }
}

export async function listImagingRequests() {
  const prisma = getPrismaClient()
  const requests = await prisma.imagingRequest.findMany({
    where: { deletedAt: null },
    include: { patient: true, doctor: true },
    orderBy: { requestedAt: 'desc' }
  })
  return withPaidFlag('IMAGING', requests.map(toDisplay))
}

// Rollout "Export Excel" (item 10, voir xlsx-export.ts) — réutilise listImagingRequests()
// plutôt que de dupliquer la requête Prisma.
export async function exportImagingRequests() {
  const requests = await listImagingRequests()
  return buildXlsxDocument(
    'Imagerie',
    'Demandes d’examens',
    [
      { header: 'Date demande', key: 'requestedAt', width: 18 },
      { header: 'Date résultat', key: 'resultAt', width: 18 },
      { header: 'Patient', key: 'patientName', width: 24 },
      { header: 'Code patient', key: 'patientCode', width: 16 },
      { header: 'Âge', key: 'age', width: 8 },
      { header: 'Sexe', key: 'gender', width: 8 },
      { header: 'Service', key: 'service', width: 18 },
      { header: "Type d'examen", key: 'examType', width: 22 },
      { header: 'Région', key: 'region', width: 16 },
      { header: 'Priorité', key: 'priority', width: 12 },
      { header: 'Statut', key: 'status', width: 22 },
      { header: 'Médecin', key: 'doctorName', width: 20 }
    ],
    requests.map((r) => ({
      ...r,
      requestedAt: new Date(r.requestedAt).toLocaleString('fr-FR'),
      resultAt: r.resultAt ? new Date(r.resultAt).toLocaleString('fr-FR') : ''
    }))
  )
}

export async function deleteImagingRequest(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.imagingRequest.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createImagingRequest(input: CreateImagingRequestInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.imagingRequest.findUnique({ where: { id: input.id }, include: { patient: true, doctor: true } })
    if (existing) return toDisplay(existing)
  }

  const request = await prisma.imagingRequest.create({
    data: {
      id: input.id ?? randomUUID(),
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      requestedAt: input.requestedAt ? new Date(input.requestedAt) : new Date(),
      examType: input.examType,
      region: input.region,
      service: input.service,
      doctorId: input.doctorId,
      priority: input.priority ?? 'NORMAL',
      status: input.status ?? 'EN_ATTENTE_LECTURE',
      expectedDurationMin: input.expectedDurationMin
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(request)
}

export async function updateImagingRequest(id: string, input: UpdateImagingRequestInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.imagingRequest.findUnique({ where: { id }, include: { patient: true, doctor: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const request = await prisma.imagingRequest.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      requestedAt: input.requestedAt !== undefined ? new Date(input.requestedAt) : undefined,
      resultAt: input.resultAt !== undefined ? (input.resultAt ? new Date(input.resultAt) : null) : undefined,
      examType: input.examType,
      region: input.region === undefined ? undefined : input.region,
      service: input.service === undefined ? undefined : input.service,
      priority: input.priority,
      status: input.status,
      expectedDurationMin: input.expectedDurationMin === undefined ? undefined : input.expectedDurationMin
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(request)
}
