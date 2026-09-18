import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { computeAge } from './date-utils'
import type { Appointment, AppointmentStatus, AppointmentType, Employee, Patient } from '../generated/prisma/client'

export interface CreateAppointmentInput {
  patientId?: string
  patientName?: string
  patientAge?: number
  doctorId?: string
  date: string
  durationMin?: number
  service?: string
  room?: string
  type?: AppointmentType
  motive?: string
  status?: AppointmentStatus
  reminder?: string
}

// Tous les champs optionnels : une modification ne porte souvent que sur un ou deux champs
// (ex. glisser-déposer dans le calendrier ne change que `date`) — pas la peine de renvoyer
// l'objet complet à chaque fois.
export interface UpdateAppointmentInput {
  patientId?: string | null
  doctorId?: string | null
  date?: string
  durationMin?: number
  service?: string | null
  room?: string | null
  type?: AppointmentType
  motive?: string | null
  status?: AppointmentStatus
  reminder?: string | null
}

type AppointmentWithRelations = Appointment & { patient: Patient | null; doctor: Employee | null }

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function toDisplay(appt: AppointmentWithRelations) {
  return {
    id: appt.id,
    date: appt.date.toISOString(),
    durationMin: appt.durationMin,
    service: appt.service,
    room: appt.room,
    type: appt.type,
    motive: appt.motive,
    status: appt.status,
    reminder: appt.reminder,
    patientId: appt.patientId,
    patientName: appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : appt.patientName,
    patientCode: appt.patient?.code ?? null,
    patientPhone: appt.patient?.phone ?? null,
    age: appt.patient ? computeAge(appt.patient.birthDate) : appt.patientAge,
    doctorId: appt.doctorId,
    doctorName: doctorDisplayName(appt.doctor)
  }
}

export async function listAppointments() {
  const prisma = getPrismaClient()
  const appointments = await prisma.appointment.findMany({
    where: { deletedAt: null },
    include: { patient: true, doctor: true },
    orderBy: { date: 'asc' }
  })
  return appointments.map(toDisplay)
}

export async function getAppointmentById(id: string) {
  const prisma = getPrismaClient()
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { patient: true, doctor: true }
  })
  return appointment && !appointment.deletedAt ? toDisplay(appointment) : null
}

/** Prochains rendez-vous confirmés/en attente d'un patient — utilisé par le dossier patient
 * agrégé (item 8, voir patients.service.ts::getPatientDossier). */
export async function listUpcomingAppointmentsByPatient(patientId: string) {
  const prisma = getPrismaClient()
  const appointments = await prisma.appointment.findMany({
    where: { patientId, deletedAt: null, date: { gte: new Date() }, status: { not: 'ANNULE' } },
    include: { patient: true, doctor: true },
    orderBy: { date: 'asc' },
    take: 10
  })
  return appointments.map(toDisplay)
}

export async function deleteAppointment(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.appointment.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function updateAppointment(id: string, input: UpdateAppointmentInput) {
  const prisma = getPrismaClient()
  const appointment = await prisma.appointment.update({
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
      reminder: input.reminder === undefined ? undefined : input.reminder
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(appointment)
}

export async function createAppointment(input: CreateAppointmentInput) {
  const prisma = getPrismaClient()
  const appointment = await prisma.appointment.create({
    data: {
      id: randomUUID(),
      patientId: input.patientId,
      patientName: input.patientName,
      patientAge: input.patientAge,
      doctorId: input.doctorId,
      date: new Date(input.date),
      durationMin: input.durationMin ?? 30,
      service: input.service,
      room: input.room,
      type: input.type ?? 'CONSULTATION',
      motive: input.motive,
      status: input.status ?? 'CONFIRME',
      reminder: input.reminder
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(appointment)
}
