import { getPrismaClient } from '../db/client'
import type { ApiLabPriority, ApiLabRequest, ApiLabStatus, CreateLabRequestInput, UpdateLabRequestInput } from '../../shared/laboratory-types'
import type { LabRequest as LocalLabRequestRow, Patient as LocalPatientRow } from '../../generated/prisma/client'

// Mode hors-ligne — Phase 2 : Laboratoire (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Seul
// domaine de la Phase 2, avec Banque de sang, à avoir un code lisible généré côté serveur
// (`requestNumber`, `nextCode('LAB','LAB',5)`) → code provisoire `LAB-LOCAL-xxxx`.

function computeAge(birthDate: Date): number {
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

async function toDisplay(row: LocalLabRequestRow): Promise<ApiLabRequest> {
  let patient: LocalPatientRow | null = null
  if (row.patientId) {
    const prisma = getPrismaClient()
    patient = await prisma.patient.findUnique({ where: { id: row.patientId } })
  }
  return {
    id: row.id,
    requestNumber: row.requestNumber,
    requestedAt: row.requestedAt.toISOString(),
    resultAt: row.resultAt?.toISOString() ?? null,
    service: row.service,
    analysisType: row.analysisType,
    status: row.status as ApiLabStatus,
    priority: row.priority as ApiLabPriority,
    sample: row.sample,
    patientId: row.patientId,
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : row.patientName,
    patientCode: patient?.code ?? row.patientCode,
    age: patient ? computeAge(patient.birthDate) : row.patientAge,
    gender: (patient?.gender ?? row.patientGender) as 'M' | 'F' | null,
    technicianId: row.technicianId,
    technicianName: row.technicianName,
    requestingDoctorId: row.requestingDoctorId,
    requestingDoctorName: row.requestingDoctorName,
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
export async function getLocalLabRequestServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.labRequest.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalLabRequests(): Promise<ApiLabRequest[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.labRequest.findMany({ where: { deletedAt: null }, orderBy: { requestedAt: 'desc' } })
  return Promise.all(rows.map(toDisplay))
}

export async function createLocalLabRequest(id: string, input: CreateLabRequestInput): Promise<ApiLabRequest> {
  const prisma = getPrismaClient()
  const provisionalNumber = `LAB-LOCAL-${id.slice(0, 4).toUpperCase()}`
  const row = await prisma.labRequest.create({
    data: {
      id,
      requestNumber: provisionalNumber,
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
      status: input.status ?? 'EN_ATTENTE_PRELEVEMENT',
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalLabRequest(id: string, input: UpdateLabRequestInput): Promise<ApiLabRequest> {
  const prisma = getPrismaClient()
  const row = await prisma.labRequest.update({
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
      status: input.status,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalLabRequest(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.labRequest.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedLabRequest(r: ApiLabRequest): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    requestNumber: r.requestNumber,
    patientId: r.patientId,
    patientName: r.patientName,
    patientCode: r.patientCode,
    patientAge: r.age,
    patientGender: r.gender,
    requestedAt: new Date(r.requestedAt),
    resultAt: r.resultAt ? new Date(r.resultAt) : null,
    service: r.service,
    analysisType: r.analysisType,
    status: r.status,
    priority: r.priority,
    sample: r.sample,
    technicianId: r.technicianId,
    technicianName: r.technicianName,
    requestingDoctorId: r.requestingDoctorId,
    requestingDoctorName: r.requestingDoctorName,
    resultFileName: r.resultFileName,
    resultMimeType: r.resultMimeType,
    resultFileSize: r.resultFileSize,
    serverUpdatedAt: new Date(r.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.labRequest.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } })
}

export async function syncDownLabRequests(items: ApiLabRequest[]): Promise<void> {
  for (const r of items) {
    await upsertSyncedLabRequest(r)
  }
}
