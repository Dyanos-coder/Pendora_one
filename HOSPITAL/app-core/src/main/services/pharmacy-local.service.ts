import { getPrismaClient } from '../db/client'
import type { ApiMedication, ApiStockState, CreateMedicationInput, UpdateMedicationInput } from '../../shared/pharmacy-types'
import type { Medication as LocalMedicationRow } from '../../generated/prisma/client'

// Mode hors-ligne — Phase 2 : Pharmacie (voir Plan-Mode-Hors-Ligne-Synchronisation.md). Le domaine
// le plus simple des 9 : aucun `patientId`, aucune jointure — `toDisplay()` est une fonction pure.

function stockState(m: Pick<LocalMedicationRow, 'available' | 'minThreshold'>): ApiStockState {
  if (m.available <= 0) return 'RUPTURE'
  if (m.available < m.minThreshold) return 'STOCK_FAIBLE'
  return 'DISPONIBLE'
}

function toDisplay(row: LocalMedicationRow): ApiMedication {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    location: row.location,
    available: row.available,
    minThreshold: row.minThreshold,
    state: stockState(row),
    nearestExpiry: row.nearestExpiry?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Version serveur connue (`serverUpdatedAt`) de la fiche, si déjà synchronisée — `undefined` si
 * la fiche n'a jamais été confirmée par le serveur (création encore PENDING) ou n'existe pas
 * localement, auquel cas aucune vérification de conflit n'est possible ni nécessaire (voir
 * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). */
export async function getLocalMedicationServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.medication.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalMedications(): Promise<ApiMedication[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.medication.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } })
  return rows.map(toDisplay)
}

export async function createLocalMedication(id: string, input: CreateMedicationInput): Promise<ApiMedication> {
  const prisma = getPrismaClient()
  const row = await prisma.medication.create({
    data: {
      id,
      name: input.name,
      category: input.category,
      location: input.location,
      available: input.available,
      minThreshold: input.minThreshold,
      nearestExpiry: input.nearestExpiry ? new Date(input.nearestExpiry) : undefined,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalMedication(id: string, input: UpdateMedicationInput): Promise<ApiMedication> {
  const prisma = getPrismaClient()
  const row = await prisma.medication.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      location: input.location,
      available: input.available,
      minThreshold: input.minThreshold,
      nearestExpiry: input.nearestExpiry !== undefined ? (input.nearestExpiry ? new Date(input.nearestExpiry) : null) : undefined,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalMedication(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.medication.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedMedication(m: ApiMedication): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    name: m.name,
    category: m.category,
    location: m.location,
    available: m.available,
    minThreshold: m.minThreshold,
    nearestExpiry: m.nearestExpiry ? new Date(m.nearestExpiry) : null,
    serverUpdatedAt: new Date(m.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.medication.upsert({ where: { id: m.id }, update: data, create: { id: m.id, ...data } })
}

export async function syncDownMedications(items: ApiMedication[]): Promise<void> {
  for (const m of items) {
    await upsertSyncedMedication(m)
  }
}
