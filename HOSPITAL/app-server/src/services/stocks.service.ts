import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import type { DepotItem } from '../generated/prisma/client'

export interface CreateDepotItemInput {
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
    lastMovementAt: i.lastMovementAt?.toISOString() ?? null
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

export async function deleteDepotItem(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.depotItem.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createDepotItem(input: CreateDepotItemInput) {
  const prisma = getPrismaClient()
  const item = await prisma.depotItem.create({
    data: {
      id: randomUUID(),
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
