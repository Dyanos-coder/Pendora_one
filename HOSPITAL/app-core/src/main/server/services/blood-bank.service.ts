import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { nextCode } from './counter.service'
import { buildXlsxDocument } from './xlsx-export'
import type { BloodPouch, BloodPouchStatus } from '../generated/prisma/client'

export interface CreateBloodPouchInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
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
  /** Dernière version connue (`updatedAt`) de la poche, pour détecter un conflit si elle a été
   * modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
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
    patientId: p.patientId,
    updatedAt: p.updatedAt.toISOString()
  }
}

export async function listBloodPouches() {
  const prisma = getPrismaClient()
  const pouches = await prisma.bloodPouch.findMany({ where: { deletedAt: null }, orderBy: { collectionDate: 'desc' } })
  return pouches.map(toDisplay)
}

// Rollout "Export Excel" (item 10, voir xlsx-export.ts) — réutilise listBloodPouches() plutôt que
// de dupliquer la requête Prisma.
export async function exportBloodPouches() {
  const pouches = await listBloodPouches()
  return buildXlsxDocument(
    'Banque de sang',
    'Poches de sang',
    [
      { header: 'N° poche', key: 'pouchNumber', width: 14 },
      { header: 'Groupe sanguin', key: 'bloodGroup', width: 14 },
      { header: 'Composant', key: 'component', width: 22 },
      { header: 'Volume (ml)', key: 'volumeMl', width: 12 },
      { header: 'Statut', key: 'status', width: 18 },
      { header: 'Date de prélèvement', key: 'collectionDate', width: 18 },
      { header: 'Date d’expiration', key: 'expiryDate', width: 18 },
      { header: 'Donneur', key: 'donorName', width: 20 }
    ],
    pouches.map((p) => ({
      ...p,
      collectionDate: new Date(p.collectionDate).toLocaleDateString('fr-FR'),
      expiryDate: new Date(p.expiryDate).toLocaleDateString('fr-FR')
    }))
  )
}

export async function deleteBloodPouch(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.bloodPouch.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createBloodPouch(input: CreateBloodPouchInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.bloodPouch.findUnique({ where: { id: input.id } })
    if (existing) return toDisplay(existing)
  }

  const pouchNumber = await nextCode('BLOOD_POUCH', 'PC', 5)
  const status: BloodPouchStatus = 'EN_ATTENTE_ANALYSE'

  const pouch = await prisma.bloodPouch.create({
    data: {
      id: input.id ?? randomUUID(),
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

  if (input.expectedUpdatedAt) {
    const current = await prisma.bloodPouch.findUnique({ where: { id } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

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
