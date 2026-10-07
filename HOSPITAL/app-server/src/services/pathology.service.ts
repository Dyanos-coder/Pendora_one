import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { computeAge } from './date-utils'
import { buildXlsxDocument } from './xlsx-export'
import type { Employee, Gender, Patient, PathologyPriority, PathologyRequest, PathologyStatus } from '../generated/prisma/client'

export interface CreatePathologyRequestInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  requestedAt?: string
  sampleType: string
  location?: string
  service?: string
  doctorId?: string
  priority?: PathologyPriority
  status?: PathologyStatus
  expectedDurationMin?: number
}

export interface UpdatePathologyRequestInput {
  patientId?: string | null
  doctorId?: string | null
  requestedAt?: string
  resultAt?: string | null
  sampleType?: string
  location?: string | null
  service?: string | null
  priority?: PathologyPriority
  status?: PathologyStatus
  expectedDurationMin?: number | null
  /** Dernière version connue (`updatedAt`) du poste qui modifie, pour détecter un conflit si la
   * fiche a été modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
}

type PathologyRequestWithRelations = PathologyRequest & { patient: Patient | null; doctor: Employee | null }

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function toDisplay(r: PathologyRequestWithRelations) {
  return {
    id: r.id,
    requestedAt: r.requestedAt.toISOString(),
    resultAt: r.resultAt?.toISOString() ?? null,
    sampleType: r.sampleType,
    location: r.location,
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

export async function uploadPathologyResultFile(id: string, file: UploadedFile) {
  const prisma = getPrismaClient()
  const request = await prisma.pathologyRequest.update({
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

export async function getPathologyResultFile(id: string) {
  const prisma = getPrismaClient()
  const request = await prisma.pathologyRequest.findUnique({ where: { id } })
  if (!request || request.deletedAt || !request.resultContent || !request.resultFileName) return null
  return { filename: request.resultFileName, contentBase64: Buffer.from(request.resultContent).toString('base64') }
}

export async function listPathologyRequests() {
  const prisma = getPrismaClient()
  const requests = await prisma.pathologyRequest.findMany({
    where: { deletedAt: null },
    include: { patient: true, doctor: true },
    orderBy: { requestedAt: 'desc' }
  })
  return requests.map(toDisplay)
}

// Rollout "Export Excel" (item 10, voir xlsx-export.ts) — réutilise listPathologyRequests()
// plutôt que de dupliquer la requête Prisma.
export async function exportPathologyRequests() {
  const requests = await listPathologyRequests()
  return buildXlsxDocument(
    'Anatomopathologie',
    'Demandes d’anatomopathologie',
    [
      { header: 'Date demande', key: 'requestedAt', width: 18 },
      { header: 'Date résultat', key: 'resultAt', width: 18 },
      { header: 'Patient', key: 'patientName', width: 24 },
      { header: 'Code patient', key: 'patientCode', width: 16 },
      { header: 'Âge', key: 'age', width: 8 },
      { header: 'Sexe', key: 'gender', width: 8 },
      { header: 'Type de prélèvement', key: 'sampleType', width: 22 },
      { header: 'Localisation', key: 'location', width: 20 },
      { header: 'Service', key: 'service', width: 18 },
      { header: 'Priorité', key: 'priority', width: 12 },
      { header: 'Statut', key: 'status', width: 22 },
      { header: 'Délai prévu (min)', key: 'expectedDurationMin', width: 16 },
      { header: 'Médecin', key: 'doctorName', width: 20 }
    ],
    requests.map((r) => ({
      ...r,
      requestedAt: new Date(r.requestedAt).toLocaleString('fr-FR'),
      resultAt: r.resultAt ? new Date(r.resultAt).toLocaleString('fr-FR') : ''
    }))
  )
}

export async function countDistinctPathologyPatients(): Promise<number> {
  const prisma = getPrismaClient()
  const [byPatientId, byName] = await Promise.all([
    prisma.pathologyRequest.findMany({
      where: { patientId: { not: null }, deletedAt: null },
      distinct: ['patientId'],
      select: { patientId: true }
    }),
    prisma.pathologyRequest.findMany({
      where: { patientId: null, deletedAt: null },
      distinct: ['patientName'],
      select: { patientName: true }
    })
  ])
  return byPatientId.length + byName.length
}

export async function deletePathologyRequest(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.pathologyRequest.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createPathologyRequest(input: CreatePathologyRequestInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.pathologyRequest.findUnique({ where: { id: input.id }, include: { patient: true, doctor: true } })
    if (existing) return toDisplay(existing)
  }

  const request = await prisma.pathologyRequest.create({
    data: {
      id: input.id ?? randomUUID(),
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      requestedAt: input.requestedAt ? new Date(input.requestedAt) : new Date(),
      sampleType: input.sampleType,
      location: input.location,
      service: input.service,
      doctorId: input.doctorId,
      priority: input.priority ?? 'NORMALE',
      status: input.status ?? 'EN_ATTENTE_PRELEVEMENT',
      expectedDurationMin: input.expectedDurationMin
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(request)
}

export async function updatePathologyRequest(id: string, input: UpdatePathologyRequestInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.pathologyRequest.findUnique({ where: { id }, include: { patient: true, doctor: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const request = await prisma.pathologyRequest.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      requestedAt: input.requestedAt !== undefined ? new Date(input.requestedAt) : undefined,
      resultAt: input.resultAt !== undefined ? (input.resultAt ? new Date(input.resultAt) : null) : undefined,
      sampleType: input.sampleType,
      location: input.location === undefined ? undefined : input.location,
      service: input.service === undefined ? undefined : input.service,
      priority: input.priority,
      status: input.status,
      expectedDurationMin: input.expectedDurationMin === undefined ? undefined : input.expectedDurationMin
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(request)
}
