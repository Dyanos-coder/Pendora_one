import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { ConflictError } from '../lib/conflict-error'
import type { BankAccount } from '../generated/prisma/client'

export interface CreateBankAccountInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  name: string
  bankName: string
  accountNumber: string
  balance?: number
  note?: string
}

export interface UpdateBankAccountInput {
  name?: string
  bankName?: string
  accountNumber?: string
  balance?: number
  note?: string | null
  /** Dernière version connue (`updatedAt`), pour détecter un conflit (voir §6.3). */
  expectedUpdatedAt?: string
}

function toDisplay(a: BankAccount) {
  return {
    id: a.id,
    reference: a.reference,
    name: a.name,
    bankName: a.bankName,
    accountNumber: a.accountNumber,
    balance: a.balance,
    note: a.note,
    updatedAt: a.updatedAt.toISOString()
  }
}

export async function listBankAccounts() {
  const prisma = getPrismaClient()
  const accounts = await prisma.bankAccount.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' }
  })
  return accounts.map(toDisplay)
}

export async function createBankAccount(input: CreateBankAccountInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.bankAccount.findUnique({ where: { id: input.id } })
    if (existing) return toDisplay(existing)
  }

  const reference = await nextCode('BANK_ACCOUNT', 'CPT', 4)

  const account = await prisma.bankAccount.create({
    data: {
      id: input.id ?? randomUUID(),
      reference,
      name: input.name,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      balance: input.balance ?? 0,
      note: input.note
    }
  })
  return toDisplay(account)
}

export async function updateBankAccount(id: string, input: UpdateBankAccountInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.bankAccount.findUnique({ where: { id } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const account = await prisma.bankAccount.update({
    where: { id },
    data: {
      name: input.name,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      balance: input.balance,
      note: input.note === undefined ? undefined : input.note
    }
  })
  return toDisplay(account)
}

export async function deleteBankAccount(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.bankAccount.update({ where: { id }, data: { deletedAt: new Date() } })
}
