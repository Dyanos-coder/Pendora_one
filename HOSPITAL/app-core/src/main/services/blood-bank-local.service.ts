import { getPrismaClient } from '../db/client'
import type { ApiBloodPouch, ApiBloodPouchStatus, CreateBloodPouchInput, UpdateBloodPouchInput } from '../../shared/blood-bank-types'
import type { BloodPouch as LocalBloodPouchRow } from '../../generated/prisma/client'

// Mode hors-ligne — Phase 2 : Banque de sang, CRUD de base des poches uniquement (voir
// Plan-Mode-Hors-Ligne-Synchronisation.md). Les sous-domaines de l'item 15 (Dons, Demandes
// transfusionnelles, Transfusions, Analyses) restent hors périmètre et hors-ligne indisponibles.
// `toDisplay()` côté serveur ne fait aucune jointure (patientId brut, pas de patientName dérivé)
// — miroir local tout aussi simple. Code lisible (`pouchNumber`) → provisoire `PC-LOCAL-xxxx`.

function toDisplay(row: LocalBloodPouchRow): ApiBloodPouch {
  return {
    id: row.id,
    pouchNumber: row.pouchNumber,
    bloodGroup: row.bloodGroup,
    component: row.component,
    volumeMl: row.volumeMl,
    status: row.status as ApiBloodPouchStatus,
    collectionDate: row.collectionDate.toISOString(),
    expiryDate: row.expiryDate.toISOString(),
    donorName: row.donorName,
    patientId: row.patientId,
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Version serveur connue (`serverUpdatedAt`) de la poche, si déjà synchronisée — `undefined` si
 * elle n'a jamais été confirmée par le serveur (création encore PENDING) ou n'existe pas
 * localement, auquel cas aucune vérification de conflit n'est possible ni nécessaire (voir
 * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). */
export async function getLocalBloodPouchServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.bloodPouch.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalBloodPouches(): Promise<ApiBloodPouch[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.bloodPouch.findMany({ where: { deletedAt: null }, orderBy: { collectionDate: 'desc' } })
  return rows.map(toDisplay)
}

export async function createLocalBloodPouch(id: string, input: CreateBloodPouchInput): Promise<ApiBloodPouch> {
  const prisma = getPrismaClient()
  const provisionalNumber = `PC-LOCAL-${id.slice(0, 4).toUpperCase()}`
  const row = await prisma.bloodPouch.create({
    data: {
      id,
      pouchNumber: provisionalNumber,
      bloodGroup: input.bloodGroup,
      component: input.component,
      volumeMl: input.volumeMl,
      status: 'EN_ATTENTE_ANALYSE',
      collectionDate: new Date(input.collectionDate),
      expiryDate: new Date(input.expiryDate),
      donorName: input.donorName,
      patientId: input.patientId,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalBloodPouch(id: string, input: UpdateBloodPouchInput): Promise<ApiBloodPouch> {
  const prisma = getPrismaClient()
  const row = await prisma.bloodPouch.update({
    where: { id },
    data: {
      bloodGroup: input.bloodGroup,
      component: input.component,
      volumeMl: input.volumeMl === undefined ? undefined : input.volumeMl,
      status: input.status,
      collectionDate: input.collectionDate !== undefined ? new Date(input.collectionDate) : undefined,
      expiryDate: input.expiryDate !== undefined ? new Date(input.expiryDate) : undefined,
      donorName: input.donorName,
      patientId: input.patientId === undefined ? undefined : input.patientId,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalBloodPouch(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.bloodPouch.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedBloodPouch(p: ApiBloodPouch): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    pouchNumber: p.pouchNumber,
    bloodGroup: p.bloodGroup,
    component: p.component,
    volumeMl: p.volumeMl,
    status: p.status,
    collectionDate: new Date(p.collectionDate),
    expiryDate: new Date(p.expiryDate),
    donorName: p.donorName,
    patientId: p.patientId,
    serverUpdatedAt: new Date(p.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.bloodPouch.upsert({ where: { id: p.id }, update: data, create: { id: p.id, ...data } })
}

export async function syncDownBloodPouches(items: ApiBloodPouch[]): Promise<void> {
  for (const p of items) {
    await upsertSyncedBloodPouch(p)
  }
}
