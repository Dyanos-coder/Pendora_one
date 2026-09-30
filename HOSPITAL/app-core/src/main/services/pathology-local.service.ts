import { getPrismaClient } from '../db/client'
import type { ApiPathologyPriority, ApiPathologyRequest, ApiPathologyStatus, CreatePathologyRequestInput, UpdatePathologyRequestInput } from '../../shared/pathology-types'
import type { PathologyRequest as LocalPathologyRequestRow, Patient as LocalPatientRow } from '../../generated/prisma/client'

// Mode hors-ligne — Phase 2 : Anatomopathologie (voir Plan-Mode-Hors-Ligne-Synchronisation.md).

function computeAge(birthDate: Date): number {
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

async function toDisplay(row: LocalPathologyRequestRow): Promise<ApiPathologyRequest> {
  let patient: LocalPatientRow | null = null
  if (row.patientId) {
    const prisma = getPrismaClient()
    patient = await prisma.patient.findUnique({ where: { id: row.patientId } })
  }
  return {
    id: row.id,
    requestedAt: row.requestedAt.toISOString(),
    resultAt: row.resultAt?.toISOString() ?? null,
    sampleType: row.sampleType,
    location: row.location,
    service: row.service,
    status: row.status as ApiPathologyStatus,
    priority: row.priority as ApiPathologyPriority,
    expectedDurationMin: row.expectedDurationMin,
    patientId: row.patientId,
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : row.patientName,
    patientCode: patient?.code ?? row.patientCode,
    age: patient ? computeAge(patient.birthDate) : row.patientAge,
    gender: (patient?.gender ?? row.patientGender) as 'M' | 'F' | null,
    doctorId: row.doctorId,
    doctorName: row.doctorName,
    resultFileName: row.resultFileName,
    resultMimeType: row.resultMimeType,
    resultFileSize: row.resultFileSize,
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Version serveur connue (`serverUpdatedAt`) de la fiche, si déjà synchronisée — `undefined` si
 * la fiche n'a jamais été confirmée par le serveur (création encore PENDING) ou n'existe pas
 * localement, auquel cas aucune vérification de conflit n'est possible ni nécessaire (voir
 * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). */
export async function getLocalPathologyRequestServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.pathologyRequest.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalPathologyRequests(): Promise<ApiPathologyRequest[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.pathologyRequest.findMany({ where: { deletedAt: null }, orderBy: { requestedAt: 'desc' } })
  return Promise.all(rows.map(toDisplay))
}

export async function createLocalPathologyRequest(id: string, input: CreatePathologyRequestInput): Promise<ApiPathologyRequest> {
  const prisma = getPrismaClient()
  const row = await prisma.pathologyRequest.create({
    data: {
      id,
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
      expectedDurationMin: input.expectedDurationMin,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalPathologyRequest(id: string, input: UpdatePathologyRequestInput): Promise<ApiPathologyRequest> {
  const prisma = getPrismaClient()
  const row = await prisma.pathologyRequest.update({
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
      expectedDurationMin: input.expectedDurationMin === undefined ? undefined : input.expectedDurationMin,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalPathologyRequest(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.pathologyRequest.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedPathologyRequest(r: ApiPathologyRequest): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    patientId: r.patientId,
    patientName: r.patientName,
    patientCode: r.patientCode,
    patientAge: r.age,
    patientGender: r.gender,
    requestedAt: new Date(r.requestedAt),
    resultAt: r.resultAt ? new Date(r.resultAt) : null,
    sampleType: r.sampleType,
    location: r.location,
    service: r.service,
    doctorId: r.doctorId,
    doctorName: r.doctorName,
    resultFileName: r.resultFileName,
    resultMimeType: r.resultMimeType,
    resultFileSize: r.resultFileSize,
    status: r.status,
    priority: r.priority,
    expectedDurationMin: r.expectedDurationMin,
    serverUpdatedAt: new Date(r.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.pathologyRequest.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } })
}

export async function syncDownPathologyRequests(items: ApiPathologyRequest[]): Promise<void> {
  for (const r of items) {
    await upsertSyncedPathologyRequest(r)
  }
}
