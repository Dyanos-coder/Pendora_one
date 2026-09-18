import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { computeAge } from './date-utils'
import type { Employee, EndoscopyPriority, EndoscopyProcedure, EndoscopyStatus, Gender, Patient } from '../generated/prisma/client'

export interface CreateEndoscopyProcedureInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  requestedAt?: string
  procedureType: string
  indication?: string
  service?: string
  endoscopistId?: string
  priority?: EndoscopyPriority
  status?: EndoscopyStatus
  expectedDurationMin?: number
  room?: string
}

export interface UpdateEndoscopyProcedureInput {
  patientId?: string | null
  endoscopistId?: string | null
  requestedAt?: string
  resultAt?: string | null
  procedureType?: string
  indication?: string | null
  service?: string | null
  priority?: EndoscopyPriority
  status?: EndoscopyStatus
  expectedDurationMin?: number | null
  room?: string | null
}

type EndoscopyProcedureWithRelations = EndoscopyProcedure & { patient: Patient | null; endoscopist: Employee | null }

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function toDisplay(p: EndoscopyProcedureWithRelations) {
  return {
    id: p.id,
    requestedAt: p.requestedAt.toISOString(),
    resultAt: p.resultAt?.toISOString() ?? null,
    procedureType: p.procedureType,
    indication: p.indication,
    room: p.room,
    status: p.status,
    priority: p.priority,
    expectedDurationMin: p.expectedDurationMin,
    patientId: p.patientId,
    patientName: p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : p.patientName,
    patientCode: p.patient?.code ?? p.patientCode,
    age: p.patient ? computeAge(p.patient.birthDate) : p.patientAge,
    gender: p.patient?.gender ?? p.patientGender,
    endoscopistId: p.endoscopistId,
    endoscopistName: doctorDisplayName(p.endoscopist)
  }
}

export async function listEndoscopyProcedures() {
  const prisma = getPrismaClient()
  const procedures = await prisma.endoscopyProcedure.findMany({
    where: { deletedAt: null },
    include: { patient: true, endoscopist: true },
    orderBy: { requestedAt: 'desc' }
  })
  return procedures.map(toDisplay)
}

export async function countDistinctEndoscopyPatients(): Promise<number> {
  const prisma = getPrismaClient()
  const [byPatientId, byName] = await Promise.all([
    prisma.endoscopyProcedure.findMany({
      where: { patientId: { not: null }, deletedAt: null },
      distinct: ['patientId'],
      select: { patientId: true }
    }),
    prisma.endoscopyProcedure.findMany({
      where: { patientId: null, deletedAt: null },
      distinct: ['patientName'],
      select: { patientName: true }
    })
  ])
  return byPatientId.length + byName.length
}

export async function deleteEndoscopyProcedure(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.endoscopyProcedure.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createEndoscopyProcedure(input: CreateEndoscopyProcedureInput) {
  const prisma = getPrismaClient()
  const procedure = await prisma.endoscopyProcedure.create({
    data: {
      id: randomUUID(),
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
      room: input.room
    },
    include: { patient: true, endoscopist: true }
  })
  return toDisplay(procedure)
}

export async function updateEndoscopyProcedure(id: string, input: UpdateEndoscopyProcedureInput) {
  const prisma = getPrismaClient()
  const procedure = await prisma.endoscopyProcedure.update({
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
      room: input.room === undefined ? undefined : input.room
    },
    include: { patient: true, endoscopist: true }
  })
  return toDisplay(procedure)
}
