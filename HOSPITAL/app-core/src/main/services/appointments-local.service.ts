import { getPrismaClient } from '../db/client'
import type {
  ApiAppointment,
  ApiAppointmentStatus,
  ApiAppointmentType,
  CreateAppointmentInput,
  UpdateAppointmentInput
} from '../../shared/appointment-types'
import type { Appointment as LocalAppointmentRow, Patient as LocalPatientRow } from '../../generated/prisma/client'

// Mode hors-ligne — Phase 1 : Rendez-vous (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Pas de
// code lisible à gérer ici (contrairement à Patients/Consultations) — l'id suffit.

function computeAge(birthDate: Date): number {
  const now = new Date()
  let age = now.getFullYear() - birthDate.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

async function toDisplay(row: LocalAppointmentRow): Promise<ApiAppointment> {
  let patient: LocalPatientRow | null = null
  if (row.patientId) {
    const prisma = getPrismaClient()
    patient = await prisma.patient.findUnique({ where: { id: row.patientId } })
  }
  return {
    id: row.id,
    date: row.date.toISOString(),
    durationMin: row.durationMin,
    service: row.service,
    room: row.room,
    type: row.type as ApiAppointmentType,
    motive: row.motive,
    status: row.status as ApiAppointmentStatus,
    reminder: row.reminder,
    patientId: row.patientId,
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : row.patientName,
    patientCode: patient?.code ?? null,
    patientPhone: patient?.phone ?? null,
    age: patient ? computeAge(patient.birthDate) : row.patientAge,
    doctorId: row.doctorId,
    doctorName: row.doctorName,
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Version serveur connue (`serverUpdatedAt`) du rendez-vous, si déjà synchronisé — `undefined` si
 * le rendez-vous n'a jamais été confirmé par le serveur (création encore PENDING) ou n'existe pas
 * localement, auquel cas aucune vérification de conflit n'est possible ni nécessaire (voir
 * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). */
export async function getLocalAppointmentServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.appointment.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalAppointments(): Promise<ApiAppointment[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.appointment.findMany({ where: { deletedAt: null }, orderBy: { date: 'asc' } })
  return Promise.all(rows.map(toDisplay))
}

export async function createLocalAppointment(id: string, input: CreateAppointmentInput): Promise<ApiAppointment> {
  const prisma = getPrismaClient()
  const row = await prisma.appointment.create({
    data: {
      id,
      date: new Date(input.date),
      durationMin: input.durationMin ?? 30,
      service: input.service,
      room: input.room,
      type: input.type ?? 'CONSULTATION',
      motive: input.motive,
      status: input.status ?? 'CONFIRME',
      reminder: input.reminder,
      patientId: input.patientId,
      patientName: input.patientName,
      patientAge: input.patientAge,
      doctorId: input.doctorId,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalAppointment(id: string, input: UpdateAppointmentInput): Promise<ApiAppointment> {
  const prisma = getPrismaClient()
  const row = await prisma.appointment.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      date: input.date !== undefined ? new Date(input.date) : undefined,
      durationMin: input.durationMin,
      service: input.service === undefined ? undefined : input.service,
      room: input.room === undefined ? undefined : input.room,
      type: input.type,
      motive: input.motive === undefined ? undefined : input.motive,
      status: input.status,
      reminder: input.reminder === undefined ? undefined : input.reminder,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalAppointment(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.appointment.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedAppointment(appointment: ApiAppointment): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    date: new Date(appointment.date),
    durationMin: appointment.durationMin,
    service: appointment.service,
    room: appointment.room,
    type: appointment.type,
    motive: appointment.motive,
    status: appointment.status,
    reminder: appointment.reminder,
    patientId: appointment.patientId,
    patientName: appointment.patientName,
    patientAge: appointment.age,
    doctorId: appointment.doctorId,
    doctorName: appointment.doctorName,
    serverUpdatedAt: new Date(appointment.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.appointment.upsert({ where: { id: appointment.id }, update: data, create: { id: appointment.id, ...data } })
}

export async function syncDownAppointments(appointments: ApiAppointment[]): Promise<void> {
  for (const a of appointments) {
    await upsertSyncedAppointment(a)
  }
}
