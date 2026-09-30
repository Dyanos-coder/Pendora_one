import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { buildXlsxDocument } from './xlsx-export'
import type { DepotItem } from '../generated/prisma/client'

export interface CreateDepotItemInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  name: string
  category: string
  depotId: string
  available: number
  minThreshold: number
}

export interface UpdateDepotItemInput {
  name?: string
  category?: string
  depotId?: string
  available?: number
  minThreshold?: number
  /** Dernière version connue (`updatedAt`) du poste qui modifie, pour détecter un conflit si la
   * fiche a été modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
}

function itemState(i: Pick<DepotItem, 'available' | 'minThreshold'>): 'RUPTURE' | 'STOCK_FAIBLE' | 'DISPONIBLE' {
  if (i.available <= 0) return 'RUPTURE'
  if (i.available < i.minThreshold) return 'STOCK_FAIBLE'
  return 'DISPONIBLE'
}

function toDisplay(i: DepotItem & { depot: { name: string } }) {
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    depotId: i.depotId,
    depot: i.depot.name,
    available: i.available,
    minThreshold: i.minThreshold,
    state: itemState(i),
    lastMovementAt: i.lastMovementAt?.toISOString() ?? null,
    updatedAt: i.updatedAt.toISOString()
  }
}

export async function listDepots() {
  const prisma = getPrismaClient()
  const depots = await prisma.depot.findMany({
    include: { items: { where: { deletedAt: null } } },
    orderBy: { name: 'asc' }
  })
  return depots.map((d) => ({
    id: d.id,
    name: d.name,
    refs: d.items.length,
    totalUnits: d.items.reduce((sum, i) => sum + i.available, 0)
  }))
}

export async function listDepotItems() {
  const prisma = getPrismaClient()
  const items = await prisma.depotItem.findMany({ where: { deletedAt: null }, include: { depot: true }, orderBy: { name: 'asc' } })
  return items.map(toDisplay)
}

const STATE_LABEL: Record<ReturnType<typeof itemState>, string> = {
  RUPTURE: 'Rupture',
  STOCK_FAIBLE: 'Stock faible',
  DISPONIBLE: 'Disponible'
}

// Rollout "Export Excel" (item 10, voir xlsx-export.ts) — réutilise listDepotItems() plutôt que
// de dupliquer la requête Prisma.
export async function exportDepotItems() {
  const items = await listDepotItems()
  return buildXlsxDocument(
    'Stocks',
    'Articles de dépôt',
    [
      { header: 'Article', key: 'name', width: 24 },
      { header: 'Catégorie', key: 'category', width: 18 },
      { header: 'Dépôt', key: 'depot', width: 18 },
      { header: 'Disponible', key: 'available', width: 12 },
      { header: 'Seuil minimum', key: 'minThreshold', width: 14 },
      { header: 'État', key: 'stateLabel', width: 14 },
      { header: 'Dernier mouvement', key: 'lastMovementAt', width: 18 }
    ],
    items.map((i) => ({
      ...i,
      stateLabel: STATE_LABEL[i.state],
      lastMovementAt: i.lastMovementAt ? new Date(i.lastMovementAt).toLocaleString('fr-FR') : ''
    }))
  )
}

export async function deleteDepotItem(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.depotItem.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createDepotItem(input: CreateDepotItemInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.depotItem.findUnique({ where: { id: input.id }, include: { depot: true } })
    if (existing) return toDisplay(existing)
  }

  const item = await prisma.depotItem.create({
    data: {
      id: input.id ?? randomUUID(),
      name: input.name,
      category: input.category,
      depotId: input.depotId,
      available: input.available,
      minThreshold: input.minThreshold
    },
    include: { depot: true }
  })
  return toDisplay(item)
}

export async function updateDepotItem(id: string, input: UpdateDepotItemInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.depotItem.findUnique({ where: { id }, include: { depot: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const item = await prisma.depotItem.update({
    where: { id },
    data: {
      name: input.name,
      category: input.category,
      depotId: input.depotId,
      available: input.available,
      minThreshold: input.minThreshold
    },
    include: { depot: true }
  })
  return toDisplay(item)
}
