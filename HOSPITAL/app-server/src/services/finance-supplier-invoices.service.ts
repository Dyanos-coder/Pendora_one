import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'
import { nextCode } from './counter.service'
import { ConflictError } from '../lib/conflict-error'
import type { SupplierInvoice, TransactionStatus, PurchaseOrder, Supplier } from '../generated/prisma/client'

export interface CreateSupplierInvoiceInput {
  /** Optionnel : id généré côté client (mode hors-ligne) — création idempotente si rejoué. */
  id?: string
  supplierId?: string
  orderId?: string
  amount: number
  issuedAt?: string
  dueAt?: string
  status?: TransactionStatus
  note?: string
}

export interface UpdateSupplierInvoiceInput {
  supplierId?: string | null
  orderId?: string | null
  amount?: number
  issuedAt?: string
  dueAt?: string | null
  status?: TransactionStatus
  note?: string | null
  /** Dernière version connue (`updatedAt`), pour détecter un conflit (voir §6.3). */
  expectedUpdatedAt?: string
}

type InvoiceWithRelations = SupplierInvoice & { supplier: Supplier | null; order: PurchaseOrder | null }

function toDisplay(i: InvoiceWithRelations) {
  return {
    id: i.id,
    reference: i.reference,
    supplierId: i.supplierId,
    supplierName: i.supplier?.name ?? null,
    orderId: i.orderId,
    orderReference: i.order?.reference ?? null,
    amount: i.amount,
    issuedAt: i.issuedAt.toISOString(),
    dueAt: i.dueAt?.toISOString() ?? null,
    status: i.status,
    note: i.note,
    updatedAt: i.updatedAt.toISOString()
  }
}

export async function listSupplierInvoices() {
  const prisma = getPrismaClient()
  const invoices = await prisma.supplierInvoice.findMany({
    where: { deletedAt: null },
    include: { supplier: true, order: true },
    orderBy: { issuedAt: 'desc' }
  })
  return invoices.map(toDisplay)
}

export async function createSupplierInvoice(input: CreateSupplierInvoiceInput) {
  const prisma = getPrismaClient()

  if (input.id) {
    const existing = await prisma.supplierInvoice.findUnique({ where: { id: input.id }, include: { supplier: true, order: true } })
    if (existing) return toDisplay(existing)
  }

  const reference = await nextCode('SUPPLIER_INVOICE', 'FACF', 4)

  const invoice = await prisma.supplierInvoice.create({
    data: {
      id: input.id ?? randomUUID(),
      reference,
      supplierId: input.supplierId,
      orderId: input.orderId,
      amount: input.amount,
      issuedAt: input.issuedAt ? new Date(input.issuedAt) : new Date(),
      dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
      status: input.status ?? 'EN_ATTENTE',
      note: input.note
    },
    include: { supplier: true, order: true }
  })
  return toDisplay(invoice)
}

export async function updateSupplierInvoice(id: string, input: UpdateSupplierInvoiceInput) {
  const prisma = getPrismaClient()

  if (input.expectedUpdatedAt) {
    const current = await prisma.supplierInvoice.findUnique({ where: { id }, include: { supplier: true, order: true } })
    if (current && current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new ConflictError(toDisplay(current))
    }
  }

  const invoice = await prisma.supplierInvoice.update({
    where: { id },
    data: {
      supplierId: input.supplierId === undefined ? undefined : input.supplierId,
      orderId: input.orderId === undefined ? undefined : input.orderId,
      amount: input.amount,
      issuedAt: input.issuedAt !== undefined ? new Date(input.issuedAt) : undefined,
      dueAt: input.dueAt !== undefined ? (input.dueAt ? new Date(input.dueAt) : null) : undefined,
      status: input.status,
      note: input.note === undefined ? undefined : input.note
    },
    include: { supplier: true, order: true }
  })
  return toDisplay(invoice)
}

export async function deleteSupplierInvoice(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.supplierInvoice.update({ where: { id }, data: { deletedAt: new Date() } })
}
