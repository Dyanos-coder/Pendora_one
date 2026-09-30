import { randomUUID } from 'crypto'
import { getCurrentToken } from './session.store'
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  exportFinanceTransactions,
  listFinanceTransactions,
  NETWORK_ERROR_MESSAGE,
  updateFinanceTransaction,
  createSupplierInvoice as apiCreateSupplierInvoice,
  deleteSupplierInvoice as apiDeleteSupplierInvoice,
  listSupplierInvoices as apiListSupplierInvoices,
  updateSupplierInvoice as apiUpdateSupplierInvoice,
  createPaymentReceived as apiCreatePaymentReceived,
  deletePaymentReceived as apiDeletePaymentReceived,
  listPaymentsReceived as apiListPaymentsReceived,
  updatePaymentReceived as apiUpdatePaymentReceived,
  createServiceExpense as apiCreateServiceExpense,
  deleteServiceExpense as apiDeleteServiceExpense,
  listServiceExpenses as apiListServiceExpenses,
  updateServiceExpense as apiUpdateServiceExpense,
  createBudget as apiCreateBudget,
  deleteBudget as apiDeleteBudget,
  listBudgets as apiListBudgets,
  updateBudget as apiUpdateBudget,
  createBankAccount as apiCreateBankAccount,
  deleteBankAccount as apiDeleteBankAccount,
  listBankAccounts as apiListBankAccounts,
  updateBankAccount as apiUpdateBankAccount
} from './remote-api.client'
import { saveGeneratedDocument } from './file-export'
import { getConnectivityStatus } from './connectivity.service'
import { enqueue } from './sync-outbox.service'
import { registerSyncDispatcher, type DispatchResult } from './sync-worker'
import {
  createLocalFinanceTransaction,
  getLocalFinanceTransactionServerUpdatedAt,
  listLocalFinanceTransactions,
  softDeleteLocalFinanceTransaction,
  syncDownFinanceTransactions,
  updateLocalFinanceTransaction,
  upsertSyncedFinanceTransaction,
  createLocalSupplierInvoice,
  getLocalSupplierInvoiceServerUpdatedAt,
  listLocalSupplierInvoices,
  softDeleteLocalSupplierInvoice,
  syncDownSupplierInvoices,
  updateLocalSupplierInvoice,
  upsertSyncedSupplierInvoice,
  createLocalPaymentReceived,
  getLocalPaymentReceivedServerUpdatedAt,
  listLocalPaymentsReceived,
  softDeleteLocalPaymentReceived,
  syncDownPaymentsReceived,
  updateLocalPaymentReceived,
  upsertSyncedPaymentReceived,
  createLocalServiceExpense,
  getLocalServiceExpenseServerUpdatedAt,
  listLocalServiceExpenses,
  softDeleteLocalServiceExpense,
  syncDownServiceExpenses,
  updateLocalServiceExpense,
  upsertSyncedServiceExpense,
  createLocalBudget,
  getLocalBudgetServerUpdatedAt,
  listLocalBudgets,
  softDeleteLocalBudget,
  syncDownBudgets,
  updateLocalBudget,
  upsertSyncedBudget,
  createLocalBankAccount,
  getLocalBankAccountServerUpdatedAt,
  listLocalBankAccounts,
  softDeleteLocalBankAccount,
  syncDownBankAccounts,
  updateLocalBankAccount,
  upsertSyncedBankAccount
} from './finance-local.service'
import type {
  CreateFinanceTransactionInput,
  UpdateFinanceTransactionInput,
  CreateSupplierInvoiceInput,
  UpdateSupplierInvoiceInput,
  CreatePaymentReceivedInput,
  UpdatePaymentReceivedInput,
  CreateServiceExpenseInput,
  UpdateServiceExpenseInput,
  CreateBudgetInput,
  UpdateBudgetInput,
  CreateBankAccountInput,
  UpdateBankAccountInput
} from '../../shared/finance-types'

// Mode hors-ligne — Phase 3 (FinanceTransaction) + Phase 5 (Factures fournisseurs, Paiements,
// Dépenses par service, Budgets, Comptes bancaires) — voir Plan-Mode-Hors-Ligne-Synchronisation.md.

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

function isNetworkError(error: string): boolean {
  return error === NETWORK_ERROR_MESSAGE
}

export async function list() {
  const remote = await listFinanceTransactions(requireToken())
  if (remote.ok) {
    await syncDownFinanceTransactions(remote.data.transactions)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { transactions: await listLocalFinanceTransactions() } }
  }
  return remote
}

