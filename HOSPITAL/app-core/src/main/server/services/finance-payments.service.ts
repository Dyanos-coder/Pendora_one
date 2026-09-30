import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { ConflictError } from '../lib/conflict-error'
import type { PaymentReceived } from '../generated/prisma/client'

export interface CreatePaymentReceivedInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  payer: string
  category: string
  amount: number
  receivedAt?: string
  paymentMode: string
  note?: string
}

export interface UpdatePaymentReceivedInput {
  payer?: string
  category?: string
  amount?: number
  receivedAt?: string
  paymentMode?: string
  note?: string | null
  /** Dernière version connue (`updatedAt`), pour détecter un conflit (voir §6.3). */
  expectedUpdatedAt?: string
}

function toDisplay(p: PaymentReceived) {
  return {
    id: p.id,
    reference: p.reference,
    payer: p.payer,
    category: p.category,
    amount: p.amount,
    receivedAt: p.receivedAt.toISOString(),
    paymentMode: p.paymentMode,
    note: p.note,
    updatedAt: p.updatedAt.toISOString()
  }
}

export async function listPaymentsReceived() {
  const prisma = getPrismaClient()
  const payments = await prisma.paymentReceived.findMany({
    where: { deletedAt: null },
    orderBy: { receivedAt: 'desc' }
  })
  return payments.map(toDisplay)
}

export async function createPaymentReceived(input: CreatePaymentReceivedInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.paymentReceived.findUnique({ where: { id: input.id } })
    if (existing) return toDisplay(existing)
  }

  const reference = await nextCode('PAYMENT_RECEIVED', 'PAI', 4)

  const payment = await prisma.paymentReceived.create({
    data: {
      id: input.id ?? randomUUID(),
      reference,
      payer: input.payer,
      category: input.category,
      amount: input.amount,
      receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
      paymentMode: input.paymentMode,
      note: input.note
    }
  })
  return toDisplay(payment)
}

export async function updatePaymentReceived(id: string, input: UpdatePaymentReceivedInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.paymentReceived.findUnique({ where: { id } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const payment = await prisma.paymentReceived.update({
    where: { id },
    data: {
      payer: input.payer,
      category: input.category,
      amount: input.amount,
      receivedAt: input.receivedAt !== undefined ? new Date(input.receivedAt) : undefined,
      paymentMode: input.paymentMode,
      note: input.note === undefined ? undefined : input.note
    }
  })
  return toDisplay(payment)
}

export async function deletePaymentReceived(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.paymentReceived.update({ where: { id }, data: { deletedAt: new Date() } })
}
