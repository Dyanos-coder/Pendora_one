import { getPrismaClient } from '../db/client'
import type {
  ApiBankAccount,
  ApiBudget,
  ApiFinanceTransaction,
  ApiPaymentReceived,
  ApiServiceExpense,
  ApiSupplierInvoice,
  ApiTransactionStatus,
  ApiTransactionType,
  CreateBankAccountInput,
  CreateBudgetInput,
  CreateFinanceTransactionInput,
  CreatePaymentReceivedInput,
  CreateServiceExpenseInput,
  CreateSupplierInvoiceInput,
  UpdateBankAccountInput,
  UpdateBudgetInput,
  UpdateFinanceTransactionInput,
  UpdatePaymentReceivedInput,
  UpdateServiceExpenseInput,
  UpdateSupplierInvoiceInput
} from '../../shared/finance-types'
import type {
  BankAccount as LocalBankAccountRow,
  Budget as LocalBudgetRow,
  FinanceTransaction as LocalFinanceTransactionRow,
  PaymentReceived as LocalPaymentReceivedRow,
  ServiceExpense as LocalServiceExpenseRow,
  SupplierInvoice as LocalSupplierInvoiceRow
} from '../../generated/prisma/client'

// Mode hors-ligne — Phase 3 : Finance, entité `FinanceTransaction` uniquement (voir
// Plan-Mode-Hors-Ligne-Synchronisation.md). Aucune relation à répliquer. Code lisible
// (`reference`) → provisoire `REC-LOCAL-xxxx`/`FAC-LOCAL-xxxx` selon le type (même préfixe que
// `nextCode()` côté serveur). Statut forcé à `EN_ATTENTE` à la création, comme côté serveur.

function toDisplay(row: LocalFinanceTransactionRow): ApiFinanceTransaction {
  return {
    id: row.id,
    reference: row.reference,
    occurredAt: row.occurredAt.toISOString(),
    type: row.type as ApiTransactionType,
    party: row.party,
    category: row.category,
    amount: row.amount,
    status: row.status as ApiTransactionStatus,
    paymentMode: row.paymentMode,
    updatedAt: row.updatedAt.toISOString()
  }
}

/** Version serveur connue (`serverUpdatedAt`) de l'opération, si déjà synchronisée — `undefined`
 * si elle n'a jamais été confirmée par le serveur (création encore PENDING) ou n'existe pas
 * localement, auquel cas aucune vérification de conflit n'est possible ni nécessaire (voir
 * Plan-Mode-Hors-Ligne-Synchronisation.md §6.3). */
export async function getLocalFinanceTransactionServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.financeTransaction.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalFinanceTransactions(): Promise<ApiFinanceTransaction[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.financeTransaction.findMany({ where: { deletedAt: null }, orderBy: { occurredAt: 'desc' } })
  return rows.map(toDisplay)
}

