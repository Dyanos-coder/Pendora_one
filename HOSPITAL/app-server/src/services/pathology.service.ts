import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { computeAge } from './date-utils'
import type { Employee, Gender, Patient, PathologyPriority, PathologyRequest, PathologyStatus } from '../generated/prisma/client'

export interface CreatePathologyRequestInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  requestedAt?: string
  sampleType: string
  location?: string
  service?: string
  doctorId?: string
  priority?: PathologyPriority
  status?: PathologyStatus
  expectedDurationMin?: number
}

export interface UpdatePathologyRequestInput {
  patientId?: string | null
  doctorId?: string | null
  requestedAt?: string
  resultAt?: string | null
  sampleType?: string
  location?: string | null
  service?: string | null
  priority?: PathologyPriority
  status?: PathologyStatus
  expectedDurationMin?: number | null
}

type PathologyRequestWithRelations = PathologyRequest & { patient: Patient | null; doctor: Employee | null }

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function toDisplay(r: PathologyRequestWithRelations) {
  return {
    id: r.id,
    requestedAt: r.requestedAt.toISOString(),
    resultAt: r.resultAt?.toISOString() ?? null,
    sampleType: r.sampleType,
    location: r.location,
    service: r.service,
    status: r.status,
    priority: r.priority,
    expectedDurationMin: r.expectedDurationMin,
    patientId: r.patientId,
    patientName: r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : r.patientName,
    patientCode: r.patient?.code ?? r.patientCode,
    age: r.patient ? computeAge(r.patient.birthDate) : r.patientAge,
    gender: r.patient?.gender ?? r.patientGender,
    doctorId: r.doctorId,
    doctorName: doctorDisplayName(r.doctor)
  }
}

export async function listPathologyRequests() {
  const prisma = getPrismaClient()
  const requests = await prisma.pathologyRequest.findMany({
    where: { deletedAt: null },
    include: { patient: true, doctor: true },
    orderBy: { requestedAt: 'desc' }
  })
  return requests.map(toDisplay)
}

export async function countDistinctPathologyPatients(): Promise<number> {
  const prisma = getPrismaClient()
  const [byPatientId, byName] = await Promise.all([
    prisma.pathologyRequest.findMany({
      where: { patientId: { not: null }, deletedAt: null },
      distinct: ['patientId'],
      select: { patientId: true }
    }),
    prisma.pathologyRequest.findMany({
      where: { patientId: null, deletedAt: null },
      distinct: ['patientName'],
      select: { patientName: true }
    })
  ])
  return byPatientId.length + byName.length
}

export async function deletePathologyRequest(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.pathologyRequest.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createPathologyRequest(input: CreatePathologyRequestInput) {
  const prisma = getPrismaClient()
  const request = await prisma.pathologyRequest.create({
    data: {
      id: randomUUID(),
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      requestedAt: input.requestedAt ? new Date(input.requestedAt) : new Date(),
      sampleType: input.sampleType,
      location: input.location,
      service: input.service,
      doctorId: input.doctorId,
      priority: input.priority ?? 'NORMALE',
      status: input.status ?? 'EN_ATTENTE_PRELEVEMENT',
      expectedDurationMin: input.expectedDurationMin
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(request)
}

export async function updatePathologyRequest(id: string, input: UpdatePathologyRequestInput) {
  const prisma = getPrismaClient()
  const request = await prisma.pathologyRequest.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      requestedAt: input.requestedAt !== undefined ? new Date(input.requestedAt) : undefined,
      resultAt: input.resultAt !== undefined ? (input.resultAt ? new Date(input.resultAt) : null) : undefined,
      sampleType: input.sampleType,
      location: input.location === undefined ? undefined : input.location,
      service: input.service === undefined ? undefined : input.service,
      priority: input.priority,
      status: input.status,
      expectedDurationMin: input.expectedDurationMin === undefined ? undefined : input.expectedDurationMin
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(request)
}
