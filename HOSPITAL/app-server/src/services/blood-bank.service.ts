import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import type { BloodPouch, BloodPouchStatus } from '../generated/prisma/client'

export interface CreateBloodPouchInput {
  bloodGroup: string
  component: string
  volumeMl?: number
  collectionDate: string
  expiryDate: string
  donorName: string
  patientId?: string
}

export interface UpdateBloodPouchInput {
  bloodGroup?: string
  component?: string
  volumeMl?: number | null
  status?: BloodPouchStatus
  collectionDate?: string
  expiryDate?: string
  donorName?: string
  patientId?: string | null
}

function toDisplay(p: BloodPouch) {
  return {
    id: p.id,
    pouchNumber: p.pouchNumber,
    bloodGroup: p.bloodGroup,
    component: p.component,
    volumeMl: p.volumeMl,
    status: p.status,
    collectionDate: p.collectionDate.toISOString(),
    expiryDate: p.expiryDate.toISOString(),
    donorName: p.donorName,
    patientId: p.patientId
  }
}

export async function listBloodPouches() {
  const prisma = getPrismaClient()
  const pouches = await prisma.bloodPouch.findMany({ where: { deletedAt: null }, orderBy: { collectionDate: 'desc' } })
  return pouches.map(toDisplay)
}

export async function deleteBloodPouch(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.bloodPouch.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createBloodPouch(input: CreateBloodPouchInput) {
  const prisma = getPrismaClient()
  const pouchNumber = await nextCode('BLOOD_POUCH', 'PC', 5)
  const status: BloodPouchStatus = 'EN_ATTENTE_ANALYSE'

  const pouch = await prisma.bloodPouch.create({
    data: {
      id: randomUUID(),
      pouchNumber,
      bloodGroup: input.bloodGroup,
      component: input.component,
      volumeMl: input.volumeMl,
      status,
      collectionDate: new Date(input.collectionDate),
      expiryDate: new Date(input.expiryDate),
      donorName: input.donorName,
      patientId: input.patientId
    }
  })
  return toDisplay(pouch)
}

export async function updateBloodPouch(id: string, input: UpdateBloodPouchInput) {
  const prisma = getPrismaClient()
  const pouch = await prisma.bloodPouch.update({
    where: { id },
    data: {
      bloodGroup: input.bloodGroup,
      component: input.component,
      volumeMl: input.volumeMl === undefined ? undefined : input.volumeMl,
      status: input.status,
      collectionDate: input.collectionDate !== undefined ? new Date(input.collectionDate) : undefined,
      expiryDate: input.expiryDate !== undefined ? new Date(input.expiryDate) : undefined,
      donorName: input.donorName,
      patientId: input.patientId === undefined ? undefined : input.patientId
    }
  })
  return toDisplay(pouch)
}
