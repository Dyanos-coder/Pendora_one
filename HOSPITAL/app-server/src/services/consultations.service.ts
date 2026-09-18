import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { computeAge } from './date-utils'
import type { Consultation, ConsultationStatus, Employee, Gender, Patient } from '../generated/prisma/client'

export interface CreateConsultationInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  doctorId?: string
  date: string
  service?: string
  motive?: string
  status?: ConsultationStatus
}

export interface UpdateConsultationInput {
  patientId?: string | null
  doctorId?: string | null
  date?: string
  service?: string | null
  motive?: string | null
  status?: ConsultationStatus
}

type ConsultationWithRelations = Consultation & { patient: Patient | null; doctor: Employee | null }

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function toDisplay(c: ConsultationWithRelations) {
  return {
    id: c.id,
    dossier: c.dossier,
    date: c.date.toISOString(),
    service: c.service,
    motive: c.motive,
    status: c.status,
    patientId: c.patientId,
    patientName: c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : c.patientName,
    patientCode: c.patient?.code ?? c.patientCode,
    age: c.patient ? computeAge(c.patient.birthDate) : c.patientAge,
    gender: c.patient?.gender ?? c.patientGender,
    doctorId: c.doctorId,
    doctorName: doctorDisplayName(c.doctor)
  }
}

export async function listConsultations() {
  const prisma = getPrismaClient()
  const consultations = await prisma.consultation.findMany({
    where: { deletedAt: null },
    include: { patient: true, doctor: true },
    orderBy: { date: 'asc' }
  })
  return consultations.map(toDisplay)
}

/** Dernières consultations d'un patient — utilisé par le dossier patient agrégé (item 8, voir
 * patients.service.ts::getPatientDossier). */
export async function listConsultationsByPatient(patientId: string) {
  const prisma = getPrismaClient()
  const consultations = await prisma.consultation.findMany({
    where: { patientId, deletedAt: null },
    include: { patient: true, doctor: true },
    orderBy: { date: 'desc' },
    take: 10
  })
  return consultations.map(toDisplay)
}

export async function deleteConsultation(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.consultation.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createConsultation(input: CreateConsultationInput) {
  const prisma = getPrismaClient()
  const dossier = await nextCode('CONSULTATION', 'DOS', 6)

  const consultation = await prisma.consultation.create({
    data: {
      id: randomUUID(),
      dossier,
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      doctorId: input.doctorId,
      date: new Date(input.date),
      service: input.service,
      motive: input.motive,
      status: input.status ?? 'EN_ATTENTE'
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(consultation)
}

export async function updateConsultation(id: string, input: UpdateConsultationInput) {
  const prisma = getPrismaClient()
  const consultation = await prisma.consultation.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      date: input.date !== undefined ? new Date(input.date) : undefined,
      service: input.service === undefined ? undefined : input.service,
      motive: input.motive === undefined ? undefined : input.motive,
      status: input.status
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(consultation)
}
