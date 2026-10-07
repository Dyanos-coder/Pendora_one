import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import type {
  TransfusionRequest,
  TransfusionRequestStatus,
  TransfusionRequestUrgency,
  Patient
} from '../generated/prisma/client'

export interface CreateTransfusionRequestInput {
  patientId: string
  bloodGroup: string
  component: string
  quantityUnits: number
  urgency?: TransfusionRequestUrgency
  status?: TransfusionRequestStatus
  requestedBy: string
  requestedAt?: string
  note?: string
}

export interface UpdateTransfusionRequestInput {
  bloodGroup?: string
  component?: string
  quantityUnits?: number
  urgency?: TransfusionRequestUrgency
  status?: TransfusionRequestStatus
  requestedBy?: string
  requestedAt?: string
  note?: string | null
}

type RequestWithRelations = TransfusionRequest & { patient: Patient }

function toDisplay(r: RequestWithRelations) {
  return {
    id: r.id,
    reference: r.reference,
    patientId: r.patientId,
    patientName: `${r.patient.firstName} ${r.patient.lastName}`,
    bloodGroup: r.bloodGroup,
    component: r.component,
    quantityUnits: r.quantityUnits,
    urgency: r.urgency,
    status: r.status,
    requestedBy: r.requestedBy,
    requestedAt: r.requestedAt.toISOString(),
    note: r.note
  }
}

export async function listTransfusionRequests() {
  const prisma = getPrismaClient()
  const requests = await prisma.transfusionRequest.findMany({
    where: { deletedAt: null },
    include: { patient: true },
    orderBy: { requestedAt: 'desc' }
  })
  return requests.map(toDisplay)
}

export async function createTransfusionRequest(input: CreateTransfusionRequestInput) {
  const prisma = getPrismaClient()
  const reference = await nextCode('TRANSFUSION_REQUEST', 'DTR', 4)

  const request = await prisma.transfusionRequest.create({
    data: {
      id: randomUUID(),
      reference,
      patientId: input.patientId,
      bloodGroup: input.bloodGroup,
      component: input.component,
      quantityUnits: input.quantityUnits,
      urgency: input.urgency ?? 'NORMALE',
      status: input.status ?? 'EN_ATTENTE',
      requestedBy: input.requestedBy,
      requestedAt: input.requestedAt ? new Date(input.requestedAt) : new Date(),
      note: input.note
    },
    include: { patient: true }
  })
  return toDisplay(request)
}

export async function updateTransfusionRequest(id: string, input: UpdateTransfusionRequestInput) {
  const prisma = getPrismaClient()
  const request = await prisma.transfusionRequest.update({
    where: { id },
    data: {
      bloodGroup: input.bloodGroup,
      component: input.component,
      quantityUnits: input.quantityUnits,
      urgency: input.urgency,
      status: input.status,
      requestedBy: input.requestedBy,
      requestedAt: input.requestedAt !== undefined ? new Date(input.requestedAt) : undefined,
      note: input.note === undefined ? undefined : input.note
    },
    include: { patient: true }
  })
  return toDisplay(request)
}

export async function deleteTransfusionRequest(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.transfusionRequest.update({ where: { id }, data: { deletedAt: new Date() } })
}