export async function create(input: CreateFinanceTransactionInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await createFinanceTransaction(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedFinanceTransaction(remote.data.transaction)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const transaction = await createLocalFinanceTransaction(id, input)
  await enqueue('financeTransaction', id, 'CREATE', { ...input, id })
  return { ok: true, data: { transaction } }
}

export async function update(id: string, input: UpdateFinanceTransactionInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await updateFinanceTransaction(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedFinanceTransaction(remote.data.transaction)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalFinanceTransactionServerUpdatedAt(id)
  const transaction = await updateLocalFinanceTransaction(id, input)
  await enqueue('financeTransaction', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { transaction } }
}

export async function remove(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await deleteFinanceTransaction(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalFinanceTransaction(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalFinanceTransaction(id)
  await enqueue('financeTransaction', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

export async function exportExcel(): Promise<boolean> {
  const result = await exportFinanceTransactions(requireToken())
  return saveGeneratedDocument(result, 'Exporter les opérations financières')
}

registerSyncDispatcher('financeTransaction', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateFinanceTransactionInput & { id: string }
    const result = await createFinanceTransaction(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedFinanceTransaction(result.data.transaction)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateFinanceTransactionInput & { id: string }
    const result = await updateFinanceTransaction(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedFinanceTransaction(result.data.transaction)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await deleteFinanceTransaction(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Factures fournisseurs -------------------------------------------------------------------------

export async function listInvoices() {
  const remote = await apiListSupplierInvoices(requireToken())
  if (remote.ok) {
    await syncDownSupplierInvoices(remote.data.invoices)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { invoices: await listLocalSupplierInvoices() } }
  }
  return remote
}

export async function addInvoice(input: CreateSupplierInvoiceInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiCreateSupplierInvoice(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedSupplierInvoice(remote.data.invoice)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const invoice = await createLocalSupplierInvoice(id, input)
  await enqueue('supplierInvoice', id, 'CREATE', { ...input, id })
  return { ok: true, data: { invoice } }
}

export async function updateInvoice(id: string, input: UpdateSupplierInvoiceInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiUpdateSupplierInvoice(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedSupplierInvoice(remote.data.invoice)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalSupplierInvoiceServerUpdatedAt(id)
  const invoice = await updateLocalSupplierInvoice(id, input)
  await enqueue('supplierInvoice', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { invoice } }
}

export async function removeInvoice(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiDeleteSupplierInvoice(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalSupplierInvoice(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalSupplierInvoice(id)
  await enqueue('supplierInvoice', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

registerSyncDispatcher('supplierInvoice', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateSupplierInvoiceInput & { id: string }
    const result = await apiCreateSupplierInvoice(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedSupplierInvoice(result.data.invoice)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateSupplierInvoiceInput & { id: string }
    const result = await apiUpdateSupplierInvoice(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedSupplierInvoice(result.data.invoice)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await apiDeleteSupplierInvoice(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Paiements reçus ---------------------------------------------------------------------------------

export async function listPayments() {
  const remote = await apiListPaymentsReceived(requireToken())
  if (remote.ok) {
    await syncDownPaymentsReceived(remote.data.payments)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { payments: await listLocalPaymentsReceived() } }
  }
  return remote
}

export async function addPayment(input: CreatePaymentReceivedInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiCreatePaymentReceived(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedPaymentReceived(remote.data.payment)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const payment = await createLocalPaymentReceived(id, input)
  await enqueue('paymentReceived', id, 'CREATE', { ...input, id })
  return { ok: true, data: { payment } }
}

export async function updatePayment(id: string, input: UpdatePaymentReceivedInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiUpdatePaymentReceived(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedPaymentReceived(remote.data.payment)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalPaymentReceivedServerUpdatedAt(id)
  const payment = await updateLocalPaymentReceived(id, input)
  await enqueue('paymentReceived', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { payment } }
}

export async function removePayment(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiDeletePaymentReceived(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalPaymentReceived(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalPaymentReceived(id)
  await enqueue('paymentReceived', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

registerSyncDispatcher('paymentReceived', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreatePaymentReceivedInput & { id: string }
    const result = await apiCreatePaymentReceived(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedPaymentReceived(result.data.payment)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdatePaymentReceivedInput & { id: string }
    const result = await apiUpdatePaymentReceived(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedPaymentReceived(result.data.payment)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await apiDeletePaymentReceived(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Dépenses par service ------------------------------------------------------------------------

export async function listExpenses() {
  const remote = await apiListServiceExpenses(requireToken())
  if (remote.ok) {
    await syncDownServiceExpenses(remote.data.expenses)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { expenses: await listLocalServiceExpenses() } }
  }
  return remote
}

export async function addExpense(input: CreateServiceExpenseInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiCreateServiceExpense(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedServiceExpense(remote.data.expense)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const expense = await createLocalServiceExpense(id, input)
  await enqueue('serviceExpense', id, 'CREATE', { ...input, id })
  return { ok: true, data: { expense } }
}

export async function updateExpense(id: string, input: UpdateServiceExpenseInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiUpdateServiceExpense(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedServiceExpense(remote.data.expense)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalServiceExpenseServerUpdatedAt(id)
  const expense = await updateLocalServiceExpense(id, input)
  await enqueue('serviceExpense', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { expense } }
}

export async function removeExpense(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiDeleteServiceExpense(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalServiceExpense(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalServiceExpense(id)
  await enqueue('serviceExpense', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

registerSyncDispatcher('serviceExpense', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateServiceExpenseInput & { id: string }
    const result = await apiCreateServiceExpense(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedServiceExpense(result.data.expense)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateServiceExpenseInput & { id: string }
    const result = await apiUpdateServiceExpense(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedServiceExpense(result.data.expense)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await apiDeleteServiceExpense(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Budgets ---------------------------------------------------------------------------------------

export async function listBudgets() {
  const remote = await apiListBudgets(requireToken())
  if (remote.ok) {
    await syncDownBudgets(remote.data.budgets)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { budgets: await listLocalBudgets() } }
  }
  return remote
}

export async function addBudget(input: CreateBudgetInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiCreateBudget(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedBudget(remote.data.budget)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const budget = await createLocalBudget(id, input)
  await enqueue('budget', id, 'CREATE', { ...input, id })
  return { ok: true, data: { budget } }
}

export async function updateBudget(id: string, input: UpdateBudgetInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiUpdateBudget(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedBudget(remote.data.budget)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalBudgetServerUpdatedAt(id)
  const budget = await updateLocalBudget(id, input)
  await enqueue('budget', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { budget } }
}

export async function removeBudget(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiDeleteBudget(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalBudget(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalBudget(id)
  await enqueue('budget', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

registerSyncDispatcher('budget', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateBudgetInput & { id: string }
    const result = await apiCreateBudget(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedBudget(result.data.budget)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateBudgetInput & { id: string }
    const result = await apiUpdateBudget(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedBudget(result.data.budget)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await apiDeleteBudget(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})

// --- Comptes bancaires -------------------------------------------------------------------------------

export async function listBankAccounts() {
  const remote = await apiListBankAccounts(requireToken())
  if (remote.ok) {
    await syncDownBankAccounts(remote.data.accounts)
    return remote
  }
  if (getConnectivityStatus() === 'OFFLINE' || isNetworkError(remote.error)) {
    return { ok: true, data: { accounts: await listLocalBankAccounts() } }
  }
  return remote
}

export async function addBankAccount(input: CreateBankAccountInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiCreateBankAccount(requireToken(), input)
    if (remote.ok) {
      await upsertSyncedBankAccount(remote.data.account)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const id = randomUUID()
  const account = await createLocalBankAccount(id, input)
  await enqueue('bankAccount', id, 'CREATE', { ...input, id })
  return { ok: true, data: { account } }
}

export async function updateBankAccount(id: string, input: UpdateBankAccountInput) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiUpdateBankAccount(requireToken(), id, input)
    if (remote.ok) {
      await upsertSyncedBankAccount(remote.data.account)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  const expectedUpdatedAt = await getLocalBankAccountServerUpdatedAt(id)
  const account = await updateLocalBankAccount(id, input)
  await enqueue('bankAccount', id, 'UPDATE', { ...input, id, expectedUpdatedAt })
  return { ok: true, data: { account } }
}

export async function removeBankAccount(id: string) {
  if (getConnectivityStatus() === 'ONLINE') {
    const remote = await apiDeleteBankAccount(requireToken(), id)
    if (remote.ok) {
      await softDeleteLocalBankAccount(id)
      return remote
    }
    if (!isNetworkError(remote.error)) return remote
  }

  await softDeleteLocalBankAccount(id)
  await enqueue('bankAccount', id, 'DELETE', { id })
  return { ok: true, data: {} }
}

registerSyncDispatcher('bankAccount', async (operation, payload): Promise<DispatchResult> => {
  const token = getCurrentToken()
  if (!token) return { ok: false, error: 'Non authentifié.', retryable: true }

  if (operation === 'CREATE') {
    const input = payload as CreateBankAccountInput & { id: string }
    const result = await apiCreateBankAccount(token, input)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    await upsertSyncedBankAccount(result.data.account)
    return { ok: true }
  }

  if (operation === 'UPDATE') {
    const { id, ...input } = payload as UpdateBankAccountInput & { id: string }
    const result = await apiUpdateBankAccount(token, id, input)
    if (!result.ok) {
      return { ok: false, error: result.error, retryable: isNetworkError(result.error), conflict: result.conflict }
    }
    await upsertSyncedBankAccount(result.data.account)
    return { ok: true }
  }

  if (operation === 'DELETE') {
    const { id } = payload as { id: string }
    const result = await apiDeleteBankAccount(token, id)
    if (!result.ok) return { ok: false, error: result.error, retryable: isNetworkError(result.error) }
    return { ok: true }
  }

  return { ok: false, error: `Opération de synchro inconnue : ${operation}.`, retryable: false }
})
