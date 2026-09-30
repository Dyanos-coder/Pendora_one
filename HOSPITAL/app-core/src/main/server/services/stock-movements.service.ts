import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { ConflictError } from '../lib/conflict-error'
import type { StockMovement, StockMovementType, DepotItem } from '../generated/prisma/client'

export interface CreateStockMovementInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué (voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §4). Sans ça, un mouvement rejoué après une confirmation
   * réseau perdue appliquerait deux fois son delta sur `DepotItem.available`. */
  id?: string
  itemId: string
  type: StockMovementType
  quantity: number
  movementDate?: string
  reason?: string
  performedBy: string
  note?: string
}

// Volontairement pas de itemId/type/quantity modifiables après coup : le mouvement a déjà
// appliqué son delta sur `DepotItem.available`, le rejouer à l'édition risquerait de désynchroniser
// le stock. Seuls les champs descriptifs restent éditables (comme une écriture comptable validée).
export interface UpdateStockMovementInput {
  movementDate?: string
  reason?: string | null
  performedBy?: string
  note?: string | null
  /** Dernière version connue (`updatedAt`), pour détecter un conflit si modifié entre-temps par
   * quelqu'un d'autre (mode hors-ligne, voir §6.3). Absent : pas de vérification. */
  expectedUpdatedAt?: string
}

type MovementWithRelations = StockMovement & { item: DepotItem }

function toDisplay(m: MovementWithRelations) {
  return {
    id: m.id,
    reference: m.reference,
    itemId: m.itemId,
    itemName: m.item.name,
    type: m.type,
    quantity: m.quantity,
    movementDate: m.movementDate.toISOString(),
    reason: m.reason,
    performedBy: m.performedBy,
    note: m.note,
    updatedAt: m.updatedAt.toISOString()
  }
}

export async function listStockMovements() {
  const prisma = getPrismaClient()
  const movements = await prisma.stockMovement.findMany({
    where: { deletedAt: null },
    include: { item: true },
    orderBy: { movementDate: 'desc' }
  })
  return movements.map(toDisplay)
}

// Chaque mouvement met à jour `DepotItem.available` en direct (+ pour une entrée, - pour une
// sortie), pour que le stock affiché reste toujours la somme réelle des mouvements.
export async function createStockMovement(input: CreateStockMovementInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.stockMovement.findUnique({ where: { id: input.id }, include: { item: true } })
    if (existing) return toDisplay(existing)
  }

  const reference = await nextCode('STOCK_MOVEMENT', 'MVT', 4)
  const movementDate = input.movementDate ? new Date(input.movementDate) : new Date()

  const movement = await prisma.stockMovement.create({
    data: {
      id: input.id ?? randomUUID(),
      reference,
      itemId: input.itemId,
      type: input.type,
      quantity: input.quantity,
      movementDate,
      reason: input.reason,
      performedBy: input.performedBy,
      note: input.note
    },
    include: { item: true }
  })

  const delta = input.type === 'ENTREE' ? input.quantity : -input.quantity
  await prisma.depotItem.update({
    where: { id: input.itemId },
    data: { available: { increment: delta }, lastMovementAt: movementDate }
  })

  return toDisplay(movement)
}

export async function updateStockMovement(id: string, input: UpdateStockMovementInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.stockMovement.findUnique({ where: { id }, include: { item: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const movement = await prisma.stockMovement.update({
    where: { id },
    data: {
      movementDate: input.movementDate !== undefined ? new Date(input.movementDate) : undefined,
      reason: input.reason === undefined ? undefined : input.reason,
      performedBy: input.performedBy,
      note: input.note === undefined ? undefined : input.note
    },
    include: { item: true }
  })
  return toDisplay(movement)
}

export async function deleteStockMovement(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.stockMovement.update({ where: { id }, data: { deletedAt: new Date() } })
}
