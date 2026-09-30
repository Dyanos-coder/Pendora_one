import { getPrismaClient } from '../db/client'
import type { ApiEndoscopyPriority, ApiEndoscopyProcedure, ApiEndoscopyStatus, CreateEndoscopyProcedureInput, UpdateEndoscopyProcedureInput } from '../../shared/endoscopy-types'
import type { EndoscopyProcedure as LocalEndoscopyProcedureRow, Patient as LocalPatientRow } from '../../generated/prisma/client'

// Mode hors-ligne — Phase 2 : Endoscopie (voir Plan-Mode-Hors-Ligne-Synchronisation.md).

function computeAge(birthDate: Date): number {
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

async function toDisplay(row: LocalEndoscopyProcedureRow): Promise<ApiEndoscopyProcedure> {
  let patient: LocalPatientRow | null = null
  if (row.patientId) {
    const prisma = getPrismaClient()
    patient = await prisma.patient.findUnique({ where: { id: row.patientId } })
  }
  return {
    id: row.id,
    requestedAt: row.requestedAt.toISOString(),
    resultAt: row.resultAt?.toISOString() ?? null,
    procedureType: row.procedureType,
    indication: row.indication,
    service: row.service,
    room: row.room,
    status: row.status as ApiEndoscopyStatus,
    priority: row.priority as ApiEndoscopyPriority,
    expectedDurationMin: row.expectedDurationMin,
    patientId: row.patientId,
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : row.patientName,
    patientCode: patient?.code ?? row.patientCode,
    age: patient ? computeAge(patient.birthDate) : row.patientAge,
    gender: (patient?.gender ?? row.patientGender) as 'M' | 'F' | null,
    endoscopistId: row.endoscopistId,
    endoscopistName: row.endoscopistName,
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
export async function getLocalEndoscopyProcedureServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.endoscopyProcedure.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalEndoscopyProcedures(): Promise<ApiEndoscopyProcedure[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.endoscopyProcedure.findMany({ where: { deletedAt: null }, orderBy: { requestedAt: 'desc' } })
  return Promise.all(rows.map(toDisplay))
}

export async function createLocalEndoscopyProcedure(id: string, input: CreateEndoscopyProcedureInput): Promise<ApiEndoscopyProcedure> {
  const prisma = getPrismaClient()
  const row = await prisma.endoscopyProcedure.create({
    data: {
      id,
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      requestedAt: input.requestedAt ? new Date(input.requestedAt) : new Date(),
      procedureType: input.procedureType,
      indication: input.indication,
      service: input.service,
      endoscopistId: input.endoscopistId,
      priority: input.priority ?? 'NORMALE',
      status: input.status ?? 'EN_ATTENTE',
      expectedDurationMin: input.expectedDurationMin,
      room: input.room,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalEndoscopyProcedure(id: string, input: UpdateEndoscopyProcedureInput): Promise<ApiEndoscopyProcedure> {
  const prisma = getPrismaClient()
  const row = await prisma.endoscopyProcedure.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      endoscopistId: input.endoscopistId === undefined ? undefined : input.endoscopistId,
      requestedAt: input.requestedAt !== undefined ? new Date(input.requestedAt) : undefined,
      resultAt: input.resultAt !== undefined ? (input.resultAt ? new Date(input.resultAt) : null) : undefined,
      procedureType: input.procedureType,
      indication: input.indication === undefined ? undefined : input.indication,
      service: input.service === undefined ? undefined : input.service,
      priority: input.priority,
      status: input.status,
      expectedDurationMin: input.expectedDurationMin === undefined ? undefined : input.expectedDurationMin,
      room: input.room === undefined ? undefined : input.room,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalEndoscopyProcedure(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.endoscopyProcedure.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedEndoscopyProcedure(p: ApiEndoscopyProcedure): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    patientId: p.patientId,
    patientName: p.patientName,
    patientCode: p.patientCode,
    patientAge: p.age,
    patientGender: p.gender,
    requestedAt: new Date(p.requestedAt),
    resultAt: p.resultAt ? new Date(p.resultAt) : null,
    procedureType: p.procedureType,
    indication: p.indication,
    service: p.service,
    endoscopistId: p.endoscopistId,
    endoscopistName: p.endoscopistName,
    resultFileName: p.resultFileName,
    resultMimeType: p.resultMimeType,
    resultFileSize: p.resultFileSize,
    status: p.status,
    priority: p.priority,
    expectedDurationMin: p.expectedDurationMin,
    room: p.room,
    serverUpdatedAt: new Date(p.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.endoscopyProcedure.upsert({ where: { id: p.id }, update: data, create: { id: p.id, ...data } })
}

export async function syncDownEndoscopyProcedures(items: ApiEndoscopyProcedure[]): Promise<void> {
  for (const p of items) {
    await upsertSyncedEndoscopyProcedure(p)
  }
}