export async function createLocalFinanceTransaction(id: string, input: CreateFinanceTransactionInput): Promise<ApiFinanceTransaction> {
  const prisma = getPrismaClient()
  const prefix = input.type === 'RECETTE' ? 'REC' : 'FAC'
  const provisionalReference = `${prefix}-LOCAL-${id.slice(0, 4).toUpperCase()}`
  const row = await prisma.financeTransaction.create({
    data: {
      id,
      reference: provisionalReference,
      occurredAt: new Date(),
      type: input.type,
      party: input.party,
      category: input.category,
      amount: input.amount,
      status: 'EN_ATTENTE',
      paymentMode: input.paymentMode,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function updateLocalFinanceTransaction(id: string, input: UpdateFinanceTransactionInput): Promise<ApiFinanceTransaction> {
  const prisma = getPrismaClient()
  const row = await prisma.financeTransaction.update({
    where: { id },
    data: {
      type: input.type,
      party: input.party,
      category: input.category,
      amount: input.amount,
      status: input.status,
      paymentMode: input.paymentMode,
      syncStatus: 'PENDING'
    }
  })
  return toDisplay(row)
}

export async function softDeleteLocalFinanceTransaction(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.financeTransaction.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedFinanceTransaction(t: ApiFinanceTransaction): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    reference: t.reference,
    occurredAt: new Date(t.occurredAt),
    type: t.type,
    party: t.party,
    category: t.category,
    amount: t.amount,
    status: t.status,
    paymentMode: t.paymentMode,
    serverUpdatedAt: new Date(t.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.financeTransaction.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } })
}

export async function syncDownFinanceTransactions(items: ApiFinanceTransaction[]): Promise<void> {
  for (const t of items) {
    await upsertSyncedFinanceTransaction(t)
  }
}

// --- Factures fournisseurs (item 14, Phase 5) -------------------------------------------------

// `supplierName` reste vide hors-ligne (`Supplier` référentiel en lecture seule, non couvert,
// même situation qu'Approvisionnement) ; `orderReference` retrouvé dans le miroir local
// `PurchaseOrder` (Phase 5/Approvisionnement) si la facture est liée à une commande déjà connue.

function toDisplayInvoice(row: LocalSupplierInvoiceRow): ApiSupplierInvoice {
  return {
    id: row.id,
    reference: row.reference,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    orderId: row.orderId,
    orderReference: row.orderReference,
    amount: row.amount,
    issuedAt: row.issuedAt.toISOString(),
    dueAt: row.dueAt?.toISOString() ?? null,
    status: row.status as ApiTransactionStatus,
    note: row.note,
    updatedAt: row.updatedAt.toISOString()
  }
}

export async function getLocalSupplierInvoiceServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.supplierInvoice.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalSupplierInvoices(): Promise<ApiSupplierInvoice[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.supplierInvoice.findMany({ where: { deletedAt: null }, orderBy: { issuedAt: 'desc' } })
  return rows.map(toDisplayInvoice)
}

export async function createLocalSupplierInvoice(id: string, input: CreateSupplierInvoiceInput): Promise<ApiSupplierInvoice> {
  const prisma = getPrismaClient()
  const order = input.orderId ? await prisma.purchaseOrder.findUnique({ where: { id: input.orderId } }) : null

  const row = await prisma.supplierInvoice.create({
    data: {
      id,
      reference: `FACF-LOCAL-${id.slice(0, 4).toUpperCase()}`,
      supplierId: input.supplierId,
      supplierName: null,
      orderId: input.orderId,
      orderReference: order?.reference ?? null,
      amount: input.amount,
      issuedAt: input.issuedAt ? new Date(input.issuedAt) : new Date(),
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      status: input.status ?? 'EN_ATTENTE',
      note: input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayInvoice(row)
}

export async function updateLocalSupplierInvoice(id: string, input: UpdateSupplierInvoiceInput): Promise<ApiSupplierInvoice> {
  const prisma = getPrismaClient()
  const row = await prisma.supplierInvoice.update({
    where: { id },
    data: {
      supplierId: input.supplierId === undefined ? undefined : input.supplierId,
      orderId: input.orderId === undefined ? undefined : input.orderId,
      amount: input.amount,
      issuedAt: input.issuedAt !== undefined ? new Date(input.issuedAt) : undefined,
      dueAt: input.dueAt !== undefined ? (input.dueAt ? new Date(input.dueAt) : null) : undefined,
      status: input.status,
      note: input.note === undefined ? undefined : input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayInvoice(row)
}

export async function softDeleteLocalSupplierInvoice(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.supplierInvoice.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedSupplierInvoice(i: ApiSupplierInvoice): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    reference: i.reference,
    supplierId: i.supplierId,
    supplierName: i.supplierName,
    orderId: i.orderId,
    orderReference: i.orderReference,
    amount: i.amount,
    issuedAt: new Date(i.issuedAt),
    dueAt: i.dueAt ? new Date(i.dueAt) : null,
    status: i.status,
    note: i.note,
    serverUpdatedAt: new Date(i.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.supplierInvoice.upsert({ where: { id: i.id }, update: data, create: { id: i.id, ...data } })
}

export async function syncDownSupplierInvoices(items: ApiSupplierInvoice[]): Promise<void> {
  for (const i of items) await upsertSyncedSupplierInvoice(i)
}

// --- Paiements reçus (item 14, Phase 5) ---------------------------------------------------------

function toDisplayPayment(row: LocalPaymentReceivedRow): ApiPaymentReceived {
  return {
    id: row.id,
    reference: row.reference,
    payer: row.payer,
    category: row.category,
    amount: row.amount,
    receivedAt: row.receivedAt.toISOString(),
    paymentMode: row.paymentMode,
    note: row.note,
    updatedAt: row.updatedAt.toISOString()
  }
}

export async function getLocalPaymentReceivedServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.paymentReceived.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalPaymentsReceived(): Promise<ApiPaymentReceived[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.paymentReceived.findMany({ where: { deletedAt: null }, orderBy: { receivedAt: 'desc' } })
  return rows.map(toDisplayPayment)
}

export async function createLocalPaymentReceived(id: string, input: CreatePaymentReceivedInput): Promise<ApiPaymentReceived> {
  const prisma = getPrismaClient()
  const row = await prisma.paymentReceived.create({
    data: {
      id,
      reference: `PAI-LOCAL-${id.slice(0, 4).toUpperCase()}`,
      payer: input.payer,
      category: input.category,
      amount: input.amount,
      receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
      paymentMode: input.paymentMode,
      note: input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayPayment(row)
}

export async function updateLocalPaymentReceived(id: string, input: UpdatePaymentReceivedInput): Promise<ApiPaymentReceived> {
  const prisma = getPrismaClient()
  const row = await prisma.paymentReceived.update({
    where: { id },
    data: {
      payer: input.payer,
      category: input.category,
      amount: input.amount,
      receivedAt: input.receivedAt !== undefined ? new Date(input.receivedAt) : undefined,
      paymentMode: input.paymentMode,
      note: input.note === undefined ? undefined : input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayPayment(row)
}

export async function softDeleteLocalPaymentReceived(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.paymentReceived.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedPaymentReceived(p: ApiPaymentReceived): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    reference: p.reference,
    payer: p.payer,
    category: p.category,
    amount: p.amount,
    receivedAt: new Date(p.receivedAt),
    paymentMode: p.paymentMode,
    note: p.note,
    serverUpdatedAt: new Date(p.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.paymentReceived.upsert({ where: { id: p.id }, update: data, create: { id: p.id, ...data } })
}

export async function syncDownPaymentsReceived(items: ApiPaymentReceived[]): Promise<void> {
  for (const p of items) await upsertSyncedPaymentReceived(p)
}

// --- Dépenses par service (item 14, Phase 5) ------------------------------------------------

function toDisplayExpense(row: LocalServiceExpenseRow): ApiServiceExpense {
  return {
    id: row.id,
    reference: row.reference,
    service: row.service,
    category: row.category,
    amount: row.amount,
    spentAt: row.spentAt.toISOString(),
    note: row.note,
    updatedAt: row.updatedAt.toISOString()
  }
}

export async function getLocalServiceExpenseServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.serviceExpense.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalServiceExpenses(): Promise<ApiServiceExpense[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.serviceExpense.findMany({ where: { deletedAt: null }, orderBy: { spentAt: 'desc' } })
  return rows.map(toDisplayExpense)
}

export async function createLocalServiceExpense(id: string, input: CreateServiceExpenseInput): Promise<ApiServiceExpense> {
  const prisma = getPrismaClient()
  const row = await prisma.serviceExpense.create({
    data: {
      id,
      reference: `DEP-LOCAL-${id.slice(0, 4).toUpperCase()}`,
      service: input.service,
      category: input.category,
      amount: input.amount,
      spentAt: input.spentAt ? new Date(input.spentAt) : new Date(),
      note: input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayExpense(row)
}

export async function updateLocalServiceExpense(id: string, input: UpdateServiceExpenseInput): Promise<ApiServiceExpense> {
  const prisma = getPrismaClient()
  const row = await prisma.serviceExpense.update({
    where: { id },
    data: {
      service: input.service,
      category: input.category,
      amount: input.amount,
      spentAt: input.spentAt !== undefined ? new Date(input.spentAt) : undefined,
      note: input.note === undefined ? undefined : input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayExpense(row)
}

export async function softDeleteLocalServiceExpense(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.serviceExpense.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedServiceExpense(e: ApiServiceExpense): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    reference: e.reference,
    service: e.service,
    category: e.category,
    amount: e.amount,
    spentAt: new Date(e.spentAt),
    note: e.note,
    serverUpdatedAt: new Date(e.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.serviceExpense.upsert({ where: { id: e.id }, update: data, create: { id: e.id, ...data } })
}

export async function syncDownServiceExpenses(items: ApiServiceExpense[]): Promise<void> {
  for (const e of items) await upsertSyncedServiceExpense(e)
}

// --- Budgets (item 14, Phase 5) -----------------------------------------------------------------

// `consumedAmount`/`remainingAmount` recalculés localement en sommant les `ServiceExpense` du
// même service sur la même année — même logique que côté serveur (voir finance-budgets.service.ts).
async function toDisplayBudget(row: LocalBudgetRow): Promise<ApiBudget> {
  const prisma = getPrismaClient()
  const yearStart = new Date(Date.UTC(row.year, 0, 1))
  const yearEnd = new Date(Date.UTC(row.year + 1, 0, 1))
  const expenses = await prisma.serviceExpense.findMany({
    where: { deletedAt: null, service: row.service, spentAt: { gte: yearStart, lt: yearEnd } }
  })
  const consumedAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  return {
    id: row.id,
    reference: row.reference,
    service: row.service,
    year: row.year,
    allocatedAmount: row.allocatedAmount,
    consumedAmount,
    remainingAmount: row.allocatedAmount - consumedAmount,
    note: row.note,
    updatedAt: row.updatedAt.toISOString()
  }
}

export async function getLocalBudgetServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.budget.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalBudgets(): Promise<ApiBudget[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.budget.findMany({ where: { deletedAt: null }, orderBy: [{ year: 'desc' }, { service: 'asc' }] })
  return Promise.all(rows.map(toDisplayBudget))
}

export async function createLocalBudget(id: string, input: CreateBudgetInput): Promise<ApiBudget> {
  const prisma = getPrismaClient()
  const row = await prisma.budget.create({
    data: {
      id,
      reference: `BUD-LOCAL-${id.slice(0, 4).toUpperCase()}`,
      service: input.service,
      year: input.year,
      allocatedAmount: input.allocatedAmount,
      note: input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayBudget(row)
}

export async function updateLocalBudget(id: string, input: UpdateBudgetInput): Promise<ApiBudget> {
  const prisma = getPrismaClient()
  const row = await prisma.budget.update({
    where: { id },
    data: {
      service: input.service,
      year: input.year,
      allocatedAmount: input.allocatedAmount,
      note: input.note === undefined ? undefined : input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayBudget(row)
}

export async function softDeleteLocalBudget(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.budget.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedBudget(b: ApiBudget): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    reference: b.reference,
    service: b.service,
    year: b.year,
    allocatedAmount: b.allocatedAmount,
    note: b.note,
    serverUpdatedAt: new Date(b.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.budget.upsert({ where: { id: b.id }, update: data, create: { id: b.id, ...data } })
}

export async function syncDownBudgets(items: ApiBudget[]): Promise<void> {
  for (const b of items) await upsertSyncedBudget(b)
}

// --- Comptes bancaires (item 14, Phase 5) ---------------------------------------------------

function toDisplayBankAccount(row: LocalBankAccountRow): ApiBankAccount {
  return {
    id: row.id,
    reference: row.reference,
    name: row.name,
    bankName: row.bankName,
    accountNumber: row.accountNumber,
    balance: row.balance,
    note: row.note,
    updatedAt: row.updatedAt.toISOString()
  }
}

export async function getLocalBankAccountServerUpdatedAt(id: string): Promise<string | undefined> {
  const prisma = getPrismaClient()
  const row = await prisma.bankAccount.findUnique({ where: { id } })
  return row?.serverUpdatedAt ? row.serverUpdatedAt.toISOString() : undefined
}

export async function listLocalBankAccounts(): Promise<ApiBankAccount[]> {
  const prisma = getPrismaClient()
  const rows = await prisma.bankAccount.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } })
  return rows.map(toDisplayBankAccount)
}

export async function createLocalBankAccount(id: string, input: CreateBankAccountInput): Promise<ApiBankAccount> {
  const prisma = getPrismaClient()
  const row = await prisma.bankAccount.create({
    data: {
      id,
      reference: `CPT-LOCAL-${id.slice(0, 4).toUpperCase()}`,
      name: input.name,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      balance: input.balance ?? 0,
      note: input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayBankAccount(row)
}

export async function updateLocalBankAccount(id: string, input: UpdateBankAccountInput): Promise<ApiBankAccount> {
  const prisma = getPrismaClient()
  const row = await prisma.bankAccount.update({
    where: { id },
    data: {
      name: input.name,
      bankName: input.bankName,
      accountNumber: input.accountNumber,
      balance: input.balance,
      note: input.note === undefined ? undefined : input.note,
      syncStatus: 'PENDING'
    }
  })
  return toDisplayBankAccount(row)
}

export async function softDeleteLocalBankAccount(id: string): Promise<void> {
  const prisma = getPrismaClient()
  await prisma.bankAccount.update({ where: { id }, data: { deletedAt: new Date(), syncStatus: 'PENDING' } })
}

export async function upsertSyncedBankAccount(a: ApiBankAccount): Promise<void> {
  const prisma = getPrismaClient()
  const data = {
    reference: a.reference,
    name: a.name,
    bankName: a.bankName,
    accountNumber: a.accountNumber,
    balance: a.balance,
    note: a.note,
    serverUpdatedAt: new Date(a.updatedAt),
    syncStatus: 'SYNCED',
    deletedAt: null
  }
  await prisma.bankAccount.upsert({ where: { id: a.id }, update: data, create: { id: a.id, ...data } })
}

export async function syncDownBankAccounts(items: ApiBankAccount[]): Promise<void> {
  for (const a of items) await upsertSyncedBankAccount(a)
}
