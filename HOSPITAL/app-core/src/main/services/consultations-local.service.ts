import { getPrismaClient } from '../db/client'
import type {
  ApiConsultation,
  ApiConsultationStatus,
  CreateConsultationInput,
  UpdateConsultationInput
} from '../../shared/consultation-types'
import type { Consultation as LocalConsultationRow, Patient as LocalPatientRow } from '../../generated/prisma/client'

// Mode hors-ligne — Phase 1 : Consultations (voir Plan-Mode-Hors-Ligne-Synchronisation.md).

function computeAge(birthDate: Date): number {
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

// Reproduit le même repli relation → instantané que le serveur (`patient ? ... : c.patientXxx`),
// en interrogeant le miroir local de Patient (déjà présent, voir patients-local.service.ts).
async function toDisplay(row: LocalConsultationRow): Promise<ApiConsultation> {
  let patient: LocalPatientRow | null = null
  if (row.patientId) {
    const prisma = getPrismaClient()
    patient = await prisma.patient.findUnique({ where: { id: row.patientId } })
  }
  return {
    id: row.id,
    dossier: row.dossier,
    date: row.date.toISOString(),
    service: row.service,
    motive: row.motive,
    status: row.status as ApiConsultationStatus,
    patientId: row.patientId,
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : row.patientName,
    patientCode: patient?.code ?? row.patientCode,
    age: patient ? computeAge(patient.birthDate) : row.patientAge,
    gender: (patient?.gender ?? row.patientGender) as 'M' | 'F' | null,
    doctorId: row.doctorId,
    doctorName: row.doctorName,
    documentFileName: row.documentFileName,
    documentMimeType: row.documentMimeType,
    documentFileSize: row.documentFileSize,
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Version serveur connue (`serverUpdatedAt`) de la consultation, si déjà synchronisée —
 * `undefined` si la consultation n'a jamais été confirmée par le serveur (création encore
 * PENDING) ou n'existe pas localement, auquel cas aucune vérification de conflit n'est possible
 * ni nécessaire (voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). */
export async function getLocalConsultationServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.consultation.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalConsultations(): Promise<ApiConsultation[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.consultation.findMany({ where: { deletedAt: null }, orderBy: { date: 'asc' } })
  return Promise.all(rows.map(toDisplay))
}

export async function createLocalConsultation(id: string, input: CreateConsultationInput): Promise<ApiConsultation> {
  const prisma = getPrismaClient()
  const provisionalDossier = `DOS-LOCAL-${id.slice(0, 4).toUpperCase()}`
  const row = await prisma.consultation.create({
    data: {
      id,
      dossier: provisionalDossier,
      date: new Date(input.date),
      service: input.service,
      motive: input.motive,
      status: input.status ?? 'EN_ATTENTE',
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

export async function updateLocalConsultation(id: string, input: UpdateConsultationInput): Promise<ApiConsultation> {
  const prisma = getPrismaClient()
  const row = await prisma.consultation.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      date: input.date !== undefined ? new Date(input.date) : undefined,
      service: input.service === undefined ? undefined : input.service,
      motive: input.motive === undefined ? undefined : input.motive,
      status: input.status,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalConsultation(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.consultation.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

/** Écrit/actualise le miroir local avec la version qui fait autorité (réponse serveur). */
export async function upsertSyncedConsultation(consultation: ApiConsultation): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    dossier: consultation.dossier,
    date: new Date(consultation.date),
    service: consultation.service,
    motive: consultation.motive,
    status: consultation.status,
    patientId: consultation.patientId,
    patientName: consultation.patientName,
    patientCode: consultation.patientCode,
    patientAge: consultation.age,
    patientGender: consultation.gender,
    doctorId: consultation.doctorId,
    doctorName: consultation.doctorName,
    documentFileName: consultation.documentFileName,
    documentMimeType: consultation.documentMimeType,
    documentFileSize: consultation.documentFileSize,
    serverUpdatedAt: new Date(consultation.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.consultation.upsert({ where: { id: consultation.id }, update: data, create: { id: consultation.id, ...data } })
}

export async function syncDownConsultations(consultations: ApiConsultation[]): Promise<void> {
  for (const c of consultations) {
    await upsertSyncedConsultation(c)
  }
}
