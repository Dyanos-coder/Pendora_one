import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { computeAge } from './date-utils'
import type { Employee, Gender, ImagingPriority, ImagingRequest, ImagingStatus, Patient } from '../generated/prisma/client'

export interface CreateImagingRequestInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  requestedAt?: string
  examType: string
  region?: string
  service?: string
  doctorId?: string
  priority?: ImagingPriority
  status?: ImagingStatus
  expectedDurationMin?: number
}

export interface UpdateImagingRequestInput {
  patientId?: string | null
  doctorId?: string | null
  requestedAt?: string
  resultAt?: string | null
  examType?: string
  region?: string | null
  service?: string | null
  priority?: ImagingPriority
  status?: ImagingStatus
  expectedDurationMin?: number | null
}

type ImagingRequestWithRelations = ImagingRequest & { patient: Patient | null; doctor: Employee | null }

function doctorDisplayName(doctor: Employee | null): string | null {
  return doctor ? `Dr. ${doctor.lastName} ${doctor.firstName}.` : null
}

function toDisplay(r: ImagingRequestWithRelations) {
  return {
    id: r.id,
    requestedAt: r.requestedAt.toISOString(),
    resultAt: r.resultAt?.toISOString() ?? null,
    examType: r.examType,
    region: r.region,
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

export async function listImagingRequests() {
  const prisma = getPrismaClient()
  const requests = await prisma.imagingRequest.findMany({
    where: { deletedAt: null },
    include: { patient: true, doctor: true },
    orderBy: { requestedAt: 'desc' }
  })
  return requests.map(toDisplay)
}

export async function deleteImagingRequest(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.imagingRequest.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createImagingRequest(input: CreateImagingRequestInput) {
  const prisma = getPrismaClient()
  const request = await prisma.imagingRequest.create({
    data: {
      id: randomUUID(),
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      requestedAt: input.requestedAt ? new Date(input.requestedAt) : new Date(),
      examType: input.examType,
      region: input.region,
      service: input.service,
      doctorId: input.doctorId,
      priority: input.priority ?? 'NORMAL',
      status: input.status ?? 'EN_ATTENTE_LECTURE',
      expectedDurationMin: input.expectedDurationMin
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(request)
}

export async function updateImagingRequest(id: string, input: UpdateImagingRequestInput) {
  const prisma = getPrismaClient()
  const request = await prisma.imagingRequest.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      doctorId: input.doctorId === undefined ? undefined : input.doctorId,
      requestedAt: input.requestedAt !== undefined ? new Date(input.requestedAt) : undefined,
      resultAt: input.resultAt !== undefined ? (input.resultAt ? new Date(input.resultAt) : null) : undefined,
      examType: input.examType,
      region: input.region === undefined ? undefined : input.region,
      service: input.service === undefined ? undefined : input.service,
      priority: input.priority,
      status: input.status,
      expectedDurationMin: input.expectedDurationMin === undefined ? undefined : input.expectedDurationMin
    },
    include: { patient: true, doctor: true }
  })
  return toDisplay(request)
}
