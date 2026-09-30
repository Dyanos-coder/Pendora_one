import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { ConflictError } from '../lib/conflict-error'
import { nextCode } from './counter.service'
import { buildXlsxDocument } from './xlsx-export'
import type { FinanceTransaction, TransactionStatus, TransactionType } from '../generated/prisma/client'

export interface CreateFinanceTransactionInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
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
  /** Dernière version connue (`updatedAt`) de l'opération, pour détecter un conflit si elle a été
   * modifiée entre-temps par quelqu'un d'autre (mode hors-ligne, voir
   * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). Absent : pas de vérification (mise à jour en
   * ligne normale, jamais hors-ligne). */
  expectedUpdatedAt?: string
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
    paymentMode: t.paymentMode,
    updatedAt: t.updatedAt.toISOString()
  }
}

export async function listFinanceTransactions() {
  const prisma = getPrismaClient()
  const transactions = await prisma.financeTransaction.findMany({ where: { deletedAt: null }, orderBy: { occurredAt: 'desc' } })
  return transactions.map(toDisplay)
}

// Rollout "Export Excel" (item 10, voir xlsx-export.ts) — réutilise listFinanceTransactions()
// plutôt que de dupliquer la requête Prisma.
export async function exportFinanceTransactions() {
  const transactions = await listFinanceTransactions()
  return buildXlsxDocument(
    'Comptabilité',
    'Opérations financières',
    [
      { header: 'Référence', key: 'reference', width: 16 },
      { header: 'Date', key: 'occurredAt', width: 18 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Tiers', key: 'party', width: 22 },
      { header: 'Catégorie', key: 'category', width: 18 },
      { header: 'Montant (FCFA)', key: 'amount', width: 16 },
      { header: 'Statut', key: 'status', width: 14 },
      { header: 'Mode de paiement', key: 'paymentMode', width: 18 }
    ],
    transactions.map((t) => ({
      ...t,
      occurredAt: new Date(t.occurredAt).toLocaleString('fr-FR')
    }))
  )
}

export async function deleteFinanceTransaction(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.financeTransaction.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function createFinanceTransaction(input: CreateFinanceTransactionInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.financeTransaction.findUnique({ where: { id: input.id } })
    if (existing) return toDisplay(existing)
  }

  const reference = await nextCode('FINANCE_TRANSACTION', input.type === 'RECETTE' ? 'REC' : 'FAC', 4)

  const transaction = await prisma.financeTransaction.create({
    data: {
      id: input.id ?? randomUUID(),
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

  if (input.expectedUpdatedAt) {
    const current = await prisma.financeTransaction.findUnique({ where: { id } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

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
