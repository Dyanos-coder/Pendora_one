import { getPrismaClient } from '../db/client'
import type { ApiCardioExam, ApiCardioPriority, ApiCardioStatus, CreateCardioExamInput, UpdateCardioExamInput } from '../../shared/cardiology-types'
import type { CardioExam as LocalCardioExamRow, Patient as LocalPatientRow } from '../../generated/prisma/client'

// Mode hors-ligne — Phase 2 : Cardiologie (voir Plan-Mode-Hors-Ligne-Synchronisation.md).

function computeAge(birthDate: Date): number {
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

async function toDisplay(row: LocalCardioExamRow): Promise<ApiCardioExam> {
  let patient: LocalPatientRow | null = null
  if (row.patientId) {
    const prisma = getPrismaClient()
    patient = await prisma.patient.findUnique({ where: { id: row.patientId } })
  }
  return {
    id: row.id,
    requestedAt: row.requestedAt.toISOString(),
    resultAt: row.resultAt?.toISOString() ?? null,
    examType: row.examType,
    indication: row.indication,
    room: row.room,
    status: row.status as ApiCardioStatus,
    priority: row.priority as ApiCardioPriority,
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
export async function getLocalCardioExamServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.cardioExam.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalCardioExams(): Promise<ApiCardioExam[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.cardioExam.findMany({ where: { deletedAt: null }, orderBy: { requestedAt: 'desc' } })
  return Promise.all(rows.map(toDisplay))
}

export async function createLocalCardioExam(id: string, input: CreateCardioExamInput): Promise<ApiCardioExam> {
  const prisma = getPrismaClient()
  const row = await prisma.cardioExam.create({
    data: {
      id,
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      requestedAt: input.requestedAt ? new Date(input.requestedAt) : new Date(),
      examType: input.examType,
      indication: input.indication,
      doctorId: input.doctorId,
      priority: input.priority ?? 'NORMALE',
      status: input.status ?? 'EN_ATTENTE',
      expectedDurationMin: input.expectedDurationMin,
      room: input.room,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalCardioExam(id: string, input: UpdateCardioExamInput): Promise<ApiCardioExam> {
  const prisma = getPrismaClient()
  const row = await prisma.cardioExam.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      requestedAt: input.requestedAt !== undefined ? new Date(input.requestedAt) : undefined,
      resultAt: input.resultAt !== undefined ? (input.resultAt ? new Date(input.resultAt) : null) : undefined,
      examType: input.examType,
      indication: input.indication === undefined ? undefined : input.indication,
      priority: input.priority,
      status: input.status,
      expectedDurationMin: input.expectedDurationMin === undefined ? undefined : input.expectedDurationMin,
      room: input.room === undefined ? undefined : input.room,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalCardioExam(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.cardioExam.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedCardioExam(e: ApiCardioExam): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    patientId: e.patientId,
    patientName: e.patientName,
    patientCode: e.patientCode,
    patientAge: e.age,
    patientGender: e.gender,
    requestedAt: new Date(e.requestedAt),
    resultAt: e.resultAt ? new Date(e.resultAt) : null,
    examType: e.examType,
    indication: e.indication,
    doctorId: e.doctorId,
    doctorName: e.doctorName,
    status: e.status,
    priority: e.priority,
    expectedDurationMin: e.expectedDurationMin,
    room: e.room,
    resultFileName: e.resultFileName,
    resultMimeType: e.resultMimeType,
    resultFileSize: e.resultFileSize,
    serverUpdatedAt: new Date(e.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.cardioExam.upsert({ where: { id: e.id }, update: data, create: { id: e.id, ...data } })
}

export async function syncDownCardioExams(items: ApiCardioExam[]): Promise<void> {
  for (const e of items) {
    await upsertSyncedCardioExam(e)
  }
}
