import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { computeAge } from './date-utils'
import type { Employee, Gender, LabPriority, LabRequest, LabStatus, Patient } from '../generated/prisma/client'

export interface CreateLabRequestInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: Gender
  requestedAt?: string
  service?: string
  analysisType: string
  priority?: LabPriority
  sample?: string
  technicianId?: string
  status?: LabStatus
}

export interface UpdateLabRequestInput {
  patientId?: string | null
  technicianId?: string | null
  requestedAt?: string
  resultAt?: string | null
  service?: string | null
  analysisType?: string
  priority?: LabPriority
  sample?: string | null
  status?: LabStatus
}

type LabRequestWithRelations = LabRequest & { patient: Patient | null; technician: Employee | null }

function technicianDisplayName(technician: Employee | null): string | null {
  return technician ? `${technician.firstName}. ${technician.lastName}` : null
}

function toDisplay(r: LabRequestWithRelations) {
  return {
    id: r.id,
    requestNumber: r.requestNumber,
    requestedAt: r.requestedAt.toISOString(),
    resultAt: r.resultAt?.toISOString() ?? null,
    service: r.service,
    analysisType: r.analysisType,
    status: r.status,
    priority: r.priority,
    sample: r.sample,
    patientId: r.patientId,
    patientName: r.patient ? `${r.patient.firstName} ${r.patient.lastName}` : r.patientName,
    patientCode: r.patient?.code ?? r.patientCode,
    age: r.patient ? computeAge(r.patient.birthDate) : r.patientAge,
    gender: r.patient?.gender ?? r.patientGender,
    technicianId: r.technicianId,
    technicianName: technicianDisplayName(r.technician)
  }
}

export async function listLabRequests() {
  const prisma = getPrismaClient()
  const requests = await prisma.labRequest.findMany({
    where: { deletedAt: null },
    include: { patient: true, technician: true },
    orderBy: { requestedAt: 'desc' }
  })
  return requests.map(toDisplay)
}

export async function deleteLabRequest(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.labRequest.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createLabRequest(input: CreateLabRequestInput) {
  const prisma = getPrismaClient()
  const requestNumber = await nextCode('LAB', 'LAB', 5)

  const request = await prisma.labRequest.create({
    data: {
      id: randomUUID(),
      requestNumber,
      patientId: input.patientId,
      patientName: input.patientName,
      patientCode: input.patientCode,
      patientAge: input.patientAge,
      patientGender: input.patientGender,
      requestedAt: input.requestedAt ? new Date(input.requestedAt) : new Date(),
      service: input.service,
      analysisType: input.analysisType,
      priority: input.priority ?? 'NORMALE',
      sample: input.sample,
      technicianId: input.technicianId,
      status: input.status ?? 'EN_ATTENTE_PRELEVEMENT'
    },
    include: { patient: true, technician: true }
  })
  return toDisplay(request)
}

export async function updateLabRequest(id: string, input: UpdateLabRequestInput) {
  const prisma = getPrismaClient()
  const request = await prisma.labRequest.update({
    where: { id },
    data: {
      patientId: input.patientId === undefined ? undefined : input.patientId,
      technicianId: input.technicianId === undefined ? undefined : input.technicianId,
      requestedAt: input.requestedAt !== undefined ? new Date(input.requestedAt) : undefined,
      resultAt: input.resultAt !== undefined ? (input.resultAt ? new Date(input.resultAt) : null) : undefined,
      service: input.service === undefined ? undefined : input.service,
      analysisType: input.analysisType,
      priority: input.priority,
      sample: input.sample === undefined ? undefined : input.sample,
      status: input.status
    },
    include: { patient: true, technician: true }
  })
  return toDisplay(request)
}
