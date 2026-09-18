import { getPrismaClient } from '../db/client'

const PAGE_SIZE = 20
const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export class InsufficientStockError extends Error {}

export interface CreateSaleInput {
  clientName: string
  stockItemId: string
  quantity: number
  amount: number
  status: 'PAYE' | 'EN_ATTENTE'
}

export async function listSales(page: number) {
  const prisma = getPrismaClient()
  const skip = Math.max(0, page - 1) * PAGE_SIZE

  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { issuedAt: 'desc' },
      skip,
      take: PAGE_SIZE
    }),
    prisma.sale.count()
  ])

  return { items, total, page, pageSize: PAGE_SIZE }
}

// Décrémente le stock et enregistre la vente dans une seule transaction — la condition
// `quantity >= input.quantity` dans le updateMany rend la vérification de disponibilité atomique
// (pas de lecture-puis-écriture séparée qui pourrait laisser passer une vente en cas de concurrence).
export async function createSale(input: CreateSaleInput) {
  const prisma = getPrismaClient()

  const stockItem = await prisma.stockItem.findUnique({ where: { id: input.stockItemId } })
  if (!stockItem) {
    throw new Error('Article introuvable.')
  }

  return prisma.$transaction(async (tx) => {
    const decremented = await tx.stockItem.updateMany({
      where: { id: input.stockItemId, quantity: { gte: input.quantity } },
      data: { quantity: { decrement: input.quantity } }
    })

    if (decremented.count === 0) {
      throw new InsufficientStockError(
        `Stock insuffisant pour "${stockItem.name}" (disponible : ${stockItem.quantity}).`
      )
    }

    return tx.sale.create({
      data: {
        clientName: input.clientName,
        stockItemId: input.stockItemId,
        quantity: input.quantity,
        items: `${input.quantity}x ${stockItem.name}`,
        amount: input.amount,
        status: input.status
      }
    })
  })
}

// Chiffre d'affaires / nombre de ventes / panier moyen sur les 7 derniers jours, et la répartition
// par jour pour le graphique — tout calculé à partir des vraies ventes, pas de données simulées.
export async function getSalesSummary() {
  const prisma = getPrismaClient()

  const since = new Date()
  since.setDate(since.getDate() - 6)
  since.setHours(0, 0, 0, 0)

  const recentSales = await prisma.sale.findMany({
    where: { issuedAt: { gte: since } },
    select: { amount: true, issuedAt: true }
  })

  const chiffreAffaires7j = recentSales.reduce((sum, s) => sum + s.amount, 0)
  const ventes7j = recentSales.length
  const panierMoyen = ventes7j > 0 ? Math.round(chiffreAffaires7j / ventes7j) : 0

  const week: { day: string; value: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date()
    dayStart.setDate(dayStart.getDate() - i)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const value = recentSales
      .filter((s) => s.issuedAt >= dayStart && s.issuedAt < dayEnd)
      .reduce((sum, s) => sum + s.amount, 0)

    week.push({ day: DAY_LABELS[dayStart.getDay()], value })
  }

  return { chiffreAffaires7j, ventes7j, panierMoyen, week }
}
