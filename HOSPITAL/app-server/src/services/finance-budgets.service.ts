import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { ConflictError } from '../lib/conflict-error'
import type { Budget } from '../generated/prisma/client'

export interface CreateBudgetInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  service: string
  year: number
  allocatedAmount: number
  note?: string
}

export interface UpdateBudgetInput {
  service?: string
  year?: number
  allocatedAmount?: number
  note?: string | null
  /** Dernière version connue (`updatedAt`), pour détecter un conflit (voir §6.3). */
  expectedUpdatedAt?: string
}

// `consumedAmount` n'est pas stocké — calculé en sommant les ServiceExpense du même service sur la
// même année, même logique que PurchaseOrder.totalAmount (item 13).
async function toDisplay(b: Budget) {
  const prisma = getPrismaClient()
  const yearStart = new Date(Date.UTC(b.year, 0, 1))
  const yearEnd = new Date(Date.UTC(b.year + 1, 0, 1))
  const aggregate = await prisma.serviceExpense.aggregate({
    where: { deletedAt: null, service: b.service, spentAt: { gte: yearStart, lt: yearEnd } },
    _sum: { amount: true }
  })
  const consumedAmount = aggregate._sum.amount ?? 0

  return {
    id: b.id,
    reference: b.reference,
    service: b.service,
    year: b.year,
    allocatedAmount: b.allocatedAmount,
    consumedAmount,
    remainingAmount: b.allocatedAmount - consumedAmount,
    note: b.note,
    updatedAt: b.updatedAt.toISOString()
  }
}

export async function listBudgets() {
  const prisma = getPrismaClient()
  const budgets = await prisma.budget.findMany({
    where: { deletedAt: null },
    orderBy: [{ year: 'desc' }, { service: 'asc' }]
  })
  return Promise.all(budgets.map(toDisplay))
}

export async function createBudget(input: CreateBudgetInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.budget.findUnique({ where: { id: input.id } })
    if (existing) return toDisplay(existing)
  }

  const reference = await nextCode('BUDGET', 'BUD', 4)

  const budget = await prisma.budget.create({
    data: {
      id: input.id ?? randomUUID(),
      reference,
      service: input.service,
      year: input.year,
      allocatedAmount: input.allocatedAmount,
      note: input.note
    }
  })
  return toDisplay(budget)
}

export async function updateBudget(id: string, input: UpdateBudgetInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.budget.findUnique({ where: { id } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(await toDisplay(current))
    }
  }

  const budget = await prisma.budget.update({
    where: { id },
    data: {
      service: input.service,
      year: input.year,
      allocatedAmount: input.allocatedAmount,
      note: input.note === undefined ? undefined : input.note
    }
  })
  return toDisplay(budget)
}

export async function deleteBudget(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.budget.update({ where: { id }, data: { deletedAt: new Date() } })
}
