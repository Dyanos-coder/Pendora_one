import { getPrismaClient } from '../db/client'
import type {
  ApiHospitalization,
  ApiHospitalizationStatus,
  CreateHospitalizationInput,
  UpdateHospitalizationInput
} from '../../shared/hospitalization-types'
import type { Hospitalization as LocalHospitalizationRow, Patient as LocalPatientRow } from '../../generated/prisma/client'

// Mode hors-ligne — Phase 2 : Hospitalisation (voir Plan-Mode-Hors-Ligne-Synchronisation.md).
// `bedRoom`/`bedLabel`/`doctorName` sont des instantanés propres au miroir local (pas de miroir
// de `Bed`/`Employee`, référentiels non couverts) — repris tels quels depuis la dernière synchro.

function formatDuration(from: Date, to: Date): string {
  const hours = Math.max(0, Math.round((to.getTime() - from.getTime()) / 3600000))
  if (hours < 24) return `${hours} h`
  const days = Math.round(hours / 24)
  return `${days} jour${days > 1 ? 's' : ''}`
}

async function toDisplay(row: LocalHospitalizationRow): Promise<ApiHospitalization> {
  let patient: LocalPatientRow | null = null
  if (row.patientId) {
    const prisma = getPrismaClient()
    patient = await prisma.patient.findUnique({ where: { id: row.patientId } })
  }
  const end = row.dischargeDate ?? new Date()
  return {
    id: row.id,
    admissionDate: row.admissionDate.toISOString(),
    dischargeDate: row.dischargeDate?.toISOString() ?? null,
    service: row.service,
    motive: row.motive,
    status: row.status as ApiHospitalizationStatus,
    stayDuration: formatDuration(row.admissionDate, end),
    patientId: row.patientId,
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : row.patientName,
    patientCode: patient?.code ?? row.patientCode,
    room: row.bedRoom,
    bed: row.bedLabel,
    bedId: row.bedId,
    doctorId: row.doctorId,
    doctorName: row.doctorName,
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Version serveur connue (`serverUpdatedAt`) de l'hospitalisation, si déjà synchronisée —
 * `undefined` si l'hospitalisation n'a jamais été confirmée par le serveur (création encore
 * PENDING) ou n'existe pas localement, auquel cas aucune vérification de conflit n'est possible
 * ni nécessaire (voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). */
export async function getLocalHospitalizationServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.hospitalization.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalHospitalizations(): Promise<ApiHospitalization[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.hospitalization.findMany({ where: { deletedAt: null }, orderBy: { admissionDate: 'desc' } })
  return Promise.all(rows.map(toDisplay))
}

export async function createLocalHospitalization(id: string, input: CreateHospitalizationInput): Promise<ApiHospitalization> {
  const prisma = getPrismaClient()
  const row = await prisma.hospitalization.create({
    data: {
      id,
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      bedId: input.bedId,
      doctorId: input.doctorId,
      admissionDate: new Date(input.admissionDate),
      service: input.service,
      motive: input.motive,
      status: input.status ?? 'EN_ATTENTE',
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalHospitalization(id: string, input: UpdateHospitalizationInput): Promise<ApiHospitalization> {
  const prisma = getPrismaClient()
  const row = await prisma.hospitalization.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      bedId: input.bedId === undefined ? undefined : input.bedId,
      admissionDate: input.admissionDate !== undefined ? new Date(input.admissionDate) : undefined,
      dischargeDate: input.dischargeDate !== undefined ? (input.dischargeDate ? new Date(input.dischargeDate) : null) : undefined,
      service: input.service === undefined ? undefined : input.service,
      motive: input.motive === undefined ? undefined : input.motive,
      status: input.status,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalHospitalization(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.hospitalization.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedHospitalization(h: ApiHospitalization): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    patientId: h.patientId,
    patientName: h.patientName,
    patientCode: h.patientCode,
    bedId: h.bedId,
    bedRoom: h.room,
    bedLabel: h.bed,
    doctorId: h.doctorId,
    doctorName: h.doctorName,
    admissionDate: new Date(h.admissionDate),
    dischargeDate: h.dischargeDate ? new Date(h.dischargeDate) : null,
    service: h.service,
    motive: h.motive,
    status: h.status,
    serverUpdatedAt: new Date(h.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.hospitalization.upsert({ where: { id: h.id }, update: data, create: { id: h.id, ...data } })
}

export async function syncDownHospitalizations(items: ApiHospitalization[]): Promise<void> {
  for (const h of items) {
    await upsertSyncedHospitalization(h)
  }
}
