import { getPrismaClient } from '../db/client'
import type { StockItem } from '../generated/prisma/client'

export interface CreateStockItemInput {
  name: string
  sku: string
  category: string
  quantity: number
  threshold: number
  unitPrice: number
}

export async function listStockItems(search?: string) {
  const prisma = getPrismaClient()

  if (!search) {
    return prisma.stockItem.findMany({ orderBy: { createdAt: 'desc' } })
  }

  // `contains` génère un LIKE dont le paramètre est lié en utf8mb4_bin par le driver mariadb,
  // ce qui entre en conflit avec la collation utf8mb4_unicode_ci de la colonne (erreur MySQL
  // 1267 "Illegal mix of collations") — on force donc la collation explicitement en SQL brut.
  const pattern = `%${search}%`
  return prisma.$queryRaw<StockItem[]>`
    SELECT * FROM stock_item
    WHERE name LIKE ${pattern} COLLATE utf8mb4_unicode_ci OR sku LIKE ${pattern} COLLATE utf8mb4_unicode_ci
    ORDER BY createdAt DESC
  `
}

export async function createStockItem(input: CreateStockItemInput) {
  const prisma = getPrismaClient()
  return prisma.stockItem.create({ data: input })
}

// "Critique" si la quantité descend sous la moitié du seuil de réappro — seuil arbitraire mais
// cohérent avec l'ancienne maquette (§StocksPage).
export async function getStocksSummary() {
  const prisma = getPrismaClient()
  const items = await prisma.stockItem.findMany({ select: { quantity: true, threshold: true, unitPrice: true } })

  return {
    totalItems: items.length,
    totalValue: items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    criticalCount: items.filter((i) => i.quantity < i.threshold * 0.5).length
  }
}
