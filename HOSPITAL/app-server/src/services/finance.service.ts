import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import type { FinanceTransaction, TransactionStatus, TransactionType } from '../generated/prisma/client'

export interface CreateFinanceTransactionInput {
  type: TransactionType
  party: string
  category: string
  amount: number
  paymentMode: string
}

export interface UpdateFinanceTransactionInput {
  type?: TransactionType
  party?: string
  category?: string
  amount?: number
  status?: TransactionStatus
  paymentMode?: string
}

function toDisplay(t: FinanceTransaction) {
  return {
    id: t.id,
    reference: t.reference,
    occurredAt: t.occurredAt.toISOString(),
    type: t.type,
    party: t.party,
    category: t.category,
    amount: t.amount,
    status: t.status,
    paymentMode: t.paymentMode
  }
}

export async function listFinanceTransactions() {
  const prisma = getPrismaClient()
  const transactions = await prisma.financeTransaction.findMany({ where: { deletedAt: null }, orderBy: { occurredAt: 'desc' } })
  return transactions.map(toDisplay)
}

export async function deleteFinanceTransaction(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.financeTransaction.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createFinanceTransaction(input: CreateFinanceTransactionInput) {
  const prisma = getPrismaClient()
  const reference = await nextCode('FINANCE_TRANSACTION', input.type === 'RECETTE' ? 'REC' : 'FAC', 4)

  const transaction = await prisma.financeTransaction.create({
    data: {
      id: randomUUID(),
      reference,
      occurredAt: new Date(),
      type: input.type,
      party: input.party,
      category: input.category,
      amount: input.amount,
      status: 'EN_ATTENTE',
      paymentMode: input.paymentMode
    }
  })
  return toDisplay(transaction)
}

export async function updateFinanceTransaction(id: string, input: UpdateFinanceTransactionInput) {
  const prisma = getPrismaClient()
  const transaction = await prisma.financeTransaction.update({
    where: { id },
    data: {
      type: input.type,
      party: input.party,
      category: input.category,
      amount: input.amount,
      status: input.status,
      paymentMode: input.paymentMode
    }
  })
  return toDisplay(transaction)
}
