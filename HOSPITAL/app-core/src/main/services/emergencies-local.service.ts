import { getPrismaClient } from '../db/client'
import type {
  ApiEmergencyStatus,
  ApiEmergencyVisit,
  ApiSeverity,
  CreateEmergencyVisitInput,
  UpdateEmergencyVisitInput
} from '../../shared/emergency-types'
import type { EmergencyVisit as LocalEmergencyRow, Patient as LocalPatientRow } from '../../generated/prisma/client'

// Mode hors-ligne — Phase 1 : Urgences (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Pas de
// code lisible à gérer ici — l'id suffit.

function computeAge(birthDate: Date): number {
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

function formatDuration(from: Date, to: Date): string {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

async function toDisplay(row: LocalEmergencyRow): Promise<ApiEmergencyVisit> {
  let patient: LocalPatientRow | null = null
  if (row.patientId) {
    const prisma = getPrismaClient()
    patient = await prisma.patient.findUnique({ where: { id: row.patientId } })
  }
  const end = row.dischargeTime ?? new Date()
  return {
    id: row.id,
    arrivalTime: row.arrivalTime.toISOString(),
    dischargeTime: row.dischargeTime?.toISOString() ?? null,
    motive: row.motive,
    detail: row.detail,
    severity: row.severity as ApiSeverity,
    zone: row.zone,
    status: row.status as ApiEmergencyStatus,
    outcome: row.outcome,
    duration: formatDuration(row.arrivalTime, end),
    patientId: row.patientId,
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : row.patientName,
    patientCode: patient?.code ?? row.patientCode,
    age: patient ? computeAge(patient.birthDate) : row.patientAge,
    gender: (patient?.gender ?? row.patientGender) as 'M' | 'F' | null,
    doctorId: row.doctorId,
    doctorName: row.doctorName,
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Version serveur connue (`serverUpdatedAt`) du passage, si déjà synchronisé — `undefined` si le
 * passage n'a jamais été confirmé par le serveur (création encore PENDING) ou n'existe pas
 * localement, auquel cas aucune vérification de conflit n'est possible ni nécessaire (voir
 * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). */
export async function getLocalEmergencyVisitServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.emergencyVisit.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalEmergencyVisits(): Promise<ApiEmergencyVisit[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.emergencyVisit.findMany({ where: { deletedAt: null }, orderBy: { arrivalTime: 'desc' } })
  return Promise.all(rows.map(toDisplay))
}

export async function createLocalEmergencyVisit(id: string, input: CreateEmergencyVisitInput): Promise<ApiEmergencyVisit> {
  const prisma = getPrismaClient()
  const row = await prisma.emergencyVisit.create({
    data: {
      id,
      arrivalTime: input.arrivalTime ? new Date(input.arrivalTime) : new Date(),
      motive: input.motive,
      detail: input.detail,
      severity: input.severity,
      zone: input.zone,
      status: input.status ?? 'EN_ATTENTE_TRIAGE',
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      doctorId: input.doctorId,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalEmergencyVisit(id: string, input: UpdateEmergencyVisitInput): Promise<ApiEmergencyVisit> {
  const prisma = getPrismaClient()
  const row = await prisma.emergencyVisit.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      arrivalTime: input.arrivalTime !== undefined ? new Date(input.arrivalTime) : undefined,
      dischargeTime: input.dischargeTime !== undefined ? (input.dischargeTime ? new Date(input.dischargeTime) : null) : undefined,
      motive: input.motive === undefined ? undefined : input.motive,
      detail: input.detail === undefined ? undefined : input.detail,
      severity: input.severity,
      zone: input.zone === undefined ? undefined : input.zone,
      status: input.status,
      outcome: input.outcome === undefined ? undefined : input.outcome,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalEmergencyVisit(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.emergencyVisit.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedEmergencyVisit(visit: ApiEmergencyVisit): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    arrivalTime: new Date(visit.arrivalTime),
    dischargeTime: visit.dischargeTime ? new Date(visit.dischargeTime) : null,
    motive: visit.motive,
    detail: visit.detail,
    severity: visit.severity,
    zone: visit.zone,
    status: visit.status,
    outcome: visit.outcome,
    patientId: visit.patientId,
    patientName: visit.patientName,
    patientCode: visit.patientCode,
    patientAge: visit.age,
    patientGender: visit.gender,
    doctorId: visit.doctorId,
    doctorName: visit.doctorName,
    serverUpdatedAt: new Date(visit.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.emergencyVisit.upsert({ where: { id: visit.id }, update: data, create: { id: visit.id, ...data } })
}

export async function syncDownEmergencyVisits(visits: ApiEmergencyVisit[]): Promise<void> {
  for (const v of visits) {
    await upsertSyncedEmergencyVisit(v)
  }
}
