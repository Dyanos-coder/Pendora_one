import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import type { Transfusion, Patient, BloodPouch, TransfusionRequest } from '../generated/prisma/client'

export interface CreateTransfusionInput {
  patientId: string
  pouchId: string
  requestId?: string
  transfusedAt?: string
  administeredBy: string
  reaction?: string
}

export interface UpdateTransfusionInput {
  transfusedAt?: string
  administeredBy?: string
  reaction?: string | null
}

type TransfusionWithRelations = Transfusion & { patient: Patient; pouch: BloodPouch; request: TransfusionRequest | null }

function toDisplay(t: TransfusionWithRelations) {
  return {
    id: t.id,
    reference: t.reference,
    patientId: t.patientId,
    patientName: `${t.patient.firstName} ${t.patient.lastName}`,
    pouchId: t.pouchId,
    pouchNumber: t.pouch.pouchNumber,
    requestId: t.requestId,
    requestReference: t.request?.reference ?? null,
    transfusedAt: t.transfusedAt.toISOString(),
    administeredBy: t.administeredBy,
    reaction: t.reaction
  }
}

export async function listTransfusions() {
  const prisma = getPrismaClient()
  const transfusions = await prisma.transfusion.findMany({
    where: { deletedAt: null },
    include: { patient: true, pouch: true, request: true },
    orderBy: { transfusedAt: 'desc' }
  })
  return transfusions.map(toDisplay)
}

// Une transfusion marque la poche liée « Transfusée » et, si elle répond à une demande, passe
// celle-ci au statut « Honorée » — même principe que la réception → commande de l'item 13.
export async function createTransfusion(input: CreateTransfusionInput) {
  const prisma = getPrismaClient()
  const reference = await nextCode('TRANSFUSION', 'TRF', 4)

  const transfusion = await prisma.transfusion.create({
    data: {
      id: randomUUID(),
      reference,
      patientId: input.patientId,
      pouchId: input.pouchId,
      requestId: input.requestId,
      transfusedAt: input.transfusedAt ? new Date(input.transfusedAt) : new Date(),
      administeredBy: input.administeredBy,
      reaction: input.reaction
    },
    include: { patient: true, pouch: true, request: true }
  })

  await prisma.bloodPouch.update({ where: { id: input.pouchId }, data: { status: 'TRANSFUSEE' } })
  if (input.requestId) {
    await prisma.transfusionRequest.update({ where: { id: input.requestId }, data: { status: 'HONOREE' } })
  }

  return toDisplay(transfusion)
}

export async function updateTransfusion(id: string, input: UpdateTransfusionInput) {
  const prisma = getPrismaClient()
  const transfusion = await prisma.transfusion.update({
    where: { id },
    data: {
      transfusedAt: input.transfusedAt !== undefined ? new Date(input.transfusedAt) : undefined,
      administeredBy: input.administeredBy,
      reaction: input.reaction === undefined ? undefined : input.reaction
    },
    include: { patient: true, pouch: true, request: true }
  })
  return toDisplay(transfusion)
}

export async function deleteTransfusion(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.transfusion.update({ where: { id }, data: { deletedAt: new Date() } })
}
