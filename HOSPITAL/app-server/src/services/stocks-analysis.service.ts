import { getPrismaClient } from '../db/client'

// Onglet 100% lecture (item 16) : agrégations sur les mouvements/pertes déjà enregistrés et sur
// l'état courant des articles, aucun modèle dédié — tout est recalculé à la demande.
export async function getStockAnalysis() {
  const prisma = getPrismaClient()

  const [entriesAgg, exitsAgg, lossesAgg, returnsAgg, items, topMoved] = await Promise.all([
    prisma.stockMovement.aggregate({ where: { deletedAt: null, type: 'ENTREE' }, _sum: { quantity: true } }),
    prisma.stockMovement.aggregate({ where: { deletedAt: null, type: 'SORTIE' }, _sum: { quantity: true } }),
    prisma.stockLoss.aggregate({ where: { deletedAt: null, type: 'PERTE' }, _sum: { quantity: true } }),
    prisma.stockLoss.aggregate({ where: { deletedAt: null, type: 'RETOUR' }, _sum: { quantity: true } }),
    prisma.depotItem.findMany({ where: { deletedAt: null } }),
    prisma.stockMovement.groupBy({
      by: ['itemId'],
      where: { deletedAt: null },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    })
  ])

  const itemsBelowThreshold = items.filter((i) => i.available < i.minThreshold).length
  const itemsById = new Map(items.map((i) => [i.id, i]))
  const topMovedItems = topMoved
    .map((m) => ({ itemId: m.itemId, itemName: itemsById.get(m.itemId)?.name ?? 'Article supprimé', totalQuantity: m._sum.quantity ?? 0 }))
    .filter((m) => m.totalQuantity > 0)

  return {
    totalEntries: entriesAgg._sum.quantity ?? 0,
    totalExits: exitsAgg._sum.quantity ?? 0,
    totalLosses: lossesAgg._sum.quantity ?? 0,
    totalReturns: returnsAgg._sum.quantity ?? 0,
    itemsBelowThreshold,
    topMovedItems
  }
}
