import { getPrismaClient } from '../db/client'

const PAGE_SIZE = 20

// Sélection explicite qui exclut la photo (potentiellement volumineuse) — la liste ne doit
// jamais charger les octets, seul l'endpoint /media le fait.
const LIST_SELECT = {
  id: true,
  reference: true,
  description: true,
  partyName: true,
  amount: true,
  status: true,
  issuedAt: true,
  createdAt: true,
  photoMimeType: true // juste pour savoir si une photo existe, pas les octets
} as const

export interface CreateInvoiceInput {
  reference: string
  description: string
  partyName: string
  amount: number
  status: 'PAYE' | 'EN_ATTENTE' | 'EN_RETARD'
  photo?: { data: Buffer; mimeType: string }
}

export async function listInvoices(page: number) {
  const prisma = getPrismaClient()
  const skip = Math.max(0, page - 1) * PAGE_SIZE

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      select: LIST_SELECT,
      orderBy: { issuedAt: 'desc' },
      skip,
      take: PAGE_SIZE
    }),
    prisma.invoice.count()
  ])

  return { items, total, page, pageSize: PAGE_SIZE }
}

export async function createInvoice(input: CreateInvoiceInput) {
  const prisma = getPrismaClient()
  const invoice = await prisma.invoice.create({
    data: {
      reference: input.reference,
      description: input.description,
      partyName: input.partyName,
      amount: input.amount,
      status: input.status,
      photo: input.photo ? Uint8Array.from(input.photo.data) : undefined,
      photoMimeType: input.photo?.mimeType
    },
    select: LIST_SELECT
  })
  return invoice
}

/** Renvoie la facture avec ses octets de photo (si présents) — usage réservé à /media. */
export async function getInvoiceWithPhoto(id: string) {
  const prisma = getPrismaClient()
  return prisma.invoice.findUnique({ where: { id } })
}

// La trésorerie reste simulée pour l'instant : un vrai solde demanderait un suivi des comptes
// bancaires, hors scope de cette itération (voir plan).
const SIMULATED_TRESORERIE = 4800000

export async function getFinanceSummary() {
  const prisma = getPrismaClient()

  const [paidAgg, unpaidAgg] = await Promise.all([
    prisma.invoice.aggregate({
      where: { status: 'PAYE' },
      _sum: { amount: true }
    }),
    prisma.invoice.aggregate({
      where: { status: { in: ['EN_ATTENTE', 'EN_RETARD'] } },
      _sum: { amount: true },
      _count: true
    })
  ])

  return {
    chiffreAffaires: paidAgg._sum.amount ?? 0,
    facturesImpayees: {
      count: unpaidAgg._count,
      total: unpaidAgg._sum.amount ?? 0
    },
    tresorerie: SIMULATED_TRESORERIE
  }
}
