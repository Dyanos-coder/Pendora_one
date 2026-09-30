import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { ConflictError } from '../lib/conflict-error'
import type { ServiceExpense } from '../generated/prisma/client'

export interface CreateServiceExpenseInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  service: string
  category: string
  amount: number
  spentAt?: string
  note?: string
}

export interface UpdateServiceExpenseInput {
  service?: string
  category?: string
  amount?: number
  spentAt?: string
  note?: string | null
  /** Dernière version connue (`updatedAt`), pour détecter un conflit (voir §6.3). */
  expectedUpdatedAt?: string
}

function toDisplay(e: ServiceExpense) {
  return {
    id: e.id,
    reference: e.reference,
    service: e.service,
    category: e.category,
    amount: e.amount,
    spentAt: e.spentAt.toISOString(),
    note: e.note,
    updatedAt: e.updatedAt.toISOString()
  }
}

export async function listServiceExpenses() {
  const prisma = getPrismaClient()
  const expenses = await prisma.serviceExpense.findMany({
    where: { deletedAt: null },
    orderBy: { spentAt: 'desc' }
  })
  return expenses.map(toDisplay)
}

export async function createServiceExpense(input: CreateServiceExpenseInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.serviceExpense.findUnique({ where: { id: input.id } })
    if (existing) return toDisplay(existing)
  }

  const reference = await nextCode('SERVICE_EXPENSE', 'DEP', 4)

  const expense = await prisma.serviceExpense.create({
    data: {
      id: input.id ?? randomUUID(),
      reference,
      service: input.service,
      category: input.category,
      amount: input.amount,
      spentAt: input.spentAt ? new Date(input.spentAt) : new Date(),
      note: input.note
    }
  })
  return toDisplay(expense)
}

export async function updateServiceExpense(id: string, input: UpdateServiceExpenseInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.serviceExpense.findUnique({ where: { id } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const expense = await prisma.serviceExpense.update({
    where: { id },
    data: {
      service: input.service,
      category: input.category,
      amount: input.amount,
      spentAt: input.spentAt !== undefined ? new Date(input.spentAt) : undefined,
      note: input.note === undefined ? undefined : input.note
    }
  })
  return toDisplay(expense)
}

export async function deleteServiceExpense(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.serviceExpense.update({ where: { id }, data: { deletedAt: new Date() } })
}
