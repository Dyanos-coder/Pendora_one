import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { computeAge } from './date-utils'
import type { CardioExam, CardioPriority, CardioStatus, Employee, Gender, Patient } from '../generated/prisma/client'

export interface CreateCardioExamInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  requestedAt?: string
  examType: string
  indication?: string
  doctorId?: string
  priority?: CardioPriority
  status?: CardioStatus
  expectedDurationMin?: number
  room?: string
}

export interface UpdateCardioExamInput {
  patientId?: string | null
  doctorId?: string | null
  requestedAt?: string
  resultAt?: string | null
  examType?: string
  indication?: string | null
  priority?: CardioPriority
  status?: CardioStatus
  expectedDurationMin?: number | null
  room?: string | null
}

type CardioExamWithRelations = CardioExam & { patient: Patient | null; doctor: Employee | null }

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function toDisplay(e: CardioExamWithRelations) {
  return {
    id: e.id,
    requestedAt: e.requestedAt.toISOString(),
    resultAt: e.resultAt?.toISOString() ?? null,
    examType: e.examType,
    indication: e.indication,
    room: e.room,
    status: e.status,
    priority: e.priority,
    expectedDurationMin: e.expectedDurationMin,
    patientId: e.patientId,
    patientName: e.patient ? `${e.patient.firstName} ${e.patient.lastName}` : e.patientName,
    patientCode: e.patient?.code ?? e.patientCode,
    age: e.patient ? computeAge(e.patient.birthDate) : e.patientAge,
    gender: e.patient?.gender ?? e.patientGender,
    doctorId: e.doctorId,
    doctorName: doctorDisplayName(e.doctor)
  }
}

export async function listCardioExams() {
  const prisma = getPrismaClient()
  const exams = await prisma.cardioExam.findMany({
    where: { deletedAt: null },
    include: { patient: true, doctor: true },
    orderBy: { requestedAt: 'desc' }
  })
  return exams.map(toDisplay)
}

export async function countDistinctCardioPatients(): Promise<number> {
  const prisma = getPrismaClient()
  const [byPatientId, byName] = await Promise.all([
    prisma.cardioExam.findMany({
      where: { patientId: { not: null }, deletedAt: null },
      distinct: ['patientId'],
      select: { patientId: true }
    }),
    prisma.cardioExam.findMany({
      where: { patientId: null, deletedAt: null },
      distinct: ['patientName'],
      select: { patientName: true }
    })
  ])
  return byPatientId.length + byName.length
}

export async function deleteCardioExam(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.cardioExam.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createCardioExam(input: CreateCardioExamInput) {
  const prisma = getPrismaClient()
  const exam = await prisma.cardioExam.create({
    data: {
      id: randomUUID(),
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
      room: input.room
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(exam)
}

export async function updateCardioExam(id: string, input: UpdateCardioExamInput) {
  const prisma = getPrismaClient()
  const exam = await prisma.cardioExam.update({
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
      room: input.room === undefined ? undefined : input.room
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(exam)
}
