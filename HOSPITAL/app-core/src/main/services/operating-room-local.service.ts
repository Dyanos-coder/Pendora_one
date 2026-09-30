import { getPrismaClient } from '../db/client'
import type { ApiSurgery, ApiSurgeryStatus, CreateSurgeryInput, UpdateSurgeryInput } from '../../shared/operating-room-types'
import type { Surgery as LocalSurgeryRow, Patient as LocalPatientRow } from '../../generated/prisma/client'

// Mode hors-ligne — Phase 2 : Bloc opératoire (voir Plan-Mode-Hors-Ligne-Synchronisation.md).
// `surgeonName`/`anesthetistName`/`roomName` sont des instantanés locaux (pas de miroir
// `Employee`/`OperatingRoom`, référentiel en lecture seule côté serveur).

function computeAge(birthDate: Date): number {
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

function formatMinutes(minutes: number | null): string | null {
  if (minutes === null) return null
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${hours}h ${String(rest).padStart(2, '0')}m`
}

async function toDisplay(row: LocalSurgeryRow): Promise<ApiSurgery> {
  let patient: LocalPatientRow | null = null
  if (row.patientId) {
    const prisma = getPrismaClient()
    patient = await prisma.patient.findUnique({ where: { id: row.patientId } })
  }
  return {
    id: row.id,
    scheduledAt: row.scheduledAt.toISOString(),
    procedure: row.procedure,
    procedureDetail: row.procedureDetail,
    specialty: row.specialty,
    status: row.status as ApiSurgeryStatus,
    expectedDuration: formatMinutes(row.expectedDurationMin),
    patientId: row.patientId,
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : row.patientName,
    patientCode: patient?.code ?? row.patientCode,
    age: patient ? computeAge(patient.birthDate) : row.patientAge,
    gender: (patient?.gender ?? row.patientGender) as 'M' | 'F' | null,
    surgeonId: row.surgeonId,
    surgeonName: row.surgeonName,
    anesthetistId: row.anesthetistId,
    anesthetistName: row.anesthetistName,
    roomId: row.roomId,
    roomName: row.roomName,
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Version serveur connue (`serverUpdatedAt`) de la fiche, si déjà synchronisée — `undefined` si
 * la fiche n'a jamais été confirmée par le serveur (création encore PENDING) ou n'existe pas
 * localement, auquel cas aucune vérification de conflit n'est possible ni nécessaire (voir
 * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). */
export async function getLocalSurgeryServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.surgery.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalSurgeries(): Promise<ApiSurgery[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.surgery.findMany({ where: { deletedAt: null }, orderBy: { scheduledAt: 'asc' } })
  return Promise.all(rows.map(toDisplay))
}

export async function createLocalSurgery(id: string, input: CreateSurgeryInput): Promise<ApiSurgery> {
  const prisma = getPrismaClient()
  const row = await prisma.surgery.create({
    data: {
      id,
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      scheduledAt: new Date(input.scheduledAt),
      procedure: input.procedure,
      procedureDetail: input.procedureDetail,
      specialty: input.specialty,
      surgeonId: input.surgeonId,
      anesthetistId: input.anesthetistId,
      roomId: input.roomId,
      status: input.status ?? 'EN_ATTENTE',
      expectedDurationMin: input.expectedDurationMin,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalSurgery(id: string, input: UpdateSurgeryInput): Promise<ApiSurgery> {
  const prisma = getPrismaClient()
  const row = await prisma.surgery.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      surgeonId: input.surgeonId === undefined ? undefined : input.surgeonId,
      anesthetistId: input.anesthetistId === undefined ? undefined : input.anesthetistId,
      roomId: input.roomId === undefined ? undefined : input.roomId,
      scheduledAt: input.scheduledAt !== undefined ? new Date(input.scheduledAt) : undefined,
      procedure: input.procedure,
      procedureDetail: input.procedureDetail === undefined ? undefined : input.procedureDetail,
      specialty: input.specialty === undefined ? undefined : input.specialty,
      status: input.status,
      expectedDurationMin: input.expectedDurationMin === undefined ? undefined : input.expectedDurationMin,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalSurgery(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.surgery.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedSurgery(s: ApiSurgery): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    patientId: s.patientId,
    patientName: s.patientName,
    patientCode: s.patientCode,
    patientAge: s.age,
    patientGender: s.gender,
    scheduledAt: new Date(s.scheduledAt),
    procedure: s.procedure,
    procedureDetail: s.procedureDetail,
    specialty: s.specialty,
    surgeonId: s.surgeonId,
    surgeonName: s.surgeonName,
    anesthetistId: s.anesthetistId,
    anesthetistName: s.anesthetistName,
    roomId: s.roomId,
    roomName: s.roomName,
    status: s.status,
    serverUpdatedAt: new Date(s.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.surgery.upsert({ where: { id: s.id }, update: data, create: { id: s.id, ...data } })
}

export async function syncDownSurgeries(items: ApiSurgery[]): Promise<void> {
  for (const s of items) {
    await upsertSyncedSurgery(s)
  }
}
